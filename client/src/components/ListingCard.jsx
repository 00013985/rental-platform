import { Link } from 'react-router-dom';
import { MapPinIcon, StarIcon, UserCircleIcon } from '@heroicons/react/24/solid';
import { imgUrl } from '../utils/imgUrl';

// Renders up to 5 stars, supports half-star precision via fill width trick
function Stars({ rating, count }) {
  if (!rating) return null;
  const pct = Math.round((rating / 5) * 100);
  return (
    <div className="flex items-center gap-1">
      {/* star track */}
      <div className="relative inline-flex">
        {/* empty stars */}
        <div className="flex text-gray-200">
          {[...Array(5)].map((_, i) => (
            <StarIcon key={i} className="w-3.5 h-3.5" />
          ))}
        </div>
        {/* filled stars clipped by width */}
        <div
          className="absolute inset-0 flex text-amber-400 overflow-hidden"
          style={{ width: `${pct}%` }}
        >
          {[...Array(5)].map((_, i) => (
            <StarIcon key={i} className="w-3.5 h-3.5 flex-shrink-0" />
          ))}
        </div>
      </div>
      <span className="text-xs text-gray-500">
        {Number(rating).toFixed(1)}
        {count != null && <span className="ml-0.5">({count})</span>}
      </span>
    </div>
  );
}

export default function ListingCard({ listing }) {
  const {
    id,
    title,
    price_per_day,
    location,
    category_name,
    owner_name,
    owner_avatar,
    primary_image,
    average_rating,
    review_count,
  } = listing;

  return (
    <Link
      to={`/listings/${id}`}
      className="group flex flex-col bg-white rounded-2xl border border-gray-200 overflow-hidden hover:shadow-md hover:border-indigo-200 transition-all duration-200"
    >
      {/* Image — 4:3 aspect ratio */}
      <div className="relative w-full" style={{ paddingBottom: '75%' }}>
        {primary_image ? (
          <img
            src={imgUrl(primary_image)}
            alt={title}
            className="absolute inset-0 w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-300"
            loading="lazy"
          />
        ) : (
          <div className="absolute inset-0 w-full h-full bg-gray-100 flex flex-col items-center justify-center gap-2">
            <svg className="w-10 h-10 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v13.5A1.5 1.5 0 003.75 21z"
              />
            </svg>
            <span className="text-xs text-gray-400">No image</span>
          </div>
        )}

        {/* Category badge */}
        {category_name && (
          <span className="absolute top-2.5 left-2.5 bg-white/90 backdrop-blur-sm text-indigo-700 text-[11px] font-semibold px-2 py-0.5 rounded-full shadow-sm">
            {category_name}
          </span>
        )}
      </div>

      {/* Body */}
      <div className="flex flex-col flex-1 p-4 gap-2">
        {/* Title */}
        <h3 className="text-sm font-semibold text-gray-900 leading-snug line-clamp-2 group-hover:text-indigo-700 transition-colors">
          {title}
        </h3>

        {/* Rating */}
        <Stars rating={average_rating} count={review_count} />

        {/* Location */}
        {location && (
          <div className="flex items-center gap-1 text-gray-400">
            <MapPinIcon className="w-3.5 h-3.5 flex-shrink-0" />
            <span className="text-xs truncate">{location}</span>
          </div>
        )}

        {/* Footer: owner + price */}
        <div className="flex items-center justify-between mt-auto pt-2 border-t border-gray-100">
          <div className="flex items-center gap-1.5">
            {owner_avatar ? (
              <img
                src={imgUrl(owner_avatar)}
                alt={owner_name}
                className="w-5 h-5 rounded-full object-cover"
              />
            ) : (
              <UserCircleIcon className="w-5 h-5 text-gray-300" />
            )}
            <span className="text-xs text-gray-500 truncate max-w-[80px]">{owner_name}</span>
          </div>

          <div className="text-right">
            <span className="text-base font-bold text-gray-900">
              ${Number(price_per_day).toFixed(2)}
            </span>
            <span className="text-xs text-gray-400"> /day</span>
          </div>
        </div>
      </div>
    </Link>
  );
}
