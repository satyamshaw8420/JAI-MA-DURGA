import {
  doc,
  setDoc,
  onSnapshot,
  serverTimestamp,
  getDocs,
  query,
  collection,
  where
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { localDb } from '@/lib/dexie';
import type { Ledger, LedgerRow, ColumnDef } from '@/types';
import { DEFAULT_COLUMNS } from '@/types';
import { generateId } from '@/lib/utils';
import { calculateDue, calculateTotals, getLastTransactionDate, getLastPaymentDate } from '@/lib/calculations';
import { updatePartyTotals } from './partyService';
import { logAudit } from './auditService';
import dayjs from 'dayjs';

export function subscribeToLedger(
  partyId: string,
  onData: (ledger: Ledger) => void,
  onError: (error: Error) => void
) {
  return onSnapshot(
    doc(db, 'ledgers', partyId),
    (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        const ledger: Ledger = {
          partyId: data.partyId,
          userId: data.userId,
          columns: data.columns || DEFAULT_COLUMNS,
          rows: (data.rows || []).map((r: LedgerRow) => ({
            ...r,
            due: calculateDue(r.amount, r.paid),
          })),
          updatedAt: data.updatedAt?.toDate?.()?.toISOString() || new Date().toISOString(),
        };
        onData(ledger);
        localDb.ledgers.put(ledger).catch(console.warn);
      } else {
        // No ledger yet — return empty
        const emptyLedger: Ledger = {
          partyId,
          userId: '',
          columns: DEFAULT_COLUMNS,
          rows: [],
          updatedAt: new Date().toISOString(),
        };
        onData(emptyLedger);
      }
    },
    onError
  );
}

export async function saveLedger(ledger: Ledger) {
  const firestoreData = {
    ...ledger,
    updatedAt: serverTimestamp(),
  };
  await setDoc(doc(db, 'ledgers', ledger.partyId), firestoreData);
  await localDb.ledgers.put(ledger);
}

export function createEmptyRow(): LedgerRow {
  const now = new Date().toISOString();
  return {
    id: generateId(),
    date: dayjs().format('YYYY-MM-DD'),
    itemName: '',
    size: '',
    quantity: null,
    weight: null,
    rate: null,
    amount: null,
    paid: null,
    due: null,
    paymentMode: '',
    notes: '',
    createdAt: now,
    updatedAt: now,
  };
}

export async function addRow(
  ledger: Ledger,
  userId: string,
  userEmail: string,
  afterIndex?: number
): Promise<LedgerRow> {
  const newRow = createEmptyRow();
  const rows = [...ledger.rows];

  if (afterIndex !== undefined && afterIndex >= 0) {
    rows.splice(afterIndex + 1, 0, newRow);
  } else {
    rows.push(newRow);
  }

  const updatedLedger = { ...ledger, rows };
  await saveLedger(updatedLedger);
  await syncPartyTotals(ledger.partyId, rows);

  logAudit('ROW_ADDED', userId, userEmail, ledger.partyId, null, { rowId: newRow.id });

  return newRow;
}

export async function updateRow(
  ledger: Ledger,
  rowId: string,
  updates: Partial<LedgerRow>,
  userId: string,
  userEmail: string
) {
  const rows = ledger.rows.map((r) => {
    if (r.id !== rowId) return r;
    const updated = { ...r, ...updates, updatedAt: new Date().toISOString() };
    updated.due = calculateDue(updated.amount, updated.paid);
    return updated;
  });

  const updatedLedger = { ...ledger, rows };
  await saveLedger(updatedLedger);
  await syncPartyTotals(ledger.partyId, rows);

  if (updates.paid && (updates.paid > 0)) {
    logAudit('PAYMENT_RECORDED', userId, userEmail, ledger.partyId, null, {
      rowId,
      paid: updates.paid,
      paymentMode: updates.paymentMode,
    });
  } else {
    logAudit('ROW_EDITED', userId, userEmail, ledger.partyId, { rowId }, updates);
  }
}

export async function deleteRows(
  ledger: Ledger,
  rowIds: string[],
  userId: string,
  userEmail: string
) {
  const rows = ledger.rows.filter((r) => !rowIds.includes(r.id));
  const updatedLedger = { ...ledger, rows };
  await saveLedger(updatedLedger);
  await syncPartyTotals(ledger.partyId, rows);

  logAudit('ROW_DELETED', userId, userEmail, ledger.partyId, { rowIds }, null);
}

export async function duplicateRow(
  ledger: Ledger,
  rowId: string,
  userId: string,
  userEmail: string
): Promise<LedgerRow> {
  const sourceRow = ledger.rows.find((r) => r.id === rowId);
  if (!sourceRow) throw new Error('Row not found');

  const now = new Date().toISOString();
  const newRow: LedgerRow = {
    ...sourceRow,
    id: generateId(),
    createdAt: now,
    updatedAt: now,
  };

  const sourceIndex = ledger.rows.findIndex((r) => r.id === rowId);
  const rows = [...ledger.rows];
  rows.splice(sourceIndex + 1, 0, newRow);

  const updatedLedger = { ...ledger, rows };
  await saveLedger(updatedLedger);
  await syncPartyTotals(ledger.partyId, rows);

  logAudit('ROW_ADDED', userId, userEmail, ledger.partyId, null, { rowId: newRow.id, duplicatedFrom: rowId });

  return newRow;
}

export async function addColumn(
  ledger: Ledger,
  column: Omit<ColumnDef, 'order' | 'isDefault'>,
  userId: string,
  userEmail: string
) {
  const newCol: ColumnDef = {
    ...column,
    isDefault: false,
    order: ledger.columns.length,
  };

  const columns = [...ledger.columns, newCol];
  // Add empty value for this column to all existing rows
  const rows = ledger.rows.map((r) => ({
    ...r,
    [column.id]: column.type === 'number' ? null : '',
  }));

  const updatedLedger = { ...ledger, columns, rows };
  await saveLedger(updatedLedger);

  logAudit('COLUMN_ADDED', userId, userEmail, ledger.partyId, null, { column: newCol });
}

export async function deleteColumn(
  ledger: Ledger,
  columnId: string,
  userId: string,
  userEmail: string
) {
  const columns = ledger.columns.filter((c) => c.id !== columnId);
  // Remove column data from all rows
  const rows = ledger.rows.map((r) => {
    const { [columnId]: _, ...rest } = r;
    return rest as LedgerRow;
  });

  const updatedLedger = { ...ledger, columns, rows };
  await saveLedger(updatedLedger);

  logAudit('COLUMN_DELETED', userId, userEmail, ledger.partyId, { columnId }, null);
}

export async function syncPartyTotals(partyId: string, rows: LedgerRow[]) {
  const totals = calculateTotals(rows);
  await updatePartyTotals(partyId, {
    ...totals,
    lastTransactionDate: getLastTransactionDate(rows),
    lastPaymentDate: getLastPaymentDate(rows),
  });
}

export async function getLedgerFromCache(partyId: string): Promise<Ledger | undefined> {
  return localDb.ledgers.get(partyId);
}

export async function initializeLedger(partyId: string, userId: string) {
  const ledger: Ledger = {
    partyId,
    userId,
    columns: DEFAULT_COLUMNS,
    rows: [],
    updatedAt: new Date().toISOString(),
  };
  await saveLedger(ledger);
  return ledger;
}

export async function getAllLedgersForUser(userId: string): Promise<Ledger[]> {
  try {
    const q = query(collection(db, 'ledgers'), where('userId', '==', userId));
    const querySnapshot = await getDocs(q);
    const ledgers: Ledger[] = [];
    querySnapshot.forEach((docSnap) => {
      ledgers.push(docSnap.data() as Ledger);
    });
    return ledgers;
  } catch (error) {
    console.error('Failed to fetch all ledgers:', error);
    return [];
  }
}
