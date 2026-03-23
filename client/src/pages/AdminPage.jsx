import { useEffect, useState, useCallback } from 'react';
import toast from 'react-hot-toast';
import {
  ShieldCheckIcon,
  UsersIcon,
  Squares2X2Icon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from '@heroicons/react/24/outline';
import api from '../api/axios';

// ── Helpers ────────────────────────────────────────────────────────────────

function fmt(dateStr) {
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric',
  });
}

// ── Pagination ─────────────────────────────────────────────────────────────

function Pagination({ page, pages, onPageChange }) {
  if (pages <= 1) return null;
  return (
    <div className="flex items-center justify-between px-6 py-3 border-t border-gray-100">
      <span className="text-xs text-gray-500">Page {page} of {pages}</span>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={page === 1}
          className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 disabled:opacity-30 transition-colors"
        >
          <ChevronLeftIcon className="w-4 h-4" />
        </button>
        <button
          onClick={() => onPageChange(page + 1)}
          disabled={page === pages}
          className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 disabled:opacity-30 transition-colors"
        >
          <ChevronRightIcon className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

// ── Table wrapper ──────────────────────────────────────────────────────────

function Table({ headers, children }) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-100">
        <thead className="bg-gray-50">
          <tr>
            {headers.map((h) => (
              <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-100">{children}</tbody>
      </table>
    </div>
  );
}

function Td({ children, className = '' }) {
  return <td className={`px-4 py-3 text-sm text-gray-700 whitespace-nowrap ${className}`}>{children}</td>;
}

// ── Status badge ───────────────────────────────────────────────────────────

function ListingStatusBadge({ isActive, isAvailable }) {
  if (!isActive)    return <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-red-50 text-red-700 ring-1 ring-red-200">Deactivated</span>;
  if (!isAvailable) return <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 ring-1 ring-amber-200">Unavailable</span>;
  return <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200">Active</span>;
}

// ── Listings tab ───────────────────────────────────────────────────────────

function ListingsTab() {
  const [listings, setListings]     = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [loading, setLoading]       = useState(true);
  const [acting, setActing]         = useState(null);

  const fetchPage = useCallback(async (page) => {
    setLoading(true);
    try {
      const { data } = await api.get('/api/admin/listings', { params: { page, limit: 15 } });
      setListings(data.listings);
      setPagination(data.pagination);
    } catch {
      toast.error('Failed to load listings');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchPage(1); }, [fetchPage]);

  async function toggleActive(listing) {
    const action = listing.is_active ? 'deactivate' : 'activate';
    setActing(listing.id);
    try {
      const { data } = await api.patch(`/api/admin/listings/${listing.id}/${action}`);
      setListings((prev) =>
        prev.map((l) => l.id === listing.id ? { ...l, is_active: data.listing.is_active } : l)
      );
      toast.success(`Listing ${action}d`);
    } catch {
      toast.error(`Failed to ${action} listing`);
    } finally {
      setActing(null);
    }
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
        <h2 className="text-base font-semibold text-gray-900">All Listings</h2>
        {!loading && (
          <span className="text-xs text-gray-400">{pagination.total} total</span>
        )}
      </div>

      {loading ? (
        <div className="p-6 space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-10 bg-gray-100 rounded-lg animate-pulse" />
          ))}
        </div>
      ) : listings.length === 0 ? (
        <div className="text-center py-16 text-gray-400">No listings found.</div>
      ) : (
        <>
          <Table headers={['ID', 'Title', 'Owner', 'Status', 'Price/day', 'Created', 'Action']}>
            {listings.map((l) => (
              <tr key={l.id} className="hover:bg-gray-50 transition-colors">
                <Td className="text-gray-400 font-mono text-xs">#{l.id}</Td>
                <Td>
                  <a
                    href={`/listings/${l.id}`}
                    target="_blank"
                    rel="noreferrer"
                    className="font-medium text-indigo-600 hover:text-indigo-800 max-w-[200px] truncate block"
                  >
                    {l.title}
                  </a>
                </Td>
                <Td className="text-gray-600">{l.owner_name}</Td>
                <Td>
                  <ListingStatusBadge isActive={l.is_active} isAvailable={l.is_available} />
                </Td>
                <Td className="font-medium">${Number(l.price_per_day).toFixed(2)}</Td>
                <Td className="text-gray-400">{fmt(l.created_at)}</Td>
                <Td>
                  <button
                    onClick={() => toggleActive(l)}
                    disabled={acting === l.id}
                    className={`text-xs font-semibold px-3 py-1 rounded-lg transition-colors disabled:opacity-50 ${
                      l.is_active
                        ? 'bg-red-50 hover:bg-red-100 text-red-700'
                        : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700'
                    }`}
                  >
                    {acting === l.id
                      ? <span className="inline-block w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                      : l.is_active ? 'Deactivate' : 'Activate'
                    }
                  </button>
                </Td>
              </tr>
            ))}
          </Table>
          <Pagination
            page={pagination.page}
            pages={pagination.pages}
            onPageChange={fetchPage}
          />
        </>
      )}
    </div>
  );
}

// ── Users tab ──────────────────────────────────────────────────────────────

function UsersTab() {
  const [users, setUsers]           = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [loading, setLoading]       = useState(true);

  const fetchPage = useCallback(async (page) => {
    setLoading(true);
    try {
      const { data } = await api.get('/api/admin/users', { params: { page, limit: 15 } });
      setUsers(data.users);
      setPagination(data.pagination);
    } catch {
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchPage(1); }, [fetchPage]);

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
        <h2 className="text-base font-semibold text-gray-900">All Users</h2>
        {!loading && (
          <span className="text-xs text-gray-400">{pagination.total} total</span>
        )}
      </div>

      {loading ? (
        <div className="p-6 space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-10 bg-gray-100 rounded-lg animate-pulse" />
          ))}
        </div>
      ) : users.length === 0 ? (
        <div className="text-center py-16 text-gray-400">No users found.</div>
      ) : (
        <>
          <Table headers={['ID', 'Name', 'Email', 'Role', 'Joined']}>
            {users.map((u) => (
              <tr key={u.id} className="hover:bg-gray-50 transition-colors">
                <Td className="text-gray-400 font-mono text-xs">#{u.id}</Td>
                <Td>
                  <a
                    href={`/profile/${u.id}`}
                    target="_blank"
                    rel="noreferrer"
                    className="font-medium text-indigo-600 hover:text-indigo-800"
                  >
                    {u.name}
                  </a>
                </Td>
                <Td className="text-gray-500">{u.email}</Td>
                <Td>
                  {u.is_admin
                    ? <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200">Admin</span>
                    : <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 ring-1 ring-gray-200">User</span>
                  }
                </Td>
                <Td className="text-gray-400">{fmt(u.created_at)}</Td>
              </tr>
            ))}
          </Table>
          <Pagination
            page={pagination.page}
            pages={pagination.pages}
            onPageChange={fetchPage}
          />
        </>
      )}
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────

const TABS = [
  { key: 'listings', label: 'Listings', Icon: Squares2X2Icon },
  { key: 'users',    label: 'Users',    Icon: UsersIcon },
];

export default function AdminPage() {
  const [tab, setTab] = useState('listings');

  return (
    <div className="bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex items-center gap-3">
          <ShieldCheckIcon className="w-7 h-7 text-indigo-600" />
          <div>
            <h1 className="text-2xl font-extrabold text-gray-900">Admin dashboard</h1>
            <p className="mt-0.5 text-sm text-gray-500">Manage listings, users, and platform health</p>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Tab switcher */}
        <div className="flex gap-1 bg-gray-200 p-1 rounded-xl w-fit">
          {TABS.map(({ key, label, Icon }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold transition-all ${
                tab === key ? 'bg-white text-indigo-700 shadow-sm' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>

        {tab === 'listings' && <ListingsTab />}
        {tab === 'users'    && <UsersTab />}
      </div>
    </div>
  );
}
