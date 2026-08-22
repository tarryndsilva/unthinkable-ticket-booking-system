import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { apiErrorMessage } from '../api/client';

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
    <div className="max-w-sm mx-auto mt-16 p-6 bg-white rounded-lg shadow">
      <h1 className="text-xl font-semibold mb-4">Create an account</h1>
      <form onSubmit={handleSubmit} className="space-y-3">
        <input placeholder="Full name" value={name} onChange={(e) => setName(e.target.value)} className="w-full border rounded px-3 py-2" required />
        <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full border rounded px-3 py-2" required />
        <input type="password" placeholder="Password (min 6 chars)" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full border rounded px-3 py-2" required minLength={6} />
        <select value={role} onChange={(e) => setRole(e.target.value as any)} className="w-full border rounded px-3 py-2">
          <option value="CUSTOMER">Customer</option>
          <option value="ORGANISER">Organiser</option>
          <option value="ADMIN">Admin</option>
        </select>
        {error && <p className="text-red-600 text-sm">{error}</p>}
        <button disabled={busy} className="w-full bg-indigo-600 text-white rounded py-2 disabled:opacity-50">
          {busy ? 'Creating...' : 'Sign up'}
        </button>
      </form>
      <p className="text-sm mt-4 text-slate-600">
        Already have an account? <Link to="/login" className="text-indigo-600">Log in</Link>
      </p>
    </div>
  );
}
