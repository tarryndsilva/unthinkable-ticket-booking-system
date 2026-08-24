import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button } from './ui/Button';
import { Logo } from './ui/Logo';

export function NavBar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const navLink = (to: string, label: string) => {
    const active = location.pathname === to;
    return (
      <Link
        to={to}
        className={`relative px-3 py-2 text-sm font-medium transition-colors ${
          active ? 'text-white' : 'text-canvas-300 hover:text-white'
        }`}
      >
        {label}
        {active && (
          <span className="absolute inset-x-3 -bottom-[1px] h-px bg-gradient-to-r from-brand-400 to-electric-400" />
        )}
      </Link>
    );
  };

  return (
    <nav className="sticky top-0 z-40 border-b border-canvas-800/80 bg-canvas-950/75 backdrop-blur-xl">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3.5">
        <Link to="/" className="flex items-center gap-2.5">
          <Logo size={32} />
          <span className="font-display text-lg italic text-canvas-50">TicketHub</span>
        </Link>

        <div className="hidden items-center gap-1 sm:flex">
          {navLink('/', 'Browse')}
          {user && user.role === 'CUSTOMER' && navLink('/wishlist', 'Wishlist')}
          {user && navLink('/bookings', 'My tickets')}
          {user && (user.role === 'ORGANISER' || user.role === 'ADMIN') && navLink('/organiser', 'Organiser')}
          {user && user.role === 'ADMIN' && navLink('/admin', 'Admin')}
        </div>

        <div className="flex items-center gap-3">
          {user ? (
            <>
              <Link to="/profile" className="hidden text-sm text-canvas-400 hover:text-canvas-200 sm:inline">
                Hi, {user.name.split(' ')[0]}
              </Link>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  logout();
                  navigate('/login');
                }}
              >
                Log out
              </Button>
            </>
          ) : (
            <>
              <Button variant="ghost" size="sm" onClick={() => navigate('/login')}>
                Log in
              </Button>
              <Button variant="primary" size="sm" onClick={() => navigate('/register')}>
                Sign up
              </Button>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
