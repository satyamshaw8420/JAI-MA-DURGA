import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { usePartyStore } from '@/store/partyStore';
import { subscribeToParties, addParty, deleteParty, toggleFavorite, updateParty } from '@/services/partyService';
import { formatCurrency, formatDate, getInitials } from '@/lib/utils';
import type { Party, PartyFormData } from '@/types';
import { PARTY_FILTERS } from '@/types';
import { toast } from 'sonner';
import {
  Search, Plus, Star, Phone, Calendar, MoreVertical, Trash2, Edit,
  SortAsc, SortDesc, Users, X, Filter, User, Building2, FileText, UserPlus
} from 'lucide-react';

export default function PartiesPage() {
  const { user, activeWorkspaceId } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const {
    parties, setParties, setLoading,
    searchQuery, setSearchQuery,
    activeFilter, setActiveFilter,
    sortOrder, toggleSortOrder,
    getFilteredParties, addRecentPartyId,
  } = usePartyStore();

  const [showAddModal, setShowAddModal] = useState(searchParams.get('add') === 'true');
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingParty, setEditingParty] = useState<Party | null>(null);
  const [formData, setFormData] = useState<PartyFormData>({ name: '', phone: '', companyName: '', gstNo: '', notes: '' });
  const [saving, setSaving] = useState(false);
  const [menuOpen, setMenuOpen] = useState<string | null>(null);
  const [focusedField, setFocusedField] = useState<string | null>(null);

  // Subscribe to parties
  useEffect(() => {
    if (!user) return;
    setLoading(true);
    const unsub = subscribeToParties(
      activeWorkspaceId || user.uid,
      (data) => { setParties(data); setLoading(false); },
      (err) => { console.error(err); setLoading(false); }
    );
    return unsub;
  }, [user, activeWorkspaceId, setParties, setLoading]);

  // Close context menu on outside click
  useEffect(() => {
    const close = () => setMenuOpen(null);
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, []);

  const openAddModal = () => {
    setFormData({ name: '', phone: '', companyName: '', gstNo: '', notes: '' });
    setShowAddModal(true);
  };

  const closeModal = () => {
    setShowAddModal(false);
    setShowEditModal(false);
    setEditingParty(null);
    setSearchParams({});
  };

  const openEdit = (party: Party) => {
    setEditingParty(party);
    setFormData({ name: party.name, phone: party.phone || '', companyName: party.companyName || '', gstNo: party.gstNo || '', notes: party.notes || '' });
    setShowEditModal(true);
    setMenuOpen(null);
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !formData.name.trim()) return;
    setSaving(true);
    try {
      await addParty(activeWorkspaceId || user.uid, user.email || '', formData);
      toast.success('Party added successfully');
      closeModal();
    } catch {
      toast.error('Failed to add party');
    }
    setSaving(false);
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !editingParty) return;
    setSaving(true);
    try {
      await updateParty(activeWorkspaceId || user.uid, user.email || '', editingParty.id, formData, editingParty);
      toast.success('Party updated');
      closeModal();
    } catch {
      toast.error('Failed to update party');
    }
    setSaving(false);
  };

  const handleDelete = async (party: Party) => {
    if (!user) return;
    if (!confirm(`Delete "${party.name}"? This will also delete their ledger.`)) return;
    try {
      await deleteParty(activeWorkspaceId || user.uid, user.email || '', party.id, party.name);
      toast.success('Party deleted');
    } catch {
      toast.error('Failed to delete party');
    }
  };

  const goToParty = (party: Party) => {
    addRecentPartyId(party.id);
    navigate(`/parties/${party.id}`);
  };

  const filtered = getFilteredParties();

  return (
    <>
      <div className="max-w-5xl mx-auto animate-fade-in">

      {/*
        ╔══════════════════════════════════════════════════════╗
        ║  STICKY CONTROL BAR — glued just below the app header ║
        ║  Stays visible no matter how far you scroll down     ║
        ╚══════════════════════════════════════════════════════╝
      */}
      <div
        className="sticky top-0 z-20 px-3 sm:px-6 py-3 space-y-3"
        style={{
          background: 'var(--background)',
          borderBottom: '1px solid var(--border)',
          boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
        }}
      >
        {/* Row 1 — Title + Add Party */}
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold leading-tight" style={{ color: 'var(--foreground)' }}>
              Parties
            </h1>
            <p className="text-xs sm:text-sm" style={{ color: 'var(--muted-foreground)' }}>
              {parties.length} total customers
            </p>
          </div>

          <button
            onClick={openAddModal}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white shrink-0 active:scale-95 transition-transform"
            style={{
              background: 'linear-gradient(135deg, #f59e0b, #d97706)',
              boxShadow: '0 4px 14px rgba(245,158,11,0.35)',
            }}
          >
            <Plus className="w-4 h-4" />
            <span>Add Party</span>
          </button>
        </div>

        {/* Row 2 — Search + Sort */}
        <div className="flex gap-2">
          <div className="relative flex-1 group">
            <Search className="w-4 h-4 text-slate-400 group-focus-within:text-indigo-500 transition-colors absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search parties..."
              className="w-full py-2.5 pr-9 rounded-xl border border-[var(--border)] bg-[var(--card)] text-sm text-[var(--foreground)] placeholder-[var(--muted-foreground)] focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all shadow-sm"
              style={{ paddingLeft: '2.25rem' }}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <button
            onClick={toggleSortOrder}
            className="px-3 py-2.5 rounded-xl bg-[var(--card)] border border-[var(--border)] text-[var(--muted-foreground)] hover:bg-[var(--secondary)] hover:text-indigo-600 transition-all shadow-sm flex items-center justify-center shrink-0"
            title={sortOrder === 'asc' ? 'Sort Z→A' : 'Sort A→Z'}
          >
            {sortOrder === 'asc' ? <SortAsc className="w-4 h-4" /> : <SortDesc className="w-4 h-4" />}
          </button>
        </div>

        {/* Row 3 — Filter */}
        <div className="relative">
          <Filter className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <select
            value={activeFilter}
            onChange={(e) => setActiveFilter(e.target.value as any)}
            className="appearance-none w-full py-2.5 bg-[var(--card)] border border-[var(--border)] rounded-xl text-sm font-semibold text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all cursor-pointer shadow-sm"
            style={{ paddingLeft: '2.25rem', paddingRight: '2.5rem' }}
          >
            {PARTY_FILTERS.map(f => (
              <option key={f.value} value={f.value}>{f.label}</option>
            ))}
          </select>
          <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>
      </div>

      {/* Party list — scrolls freely below the sticky bar */}
      <div className="px-3 sm:px-6 py-3 pb-24 md:pb-6">
        {filtered.length === 0 ? (
          <div className="text-center py-16">
            <Users className="w-16 h-16 mx-auto mb-4" style={{ color: 'var(--muted-foreground)' }} />
            <h3 className="text-lg font-semibold mb-1" style={{ color: 'var(--foreground)' }}>No parties found</h3>
            <p className="text-sm mb-6" style={{ color: 'var(--muted-foreground)' }}>
              {searchQuery ? 'Try a different search term' : 'Add your first customer party to get started'}
            </p>
            {!searchQuery && (
              <button
                onClick={openAddModal}
                className="px-6 py-2.5 rounded-xl text-sm font-semibold text-white"
                style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}
              >
                <Plus className="w-4 h-4 inline mr-2" />Add First Party
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((party) => (
              <div
                key={party.id}
                onClick={() => goToParty(party)}
                className="rounded-xl p-3 sm:p-4 cursor-pointer transition-all hover-lift"
                style={{ background: 'var(--card)', border: '1px solid var(--border)' }}
              >
                <div className="flex items-center gap-3">
                  {/* Avatar */}
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 text-sm font-bold text-white"
                    style={{ background: 'linear-gradient(135deg, #1e3a5f, #334e68)' }}
                  >
                    {getInitials(party.name)}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <h3 className="text-sm font-semibold truncate" style={{ color: 'var(--foreground)' }}>
                        {party.name}
                      </h3>
                      {party.isFavorite && (
                        <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400 flex-shrink-0" />
                      )}
                    </div>
                    <div className="flex items-center flex-wrap gap-2 mt-0.5">
                      {party.phone && (
                        <span className="text-xs flex items-center gap-1" style={{ color: 'var(--muted-foreground)' }}>
                          <Phone className="w-3 h-3" />{party.phone}
                        </span>
                      )}
                      {party.companyName && (
                        <span className="text-xs flex items-center gap-1" style={{ color: 'var(--muted-foreground)' }}>
                          🏢 {party.companyName}
                        </span>
                      )}
                      {party.gstNo && (
                        <span className="text-xs flex items-center gap-1" style={{ color: 'var(--muted-foreground)', fontFamily: 'monospace' }}>
                          GST: {party.gstNo}
                        </span>
                      )}
                      {party.lastTransactionDate && (
                        <span className="text-xs flex items-center gap-1" style={{ color: 'var(--muted-foreground)' }}>
                          <Calendar className="w-3 h-3" />{formatDate(party.lastTransactionDate)}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Due amount */}
                  <div className="text-right flex-shrink-0">
                    <p className={`text-sm font-bold ${party.totalDue > 0 ? 'text-red-500' : 'text-green-500'}`}>
                      {formatCurrency(party.totalDue)}
                    </p>
                    <p className="text-[10px]" style={{ color: 'var(--muted-foreground)' }}>due</p>
                  </div>

                  {/* Context menu */}
                  <div className="relative flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setMenuOpen(menuOpen === party.id ? null : party.id);
                      }}
                      className="p-1.5 rounded-lg cursor-pointer transition-all hover:bg-[var(--secondary)]"
                      style={{ color: 'var(--muted-foreground)' }}
                    >
                      <MoreVertical className="w-4 h-4" />
                    </button>

                    {menuOpen === party.id && (
                      <div
                        className="absolute right-0 top-8 z-30 w-36 rounded-xl py-1 shadow-lg"
                        style={{ background: 'var(--card)', border: '1px solid var(--border)' }}
                      >
                        <button
                          onClick={(e) => { e.stopPropagation(); toggleFavorite(party.id, party.isFavorite); setMenuOpen(null); }}
                          className="w-full text-left px-3 py-2 text-xs flex items-center gap-2 hover:bg-[var(--secondary)] cursor-pointer"
                          style={{ color: 'var(--foreground)' }}
                        >
                          <Star className="w-3.5 h-3.5" />
                          {party.isFavorite ? 'Unfavorite' : 'Favorite'}
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); openEdit(party); }}
                          className="w-full text-left px-3 py-2 text-xs flex items-center gap-2 hover:bg-[var(--secondary)] cursor-pointer"
                          style={{ color: 'var(--foreground)' }}
                        >
                          <Edit className="w-3.5 h-3.5" />Edit
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDelete(party); setMenuOpen(null); }}
                          className="w-full text-left px-3 py-2 text-xs flex items-center gap-2 hover:bg-red-500/10 cursor-pointer text-red-500"
                        >
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
      </div>
      </div>

      {/* ── Add / Edit Modal ── */}
      {(showAddModal || showEditModal) && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)' }}
          onClick={closeModal}
        >
          <div
            className="w-full sm:max-w-md rounded-2xl p-6 animate-slide-up flex flex-col relative"
            style={{ 
              background: 'var(--card)', 
              border: '1px solid var(--border)',
              maxHeight: '88vh',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header with Close Button */}
            <div className="flex items-center justify-between mb-5 flex-shrink-0">
              <h2 className="text-lg font-bold" style={{ color: 'var(--foreground)' }}>
                {showEditModal ? 'Edit Party' : 'Add New Party'}
              </h2>
              <button
                onClick={closeModal}
                className="p-1.5 rounded-lg hover:bg-[var(--secondary)] transition-colors text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="overflow-y-auto pr-1 pb-1 flex-1 scrollbar-thin" style={{ minHeight: '0' }}>
              <form onSubmit={showEditModal ? handleEdit : handleAdd} className="space-y-4">
                
                {/* Party Name */}
                <div>
                  <label className="text-xs font-semibold mb-1.5 block" style={{ color: 'var(--muted-foreground)' }}>
                    Party Name <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <span 
                      className="absolute left-3.5 top-1/2 -translate-y-1/2 transition-colors duration-200"
                      style={{ color: focusedField === 'name' ? '#2563eb' : '#94a3b8', zIndex: 10 }}
                    >
                      <User className="w-4 h-4" />
                    </span>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                      placeholder="e.g. Ramesh Traders"
                      autoFocus
                      onFocus={() => setFocusedField('name')}
                      onBlur={() => setFocusedField(null)}
                      className="w-full text-sm outline-none transition-all"
                      style={{
                        paddingLeft: '2.75rem',
                        paddingRight: '0.75rem',
                        paddingTop: '0.75rem',
                        paddingBottom: '0.75rem',
                        borderRadius: '0.75rem',
                        background: 'var(--card)',
                        border: focusedField === 'name' ? '1.5px solid #2563eb' : '1px solid var(--border)',
                        boxShadow: focusedField === 'name' ? '0 0 0 3px rgba(37, 99, 235, 0.15)' : 'none',
                        color: 'var(--foreground)',
                      }}
                    />
                  </div>
                </div>

                {/* Phone Number */}
                <div>
                  <label className="text-xs font-semibold mb-1.5 block" style={{ color: 'var(--muted-foreground)' }}>
                    Phone Number
                  </label>
                  <div className="relative">
                    <span 
                      className="absolute left-3.5 top-1/2 -translate-y-1/2 transition-colors duration-200"
                      style={{ color: focusedField === 'phone' ? '#2563eb' : '#94a3b8', zIndex: 10 }}
                    >
                      <Phone className="w-4 h-4" />
                    </span>
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="Phone number"
                      onFocus={() => setFocusedField('phone')}
                      onBlur={() => setFocusedField(null)}
                      className="w-full text-sm outline-none transition-all"
                      style={{
                        paddingLeft: '2.75rem',
                        paddingRight: '0.75rem',
                        paddingTop: '0.75rem',
                        paddingBottom: '0.75rem',
                        borderRadius: '0.75rem',
                        background: 'var(--card)',
                        border: focusedField === 'phone' ? '1.5px solid #2563eb' : '1px solid var(--border)',
                        boxShadow: focusedField === 'phone' ? '0 0 0 3px rgba(37, 99, 235, 0.15)' : 'none',
                        color: 'var(--foreground)',
                      }}
                    />
                  </div>
                </div>

                {/* Company Name */}
                <div>
                  <label className="text-xs font-semibold mb-1.5 block" style={{ color: 'var(--muted-foreground)' }}>
                    Company Name
                  </label>
                  <div className="relative">
                    <span 
                      className="absolute left-3.5 top-1/2 -translate-y-1/2 transition-colors duration-200"
                      style={{ color: focusedField === 'companyName' ? '#2563eb' : '#94a3b8', zIndex: 10 }}
                    >
                      <Building2 className="w-4 h-4" />
                    </span>
                    <input
                      type="text"
                      value={formData.companyName}
                      onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                      placeholder="e.g. Ramesh Iron & Steel Pvt Ltd"
                      onFocus={() => setFocusedField('companyName')}
                      onBlur={() => setFocusedField(null)}
                      className="w-full text-sm outline-none transition-all"
                      style={{
                        paddingLeft: '2.75rem',
                        paddingRight: '0.75rem',
                        paddingTop: '0.75rem',
                        paddingBottom: '0.75rem',
                        borderRadius: '0.75rem',
                        background: 'var(--card)',
                        border: focusedField === 'companyName' ? '1.5px solid #2563eb' : '1px solid var(--border)',
                        boxShadow: focusedField === 'companyName' ? '0 0 0 3px rgba(37, 99, 235, 0.15)' : 'none',
                        color: 'var(--foreground)',
                      }}
                    />
                  </div>
                </div>

                {/* GST Number */}
                <div>
                  <label className="text-xs font-semibold mb-1.5 block" style={{ color: 'var(--muted-foreground)' }}>
                    GST Number
                  </label>
                  <div className="relative">
                    <span 
                      className="absolute left-3.5 top-1/2 -translate-y-1/2 transition-colors duration-200"
                      style={{ color: focusedField === 'gstNo' ? '#2563eb' : '#94a3b8', zIndex: 10 }}
                    >
                      <FileText className="w-4 h-4" />
                    </span>
                    <input
                      type="text"
                      value={formData.gstNo}
                      onChange={(e) => setFormData({ ...formData, gstNo: e.target.value.toUpperCase() })}
                      placeholder="e.g. 22AAAAA0000A1Z5"
                      maxLength={15}
                      onFocus={() => setFocusedField('gstNo')}
                      onBlur={() => setFocusedField(null)}
                      className="w-full text-sm outline-none transition-all"
                      style={{
                        paddingLeft: '2.75rem',
                        paddingRight: '0.75rem',
                        paddingTop: '0.75rem',
                        paddingBottom: '0.75rem',
                        borderRadius: '0.75rem',
                        background: 'var(--card)',
                        border: focusedField === 'gstNo' ? '1.5px solid #2563eb' : '1px solid var(--border)',
                        boxShadow: focusedField === 'gstNo' ? '0 0 0 3px rgba(37, 99, 235, 0.15)' : 'none',
                        color: 'var(--foreground)',
                        fontFamily: 'monospace',
                        letterSpacing: '0.05em',
                      }}
                    />
                  </div>
                </div>

                {/* Notes */}
                <div>
                  <label className="text-xs font-semibold mb-1.5 block" style={{ color: 'var(--muted-foreground)' }}>
                    Notes
                  </label>
                  <div className="relative">
                    <span 
                      className="absolute left-3.5 top-3.5 transition-colors duration-200"
                      style={{ color: focusedField === 'notes' ? '#2563eb' : '#94a3b8', zIndex: 10 }}
                    >
                      <FileText className="w-4 h-4" />
                    </span>
                    <textarea
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      placeholder="Optional notes"
                      rows={3}
                      onFocus={() => setFocusedField('notes')}
                      onBlur={() => setFocusedField(null)}
                      className="w-full text-sm outline-none resize-none transition-all"
                      style={{
                        paddingLeft: '2.75rem',
                        paddingRight: '0.75rem',
                        paddingTop: '0.75rem',
                        paddingBottom: '0.75rem',
                        borderRadius: '0.75rem',
                        background: 'var(--card)',
                        border: focusedField === 'notes' ? '1.5px solid #2563eb' : '1px solid var(--border)',
                        boxShadow: focusedField === 'notes' ? '0 0 0 3px rgba(37, 99, 235, 0.15)' : 'none',
                        color: 'var(--foreground)',
                      }}
                    />
                  </div>
                </div>

                {/* Buttons */}
                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={closeModal}
                    className="flex-1 py-2.5 rounded-xl text-sm font-semibold border cursor-pointer transition-all active:scale-98"
                    style={{ 
                      background: 'var(--card)', 
                      borderColor: 'var(--border)', 
                      color: 'var(--foreground)' 
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white cursor-pointer transition-all active:scale-95 disabled:opacity-60 flex items-center justify-center gap-1.5"
                    style={{ background: '#f59e0b', border: 'none' }}
                  >
                    {saving ? (
                      'Saving...'
                    ) : (
                      <>
                        <UserPlus className="w-4 h-4" />
                        {showEditModal ? 'Update Party' : 'Add Party'}
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
