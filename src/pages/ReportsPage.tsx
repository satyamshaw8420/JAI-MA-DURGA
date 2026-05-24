import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { subscribeToParties } from '@/services/partyService';
import { exportDueSummaryPDF, exportDueSummaryExcel } from '@/services/exportService';
import { formatCurrency } from '@/lib/utils';
import type { Party } from '@/types';
import { FileBarChart, FileSpreadsheet, FileText, ArrowRight, TrendingUp, AlertCircle, Sparkles } from 'lucide-react';
import dayjs from 'dayjs';

export default function ReportsPage() {
  const { user } = useAuth();
  const [parties, setParties] = useState<Party[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    setLoading(true);

    const unsub = subscribeToParties(
      user.uid,
      (data) => {
        setParties(data);
        setLoading(false);
      },
      (err) => {
        console.error(err);
        setLoading(false);
      }
    );

    return () => unsub();
  }, [user]);

  const dueParties = parties.filter(p => p.totalDue > 0).sort((a, b) => b.totalDue - a.totalDue);
  const totalOutstanding = parties.reduce((sum, p) => sum + p.totalDue, 0);
  const totalSales = parties.reduce((sum, p) => sum + p.totalSold, 0);
  const totalPaid = parties.reduce((sum, p) => sum + p.totalPaid, 0);

  const cardStyle: React.CSSProperties = {
    background: 'var(--card)',
    border: '1px solid var(--border)',
    borderRadius: 0,
  };

  const buttonStyle: React.CSSProperties = {
    borderRadius: 0,
    cursor: 'pointer',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    fontSize: '11px',
    fontWeight: 700,
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    transition: 'all 0.15s ease',
  };

  return (
    <div className="p-4 md:p-6 lg:p-8 animate-fade-in" style={{ maxWidth: '1400px', margin: '0 auto' }}>
      
      {/* Title */}
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ color: 'var(--foreground)', fontSize: '22px', fontWeight: 800, letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <FileBarChart className="w-6 h-6 text-indigo-600" /> Business Reports & Exports
        </h1>
        <p style={{ color: 'var(--muted-foreground)', fontSize: '13px', marginTop: '4px' }}>
          Generate structured PDF ledger statements, Excel sheets, and audit customer outstanding summary reports.
        </p>
      </div>

      {/* Bento Grid: Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px', marginBottom: '32px' }}>
        
        {/* Outstanding summary card */}
        <div style={{ ...cardStyle, borderLeft: '4px solid #dc2626' }} className="p-6 relative overflow-hidden group">
          <p style={{ color: 'var(--muted-foreground)', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Total Active Receivables</p>
          <h2 style={{ color: '#dc2626', fontSize: '32px', fontWeight: 900, marginTop: '8px', letterSpacing: '-0.03em' }}>
            {formatCurrency(totalOutstanding)}
          </h2>
          <p style={{ color: 'var(--muted-foreground)', fontSize: '12px', marginTop: '6px' }}>
            Owed by <span className="font-bold text-slate-800 dark:text-slate-200">{dueParties.length}</span> parties with outstanding bills.
          </p>
        </div>

        {/* Sales summary card */}
        <div style={{ ...cardStyle, borderLeft: '4px solid #1e3a5f' }} className="p-6 relative overflow-hidden group">
          <p style={{ color: 'var(--muted-foreground)', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Cumulative Business Sales</p>
          <h2 style={{ color: 'var(--foreground)', fontSize: '32px', fontWeight: 900, marginTop: '8px', letterSpacing: '-0.03em' }}>
            {formatCurrency(totalSales)}
          </h2>
          <p style={{ color: 'var(--muted-foreground)', fontSize: '12px', marginTop: '6px' }}>
            All-time registered sales amount.
          </p>
        </div>

        {/* Payments summary card */}
        <div style={{ ...cardStyle, borderLeft: '4px solid #16a34a' }} className="p-6 relative overflow-hidden group">
          <p style={{ color: 'var(--muted-foreground)', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em' }}>All-Time Realized Cash</p>
          <h2 style={{ color: '#16a34a', fontSize: '32px', fontWeight: 900, marginTop: '8px', letterSpacing: '-0.03em' }}>
            {formatCurrency(totalPaid)}
          </h2>
          <p style={{ color: 'var(--muted-foreground)', fontSize: '12px', marginTop: '6px' }}>
            Total cash/UPI receipts cleared.
          </p>
        </div>

      </div>

      {/* Primary Report Generators Grid */}
      <h2 style={{ color: 'var(--foreground)', fontSize: '16px', fontWeight: 800, marginBottom: '16px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Report Templates</h2>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '16px', marginBottom: '32px' }} className="md:grid-cols-2">
        
        {/* PDF Outstanding Report */}
        <div style={cardStyle} className="p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div style={{ padding: '6px', background: '#fee2e2' }}>
                <FileText className="w-5 h-5 text-red-600" />
              </div>
              <h3 style={{ color: 'var(--foreground)', fontSize: '15px', fontWeight: 700 }}>Outstanding Balance Sheet (PDF)</h3>
            </div>
            <p style={{ color: 'var(--muted-foreground)', fontSize: '12px', lineHeight: 1.5, marginBottom: '20px' }}>
              Generates an A4 size PDF statement listing every customer who owes money, sorted from highest to lowest debt. Useful for collection agents and staff auditing.
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => exportDueSummaryPDF(parties)}
              style={{ ...buttonStyle, background: '#ef4444', color: '#ffffff', padding: '10px 16px', border: 'none' }}
              onMouseEnter={e => { (e.target as HTMLElement).style.background = '#dc2626'; }}
              onMouseLeave={e => { (e.target as HTMLElement).style.background = '#ef4444'; }}
            >
              <FileText className="w-4 h-4" /> Download PDF Report
            </button>
          </div>
        </div>

        {/* Excel Ledger Summary */}
        <div style={cardStyle} className="p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div style={{ padding: '6px', background: '#ecfdf5' }}>
                <FileSpreadsheet className="w-5 h-5 text-green-600" />
              </div>
              <h3 style={{ color: 'var(--foreground)', fontSize: '15px', fontWeight: 700 }}>Due Summary Sheet (Excel)</h3>
            </div>
            <p style={{ color: 'var(--muted-foreground)', fontSize: '12px', lineHeight: 1.5, marginBottom: '20px' }}>
              Exports all party balances, telephone numbers, and last active transaction dates into a fully formatted Microsoft Excel workbook. Best for spreadsheet analytics.
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => exportDueSummaryExcel(parties)}
              style={{ ...buttonStyle, background: '#16a34a', color: '#ffffff', padding: '10px 16px', border: 'none' }}
              onMouseEnter={e => { (e.target as HTMLElement).style.background = '#15803d'; }}
              onMouseLeave={e => { (e.target as HTMLElement).style.background = '#16a34a'; }}
            >
              <FileSpreadsheet className="w-4 h-4" /> Download Excel Sheet
            </button>
          </div>
        </div>

      </div>

      {/* Dues Breakdown Table */}
      <div style={cardStyle} className="p-5">
        <h3 style={{ color: 'var(--foreground)', fontSize: '14px', fontWeight: 800, marginBottom: '16px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Outstanding Debts breakdown
        </h3>

        {loading ? (
          <div className="p-8 text-center text-xs text-slate-500">Loading debt statistics...</div>
        ) : dueParties.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500">No parties currently owe any balances! Excellent cash health.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse" style={{ minWidth: '700px' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid var(--border)' }}>
                  <th className="p-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Party Name</th>
                  <th className="p-3 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Total Goods Sold</th>
                  <th className="p-3 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Total Payments</th>
                  <th className="p-3 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Outstanding Debt</th>
                  <th className="p-3 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">Collection Status</th>
                </tr>
              </thead>
              <tbody>
                {dueParties.map((party) => {
                  const payRatio = party.totalSold ? (party.totalPaid / party.totalSold) * 100 : 0;
                  
                  return (
                    <tr key={party.id} className="border-b border-[var(--border)] hover:bg-slate-50 transition-colors">
                      <td className="p-3 text-xs font-bold text-slate-900">{party.name}</td>
                      <td className="p-3 text-xs font-medium text-slate-900 text-right">{formatCurrency(party.totalSold)}</td>
                      <td className="p-3 text-xs font-medium text-green-600 text-right">{formatCurrency(party.totalPaid)}</td>
                      <td className="p-3 text-xs font-black text-red-600 text-right">{formatCurrency(party.totalDue)}</td>
                      <td className="p-3 text-center">
                        <div className="inline-block px-2.5 py-0.5 text-[9px] font-bold uppercase" style={{
                          background: payRatio < 20 ? '#fee2e2' : payRatio < 60 ? '#fffbeb' : '#ecfdf5',
                          color: payRatio < 20 ? '#991b1b' : payRatio < 60 ? '#9a3412' : '#166534',
                          border: `1px solid ${payRatio < 20 ? '#fca5a5' : payRatio < 60 ? '#fde68a' : '#86efac'}`
                        }}>
                          {payRatio < 20 ? 'CRITICAL DUE' : payRatio < 60 ? 'PARTIAL PAY' : 'HIGH COLLECTION'}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
}
