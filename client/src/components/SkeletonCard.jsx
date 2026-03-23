export default function SkeletonCard() {
  return (
    <div className="rounded-2xl border border-gray-200 overflow-hidden animate-pulse bg-white">
      {/* Image placeholder — 4:3 ratio matching ListingCard */}
      <div className="relative w-full bg-gray-200" style={{ paddingBottom: '75%' }} />

      <div className="p-4 space-y-3">
        {/* Category + condition badges */}
        <div className="flex gap-2">
          <div className="h-5 w-20 bg-gray-200 rounded-full" />
          <div className="h-5 w-12 bg-gray-200 rounded-full" />
        </div>
        {/* Title */}
        <div className="space-y-1.5">
          <div className="h-4 bg-gray-200 rounded w-full" />
          <div className="h-4 bg-gray-200 rounded w-3/4" />
        </div>
        {/* Rating */}
        <div className="h-3 bg-gray-200 rounded w-24" />
        {/* Footer row */}
        <div className="flex items-center justify-between pt-1">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-gray-200 rounded-full" />
            <div className="h-3 bg-gray-200 rounded w-20" />
          </div>
          <div className="h-5 bg-gray-200 rounded w-16" />
        </div>
      </div>
    </div>
  );
}
