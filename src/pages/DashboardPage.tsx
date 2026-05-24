import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { usePartyStore } from '@/store/partyStore';
import { subscribeToParties } from '@/services/partyService';
import { subscribeToRecentActivity } from '@/services/auditService';
import { getAllLedgersForUser } from '@/services/ledgerService';
import { exportDueSummaryExcel, exportDueSummaryPDF } from '@/services/exportService';
import { formatCurrency, formatDateRelative } from '@/lib/utils';
import type { AuditLog, Party, Ledger } from '@/types';
import {
  Users, IndianRupee, TrendingUp, AlertTriangle, Plus, FileSpreadsheet,
  ArrowRight, Activity, CreditCard, FileText, Clock, ChevronDown, Wallet, User
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';
import dayjs from 'dayjs';

export default function DashboardPage() {
  const { user } = useAuth();
  const { parties, setParties, setLoading } = usePartyStore();
  const [recentActivity, setRecentActivity] = useState<AuditLog[]>([]);
  const [ledgers, setLedgers] = useState<Ledger[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    const unsub = subscribeToParties(
      user.uid,
      (data) => { setParties(data); setLoading(false); },
      (err) => { console.error(err); setLoading(false); }
    );
    const unsubActivity = subscribeToRecentActivity(user.uid, 10, setRecentActivity);

    // Fetch all ledgers to aggregate real dashboard stats
    getAllLedgersForUser(user.uid).then(data => setLedgers(data));

    return () => { unsub(); unsubActivity(); };
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

  // Calculate real metrics from ledgers
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

  // Monthly data array initialization
  const monthlyDataMap = new Map();
  for (let i = 5; i >= 0; i--) {
    const d = dayjs().subtract(i, 'month');
    monthlyDataMap.set(d.format('YYYY-MM'), { name: d.format('MMM'), collection: 0, expenses: 0 });
  }

  ledgers.forEach(ledger => {
    ledger.rows.forEach(row => {
      if (!row.date) return;
      const rowDate = dayjs(row.date);
      const rowMonth = rowDate.month();
      const rowYear = rowDate.year();
      const monthKey = rowDate.format('YYYY-MM');
      const paid = row.paid || 0;
      const amount = row.amount || 0;

      // Daily stats
      if (row.date === todayStr) receivedToday += paid;
      if (row.date === yesterdayStr) receivedYesterday += paid;

      // Monthly stats
      if (rowMonth === thisMonth && rowYear === thisYear) {
        thisMonthCollection += paid;
      }
      if (rowMonth === lastMonth && rowYear === lastMonthYear) {
        lastMonthCollection += paid;
      }

      // Chart stats
      if (monthlyDataMap.has(monthKey)) {
        const data = monthlyDataMap.get(monthKey);
        data.collection += paid;
        data.expenses += amount;
      }
    });
  });

  const monthlyData = Array.from(monthlyDataMap.values());

  // Trend Calculations
  const partiesThisMonth = parties.filter(p => dayjs(p.createdAt).month() === thisMonth && dayjs(p.createdAt).year() === thisYear).length;

  const formatTrend = (current: number, previous: number) => {
    if (previous === 0) return current > 0 ? `↑ 100% from previous` : '';
    const diff = current - previous;
    const pct = (diff / previous) * 100;
    if (pct > 0) return `↑ ${pct.toFixed(1)}% from previous`;
    if (pct < 0) return `↓ ${Math.abs(pct).toFixed(1)}% from previous`;
    return '';
  };

  const getTrendColor = (str: string) => str.startsWith('↑') ? 'text-green-600' : (str.startsWith('↓') ? 'text-red-500' : 'text-slate-500');

  const receivedTodayTrend = formatTrend(receivedToday, receivedYesterday);
  const thisMonthTrend = formatTrend(thisMonthCollection, lastMonthCollection);

  // KPI Array
  const kpis = [
    { label: 'Total Parties', value: totalParties, icon: Users, color: '#3b82f6', bg: '#eff6ff', trend: partiesThisMonth > 0 ? `↑ ${partiesThisMonth} this month` : '', trendColor: 'text-green-600' },
    { label: 'Outstanding Due', value: formatCurrency(totalDue), icon: IndianRupee, color: '#ef4444', bg: '#fef2f2', trend: '', trendColor: 'text-slate-500' },
    { label: 'Received Today', value: formatCurrency(receivedToday), icon: Wallet, color: '#10b981', bg: '#ecfdf5', trend: receivedTodayTrend, trendColor: getTrendColor(receivedTodayTrend) },
    { label: 'This Month Collection', value: formatCurrency(thisMonthCollection), icon: TrendingUp, color: '#f59e0b', bg: '#fffbeb', trend: thisMonthTrend, trendColor: getTrendColor(thisMonthTrend) },
    { label: 'Overdue Parties', value: overdueParties.length, icon: Clock, color: '#6366f1', bg: '#eef2ff', link: 'View all' },
  ];

  // Paid vs Due Pie Data
  const pieData = [
    { name: 'Paid Amount', value: totalPaid || 1 },
    { name: 'Due Amount', value: totalDue || 1 },
  ];
  const PIE_COLORS = ['#10b981', '#ef4444'];
  const grandTotal = totalPaid + totalDue;
  const paidPercent = grandTotal ? ((totalPaid / grandTotal) * 100).toFixed(1) : 0;
  const duePercent = grandTotal ? ((totalDue / grandTotal) * 100).toFixed(1) : 0;

  const actionLabel = (action: string) => {
    const labels: Record<string, string> = {
      PARTY_CREATED: 'New party added',
      PARTY_UPDATED: 'Party details updated',
      PARTY_DELETED: 'Party removed',
      ROW_ADDED: 'New entry added',
      ROW_EDITED: 'Entry modified',
      ROW_DELETED: 'Entry deleted',
      PAYMENT_RECORDED: 'Payment received',
    };
    return labels[action] || action;
  };

  const getActivityIcon = (action: string) => {
    if (action.includes('PAYMENT')) return <CreditCard className="w-4 h-4 text-green-600" />;
    if (action.includes('PARTY')) return <Users className="w-4 h-4 text-purple-600" />;
    return <FileText className="w-4 h-4 text-blue-600" />;
  };

  return (
    <div className="p-6 lg:p-8 max-w-[1600px] mx-auto space-y-8 bg-[#f8fafc] min-h-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-[28px] font-bold text-slate-900 tracking-tight flex items-center gap-2 capitalize">
            Welcome back, {displayName} <span className="animate-wave inline-block origin-bottom-right">👋</span>
          </h1>
          <p className="text-[15px] text-slate-500 mt-1">
            Here's what's happening with your business today.
          </p>
        </div>
        <button onClick={() => navigate('/parties?add=true')}
          className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-all shadow-sm shadow-blue-900/20 hover:shadow-md hover:bg-[#0f2342] active:scale-[0.98]"
          style={{ background: '#0B1A30' }}>
          <Plus className="w-4 h-4" /> Add Party
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {kpis.map((kpi) => (
          <div key={kpi.label}
            className="bg-white rounded-2xl p-5 border border-slate-100 shadow-[0_2px_10px_rgba(0,0,0,0.02)] hover:shadow-[0_4px_15px_rgba(0,0,0,0.05)] transition-shadow">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-4"
              style={{ background: kpi.bg }}>
              <kpi.icon className="w-5 h-5" style={{ color: kpi.color }} />
            </div>
            <p className="text-[28px] font-bold text-slate-900 tracking-tight leading-none mb-2">
              {kpi.value}
            </p>
            <p className="text-[13px] text-slate-500 font-medium mb-3">{kpi.label}</p>

            {kpi.trend && (
              <p className={`text-[12px] font-medium ${kpi.trendColor}`}>
                {kpi.trend}
              </p>
            )}
            {kpi.link && (
              <button className="text-[13px] font-semibold text-blue-600 hover:text-blue-700 transition-colors">
                {kpi.link}
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Monthly Collection Overview */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-6 border border-slate-100 shadow-[0_2px_10px_rgba(0,0,0,0.02)]">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-base font-bold text-slate-900">Monthly Collection Overview</h3>
            <button className="flex items-center gap-1 text-sm text-slate-500 font-medium px-3 py-1.5 rounded-lg hover:bg-slate-50 transition-colors">
              This Year <ChevronDown className="w-4 h-4" />
            </button>
          </div>

          <div className="flex items-center gap-6 mb-4 px-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-1 rounded-full bg-blue-600"></div>
              <span className="text-xs font-medium text-slate-600">Collection (₹)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-1 rounded-full bg-red-500"></div>
              <span className="text-xs font-medium text-slate-600">Expenses (₹)</span>
            </div>
          </div>

          <div className="h-[280px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthlyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorCollection" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563eb" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorExpenses" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} tickFormatter={(val) => val >= 1000 ? `${val / 1000}K` : val} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#fff', borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}
                  itemStyle={{ fontSize: '13px', fontWeight: 600 }}
                />
                <Area type="monotone" dataKey="collection" stroke="#2563eb" strokeWidth={3} fillOpacity={1} fill="url(#colorCollection)" activeDot={{ r: 6, strokeWidth: 0 }} />
                <Area type="monotone" dataKey="expenses" stroke="#ef4444" strokeWidth={3} fillOpacity={1} fill="url(#colorExpenses)" activeDot={{ r: 6, strokeWidth: 0 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Paid vs Due */}
        <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-[0_2px_10px_rgba(0,0,0,0.02)] flex flex-col">
          <h3 className="text-base font-bold text-slate-900 mb-6">Paid vs Due</h3>

          <div className="flex-1 flex flex-col items-center justify-center relative min-h-[220px]">
            <ResponsiveContainer width="100%" height="100%" className="absolute inset-0">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%" cy="50%"
                  innerRadius={70}
                  outerRadius={90}
                  paddingAngle={5}
                  dataKey="value"
                  stroke="none"
                >
                  {pieData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={PIE_COLORS[index]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 15px rgba(0,0,0,0.1)' }}
                  itemStyle={{ fontSize: '12px', fontWeight: 600 }}
                  formatter={(val: any) => formatCurrency(Number(val))}
                />
              </PieChart>
            </ResponsiveContainer>

            {/* Center Label */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-xs font-medium text-slate-500">Total</span>
              <span className="text-lg font-bold text-slate-900">{formatCurrency(grandTotal)}</span>
            </div>
          </div>

          <div className="space-y-4 mt-6">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full bg-[#10b981]" />
                <div>
                  <p className="text-[13px] font-medium text-slate-600">Paid Amount</p>
                  <p className="text-[14px] font-bold text-slate-900">{formatCurrency(totalPaid)} <span className="text-[11px] font-normal text-slate-500 ml-1">({paidPercent}%)</span></p>
                </div>
              </div>
            </div>
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full bg-[#ef4444]" />
                <div>
                  <p className="text-[13px] font-medium text-slate-600">Due Amount</p>
                  <p className="text-[14px] font-bold text-slate-900">{formatCurrency(totalDue)} <span className="text-[11px] font-normal text-slate-500 ml-1">({duePercent}%)</span></p>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-100 flex items-center gap-2 text-xs text-slate-400">
            <Clock className="w-3 h-3" />
            Last updated: Today, {dayjs().format('hh:mm A')}
          </div>
        </div>
      </div>

      {/* Bottom Section */}
      <div className="grid lg:grid-cols-3 gap-6">

        {/* Quick Actions */}
        <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-[0_2px_10px_rgba(0,0,0,0.02)]">
          <h3 className="text-base font-bold text-slate-900 mb-5">Quick Actions</h3>
          <div className="space-y-3">
            {[
              { label: 'Add Party', sub: 'Create a new party', icon: Users, action: () => navigate('/parties?add=true'), bg: '#eff6ff', color: '#3b82f6' },
              { label: 'Add Payment', sub: 'Record a payment', icon: IndianRupee, action: () => navigate('/parties'), bg: '#ecfdf5', color: '#10b981' },
              { label: 'View All Parties', sub: 'Manage your parties', icon: User, action: () => navigate('/parties'), bg: '#fff7ed', color: '#f97316' },
              { label: 'Export Reports', sub: 'Export to PDF / Excel', icon: FileText, action: () => exportDueSummaryPDF(parties), bg: '#f5f3ff', color: '#8b5cf6' },
            ].map((item, idx) => (
              <button key={idx}
                onClick={item.action}
                className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 transition-colors group text-left border border-transparent hover:border-slate-100">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110" style={{ background: item.bg, color: item.color }}>
                    <item.icon className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-[14px] font-bold text-slate-900">{item.label}</p>
                    <p className="text-[12px] font-medium text-slate-500">{item.sub}</p>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-slate-900 transition-colors" />
              </button>
            ))}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-[0_2px_10px_rgba(0,0,0,0.02)] flex flex-col">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-base font-bold text-slate-900">Recent Activity</h3>
            <button className="text-[13px] font-semibold text-blue-600 hover:text-blue-700">View All</button>
          </div>

          {recentActivity.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center py-8">
              <Clock className="w-10 h-10 mx-auto mb-3 text-slate-300" />
              <p className="text-[14px] text-slate-500 font-medium">No recent activity</p>
            </div>
          ) : (
            <div className="space-y-4 overflow-y-auto pr-2 custom-scrollbar flex-1">
              {recentActivity.slice(0, 5).map((log) => {
                const partyName = log.partyId ? parties.find(p => p.id === log.partyId)?.name : '';
                return (
                  <div key={log.id}
                    onClick={() => log.partyId && navigate(`/parties/${log.partyId}`)}
                    className="flex items-start gap-4 cursor-pointer group">
                    <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center flex-shrink-0 group-hover:bg-slate-100 transition-colors">
                      {getActivityIcon(log.action)}
                    </div>
                    <div className="flex-1 min-w-0 pt-0.5">
                      <p className="text-[13px] font-bold text-slate-900 truncate">
                        {actionLabel(log.action)} {partyName ? `for ${partyName}` : ''}
                      </p>
                      <p className="text-[12px] font-medium text-slate-500 truncate mt-0.5">
                        By {log.userEmail?.split('@')[0]}
                      </p>
                    </div>
                    <span className="text-[11px] font-medium text-slate-400 whitespace-nowrap pt-1">
                      {formatDateRelative(log.timestamp).replace(' ago', '')} ago
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Top Overdue Parties */}
        <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-[0_2px_10px_rgba(0,0,0,0.02)] flex flex-col">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-base font-bold text-slate-900">Top Overdue Parties</h3>
            <button className="text-[13px] font-semibold text-blue-600 hover:text-blue-700">View All</button>
          </div>

          {overdueParties.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center py-8">
              <div className="w-10 h-10 rounded-full bg-green-50 flex items-center justify-center mb-3">
                <TrendingUp className="w-5 h-5 text-green-500" />
              </div>
              <p className="text-[14px] text-slate-500 font-medium">No overdue parties!</p>
            </div>
          ) : (
            <div className="space-y-4 overflow-y-auto pr-2 custom-scrollbar flex-1">
              {overdueParties.sort((a, b) => b.totalDue - a.totalDue).slice(0, 5).map((party) => (
                <div key={party.id}
                  onClick={() => navigate(`/parties/${party.id}`)}
                  className="flex items-center gap-4 cursor-pointer group">
                  <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center flex-shrink-0 group-hover:bg-slate-100 transition-colors">
                    <User className="w-4 h-4 text-slate-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-bold text-slate-900 truncate">
                      {party.name}
                    </p>
                  </div>
                  <span className="text-[13px] font-bold text-red-600 whitespace-nowrap">
                    {formatCurrency(party.totalDue)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
