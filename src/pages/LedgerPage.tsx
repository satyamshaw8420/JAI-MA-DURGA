import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { subscribeToParties } from '@/services/partyService';
import { getAllLedgersForUser } from '@/services/ledgerService';
import { formatCurrency } from '@/lib/utils';
import type { Party, Ledger, LedgerRow } from '@/types';
import { BookOpen, Search, Filter, ArrowUpRight, ArrowDownLeft, ExternalLink, Calendar } from 'lucide-react';
import dayjs from 'dayjs';

interface UnifiedRow extends LedgerRow {
  partyName: string;
  partyId: string;
}

export default function LedgerPage() {
  const { user, activeWorkspaceId } = useAuth();
  const navigate = useNavigate();
  const [parties, setParties] = useState<Party[]>([]);
  const [ledgers, setLedgers] = useState<Ledger[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [partyFilter, setPartyFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all'); // all, credit (sales), debit (payments)
  const [dateRange, setDateRange] = useState('all'); // all, today, this_month, last_30_days

  useEffect(() => {
    if (!user) return;
    setLoading(true);

    const unsub = subscribeToParties(
      activeWorkspaceId || user.uid,
      (partiesData) => {
        setParties(partiesData);

        getAllLedgersForUser(activeWorkspaceId || user.uid).then(ledgersData => {
          setLedgers(ledgersData);
          setLoading(false);
        }).catch(err => {
          console.error(err);
          setLoading(false);
        });
      },
      (err) => {
        console.error(err);
        setLoading(false);
      }
    );

    return () => unsub();
  }, [user, activeWorkspaceId]);

  // Flatten all transactions and sort by date descending
  const allRows: UnifiedRow[] = ledgers.flatMap(ledger => {
    const party = parties.find(p => p.id === ledger.partyId);
    return ledger.rows.map(row => ({
      ...row,
      partyName: party?.name || 'Unknown Party',
      partyId: ledger.partyId
    }));
  }).sort((a, b) => dayjs(b.date || '').diff(dayjs(a.date || '')));

  // Filtered rows
  const filteredRows = allRows.filter(row => {
    // Search
    const searchMatch =
      row.partyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      row.itemName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (row.notes || '').toLowerCase().includes(searchTerm.toLowerCase());

    // Party filter
    const partyMatch = partyFilter === 'all' || row.partyId === partyFilter;

    // Type filter
    const typeMatch =
      typeFilter === 'all' ||
      (typeFilter === 'credit' && (row.amount || 0) > 0) ||
      (typeFilter === 'debit' && (row.paid || 0) > 0);

    // Date filter
    let dateMatch = true;
    if (dateRange === 'today') {
      dateMatch = row.date === dayjs().format('YYYY-MM-DD');
    } else if (dateRange === 'this_month') {
      dateMatch = dayjs(row.date).month() === dayjs().month() && dayjs(row.date).year() === dayjs().year();
    } else if (dateRange === 'last_30_days') {
      dateMatch = dayjs().diff(dayjs(row.date), 'day') <= 30;
    }

    return searchMatch && partyMatch && typeMatch && dateMatch;
  });

  // Calculate totals for the filtered set
  const totalAmount = filteredRows.reduce((sum, r) => sum + (r.amount || 0), 0);
  const totalPaid = filteredRows.reduce((sum, r) => sum + (r.paid || 0), 0);
  const totalDue = filteredRows.reduce((sum, r) => sum + ((r.amount || 0) - (r.paid || 0)), 0);

  const cardStyle: React.CSSProperties = {
    background: 'var(--card)',
    border: '1px solid var(--border)',
    borderRadius: '12px',
    boxShadow: '0 1px 3px 0 rgba(0,0,0,0.05)',
  };

  return (
    <div className="p-3 sm:p-4 md:p-6 lg:p-8 animate-fade-in" style={{ maxWidth: '1400px', margin: '0 auto' }}>

      {/* Title */}
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ color: 'var(--foreground)', fontSize: '22px', fontWeight: 800, letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <BookOpen className="w-6 h-6 text-blue-600" /> General Ledger
        </h1>
        <p style={{ color: 'var(--muted-foreground)', fontSize: '13px', marginTop: '4px' }}>
          View and audit all business transactions across all parties in a unified log.
        </p>
      </div>

      {/* Stats summary panel */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        <div style={cardStyle} className="p-5 flex justify-between items-center">
          <div>
            <p style={{ color: 'var(--muted-foreground)', fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Sales (Credit)</p>
            <p style={{ color: 'var(--foreground)', fontSize: '22px', fontWeight: 800, marginTop: '8px' }}>{formatCurrency(totalAmount)}</p>
          </div>
          <div style={{ padding: '8px', background: '#eff6ff' }}>
            <ArrowUpRight className="w-6 h-6 text-blue-600" />
          </div>
        </div>

        <div style={cardStyle} className="p-5 flex justify-between items-center">
          <div>
            <p style={{ color: 'var(--muted-foreground)', fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Received (Debit)</p>
            <p style={{ color: '#16a34a', fontSize: '22px', fontWeight: 800, marginTop: '8px' }}>{formatCurrency(totalPaid)}</p>
          </div>
          <div style={{ padding: '8px', background: '#ecfdf5' }}>
            <ArrowDownLeft className="w-6 h-6 text-green-600" />
          </div>
        </div>

        <div style={cardStyle} className="p-5 flex justify-between items-center">
          <div>
            <p style={{ color: 'var(--muted-foreground)', fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Net Outstanding</p>
            <p style={{ color: '#dc2626', fontSize: '22px', fontWeight: 800, marginTop: '8px' }}>{formatCurrency(totalDue)}</p>
          </div>
          <div style={{ padding: '8px', background: '#fef2f2' }}>
            <BookOpen className="w-6 h-6 text-red-600" />
          </div>
        </div>
      </div>

      {/* Filter and search controls */}
      <div style={cardStyle} className="p-5 mb-6 space-y-4">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search bar */}
          <div className="flex-1 relative flex items-center">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 pointer-events-none" />
            <input
              type="text"
              placeholder="Search party, item, size, rate, notes..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full text-sm outline-none transition-all focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20"
              style={{ 
                borderRadius: '12px',
                paddingLeft: '2.75rem',
                paddingRight: '1rem',
                paddingTop: '0.75rem',
                paddingBottom: '0.75rem',
                background: 'var(--background)',
                border: '1px solid var(--border)',
                color: 'var(--foreground)'
              }}
            />
          </div>

          {/* Party dropdown */}
          <div className="w-full md:w-64 relative flex items-center">
            <Filter className="w-4 h-4 text-slate-400 absolute left-3.5 pointer-events-none" />
            <select
              value={partyFilter}
              onChange={e => setPartyFilter(e.target.value)}
              className="w-full text-sm outline-none appearance-none cursor-pointer"
              style={{ 
                borderRadius: '12px',
                paddingLeft: '2.75rem',
                paddingRight: '2.5rem',
                paddingTop: '0.75rem',
                paddingBottom: '0.75rem',
                background: 'var(--background)',
                border: '1px solid var(--border)',
                color: 'var(--foreground)'
              }}
            >
              <option value="all">All Parties</option>
              {parties.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
            <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-[var(--border)]">
          <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--muted-foreground)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Filters:</span>

          {/* Type Dropdown */}
          <div className="relative flex items-center min-w-[140px] max-w-full">
            <select
              value={typeFilter}
              onChange={e => setTypeFilter(e.target.value)}
              className="w-full text-xs font-semibold outline-none appearance-none cursor-pointer"
              style={{ 
                borderRadius: '8px', 
                paddingLeft: '0.75rem',
                paddingRight: '2rem',
                paddingTop: '0.5rem',
                paddingBottom: '0.5rem',
                background: 'var(--background)',
                border: '1px solid var(--border)',
                color: 'var(--foreground)'
              }}
            >
              <option value="all">All Transactions</option>
              <option value="credit">Sales Only</option>
              <option value="debit">Payments Only</option>
            </select>
            <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>

          {/* Date Range Dropdown */}
          <div className="relative flex items-center min-w-[130px] max-w-full">
            <select
              value={dateRange}
              onChange={e => setDateRange(e.target.value)}
              className="w-full text-xs font-semibold outline-none appearance-none cursor-pointer"
              style={{ 
                borderRadius: '8px', 
                paddingLeft: '0.75rem',
                paddingRight: '2rem',
                paddingTop: '0.5rem',
                paddingBottom: '0.5rem',
                background: 'var(--background)',
                border: '1px solid var(--border)',
                color: 'var(--foreground)'
              }}
            >
              <option value="all">All Time</option>
              <option value="today">Today</option>
              <option value="this_month">This Month</option>
              <option value="last_30_days">Last 30 Days</option>
            </select>
            <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>

          <span className="ml-auto text-xs text-[var(--muted-foreground)] font-semibold">
            {filteredRows.length} txns
          </span>
        </div>
      </div>

      {/* Main transactions table */}
      <div style={cardStyle} className="overflow-x-auto">
        {loading ? (
          <div className="p-12 text-center text-sm text-slate-500">Loading ledger entries...</div>
        ) : filteredRows.length === 0 ? (
          <div className="p-12 text-center text-sm text-slate-500">No transactions match the selected filters.</div>
        ) : (
          <table className="w-full text-left border-collapse" style={{ minWidth: '900px' }}>
            <thead>
              <tr style={{ background: '#0B1A30', color: '#ffffff' }}>
                <th className="p-3 text-xs font-bold uppercase tracking-wider" style={{ borderRight: '1px solid rgba(255,255,255,0.1)' }}>Date</th>
                <th className="p-3 text-xs font-bold uppercase tracking-wider text-center" style={{ borderRight: '1px solid rgba(255,255,255,0.1)' }}>Type</th>
                <th className="p-3 text-xs font-bold uppercase tracking-wider" style={{ borderRight: '1px solid rgba(255,255,255,0.1)' }}>Party</th>
                <th className="p-3 text-xs font-bold uppercase tracking-wider" style={{ borderRight: '1px solid rgba(255,255,255,0.1)' }}>Item/Description</th>
                <th className="p-3 text-xs font-bold uppercase tracking-wider text-right" style={{ borderRight: '1px solid rgba(255,255,255,0.1)' }}>Credit (Sale ₹)</th>
                <th className="p-3 text-xs font-bold uppercase tracking-wider text-right" style={{ borderRight: '1px solid rgba(255,255,255,0.1)' }}>Debit (Paid ₹)</th>
                <th className="p-3 text-xs font-bold uppercase tracking-wider text-right" style={{ borderRight: '1px solid rgba(255,255,255,0.1)' }}>Balance Due ₹</th>
                <th className="p-3 text-xs font-bold uppercase tracking-wider" style={{ borderRight: '1px solid rgba(255,255,255,0.1)' }}>Mode</th>
                <th className="p-3 text-xs font-bold uppercase tracking-wider" style={{ borderRight: '1px solid rgba(255,255,255,0.1)' }}>Notes</th>
                <th className="p-3 text-xs font-bold uppercase tracking-wider text-center">Go To</th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.map((row) => {
                const isPayment = (row.paid || 0) > 0 && !(row.amount || 0);
                const isSale = (row.amount || 0) > 0 && !(row.paid || 0);
                const isBoth = (row.amount || 0) > 0 && (row.paid || 0) > 0;
                const dueAmount = (row.amount || 0) - (row.paid || 0);

                // Determine entry type label
                const entryType = isBoth ? 'SALE + PAY' : isPayment ? 'PAYMENT' : 'SALE';
                const typeBg = isBoth ? '#eff6ff' : isPayment ? '#ecfdf5' : '#f0f9ff';
                const typeColor = isBoth ? '#1d4ed8' : isPayment ? '#166534' : '#075985';
                const typeBorder = isBoth ? '#93c5fd' : isPayment ? '#86efac' : '#7dd3fc';

                return (
                  <tr key={row.id} className="border-b border-[var(--border)] hover:bg-slate-50 transition-colors">
                    <td className="p-3 text-xs font-semibold text-slate-700 whitespace-nowrap" style={{ borderRight: '1px solid var(--border)' }}>
                      {dayjs(row.date).format('DD MMM YYYY')}
                    </td>
                    {/* TYPE BADGE */}
                    <td className="p-3 text-center" style={{ borderRight: '1px solid var(--border)' }}>
                      <span style={{
                        display: 'inline-block',
                        padding: '3px 8px',
                        fontSize: '9px',
                        fontWeight: 800,
                        textTransform: 'uppercase',
                        letterSpacing: '0.08em',
                        background: typeBg,
                        color: typeColor,
                        border: `1px solid ${typeBorder}`,
                        borderRadius: '6px',
                        whiteSpace: 'nowrap',
                      }}>
                        {entryType}
                      </span>
                    </td>
                    <td className="p-3 text-xs font-bold text-slate-900" style={{ borderRight: '1px solid var(--border)' }}>
                      <button
                        onClick={() => navigate(`/parties/${row.partyId}`)}
                        className="hover:text-blue-600 transition-colors text-left"
                      >
                        {row.partyName}
                      </button>
                    </td>
                    <td className="p-3 text-xs text-slate-900 font-medium" style={{ borderRight: '1px solid var(--border)' }}>
                      {row.itemName || <span className="text-slate-400 italic">—</span>}
                      {row.size && <span className="ml-1.5 text-slate-500 font-normal">({row.size})</span>}
                      {row.quantity && <span className="ml-1.5 text-slate-500 font-normal">Qty: {row.quantity}</span>}
                    </td>
                    <td className="p-3 text-xs font-bold text-right text-slate-900" style={{ borderRight: '1px solid var(--border)' }}>
                      {(row.amount || 0) > 0 ? formatCurrency(row.amount || 0) : <span className="text-slate-300">—</span>}
                    </td>
                    <td className="p-3 text-xs font-bold text-right text-green-600" style={{ borderRight: '1px solid var(--border)' }}>
                      {(row.paid || 0) > 0 ? formatCurrency(row.paid || 0) : <span className="text-slate-300">—</span>}
                    </td>
                    <td className={`p-3 text-xs font-bold text-right ${dueAmount > 0 ? 'text-red-600' : 'text-slate-400'}`} style={{ borderRight: '1px solid var(--border)' }}>
                      {isPayment ? <span className="text-slate-300">—</span> : dueAmount === 0 ? <span className="text-slate-400">Settled</span> : formatCurrency(dueAmount)}
                    </td>
                    <td className="p-3 text-xs" style={{ borderRight: '1px solid var(--border)' }}>
                      {row.paymentMode ? (
                        <span className="px-2 py-0.5 bg-slate-100 text-slate-700 text-[10px] font-bold uppercase border border-slate-200" style={{ borderRadius: '6px' }}>
                          {row.paymentMode}
                        </span>
                      ) : <span className="text-slate-300">—</span>}
                    </td>
                    <td className="p-3 text-xs text-slate-500 max-w-[160px] truncate" title={row.notes} style={{ borderRight: '1px solid var(--border)' }}>
                      {row.notes || <span className="text-slate-300">—</span>}
                    </td>
                    <td className="p-3 text-center">
                      <button
                        onClick={() => navigate(`/parties/${row.partyId}`)}
                        className="p-1 text-blue-600 hover:bg-blue-50 transition-colors inline-flex items-center justify-center"
                        title="Open Party Ledger"
                        style={{ borderRadius: '8px', border: '1px solid #dbeafe' }}
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

    </div>
  );
}
