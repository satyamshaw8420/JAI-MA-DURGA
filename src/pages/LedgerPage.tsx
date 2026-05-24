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
  const { user } = useAuth();
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
      user.uid,
      (partiesData) => {
        setParties(partiesData);
        
        getAllLedgersForUser(user.uid).then(ledgersData => {
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
  }, [user]);

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
    borderRadius: 0,
  };

  return (
    <div className="p-4 md:p-6 lg:p-8 animate-fade-in" style={{ maxWidth: '1400px', margin: '0 auto' }}>
      
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
            <Search className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" />
            <input
              type="text"
              placeholder="Search party, item, size, rate, notes..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full bg-[var(--background)] border border-[var(--border)] px-10 py-2.5 text-sm outline-none"
              style={{ borderRadius: 0 }}
            />
          </div>

          {/* Party dropdown */}
          <div className="w-full md:w-64 relative flex items-center">
            <Filter className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" />
            <select
              value={partyFilter}
              onChange={e => setPartyFilter(e.target.value)}
              className="w-full bg-[var(--background)] border border-[var(--border)] pl-10 pr-4 py-2.5 text-sm outline-none appearance-none"
              style={{ borderRadius: 0 }}
            >
              <option value="all">All Parties</option>
              {parties.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex flex-wrap gap-4 pt-2 border-t border-[var(--border)] items-center">
          <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--muted-foreground)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Filters:</span>
          
          {/* Type Filter */}
          <div className="flex border border-[var(--border)]">
            {[
              { id: 'all', label: 'All Actions' },
              { id: 'credit', label: 'Sales Only' },
              { id: 'debit', label: 'Payments Only' }
            ].map(type => (
              <button
                key={type.id}
                onClick={() => setTypeFilter(type.id)}
                className="px-4 py-1.5 text-xs font-semibold"
                style={{
                  borderRadius: 0,
                  border: 'none',
                  background: typeFilter === type.id ? '#1e3a5f' : 'transparent',
                  color: typeFilter === type.id ? '#ffffff' : 'var(--muted-foreground)',
                  cursor: 'pointer'
                }}
              >
                {type.label}
              </button>
            ))}
          </div>

          {/* Date Filter */}
          <div className="flex border border-[var(--border)]">
            {[
              { id: 'all', label: 'All Time' },
              { id: 'today', label: 'Today' },
              { id: 'this_month', label: 'This Month' },
              { id: 'last_30_days', label: 'Last 30 Days' }
            ].map(range => (
              <button
                key={range.id}
                onClick={() => setDateRange(range.id)}
                className="px-4 py-1.5 text-xs font-semibold"
                style={{
                  borderRadius: 0,
                  border: 'none',
                  background: dateRange === range.id ? '#1e3a5f' : 'transparent',
                  color: dateRange === range.id ? '#ffffff' : 'var(--muted-foreground)',
                  cursor: 'pointer'
                }}
              >
                {range.label}
              </button>
            ))}
          </div>

          <span className="ml-auto text-xs text-slate-500 font-semibold">
            Showing {filteredRows.length} transactions
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
                <th className="p-3 text-xs font-bold uppercase tracking-wider">Date</th>
                <th className="p-3 text-xs font-bold uppercase tracking-wider text-center">Type</th>
                <th className="p-3 text-xs font-bold uppercase tracking-wider">Party</th>
                <th className="p-3 text-xs font-bold uppercase tracking-wider">Item/Description</th>
                <th className="p-3 text-xs font-bold uppercase tracking-wider text-right">Credit (Sale ₹)</th>
                <th className="p-3 text-xs font-bold uppercase tracking-wider text-right">Debit (Paid ₹)</th>
                <th className="p-3 text-xs font-bold uppercase tracking-wider text-right">Balance Due ₹</th>
                <th className="p-3 text-xs font-bold uppercase tracking-wider">Mode</th>
                <th className="p-3 text-xs font-bold uppercase tracking-wider">Notes</th>
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
                    <td className="p-3 text-xs font-semibold text-slate-700 whitespace-nowrap">
                      {dayjs(row.date).format('DD MMM YYYY')}
                    </td>
                    {/* TYPE BADGE */}
                    <td className="p-3 text-center">
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
                        whiteSpace: 'nowrap',
                      }}>
                        {entryType}
                      </span>
                    </td>
                    <td className="p-3 text-xs font-bold text-slate-900">
                      <button
                        onClick={() => navigate(`/parties/${row.partyId}`)}
                        className="hover:text-blue-600 transition-colors text-left"
                      >
                        {row.partyName}
                      </button>
                    </td>
                    <td className="p-3 text-xs text-slate-900 font-medium">
                      {row.itemName || <span className="text-slate-400 italic">—</span>}
                      {row.size && <span className="ml-1.5 text-slate-500 font-normal">({row.size})</span>}
                      {row.quantity && <span className="ml-1.5 text-slate-500 font-normal">Qty: {row.quantity}</span>}
                    </td>
                    <td className="p-3 text-xs font-bold text-right text-slate-900">
                      {(row.amount || 0) > 0 ? formatCurrency(row.amount || 0) : <span className="text-slate-300">—</span>}
                    </td>
                    <td className="p-3 text-xs font-bold text-right text-green-600">
                      {(row.paid || 0) > 0 ? formatCurrency(row.paid || 0) : <span className="text-slate-300">—</span>}
                    </td>
                    <td className={`p-3 text-xs font-bold text-right ${dueAmount > 0 ? 'text-red-600' : dueAmount < 0 ? 'text-green-600' : 'text-slate-400'}`}>
                      {dueAmount === 0 ? <span className="text-slate-400">Settled</span> : formatCurrency(Math.abs(dueAmount))}
                    </td>
                    <td className="p-3 text-xs">
                      {row.paymentMode ? (
                        <span className="px-2 py-0.5 bg-slate-100 text-slate-700 text-[10px] font-bold uppercase border border-slate-200">
                          {row.paymentMode}
                        </span>
                      ) : <span className="text-slate-300">—</span>}
                    </td>
                    <td className="p-3 text-xs text-slate-500 max-w-[160px] truncate" title={row.notes}>
                      {row.notes || <span className="text-slate-300">—</span>}
                    </td>
                    <td className="p-3 text-center">
                      <button
                        onClick={() => navigate(`/parties/${row.partyId}`)}
                        className="p-1 text-blue-600 hover:bg-blue-50 transition-colors inline-flex items-center justify-center"
                        title="Open Party Ledger"
                        style={{ borderRadius: 0, border: '1px solid #dbeafe' }}
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
