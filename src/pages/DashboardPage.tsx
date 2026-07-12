import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { usePartyStore } from '@/store/partyStore';
import { subscribeToParties } from '@/services/partyService';
import { getAllLedgersForUser, deleteRows, updateRow } from '@/services/ledgerService';
import { exportDueSummaryPDF } from '@/services/exportService';
import { formatCurrency } from '@/lib/utils';
import type { Party, Ledger, LedgerRow } from '@/types';
import {
  Users, IndianRupee, TrendingUp, Plus, ArrowRight, CreditCard, FileText, Clock, ChevronDown, Wallet, User, MoreVertical, Trash2, Edit, Check, X, ShieldAlert, ArrowDownRight, ArrowUpRight
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  PieChart, Pie, Cell
} from 'recharts';
import dayjs from 'dayjs';
import { toast } from 'sonner';

// Type for a flattened transaction for the dashboard view
type DashboardTransaction = LedgerRow & {
  partyId: string;
  partyName: string;
  ledger: Ledger;
};

export default function DashboardPage() {
  const { user, activeWorkspaceId } = useAuth();
  const { parties, setParties, setLoading } = usePartyStore();
  const [ledgers, setLedgers] = useState<Ledger[]>([]);
  const navigate = useNavigate();

  const [txToDelete, setTxToDelete] = useState<DashboardTransaction | null>(null);
  const [txToEdit, setTxToEdit] = useState<DashboardTransaction | null>(null);
  const [editForm, setEditForm] = useState({ amount: '', paid: '', paymentMode: '', notes: '' });
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    const unsub = subscribeToParties(
      activeWorkspaceId || user.uid,
      (data) => { setParties(data); setLoading(false); },
      (err) => { console.error(err); setLoading(false); }
    );

    // Fetch ledgers for analytics and recent transactions
    const fetchLedgers = async () => {
      const data = await getAllLedgersForUser(activeWorkspaceId || user.uid);
      setLedgers(data);
    };
    fetchLedgers();

    // Set up an interval to refresh ledgers occasionally if needed, or rely on parties changing as a trigger
    // Since this is just a dashboard view, we fetch once. If they edit here, we will update local state.

    return () => unsub();
  }, [user, setParties, setLoading]);

  // Derived Values
  const displayName = user?.displayName || user?.email?.split('@')[0] || 'User';
  const totalParties = parties.length;
  const totalDue = parties.reduce((s, p) => s + p.totalDue, 0);
  const totalPaid = parties.reduce((s, p) => s + p.totalPaid, 0);

  // Calculate Overdue Parties
  const overdueParties = parties.filter(p => {
    if (p.totalDue <= 0) return false;
    if (!p.lastPaymentDate) return true;
    return dayjs().diff(dayjs(p.lastPaymentDate), 'day') > 30;
  });

  // Aggregate all transactions
  const allTransactions = useMemo(() => {
    const txs: DashboardTransaction[] = [];
    ledgers.forEach(ledger => {
      const party = parties.find(p => p.id === ledger.partyId);
      if (!party) return;

      ledger.rows.forEach(row => {
        txs.push({
          ...row,
          partyId: party.id,
          partyName: party.name,
          ledger,
        });
      });
    });
    // Sort transactions by createdAt descending (most recent first)
    return txs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [ledgers, parties]);

  // Compute metrics from allTransactions on every render
  let receivedToday = 0;
  let receivedYesterday = 0;
  let thisMonthCollection = 0;
  let lastMonthCollection = 0;

  const todayStr = dayjs().format('YYYY-MM-DD');
  const yesterdayStr = dayjs().subtract(1, 'day').format('YYYY-MM-DD');
  const thisMonth = dayjs().month();
  const thisYear = dayjs().year();
  const lastMonth = dayjs().subtract(1, 'month').month();
  const lastMonthYear = dayjs().subtract(1, 'month').year();

  const monthlyDataMap = new Map();
  for (let i = 5; i >= 0; i--) {
    const d = dayjs().subtract(i, 'month');
    monthlyDataMap.set(d.format('YYYY-MM'), { name: d.format('MMM'), collection: 0, expenses: 0 });
  }

  allTransactions.forEach(row => {
    if (!row.date) return;
    const rowDate = dayjs(row.date);
    const rowMonth = rowDate.month();
    const rowYear = rowDate.year();
    const monthKey = rowDate.format('YYYY-MM');
    const paid = row.paid || 0;
    const amount = row.amount || 0;

    if (row.date === todayStr) receivedToday += paid;
    if (row.date === yesterdayStr) receivedYesterday += paid;
    if (rowMonth === thisMonth && rowYear === thisYear) thisMonthCollection += paid;
    if (rowMonth === lastMonth && rowYear === lastMonthYear) lastMonthCollection += paid;

    if (monthlyDataMap.has(monthKey)) {
      const data = monthlyDataMap.get(monthKey);
      data.collection += paid;
      data.expenses += amount;
    }
  });

  const monthlyData = Array.from(monthlyDataMap.values());
  const partiesThisMonth = parties.filter(p => dayjs(p.createdAt).month() === thisMonth && dayjs(p.createdAt).year() === thisYear).length;

  const formatTrend = (current: number, previous: number) => {
    if (previous === 0) return current > 0 ? `↑ 100% from previous` : '';
    const diff = current - previous;
    const pct = (diff / previous) * 100;
    if (pct > 0) return `↑ ${pct.toFixed(1)}% from previous`;
    if (pct < 0) return `↓ ${Math.abs(pct).toFixed(1)}% from previous`;
    return '';
  };
  const getTrendColor = (str: string) => str.startsWith('↑') ? 'text-emerald-500' : (str.startsWith('↓') ? 'text-rose-500' : 'text-slate-500');

  const receivedTodayTrend = formatTrend(receivedToday, receivedYesterday);
  const thisMonthTrend = formatTrend(thisMonthCollection, lastMonthCollection);

  const kpis = [
    { label: 'Total Parties', value: totalParties, icon: Users, color: '#3b82f6', bg: 'linear-gradient(135deg, #eff6ff, #dbeafe)', trend: partiesThisMonth > 0 ? `↑ ${partiesThisMonth} this month` : '', trendColor: 'text-blue-600' },
    { label: 'Outstanding Due', value: formatCurrency(totalDue), icon: IndianRupee, color: '#ef4444', bg: 'linear-gradient(135deg, #fef2f2, #fee2e2)', trend: '', trendColor: 'text-slate-500' },
    { label: 'Received Today', value: formatCurrency(receivedToday), icon: Wallet, color: '#10b981', bg: 'linear-gradient(135deg, #ecfdf5, #d1fae5)', trend: receivedTodayTrend, trendColor: getTrendColor(receivedTodayTrend) },
    { label: 'This Month Collection', value: formatCurrency(thisMonthCollection), icon: TrendingUp, color: '#f59e0b', bg: 'linear-gradient(135deg, #fffbeb, #fef3c7)', trend: thisMonthTrend, trendColor: getTrendColor(thisMonthTrend) },
  ];

  const pieData = [
    { name: 'Paid', value: totalPaid || 1 },
    { name: 'Due', value: totalDue || 1 },
  ];
  const PIE_COLORS = ['#10b981', '#ef4444'];
  const grandTotal = totalPaid + totalDue;
  const paidPercent = grandTotal ? ((totalPaid / grandTotal) * 100).toFixed(1) : 0;
  const duePercent = grandTotal ? ((totalDue / grandTotal) * 100).toFixed(1) : 0;

  // --- Handlers for Actions ---
  const handleDeleteTx = async () => {
    if (!txToDelete || !user) return;
    setIsProcessing(true);
    try {
      await deleteRows(txToDelete.ledger, [txToDelete.id], activeWorkspaceId || user.uid, user.email || '');
      toast.success('Transaction deleted successfully');
      // Refresh local ledgers state
      setLedgers(ledgers.map(l => {
        if (l.partyId === txToDelete.partyId) {
          return { ...l, rows: l.rows.filter(r => r.id !== txToDelete.id) };
        }
        return l;
      }));
    } catch (error) {
      toast.error('Failed to delete transaction');
    }
    setTxToDelete(null);
    setIsProcessing(false);
  };

  const handleEditTxSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!txToEdit || !user) return;
    setIsProcessing(true);
    try {
      const updates = {
        amount: editForm.amount ? parseFloat(editForm.amount) : null,
        paid: editForm.paid ? parseFloat(editForm.paid) : null,
        paymentMode: editForm.paymentMode,
        notes: editForm.notes,
      };
      await updateRow(txToEdit.ledger, txToEdit.id, updates, activeWorkspaceId || user.uid, user.email || '');
      toast.success('Transaction updated successfully');

      // Refresh local state
      setLedgers(ledgers.map(l => {
        if (l.partyId === txToEdit.partyId) {
          return {
            ...l,
            rows: l.rows.map(r => r.id === txToEdit.id ? { ...r, ...updates, due: (updates.amount || 0) - (updates.paid || 0) } : r)
          };
        }
        return l;
      }));
    } catch (error) {
      toast.error('Failed to update transaction');
    }
    setTxToEdit(null);
    setIsProcessing(false);
  };

  const openEditModal = (tx: DashboardTransaction) => {
    setEditForm({
      amount: tx.amount ? tx.amount.toString() : '',
      paid: tx.paid ? tx.paid.toString() : '',
      paymentMode: tx.paymentMode || '',
      notes: tx.notes || ''
    });
    setTxToEdit(tx);
  };

  const [menuOpen, setMenuOpen] = useState<string | null>(null);

  // Close menu when clicking outside
  useEffect(() => {
    const close = () => setMenuOpen(null);
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, []);

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-[1600px] mx-auto space-y-6 sm:space-y-8 bg-[#f8fafc] min-h-full overflow-x-hidden w-full">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-[28px] font-bold text-slate-900 tracking-tight flex items-center gap-2 capitalize">
            Welcome back, {displayName} <span className="animate-wave inline-block origin-bottom-right">👋</span>
          </h1>
          <p className="text-[14px] sm:text-[15px] text-slate-500 mt-1">
            Here's what's happening with your business today.
          </p>
        </div>
        <button onClick={() => navigate('/parties?add=true')}
          className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-all shadow-sm shadow-blue-900/20 hover:shadow-md hover:bg-[#0f2342] active:scale-[0.98] shrink-0"
          style={{ background: '#0B1A30' }}>
          <Plus className="w-4 h-4" /> Add Party
        </button>
      </div>

      {/* ── KPI Cards (Horizontal Scroll on Mobile) ── */}
      <div className="flex sm:grid sm:grid-cols-2 lg:grid-cols-4 gap-4 overflow-x-auto snap-x snap-mandatory pb-2 sm:pb-0 hide-scrollbar" style={{ margin: '0 -16px', padding: '0 16px' }}>
        {kpis.map((kpi) => (
          <div key={kpi.label}
            className="snap-center shrink-0 w-[260px] sm:w-auto bg-white rounded-2xl p-5 border border-slate-100 shadow-[0_2px_10px_rgba(0,0,0,0.02)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.06)] transition-all duration-300 relative overflow-hidden group">

            {/* Subtle Gradient Glow in background */}
            <div className="absolute top-0 right-0 w-32 h-32 rounded-full blur-3xl opacity-20 group-hover:opacity-40 transition-opacity" style={{ background: kpi.color, transform: 'translate(30%, -30%)' }}></div>

            <div className="w-11 h-11 rounded-xl flex items-center justify-center mb-4 relative z-10"
              style={{ background: kpi.bg }}>
              <kpi.icon className="w-5 h-5" style={{ color: kpi.color }} />
            </div>
            <p className="text-[26px] sm:text-[28px] font-bold text-slate-900 tracking-tight leading-none mb-2 relative z-10">
              {kpi.value}
            </p>
            <p className="text-[13px] text-slate-500 font-medium mb-3 relative z-10">{kpi.label}</p>

            {kpi.trend && (
              <p className={`text-[12px] font-semibold ${kpi.trendColor} relative z-10`}>
                {kpi.trend}
              </p>
            )}
          </div>
        ))}
      </div>

      {/* ── Charts Row ── */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Monthly Collection Overview */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-5 sm:p-6 border border-slate-100 shadow-[0_2px_10px_rgba(0,0,0,0.02)]">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-[15px] sm:text-base font-bold text-slate-900">Monthly Revenue Overview</h3>
            <button className="flex items-center gap-1 text-[13px] sm:text-sm text-slate-500 font-semibold px-3 py-1.5 rounded-lg hover:bg-slate-50 transition-colors">
              This Year <ChevronDown className="w-4 h-4" />
            </button>
          </div>

          {/* Summary stats row — instant understanding */}
          <div className="grid grid-cols-2 gap-3 mb-5">
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-100">
              <p className="text-[11px] font-semibold text-emerald-600 uppercase tracking-wider mb-1">Total Collection</p>
              <p className="text-[18px] sm:text-[20px] font-black text-emerald-700">{formatCurrency(monthlyData.reduce((s, d) => s + d.collection, 0))}</p>
            </div>
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-100">
              <p className="text-[11px] font-semibold text-rose-600 uppercase tracking-wider mb-1">Total Sales</p>
              <p className="text-[18px] sm:text-[20px] font-black text-rose-700">{formatCurrency(monthlyData.reduce((s, d) => s + d.expenses, 0))}</p>
            </div>
          </div>

          <div className="flex items-center gap-6 mb-4 px-2 sm:px-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-emerald-500"></div>
              <span className="text-[12px] sm:text-[13px] font-bold text-slate-700">Collection (Received)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-rose-500"></div>
              <span className="text-[12px] sm:text-[13px] font-bold text-slate-700">Sales (Billed)</span>
            </div>
          </div>

          <div className="h-[240px] sm:h-[280px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }} barSize={22} barGap={4}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#334155', fontWeight: 600 }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b', fontWeight: 500 }} tickFormatter={(val) => val >= 100000 ? `${(val / 100000).toFixed(1)}L` : val >= 1000 ? `${(val / 1000).toFixed(0)}K` : val} />
                <Tooltip
                  cursor={{ fill: 'rgba(99,102,241,0.05)' }}
                  contentStyle={{ backgroundColor: '#fff', borderRadius: '14px', border: '1px solid #e2e8f0', boxShadow: '0 10px 40px rgba(0,0,0,0.12)', padding: '12px 16px' }}
                  labelStyle={{ fontSize: '14px', fontWeight: 800, color: '#0f172a', marginBottom: '8px' }}
                  formatter={(value: any, name: any) => {
                    const label = name === 'Collection' ? 'Collection' : 'Sales';
                    return [formatCurrency(value as number), label];
                  }}
                  itemStyle={{ fontSize: '13px', fontWeight: 600, padding: '2px 0' }}
                />
                <Bar dataKey="collection" fill="#10b981" radius={[6, 6, 0, 0]} name="Collection" />
                <Bar dataKey="expenses" fill="#f43f5e" radius={[6, 6, 0, 0]} name="Sales" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Paid vs Due */}
        <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-100 shadow-[0_2px_10px_rgba(0,0,0,0.02)] flex flex-col relative overflow-hidden">
          <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-indigo-50 to-transparent rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl"></div>

          <h3 className="text-[15px] sm:text-base font-bold text-slate-900 mb-4 sm:mb-6 relative z-10">Balance Distribution</h3>

          <div className="flex-1 flex flex-col items-center justify-center relative min-h-[200px] sm:min-h-[220px] z-10">
            <ResponsiveContainer width="100%" height="100%" className="absolute inset-0">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%" cy="50%"
                  innerRadius={75}
                  outerRadius={95}
                  paddingAngle={5}
                  dataKey="value"
                  stroke="none"
                >
                  {pieData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={PIE_COLORS[index]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 8px 24px rgba(0,0,0,0.12)' }}
                  itemStyle={{ fontSize: '13px', fontWeight: 700 }}
                  formatter={(val: any) => formatCurrency(Number(val))}
                />
              </PieChart>
            </ResponsiveContainer>

            {/* Center Label */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-[11px] sm:text-xs font-semibold text-slate-400 uppercase tracking-wider">Total</span>
              <span className="text-lg sm:text-xl font-black text-slate-900">{formatCurrency(grandTotal)}</span>
            </div>
          </div>

          <div className="space-y-4 mt-6 z-10">
            <div className="flex items-start justify-between p-3 rounded-xl bg-emerald-50/50 border border-emerald-100/50">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center">
                  <ArrowDownRight className="w-4 h-4 text-emerald-600" />
                </div>
                <div>
                  <p className="text-[12px] font-semibold text-emerald-600/80">Received Amount</p>
                  <p className="text-[15px] font-bold text-emerald-950">{formatCurrency(totalPaid)}</p>
                </div>
              </div>
              <span className="text-[13px] font-bold text-emerald-600">{paidPercent}%</span>
            </div>

            <div className="flex items-start justify-between p-3 rounded-xl bg-rose-50/50 border border-rose-100/50">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-rose-100 flex items-center justify-center">
                  <ArrowUpRight className="w-4 h-4 text-rose-600" />
                </div>
                <div>
                  <p className="text-[12px] font-semibold text-rose-600/80">Pending Amount</p>
                  <p className="text-[15px] font-bold text-rose-950">{formatCurrency(totalDue)}</p>
                </div>
              </div>
              <span className="text-[13px] font-bold text-rose-600">{duePercent}%</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Bottom Section ── */}
      <div className="grid lg:grid-cols-3 gap-6">

        {/* ── Recent Transactions (Editable) ── */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-5 sm:p-6 border border-slate-100 shadow-[0_2px_10px_rgba(0,0,0,0.02)] flex flex-col">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="text-[15px] sm:text-base font-bold text-slate-900">Recent Transactions</h3>
              <p className="text-[12px] text-slate-500 mt-0.5">Edit or delete recent ledger entries</p>
            </div>
            <button onClick={() => navigate('/parties')} className="text-[13px] font-semibold text-indigo-600 hover:text-indigo-700 bg-indigo-50 px-3 py-1.5 rounded-lg transition-colors">View All</button>
          </div>

          {allTransactions.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center py-10">
              <FileText className="w-12 h-12 mx-auto mb-4 text-slate-200" />
              <p className="text-[14px] text-slate-500 font-medium">No recent transactions found.</p>
              <p className="text-[13px] text-slate-400 mt-1">Start by adding a transaction in a party's ledger.</p>
            </div>
          ) : (
            <div className="space-y-3 overflow-y-auto pr-2 custom-scrollbar flex-1 max-h-[400px]">
              {allTransactions.slice(0, 15).map((tx) => (
                <div key={tx.id} className="flex items-center justify-between p-3 sm:p-4 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-slate-50 transition-colors group">
                  <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0" onClick={() => navigate(`/parties/${tx.partyId}`)}>
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm ${tx.paid && tx.paid > 0 ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}`}>
                      {tx.paid && tx.paid > 0 ? <ArrowDownRight className="w-5 h-5" /> : <ArrowUpRight className="w-5 h-5" />}
                    </div>
                    <div className="flex-1 min-w-0 cursor-pointer">
                      <p className="text-[14px] font-bold text-slate-900 truncate group-hover:text-indigo-600 transition-colors">
                        {tx.partyName}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5 text-[12px] text-slate-500">
                        <span className="font-medium text-slate-700">{tx.date}</span>
                        {tx.itemName && (
                          <>
                            <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                            <span className="truncate max-w-[100px]">{tx.itemName}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 flex-shrink-0">
                    <div className="text-right">
                      <p className={`text-[14px] sm:text-[15px] font-bold ${tx.paid && tx.paid > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {tx.paid && tx.paid > 0 ? '+' : '-'}{formatCurrency((tx.paid || 0) > 0 ? (tx.paid || 0) : (tx.amount || 0))}
                      </p>
                      <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">{tx.paid && tx.paid > 0 ? 'Received' : 'Expense'}</p>
                    </div>

                    {/* Action Menu */}
                    <div className="relative" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={(e) => { e.stopPropagation(); setMenuOpen(menuOpen === tx.id ? null : tx.id); }}
                        className="p-1.5 sm:p-2 rounded-lg cursor-pointer transition-all hover:bg-white border border-transparent hover:border-slate-200 text-slate-400 hover:text-slate-600">
                        <MoreVertical className="w-4 h-4 sm:w-5 sm:h-5" />
                      </button>

                      {menuOpen === tx.id && (
                        <div className="absolute right-0 top-10 z-30 w-36 rounded-xl py-1 shadow-[0_8px_30px_rgba(0,0,0,0.12)] border border-slate-100 bg-white origin-top-right animate-in fade-in zoom-in-95 duration-100">
                          <button
                            onClick={(e) => { e.stopPropagation(); openEditModal(tx); setMenuOpen(null); }}
                            className="w-full text-left px-4 py-2.5 text-[13px] font-medium flex items-center gap-2 hover:bg-slate-50 text-slate-700 transition-colors">
                            <Edit className="w-4 h-4 text-slate-400" /> Edit Details
                          </button>
                          <div className="h-px bg-slate-100 my-0.5"></div>
                          <button
                            onClick={(e) => { e.stopPropagation(); setTxToDelete(tx); setMenuOpen(null); }}
                            className="w-full text-left px-4 py-2.5 text-[13px] font-medium flex items-center gap-2 hover:bg-rose-50 text-rose-600 transition-colors">
                            <Trash2 className="w-4 h-4 text-rose-500" /> Delete Entry
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

        {/* ── Quick Actions & Top Overdue ── */}
        <div className="flex flex-col gap-6">
          {/* Quick Actions */}
          <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-100 shadow-[0_2px_10px_rgba(0,0,0,0.02)]">
            <h3 className="text-[15px] sm:text-base font-bold text-slate-900 mb-4">Quick Actions</h3>
            <div className="space-y-2">
              {[
                { label: 'Add Party', sub: 'Create a new party', icon: Users, action: () => navigate('/parties?add=true'), bg: 'bg-blue-50', color: 'text-blue-600', border: 'border-blue-100/50' },
                { label: 'Record Payment', sub: 'Receive amount', icon: Wallet, action: () => navigate('/parties'), bg: 'bg-emerald-50', color: 'text-emerald-600', border: 'border-emerald-100/50' },
                { label: 'Export Reports', sub: 'Download PDF/Excel', icon: FileText, action: () => exportDueSummaryPDF(parties), bg: 'bg-purple-50', color: 'text-purple-600', border: 'border-purple-100/50' },
              ].map((item, idx) => (
                <button key={idx}
                  onClick={item.action}
                  className={`w-full flex items-center justify-between p-3 rounded-xl transition-all group text-left border ${item.border} hover:bg-slate-50 hover:border-slate-200`}>
                  <div className="flex items-center gap-3.5">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110 ${item.bg} ${item.color}`}>
                      <item.icon className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-[14px] font-bold text-slate-900">{item.label}</p>
                      <p className="text-[12px] font-medium text-slate-500">{item.sub}</p>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-slate-600 group-hover:translate-x-1 transition-all" />
                </button>
              ))}
            </div>
          </div>

          {/* Top Overdue */}
          <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-100 shadow-[0_2px_10px_rgba(0,0,0,0.02)] flex-1 flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[15px] sm:text-base font-bold text-slate-900">Highest Overdue</h3>
            </div>

            {overdueParties.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center py-6">
                <div className="w-12 h-12 rounded-full bg-emerald-50 flex items-center justify-center mb-3">
                  <Check className="w-6 h-6 text-emerald-500" />
                </div>
                <p className="text-[14px] text-slate-600 font-semibold">No overdue parties!</p>
                <p className="text-[12px] text-slate-400 mt-1">Everyone has paid on time.</p>
              </div>
            ) : (
              <div className="space-y-3 overflow-y-auto pr-2 custom-scrollbar flex-1 max-h-[220px]">
                {overdueParties.sort((a, b) => b.totalDue - a.totalDue).slice(0, 5).map((party) => (
                  <div key={party.id}
                    onClick={() => navigate(`/parties/${party.id}`)}
                    className="flex items-center gap-3 cursor-pointer group p-2 rounded-lg hover:bg-slate-50 transition-colors">
                    <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0 group-hover:bg-rose-50 transition-colors">
                      <User className="w-4 h-4 text-slate-500 group-hover:text-rose-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-bold text-slate-900 truncate">
                        {party.name}
                      </p>
                    </div>
                    <span className="text-[13px] font-bold text-rose-600 whitespace-nowrap bg-rose-50 px-2 py-1 rounded-md">
                      {formatCurrency(party.totalDue)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Edit Transaction Modal ── */}
      {txToEdit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(4px)' }}>
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-5 sm:p-6">
              <h2 className="text-lg font-bold text-slate-900 mb-1">Edit Transaction</h2>
              <p className="text-[13px] text-slate-500 mb-5">Updating record for <span className="font-semibold text-slate-700">{txToEdit.partyName}</span></p>

              <form onSubmit={handleEditTxSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[12px] font-semibold text-slate-600 block mb-1.5">Expense Amount (₹)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={editForm.amount}
                      onChange={(e) => setEditForm({ ...editForm, amount: e.target.value })}
                      placeholder="0.00"
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-[14px] font-semibold text-slate-900 focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all"
                    />
                  </div>
                  <div>
                    <label className="text-[12px] font-semibold text-slate-600 block mb-1.5">Received Amount (₹)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={editForm.paid}
                      onChange={(e) => setEditForm({ ...editForm, paid: e.target.value })}
                      placeholder="0.00"
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-[14px] font-semibold text-emerald-600 focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[12px] font-semibold text-slate-600 block mb-1.5">Payment Mode</label>
                  <select
                    value={editForm.paymentMode}
                    onChange={(e) => setEditForm({ ...editForm, paymentMode: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-[14px] font-medium text-slate-900 focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all"
                  >
                    <option value="">Select mode</option>
                    <option value="Cash">Cash</option>
                    <option value="UPI">UPI / GPay</option>
                    <option value="Bank Transfer">Bank Transfer / NEFT</option>
                    <option value="Cheque">Cheque</option>
                  </select>
                </div>

                <div>
                  <label className="text-[12px] font-semibold text-slate-600 block mb-1.5">Notes</label>
                  <input
                    type="text"
                    value={editForm.notes}
                    onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                    placeholder="Optional notes"
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-[14px] text-slate-900 focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all"
                  />
                </div>

                <div className="flex items-center gap-3 pt-4">
                  <button type="button" onClick={() => setTxToEdit(null)} className="flex-1 py-2.5 rounded-xl text-[14px] font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors">
                    Cancel
                  </button>
                  <button type="submit" disabled={isProcessing} className="flex-1 py-2.5 rounded-xl text-[14px] font-semibold text-white bg-indigo-600 hover:bg-indigo-700 transition-colors disabled:opacity-50">
                    {isProcessing ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete Confirmation Modal ── */}
      {txToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(4px)' }}>
          <div className="w-full max-w-[360px] bg-white rounded-2xl shadow-2xl p-6 text-center animate-in zoom-in-95 duration-200">
            <div className="w-14 h-14 rounded-full bg-rose-100 flex items-center justify-center mx-auto mb-4">
              <ShieldAlert className="w-7 h-7 text-rose-600" />
            </div>
            <h3 className="text-[18px] font-bold text-slate-900 mb-2">Delete Transaction?</h3>
            <p className="text-[14px] text-slate-500 leading-relaxed mb-6">
              Are you sure you want to delete this record for <span className="font-semibold text-slate-700">{txToDelete.partyName}</span>? This action cannot be undone and will recalculate the ledger due.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setTxToDelete(null)} disabled={isProcessing} className="flex-1 py-2.5 rounded-xl text-[14px] font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors">
                Cancel
              </button>
              <button onClick={handleDeleteTx} disabled={isProcessing} className="flex-1 py-2.5 rounded-xl text-[14px] font-semibold text-white bg-rose-600 hover:bg-rose-700 transition-colors disabled:opacity-50">
                {isProcessing ? 'Deleting...' : 'Yes, Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
