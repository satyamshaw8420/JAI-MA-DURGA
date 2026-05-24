import { create } from 'zustand';
import type { ColumnDef, LedgerRow } from '@/types';
import { DEFAULT_COLUMNS } from '@/types';

interface LedgerState {
  partyId: string | null;
  columns: ColumnDef[];
  rows: LedgerRow[];
  isLoading: boolean;
  isSaving: boolean;
  error: string | null;

  setPartyId: (id: string | null) => void;
  setColumns: (columns: ColumnDef[]) => void;
  setRows: (rows: LedgerRow[]) => void;
  setLoading: (loading: boolean) => void;
  setSaving: (saving: boolean) => void;
  setError: (error: string | null) => void;
  reset: () => void;
}

export const useLedgerStore = create<LedgerState>((set) => ({
  partyId: null,
  columns: DEFAULT_COLUMNS,
  rows: [],
  isLoading: true,
  isSaving: false,
  error: null,

  setPartyId: (partyId) => set({ partyId }),
  setColumns: (columns) => set({ columns }),
  setRows: (rows) => set({ rows }),
  setLoading: (isLoading) => set({ isLoading }),
  setSaving: (isSaving) => set({ isSaving }),
  setError: (error) => set({ error }),
  reset: () => set({ partyId: null, columns: DEFAULT_COLUMNS, rows: [], isLoading: true, error: null }),
}));
