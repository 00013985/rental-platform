import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ChatBubbleLeftEllipsisIcon,
  UserCircleIcon,
} from '@heroicons/react/24/outline';
import api from '../api/axios';

// ── Time-ago helper ────────────────────────────────────────────────────────

function timeAgo(dateStr) {
  const diff = (Date.now() - new Date(dateStr)) / 1000; // seconds
  if (diff < 60)                  return 'just now';
  if (diff < 3600)                return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400)               return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 86400 * 7)           return `${Math.floor(diff / 86400)}d ago`;
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// ── Skeleton ───────────────────────────────────────────────────────────────

function Skeleton() {
  return (
    <div className="divide-y divide-gray-100">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="flex items-center gap-4 px-6 py-4 animate-pulse">
          <div className="w-12 h-12 rounded-full bg-gray-200 flex-shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="flex justify-between">
              <div className="h-3.5 bg-gray-200 rounded w-28" />
              <div className="h-3 bg-gray-200 rounded w-12" />
            </div>
            <div className="h-3 bg-gray-200 rounded w-40" />
            <div className="h-3 bg-gray-200 rounded w-56" />
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Conversation row ───────────────────────────────────────────────────────

function ConversationRow({ convo }) {
  const navigate = useNavigate();
  const {
    other_user_id,
    other_user_name,
    other_user_avatar,
    listing_id,
    listing_title,
    last_message,
    last_sent_at,
    unread_count,
  } = convo;

  return (
    <button
      onClick={() => navigate(`/messages/${other_user_id}/${listing_id}`)}
      className="w-full flex items-center gap-4 px-6 py-4 hover:bg-indigo-50/60 transition-colors text-left group"
    >
      {/* Avatar */}
      <div className="flex-shrink-0 relative">
        {other_user_avatar ? (
          <img
            src={other_user_avatar}
            alt={other_user_name}
            className="w-12 h-12 rounded-full object-cover ring-2 ring-gray-100"
          />
        ) : (
          <UserCircleIcon className="w-12 h-12 text-gray-300" />
        )}
        {unread_count > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-indigo-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
            {unread_count > 9 ? '9+' : unread_count}
          </span>
        )}
      </div>

      {/* Text */}
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline justify-between gap-2 mb-0.5">
          <span className={`text-sm truncate ${unread_count > 0 ? 'font-bold text-gray-900' : 'font-semibold text-gray-800'}`}>
            {other_user_name}
          </span>
          <span className="text-[11px] text-gray-400 flex-shrink-0">{timeAgo(last_sent_at)}</span>
        </div>
        <p className="text-xs text-indigo-600 font-medium truncate mb-0.5">{listing_title}</p>
        <p className={`text-xs truncate ${unread_count > 0 ? 'text-gray-700 font-medium' : 'text-gray-400'}`}>
          {last_message}
        </p>
      </div>
    </button>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────

export default function MessagesPage() {
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading]             = useState(true);

  useEffect(() => {
    api.get('/api/messages/conversations')
      .then(({ data }) => setConversations(data.conversations))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
          <h1 className="text-3xl font-extrabold text-gray-900">Messages</h1>
          <p className="mt-1 text-sm text-gray-500">Your conversations with lenders and renters</p>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6">
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          {loading ? (
            <Skeleton />
          ) : conversations.length === 0 ? (
            /* Empty state */
            <div className="text-center py-20 px-6">
              <ChatBubbleLeftEllipsisIcon className="w-14 h-14 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No conversations yet</h3>
              <p className="text-sm text-gray-500 max-w-xs mx-auto mb-6">
                When you message a lender about a listing, the conversation will appear here.
              </p>
              <Link
                to="/listings"
                className="inline-block bg-indigo-600 text-white text-sm font-semibold px-5 py-2.5 rounded-xl hover:bg-indigo-700 transition-colors"
              >
                Browse listings
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {conversations.map((convo, i) => (
                <ConversationRow
                  key={`${convo.other_user_id}-${convo.listing_id}-${i}`}
                  convo={convo}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
