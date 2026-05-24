import { LedgerRow } from '@/types';

export function calculateDue(amount: number | null, paid: number | null): number {
  return (amount || 0) - (paid || 0);
}

export function calculateTotals(rows: LedgerRow[]): {
  totalSold: number;
  totalPaid: number;
  totalDue: number;
} {
  let totalSold = 0;
  let totalPaid = 0;

  for (const row of rows) {
    totalSold += row.amount || 0;
    totalPaid += row.paid || 0;
  }

  return {
    totalSold,
    totalPaid,
    totalDue: totalSold - totalPaid,
  };
}

export function calculateAmount(weight: number | null, rate: number | null): number | null {
  if (weight != null && rate != null && weight > 0 && rate > 0) {
    return Math.round(weight * rate * 100) / 100;
  }
  return null;
}

export function getLastTransactionDate(rows: LedgerRow[]): string | null {
  if (rows.length === 0) return null;
  const sorted = [...rows].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  return sorted[0].date;
}

export function getLastPaymentDate(rows: LedgerRow[]): string | null {
  const paidRows = rows.filter(r => (r.paid || 0) > 0);
  if (paidRows.length === 0) return null;
  const sorted = paidRows.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  return sorted[0].date;
}
