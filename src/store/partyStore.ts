import { create } from 'zustand';
import type { Party, PartyFilter } from '@/types';

interface PartyState {
  parties: Party[];
  selectedParty: Party | null;
  searchQuery: string;
  activeFilter: PartyFilter;
  sortOrder: 'asc' | 'desc';
  isLoading: boolean;
  error: string | null;
  recentPartyIds: string[];

  setParties: (parties: Party[]) => void;
  setSelectedParty: (party: Party | null) => void;
  setSearchQuery: (query: string) => void;
  setActiveFilter: (filter: PartyFilter) => void;
  toggleSortOrder: () => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  addRecentPartyId: (id: string) => void;
  getFilteredParties: () => Party[];
}

export const usePartyStore = create<PartyState>((set, get) => ({
  parties: [],
  selectedParty: null,
  searchQuery: '',
  activeFilter: 'all',
  sortOrder: 'asc',
  isLoading: true,
  error: null,
  recentPartyIds: JSON.parse(localStorage.getItem('recentPartyIds') || '[]'),

  setParties: (parties) => set({ parties }),
  setSelectedParty: (party) => set({ selectedParty: party }),
  setSearchQuery: (searchQuery) => set({ searchQuery }),
  setActiveFilter: (activeFilter) => set({ activeFilter }),
  toggleSortOrder: () => set((s) => ({ sortOrder: s.sortOrder === 'asc' ? 'desc' : 'asc' })),
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),
  addRecentPartyId: (id) => {
    const current = get().recentPartyIds.filter((rid) => rid !== id);
    const updated = [id, ...current].slice(0, 5);
    localStorage.setItem('recentPartyIds', JSON.stringify(updated));
    set({ recentPartyIds: updated });
  },
  getFilteredParties: () => {
    const { parties, searchQuery, activeFilter, sortOrder } = get();
    let filtered = [...parties];

    // Search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          (p.phone && p.phone.toLowerCase().includes(q))
      );
    }

    // Filter
    const now = new Date();
    switch (activeFilter) {
      case 'unpaid':
        filtered = filtered.filter((p) => p.totalDue > 0 && p.totalPaid === 0);
        break;
      case 'partially_paid':
        filtered = filtered.filter((p) => p.totalPaid > 0 && p.totalDue > 0);
        break;
      case 'fully_paid':
        filtered = filtered.filter((p) => p.totalDue === 0 && p.totalSold > 0);
        break;
      case 'overdue':
        filtered = filtered.filter((p) => {
          if (p.totalDue <= 0) return false;
          if (!p.lastPaymentDate) return true;
          const diff = (now.getTime() - new Date(p.lastPaymentDate).getTime()) / (1000 * 60 * 60 * 24);
          return diff > 30;
        });
        break;
      case 'recent_payments':
        filtered = filtered.filter((p) => {
          if (!p.lastPaymentDate) return false;
          const diff = (now.getTime() - new Date(p.lastPaymentDate).getTime()) / (1000 * 60 * 60 * 24);
          return diff <= 7;
        });
        break;
    }

    // Sort — favorites first, then alphabetical
    filtered.sort((a, b) => {
      if (a.isFavorite !== b.isFavorite) return a.isFavorite ? -1 : 1;
      const cmp = a.name.localeCompare(b.name);
      return sortOrder === 'asc' ? cmp : -cmp;
    });

    return filtered;
  },
}));
