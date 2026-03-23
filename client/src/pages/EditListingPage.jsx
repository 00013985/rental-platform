import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  CloudArrowUpIcon,
  TrashIcon,
  StarIcon,
  XMarkIcon,
  PhotoIcon,
} from '@heroicons/react/24/outline';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import ListingForm from '../components/ListingForm';

// ── Constants ──────────────────────────────────────────────────────────────
const MAX_IMAGES = 5;
const ACCEPTED   = ['image/jpeg', 'image/png'];
const MAX_BYTES  = 5 * 1024 * 1024;

// ── Image manager (existing + new uploads) ─────────────────────────────────

function ImageManager({ listingId, existingImages, onChange }) {
  const [images, setImages]       = useState(existingImages);
  const [pending, setPending]     = useState([]); // { file, preview }
  const [deleting, setDeleting]   = useState(null);
  const [uploading, setUploading] = useState(false);
  const [dragging, setDragging]   = useState(false);
  const inputRef = useRef(null);

  // Propagate current image list to parent
  useEffect(() => { onChange(images); }, [images]); // eslint-disable-line react-hooks/exhaustive-deps

  const slots = images.length + pending.length;

  function addFiles(incoming) {
    const room     = MAX_IMAGES - slots;
    const accepted = [...incoming]
      .filter((f) => ACCEPTED.includes(f.type) && f.size <= MAX_BYTES)
      .slice(0, room)
      .map((file) => ({ file, preview: URL.createObjectURL(file) }));

    const skipped = [...incoming].length - accepted.length;
    if (skipped > 0) toast.error(`${skipped} file(s) skipped — JPEG/PNG under 5 MB only`);
    setPending((prev) => [...prev, ...accepted]);
  }

  const onDrop = useCallback((e) => {
    e.preventDefault();
    setDragging(false);
    addFiles(e.dataTransfer.files);
  }, [slots]); // eslint-disable-line react-hooks/exhaustive-deps

  const onDragOver  = (e) => { e.preventDefault(); setDragging(true); };
  const onDragLeave = () => setDragging(false);

  function removePending(idx) {
    setPending((prev) => {
      URL.revokeObjectURL(prev[idx].preview);
      return prev.filter((_, i) => i !== idx);
    });
  }

  async function deleteExisting(img) {
    setDeleting(img.id);
    try {
      await api.delete(`/api/listings/${listingId}/images/${img.id}`);
      setImages((prev) => {
        const next = prev.filter((i) => i.id !== img.id);
        // If we removed the primary and something remains, mark first as primary visually
        if (img.is_primary && next.length > 0) {
          next[0] = { ...next[0], is_primary: true };
        }
        return next;
      });
      toast.success('Image removed');
    } catch {
      toast.error('Failed to delete image');
    } finally {
      setDeleting(null);
    }
  }

  async function uploadPending() {
    if (pending.length === 0) return;
    setUploading(true);
    const formData = new FormData();
    pending.forEach(({ file }) => formData.append('images', file));
    try {
      const { data } = await api.post(`/api/listings/${listingId}/images`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setImages(data.images);
      pending.forEach(({ preview }) => URL.revokeObjectURL(preview));
      setPending([]);
      toast.success(`${pending.length} image${pending.length !== 1 ? 's' : ''} uploaded`);
    } catch (err) {
      toast.error(err.response?.data?.error ?? 'Upload failed');
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold text-gray-900 flex items-center gap-2">
          <PhotoIcon className="w-5 h-5 text-indigo-600" />
          Photos ({slots}/{MAX_IMAGES})
        </h3>
        {pending.length > 0 && (
          <button
            type="button"
            onClick={uploadPending}
            disabled={uploading}
            className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60
                       text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors"
          >
            {uploading
              ? <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
              : <CloudArrowUpIcon className="w-3.5 h-3.5" />
            }
            {uploading ? 'Uploading…' : `Upload ${pending.length} new`}
          </button>
        )}
      </div>

      {/* Image grid */}
      {slots > 0 && (
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
          {/* Existing images */}
          {images.map((img) => (
            <div key={img.id} className="relative group aspect-square">
              <div className="w-full h-full rounded-xl overflow-hidden bg-gray-100">
                <img src={img.image_url} alt="" className="w-full h-full object-cover" />
              </div>

              {img.is_primary && (
                <span className="absolute top-1 left-1 flex items-center gap-0.5 text-[9px] font-bold bg-indigo-600 text-white px-1.5 py-0.5 rounded-full">
                  <StarIcon className="w-2.5 h-2.5" /> Cover
                </span>
              )}

              <button
                type="button"
                onClick={() => deleteExisting(img)}
                disabled={deleting === img.id}
                className="absolute top-1 right-1 w-6 h-6 bg-white/90 rounded-full flex items-center justify-center
                           opacity-0 group-hover:opacity-100 transition-opacity shadow hover:bg-red-50 hover:text-red-600
                           disabled:opacity-50"
              >
                {deleting === img.id
                  ? <span className="w-3 h-3 border-2 border-red-400 border-t-transparent rounded-full animate-spin" />
                  : <TrashIcon className="w-3.5 h-3.5" />
                }
              </button>
            </div>
          ))}

          {/* Pending (not yet uploaded) */}
          {pending.map((p, i) => (
            <div key={i} className="relative group aspect-square">
              <div className="w-full h-full rounded-xl overflow-hidden bg-gray-100 ring-2 ring-dashed ring-indigo-300">
                <img src={p.preview} alt={`New ${i + 1}`} className="w-full h-full object-cover opacity-70" />
              </div>
              <span className="absolute top-1 left-1 text-[9px] font-bold bg-amber-500 text-white px-1.5 py-0.5 rounded-full">
                Pending
              </span>
              <button
                type="button"
                onClick={() => removePending(i)}
                className="absolute top-1 right-1 w-6 h-6 bg-white/90 rounded-full flex items-center justify-center
                           opacity-0 group-hover:opacity-100 transition-opacity shadow hover:bg-red-50 hover:text-red-600"
              >
                <XMarkIcon className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Drop zone (only if slots remain) */}
      {slots < MAX_IMAGES && (
        <div
          onDrop={onDrop}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onClick={() => inputRef.current?.click()}
          className={`border-2 border-dashed rounded-2xl p-7 text-center cursor-pointer transition-colors
            ${dragging ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200 hover:border-indigo-400 hover:bg-gray-50'}`}
        >
          <CloudArrowUpIcon className="w-8 h-8 text-gray-300 mx-auto mb-2" />
          <p className="text-sm text-gray-500">
            Drop images here or <span className="text-indigo-600 font-medium">browse</span>
          </p>
          <p className="text-xs text-gray-400 mt-1">
            JPEG / PNG · max 5 MB · {MAX_IMAGES - slots} slot{MAX_IMAGES - slots !== 1 ? 's' : ''} left
          </p>
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png"
            multiple
            className="sr-only"
            onChange={(e) => addFiles(e.target.files)}
          />
        </div>
      )}
    </div>
  );
}

// ── Page skeleton ──────────────────────────────────────────────────────────

function PageSkeleton() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-10 animate-pulse space-y-5">
      <div className="h-8 bg-gray-200 rounded-xl w-1/3" />
      <div className="h-4 bg-gray-200 rounded w-1/2" />
      <div className="bg-white rounded-2xl border border-gray-200 p-8 space-y-4">
        {[...Array(6)].map((_, i) => <div key={i} className="h-10 bg-gray-100 rounded-xl" />)}
      </div>
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────

export default function EditListingPage() {
  const { id }    = useParams();
  const navigate  = useNavigate();
  const { user }  = useAuth();

  const [listing, setListing]     = useState(null);
  const [loading, setLoading]     = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [fetchError, setFetchError] = useState(null);

  useEffect(() => {
    api.get(`/api/listings/${id}`)
      .then(({ data }) => {
        const l = data.listing;
        // Redirect non-owners immediately
        if (user && l.owner_id !== user.id) {
          navigate(`/listings/${id}`, { replace: true });
          return;
        }
        setListing(l);
      })
      .catch(() => setFetchError('Listing not found.'))
      .finally(() => setLoading(false));
  }, [id, user, navigate]);

  // Build defaultValues for the form from the fetched listing
  const defaultValues = listing
    ? {
        title:         listing.title,
        category_id:   String(listing.category_id ?? ''),
        description:   listing.description ?? '',
        price_per_day: listing.price_per_day,
        condition:     listing.condition ?? 'good',
        location:      listing.location ?? '',
        is_available:  listing.is_available,
      }
    : undefined;

  async function handleFormSubmit(data) {
    setSubmitting(true);
    try {
      await api.put(`/api/listings/${id}`, {
        title:         data.title,
        description:   data.description,
        category_id:   Number(data.category_id),
        price_per_day: data.price_per_day,
        condition:     data.condition,
        location:      data.location || undefined,
        is_available:  data.is_available,
      });
      toast.success('Listing updated!');
      navigate(`/listings/${id}`);
    } catch (err) {
      toast.error(err.response?.data?.error ?? 'Failed to update listing');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <PageSkeleton />;

  if (fetchError || !listing) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-24 text-center">
        <p className="text-gray-500">{fetchError ?? 'Listing not found.'}</p>
        <Link to="/listings" className="mt-4 inline-block text-indigo-600 hover:text-indigo-700 font-medium">
          ← Back to listings
        </Link>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 min-h-screen py-10">
      <div className="max-w-2xl mx-auto px-4 space-y-8">
        {/* Header */}
        <div>
          <Link to={`/listings/${id}`} className="text-sm text-indigo-600 hover:text-indigo-700">
            ← Back to listing
          </Link>
          <h1 className="mt-3 text-3xl font-extrabold text-gray-900">Edit listing</h1>
          <p className="mt-1 text-sm text-gray-500 line-clamp-1">{listing.title}</p>
        </div>

        {/* ── Details form ── */}
        <section className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-6">Listing details</h2>
          <ListingForm
            defaultValues={defaultValues}
            onSubmit={handleFormSubmit}
            submitLabel="Save changes"
            isSubmitting={submitting}
          />
        </section>

        {/* ── Image manager ── */}
        <section className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8">
          <ImageManager
            listingId={id}
            existingImages={listing.images ?? []}
            onChange={() => {}} // local state is self-contained inside ImageManager
          />
        </section>

        {/* Bottom cancel link */}
        <div className="text-center pb-6">
          <Link
            to={`/listings/${id}`}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            Cancel — discard changes
          </Link>
        </div>
      </div>
    </div>
  );
}
