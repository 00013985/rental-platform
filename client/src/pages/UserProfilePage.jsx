import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { UserCircleIcon, StarIcon as StarOutline } from '@heroicons/react/24/outline';
import { StarIcon as StarSolid } from '@heroicons/react/24/solid';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import ListingCard from '../components/ListingCard';
import MessageButton from '../components/MessageButton';

// ── Shared stars component ─────────────────────────────────────────────────

function Stars({ rating, size = 'sm' }) {
  if (!rating) return null;
  const pct = Math.round((Number(rating) / 5) * 100);
  const cls = size === 'lg' ? 'w-5 h-5' : 'w-4 h-4';
  return (
    <div className="relative inline-flex">
      <div className="flex text-gray-200">
        {[...Array(5)].map((_, i) => <StarSolid key={i} className={cls} />)}
      </div>
      <div className="absolute inset-0 flex text-amber-400 overflow-hidden" style={{ width: `${pct}%` }}>
        {[...Array(5)].map((_, i) => <StarSolid key={i} className={`${cls} flex-shrink-0`} />)}
      </div>
    </div>
  );
}

function fmt(dateStr) {
  return new Date(dateStr).toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
}

// ── Tab content: listings ──────────────────────────────────────────────────

function ListingsTab({ userId }) {
  const [listings, setListings] = useState([]);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    api.get('/api/listings', { params: { owner_id: userId, limit: 50 } })
      .then(({ data }) => setListings(data.listings))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [userId]);

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="rounded-2xl border border-gray-200 overflow-hidden animate-pulse">
            <div className="bg-gray-200" style={{ paddingBottom: '75%' }} />
            <div className="p-4 space-y-2">
              <div className="h-4 bg-gray-200 rounded w-3/4" />
              <div className="h-3 bg-gray-200 rounded w-1/2" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (listings.length === 0) {
    return (
      <div className="text-center py-16 bg-gray-50 rounded-2xl border border-gray-100">
        <p className="text-gray-400">No active listings yet.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
      {listings.map((l) => <ListingCard key={l.id} listing={l} />)}
    </div>
  );
}

// ── Tab content: reviews ───────────────────────────────────────────────────

function ReviewsTab({ userId }) {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(`/api/reviews/user/${userId}`)
      .then(({ data }) => setReviews(data.reviews))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [userId]);

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="animate-pulse bg-gray-100 rounded-2xl h-24" />
        ))}
      </div>
    );
  }

  if (reviews.length === 0) {
    return (
      <div className="text-center py-16 bg-gray-50 rounded-2xl border border-gray-100">
        <StarOutline className="w-10 h-10 text-gray-300 mx-auto mb-3" />
        <p className="text-gray-400">No reviews yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {reviews.map((r) => (
        <div key={r.id} className="bg-white rounded-2xl border border-gray-200 p-5">
          <div className="flex items-start gap-3">
            {r.reviewer_avatar
              ? <img src={r.reviewer_avatar} alt={r.reviewer_name} className="w-9 h-9 rounded-full object-cover flex-shrink-0" />
              : <UserCircleIcon className="w-9 h-9 text-gray-300 flex-shrink-0" />
            }
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-semibold text-gray-900">{r.reviewer_name}</span>
                <span className="text-xs text-gray-400 flex-shrink-0">{fmt(r.created_at)}</span>
              </div>
              <div className="mt-1"><Stars rating={r.rating} /></div>
              {r.comment && <p className="mt-2 text-sm text-gray-600 leading-relaxed">{r.comment}</p>}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────

const TABS = ['Listings', 'Reviews'];

export default function UserProfilePage() {
  const { id } = useParams();
  const { user, isAuthenticated } = useAuth();

  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab]         = useState('Listings');

  const isOwnProfile = isAuthenticated && user?.id === Number(id);

  useEffect(() => {
    setLoading(true);
    api.get(`/api/users/${id}`)
      .then(({ data }) => setProfile(data.user))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12 animate-pulse">
        <div className="flex items-center gap-6 mb-8">
          <div className="w-24 h-24 rounded-full bg-gray-200 flex-shrink-0" />
          <div className="space-y-3 flex-1">
            <div className="h-7 bg-gray-200 rounded w-1/3" />
            <div className="h-4 bg-gray-200 rounded w-1/4" />
            <div className="h-4 bg-gray-200 rounded w-1/2" />
          </div>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-24 text-center">
        <p className="text-gray-500">User not found.</p>
        <Link to="/" className="mt-4 inline-block text-indigo-600 hover:text-indigo-700 font-medium">← Home</Link>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 min-h-screen">
      {/* Profile header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
            {/* Avatar */}
            {profile.avatar_url
              ? <img src={profile.avatar_url} alt={profile.name} className="w-24 h-24 rounded-full object-cover ring-4 ring-indigo-100 flex-shrink-0" />
              : <UserCircleIcon className="w-24 h-24 text-gray-300 flex-shrink-0" />
            }

            {/* Info */}
            <div className="flex-1 text-center sm:text-left">
              <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                <h1 className="text-2xl font-extrabold text-gray-900">{profile.name}</h1>
                {isOwnProfile && (
                  <Link
                    to="/profile/me"
                    className="text-xs font-medium border border-gray-300 text-gray-600 px-3 py-1 rounded-full hover:bg-gray-50 transition-colors"
                  >
                    Edit profile
                  </Link>
                )}
              </div>

              <p className="text-sm text-gray-400 mt-1">Member since {fmt(profile.created_at)}</p>

              {/* Rating */}
              {profile.average_rating > 0 && (
                <div className="flex items-center gap-2 mt-2 justify-center sm:justify-start">
                  <Stars rating={profile.average_rating} size="lg" />
                  <span className="text-sm text-gray-600 font-medium">
                    {Number(profile.average_rating).toFixed(1)}
                  </span>
                  <span className="text-sm text-gray-400">
                    ({profile.review_count} {profile.review_count === 1 ? 'review' : 'reviews'})
                  </span>
                </div>
              )}

              {/* Stats row */}
              <div className="flex gap-6 mt-3 justify-center sm:justify-start">
                <div>
                  <span className="text-lg font-bold text-gray-900">{profile.listing_count}</span>
                  <span className="text-sm text-gray-400 ml-1">listing{profile.listing_count !== 1 ? 's' : ''}</span>
                </div>
                <div>
                  <span className="text-lg font-bold text-gray-900">{profile.review_count}</span>
                  <span className="text-sm text-gray-400 ml-1">review{profile.review_count !== 1 ? 's' : ''}</span>
                </div>
              </div>

              {profile.bio && (
                <p className="mt-3 text-sm text-gray-600 leading-relaxed max-w-lg">{profile.bio}</p>
              )}

              {/* Message button */}
              {isAuthenticated && !isOwnProfile && (
                <div className="mt-4 max-w-xs">
                  <MessageButton ownerId={profile.id} listingId={null} ownerName={profile.name} />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        <div className="flex gap-1 bg-gray-200 p-1 rounded-xl w-fit">
          {TABS.map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all ${
                tab === t ? 'bg-white text-indigo-700 shadow-sm' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {tab === 'Listings' && <ListingsTab userId={id} />}
        {tab === 'Reviews'  && <ReviewsTab  userId={id} />}
      </div>
    </div>
  );
}
