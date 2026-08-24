import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { api, apiErrorMessage } from '../api/client';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';

export function ProfilePage() {
  const { user, setUser } = useAuth();
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [busy, setBusy] = useState(false);

  if (!user) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSuccess('');
    setBusy(true);
    try {
      const payload: Record<string, string> = {};
      if (name !== user!.name) payload.name = name;
      if (email !== user!.email) payload.email = email;
      if (newPassword) {
        payload.currentPassword = currentPassword;
        payload.newPassword = newPassword;
      }
      if (Object.keys(payload).length === 0) {
        setSuccess('Nothing to update.');
        return;
      }
      const res = await api.patch('/api/auth/me', payload);
      setUser(res.data);
      setCurrentPassword('');
      setNewPassword('');
      setSuccess('Profile updated.');
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-[calc(100vh-64px)] bg-canvas-950">
      <div className="mx-auto max-w-lg px-6 py-12">
        <h1 className="font-display text-3xl italic text-canvas-50">Your profile</h1>
        <div className="mt-2">
          <Badge tone={user.role === 'ADMIN' ? 'gold' : user.role === 'ORGANISER' ? 'brand' : 'neutral'}>{user.role}</Badge>
        </div>

        <Card variant="solid" className="mt-6 p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input label="Full name" value={name} onChange={(e) => setName(e.target.value)} required />
            <Input type="email" label="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />

            <div className="border-t border-canvas-700 pt-4">
              <p className="mb-3 text-sm font-medium text-canvas-200">Change password</p>
              <div className="space-y-3">
                <Input
                  type="password"
                  label="Current password"
                  placeholder="Required to set a new password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                />
                <Input
                  type="password"
                  label="New password"
                  placeholder="Leave blank to keep current password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  minLength={6}
                />
              </div>
            </div>

            {error && <p className="text-sm text-ruby-400">{error}</p>}
            {success && <p className="text-sm text-emerald-400">{success}</p>}

            <Button type="submit" variant="primary" size="lg" className="w-full" loading={busy}>
              Save changes
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
}
