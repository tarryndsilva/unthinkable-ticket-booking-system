import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { apiErrorMessage } from '../api/client';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { Logo } from '../components/ui/Logo';

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await login(email, password);
      navigate('/');
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="relative flex min-h-[calc(100vh-64px)] items-center justify-center overflow-hidden bg-canvas-950 px-6">
      <div className="pointer-events-none absolute -top-24 left-1/2 h-96 w-[700px] -translate-x-1/2 rounded-full bg-brand-600/20 blur-[120px]" />
      <Card variant="glass" glow="brand" className="relative w-full max-w-sm animate-[scale-in_0.2s_cubic-bezier(0.16,1,0.3,1)] p-8">
        <Logo size={40} />
        <h1 className="mt-5 font-display text-2xl italic text-canvas-50">Welcome back</h1>
        <p className="mt-1 text-sm text-canvas-400">Log in to manage your bookings.</p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <Input type="email" label="Email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <Input type="password" label="Password" placeholder="\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022" value={password} onChange={(e) => setPassword(e.target.value)} required />
          {error && <p className="text-sm text-ruby-400">{error}</p>}
          <Button type="submit" variant="primary" size="lg" className="w-full" loading={busy}>
            Log in
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-canvas-400">
          No account?{' '}
          <Link to="/register" className="font-medium text-brand-300 hover:text-brand-200">
            Sign up
          </Link>
        </p>
      </Card>
    </div>
  );
}
