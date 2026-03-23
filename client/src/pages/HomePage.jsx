import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ClipboardDocumentListIcon,
  MagnifyingGlassIcon,
  CurrencyDollarIcon,
} from '@heroicons/react/24/outline';
import api from '../api/axios';
import ListingCard from '../components/ListingCard';

const HOW_IT_WORKS = [
  {
    Icon: ClipboardDocumentListIcon,
    title: 'List your item',
    desc: 'Photograph it, set a daily price, and go live in under 2 minutes.',
  },
  {
    Icon: MagnifyingGlassIcon,
    title: 'Browse & contact',
    desc: 'Find what you need nearby, message the owner, and book your dates.',
  },
  {
    Icon: CurrencyDollarIcon,
    title: 'Rent and earn',
    desc: 'Lenders earn on every confirmed booking. Renters avoid buying things once.',
  },
];

// Skeleton card for loading state
function CardSkeleton() {
  return (
    <div className="rounded-2xl border border-gray-200 overflow-hidden animate-pulse">
      <div className="bg-gray-200" style={{ paddingBottom: '75%' }} />
      <div className="p-4 space-y-3">
        <div className="h-4 bg-gray-200 rounded w-3/4" />
        <div className="h-3 bg-gray-200 rounded w-1/2" />
        <div className="h-3 bg-gray-200 rounded w-1/3" />
      </div>
    </div>
  );
}

export default function HomePage() {
  const [categories, setCategories]       = useState([]);
  const [featuredListings, setFeatured]   = useState([]);
  const [listingsLoading, setListLoading] = useState(true);
  const [catLoading, setCatLoading]       = useState(true);

  useEffect(() => {
    api.get('/api/listings', { params: { limit: 6 } })
      .then(({ data }) => setFeatured(data.listings))
      .catch(() => {})
      .finally(() => setListLoading(false));

    api.get('/api/categories')
      .then(({ data }) => setCategories(data.categories))
      .catch(() => {})
      .finally(() => setCatLoading(false));
  }, []);


  return (
    <div className="bg-white">
      {/* ── Hero ─────────────────────────────────────────────────────── */}
      <section className="bg-gradient-to-br from-indigo-600 via-indigo-700 to-violet-800 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-28 text-center">
          <span className="inline-block mb-5 text-sm font-semibold tracking-widest text-indigo-200 uppercase">
            Peer-to-peer rentals
          </span>
          <h1 className="text-5xl sm:text-6xl font-extrabold tracking-tight mb-6 leading-tight">
            Rent what you need,<br className="hidden sm:block" />
            earn from what you own
          </h1>
          <p className="text-lg sm:text-xl text-indigo-200 max-w-2xl mx-auto mb-10">
            A community marketplace for household items — tools, cameras, camping gear, and more.
            No monthly fees, no faff.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/listings"
              className="bg-white text-indigo-700 font-semibold px-8 py-3 rounded-xl hover:bg-indigo-50 transition-colors text-base shadow-lg shadow-indigo-900/20"
            >
              Browse Items
            </Link>
            <Link
              to="/listings/new"
              className="border-2 border-white/60 text-white font-semibold px-8 py-3 rounded-xl hover:bg-white/10 transition-colors text-base"
            >
              List Your Item
            </Link>
          </div>
        </div>
      </section>

      {/* ── Categories ───────────────────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900">Shop by category</h2>
          <p className="mt-3 text-gray-500">Find the right item for your next project or adventure</p>
        </div>

        {catLoading ? (
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="animate-pulse rounded-2xl border border-gray-100 p-5 flex flex-col items-center gap-3">
                <div className="w-10 h-10 bg-gray-200 rounded-full" />
                <div className="h-3 bg-gray-200 rounded w-16" />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            {categories.map(({ id, name, icon }) => (
              <Link
                key={id}
                to={`/listings?category=${id}`}
                className="flex flex-col items-center gap-3 p-5 rounded-2xl border border-gray-100 hover:border-indigo-300 hover:bg-indigo-50 transition-all group"
              >
                <span className="text-4xl">{icon ?? '📦'}</span>
                <span className="text-xs font-medium text-gray-600 group-hover:text-indigo-700 text-center leading-tight">
                  {name}
                </span>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* ── How it works ─────────────────────────────────────────────── */}
      <section className="bg-gray-50 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold text-gray-900">How it works</h2>
            <p className="mt-3 text-gray-500">Three simple steps — whether you&apos;re renting or lending</p>
          </div>
          <div className="grid md:grid-cols-3 gap-10">
            {HOW_IT_WORKS.map(({ Icon, title, desc }, i) => (
              <div key={title} className="text-center">
                <div className="w-16 h-16 rounded-2xl bg-indigo-600 text-white flex items-center justify-center mx-auto mb-5 shadow-md shadow-indigo-200">
                  <Icon className="w-8 h-8" />
                </div>
                <div className="text-xs font-bold text-indigo-500 uppercase tracking-widest mb-2">
                  Step {i + 1}
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Featured listings ────────────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="flex items-end justify-between mb-10">
          <div>
            <h2 className="text-3xl font-bold text-gray-900">Recently listed</h2>
            <p className="mt-2 text-gray-500">Fresh items from your community</p>
          </div>
          <Link
            to="/listings"
            className="text-sm font-semibold text-indigo-600 hover:text-indigo-700 flex-shrink-0"
          >
            View all →
          </Link>
        </div>

        {listingsLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => <CardSkeleton key={i} />)}
          </div>
        ) : featuredListings.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {featuredListings.map((listing) => (
              <ListingCard key={listing.id} listing={listing} />
            ))}
          </div>
        ) : (
          <div className="text-center py-16 bg-gray-50 rounded-2xl">
            <p className="text-gray-400 text-lg">No listings yet — be the first to list!</p>
            <Link
              to="/listings/new"
              className="mt-5 inline-block bg-indigo-600 text-white font-semibold px-6 py-2.5 rounded-xl hover:bg-indigo-700 transition-colors text-sm"
            >
              List an item
            </Link>
          </div>
        )}
      </section>

      {/* ── Lender CTA ───────────────────────────────────────────────── */}
      <section className="bg-indigo-600">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="text-center md:text-left">
            <h2 className="text-3xl font-bold text-white mb-3">Have something gathering dust?</h2>
            <p className="text-indigo-200 max-w-lg">
              Turn your idle tools, cameras, and gear into extra income.
              Listing takes less than 2 minutes.
            </p>
          </div>
          <Link
            to="/listings/new"
            className="flex-shrink-0 bg-white text-indigo-700 font-semibold px-8 py-3 rounded-xl hover:bg-indigo-50 transition-colors whitespace-nowrap"
          >
            List your first item
          </Link>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────────────── */}
      <footer className="bg-gray-900 text-gray-400">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <span className="text-xl font-extrabold text-white">RentIt</span>
            <p className="mt-1 text-xs">A peer-to-peer household item rental platform</p>
          </div>
          <p className="text-xs text-center sm:text-right">
            Built as a Bachelor&apos;s Independent Study Project (BISP) &mdash; 2024
          </p>
        </div>
      </footer>
    </div>
  );
}
