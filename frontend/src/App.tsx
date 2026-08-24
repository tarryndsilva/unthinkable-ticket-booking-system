import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { NavBar } from './components/NavBar';
import { ProtectedRoute } from './components/ProtectedRoute';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { EventsPage } from './pages/EventsPage';
import { EventDetailPage } from './pages/EventDetailPage';
import { CheckoutPage } from './pages/CheckoutPage';
import { BookingSuccessPage } from './pages/BookingSuccessPage';
import { TicketPage } from './pages/TicketPage';
import { MyBookingsPage } from './pages/MyBookingsPage';
import { OrganiserPage } from './pages/OrganiserPage';
import { AdminPage } from './pages/AdminPage';
import { ProfilePage } from './pages/ProfilePage';
import { WishlistPage } from './pages/WishlistPage';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <div className="min-h-screen bg-canvas-950">
          <NavBar />
          <Routes>
            <Route path="/" element={<EventsPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/events/:id" element={<EventDetailPage />} />
            <Route
              path="/checkout"
              element={
                <ProtectedRoute roles={['CUSTOMER']}>
                  <CheckoutPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/booking-success"
              element={
                <ProtectedRoute roles={['CUSTOMER']}>
                  <BookingSuccessPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/bookings"
              element={
                <ProtectedRoute roles={['CUSTOMER']}>
                  <MyBookingsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/bookings/:id"
              element={
                <ProtectedRoute roles={['CUSTOMER']}>
                  <TicketPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/organiser"
              element={
                <ProtectedRoute roles={['ORGANISER', 'ADMIN']}>
                  <OrganiserPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin"
              element={
                <ProtectedRoute roles={['ADMIN']}>
                  <AdminPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/profile"
              element={
                <ProtectedRoute>
                  <ProfilePage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/wishlist"
              element={
                <ProtectedRoute roles={['CUSTOMER']}>
                  <WishlistPage />
                </ProtectedRoute>
              }
            />
          </Routes>
        </div>
      </AuthProvider>
    </BrowserRouter>
  );
}
