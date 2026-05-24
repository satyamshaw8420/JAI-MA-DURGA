import { useEffect, useState, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { usePartyStore } from '@/store/partyStore';
import { subscribeToParties, addParty, deleteParty, toggleFavorite, updateParty } from '@/services/partyService';
import { formatCurrency, formatDate, getInitials, debounce } from '@/lib/utils';
import type { Party, PartyFilter, PartyFormData } from '@/types';
import { PARTY_FILTERS } from '@/types';
import { toast } from 'sonner';
import {
  Search, Plus, Star, Phone, Calendar, MoreVertical, Trash2, Edit,
  SortAsc, SortDesc, ArrowRight, Users, X, IndianRupee, Filter
} from 'lucide-react';

export default function PartiesPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const {
    parties, setParties, setLoading, searchQuery, setSearchQuery,
    activeFilter, setActiveFilter, sortOrder, toggleSortOrder, getFilteredParties,
    addRecentPartyId
  } = usePartyStore();

  const [showAddModal, setShowAddModal] = useState(searchParams.get('add') === 'true');
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingParty, setEditingParty] = useState<Party | null>(null);
  const [formData, setFormData] = useState<PartyFormData>({ name: '', phone: '', notes: '' });
  const [saving, setSaving] = useState(false);
  const [menuOpen, setMenuOpen] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    const unsub = subscribeToParties(
      user.uid,
      (data) => { setParties(data); setLoading(false); },
      (err) => { console.error(err); setLoading(false); }
    );
    return unsub;
  }, [user, setParties, setLoading]);

  // Local search is extremely fast, no debounce needed for simple filtering
  // Directly bind to setSearchQuery in the input onChange

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !formData.name.trim()) return;
    setSaving(true);
    try {
      await addParty(user.uid, user.email || '', formData);
      toast.success('Party added successfully');
      setShowAddModal(false);
      setFormData({ name: '', phone: '', notes: '' });
      setSearchParams({});
    } catch (err) {
      toast.error('Failed to add party');
    }
    setSaving(false);
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !editingParty) return;
    setSaving(true);
    try {
      await updateParty(user.uid, user.email || '', editingParty.id, formData, editingParty);
      toast.success('Party updated');
      setShowEditModal(false);
      setEditingParty(null);
    } catch (err) {
      toast.error('Failed to update party');
    }
    setSaving(false);
  };

  const handleDelete = async (party: Party) => {
    if (!user) return;
    if (!confirm(`Delete "${party.name}"? This will also delete their ledger.`)) return;
    try {
      await deleteParty(user.uid, user.email || '', party.id, party.name);
      toast.success('Party deleted');
    } catch (err) {
      toast.error('Failed to delete party');
    }
  };

  const openEdit = (party: Party) => {
    setEditingParty(party);
    setFormData({ name: party.name, phone: party.phone || '', notes: party.notes || '' });
    setShowEditModal(true);
    setMenuOpen(null);
  };

  const goToParty = (party: Party) => {
    addRecentPartyId(party.id);
    navigate(`/parties/${party.id}`);
  };

  const filtered = getFilteredParties();

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-5xl mx-auto space-y-4 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--foreground)' }}>Parties</h1>
          <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>{parties.length} total customers</p>
        </div>
        <button onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-white cursor-pointer transition-all hover:opacity-90"
          style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)', boxShadow: '0 4px 12px rgba(245,158,11,0.3)' }}>
          <Plus className="w-4 h-4" /> Add Party
        </button>
      </div>

      {/* Search + Sort */}
      <div className="flex gap-3">
        <div className="relative flex-1 group">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <Search className="w-4 h-4 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search parties by name or phone..."
            className="w-full py-2.5 rounded-xl border border-[var(--border)] bg-[var(--card)] text-sm text-[var(--foreground)] placeholder-[var(--muted-foreground)] focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all shadow-sm"
            style={{ paddingLeft: '2.5rem', paddingRight: '2.5rem' }}
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} 
                    className="absolute inset-y-0 right-0 pr-4 flex items-center cursor-pointer text-slate-400 hover:text-slate-600 transition-colors"
                    title="Clear search">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        <button onClick={toggleSortOrder}
          className="px-3 py-2.5 rounded-xl bg-[var(--card)] border border-[var(--border)] text-[var(--muted-foreground)] hover:bg-[var(--secondary)] hover:text-indigo-600 transition-all shadow-sm flex items-center justify-center shrink-0"
          title={sortOrder === 'asc' ? 'Sort Z→A' : 'Sort A→Z'}>
          {sortOrder === 'asc' ? <SortAsc className="w-4 h-4" /> : <SortDesc className="w-4 h-4" />}
        </button>
      </div>

      {/* Filters Dropdown */}
      <div className="flex items-center">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Filter className="w-4 h-4 text-slate-500" />
          </div>
          <select
            value={activeFilter}
            onChange={(e) => setActiveFilter(e.target.value as any)}
            className="appearance-none w-full sm:w-auto py-2.5 bg-[var(--card)] border border-[var(--border)] rounded-xl text-sm font-semibold text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all cursor-pointer shadow-sm hover:bg-[var(--secondary)]"
            style={{ paddingLeft: '2.25rem', paddingRight: '2.5rem' }}
          >
            {PARTY_FILTERS.map(f => (
              <option key={f.value} value={f.value}>{f.label}</option>
            ))}
          </select>
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-slate-400">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>
      </div>

      {/* Party List */}
      {filtered.length === 0 ? (
        <div className="text-center py-16">
          <Users className="w-16 h-16 mx-auto mb-4" style={{ color: 'var(--muted-foreground)' }} />
          <h3 className="text-lg font-semibold mb-1" style={{ color: 'var(--foreground)' }}>No parties found</h3>
          <p className="text-sm mb-6" style={{ color: 'var(--muted-foreground)' }}>
            {searchQuery ? 'Try a different search term' : 'Add your first customer party to get started'}
          </p>
          {!searchQuery && (
            <button onClick={() => setShowAddModal(true)}
              className="px-6 py-2.5 rounded-xl text-sm font-medium text-white cursor-pointer"
              style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}>
              <Plus className="w-4 h-4 inline mr-2" /> Add First Party
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((party) => (
            <div key={party.id}
              onClick={() => goToParty(party)}
              className="rounded-xl p-4 cursor-pointer transition-all hover-lift"
              style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
              <div className="flex items-center gap-3">
                {/* Avatar */}
                <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 text-sm font-bold text-white"
                  style={{ background: 'linear-gradient(135deg, #1e3a5f, #334e68)' }}>
                  {getInitials(party.name)}
                </div>
                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold truncate" style={{ color: 'var(--foreground)' }}>{party.name}</h3>
                    {party.isFavorite && <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400 flex-shrink-0" />}
                  </div>
                  <div className="flex items-center gap-3 mt-0.5">
                    {party.phone && (
                      <span className="text-xs flex items-center gap-1" style={{ color: 'var(--muted-foreground)' }}>
                        <Phone className="w-3 h-3" />{party.phone}
                      </span>
                    )}
                    {party.lastTransactionDate && (
                      <span className="text-xs flex items-center gap-1" style={{ color: 'var(--muted-foreground)' }}>
                        <Calendar className="w-3 h-3" />{formatDate(party.lastTransactionDate)}
                      </span>
                    )}
                  </div>
                </div>
                {/* Due */}
                <div className="text-right flex-shrink-0">
                  <p className={`text-sm font-bold ${party.totalDue > 0 ? 'text-red-500' : 'text-green-500'}`}>
                    {formatCurrency(party.totalDue)}
                  </p>
                  <p className="text-[10px]" style={{ color: 'var(--muted-foreground)' }}>due</p>
                </div>
                {/* Actions */}
                <div className="relative flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                  <button onClick={() => setMenuOpen(menuOpen === party.id ? null : party.id)}
                    className="p-1.5 rounded-lg cursor-pointer transition-all hover:bg-[var(--secondary)]"
                    style={{ color: 'var(--muted-foreground)' }}>
                    <MoreVertical className="w-4 h-4" />
                  </button>
                  {menuOpen === party.id && (
                    <div className="absolute right-0 top-8 z-20 w-36 rounded-xl py-1 shadow-lg"
                      style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
                      <button onClick={(e) => { e.stopPropagation(); toggleFavorite(party.id, party.isFavorite); setMenuOpen(null); }}
                        className="w-full text-left px-3 py-2 text-xs flex items-center gap-2 hover:bg-[var(--secondary)] cursor-pointer"
                        style={{ color: 'var(--foreground)' }}>
                        <Star className="w-3.5 h-3.5" />{party.isFavorite ? 'Unfavorite' : 'Favorite'}
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); openEdit(party); }}
                        className="w-full text-left px-3 py-2 text-xs flex items-center gap-2 hover:bg-[var(--secondary)] cursor-pointer"
                        style={{ color: 'var(--foreground)' }}>
                        <Edit className="w-3.5 h-3.5" />Edit
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); handleDelete(party); setMenuOpen(null); }}
                        className="w-full text-left px-3 py-2 text-xs flex items-center gap-2 hover:bg-red-500/10 cursor-pointer text-red-500">
                        <Trash2 className="w-3.5 h-3.5" />Delete
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Modal */}
      {(showAddModal || showEditModal) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
          onClick={() => { setShowAddModal(false); setShowEditModal(false); }}>
          <div className="w-full max-w-md rounded-2xl p-6 animate-slide-up"
            style={{ background: 'var(--card)', border: '1px solid var(--border)' }}
            onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-bold mb-4" style={{ color: 'var(--foreground)' }}>
              {showEditModal ? 'Edit Party' : 'Add New Party'}
            </h2>
            <form onSubmit={showEditModal ? handleEdit : handleAdd} className="space-y-4">
              <div>
                <label className="text-xs font-medium mb-1 block" style={{ color: 'var(--muted-foreground)' }}>Party Name *</label>
                <input type="text" value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required placeholder="Enter party name"
                  className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
                  style={{ background: 'var(--secondary)', border: '1px solid var(--border)', color: 'var(--foreground)' }} />
              </div>
              <div>
                <label className="text-xs font-medium mb-1 block" style={{ color: 'var(--muted-foreground)' }}>Phone</label>
                <input type="tel" value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="Phone number"
                  className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
                  style={{ background: 'var(--secondary)', border: '1px solid var(--border)', color: 'var(--foreground)' }} />
              </div>
              <div>
                <label className="text-xs font-medium mb-1 block" style={{ color: 'var(--muted-foreground)' }}>Notes</label>
                <textarea value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Optional notes" rows={3}
                  className="w-full px-3 py-2.5 rounded-xl text-sm outline-none resize-none"
                  style={{ background: 'var(--secondary)', border: '1px solid var(--border)', color: 'var(--foreground)' }} />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button"
                  onClick={() => { setShowAddModal(false); setShowEditModal(false); setSearchParams({}); }}
                  className="flex-1 py-2.5 rounded-xl text-sm font-medium cursor-pointer"
                  style={{ background: 'var(--secondary)', color: 'var(--foreground)' }}>
                  Cancel
                </button>
                <button type="submit" disabled={saving}
                  className="flex-1 py-2.5 rounded-xl text-sm font-medium text-white cursor-pointer"
                  style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}>
                  {saving ? 'Saving...' : showEditModal ? 'Update' : 'Add Party'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}


    </div>
  );
}
