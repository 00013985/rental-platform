import { useEffect, useState, useCallback } from 'react';
import toast from 'react-hot-toast';
import {
  ShieldCheckIcon,
  UsersIcon,
  Squares2X2Icon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CurrencyDollarIcon,
  CalendarDaysIcon,
  StarIcon,
  ClockIcon,
  UserCircleIcon,
  BanknotesIcon,
  EnvelopeIcon,
  TagIcon,
  ArrowTrendingUpIcon,
} from '@heroicons/react/24/outline';
import api from '../api/axios';
import { imgUrl } from '../utils/imgUrl';

// ── Helpers ────────────────────────────────────────────────────────────────

function fmt(dateStr) {
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric',
  });
}

function fmtMoney(val) {
  return `$${Number(val || 0).toFixed(2)}`;
}

// ── Booking status config ──────────────────────────────────────────────────

const STATUS_CFG = {
  pending:   { label: 'Pending',   badge: 'bg-amber-50 text-amber-700 ring-amber-200',   bar: 'bg-amber-400' },
  accepted:  { label: 'Accepted',  badge: 'bg-blue-50 text-blue-700 ring-blue-200',       bar: 'bg-blue-400' },
  completed: { label: 'Completed', badge: 'bg-emerald-50 text-emerald-700 ring-emerald-200', bar: 'bg-emerald-500' },
  cancelled: { label: 'Cancelled', badge: 'bg-gray-100 text-gray-500 ring-gray-200',     bar: 'bg-gray-300' },
  declined:  { label: 'Declined',  badge: 'bg-red-50 text-red-700 ring-red-200',         bar: 'bg-red-400' },
};

function StatusBadge({ status }) {
  const cfg = STATUS_CFG[status] ?? { label: status, badge: 'bg-gray-100 text-gray-500 ring-gray-200' };
  return (
    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ring-1 ${cfg.badge}`}>
      {cfg.label}
    </span>
  );
}

// ── Shared table primitives ────────────────────────────────────────────────

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

// ── Stat card ──────────────────────────────────────────────────────────────

function StatCard({ icon: Icon, iconBg, iconColor, label, value, sub }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm flex items-start gap-4">
      <div className={`${iconBg} p-3 rounded-xl flex-shrink-0`}>
        <Icon className={`w-5 h-5 ${iconColor}`} />
      </div>
      <div className="min-w-0">
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</p>
        <p className="text-2xl font-extrabold text-gray-900 mt-0.5 leading-none">{value}</p>
        {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
      </div>
    </div>
  );
}

// ── CSS bar chart ──────────────────────────────────────────────────────────

function BarChart({ data, valueKey, labelKey, color = 'bg-indigo-500', prefix = '', isMoney = false }) {
  const max = Math.max(...data.map((d) => Number(d[valueKey]) || 0), 1);
  return (
    <div className="space-y-3">
      {data.map((item, i) => {
        const val = Number(item[valueKey]) || 0;
        const pct = Math.round((val / max) * 100);
        const display = isMoney ? `$${val.toFixed(2)}` : `${prefix}${val}`;
        return (
          <div key={i} className="flex items-center gap-3">
            <span
              className="text-xs text-gray-500 w-28 flex-shrink-0 text-right truncate font-medium"
              title={item[labelKey]}
            >
              {item[labelKey]}
            </span>
            <div className="flex-1 bg-gray-100 rounded-full h-5 relative overflow-hidden">
              <div
                className={`${color} h-full rounded-full`}
                style={{ width: `${Math.max(pct, val > 0 ? 2 : 0)}%` }}
              />
            </div>
            <span className="text-xs font-semibold text-gray-700 w-16 text-right flex-shrink-0">
              {display}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ── Section card wrapper ────────────────────────────────────────────────────

function Card({ title, subtitle, children, className = '' }) {
  return (
    <div className={`bg-white rounded-2xl border border-gray-200 shadow-sm ${className}`}>
      {(title || subtitle) && (
        <div className="px-6 py-4 border-b border-gray-100">
          <h3 className="text-base font-semibold text-gray-900">{title}</h3>
          {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
        </div>
      )}
      {children}
    </div>
  );
}

// ── Overview (dashboard) tab ───────────────────────────────────────────────

function OverviewTab() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/api/admin/stats')
      .then(({ data }) => setStats(data))
      .catch(() => toast.error('Failed to load dashboard stats'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => <div key={i} className="h-24 bg-gray-200 rounded-2xl" />)}
        </div>
        <div className="h-20 bg-gray-200 rounded-2xl" />
        <div className="grid lg:grid-cols-2 gap-6">
          {[...Array(2)].map((_, i) => <div key={i} className="h-64 bg-gray-200 rounded-2xl" />)}
        </div>
        <div className="h-64 bg-gray-200 rounded-2xl" />
        <div className="grid lg:grid-cols-2 gap-6">
          {[...Array(2)].map((_, i) => <div key={i} className="h-64 bg-gray-200 rounded-2xl" />)}
        </div>
      </div>
    );
  }

  if (!stats) return null;

  const { overview: o, monthly, categories, recentBookings, recentUsers, topListings } = stats;
  const total = o.total_bookings || 0;

  return (
    <div className="space-y-6">

      {/* ── Primary KPI cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={UsersIcon} iconBg="bg-blue-50" iconColor="text-blue-600"
          label="Total Users" value={o.total_users}
          sub="registered members"
        />
        <StatCard
          icon={Squares2X2Icon} iconBg="bg-indigo-50" iconColor="text-indigo-600"
          label="Active Listings" value={o.active_listings}
          sub={`${o.inactive_listings} deactivated`}
        />
        <StatCard
          icon={CurrencyDollarIcon} iconBg="bg-emerald-50" iconColor="text-emerald-600"
          label="Total Revenue" value={fmtMoney(o.total_revenue)}
          sub="from completed bookings"
        />
        <StatCard
          icon={CalendarDaysIcon} iconBg="bg-purple-50" iconColor="text-purple-600"
          label="Total Bookings" value={o.total_bookings}
          sub={`${o.completed_bookings} completed`}
        />
      </div>

      {/* ── Secondary KPI cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={BanknotesIcon} iconBg="bg-teal-50" iconColor="text-teal-600"
          label="Platform Fees" value={fmtMoney(o.platform_fees)}
          sub="10% of completed revenue"
        />
        <StatCard
          icon={ClockIcon} iconBg="bg-amber-50" iconColor="text-amber-600"
          label="Pending Bookings" value={o.pending_bookings}
          sub="awaiting lender response"
        />
        <StatCard
          icon={StarIcon} iconBg="bg-yellow-50" iconColor="text-yellow-500"
          label="Avg Rating" value={o.avg_rating ? `${o.avg_rating} / 5` : '—'}
          sub={`${o.total_reviews} total reviews`}
        />
        <StatCard
          icon={EnvelopeIcon} iconBg="bg-gray-100" iconColor="text-gray-500"
          label="Messages Sent" value={o.total_messages}
          sub="platform-wide"
        />
      </div>

      {/* ── Booking status breakdown ── */}
      <Card title="Booking Status Breakdown" subtitle="Distribution across all booking statuses">
        <div className="p-6 space-y-5">
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
            {Object.entries(STATUS_CFG).map(([key, { label, badge }]) => {
              const count = o[`${key}_bookings`] || 0;
              const pct = total > 0 ? Math.round((count / total) * 100) : 0;
              return (
                <div key={key} className="text-center space-y-1.5">
                  <p className="text-3xl font-extrabold text-gray-900">{count}</p>
                  <span className={`inline-block text-xs font-semibold px-2 py-0.5 rounded-full ring-1 ${badge}`}>
                    {label}
                  </span>
                  <p className="text-xs text-gray-400">{pct}% of total</p>
                </div>
              );
            })}
          </div>

          {/* Stacked proportional bar */}
          {total > 0 && (
            <div className="flex h-3 rounded-full overflow-hidden gap-0.5">
              {Object.entries(STATUS_CFG).map(([key, { bar }]) => {
                const count = o[`${key}_bookings`] || 0;
                if (count === 0) return null;
                return (
                  <div
                    key={key}
                    className={`${bar} transition-all`}
                    style={{ width: `${(count / total) * 100}%` }}
                    title={`${STATUS_CFG[key].label}: ${count}`}
                  />
                );
              })}
            </div>
          )}
        </div>
      </Card>

      {/* ── Monthly charts ── */}
      <div className="grid lg:grid-cols-2 gap-6">
        <Card title="Bookings — Last 6 Months" subtitle="Number of new bookings per month">
          <div className="p-6">
            {monthly.every((m) => m.booking_count === 0)
              ? <p className="text-sm text-gray-400 text-center py-8">No booking data yet</p>
              : <BarChart data={monthly} valueKey="booking_count" labelKey="label" color="bg-indigo-500" />
            }
          </div>
        </Card>

        <Card title="Revenue — Last 6 Months" subtitle="Completed booking revenue per month">
          <div className="p-6">
            {monthly.every((m) => Number(m.revenue) === 0)
              ? <p className="text-sm text-gray-400 text-center py-8">No revenue data yet</p>
              : <BarChart data={monthly} valueKey="revenue" labelKey="label" color="bg-emerald-500" isMoney />
            }
          </div>
        </Card>
      </div>

      {/* ── Category breakdown ── */}
      <Card title="Category Breakdown" subtitle="Active listings and bookings per category">
        <div className="p-6 grid sm:grid-cols-2 gap-8">
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-4">Listings per Category</p>
            <BarChart
              data={categories.map((c) => ({ ...c, label: `${c.icon} ${c.name}` }))}
              valueKey="listing_count"
              labelKey="label"
              color="bg-indigo-400"
            />
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-4">Bookings per Category</p>
            <BarChart
              data={categories.map((c) => ({ ...c, label: `${c.icon} ${c.name}` }))}
              valueKey="booking_count"
              labelKey="label"
              color="bg-purple-400"
            />
          </div>
        </div>
      </Card>

      {/* ── Top listings ── */}
      <Card title="Top Listings by Bookings" subtitle="Most booked active listings">
        <Table headers={['Listing', 'Owner', 'Price / day', 'Bookings', 'Revenue']}>
          {topListings.length === 0 ? (
            <tr><td colSpan={5} className="px-4 py-8 text-center text-sm text-gray-400">No data yet</td></tr>
          ) : topListings.map((l) => (
            <tr key={l.id} className="hover:bg-gray-50 transition-colors">
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
              <Td className="text-gray-500">{l.owner_name}</Td>
              <Td className="font-medium">${Number(l.price_per_day).toFixed(2)}</Td>
              <Td>
                <span className="inline-flex items-center gap-1 font-semibold text-purple-700">
                  {l.booking_count}
                </span>
              </Td>
              <Td className="font-semibold text-emerald-700">{fmtMoney(l.revenue)}</Td>
            </tr>
          ))}
        </Table>
      </Card>

      {/* ── Recent activity ── */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Recent bookings */}
        <Card title="Recent Bookings" subtitle="Latest 8 booking requests">
          <div className="divide-y divide-gray-50">
            {recentBookings.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-8">No bookings yet</p>
            ) : recentBookings.map((b) => (
              <div key={b.id} className="px-6 py-3 flex items-start gap-3 hover:bg-gray-50 transition-colors">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{b.listing_title}</p>
                  <p className="text-xs text-gray-500">{b.renter_name} → {b.lender_name}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{fmt(b.start_date)} – {fmt(b.end_date)}</p>
                </div>
                <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                  <StatusBadge status={b.status} />
                  <span className="text-xs font-semibold text-gray-700">{fmtMoney(b.total_price)}</span>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Recent signups */}
        <Card title="Recent Signups" subtitle="Latest 6 registered users">
          <div className="divide-y divide-gray-50">
            {recentUsers.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-8">No users yet</p>
            ) : recentUsers.map((u) => (
              <div key={u.id} className="px-6 py-3 flex items-center gap-3 hover:bg-gray-50 transition-colors">
                {u.avatar_url
                  ? <img src={imgUrl(u.avatar_url)} alt={u.name} className="w-9 h-9 rounded-full object-cover flex-shrink-0" />
                  : <UserCircleIcon className="w-9 h-9 text-gray-300 flex-shrink-0" />
                }
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900">{u.name}</p>
                  <p className="text-xs text-gray-500 truncate">{u.email}</p>
                </div>
                <div className="flex flex-col items-end gap-1 flex-shrink-0">
                  {u.is_admin
                    ? <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200">Admin</span>
                    : <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 ring-1 ring-gray-200">User</span>
                  }
                  <span className="text-xs text-gray-400">{fmt(u.created_at)}</span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

// ── Listings management tab ────────────────────────────────────────────────

function ListingStatusBadge({ isActive, isAvailable }) {
  if (!isActive)    return <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-red-50 text-red-700 ring-1 ring-red-200">Deactivated</span>;
  if (!isAvailable) return <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 ring-1 ring-amber-200">Unavailable</span>;
  return <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200">Active</span>;
}

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
    <Card>
      <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
        <h2 className="text-base font-semibold text-gray-900">All Listings</h2>
        {!loading && <span className="text-xs text-gray-400">{pagination.total} total</span>}
      </div>

      {loading ? (
        <div className="p-6 space-y-3">
          {[...Array(5)].map((_, i) => <div key={i} className="h-10 bg-gray-100 rounded-lg animate-pulse" />)}
        </div>
      ) : listings.length === 0 ? (
        <div className="text-center py-16 text-gray-400">No listings found.</div>
      ) : (
        <>
          <Table headers={['ID', 'Title', 'Owner', 'Category', 'Status', 'Price/day', 'Created', 'Action']}>
            {listings.map((l) => (
              <tr key={l.id} className="hover:bg-gray-50 transition-colors">
                <Td className="text-gray-400 font-mono text-xs">#{l.id}</Td>
                <Td>
                  <a
                    href={`/listings/${l.id}`}
                    target="_blank"
                    rel="noreferrer"
                    className="font-medium text-indigo-600 hover:text-indigo-800 max-w-[180px] truncate block"
                  >
                    {l.title}
                  </a>
                </Td>
                <Td className="text-gray-600">{l.owner_name}</Td>
                <Td className="text-gray-500">{l.category_name || '—'}</Td>
                <Td><ListingStatusBadge isActive={l.is_active} isAvailable={l.is_available} /></Td>
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
          <Pagination page={pagination.page} pages={pagination.pages} onPageChange={fetchPage} />
        </>
      )}
    </Card>
  );
}

// ── Users management tab ───────────────────────────────────────────────────

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
    <Card>
      <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
        <h2 className="text-base font-semibold text-gray-900">All Users</h2>
        {!loading && <span className="text-xs text-gray-400">{pagination.total} total</span>}
      </div>

      {loading ? (
        <div className="p-6 space-y-3">
          {[...Array(5)].map((_, i) => <div key={i} className="h-10 bg-gray-100 rounded-lg animate-pulse" />)}
        </div>
      ) : users.length === 0 ? (
        <div className="text-center py-16 text-gray-400">No users found.</div>
      ) : (
        <>
          <Table headers={['ID', 'Name', 'Email', 'Phone', 'Role', 'Joined']}>
            {users.map((u) => (
              <tr key={u.id} className="hover:bg-gray-50 transition-colors">
                <Td className="text-gray-400 font-mono text-xs">#{u.id}</Td>
                <Td>
                  <div className="flex items-center gap-2">
                    {u.avatar_url
                      ? <img src={imgUrl(u.avatar_url)} alt={u.name} className="w-6 h-6 rounded-full object-cover" />
                      : <UserCircleIcon className="w-6 h-6 text-gray-300" />
                    }
                    <a
                      href={`/profile/${u.id}`}
                      target="_blank"
                      rel="noreferrer"
                      className="font-medium text-indigo-600 hover:text-indigo-800"
                    >
                      {u.name}
                    </a>
                  </div>
                </Td>
                <Td className="text-gray-500">{u.email}</Td>
                <Td className="text-gray-400">{u.phone || '—'}</Td>
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
          <Pagination page={pagination.page} pages={pagination.pages} onPageChange={fetchPage} />
        </>
      )}
    </Card>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────

const TABS = [
  { key: 'overview',  label: 'Overview',  Icon: ArrowTrendingUpIcon },
  { key: 'listings',  label: 'Listings',  Icon: Squares2X2Icon },
  { key: 'users',     label: 'Users',     Icon: UsersIcon },
];

export default function AdminPage() {
  const [tab, setTab] = useState('overview');

  return (
    <div className="bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex items-center gap-3">
          <div className="bg-indigo-600 p-2.5 rounded-xl">
            <ShieldCheckIcon className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-gray-900">Admin Dashboard</h1>
            <p className="mt-0.5 text-sm text-gray-500">Platform overview, insights, and management</p>
          </div>
        </div>

        {/* Tab bar */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex gap-0 -mb-px">
            {TABS.map(({ key, label, Icon }) => (
              <button
                key={key}
                onClick={() => setTab(key)}
                className={`flex items-center gap-2 px-5 py-3 text-sm font-semibold border-b-2 transition-colors ${
                  tab === key
                    ? 'border-indigo-600 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon className="w-4 h-4" />
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {tab === 'overview'  && <OverviewTab />}
        {tab === 'listings'  && <ListingsTab />}
        {tab === 'users'     && <UsersTab />}
      </div>
    </div>
  );
}
