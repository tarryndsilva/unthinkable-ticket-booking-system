import { useEffect, useState } from 'react';
import { api, apiErrorMessage } from '../api/client';
import type { Venue } from '../types';

interface RowConfig {
  row: string;
  seatsPerRow: number;
  category: string;
}

export function AdminPage() {
  const [venues, setVenues] = useState<Venue[]>([]);
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [rows, setRows] = useState<RowConfig[]>([{ row: 'A', seatsPerRow: 8, category: 'Premium' }]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api.get('/api/venues').then((res) => setVenues(res.data));
  }, []);

  function addRow() {
    const nextLetter = String.fromCharCode(65 + rows.length);
    setRows([...rows, { row: nextLetter, seatsPerRow: 8, category: 'Standard' }]);
  }

  function updateRow(idx: number, field: keyof RowConfig, value: string | number) {
    setRows((prev) => prev.map((r, i) => (i === idx ? { ...r, [field]: value } : r)));
  }

  async function handleCreateVenue(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const seats = rows.flatMap((r) =>
        Array.from({ length: r.seatsPerRow }, (_, i) => ({ row: r.row, column: i + 1, category: r.category }))
      );
      const res = await api.post('/api/venues', { name, address, seats });
      setVenues((prev) => [...prev, res.data]);
      setName('');
      setAddress('');
      setRows([{ row: 'A', seatsPerRow: 8, category: 'Premium' }]);
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="max-w-3xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">Admin — Venue Management</h1>

      <div className="bg-white rounded-lg shadow border p-5 mb-8">
        <h2 className="font-semibold mb-3">Create a new venue</h2>
        <form onSubmit={handleCreateVenue} className="space-y-3">
          <input placeholder="Venue name" value={name} onChange={(e) => setName(e.target.value)} className="w-full border rounded px-3 py-2" required />
          <input placeholder="Address" value={address} onChange={(e) => setAddress(e.target.value)} className="w-full border rounded px-3 py-2" required />

          <div className="space-y-2">
            <p className="text-sm font-medium text-slate-700">Seat rows &amp; categories</p>
            {rows.map((r, idx) => (
              <div key={idx} className="flex gap-2 items-center">
                <input
                  value={r.row}
                  onChange={(e) => updateRow(idx, 'row', e.target.value.toUpperCase())}
                  className="w-16 border rounded px-2 py-1"
                  placeholder="Row"
                  maxLength={2}
                />
                <input
                  type="number"
                  min={1}
                  value={r.seatsPerRow}
                  onChange={(e) => updateRow(idx, 'seatsPerRow', Number(e.target.value))}
                  className="w-24 border rounded px-2 py-1"
                  placeholder="Seats"
                />
                <input
                  value={r.category}
                  onChange={(e) => updateRow(idx, 'category', e.target.value)}
                  className="flex-1 border rounded px-2 py-1"
                  placeholder="Category (e.g. Premium)"
                />
              </div>
            ))}
            <button type="button" onClick={addRow} className="text-sm text-indigo-600 hover:underline">
              + Add row
            </button>
          </div>

          {error && <p className="text-red-600 text-sm">{error}</p>}
          <button disabled={busy} className="bg-indigo-600 text-white px-5 py-2 rounded disabled:opacity-40">
            {busy ? 'Creating...' : 'Create venue'}
          </button>
        </form>
      </div>

      <h2 className="text-xl font-bold mb-3">Existing Venues</h2>
      <div className="space-y-2">
        {venues.map((v) => (
          <div key={v.id} className="bg-white rounded-lg shadow border p-4">
            <p className="font-medium">{v.name}</p>
            <p className="text-sm text-slate-600">{v.address}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
