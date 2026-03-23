import { useState, useEffect, useRef } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import {
  Bars3Icon,
  XMarkIcon,
  ChatBubbleLeftEllipsisIcon,
  UserCircleIcon,
  ChevronDownIcon,
} from '@heroicons/react/24/outline';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';

export default function Navbar() {
  const { isAuthenticated, isAdmin, user, logout } = useAuth();
  const navigate = useNavigate();

  const [mobileOpen, setMobileOpen]     = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [unreadCount, setUnreadCount]   = useState(0);
  const dropdownRef = useRef(null);

  // Fetch unread message count when authenticated
  useEffect(() => {
    if (!isAuthenticated) return;
    api.get('/api/messages/unread-count')
      .then(({ data }) => setUnreadCount(data.count))
      .catch(() => {});

    const interval = setInterval(() => {
      api.get('/api/messages/unread-count')
        .then(({ data }) => setUnreadCount(data.count))
        .catch(() => {});
    }, 30_000); // poll every 30 s

    return () => clearInterval(interval);
  }, [isAuthenticated]);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  function handleLogout() {
    logout();
    setDropdownOpen(false);
    navigate('/');
  }

  const navLinkClass = ({ isActive }) =>
    `text-sm font-medium transition-colors ${
      isActive ? 'text-indigo-600' : 'text-gray-600 hover:text-indigo-600'
    }`;

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">

          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 flex-shrink-0">
            <span className="text-2xl font-extrabold text-indigo-600 tracking-tight">
              RentIt
            </span>
          </Link>

          {/* Desktop nav links */}
          <div className="hidden md:flex items-center gap-8">
            <NavLink to="/listings" className={navLinkClass}>Browse</NavLink>
            {isAuthenticated && (
              <NavLink to="/listings/new" className={navLinkClass}>List an Item</NavLink>
            )}
            {isAdmin && (
              <NavLink to="/admin" className={navLinkClass}>Admin</NavLink>
            )}
          </div>

          {/* Desktop right side */}
          <div className="hidden md:flex items-center gap-4">
            {isAuthenticated ? (
              <>
                {/* Messages icon with badge */}
                <Link to="/messages" className="relative text-gray-500 hover:text-indigo-600 transition-colors">
                  <ChatBubbleLeftEllipsisIcon className="w-6 h-6" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </Link>

                {/* Avatar dropdown */}
                <div className="relative" ref={dropdownRef}>
                  <button
                    onClick={() => setDropdownOpen((o) => !o)}
                    className="flex items-center gap-2 text-gray-700 hover:text-indigo-600 transition-colors"
                  >
                    {user?.avatar_url ? (
                      <img
                        src={user.avatar_url}
                        alt={user.name}
                        className="w-8 h-8 rounded-full object-cover ring-2 ring-indigo-100"
                      />
                    ) : (
                      <UserCircleIcon className="w-8 h-8 text-gray-400" />
                    )}
                    <span className="text-sm font-medium">{user?.name?.split(' ')[0]}</span>
                    <ChevronDownIcon className={`w-4 h-4 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {dropdownOpen && (
                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-lg ring-1 ring-black/5 py-1 z-50">
                      <Link
                        to="/bookings"
                        onClick={() => setDropdownOpen(false)}
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-indigo-50 hover:text-indigo-600"
                      >
                        My Bookings
                      </Link>
                      <Link
                        to="/messages"
                        onClick={() => setDropdownOpen(false)}
                        className="flex items-center justify-between px-4 py-2 text-sm text-gray-700 hover:bg-indigo-50 hover:text-indigo-600"
                      >
                        Messages
                        {unreadCount > 0 && (
                          <span className="bg-red-500 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                            {unreadCount > 9 ? '9+' : unreadCount}
                          </span>
                        )}
                      </Link>
                      <Link
                        to="/profile/me"
                        onClick={() => setDropdownOpen(false)}
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-indigo-50 hover:text-indigo-600"
                      >
                        My Profile
                      </Link>
                      <div className="border-t border-gray-100 my-1" />
                      <button
                        onClick={handleLogout}
                        className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                      >
                        Logout
                      </button>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  className="text-sm font-medium text-gray-600 hover:text-indigo-600 transition-colors"
                >
                  Log in
                </Link>
                <Link
                  to="/register"
                  className="text-sm font-semibold bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors"
                >
                  Sign up
                </Link>
              </>
            )}
          </div>

          {/* Mobile hamburger */}
          <button
            className="md:hidden text-gray-500 hover:text-indigo-600"
            onClick={() => setMobileOpen((o) => !o)}
          >
            {mobileOpen
              ? <XMarkIcon className="w-6 h-6" />
              : <Bars3Icon className="w-6 h-6" />
            }
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden bg-white border-t border-gray-100 px-4 py-4 space-y-3">
          <NavLink
            to="/listings"
            className={navLinkClass}
            onClick={() => setMobileOpen(false)}
          >
            Browse
          </NavLink>
          {isAuthenticated && (
            <>
              <NavLink
                to="/listings/new"
                className={navLinkClass}
                onClick={() => setMobileOpen(false)}
              >
                List an Item
              </NavLink>
              <NavLink
                to="/bookings"
                className={navLinkClass}
                onClick={() => setMobileOpen(false)}
              >
                My Bookings
              </NavLink>
              <NavLink
                to="/messages"
                className={`${navLinkClass({ isActive: false })} flex items-center gap-2`}
                onClick={() => setMobileOpen(false)}
              >
                Messages
                {unreadCount > 0 && (
                  <span className="bg-red-500 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </NavLink>
              <NavLink
                to="/profile/me"
                className={navLinkClass}
                onClick={() => setMobileOpen(false)}
              >
                My Profile
              </NavLink>
              {isAdmin && (
                <NavLink
                  to="/admin"
                  className={navLinkClass}
                  onClick={() => setMobileOpen(false)}
                >
                  Admin
                </NavLink>
              )}
              <button
                onClick={() => { handleLogout(); setMobileOpen(false); }}
                className="block text-sm font-medium text-red-600"
              >
                Logout
              </button>
            </>
          )}
          {!isAuthenticated && (
            <>
              <NavLink to="/login" className={navLinkClass} onClick={() => setMobileOpen(false)}>
                Log in
              </NavLink>
              <NavLink to="/register" className={navLinkClass} onClick={() => setMobileOpen(false)}>
                Sign up
              </NavLink>
            </>
          )}
        </div>
      )}
    </nav>
  );
}
