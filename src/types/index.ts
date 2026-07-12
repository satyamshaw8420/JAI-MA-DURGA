import { Timestamp } from 'firebase/firestore';

// ===== Party =====
export interface Party {
  id: string;
  userId: string;
  name: string;
  phone: string | null;
  companyName: string | null;
  gstNo: string | null;
  notes: string | null;
  isFavorite: boolean;
  totalSold: number;
  totalPaid: number;
  totalDue: number;
  lastTransactionDate: string | null;
  lastPaymentDate: string | null;
  createdAt: string;
  updatedAt: string;
}

export type PartyFormData = {
  name: string;
  phone: string;
  companyName: string;
  gstNo: string;
  notes: string;
};

// ===== Column Definition =====
export interface ColumnDef {
  id: string;
  label: string;
  type: 'text' | 'number' | 'date' | 'dropdown';
  options?: string[];
  isDefault: boolean;
  order: number;
}

// ===== Ledger Row =====
export interface LedgerRow {
  id: string;
  date: string;
  itemName: string;
  size: string;
  quantity: number | null;
  weight: number | null;
  rate: number | null;
  amount: number | null;       // Invoice value (with GST if applied)
  taxableAmount?: number | null; // Pre-GST value (only if gstEnabled)
  gstAmount?: number | null;    // GST amount (only if gstEnabled)
  gstRate?: number | null;      // GST rate e.g. 18
  gstEnabled?: boolean;         // Whether GST was applied
  paid: number | null;
  due: number | null;
  paymentMode: string;
  paymentDate?: string; // Date when payment was received (e.g. via NEFT, Cheque, Cash)
  notes: string;
  [key: string]: unknown;
  createdAt: string;
  updatedAt: string;
}

// ===== Ledger Document =====
export interface Ledger {
  partyId: string;
  userId: string;
  columns: ColumnDef[];
  rows: LedgerRow[];
  updatedAt: string;
}

// ===== Settings =====
export interface UserSettings {
  userId: string;
  defaultPaymentMode: string;
  currency: string;
  dateFormat: string;
  theme: 'light' | 'dark' | 'system';
  updatedAt: string;
}

// ===== Audit Log =====
export type AuditAction =
  | 'PARTY_CREATED'
  | 'PARTY_UPDATED'
  | 'PARTY_DELETED'
  | 'ROW_ADDED'
  | 'ROW_EDITED'
  | 'ROW_DELETED'
  | 'PAYMENT_RECORDED'
  | 'COLUMN_ADDED'
  | 'COLUMN_DELETED';

export interface AuditLog {
  id: string;
  action: AuditAction;
  userId: string;
  userEmail: string;
  partyId: string | null;
  before: unknown | null;
  after: unknown | null;
  timestamp: string;
}

// ===== Pending Sync =====
export interface PendingSync {
  id?: number;
  operation: 'create' | 'update' | 'delete';
  collection: string;
  docId: string;
  payload: unknown;
  timestamp: string;
}

// ===== Dashboard Stats =====
export interface DashboardStats {
  totalParties: number;
  totalOutstandingDue: number;
  paymentReceivedToday: number;
  monthlyCollection: number;
  overdueParties: number;
  activeParties: number;
}

// ===== Payment Modes =====
export const PAYMENT_MODES = ['Cash', 'UPI', 'NEFT', 'Bank Transfer', 'Cheque', 'Other'] as const;
export type PaymentMode = typeof PAYMENT_MODES[number];

// ===== Default Columns =====
export const DEFAULT_COLUMNS: ColumnDef[] = [
  { id: 'date', label: 'Date', type: 'date', isDefault: true, order: 0 },
  { id: 'itemName', label: 'Item Name', type: 'text', isDefault: true, order: 1 },
  { id: 'size', label: 'Size', type: 'text', isDefault: true, order: 2 },
  { id: 'weight', label: 'Weight (kg)', type: 'number', isDefault: true, order: 3 },
  { id: 'rate', label: 'Rate (₹/kg)', type: 'number', isDefault: true, order: 4 },
  { id: 'amount', label: 'Amount (₹)', type: 'number', isDefault: true, order: 5 },
  { id: 'paid', label: 'Paid (₹)', type: 'number', isDefault: true, order: 6 },
  { id: 'due', label: 'Due (₹)', type: 'number', isDefault: true, order: 7 },
  { id: 'paymentMode', label: 'Payment Mode', type: 'dropdown', options: [...PAYMENT_MODES], isDefault: true, order: 8 },
  { id: 'notes', label: 'Notes', type: 'text', isDefault: true, order: 9 },
];

// ===== Filter Types =====
export type PartyFilter = 'all' | 'unpaid' | 'partially_paid' | 'fully_paid' | 'overdue' | 'recent_payments';

export const PARTY_FILTERS: { value: PartyFilter; label: string }[] = [
  { value: 'all', label: 'All Parties' },
  { value: 'unpaid', label: 'Unpaid' },
  { value: 'partially_paid', label: 'Partially Paid' },
  { value: 'fully_paid', label: 'Fully Paid' },
  { value: 'overdue', label: 'Overdue' },
  { value: 'recent_payments', label: 'Recent Payments' },
];

// ===== Firestore timestamp helper =====
export function toFirestoreTimestamp(date: string | Date): Timestamp {
  return Timestamp.fromDate(typeof date === 'string' ? new Date(date) : date);
}
