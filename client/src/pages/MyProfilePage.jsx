import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import {
  UserCircleIcon,
  PencilSquareIcon,
  LockClosedIcon,
  Squares2X2Icon,
  CheckCircleIcon,
  XCircleIcon,
} from '@heroicons/react/24/outline';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import ListingCard from '../components/ListingCard';

// ── Helpers ────────────────────────────────────────────────────────────────

function fmt(dateStr) {
  return new Date(dateStr).toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
}

function SectionCard({ icon: Icon, title, children }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm">
      <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-100">
        <Icon className="w-5 h-5 text-indigo-600" />
        <h2 className="text-base font-semibold text-gray-900">{title}</h2>
      </div>
      <div className="p-6">{children}</div>
    </div>
  );
}

function inputCls(hasErr) {
  return `w-full rounded-xl border px-3.5 py-2.5 text-sm shadow-sm outline-none transition
    focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500
    ${hasErr ? 'border-red-400 bg-red-50' : 'border-gray-300'}`;
}

// ── Edit profile form ──────────────────────────────────────────────────────

function EditProfileForm({ profile, onSaved }) {
  const { register, handleSubmit, formState: { errors, isSubmitting, isDirty } } = useForm({
    defaultValues: {
      name:       profile.name       ?? '',
      bio:        profile.bio        ?? '',
      phone:      profile.phone      ?? '',
      avatar_url: profile.avatar_url ?? '',
    },
  });

  async function onSubmit(data) {
    try {
      const { data: res } = await api.put('/api/users/me', {
        name:       data.name       || undefined,
        bio:        data.bio        || undefined,
        phone:      data.phone      || undefined,
        avatar_url: data.avatar_url || undefined,
      });
      toast.success('Profile updated!');
      onSaved(res.user);
    } catch (err) {
      toast.error(err.response?.data?.error ?? 'Failed to update profile');
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
      <div className="grid sm:grid-cols-2 gap-5">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Name <span className="text-red-400">*</span></label>
          <input
            className={inputCls(!!errors.name)}
            {...register('name', { required: 'Name is required' })}
          />
          {errors.name && <p className="mt-1 text-xs text-red-500">{errors.name.message}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
          <input type="tel" className={inputCls(false)} placeholder="+1-555-0100" {...register('phone')} />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Bio</label>
        <textarea
          rows={3}
          placeholder="Tell renters a bit about yourself…"
          className={inputCls(false)}
          style={{ resize: 'vertical' }}
          {...register('bio')}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Avatar URL</label>
        <input
          type="url"
          placeholder="https://example.com/avatar.jpg"
          className={inputCls(!!errors.avatar_url)}
          {...register('avatar_url', {
            validate: (v) => !v || /^https?:\/\/.+/.test(v) || 'Must be a valid URL',
          })}
        />
        {errors.avatar_url && <p className="mt-1 text-xs text-red-500">{errors.avatar_url.message}</p>}
        <p className="mt-1 text-xs text-gray-400">Image upload coming soon — paste a URL for now.</p>
      </div>

      <button
        type="submit"
        disabled={isSubmitting || !isDirty}
        className="flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700
                   disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold
                   py-2.5 px-6 rounded-xl transition-colors text-sm"
      >
        {isSubmitting && <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
        {isSubmitting ? 'Saving…' : 'Save changes'}
      </button>
    </form>
  );
}

// ── Change password form ───────────────────────────────────────────────────

function ChangePasswordForm() {
  const { register, handleSubmit, watch, reset, formState: { errors, isSubmitting } } = useForm();
  const newPassword = watch('new_password');

  async function onSubmit(data) {
    try {
      await api.put('/api/users/me/password', {
        current_password: data.current_password,
        new_password:     data.new_password,
      });
      toast.success('Password changed successfully');
      reset();
    } catch (err) {
      toast.error(err.response?.data?.error ?? 'Failed to change password');
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5 max-w-md">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Current password</label>
        <input
          type="password"
          autoComplete="current-password"
          className={inputCls(!!errors.current_password)}
          {...register('current_password', { required: 'Required' })}
        />
        {errors.current_password && <p className="mt-1 text-xs text-red-500">{errors.current_password.message}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">New password</label>
        <input
          type="password"
          autoComplete="new-password"
          className={inputCls(!!errors.new_password)}
          {...register('new_password', {
            required:  'Required',
            minLength: { value: 8, message: 'Must be at least 8 characters' },
          })}
        />
        {errors.new_password && <p className="mt-1 text-xs text-red-500">{errors.new_password.message}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Confirm new password</label>
        <input
          type="password"
          autoComplete="new-password"
          className={inputCls(!!errors.confirm)}
          {...register('confirm', {
            required: 'Required',
            validate: (v) => v === newPassword || 'Passwords do not match',
          })}
        />
        {errors.confirm && <p className="mt-1 text-xs text-red-500">{errors.confirm.message}</p>}
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className="flex items-center justify-center gap-2 bg-gray-900 hover:bg-gray-800
                   disabled:opacity-50 text-white font-semibold py-2.5 px-6 rounded-xl
                   transition-colors text-sm"
      >
        {isSubmitting && <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
        {isSubmitting ? 'Updating…' : 'Change password'}
      </button>
    </form>
  );
}

// ── My listings section ────────────────────────────────────────────────────

function MyListings({ userId }) {
  const navigate = useNavigate();
  const [listings, setListings]   = useState([]);
  const [loading, setLoading]     = useState(true);
  const [toggling, setToggling]   = useState(null);

  useEffect(() => {
    api.get('/api/listings', { params: { owner_id: userId, limit: 50 } })
      .then(({ data }) => setListings(data.listings))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [userId]);

  async function toggleAvailability(listing) {
    setToggling(listing.id);
    try {
      const { data } = await api.put(`/api/listings/${listing.id}`, {
        is_available: !listing.is_available,
      });
      setListings((prev) =>
        prev.map((l) => l.id === listing.id ? { ...l, is_available: data.listing.is_available } : l)
      );
      toast.success(`Marked as ${data.listing.is_available ? 'available' : 'unavailable'}`);
    } catch {
      toast.error('Failed to update availability');
    } finally {
      setToggling(null);
    }
  }

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="animate-pulse rounded-2xl border border-gray-200 overflow-hidden">
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
      <div className="text-center py-14 bg-gray-50 rounded-2xl border border-gray-100">
        <p className="text-gray-400 mb-4">You haven't listed anything yet.</p>
        <Link
          to="/listings/new"
          className="inline-block bg-indigo-600 text-white text-sm font-semibold px-5 py-2.5 rounded-xl hover:bg-indigo-700 transition-colors"
        >
          Create your first listing
        </Link>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
      {listings.map((listing) => (
        <div key={listing.id} className="relative group">
          <ListingCard listing={listing} />

          {/* Quick-action overlay */}
          <div className="absolute bottom-0 left-0 right-0 flex gap-2 p-3 bg-gradient-to-t from-white via-white/95 to-transparent rounded-b-2xl opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={() => navigate(`/listings/${listing.id}/edit`)}
              className="flex-1 flex items-center justify-center gap-1 text-xs font-semibold bg-white
                         border border-gray-200 text-gray-700 hover:bg-gray-50 py-1.5 rounded-lg transition-colors shadow-sm"
            >
              <PencilSquareIcon className="w-3.5 h-3.5" /> Edit
            </button>
            <button
              onClick={() => toggleAvailability(listing)}
              disabled={toggling === listing.id}
              className={`flex-1 flex items-center justify-center gap-1 text-xs font-semibold py-1.5 rounded-lg
                         transition-colors shadow-sm disabled:opacity-60 ${
                listing.is_available
                  ? 'bg-amber-50 border border-amber-200 text-amber-700 hover:bg-amber-100'
                  : 'bg-emerald-50 border border-emerald-200 text-emerald-700 hover:bg-emerald-100'
              }`}
            >
              {toggling === listing.id
                ? <span className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                : listing.is_available
                  ? <><XCircleIcon className="w-3.5 h-3.5" /> Unavailable</>
                  : <><CheckCircleIcon className="w-3.5 h-3.5" /> Available</>
              }
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────

export default function MyProfilePage() {
  const { user, isLoading } = useAuth();
  const [profile, setProfile] = useState(null);
  const [fetchLoading, setFetchLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    api.get('/api/auth/me')
      .then(({ data }) => setProfile(data.user))
      .catch(() => {})
      .finally(() => setFetchLoading(false));
  }, [user]);

  if (isLoading || fetchLoading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-12 animate-pulse space-y-6">
        <div className="flex items-center gap-6">
          <div className="w-20 h-20 rounded-full bg-gray-200" />
          <div className="space-y-3 flex-1">
            <div className="h-6 bg-gray-200 rounded w-1/3" />
            <div className="h-4 bg-gray-200 rounded w-1/4" />
          </div>
        </div>
        <div className="h-48 bg-gray-100 rounded-2xl" />
        <div className="h-48 bg-gray-100 rounded-2xl" />
      </div>
    );
  }

  if (!profile) return null;

  return (
    <div className="bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
          <div className="flex items-center gap-5">
            {profile.avatar_url
              ? <img src={profile.avatar_url} alt={profile.name} className="w-20 h-20 rounded-full object-cover ring-4 ring-indigo-100 flex-shrink-0" />
              : <UserCircleIcon className="w-20 h-20 text-gray-300 flex-shrink-0" />
            }
            <div>
              <h1 className="text-2xl font-extrabold text-gray-900">{profile.name}</h1>
              <p className="text-sm text-gray-400 mt-0.5">Member since {fmt(profile.created_at)}</p>
              <Link
                to={`/profile/${profile.id}`}
                className="text-xs text-indigo-600 hover:text-indigo-700 mt-1 inline-block"
              >
                View public profile →
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-8">
        {/* Edit profile */}
        <SectionCard icon={PencilSquareIcon} title="Edit profile">
          <EditProfileForm profile={profile} onSaved={(updated) => setProfile(updated)} />
        </SectionCard>

        {/* Change password */}
        <SectionCard icon={LockClosedIcon} title="Change password">
          <ChangePasswordForm />
        </SectionCard>

        {/* My listings */}
        <SectionCard icon={Squares2X2Icon} title="My listings">
          <MyListings userId={profile.id} />
        </SectionCard>
      </div>
    </div>
  );
}
