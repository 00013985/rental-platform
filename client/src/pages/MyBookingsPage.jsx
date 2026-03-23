import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  CalendarDaysIcon,
  UserCircleIcon,
  StarIcon,
  XMarkIcon,
  ClockIcon,
  TicketIcon,
} from '@heroicons/react/24/outline';
import { StarIcon as StarSolid } from '@heroicons/react/24/solid';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';

// ── Status badge ───────────────────────────────────────────────────────────

const STATUS_STYLES = {
  pending:   'bg-yellow-50  text-yellow-700  ring-yellow-200',
  accepted:  'bg-emerald-50 text-emerald-700 ring-emerald-200',
  declined:  'bg-red-50     text-red-700     ring-red-200',
  cancelled: 'bg-gray-100   text-gray-500    ring-gray-200',
  completed: 'bg-blue-50    text-blue-700    ring-blue-200',
};

const STATUS_LABELS = {
  pending:   'Pending',
  accepted:  'Accepted',
  declined:  'Declined',
  cancelled: 'Cancelled',
  completed: 'Completed',
};

function StatusBadge({ status }) {
  return (
    <span className={`inline-flex items-center text-xs font-semibold px-2.5 py-0.5 rounded-full ring-1 ${STATUS_STYLES[status] ?? STATUS_STYLES.cancelled}`}>
      {STATUS_LABELS[status] ?? status}
    </span>
  );
}

// ── Star rating picker ─────────────────────────────────────────────────────

function StarPicker({ value, onChange }) {
  const [hover, setHover] = useState(0);
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          onMouseEnter={() => setHover(n)}
          onMouseLeave={() => setHover(0)}
          className="focus:outline-none"
        >
          <StarSolid
            className={`w-8 h-8 transition-colors ${
              n <= (hover || value) ? 'text-amber-400' : 'text-gray-200'
            }`}
          />
        </button>
      ))}
    </div>
  );
}

// ── Review modal ───────────────────────────────────────────────────────────

function ReviewModal({ booking, isRenter, onClose, onSuccess }) {
  const [rating, setRating]   = useState(0);
  const [comment, setComment] = useState('');
  const [saving, setSaving]   = useState(false);

  const reviewedName = isRenter ? booking.lender_name : booking.renter_name;

  async function submit() {
    if (rating === 0) { toast.error('Please select a star rating'); return; }
    setSaving(true);
    try {
      await api.post('/api/reviews', {
        booking_id: booking.id,
        rating,
        comment:    comment.trim() || undefined,
      });
      toast.success('Review submitted!');
      onSuccess(booking.id);
    } catch (err) {
      toast.error(err.response?.data?.error ?? 'Failed to submit review');
    } finally {
      setSaving(false);
    }
  }

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-900">Leave a review</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        <p className="text-sm text-gray-500">
          How was your experience with <span className="font-medium text-gray-800">{reviewedName}</span>?
        </p>

        {/* Stars */}
        <div>
          <p className="text-xs font-medium text-gray-600 mb-2">Rating</p>
          <StarPicker value={rating} onChange={setRating} />
          {rating > 0 && (
            <p className="text-xs text-gray-400 mt-1">
              {['', 'Poor', 'Fair', 'Good', 'Very good', 'Excellent'][rating]}
            </p>
          )}
        </div>

        {/* Comment */}
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Comment <span className="text-gray-400 font-normal">(optional)</span>
          </label>
          <textarea
            rows={3}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Share details about the item condition, communication, pickup…"
            className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
          />
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={submit}
            disabled={saving || rating === 0}
            className="flex-1 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed
                       text-white font-semibold py-2.5 rounded-xl transition-colors text-sm
                       flex items-center justify-center gap-2"
          >
            {saving && <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
            {saving ? 'Submitting…' : 'Submit review'}
          </button>
          <button
            onClick={onClose}
            className="px-4 border border-gray-200 text-gray-600 hover:bg-gray-50 rounded-xl text-sm font-medium transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Booking card ───────────────────────────────────────────────────────────

function BookingCard({ booking, isRenter, onAction, onReviewSuccess }) {
  const [acting, setActing]       = useState(null); // which action is in-flight
  const [showReview, setShowReview] = useState(false);

  // Which party's name to show depends on the tab
  const otherName = isRenter ? booking.lender_name : booking.renter_name;
  const { status } = booking;

  async function doAction(action) {
    setActing(action);
    try {
      const { data } = await api.patch(`/api/bookings/${booking.id}/status`, { action });
      toast.success(`Booking ${action}ed`);
      onAction(booking.id, data.booking.status);
    } catch (err) {
      toast.error(err.response?.data?.error ?? `Failed to ${action} booking`);
    } finally {
      setActing(null);
    }
  }

  function ActionBtn({ action, label, style }) {
    const loading = acting === action;
    return (
      <button
        onClick={() => doAction(action)}
        disabled={!!acting}
        className={`flex items-center justify-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg
                    transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${style}`}
      >
        {loading && <span className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />}
        {label}
      </button>
    );
  }

  return (
    <>
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden hover:shadow-md transition-shadow">
        <div className="flex gap-4 p-5">
          {/* Thumbnail */}
          <div className="flex-shrink-0 w-20 h-20 rounded-xl overflow-hidden bg-gray-100">
            {booking.listing_primary_image ? (
              <img
                src={booking.listing_primary_image}
                alt={booking.listing_title}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <TicketIcon className="w-8 h-8 text-gray-300" />
              </div>
            )}
          </div>

          {/* Main content */}
          <div className="flex-1 min-w-0 space-y-2">
            {/* Top row: title + badge */}
            <div className="flex items-start justify-between gap-3">
              <Link
                to={`/listings/${booking.listing_id}`}
                className="text-sm font-semibold text-gray-900 hover:text-indigo-700 line-clamp-2 leading-snug transition-colors"
              >
                {booking.listing_title}
              </Link>
              <StatusBadge status={status} />
            </div>

            {/* Other party */}
            <div className="flex items-center gap-1.5 text-gray-500">
              <UserCircleIcon className="w-3.5 h-3.5 flex-shrink-0" />
              <span className="text-xs">
                {isRenter ? 'Lender' : 'Renter'}:{' '}
                <span className="font-medium text-gray-700">{otherName}</span>
              </span>
            </div>

            {/* Dates */}
            <div className="flex items-center gap-1.5 text-gray-500">
              <CalendarDaysIcon className="w-3.5 h-3.5 flex-shrink-0" />
              <span className="text-xs">
                {new Date(booking.start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                {' → '}
                {new Date(booking.end_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </span>
            </div>

            {/* Pricing */}
            <div className="flex items-center gap-3 text-xs text-gray-500">
              <span>
                Subtotal:{' '}
                <span className="font-semibold text-gray-800">
                  ${(booking.total_price - booking.platform_fee).toFixed(2)}
                </span>
              </span>
              <span className="text-gray-300">·</span>
              <span>
                Fee:{' '}
                <span className="font-semibold text-gray-800">${Number(booking.platform_fee).toFixed(2)}</span>
              </span>
              <span className="text-gray-300">·</span>
              <span>
                Total:{' '}
                <span className="font-bold text-indigo-700">${Number(booking.total_price).toFixed(2)}</span>
              </span>
            </div>
          </div>
        </div>

        {/* Action bar */}
        {(() => {
          const buttons = [];

          // Lender-only actions
          if (!isRenter) {
            if (status === 'pending') {
              buttons.push(
                <ActionBtn key="accept"  action="accept"  label="Accept"  style="bg-emerald-600 hover:bg-emerald-700 text-white" />,
                <ActionBtn key="decline" action="decline" label="Decline" style="bg-red-50 hover:bg-red-100 text-red-700 ring-1 ring-red-200" />
              );
            }
            if (status === 'accepted') {
              buttons.push(
                <ActionBtn key="complete" action="complete" label="Mark Complete" style="bg-blue-600 hover:bg-blue-700 text-white" />
              );
            }
          }

          // Cancel — both parties
          if (status === 'pending' || status === 'accepted') {
            buttons.push(
              <ActionBtn key="cancel" action="cancel" label="Cancel" style="bg-gray-100 hover:bg-gray-200 text-gray-700" />
            );
          }

          // Leave review — completed bookings only, before a review is left
          // (we track reviewed bookings in parent via onReviewSuccess)
          if (status === 'completed' && !booking._reviewed) {
            buttons.push(
              <button
                key="review"
                onClick={() => setShowReview(true)}
                className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg
                           bg-amber-50 hover:bg-amber-100 text-amber-700 ring-1 ring-amber-200 transition-colors"
              >
                <StarIcon className="w-3.5 h-3.5" />
                Leave Review
              </button>
            );
          }

          if (buttons.length === 0) return null;

          return (
            <div className="flex flex-wrap gap-2 px-5 pb-4">
              {buttons}
            </div>
          );
        })()}
      </div>

      {showReview && (
        <ReviewModal
          booking={booking}
          isRenter={isRenter}
          onClose={() => setShowReview(false)}
          onSuccess={(bookingId) => {
            setShowReview(false);
            onReviewSuccess(bookingId);
          }}
        />
      )}
    </>
  );
}

// ── Skeleton ───────────────────────────────────────────────────────────────

function Skeleton() {
  return (
    <div className="space-y-4">
      {[...Array(3)].map((_, i) => (
        <div key={i} className="bg-white rounded-2xl border border-gray-200 p-5 animate-pulse">
          <div className="flex gap-4">
            <div className="w-20 h-20 rounded-xl bg-gray-200 flex-shrink-0" />
            <div className="flex-1 space-y-3">
              <div className="flex justify-between">
                <div className="h-4 bg-gray-200 rounded w-2/3" />
                <div className="h-5 bg-gray-200 rounded-full w-20" />
              </div>
              <div className="h-3 bg-gray-200 rounded w-1/3" />
              <div className="h-3 bg-gray-200 rounded w-1/2" />
              <div className="h-3 bg-gray-200 rounded w-2/3" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Empty state ────────────────────────────────────────────────────────────

function EmptyState({ isRenter }) {
  return (
    <div className="text-center py-20 bg-white rounded-2xl border border-gray-200">
      <ClockIcon className="w-12 h-12 text-gray-300 mx-auto mb-4" />
      <h3 className="text-lg font-semibold text-gray-900 mb-2">No bookings yet</h3>
      <p className="text-sm text-gray-500 max-w-xs mx-auto mb-6">
        {isRenter
          ? "You haven't booked anything yet. Find something you need and send a request."
          : "You haven't received any booking requests yet. Make sure your listings are active and available."}
      </p>
      {isRenter && (
        <Link
          to="/listings"
          className="inline-block bg-indigo-600 text-white text-sm font-semibold px-5 py-2.5 rounded-xl hover:bg-indigo-700 transition-colors"
        >
          Browse listings
        </Link>
      )}
      {!isRenter && (
        <Link
          to="/listings/new"
          className="inline-block border border-indigo-200 text-indigo-600 text-sm font-semibold px-5 py-2.5 rounded-xl hover:bg-indigo-50 transition-colors"
        >
          Create a listing
        </Link>
      )}
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────

const TABS = [
  { key: 'renter', label: 'As Renter' },
  { key: 'lender', label: 'As Lender' },
];

export default function MyBookingsPage() {
  const { user } = useAuth();

  const [allBookings, setAllBookings] = useState([]);
  const [loading, setLoading]         = useState(true);
  const [tab, setTab]                 = useState('renter');
  // Track which completed booking IDs have been reviewed this session
  const [reviewed, setReviewed]       = useState(new Set());

  const fetchBookings = useCallback(async () => {
    try {
      const { data } = await api.get('/api/bookings/my');
      setAllBookings(data.bookings);
    } catch {
      toast.error('Failed to load bookings');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchBookings(); }, [fetchBookings]);

  // Split into two lists
  const renterBookings = allBookings.filter((b) => b.renter_id === user?.id);
  const lenderBookings = allBookings.filter((b) => b.lender_id === user?.id);
  const displayed      = tab === 'renter' ? renterBookings : lenderBookings;

  // Optimistic status update
  function handleAction(bookingId, newStatus) {
    setAllBookings((prev) =>
      prev.map((b) => b.id === bookingId ? { ...b, status: newStatus } : b)
    );
  }

  function handleReviewSuccess(bookingId) {
    setReviewed((prev) => new Set([...prev, bookingId]));
  }

  const renterCount = renterBookings.length;
  const lenderCount = lenderBookings.length;

  return (
    <div className="bg-gray-50 min-h-screen">
      {/* Page header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
          <h1 className="text-3xl font-extrabold text-gray-900">My bookings</h1>
          <p className="mt-1 text-sm text-gray-500">Track and manage all your rentals</p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        {/* Tab switcher */}
        <div className="flex gap-1 bg-gray-200 p-1 rounded-xl w-fit">
          {TABS.map(({ key, label }) => {
            const count = key === 'renter' ? renterCount : lenderCount;
            return (
              <button
                key={key}
                onClick={() => setTab(key)}
                className={`flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold transition-all ${
                  tab === key
                    ? 'bg-white text-indigo-700 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {label}
                {!loading && count > 0 && (
                  <span className={`text-[11px] font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center ${
                    tab === key ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-300 text-gray-600'
                  }`}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Content */}
        {loading ? (
          <Skeleton />
        ) : displayed.length === 0 ? (
          <EmptyState isRenter={tab === 'renter'} />
        ) : (
          <div className="space-y-4">
            {displayed.map((booking) => (
              <BookingCard
                key={booking.id}
                booking={{ ...booking, _reviewed: reviewed.has(booking.id) }}
                isRenter={tab === 'renter'}
                onAction={handleAction}
                onReviewSuccess={handleReviewSuccess}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
