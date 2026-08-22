import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export function NavBar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <nav className="bg-slate-900 text-white px-6 py-3 flex items-center justify-between">
      <Link to="/" className="font-bold text-lg">🎟️ TicketHub</Link>
      <div className="flex items-center gap-4 text-sm">
        <Link to="/" className="hover:text-slate-300">Events</Link>
        {user && (
          <Link to="/bookings" className="hover:text-slate-300">My Bookings</Link>
        )}
        {user && (user.role === 'ORGANISER' || user.role === 'ADMIN') && (
          <Link to="/organiser" className="hover:text-slate-300">Organiser</Link>
        )}
        {user && user.role === 'ADMIN' && (
          <Link to="/admin" className="hover:text-slate-300">Admin</Link>
        )}
        {user ? (
          <>
            <span className="text-slate-400">Hi, {user.name}</span>
            <button
              onClick={() => {
                logout();
                navigate('/login');
              }}
              className="bg-slate-700 hover:bg-slate-600 px-3 py-1 rounded"
            >
              Logout
            </button>
          </>
        ) : (
          <>
            <Link to="/login" className="hover:text-slate-300">Login</Link>
            <Link to="/register" className="bg-indigo-600 hover:bg-indigo-500 px-3 py-1 rounded">
              Sign up
            </Link>
          </>
        )}
      </div>
    </nav>
  );
}
