import { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import {
  MapPinIcon,
  StarIcon,
  UserCircleIcon,
  CalendarDaysIcon,
  TagIcon,
  PencilSquareIcon,
  CheckCircleIcon,
  XCircleIcon,
  PhotoIcon,
} from '@heroicons/react/24/outline';
import { StarIcon as StarSolid } from '@heroicons/react/24/solid';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import MessageButton from '../components/MessageButton';
import { imgUrl } from '../utils/imgUrl';

// ── Shared helpers ─────────────────────────────────────────────────────────

function Stars({ rating, count, size = 'sm' }) {
  if (!rating && rating !== 0) return null;
  const pct = Math.round((Number(rating) / 5) * 100);
  const iconClass = size === 'lg' ? 'w-5 h-5' : 'w-4 h-4';
  return (
    <div className="flex items-center gap-1.5">
      <div className="relative inline-flex">
        <div className="flex text-gray-200">
          {[...Array(5)].map((_, i) => <StarSolid key={i} className={iconClass} />)}
        </div>
        <div
          className="absolute inset-0 flex text-amber-400 overflow-hidden"
          style={{ width: `${pct}%` }}
        >
          {[...Array(5)].map((_, i) => <StarSolid key={i} className={`${iconClass} flex-shrink-0`} />)}
        </div>
      </div>
      <span className={`text-gray-600 ${size === 'lg' ? 'text-sm' : 'text-xs'}`}>
        {Number(rating).toFixed(1)}
        {count != null && <span className="text-gray-400 ml-1">({count} {count === 1 ? 'review' : 'reviews'})</span>}
      </span>
    </div>
  );
}

const CONDITION_STYLES = {
  new:  'bg-emerald-50 text-emerald-700 ring-emerald-200',
  good: 'bg-blue-50   text-blue-700   ring-blue-200',
  fair: 'bg-amber-50  text-amber-700  ring-amber-200',
};

function daysBetween(start, end) {
  if (!start || !end) return 0;
  const ms = new Date(end) - new Date(start);
  return Math.max(0, Math.round(ms / (1000 * 60 * 60 * 24)));
}

function fmt(dateStr) {
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
  });
}

function todayISO() {
  return new Date().toISOString().split('T')[0];
}

// ── Image gallery ──────────────────────────────────────────────────────────

function ImageGallery({ images, title }) {
  const [activeIdx, setActiveIdx] = useState(0);

  useEffect(() => {
    // Reset when listing changes
    setActiveIdx(0);
  }, [images]);

  if (!images || images.length === 0) {
    return (
      <div className="w-full rounded-2xl bg-gray-100 flex flex-col items-center justify-center gap-3"
           style={{ aspectRatio: '4/3' }}>
        <PhotoIcon className="w-16 h-16 text-gray-300" />
        <span className="text-sm text-gray-400">No images uploaded yet</span>
      </div>
    );
  }

  const active = images[activeIdx];

  return (
    <div className="space-y-3">
      {/* Main image */}
      <div className="w-full rounded-2xl overflow-hidden bg-gray-100" style={{ aspectRatio: '4/3' }}>
        <img
          src={imgUrl(active.image_url)}
          alt={`${title} — image ${activeIdx + 1}`}
          className="w-full h-full object-cover"
        />
      </div>

      {/* Thumbnails */}
      {images.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {images.map((img, i) => (
            <button
              key={img.id}
              onClick={() => setActiveIdx(i)}
              className={`flex-shrink-0 w-16 h-16 rounded-xl overflow-hidden border-2 transition-all ${
                i === activeIdx
                  ? 'border-indigo-500 ring-2 ring-indigo-200'
                  : 'border-transparent hover:border-gray-300'
              }`}
            >
              <img src={imgUrl(img.image_url)} alt={`Thumbnail ${i + 1}`} className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Booking form ───────────────────────────────────────────────────────────

function BookingForm({ listing, onSuccess }) {
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm({ defaultValues: { start_date: '', end_date: '', renter_message: '' } });

  const startDate = watch('start_date');
  const endDate   = watch('end_date');
  const days      = daysBetween(startDate, endDate);
  const subtotal  = parseFloat((listing.price_per_day * days).toFixed(2));
  const fee       = parseFloat((subtotal * 0.10).toFixed(2));
  const total     = parseFloat((subtotal + fee).toFixed(2));

  async function onSubmit(data) {
    try {
      await api.post('/api/bookings', {
        listing_id:     listing.id,
        start_date:     data.start_date,
        end_date:       data.end_date,
        renter_message: data.renter_message || undefined,
      });
      toast.success('Booking request sent!');
      onSuccess();
    } catch (err) {
      const msg = err.response?.data?.error || 'Failed to submit booking request';
      toast.error(msg);
    }
  }

  const inputClass = (hasErr) =>
    `w-full rounded-lg border px-3 py-2 text-sm outline-none transition
     focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500
     ${hasErr ? 'border-red-400 bg-red-50' : 'border-gray-300'}`;

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-gray-900 mb-5 flex items-center gap-2">
        <CalendarDaysIcon className="w-5 h-5 text-indigo-600" />
        Request a booking
      </h2>

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
        {/* Dates row */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Start date</label>
            <input
              type="date"
              min={todayISO()}
              className={inputClass(!!errors.start_date)}
              {...register('start_date', { required: 'Required' })}
            />
            {errors.start_date && <p className="mt-1 text-xs text-red-500">{errors.start_date.message}</p>}
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">End date</label>
            <input
              type="date"
              min={startDate || todayISO()}
              className={inputClass(!!errors.end_date)}
              {...register('end_date', {
                required: 'Required',
                validate: (val) => !startDate || new Date(val) > new Date(startDate) || 'Must be after start',
              })}
            />
            {errors.end_date && <p className="mt-1 text-xs text-red-500">{errors.end_date.message}</p>}
          </div>
        </div>

        {/* Price breakdown */}
        {days > 0 && (
          <div className="rounded-xl bg-indigo-50 border border-indigo-100 p-4 space-y-1.5 text-sm">
            <div className="flex justify-between text-gray-700">
              <span>${Number(listing.price_per_day).toFixed(2)} × {days} day{days !== 1 ? 's' : ''}</span>
              <span>${subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-gray-500">
              <span>Platform fee (10%)</span>
              <span>${fee.toFixed(2)}</span>
            </div>
            <div className="flex justify-between font-bold text-gray-900 pt-1.5 border-t border-indigo-200">
              <span>Total</span>
              <span>${total.toFixed(2)}</span>
            </div>
          </div>
        )}

        {/* Message */}
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Message to owner <span className="text-gray-400 font-normal">(optional)</span>
          </label>
          <textarea
            rows={3}
            placeholder="Introduce yourself and explain your planned use…"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none transition focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-none"
            {...register('renter_message')}
          />
        </div>

        <button
          type="submit"
          disabled={isSubmitting || days === 0}
          className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-2.5 rounded-xl transition-colors text-sm"
        >
          {isSubmitting ? 'Sending request…' : 'Request Booking'}
        </button>
      </form>
    </div>
  );
}

// ── Owner card ─────────────────────────────────────────────────────────────

function OwnerCard({ listing, isOwner }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
      <div className="flex items-start gap-4">
        {listing.owner_avatar ? (
          <img
            src={imgUrl(listing.owner_avatar)}
            alt={listing.owner_name}
            className="w-14 h-14 rounded-full object-cover ring-2 ring-indigo-100 flex-shrink-0"
          />
        ) : (
          <UserCircleIcon className="w-14 h-14 text-gray-300 flex-shrink-0" />
        )}
        <div className="min-w-0">
          <p className="font-semibold text-gray-900 text-base">{listing.owner_name}</p>
          {listing.owner_member_since && (
            <p className="text-xs text-gray-400 mt-0.5">
              Member since {fmt(listing.owner_member_since)}
            </p>
          )}
          {listing.average_rating > 0 && (
            <div className="mt-1.5">
              <Stars rating={listing.average_rating} count={listing.review_count} />
            </div>
          )}
        </div>
      </div>

      {listing.owner_bio && (
        <p className="mt-4 text-sm text-gray-600 leading-relaxed">{listing.owner_bio}</p>
      )}

      <div className="mt-4 flex flex-col gap-2">
        <Link
          to={`/profile/${listing.owner_id}`}
          className="text-sm font-medium text-indigo-600 hover:text-indigo-700"
        >
          View full profile →
        </Link>

        {!isOwner && (
          <MessageButton
            ownerId={listing.owner_id}
            listingId={listing.id}
            ownerName={listing.owner_name}
          />
        )}
      </div>
    </div>
  );
}

// ── Reviews section ────────────────────────────────────────────────────────

function ReviewsSection({ ownerId }) {
  const [reviews, setReviews]   = useState([]);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    if (!ownerId) return;
    api.get(`/api/reviews/user/${ownerId}`)
      .then(({ data }) => setReviews(data.reviews.slice(0, 5)))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [ownerId]);

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(2)].map((_, i) => (
          <div key={i} className="animate-pulse bg-gray-100 rounded-xl h-20" />
        ))}
      </div>
    );
  }

  if (reviews.length === 0) {
    return (
      <div className="text-center py-10 bg-gray-50 rounded-2xl border border-gray-100">
        <StarIcon className="w-10 h-10 text-gray-300 mx-auto mb-3" />
        <p className="text-sm text-gray-400">No reviews yet for this owner</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {reviews.map((r) => (
        <div key={r.id} className="bg-gray-50 rounded-2xl p-5 border border-gray-100">
          <div className="flex items-start gap-3">
            {r.reviewer_avatar ? (
              <img src={imgUrl(r.reviewer_avatar)} alt={r.reviewer_name} className="w-9 h-9 rounded-full object-cover flex-shrink-0" />
            ) : (
              <UserCircleIcon className="w-9 h-9 text-gray-300 flex-shrink-0" />
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-semibold text-gray-900">{r.reviewer_name}</p>
                <span className="text-xs text-gray-400 flex-shrink-0">{fmt(r.created_at)}</span>
              </div>
              <div className="mt-1">
                <Stars rating={r.rating} />
              </div>
              {r.comment && (
                <p className="mt-2 text-sm text-gray-600 leading-relaxed">{r.comment}</p>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Page skeleton ──────────────────────────────────────────────────────────

function PageSkeleton() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 animate-pulse">
      <div className="grid lg:grid-cols-[1fr_380px] gap-10">
        <div className="space-y-4">
          <div className="rounded-2xl bg-gray-200" style={{ aspectRatio: '4/3' }} />
          <div className="flex gap-2">
            {[...Array(4)].map((_, i) => <div key={i} className="w-16 h-16 rounded-xl bg-gray-200" />)}
          </div>
        </div>
        <div className="space-y-4">
          <div className="h-8 bg-gray-200 rounded-xl w-3/4" />
          <div className="h-4 bg-gray-200 rounded w-1/2" />
          <div className="h-12 bg-gray-200 rounded-xl w-1/3 mt-4" />
          <div className="space-y-2 mt-4">
            {[...Array(4)].map((_, i) => <div key={i} className="h-3 bg-gray-200 rounded" />)}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────

export default function ListingDetailPage() {
  const { id }           = useParams();
  const navigate         = useNavigate();
  const { user, isAuthenticated } = useAuth();

  const [listing, setListing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);
  const [toggling, setToggling] = useState(false);

  const isOwner = useMemo(
    () => isAuthenticated && listing && user?.id === listing.owner_id,
    [isAuthenticated, listing, user]
  );

  const showBookingForm = useMemo(
    () => isAuthenticated && listing && !isOwner && listing.is_available && listing.is_active,
    [isAuthenticated, listing, isOwner]
  );

  useEffect(() => {
    setLoading(true);
    api.get(`/api/listings/${id}`)
      .then(({ data }) => setListing(data.listing))
      .catch(() => setError('Listing not found or unavailable.'))
      .finally(() => setLoading(false));
  }, [id]);

  async function toggleAvailability() {
    setToggling(true);
    try {
      const { data } = await api.put(`/api/listings/${id}`, {
        is_available: !listing.is_available,
      });
      setListing((prev) => ({ ...prev, is_available: data.listing.is_available }));
      toast.success(`Listing marked as ${data.listing.is_available ? 'available' : 'unavailable'}`);
    } catch {
      toast.error('Failed to update availability');
    } finally {
      setToggling(false);
    }
  }

  if (loading) return <PageSkeleton />;

  if (error || !listing) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-24 text-center">
        <p className="text-lg text-gray-500">{error ?? 'Listing not found.'}</p>
        <Link to="/listings" className="mt-4 inline-block text-indigo-600 hover:text-indigo-700 font-medium">
          ← Back to listings
        </Link>
      </div>
    );
  }

  return (
    <div className="bg-white min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">

        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-gray-400 mb-8">
          <Link to="/" className="hover:text-gray-600">Home</Link>
          <span>/</span>
          <Link to="/listings" className="hover:text-gray-600">Listings</Link>
          <span>/</span>
          <span className="text-gray-600 truncate">{listing.title}</span>
        </nav>

        {/* ── Two-column layout ── */}
        <div className="grid lg:grid-cols-[1fr_380px] gap-10 items-start">

          {/* Left column */}
          <div className="space-y-8">
            {/* Gallery */}
            <ImageGallery images={listing.images} title={listing.title} />

            {/* Info panel (mobile-first; shown above sidebar on mobile) */}
            <div className="lg:hidden">
              <ListingInfoPanel
                listing={listing}
                isOwner={isOwner}
                toggling={toggling}
                onToggle={toggleAvailability}
              />
            </div>

            {/* Owner card — mobile only */}
            <div className="lg:hidden">
              <OwnerCard
                listing={listing}
                isOwner={isOwner}
                />
            </div>

            {/* Booking form — mobile */}
            <div className="lg:hidden">
              {showBookingForm && (
                <BookingForm listing={listing} onSuccess={() => navigate('/bookings')} />
              )}
            </div>

            {/* Reviews */}
            <section>
              <h2 className="text-xl font-bold text-gray-900 mb-5 flex items-center gap-2">
                <StarIcon className="w-5 h-5 text-amber-400" />
                Owner reviews
              </h2>
              <ReviewsSection ownerId={listing.owner_id} />
            </section>
          </div>

          {/* Right column / sidebar (desktop) */}
          <div className="hidden lg:flex flex-col gap-6 sticky top-24">
            <ListingInfoPanel
              listing={listing}
              isOwner={isOwner}
              toggling={toggling}
              onToggle={toggleAvailability}
            />

            <OwnerCard
              listing={listing}
              isOwner={isOwner}
              isAuthenticated={isAuthenticated}
              navigate={navigate}
            />

            {showBookingForm && (
              <BookingForm listing={listing} onSuccess={() => navigate('/bookings')} />
            )}

            {!isAuthenticated && listing.is_available && (
              <div className="bg-indigo-50 rounded-2xl border border-indigo-100 p-5 text-center">
                <p className="text-sm text-indigo-700 font-medium mb-3">
                  Sign in to request a booking
                </p>
                <Link
                  to="/login"
                  className="inline-block bg-indigo-600 text-white text-sm font-semibold px-5 py-2 rounded-xl hover:bg-indigo-700 transition-colors"
                >
                  Log in
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Listing info panel (extracted so it can render in both columns) ─────────

function ListingInfoPanel({ listing, isOwner, toggling, onToggle }) {
  const conditionLabel = { new: 'New', good: 'Good', fair: 'Fair' };

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm space-y-5">
      {/* Badges row */}
      <div className="flex flex-wrap gap-2">
        {listing.category_name && (
          <span className="flex items-center gap-1 text-xs font-medium bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200 px-2.5 py-0.5 rounded-full">
            <TagIcon className="w-3 h-3" />
            {listing.category_name}
          </span>
        )}
        {listing.condition && (
          <span className={`text-xs font-medium ring-1 px-2.5 py-0.5 rounded-full ${CONDITION_STYLES[listing.condition]}`}>
            {conditionLabel[listing.condition]}
          </span>
        )}
        <span className={`flex items-center gap-1 text-xs font-medium ring-1 px-2.5 py-0.5 rounded-full ${
          listing.is_available
            ? 'bg-emerald-50 text-emerald-700 ring-emerald-200'
            : 'bg-gray-100 text-gray-500 ring-gray-200'
        }`}>
          {listing.is_available
            ? <><CheckCircleIcon className="w-3 h-3" /> Available</>
            : <><XCircleIcon className="w-3 h-3" /> Not available</>
          }
        </span>
      </div>

      {/* Title */}
      <h1 className="text-2xl font-bold text-gray-900 leading-snug">{listing.title}</h1>

      {/* Price */}
      <div className="flex items-baseline gap-1">
        <span className="text-4xl font-extrabold text-indigo-600">
          ${Number(listing.price_per_day).toFixed(2)}
        </span>
        <span className="text-gray-400 text-base">/ day</span>
      </div>

      {/* Location */}
      {listing.location && (
        <div className="flex items-center gap-1.5 text-gray-500">
          <MapPinIcon className="w-4 h-4 flex-shrink-0 text-gray-400" />
          <span className="text-sm">{listing.location}</span>
        </div>
      )}

      {/* Description */}
      {listing.description && (
        <div>
          <p className="text-sm font-medium text-gray-700 mb-1.5">Description</p>
          <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-line">
            {listing.description}
          </p>
        </div>
      )}

      {/* Meta */}
      <p className="text-xs text-gray-400">
        Listed {fmt(listing.created_at)}
      </p>

      {/* Owner actions */}
      {isOwner && (
        <div className="flex flex-col gap-2 pt-2 border-t border-gray-100">
          <Link
            to={`/listings/${listing.id}/edit`}
            className="flex items-center justify-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold text-sm py-2.5 rounded-xl transition-colors"
          >
            <PencilSquareIcon className="w-4 h-4" />
            Edit Listing
          </Link>
          <button
            onClick={onToggle}
            disabled={toggling}
            className={`flex items-center justify-center gap-2 font-semibold text-sm py-2.5 rounded-xl transition-colors disabled:opacity-60 ${
              listing.is_available
                ? 'bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200'
                : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200'
            }`}
          >
            {toggling ? 'Updating…' : listing.is_available ? 'Mark as Unavailable' : 'Mark as Available'}
          </button>
        </div>
      )}
    </div>
  );
}
