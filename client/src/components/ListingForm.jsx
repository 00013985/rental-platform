import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import {
  CurrencyDollarIcon,
  MapPinIcon,
  TagIcon,
} from '@heroicons/react/24/outline';

export const CATEGORIES = [
  { id: 1, name: 'Tools & DIY',           emoji: '🔧' },
  { id: 2, name: 'Camping & Outdoors',    emoji: '⛺' },
  { id: 3, name: 'Electronics & Gadgets', emoji: '📷' },
  { id: 4, name: 'Sports & Fitness',      emoji: '🎽' },
  { id: 5, name: 'Gaming',                emoji: '🎮' },
  { id: 6, name: 'Party & Events',        emoji: '🎉' },
];

const CONDITIONS = [
  { value: 'new',  label: 'New'  },
  { value: 'good', label: 'Good' },
  { value: 'fair', label: 'Fair' },
];

// Shared field-level error message
function FieldError({ message }) {
  if (!message) return null;
  return <p className="mt-1 text-xs text-red-500">{message}</p>;
}

// Shared label
function Label({ htmlFor, children, required }) {
  return (
    <label htmlFor={htmlFor} className="text-sm font-medium text-gray-700 mb-1 flex">
      {children}
      {required && <span className="text-red-400 ml-1">*</span>}
    </label>
  );
}

function inputCls(hasErr) {
  return `w-full rounded-xl border px-3.5 py-2.5 text-sm shadow-sm outline-none transition
    focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500
    ${hasErr ? 'border-red-400 bg-red-50' : 'border-gray-300 bg-white'}`;
}

/**
 * ListingForm — used by both CreateListingPage and EditListingPage.
 *
 * Props:
 *   defaultValues  — pre-populated values (edit mode); omit for create mode
 *   onSubmit(data) — called with validated form data; should return a Promise
 *   submitLabel    — button text (default "Save listing")
 *   isSubmitting   — controls button disabled + spinner state
 */
export default function ListingForm({
  defaultValues,
  onSubmit,
  submitLabel = 'Save listing',
  isSubmitting = false,
}) {
  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm({
    defaultValues: {
      title:        '',
      category_id:  '',
      description:  '',
      price_per_day: '',
      condition:    'good',
      location:     '',
      is_available: true,
      ...defaultValues,
    },
  });

  // Re-populate when defaultValues arrive asynchronously (edit page)
  useEffect(() => {
    if (defaultValues) reset({ ...defaultValues });
  }, [defaultValues, reset]); // eslint-disable-line react-hooks/exhaustive-deps

  const titleLen = (watch('title') ?? '').length;

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-6">

      {/* ── Title ───────────────────────────────────────────────────── */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <Label htmlFor="title" required>Title</Label>
          <span className={`text-xs ${titleLen > 190 ? 'text-red-500' : 'text-gray-400'}`}>
            {titleLen}/200
          </span>
        </div>
        <input
          id="title"
          type="text"
          placeholder="e.g. DeWalt 20V Cordless Drill Set"
          className={inputCls(!!errors.title)}
          {...register('title', {
            required:  'Title is required',
            maxLength: { value: 200, message: 'Title must be 200 characters or fewer' },
          })}
        />
        <FieldError message={errors.title?.message} />
      </div>

      {/* ── Category + Condition row ─────────────────────────────────── */}
      <div className="grid sm:grid-cols-2 gap-5">
        <div>
          <Label htmlFor="category_id" required>
            <span className="flex items-center gap-1">
              <TagIcon className="w-3.5 h-3.5" /> Category
            </span>
          </Label>
          <select
            id="category_id"
            className={inputCls(!!errors.category_id)}
            {...register('category_id', { required: 'Please select a category' })}
          >
            <option value="">— Select category —</option>
            {CATEGORIES.map(({ id, name, emoji }) => (
              <option key={id} value={id}>{emoji} {name}</option>
            ))}
          </select>
          <FieldError message={errors.category_id?.message} />
        </div>

        <div>
          <Label htmlFor="condition">Condition</Label>
          <select id="condition" className={inputCls(false)} {...register('condition')}>
            {CONDITIONS.map(({ value, label }) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* ── Description ─────────────────────────────────────────────── */}
      <div>
        <Label htmlFor="description" required>Description</Label>
        <textarea
          id="description"
          rows={5}
          placeholder="Describe the item — its features, what's included, usage notes…"
          className={inputCls(!!errors.description)}
          style={{ resize: 'vertical' }}
          {...register('description', { required: 'Description is required' })}
        />
        <FieldError message={errors.description?.message} />
      </div>

      {/* ── Price + Location row ─────────────────────────────────────── */}
      <div className="grid sm:grid-cols-2 gap-5">
        <div>
          <Label htmlFor="price_per_day" required>
            <span className="flex items-center gap-1">
              <CurrencyDollarIcon className="w-3.5 h-3.5" /> Price per day ($)
            </span>
          </Label>
          <div className="relative">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm pointer-events-none">
              $
            </span>
            <input
              id="price_per_day"
              type="number"
              step="0.01"
              min="0.01"
              placeholder="0.00"
              className={`${inputCls(!!errors.price_per_day)} pl-7`}
              {...register('price_per_day', {
                required: 'Price is required',
                min:      { value: 0.01, message: 'Price must be at least $0.01' },
                valueAsNumber: true,
              })}
            />
          </div>
          <FieldError message={errors.price_per_day?.message} />
        </div>

        <div>
          <Label htmlFor="location">
            <span className="flex items-center gap-1">
              <MapPinIcon className="w-3.5 h-3.5" /> Location
            </span>
          </Label>
          <input
            id="location"
            type="text"
            placeholder="e.g. Chilanzar, Tashkent"
            className={inputCls(false)}
            {...register('location')}
          />
        </div>
      </div>

      {/* ── Availability toggle ──────────────────────────────────────── */}
      <div className="flex items-start gap-3 bg-gray-50 rounded-xl border border-gray-200 p-4">
        <input
          id="is_available"
          type="checkbox"
          className="mt-0.5 w-4 h-4 rounded text-indigo-600 border-gray-300 focus:ring-indigo-500 cursor-pointer"
          {...register('is_available')}
        />
        <div>
          <label htmlFor="is_available" className="text-sm font-medium text-gray-900 cursor-pointer">
            Available for rent right now
          </label>
          <p className="text-xs text-gray-500 mt-0.5">
            Uncheck this if the item is not yet ready or is temporarily unavailable.
          </p>
        </div>
      </div>

      {/* ── Submit ──────────────────────────────────────────────────── */}
      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 disabled:cursor-not-allowed
                   text-white font-semibold py-3 rounded-xl transition-colors text-sm
                   flex items-center justify-center gap-2"
      >
        {isSubmitting && (
          <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
        )}
        {isSubmitting ? 'Saving…' : submitLabel}
      </button>
    </form>
  );
}
