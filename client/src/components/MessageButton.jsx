import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ChatBubbleLeftEllipsisIcon, PaperAirplaneIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';

/**
 * MessageButton — shown on ListingDetailPage beside an owner's profile.
 *
 * Behaviour:
 *  - Not logged in            → "Message Owner" redirects to /login
 *  - Logged in, no prior convo → show inline composer; on send → redirect to conversation
 *  - Logged in, existing convo → render a direct link to /messages/:ownerId/:listingId
 *
 * Props:
 *   ownerId   {number}  listing.owner_id
 *   listingId {number}  listing.id
 *   ownerName {string}  display name for placeholder text
 */
export default function MessageButton({ ownerId, listingId, ownerName }) {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const [hasConvo, setHasConvo]   = useState(false);
  const [checked, setChecked]     = useState(false);
  const [composing, setComposing] = useState(false);
  const [content, setContent]     = useState('');
  const [sending, setSending]     = useState(false);

  // Check whether a conversation already exists between this user and owner
  // about this listing by looking in the conversations list.
  useEffect(() => {
    if (!isAuthenticated) { setChecked(true); return; }

    api.get('/api/messages/conversations')
      .then(({ data }) => {
        const found = data.conversations.some(
          (c) =>
            Number(c.other_user_id) === Number(ownerId) &&
            Number(c.listing_id)    === Number(listingId)
        );
        setHasConvo(found);
      })
      .catch(() => {})
      .finally(() => setChecked(true));
  }, [isAuthenticated, ownerId, listingId]);

  async function send() {
    const text = content.trim();
    if (!text) return;
    setSending(true);
    try {
      await api.post('/api/messages', {
        receiver_id: Number(ownerId),
        listing_id:  Number(listingId),
        content:     text,
      });
      toast.success('Message sent!');
      navigate(`/messages/${ownerId}/${listingId}`);
    } catch (err) {
      toast.error(err.response?.data?.error ?? 'Failed to send message');
      setSending(false);
    }
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }

  // Not logged in
  if (!isAuthenticated) {
    return (
      <button
        onClick={() => navigate('/login')}
        className="w-full flex items-center justify-center gap-2 border border-indigo-200
                   text-indigo-600 hover:bg-indigo-50 font-semibold text-sm py-2.5
                   rounded-xl transition-colors"
      >
        <ChatBubbleLeftEllipsisIcon className="w-4 h-4" />
        Message Owner
      </button>
    );
  }

  // Still resolving conversations
  if (!checked) {
    return (
      <div className="w-full h-10 rounded-xl bg-gray-100 animate-pulse" />
    );
  }

  // Existing conversation → direct link
  if (hasConvo) {
    return (
      <Link
        to={`/messages/${ownerId}/${listingId}`}
        className="w-full flex items-center justify-center gap-2 border border-indigo-200
                   text-indigo-600 hover:bg-indigo-50 font-semibold text-sm py-2.5
                   rounded-xl transition-colors"
      >
        <ChatBubbleLeftEllipsisIcon className="w-4 h-4" />
        Continue Conversation
      </Link>
    );
  }

  // No prior convo — inline composer
  if (composing) {
    return (
      <div className="border border-indigo-100 rounded-xl p-3 space-y-2 bg-indigo-50/40">
        <textarea
          autoFocus
          rows={3}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={`Ask ${ownerName ?? 'the owner'} a question about this item…`}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none
                     focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-none bg-white"
        />
        <div className="flex gap-2">
          <button
            onClick={send}
            disabled={!content.trim() || sending}
            className="flex-1 flex items-center justify-center gap-1.5 bg-indigo-600
                       hover:bg-indigo-700 disabled:opacity-50 text-white text-sm
                       font-semibold py-2 rounded-lg transition-colors"
          >
            {sending
              ? <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              : <PaperAirplaneIcon className="w-3.5 h-3.5" />
            }
            {sending ? 'Sending…' : 'Send'}
          </button>
          <button
            onClick={() => { setComposing(false); setContent(''); }}
            className="px-3 text-sm text-gray-500 hover:text-gray-700 border border-gray-200
                       rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
        </div>
        <p className="text-[10px] text-gray-400 text-center">Enter to send · Shift+Enter for new line</p>
      </div>
    );
  }

  // Default: "Message Owner" button that opens composer
  return (
    <button
      onClick={() => setComposing(true)}
      className="w-full flex items-center justify-center gap-2 border border-indigo-200
                 text-indigo-600 hover:bg-indigo-50 font-semibold text-sm py-2.5
                 rounded-xl transition-colors"
    >
      <ChatBubbleLeftEllipsisIcon className="w-4 h-4" />
      Message Owner
    </button>
  );
}
