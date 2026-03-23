import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';

import { AuthProvider } from './context/AuthContext';
import ProtectedRoute   from './components/ProtectedRoute';
import Navbar           from './components/Navbar';
import ErrorBoundary    from './components/ErrorBoundary';
import NotFoundPage     from './pages/NotFoundPage';

import HomePage           from './pages/HomePage';
import BrowseListingsPage from './pages/BrowseListingsPage';
import ListingDetailPage  from './pages/ListingDetailPage';
import CreateListingPage  from './pages/CreateListingPage';
import EditListingPage    from './pages/EditListingPage';
import MyBookingsPage     from './pages/MyBookingsPage';
import MessagesPage       from './pages/MessagesPage';
import ConversationPage   from './pages/ConversationPage';
import UserProfilePage    from './pages/UserProfilePage';
import MyProfilePage      from './pages/MyProfilePage';
import LoginPage          from './pages/LoginPage';
import RegisterPage       from './pages/RegisterPage';
import AdminPage          from './pages/AdminPage';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ErrorBoundary>
        <div className="min-h-screen bg-white flex flex-col">
          <Navbar />

          <main className="flex-1">
            <Routes>
              {/* Public routes */}
              <Route path="/"              element={<HomePage />} />
              <Route path="/listings"      element={<BrowseListingsPage />} />

              {/* /listings/new must come before /listings/:id */}
              <Route
                path="/listings/new"
                element={
                  <ProtectedRoute>
                    <CreateListingPage />
                  </ProtectedRoute>
                }
              />

              <Route path="/listings/:id" element={<ListingDetailPage />} />

              <Route
                path="/listings/:id/edit"
                element={
                  <ProtectedRoute>
                    <EditListingPage />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/bookings"
                element={
                  <ProtectedRoute>
                    <MyBookingsPage />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/messages"
                element={
                  <ProtectedRoute>
                    <MessagesPage />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/messages/:userId/:listingId"
                element={
                  <ProtectedRoute>
                    <ConversationPage />
                  </ProtectedRoute>
                }
              />

              <Route path="/profile/:id" element={<UserProfilePage />} />

              <Route
                path="/profile/me"
                element={
                  <ProtectedRoute>
                    <MyProfilePage />
                  </ProtectedRoute>
                }
              />

              <Route path="/login"    element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />

              <Route
                path="/admin"
                element={
                  <ProtectedRoute requireAdmin>
                    <AdminPage />
                  </ProtectedRoute>
                }
              />

              {/* Catch-all 404 */}
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </main>
        </div>
        </ErrorBoundary>

        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: { fontSize: '0.875rem' },
            success: { iconTheme: { primary: '#4f46e5', secondary: '#fff' } },
          }}
        />
      </AuthProvider>
    </BrowserRouter>
  );
}
