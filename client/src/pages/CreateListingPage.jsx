import { useState, useRef, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  CloudArrowUpIcon,
  XMarkIcon,
  CheckCircleIcon,
  PhotoIcon,
} from '@heroicons/react/24/outline';
import api from '../api/axios';
import ListingForm from '../components/ListingForm';

// ── Constants ──────────────────────────────────────────────────────────────
const MAX_IMAGES   = 5;
const ACCEPTED     = ['image/jpeg', 'image/png'];
const MAX_BYTES    = 5 * 1024 * 1024; // 5 MB

// ── Image upload step ──────────────────────────────────────────────────────

function ImageUploadStep({ listingId, onFinish }) {
  const [files, setFiles]         = useState([]);   // { file, preview, uploaded, error }
  const [dragging, setDragging]   = useState(false);
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef(null);

  function addFiles(incoming) {
    const remaining = MAX_IMAGES - files.length;
    const accepted  = [...incoming]
      .filter((f) => ACCEPTED.includes(f.type))
      .filter((f) => f.size <= MAX_BYTES)
      .slice(0, remaining)
      .map((file) => ({
        file,
        preview:  URL.createObjectURL(file),
        uploaded: false,
        error:    null,
      }));

    const rejected = [...incoming].length - accepted.length;
    if (rejected > 0) toast.error(`${rejected} file(s) skipped — must be JPEG/PNG under 5 MB`);

    setFiles((prev) => [...prev, ...accepted]);
  }

  function removeFile(idx) {
    setFiles((prev) => {
      URL.revokeObjectURL(prev[idx].preview);
      return prev.filter((_, i) => i !== idx);
    });
  }

  const onDrop = useCallback((e) => {
    e.preventDefault();
    setDragging(false);
    addFiles(e.dataTransfer.files);
  }, [files]); // eslint-disable-line react-hooks/exhaustive-deps

  const onDragOver = (e) => { e.preventDefault(); setDragging(true); };
  const onDragLeave = () => setDragging(false);

  async function uploadAll() {
    const pending = files.filter((f) => !f.uploaded);
    if (pending.length === 0) { onFinish(); return; }

    setUploading(true);
    const formData = new FormData();
    pending.forEach(({ file }) => formData.append('images', file));

    try {
      await api.post(`/api/listings/${listingId}/images`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setFiles((prev) => prev.map((f) => ({ ...f, uploaded: true })));
      toast.success('Images uploaded!');
      setTimeout(onFinish, 800);
    } catch (err) {
      toast.error(err.response?.data?.error ?? 'Upload failed');
    } finally {
      setUploading(false);
    }
  }

  const allUploaded = files.length > 0 && files.every((f) => f.uploaded);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <PhotoIcon className="w-6 h-6 text-indigo-600" />
          Add photos
        </h2>
        <p className="mt-1 text-sm text-gray-500">
          Great photos make your listing stand out. Add up to {MAX_IMAGES} images.
          The first one will be the cover.
        </p>
      </div>

      {/* Drop zone */}
      {files.length < MAX_IMAGES && (
        <div
          onDrop={onDrop}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onClick={() => inputRef.current?.click()}
          className={`relative border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-colors
            ${dragging
              ? 'border-indigo-500 bg-indigo-50'
              : 'border-gray-300 hover:border-indigo-400 hover:bg-gray-50'
            }`}
        >
          <CloudArrowUpIcon className="w-10 h-10 text-gray-400 mx-auto mb-3" />
          <p className="text-sm font-medium text-gray-700">
            Drag & drop images here, or <span className="text-indigo-600">click to browse</span>
          </p>
          <p className="text-xs text-gray-400 mt-1">JPEG or PNG · max 5 MB each · up to {MAX_IMAGES - files.length} more</p>
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

      {/* Preview grid */}
      {files.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
          {files.map((f, i) => (
            <div key={i} className="relative group">
              <div className="aspect-square rounded-xl overflow-hidden bg-gray-100">
                <img src={f.preview} alt={`Preview ${i + 1}`} className="w-full h-full object-cover" />
              </div>

              {/* Primary badge */}
              {i === 0 && (
                <span className="absolute top-1.5 left-1.5 text-[10px] font-bold bg-indigo-600 text-white px-1.5 py-0.5 rounded-full">
                  Cover
                </span>
              )}

              {/* Uploaded check */}
              {f.uploaded && (
                <div className="absolute inset-0 rounded-xl bg-black/30 flex items-center justify-center">
                  <CheckCircleIcon className="w-8 h-8 text-white" />
                </div>
              )}

              {/* Remove button (only before upload) */}
              {!f.uploaded && (
                <button
                  type="button"
                  onClick={() => removeFile(i)}
                  className="absolute top-1.5 right-1.5 w-6 h-6 bg-white/90 rounded-full flex items-center justify-center
                             opacity-0 group-hover:opacity-100 transition-opacity shadow hover:bg-red-50 hover:text-red-600"
                >
                  <XMarkIcon className="w-4 h-4" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-3">
        <button
          type="button"
          onClick={uploadAll}
          disabled={uploading || files.length === 0 || allUploaded}
          className="flex-1 flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700
                     disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-2.5
                     rounded-xl transition-colors text-sm"
        >
          {uploading && <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
          {uploading ? 'Uploading…' : allUploaded ? 'Uploaded ✓' : `Upload ${files.length} photo${files.length !== 1 ? 's' : ''}`}
        </button>
        <button
          type="button"
          onClick={onFinish}
          className="flex-1 border border-gray-300 text-gray-700 hover:bg-gray-50 font-semibold py-2.5 rounded-xl transition-colors text-sm"
        >
          {files.length === 0 ? 'Skip — add photos later' : 'Finish & View Listing'}
        </button>
      </div>
    </div>
  );
}

// ── Steps indicator ────────────────────────────────────────────────────────

function StepIndicator({ step }) {
  const steps = ['Details', 'Photos'];
  return (
    <div className="flex items-center gap-2 mb-8">
      {steps.map((label, i) => {
        const idx    = i + 1;
        const active = idx === step;
        const done   = idx < step;
        return (
          <div key={label} className="flex items-center gap-2">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors
              ${done   ? 'bg-emerald-500 text-white'
              : active ? 'bg-indigo-600 text-white'
              :          'bg-gray-200 text-gray-500'}`}
            >
              {done ? '✓' : idx}
            </div>
            <span className={`text-sm font-medium ${active ? 'text-indigo-700' : done ? 'text-emerald-600' : 'text-gray-400'}`}>
              {label}
            </span>
            {i < steps.length - 1 && (
              <div className={`h-px w-8 mx-1 ${done ? 'bg-emerald-300' : 'bg-gray-200'}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────

export default function CreateListingPage() {
  const navigate = useNavigate();

  const [step, setStep]             = useState(1);   // 1 = form, 2 = image upload
  const [submitting, setSubmitting] = useState(false);
  const [newListingId, setNewListingId] = useState(null);

  async function handleFormSubmit(data) {
    setSubmitting(true);
    try {
      const payload = {
        title:         data.title,
        description:   data.description,
        category_id:   Number(data.category_id),
        price_per_day: data.price_per_day,
        condition:     data.condition,
        location:      data.location || undefined,
        is_available:  data.is_available ?? true,
      };
      const res = await api.post('/api/listings', payload);
      setNewListingId(res.data.listing.id);
      toast.success('Listing created! Now add some photos.');
      setStep(2);
    } catch (err) {
      const msg = err.response?.data?.error ?? 'Failed to create listing';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  }

  function handleFinish() {
    navigate(`/listings/${newListingId}`);
  }

  return (
    <div className="bg-gray-50 min-h-screen py-10">
      <div className="max-w-2xl mx-auto px-4">
        {/* Header */}
        <div className="mb-6">
          <Link to="/listings" className="text-sm text-indigo-600 hover:text-indigo-700">
            ← Back to listings
          </Link>
          <h1 className="mt-3 text-3xl font-extrabold text-gray-900">List an item</h1>
          <p className="mt-1 text-sm text-gray-500">Share something you own and start earning.</p>
        </div>

        <StepIndicator step={step} />

        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8">
          {step === 1 && (
            <ListingForm
              onSubmit={handleFormSubmit}
              submitLabel="Create listing & add photos →"
              isSubmitting={submitting}
            />
          )}

          {step === 2 && newListingId && (
            <ImageUploadStep listingId={newListingId} onFinish={handleFinish} />
          )}
        </div>
      </div>
    </div>
  );
}
