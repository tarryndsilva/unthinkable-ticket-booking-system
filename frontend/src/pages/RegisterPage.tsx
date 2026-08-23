import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { apiErrorMessage } from '../api/client';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';

const ROLES = [
  { v: 'CUSTOMER', label: 'Customer', hint: 'Browse & book seats' },
  { v: 'ORGANISER', label: 'Organiser', hint: 'Host events' },
  { v: 'ADMIN', label: 'Admin', hint: 'Manage venues' },
] as const;

export function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'CUSTOMER' | 'ORGANISER' | 'ADMIN'>('CUSTOMER');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await register(name, email, password, role);
      navigate('/');
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="relative flex min-h-[calc(100vh-64px)] items-center justify-center overflow-hidden bg-canvas-950 px-6 py-12">
      <div className="pointer-events-none absolute -top-24 left-1/2 h-96 w-[700px] -translate-x-1/2 rounded-full bg-violet-600/20 blur-[120px]" />
      <Card variant="glass" glow="brand" className="relative w-full max-w-sm animate-[scale-in_0.2s_cubic-bezier(0.16,1,0.3,1)] p-8">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-brand-400 to-electric-500 text-base font-bold text-white shadow-[var(--shadow-glow-brand)]">
          T
        </span>
        <h1 className="mt-5 font-display text-2xl italic text-canvas-50">Create your account</h1>
        <p className="mt-1 text-sm text-canvas-400">Start booking in seconds.</p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <Input label="Full name" placeholder="Jane Doe" value={name} onChange={(e) => setName(e.target.value)} required />
          <Input type="email" label="Email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <Input type="password" label="Password" placeholder="At least 6 characters" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />

          <div>
            <label className="mb-1.5 block text-sm font-medium text-canvas-200">I am a</label>
            <div className="grid grid-cols-3 gap-2">
              {ROLES.map((r) => (
                <button
                  type="button"
                  key={r.v}
                  onClick={() => setRole(r.v)}
                  className={`rounded-xl border px-2 py-2.5 text-center text-xs font-medium transition-all ${
                    role === r.v
                      ? 'border-brand-400 bg-brand-500/15 text-brand-200 shadow-[0_0_0_1px_rgba(124,127,255,0.3)]'
                      : 'border-canvas-600 text-canvas-400 hover:border-canvas-500 hover:text-canvas-200'
                  }`}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </div>

          {error && <p className="text-sm text-ruby-400">{error}</p>}
          <Button type="submit" variant="primary" size="lg" className="w-full" loading={busy}>
            Create account
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-canvas-400">
          Already have an account?{' '}
          <Link to="/login" className="font-medium text-brand-300 hover:text-brand-200">
            Log in
          </Link>
        </p>
      </Card>
    </div>
  );
}
