import { useEffect, useState, useCallback } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import {
  AdjustmentsHorizontalIcon,
  XMarkIcon,
  MagnifyingGlassIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from '@heroicons/react/24/outline';
import api from '../api/axios';
import ListingCard from '../components/ListingCard';


const PAGE_SIZE = 12;

// ── Skeleton card ────────────────────────────────────────────────────────────
function CardSkeleton() {
  return (
    <div className="rounded-2xl border border-gray-200 overflow-hidden animate-pulse">
      <div className="bg-gray-200" style={{ paddingBottom: '75%' }} />
      <div className="p-4 space-y-3">
        <div className="h-4 bg-gray-200 rounded w-3/4" />
        <div className="h-3 bg-gray-200 rounded w-1/2" />
        <div className="h-3 bg-gray-200 rounded w-1/3" />
        <div className="flex justify-between pt-1">
          <div className="h-3 bg-gray-200 rounded w-1/4" />
          <div className="h-4 bg-gray-200 rounded w-1/5" />
        </div>
      </div>
    </div>
  );
}

// ── Pagination ───────────────────────────────────────────────────────────────
function Pagination({ page, pages, onPageChange }) {
  if (pages <= 1) return null;

  // Show at most 7 page buttons with ellipsis
  function pageNumbers() {
    if (pages <= 7) return Array.from({ length: pages }, (_, i) => i + 1);
    if (page <= 4)  return [1, 2, 3, 4, 5, '…', pages];
    if (page >= pages - 3) return [1, '…', pages - 4, pages - 3, pages - 2, pages - 1, pages];
    return [1, '…', page - 1, page, page + 1, '…', pages];
  }

  return (
    <nav className="flex items-center justify-center gap-1 mt-10" aria-label="Pagination">
      <button
        onClick={() => onPageChange(page - 1)}
        disabled={page === 1}
        className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
      >
        <ChevronLeftIcon className="w-5 h-5" />
      </button>

      {pageNumbers().map((n, i) =>
        n === '…' ? (
          <span key={`ellipsis-${i}`} className="px-2 py-1 text-gray-400 text-sm">…</span>
        ) : (
          <button
            key={n}
            onClick={() => onPageChange(n)}
            className={`w-9 h-9 rounded-lg text-sm font-medium transition-colors ${
              n === page
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            {n}
          </button>
        )
      )}

      <button
        onClick={() => onPageChange(page + 1)}
        disabled={page === pages}
        className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
      >
        <ChevronRightIcon className="w-5 h-5" />
      </button>
    </nav>
  );
}

// ── Filter sidebar content (shared between desktop sidebar and mobile drawer)
function FilterPanel({ params, onParamChange, onClear, categories }) {
  const selectedCategory = params.get('category') ? Number(params.get('category')) : null;
  const keyword   = params.get('keyword')   ?? '';
  const minPrice  = params.get('min_price') ?? '';
  const maxPrice  = params.get('max_price') ?? '';

  return (
    <div className="space-y-8">
      {/* Keyword search */}
      <div>
        <h3 className="text-sm font-semibold text-gray-900 mb-3">Search</h3>
        <div className="relative">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={keyword}
            placeholder="Drill, tent, camera…"
            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            onChange={(e) => onParamChange('keyword', e.target.value || null)}
          />
        </div>
      </div>

      {/* Category */}
      <div>
        <h3 className="text-sm font-semibold text-gray-900 mb-3">Category</h3>
        <div className="space-y-2">
          {categories.map(({ id, name, icon }) => (
            <label key={id} className="flex items-center gap-2.5 cursor-pointer group">
              <input
                type="checkbox"
                checked={selectedCategory === id}
                className="w-4 h-4 rounded text-indigo-600 border-gray-300 focus:ring-indigo-500"
                onChange={() =>
                  onParamChange('category', selectedCategory === id ? null : String(id))
                }
              />
              <span className="text-sm text-gray-700 group-hover:text-indigo-700 transition-colors">
                {icon} {name}
              </span>
            </label>
          ))}
        </div>
      </div>

      {/* Price range */}
      <div>
        <h3 className="text-sm font-semibold text-gray-900 mb-3">Price per day</h3>
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
            <input
              type="number"
              min={0}
              placeholder="Min"
              value={minPrice}
              className="w-full pl-7 pr-2 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              onChange={(e) => onParamChange('min_price', e.target.value || null)}
            />
          </div>
          <span className="text-gray-400 text-sm flex-shrink-0">to</span>
          <div className="relative flex-1">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
            <input
              type="number"
              min={0}
              placeholder="Max"
              value={maxPrice}
              className="w-full pl-7 pr-2 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              onChange={(e) => onParamChange('max_price', e.target.value || null)}
            />
          </div>
        </div>
      </div>

      {/* Clear */}
      <button
        onClick={onClear}
        className="w-full text-sm text-indigo-600 font-medium hover:text-indigo-800 transition-colors py-1.5 rounded-lg border border-indigo-200 hover:bg-indigo-50"
      >
        Clear all filters
      </button>
    </div>
  );
}

// ── Main page ────────────────────────────────────────────────────────────────
export default function BrowseListingsPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  const [listings, setListings]       = useState([]);
  const [pagination, setPagination]   = useState({ total: 0, page: 1, pages: 0 });
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState(null);
  const [drawerOpen, setDrawerOpen]   = useState(false);
  const [categories, setCategories]   = useState([]);

  // Fetch categories once on mount
  useEffect(() => {
    api.get('/api/categories')
      .then(({ data }) => setCategories(data.categories))
      .catch(() => {});
  }, []);

  const currentPage = Number(searchParams.get('page') ?? 1);

  // ── Fetch listings whenever URL params change
  const fetchListings = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {
        limit: PAGE_SIZE,
        page:  currentPage,
      };
      if (searchParams.get('category'))  params.category  = searchParams.get('category');
      if (searchParams.get('keyword'))   params.keyword   = searchParams.get('keyword');
      if (searchParams.get('min_price')) params.min_price = searchParams.get('min_price');
      if (searchParams.get('max_price')) params.max_price = searchParams.get('max_price');

      const { data } = await api.get('/api/listings', { params });
      setListings(data.listings);
      setPagination(data.pagination);
    } catch {
      setError('Failed to load listings. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [searchParams, currentPage]);

  useEffect(() => {
    fetchListings();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [fetchListings]);

  // ── URL helper — sets or removes a param, always resets to page 1
  function onParamChange(key, value) {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (value == null || value === '') {
        next.delete(key);
      } else {
        next.set(key, value);
      }
      next.set('page', '1'); // reset pagination on filter change
      return next;
    });
  }

  function onPageChange(n) {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('page', String(n));
      return next;
    });
  }

  function clearFilters() {
    setSearchParams({});
  }

  const hasFilters =
    searchParams.get('category') ||
    searchParams.get('keyword') ||
    searchParams.get('min_price') ||
    searchParams.get('max_price');

  const filterProps = { params: searchParams, onParamChange, onClear: clearFilters, categories };

  return (
    <div className="bg-gray-50 min-h-screen">
      {/* Page header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Browse listings</h1>
            {!loading && (
              <p className="mt-1 text-sm text-gray-500">
                {pagination.total > 0
                  ? `${pagination.total} item${pagination.total === 1 ? '' : 's'} available`
                  : 'No items found'}
              </p>
            )}
          </div>

          {/* Mobile filter toggle */}
          <button
            className="lg:hidden flex items-center gap-2 text-sm font-medium text-gray-700 border border-gray-300 px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors"
            onClick={() => setDrawerOpen(true)}
          >
            <AdjustmentsHorizontalIcon className="w-4 h-4" />
            Filters
            {hasFilters && (
              <span className="bg-indigo-600 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                ✓
              </span>
            )}
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex gap-8">

          {/* ── Desktop sidebar ───────────────────────────────────────── */}
          <aside className="hidden lg:block w-64 flex-shrink-0">
            <div className="sticky top-24 bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
              <div className="flex items-center justify-between mb-6">
                <h2 className="font-semibold text-gray-900">Filters</h2>
                {hasFilters && (
                  <button
                    onClick={clearFilters}
                    className="text-xs text-indigo-600 hover:text-indigo-800"
                  >
                    Clear
                  </button>
                )}
              </div>
              <FilterPanel {...filterProps} />
            </div>
          </aside>

          {/* ── Listings grid ─────────────────────────────────────────── */}
          <div className="flex-1 min-w-0">
            {error ? (
              <div className="text-center py-20 bg-white rounded-2xl border border-red-100">
                <p className="text-red-500 mb-4">{error}</p>
                <button
                  onClick={fetchListings}
                  className="text-sm font-medium text-indigo-600 hover:text-indigo-700"
                >
                  Try again
                </button>
              </div>
            ) : loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
                {[...Array(PAGE_SIZE)].map((_, i) => <CardSkeleton key={i} />)}
              </div>
            ) : listings.length === 0 ? (
              /* Empty state */
              <div className="text-center py-24 bg-white rounded-2xl border border-gray-200">
                <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                    d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 15.803a7.5 7.5 0 0010.607 10.607z" />
                </svg>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No listings found</h3>
                <p className="text-gray-500 text-sm mb-6 max-w-sm mx-auto">
                  Try different search terms or clear your filters to see all available items.
                </p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <button
                    onClick={clearFilters}
                    className="text-sm font-medium bg-indigo-600 text-white px-5 py-2 rounded-lg hover:bg-indigo-700 transition-colors"
                  >
                    Clear filters
                  </button>
                  <Link
                    to="/listings/new"
                    className="text-sm font-medium border border-gray-300 text-gray-700 px-5 py-2 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    List an item
                  </Link>
                </div>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
                  {listings.map((listing) => (
                    <ListingCard key={listing.id} listing={listing} />
                  ))}
                </div>
                <Pagination
                  page={pagination.page}
                  pages={pagination.pages}
                  onPageChange={onPageChange}
                />
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── Mobile filter drawer ──────────────────────────────────────── */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setDrawerOpen(false)}
          />
          {/* Panel */}
          <div className="absolute right-0 top-0 h-full w-80 max-w-full bg-white shadow-2xl flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
              <h2 className="font-semibold text-gray-900">Filters</h2>
              <button
                onClick={() => setDrawerOpen(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-5 py-6">
              <FilterPanel
                {...filterProps}
                onParamChange={(k, v) => { onParamChange(k, v); }}
                onClear={() => { clearFilters(); setDrawerOpen(false); }}
              />
            </div>
            <div className="px-5 py-4 border-t border-gray-200">
              <button
                onClick={() => setDrawerOpen(false)}
                className="w-full bg-indigo-600 text-white font-semibold py-2.5 rounded-xl hover:bg-indigo-700 transition-colors text-sm"
              >
                Show results
                {!loading && pagination.total > 0 && ` (${pagination.total})`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
