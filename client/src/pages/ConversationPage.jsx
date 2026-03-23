import { useEffect, useRef, useState, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  PaperAirplaneIcon,
  UserCircleIcon,
  ArrowLeftIcon,
} from '@heroicons/react/24/outline';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';

const POLL_INTERVAL_MS = 15_000;

// ── Time formatter ─────────────────────────────────────────────────────────

function formatTime(dateStr) {
  const d = new Date(dateStr);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  if (sameDay) {
    return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  }
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

// ── Message bubble ─────────────────────────────────────────────────────────

function Bubble({ message, isMine }) {
  return (
    <div className={`flex items-end gap-2 ${isMine ? 'flex-row-reverse' : 'flex-row'}`}>
      {/* Avatar — only for others' messages */}
      {!isMine && (
        message.sender_avatar ? (
          <img
            src={message.sender_avatar}
            alt={message.sender_name}
            className="w-7 h-7 rounded-full object-cover flex-shrink-0 mb-1"
          />
        ) : (
          <UserCircleIcon className="w-7 h-7 text-gray-300 flex-shrink-0 mb-1" />
        )
      )}

      <div className={`flex flex-col gap-1 max-w-[72%] ${isMine ? 'items-end' : 'items-start'}`}>
        <div
          className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap break-words ${
            isMine
              ? 'bg-indigo-600 text-white rounded-br-sm'
              : 'bg-white text-gray-800 border border-gray-200 rounded-bl-sm shadow-sm'
          }`}
        >
          {message.content}
        </div>
        <span className="text-[10px] text-gray-400 px-1">{formatTime(message.sent_at)}</span>
      </div>
    </div>
  );
}

// ── Date divider between messages ──────────────────────────────────────────

function DateDivider({ dateStr }) {
  const label = (() => {
    const d   = new Date(dateStr);
    const now = new Date();
    if (d.toDateString() === now.toDateString()) return 'Today';
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
    return d.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
  })();

  return (
    <div className="flex items-center gap-3 my-4">
      <div className="flex-1 h-px bg-gray-100" />
      <span className="text-[11px] text-gray-400 font-medium">{label}</span>
      <div className="flex-1 h-px bg-gray-100" />
    </div>
  );
}

// ── Group messages by calendar date ───────────────────────────────────────

function groupByDate(messages) {
  const groups = [];
  let lastDate  = null;
  for (const msg of messages) {
    const day = new Date(msg.sent_at).toDateString();
    if (day !== lastDate) {
      groups.push({ type: 'divider', date: msg.sent_at, key: `d-${msg.sent_at}` });
      lastDate = day;
    }
    groups.push({ type: 'message', msg, key: `m-${msg.id}` });
  }
  return groups;
}

// ── Page ───────────────────────────────────────────────────────────────────

export default function ConversationPage() {
  const { userId, listingId } = useParams();
  const { user }              = useAuth();

  const [messages, setMessages]     = useState([]);
  const [otherUser, setOtherUser]   = useState(null); // { name, avatar }
  const [listing, setListing]       = useState(null);  // { id, title }
  const [loading, setLoading]       = useState(true);
  const [content, setContent]       = useState('');
  const [sending, setSending]       = useState(false);

  const bottomRef   = useRef(null);
  const textareaRef = useRef(null);
  const latestIdRef = useRef(0); // track highest message id seen for dedup

  // ── Scroll to bottom whenever messages grow
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // ── Fetch (initial + poll)
  const fetchMessages = useCallback(async (isInitial = false) => {
    try {
      const { data } = await api.get(`/api/messages/conversation/${userId}/${listingId}`);
      const fetched  = data.messages;

      setMessages((prev) => {
        // Merge: keep optimistic messages that haven't been confirmed yet,
        // replace everything else with server truth.
        const serverIds = new Set(fetched.map((m) => m.id));
        const optimistic = prev.filter((m) => m._optimistic && !serverIds.has(m.id));
        return [...fetched, ...optimistic];
      });

      if (fetched.length > 0) {
        latestIdRef.current = Math.max(...fetched.map((m) => m.id));
      }

      // Derive other user + listing from the first message on initial load
      if (isInitial && fetched.length > 0) {
        const other = fetched.find((m) => m.sender_id !== user?.id);
        if (other) {
          setOtherUser({ name: other.sender_name, avatar: other.sender_avatar, id: Number(userId) });
        }
      }
    } catch {
      if (isInitial) toast.error('Could not load conversation');
    } finally {
      if (isInitial) setLoading(false);
    }
  }, [userId, listingId, user?.id]);

  // Fetch listing title separately (for the header link)
  useEffect(() => {
    api.get(`/api/listings/${listingId}`)
      .then(({ data }) => setListing({ id: data.listing.id, title: data.listing.title }))
      .catch(() => {});
  }, [listingId]);

  // Initial fetch + poll
  useEffect(() => {
    fetchMessages(true);
    const timer = setInterval(() => fetchMessages(false), POLL_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [fetchMessages]);

  // Focus textarea on mount
  useEffect(() => {
    textareaRef.current?.focus();
  }, [loading]);

  // ── Send message
  async function sendMessage() {
    const text = content.trim();
    if (!text || sending) return;

    const optimisticId = `opt-${Date.now()}`;
    const optimistic = {
      id:           optimisticId,
      sender_id:    user.id,
      receiver_id:  Number(userId),
      listing_id:   Number(listingId),
      content:      text,
      is_read:      false,
      sent_at:      new Date().toISOString(),
      sender_name:  user.name,
      sender_avatar: user.avatar_url ?? null,
      _optimistic:  true,
    };

    setMessages((prev) => [...prev, optimistic]);
    setContent('');
    setSending(true);

    try {
      const { data } = await api.post('/api/messages', {
        receiver_id: Number(userId),
        listing_id:  Number(listingId),
        content:     text,
      });
      // Replace the optimistic placeholder with the real message
      setMessages((prev) =>
        prev.map((m) => m.id === optimisticId ? data.message : m)
      );
    } catch {
      toast.error('Failed to send message');
      // Remove the optimistic message on failure
      setMessages((prev) => prev.filter((m) => m.id !== optimisticId));
      setContent(text); // restore input
    } finally {
      setSending(false);
      textareaRef.current?.focus();
    }
  }

  function handleKeyDown(e) {
    // Submit on Enter, allow Shift+Enter for newline
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  // ── Derive other-user info from messages if not set yet
  const resolvedOtherUser = otherUser ?? (() => {
    const other = messages.find((m) => m.sender_id !== user?.id);
    return other ? { name: other.sender_name, avatar: other.sender_avatar, id: Number(userId) } : null;
  })();

  const grouped = groupByDate(messages.filter((m) => !m._optimistic || true));

  // ── Render
  return (
    <div className="bg-gray-50 flex flex-col" style={{ height: 'calc(100vh - 64px)' }}>

      {/* ── Header ───────────────────────────────────────────────────── */}
      <div className="bg-white border-b border-gray-200 px-4 sm:px-6 py-3 flex items-center gap-3 flex-shrink-0">
        <Link to="/messages" className="text-gray-400 hover:text-indigo-600 transition-colors mr-1">
          <ArrowLeftIcon className="w-5 h-5" />
        </Link>

        {resolvedOtherUser?.avatar ? (
          <img
            src={resolvedOtherUser.avatar}
            alt={resolvedOtherUser.name}
            className="w-10 h-10 rounded-full object-cover ring-2 ring-indigo-100 flex-shrink-0"
          />
        ) : (
          <UserCircleIcon className="w-10 h-10 text-gray-300 flex-shrink-0" />
        )}

        <div className="flex-1 min-w-0">
          {resolvedOtherUser ? (
            <Link
              to={`/profile/${resolvedOtherUser.id}`}
              className="block text-sm font-semibold text-gray-900 hover:text-indigo-700 transition-colors truncate"
            >
              {resolvedOtherUser.name}
            </Link>
          ) : (
            <div className="h-4 bg-gray-200 rounded w-32 animate-pulse" />
          )}

          {listing ? (
            <Link
              to={`/listings/${listing.id}`}
              className="block text-xs text-indigo-600 hover:text-indigo-800 transition-colors truncate"
            >
              {listing.title}
            </Link>
          ) : (
            <div className="h-3 bg-gray-200 rounded w-44 mt-1 animate-pulse" />
          )}
        </div>
      </div>

      {/* ── Message list ─────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 space-y-1">
        {loading ? (
          /* Skeleton bubbles */
          <div className="space-y-4 pt-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className={`flex ${i % 2 === 0 ? 'justify-start' : 'justify-end'}`}>
                <div className={`h-10 rounded-2xl bg-gray-200 animate-pulse ${
                  i % 2 === 0 ? 'w-48 rounded-bl-sm' : 'w-40 rounded-br-sm'
                }`} />
              </div>
            ))}
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center pb-10">
            <div className="w-14 h-14 bg-indigo-50 rounded-full flex items-center justify-center mb-4">
              <PaperAirplaneIcon className="w-7 h-7 text-indigo-400" />
            </div>
            <p className="text-sm font-medium text-gray-700">Start the conversation</p>
            <p className="text-xs text-gray-400 mt-1">
              Say hello about{listing ? ` "${listing.title}"` : ' this listing'}.
            </p>
          </div>
        ) : (
          grouped.map((item) =>
            item.type === 'divider' ? (
              <DateDivider key={item.key} dateStr={item.date} />
            ) : (
              <Bubble
                key={item.key}
                message={item.msg}
                isMine={item.msg.sender_id === user?.id}
              />
            )
          )
        )}
        {/* Scroll anchor */}
        <div ref={bottomRef} />
      </div>

      {/* ── Input bar ────────────────────────────────────────────────── */}
      <div className="bg-white border-t border-gray-200 px-4 sm:px-6 py-3 flex-shrink-0">
        <div className="flex items-end gap-3 max-w-4xl mx-auto">
          <textarea
            ref={textareaRef}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Write a message… (Enter to send, Shift+Enter for new line)"
            rows={1}
            className="flex-1 resize-none rounded-2xl border border-gray-300 px-4 py-2.5 text-sm
                       outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500
                       max-h-36 overflow-y-auto transition-colors"
            style={{
              height: 'auto',
              minHeight: '42px',
            }}
            onInput={(e) => {
              // Auto-grow
              e.target.style.height = 'auto';
              e.target.style.height = `${Math.min(e.target.scrollHeight, 144)}px`;
            }}
          />
          <button
            onClick={sendMessage}
            disabled={!content.trim() || sending}
            className="flex-shrink-0 w-10 h-10 bg-indigo-600 hover:bg-indigo-700
                       disabled:opacity-40 disabled:cursor-not-allowed
                       text-white rounded-full flex items-center justify-center
                       transition-colors shadow-sm"
          >
            {sending ? (
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <PaperAirplaneIcon className="w-4 h-4" />
            )}
          </button>
        </div>
        <p className="text-[10px] text-gray-400 text-center mt-1.5">
          Enter to send · Shift+Enter for new line
        </p>
      </div>
    </div>
  );
}
