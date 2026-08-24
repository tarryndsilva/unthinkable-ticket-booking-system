import { useEffect, useState } from 'react';
import { api, apiErrorMessage } from '../api/client';
import type { Venue, AdminUser, ModerationEvent, Role, Coupon } from '../types';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { SkeletonTable, SkeletonCard } from '../components/ui/Skeleton';
import { useAuth } from '../context/AuthContext';

interface RowConfig {
  row: string;
  seatsPerRow: number;
  category: string;
}

type Tab = 'venues' | 'users' | 'moderation' | 'coupons';

export function AdminPage() {
  const [tab, setTab] = useState<Tab>('venues');

  return (
    <div className="min-h-[calc(100vh-64px)] bg-canvas-950">
      <div className="mx-auto max-w-4xl px-6 py-12">
        <h1 className="font-display text-3xl italic text-canvas-50">Admin</h1>
        <p className="mt-1 text-sm text-canvas-400">Manage venues, users, and event listings platform-wide.</p>

        <div className="mt-6 flex w-fit gap-1 rounded-full border border-canvas-700 bg-canvas-900 p-1">
          {(['venues', 'users', 'moderation', 'coupons'] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`rounded-full px-4 py-1.5 text-sm font-medium capitalize transition-all ${
                tab === t ? 'bg-canvas-700 text-white shadow-sm' : 'text-canvas-400 hover:text-canvas-200'
              }`}
            >
              {t === 'moderation' ? 'Event moderation' : t}
            </button>
          ))}
        </div>

        <div className="mt-8">
          {tab === 'venues' && <VenuesPanel />}
          {tab === 'users' && <UsersPanel />}
          {tab === 'moderation' && <ModerationPanel />}
          {tab === 'coupons' && <CouponsPanel />}
        </div>
      </div>
    </div>
  );
}

// ===================== Venues =====================

function VenuesPanel() {
  const [venues, setVenues] = useState<Venue[]>([]);
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('Chennai');
  const [rows, setRows] = useState<RowConfig[]>([{ row: 'A', seatsPerRow: 8, category: 'Premium' }]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get('/api/venues')
      .then((res) => setVenues(res.data))
      .finally(() => setLoading(false));
  }, []);

  function addRow() {
    const nextLetter = String.fromCharCode(65 + rows.length);
    setRows([...rows, { row: nextLetter, seatsPerRow: 8, category: 'Standard' }]);
  }

  function updateRow(idx: number, field: keyof RowConfig, value: string | number) {
    setRows((prev) => prev.map((r, i) => (i === idx ? { ...r, [field]: value } : r)));
  }

  function removeRow(idx: number) {
    setRows((prev) => prev.filter((_, i) => i !== idx));
  }

  async function handleCreateVenue(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const seats = rows.flatMap((r) =>
        Array.from({ length: r.seatsPerRow }, (_, i) => ({ row: r.row, column: i + 1, category: r.category }))
      );
      const res = await api.post('/api/venues', { name, address, city, seats });
      setVenues((prev) => [...prev, res.data]);
      setName('');
      setAddress('');
      setCity('Chennai');
      setRows([{ row: 'A', seatsPerRow: 8, category: 'Premium' }]);
      setShowForm(false);
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  const totalSeatsInDraft = rows.reduce((sum, r) => sum + r.seatsPerRow, 0);

  return (
    <>
      <div className="mb-6 flex items-center justify-between">
        <h2 className="font-semibold text-canvas-100">Venues</h2>
        <Button variant="primary" size="sm" onClick={() => setShowForm((s) => !s)}>
          {showForm ? 'Close' : '+ New venue'}
        </Button>
      </div>

      {showForm && (
        <Card variant="glass" glow="brand" className="mb-8 animate-[fade-up_0.3s_ease-out] p-6">
          <h3 className="mb-4 font-semibold text-canvas-100">Create a new venue</h3>
          <form onSubmit={handleCreateVenue} className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <Input label="Venue name" placeholder="Grand Cinema Hall" value={name} onChange={(e) => setName(e.target.value)} required />
              <Input label="City" placeholder="Chennai" value={city} onChange={(e) => setCity(e.target.value)} required />
            </div>
            <Input label="Address" placeholder="123 Main Street" value={address} onChange={(e) => setAddress(e.target.value)} required />

            <div>
              <div className="mb-2 flex items-center justify-between">
                <p className="text-sm font-medium text-canvas-200">Seat layout</p>
                <Badge tone="brand">{totalSeatsInDraft} seats total</Badge>
              </div>
              <div className="space-y-2">
                {rows.map((r, idx) => (
                  <div key={idx} className="flex items-center gap-2 rounded-xl border border-canvas-700 bg-canvas-850 p-2.5">
                    <input
                      value={r.row}
                      onChange={(e) => updateRow(idx, 'row', e.target.value.toUpperCase())}
                      maxLength={2}
                      className="w-14 rounded-lg border border-canvas-600 bg-canvas-900 px-2 py-1.5 text-center text-sm text-canvas-50 focus:border-brand-400 focus:outline-none"
                      placeholder="Row"
                    />
                    <input
                      type="number"
                      min={1}
                      value={r.seatsPerRow}
                      onChange={(e) => updateRow(idx, 'seatsPerRow', Number(e.target.value))}
                      className="w-20 rounded-lg border border-canvas-600 bg-canvas-900 px-2 py-1.5 text-sm text-canvas-50 focus:border-brand-400 focus:outline-none"
                      placeholder="Seats"
                    />
                    <input
                      value={r.category}
                      onChange={(e) => updateRow(idx, 'category', e.target.value)}
                      className="flex-1 rounded-lg border border-canvas-600 bg-canvas-900 px-2 py-1.5 text-sm text-canvas-50 focus:border-brand-400 focus:outline-none"
                      placeholder="Category (e.g. Premium)"
                    />
                    {rows.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeRow(idx)}
                        className="shrink-0 rounded-lg px-2 py-1.5 text-canvas-500 hover:bg-ruby-500/10 hover:text-ruby-400"
                      >
                        &times;
                      </button>
                    )}
                  </div>
                ))}
              </div>
              <button type="button" onClick={addRow} className="mt-2 text-sm font-medium text-brand-300 hover:text-brand-200">
                + Add row
              </button>
            </div>

            {error && <p className="text-sm text-ruby-400">{error}</p>}
            <Button type="submit" variant="primary" loading={busy}>
              Create venue
            </Button>
          </form>
        </Card>
      )}

      {loading ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <SkeletonCard />
          <SkeletonCard />
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {venues.map((v) => (
            <Card key={v.id} variant="solid" className="p-5">
              <p className="font-medium text-canvas-50">{v.name}</p>
              <p className="mt-0.5 text-sm text-canvas-400">{v.address}{v.city ? ` \u00b7 ${v.city}` : ''}</p>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}

// ===================== Users =====================

const ROLE_TONES: Record<Role, 'brand' | 'gold' | 'neutral'> = {
  CUSTOMER: 'neutral',
  ORGANISER: 'brand',
  ADMIN: 'gold',
};

function UsersPanel() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  function refresh() {
    api
      .get('/api/admin/users')
      .then((res) => setUsers(res.data))
      .finally(() => setLoading(false));
  }

  useEffect(refresh, []);

  async function handleRoleChange(userId: string, role: Role) {
    setError('');
    try {
      await api.patch(`/api/admin/users/${userId}/role`, { role });
      refresh();
    } catch (err) {
      setError(apiErrorMessage(err));
    }
  }

  return (
    <>
      <h2 className="mb-6 font-semibold text-canvas-100">Users ({users.length})</h2>
      {error && <p className="mb-4 text-sm text-ruby-400">{error}</p>}
      {loading ? (
        <SkeletonTable rows={4} />
      ) : (
      <div className="overflow-hidden rounded-2xl border border-canvas-700">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-canvas-700 bg-canvas-900/60 text-left text-xs uppercase tracking-wide text-canvas-400">
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Email</th>
              <th className="px-4 py-3 font-medium">Role</th>
              <th className="px-4 py-3 font-medium">Joined</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-b border-canvas-800 last:border-0 hover:bg-canvas-850/60">
                <td className="px-4 py-3 text-canvas-100">
                  {u.name} {u.id === currentUser?.id && <span className="text-xs text-canvas-500">(you)</span>}
                </td>
                <td className="px-4 py-3 text-canvas-400">{u.email}</td>
                <td className="px-4 py-3">
                  <select
                    value={u.role}
                    onChange={(e) => handleRoleChange(u.id, e.target.value as Role)}
                    className="rounded-lg border border-canvas-600 bg-canvas-850 px-2 py-1 text-xs text-canvas-100 focus:border-brand-400 focus:outline-none"
                  >
                    <option value="CUSTOMER">Customer</option>
                    <option value="ORGANISER">Organiser</option>
                    <option value="ADMIN">Admin</option>
                  </select>
                  <span className="ml-2">
                    <Badge tone={ROLE_TONES[u.role]}>{u.role}</Badge>
                  </span>
                </td>
                <td className="px-4 py-3 text-canvas-500">{new Date(u.createdAt).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      )}
    </>
  );
}

// ===================== Event moderation =====================

function ModerationPanel() {
  const [events, setEvents] = useState<ModerationEvent[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  function refresh() {
    api
      .get('/api/admin/events')
      .then((res) => setEvents(res.data))
      .finally(() => setLoading(false));
  }

  useEffect(refresh, []);

  async function handleRemove(ev: ModerationEvent) {
    if (!confirm(`Remove "${ev.title}"? This can't be undone.`)) return;
    setError('');
    try {
      await api.delete(`/api/admin/events/${ev.id}`);
      refresh();
    } catch (err) {
      setError(apiErrorMessage(err));
    }
  }

  return (
    <>
      <h2 className="mb-6 font-semibold text-canvas-100">All event listings ({events.length})</h2>
      {error && <p className="mb-4 text-sm text-ruby-400">{error}</p>}
      {loading ? (
        <div className="space-y-3">
          <SkeletonCard />
          <SkeletonCard />
        </div>
      ) : (
      <div className="space-y-3">
        {events.map((ev) => {
          const hasBookings = ev._count.bookings > 0;
          return (
            <Card key={ev.id} variant="solid" className="flex items-center justify-between p-5">
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-medium text-canvas-50">{ev.title}</p>
                  <Badge tone={ev.type === 'MOVIE' ? 'brand' : 'violet'}>{ev.type}</Badge>
                </div>
                <p className="mt-0.5 text-sm text-canvas-400">
                  {ev.venue?.name} &middot; {new Date(ev.date).toDateString()} &middot; hosted by {ev.organiser.name}
                </p>
                <p className="mt-1 text-xs text-canvas-500">
                  {ev._count.showSeats} seats &middot; {ev._count.bookings} booking{ev._count.bookings === 1 ? '' : 's'}
                </p>
              </div>
              <Button
                variant="danger"
                size="sm"
                disabled={hasBookings}
                title={hasBookings ? 'Cancel all bookings before removing this listing' : undefined}
                onClick={() => handleRemove(ev)}
              >
                Remove
              </Button>
            </Card>
          );
        })}
      </div>
      )}
    </>
  );
}

// ===================== Coupons =====================

function CouponsPanel() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [code, setCode] = useState('');
  const [percentOff, setPercentOff] = useState('10');
  const [maxRedemptions, setMaxRedemptions] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [showForm, setShowForm] = useState(false);

  function refresh() {
    api.get('/api/coupons').then((res) => setCoupons(res.data));
  }

  useEffect(refresh, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await api.post('/api/coupons', {
        code,
        percentOff: Number(percentOff),
        maxRedemptions: maxRedemptions ? Number(maxRedemptions) : undefined,
        expiresAt: expiresAt ? new Date(expiresAt).toISOString() : undefined,
      });
      setCode('');
      setPercentOff('10');
      setMaxRedemptions('');
      setExpiresAt('');
      setShowForm(false);
      refresh();
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function handleDeactivate(id: string) {
    await api.patch(`/api/coupons/${id}/deactivate`);
    refresh();
  }

  return (
    <>
      <div className="mb-6 flex items-center justify-between">
        <h2 className="font-semibold text-canvas-100">Coupons</h2>
        <Button variant="primary" size="sm" onClick={() => setShowForm((s) => !s)}>
          {showForm ? 'Close' : '+ New coupon'}
        </Button>
      </div>

      {showForm && (
        <Card variant="glass" glow="brand" className="mb-8 animate-[fade-up_0.3s_ease-out] p-6">
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Input label="Code" placeholder="SAVE20" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} required />
              <Input
                label="% off"
                type="number"
                min="1"
                max="90"
                value={percentOff}
                onChange={(e) => setPercentOff(e.target.value)}
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Max redemptions (optional)"
                type="number"
                min="1"
                placeholder="Unlimited"
                value={maxRedemptions}
                onChange={(e) => setMaxRedemptions(e.target.value)}
              />
              <Input label="Expires (optional)" type="date" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} />
            </div>
            {error && <p className="text-sm text-ruby-400">{error}</p>}
            <Button type="submit" variant="primary" loading={busy}>
              Create coupon
            </Button>
          </form>
        </Card>
      )}

      <div className="space-y-3">
        {coupons.length === 0 && <p className="text-sm text-canvas-400">No coupons yet.</p>}
        {coupons.map((c) => (
          <Card key={c.id} variant="solid" className="flex items-center justify-between p-4">
            <div>
              <div className="flex items-center gap-2">
                <p className="font-mono text-sm font-semibold text-canvas-50">{c.code}</p>
                <Badge tone={c.active ? 'emerald' : 'neutral'}>{c.active ? 'Active' : 'Inactive'}</Badge>
              </div>
              <p className="mt-0.5 text-xs text-canvas-400">
                {c.percentOff}% off &middot; used {c.timesRedeemed}
                {c.maxRedemptions ? `/${c.maxRedemptions}` : ''}
                {c.expiresAt ? ` \u00b7 expires ${new Date(c.expiresAt).toLocaleDateString()}` : ''}
              </p>
            </div>
            {c.active && (
              <button onClick={() => handleDeactivate(c.id)} className="text-xs font-medium text-ruby-400 hover:text-ruby-300">
                Deactivate
              </button>
            )}
          </Card>
        ))}
      </div>
    </>
  );
}
