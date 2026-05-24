import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { subscribeToParties } from '@/services/partyService';
import { getAllLedgersForUser } from '@/services/ledgerService';
import { formatCurrency } from '@/lib/utils';
import type { Party, Ledger, LedgerRow } from '@/types';
import { CreditCard, Search, Calendar, Filter, ExternalLink, ArrowDownLeft } from 'lucide-react';
import dayjs from 'dayjs';

interface UnifiedPaymentRow extends LedgerRow {
  partyName: string;
  partyId: string;
}

export default function PaymentsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [parties, setParties] = useState<Party[]>([]);
  const [ledgers, setLedgers] = useState<Ledger[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [modeFilter, setModeFilter] = useState('all'); // all, Cash, UPI, Bank Transfer, Cheque, etc.
  const [dateRange, setDateRange] = useState('all');

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

  // Flatten and filter for ONLY payment entries (paid > 0)
  const allPayments: UnifiedPaymentRow[] = ledgers.flatMap(ledger => {
    const party = parties.find(p => p.id === ledger.partyId);
    return ledger.rows
      .filter(row => (row.paid || 0) > 0)
      .map(row => ({
        ...row,
        partyName: party?.name || 'Unknown Party',
        partyId: ledger.partyId
      }));
  }).sort((a, b) => dayjs(b.date || '').diff(dayjs(a.date || '')));

  // Filter logic
  const filteredPayments = allPayments.filter(row => {
    const searchMatch = 
      row.partyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (row.notes || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      row.paymentMode.toLowerCase().includes(searchTerm.toLowerCase());

    const modeMatch = modeFilter === 'all' || row.paymentMode === modeFilter;

    let dateMatch = true;
    if (dateRange === 'today') {
      dateMatch = row.date === dayjs().format('YYYY-MM-DD');
    } else if (dateRange === 'this_month') {
      dateMatch = dayjs(row.date).month() === dayjs().month() && dayjs(row.date).year() === dayjs().year();
    } else if (dateRange === 'last_30_days') {
      dateMatch = dayjs().diff(dayjs(row.date), 'day') <= 30;
    }

    return searchMatch && modeMatch && dateMatch;
  });

  // Calculate statistics
  const totalCollected = filteredPayments.reduce((sum, r) => sum + (r.paid || 0), 0);
  const todayCollected = allPayments
    .filter(r => r.date === dayjs().format('YYYY-MM-DD'))
    .reduce((sum, r) => sum + (r.paid || 0), 0);
  const thisMonthCollected = allPayments
    .filter(r => dayjs(r.date).month() === dayjs().month() && dayjs(r.date).year() === dayjs().year())
    .reduce((sum, r) => sum + (r.paid || 0), 0);

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
          <CreditCard className="w-6 h-6 text-green-600" /> Payments Received
        </h1>
        <p style={{ color: 'var(--muted-foreground)', fontSize: '13px', marginTop: '4px' }}>
          Track and verify all customer collections and cash/bank deposits.
        </p>
      </div>

      {/* Summary KPI Panel */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        <div style={cardStyle} className="p-5 flex justify-between items-center">
          <div>
            <p style={{ color: 'var(--muted-foreground)', fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Today's Collection</p>
            <p style={{ color: '#16a34a', fontSize: '22px', fontWeight: 800, marginTop: '8px' }}>{formatCurrency(todayCollected)}</p>
          </div>
          <div style={{ padding: '8px', background: '#ecfdf5' }}>
            <Calendar className="w-6 h-6 text-green-600" />
          </div>
        </div>

        <div style={cardStyle} className="p-5 flex justify-between items-center">
          <div>
            <p style={{ color: 'var(--muted-foreground)', fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>This Month Collection</p>
            <p style={{ color: '#16a34a', fontSize: '22px', fontWeight: 800, marginTop: '8px' }}>{formatCurrency(thisMonthCollected)}</p>
          </div>
          <div style={{ padding: '8px', background: '#ecfdf5' }}>
            <ArrowDownLeft className="w-6 h-6 text-green-600" />
          </div>
        </div>

        <div style={cardStyle} className="p-5 flex justify-between items-center">
          <div>
            <p style={{ color: 'var(--muted-foreground)', fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Filtered Total</p>
            <p style={{ color: 'var(--foreground)', fontSize: '22px', fontWeight: 800, marginTop: '8px' }}>{formatCurrency(totalCollected)}</p>
          </div>
          <div style={{ padding: '8px', background: '#f8fafc' }}>
            <CreditCard className="w-6 h-6 text-slate-600" />
          </div>
        </div>
      </div>

      {/* Filter panel */}
      <div style={cardStyle} className="p-5 mb-6 space-y-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative flex items-center">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" />
            <input
              type="text"
              placeholder="Search by party name, notes, mode..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full bg-[var(--background)] border border-[var(--border)] px-10 py-2.5 text-sm outline-none"
              style={{ borderRadius: 0 }}
            />
          </div>

          <div className="w-full md:w-64 relative flex items-center">
            <Filter className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" />
            <select
              value={modeFilter}
              onChange={e => setModeFilter(e.target.value)}
              className="w-full bg-[var(--background)] border border-[var(--border)] pl-10 pr-4 py-2.5 text-sm outline-none appearance-none"
              style={{ borderRadius: 0 }}
            >
              <option value="all">All Payment Modes</option>
              <option value="Cash">Cash</option>
              <option value="UPI">UPI</option>
              <option value="Bank Transfer">Bank Transfer</option>
              <option value="Cheque">Cheque</option>
              <option value="Other">Other</option>
            </select>
          </div>
        </div>

        <div className="flex flex-wrap gap-4 pt-2 border-t border-[var(--border)] items-center">
          <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--muted-foreground)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Timeframe:</span>
          
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
            Showing {filteredPayments.length} payment entries
          </span>
        </div>
      </div>

      {/* Payments Table */}
      <div style={cardStyle} className="overflow-x-auto">
        {loading ? (
          <div className="p-12 text-center text-sm text-slate-500">Loading payments...</div>
        ) : filteredPayments.length === 0 ? (
          <div className="p-12 text-center text-sm text-slate-500">No payment records found matching the filters.</div>
        ) : (
          <table className="w-full text-left border-collapse" style={{ minWidth: '700px' }}>
            <thead>
              <tr style={{ background: '#0B1A30', color: '#ffffff' }}>
                <th className="p-3 text-xs font-bold uppercase tracking-wider">Date</th>
                <th className="p-3 text-xs font-bold uppercase tracking-wider">Party Name</th>
                <th className="p-3 text-xs font-bold uppercase tracking-wider text-right">Amount Received</th>
                <th className="p-3 text-xs font-bold uppercase tracking-wider">Payment Mode</th>
                <th className="p-3 text-xs font-bold uppercase tracking-wider">Notes/Remarks</th>
                <th className="p-3 text-xs font-bold uppercase tracking-wider text-center">Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredPayments.map((row) => (
                <tr key={row.id} className="border-b border-[var(--border)] hover:bg-slate-50 transition-colors">
                  <td className="p-3 text-xs font-semibold text-slate-700 whitespace-nowrap">
                    {dayjs(row.date).format('DD MMM YYYY')}
                  </td>
                  <td className="p-3 text-xs font-bold text-slate-900">
                    <button
                      onClick={() => navigate(`/parties/${row.partyId}`)}
                      className="hover:text-blue-600 transition-colors text-left"
                    >
                      {row.partyName}
                    </button>
                  </td>
                  <td className="p-3 text-xs font-black text-right text-green-600">
                    {formatCurrency(row.paid || 0)}
                  </td>
                  <td className="p-3 text-xs">
                    <span className="px-2.5 py-0.5 bg-green-50 text-green-700 text-[10px] font-bold uppercase border border-green-200">
                      {row.paymentMode || 'CASH'}
                    </span>
                  </td>
                  <td className="p-3 text-xs text-slate-500">
                    {row.notes || '-'}
                  </td>
                  <td className="p-3 text-center">
                    <button
                      onClick={() => navigate(`/parties/${row.partyId}`)}
                      className="p-1 text-blue-600 hover:bg-blue-50 transition-colors inline-flex items-center justify-center"
                      title="Go to Party Ledger"
                      style={{ borderRadius: 0, border: '1px solid #dbeafe' }}
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

    </div>
  );
}
