import { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { usePartyStore } from '@/store/partyStore';
import { useLedgerStore } from '@/store/ledgerStore';
import { subscribeToParties } from '@/services/partyService';
import {
  subscribeToLedger, initializeLedger, saveLedger, deleteRows, syncPartyTotals
} from '@/services/ledgerService';
import { exportPartyLedgerExcel, exportPartyLedgerPDF } from '@/services/exportService';
import { calculateDue } from '@/lib/calculations';
import { formatCurrency, formatDate, generateId } from '@/lib/utils';
import type { Party, Ledger, LedgerRow } from '@/types';
import { PAYMENT_MODES } from '@/types';
import { toast } from 'sonner';
import {
  ArrowLeft, Download, FileSpreadsheet, FileText, Trash2, Calendar, IndianRupee,
  Plus, Check, X, CreditCard, ShoppingBag, Filter, Edit2, Hash, Scale, Receipt,
  Tags, NotebookText, HandCoins, Eye, EyeOff, Percent, History
} from 'lucide-react';
import dayjs from 'dayjs';

export default function PartyDetailPage() {
  const { id: partyId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, activeWorkspaceId } = useAuth();

  // Store
  const { parties, setParties, setLoading: setPartiesLoading } = usePartyStore();
  const { columns, rows, setColumns, setRows, setLoading, isLoading } = useLedgerStore();

  const [party, setParty] = useState<Party | null>(null);
  const [ledger, setLedger] = useState<Ledger | null>(null);
  const [showExport, setShowExport] = useState(false);
  const [showPaymentHistory, setShowPaymentHistory] = useState(false);

  // New Entry Form State
  const [isAdding, setIsAdding] = useState(false);
  const [isAddingPayment, setIsAddingPayment] = useState(false);
  const [formData, setFormData] = useState({
    date: dayjs().format('YYYY-MM-DD'),
    itemName: '',
    quantity: '',
    weight: '',
    rate: '',
    amount: '',
    paid: '',
    paymentMode: 'Pending',
    paymentDate: dayjs().format('YYYY-MM-DD'),
    notes: ''
  });

  // Edit Entry State
  const [editingRow, setEditingRow] = useState<LedgerRow | null>(null);
  const [editFormData, setEditFormData] = useState({
    date: '',
    itemName: '',
    quantity: '',
    weight: '',
    rate: '',
    amount: '',
    paid: '',
    paymentMode: '',
    paymentDate: '',
    notes: ''
  });

  // Filter State
  const [dateFilter, setDateFilter] = useState('');

  // Field toggle states (Add form)
  const [addShowDesc, setAddShowDesc] = useState(true);
  const [addShowQty, setAddShowQty] = useState(false);
  const [addGstEnabled, setAddGstEnabled] = useState(false);
  // Field toggle states (Edit form)
  const [editShowDesc, setEditShowDesc] = useState(true);
  const [editShowQty, setEditShowQty] = useState(false);
  const [editGstEnabled, setEditGstEnabled] = useState(false);

  // Subscribe to Party
  useEffect(() => {
    if (!user) return;
    const unsub = subscribeToParties(activeWorkspaceId || user.uid, (data) => {
      setParties(data);
      setPartiesLoading(false);
    }, console.error);
    return unsub;
  }, [user, activeWorkspaceId, setParties, setPartiesLoading]);

  useEffect(() => {
    const found = parties.find((p) => p.id === partyId);
    if (found) setParty(found);
  }, [parties, partyId]);

  // Subscribe to Ledger
  useEffect(() => {
    if (!partyId || !user) return;
    setLoading(true);
    const unsub = subscribeToLedger(
      partyId,
      (data) => {
        if (!data.userId && user) {
          initializeLedger(partyId, activeWorkspaceId || user.uid);
          return;
        }
        setLedger(data);
        setColumns(data.columns);
        // Sort rows by date descending
        const sortedRows = [...data.rows].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        setRows(sortedRows);
        setLoading(false);
      },
      (err) => { console.error(err); setLoading(false); }
    );
    return unsub;
  }, [partyId, user, setColumns, setRows, setLoading]);

  // Auto-calculate amount when qty/weight/rate changes (For ADD form)
  useEffect(() => {
    const w = parseFloat(formData.weight);
    const q = parseFloat(formData.quantity);
    const r = parseFloat(formData.rate);

    if (!isNaN(r) && r > 0) {
      if (!isNaN(w) && w > 0) {
        setFormData(prev => ({ ...prev, amount: (w * r).toFixed(2) }));
      } else if (!isNaN(q) && q > 0) {
        setFormData(prev => ({ ...prev, amount: (q * r).toFixed(2) }));
      }
    }
  }, [formData.weight, formData.quantity, formData.rate]);

  // Auto-calculate amount when qty/weight/rate changes (For EDIT form)
  useEffect(() => {
    const w = parseFloat(editFormData.weight);
    const q = parseFloat(editFormData.quantity);
    const r = parseFloat(editFormData.rate);

    if (!isNaN(r) && r > 0) {
      if (!isNaN(w) && w > 0) {
        setEditFormData(prev => ({ ...prev, amount: (w * r).toFixed(2) }));
      } else if (!isNaN(q) && q > 0) {
        setEditFormData(prev => ({ ...prev, amount: (q * r).toFixed(2) }));
      }
    }
  }, [editFormData.weight, editFormData.quantity, editFormData.rate]);

  // Compute live aggregates from currently loaded ledger rows
  const computedTotals = useMemo(() => {
    const totalSold = rows.reduce((s, r) => s + (r.amount || 0), 0);
    const totalPaid = rows.reduce((s, r) => s + (r.paid || 0), 0);
    const totalDue = totalSold - totalPaid;
    return { totalSold, totalPaid, totalDue };
  }, [rows]);

  const handleAddEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ledger || !user || !party) return;

    const taxableVal = parseFloat(formData.amount) || null;
    const paidVal = parseFloat(formData.paid) || null;
    if (!taxableVal && !paidVal) {
      toast.error('Please enter an amount or a paid value.');
      return;
    }
    // GST calculation
    const gstAmt = addGstEnabled && taxableVal ? parseFloat((taxableVal * 0.18).toFixed(2)) : null;
    const invoiceAmt = addGstEnabled && taxableVal ? parseFloat((taxableVal * 1.18).toFixed(2)) : taxableVal;

    try {
      const now = new Date().toISOString();
      const newRow: LedgerRow = {
        id: generateId(),
        date: formData.date,
        itemName: isAddingPayment ? 'Payment Received' : (addShowDesc ? formData.itemName.trim() : ''),
        size: '',
        quantity: isAddingPayment ? null : (addShowQty ? (parseFloat(formData.quantity) || null) : null),
        weight: isAddingPayment ? null : (parseFloat(formData.weight) || null),
        rate: isAddingPayment ? null : (parseFloat(formData.rate) || null),
        amount: isAddingPayment ? null : invoiceAmt,
        taxableAmount: isAddingPayment ? null : (addGstEnabled ? taxableVal : null),
        gstAmount: isAddingPayment ? null : gstAmt,
        gstRate: isAddingPayment ? null : (addGstEnabled ? 18 : null),
        gstEnabled: isAddingPayment ? false : addGstEnabled,
        paid: paidVal,
        due: calculateDue(isAddingPayment ? null : invoiceAmt, paidVal),
        paymentMode: formData.paymentMode,
        paymentDate: formData.paymentMode !== 'Pending' ? formData.paymentDate : undefined,
        notes: formData.notes.trim(),
        createdAt: now,
        updatedAt: now,
      };

      const updatedRows = [...ledger.rows, newRow];
      const updatedLedger = { ...ledger, rows: updatedRows };
      await saveLedger(updatedLedger);
      await syncPartyTotals(party.id, updatedRows);
      toast.success('Entry added successfully');
      setFormData({ date: dayjs().format('YYYY-MM-DD'), itemName: '', quantity: '', weight: '', rate: '', amount: '', paid: '', paymentMode: 'Pending', paymentDate: dayjs().format('YYYY-MM-DD'), notes: '' });
      setIsAdding(false);
      setIsAddingPayment(false);
    } catch (err) {
      toast.error('Failed to add entry');
    }
  };


  const handleOpenEdit = (row: LedgerRow) => {
    setEditingRow(row);
    setEditShowDesc(!!row.itemName);
    setEditShowQty(!!row.quantity);
    setEditGstEnabled(row.gstEnabled || false);
    setEditFormData({
      date: row.date,
      itemName: row.itemName || '',
      quantity: row.quantity ? String(row.quantity) : '',
      weight: row.weight ? String(row.weight) : '',
      rate: row.rate ? String(row.rate) : '',
      // For editing, show taxable amount in the amount field so user edits pre-GST value
      amount: row.gstEnabled && row.taxableAmount ? String(row.taxableAmount) : (row.amount ? String(row.amount) : ''),
      paid: row.paid ? String(row.paid) : '',
      paymentMode: row.paymentMode || 'Pending',
      paymentDate: row.paymentDate || dayjs().format('YYYY-MM-DD'),
      notes: row.notes || ''
    });
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ledger || !user || !party || !editingRow) return;

    const taxableVal = parseFloat(editFormData.amount) || null;
    const paidVal = parseFloat(editFormData.paid) || null;
    const gstAmt = editGstEnabled && taxableVal ? parseFloat((taxableVal * 0.18).toFixed(2)) : null;
    const invoiceAmt = editGstEnabled && taxableVal ? parseFloat((taxableVal * 1.18).toFixed(2)) : taxableVal;

    try {
      const updatedRows = ledger.rows.map(row => {
        if (row.id === editingRow.id) {
          return {
            ...row,
            date: editFormData.date,
            itemName: editShowDesc ? editFormData.itemName.trim() : '',
            quantity: editShowQty ? (parseFloat(editFormData.quantity) || null) : null,
            weight: parseFloat(editFormData.weight) || null,
            rate: parseFloat(editFormData.rate) || null,
            amount: invoiceAmt,
            taxableAmount: editGstEnabled ? taxableVal : null,
            gstAmount: gstAmt,
            gstRate: editGstEnabled ? 18 : null,
            gstEnabled: editGstEnabled,
            paid: paidVal,
            due: calculateDue(invoiceAmt, paidVal),
            paymentMode: editFormData.paymentMode,
            paymentDate: editFormData.paymentMode !== 'Pending' ? editFormData.paymentDate : undefined,
            notes: editFormData.notes.trim(),
            updatedAt: new Date().toISOString()
          };
        }
        return row;
      });
      const updatedLedger = { ...ledger, rows: updatedRows };
      await saveLedger(updatedLedger);
      await syncPartyTotals(party.id, updatedRows);
      toast.success('Entry updated successfully');
      setEditingRow(null);
    } catch (err) {
      toast.error('Failed to update entry');
    }
  };

  const handleDeleteRow = async (rowId: string) => {
    if (!ledger || !user || !party) return;
    if (!confirm('Are you sure you want to delete this entry?')) return;
    try {
      await deleteRows(ledger, [rowId], activeWorkspaceId || user.uid, user.email || '');
      const updatedRows = ledger.rows.filter(r => r.id !== rowId);
      await syncPartyTotals(party.id, updatedRows);
      toast.success('Entry deleted');
    } catch (err) {
      toast.error('Failed to delete entry');
    }
  };

  const filteredRows = useMemo(() => {
    // Hide pure payment rows (where there is no bill amount but there is a paid amount)
    let result = rows.filter(r => !((r.paid || 0) > 0 && !(r.amount || 0)));

    if (dateFilter) {
      result = result.filter(r => r.date === dateFilter);
    }
    return result;
  }, [rows, dateFilter]);

  if (!party || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-pulse flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-full border-4 border-slate-200 border-t-[#0B1A30] animate-spin" />
          <p className="text-slate-500 font-medium text-sm">Loading ledger...</p>
        </div>
      </div>
    );
  }

  // Form renderer — used for both Add and Edit
  const renderFormFields = (
    data: typeof formData,
    setData: (data: any) => void,
    isEdit: boolean,
    showDesc: boolean, setShowDesc: (v: boolean) => void,
    showQty: boolean, setShowQty: (v: boolean) => void,
    gstEnabled: boolean, setGstEnabled: (v: boolean) => void,
  ) => {
    const taxable = parseFloat(data.amount) || 0;
    const gstAmt = taxable * 0.18;
    const invoiceAmt = taxable * 1.18;

    const toggleBtn = (active: boolean, onToggle: () => void, label: string) => (
      <button type="button" onClick={onToggle} style={{
        display: 'flex', alignItems: 'center', gap: '6px',
        padding: '5px 12px', cursor: 'pointer', fontSize: '12px', fontWeight: 700,
        border: `1px solid ${active ? '#1e3a5f' : '#e2e8f0'}`,
        background: active ? '#1e3a5f' : '#f8fafc', color: active ? '#fff' : '#64748b',
        borderRadius: 0, transition: 'all 0.15s',
      }}>
        {active ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
        {label}
      </button>
    );

    return (
      <div className="space-y-5">
        {/* ── Toggle Bar ── */}
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '8px', padding: '10px 14px', background: '#f1f5f9', borderLeft: '3px solid #1e3a5f' }}>
          <span style={{ fontSize: '11px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.1em', marginRight: '4px' }}>Optional Fields:</span>
          {toggleBtn(showDesc, () => setShowDesc(!showDesc), 'Description')}
          {toggleBtn(showQty, () => setShowQty(!showQty), 'Qty / Pieces')}
          <div style={{ width: '1px', height: '24px', background: '#e2e8f0', margin: '0 4px' }} />
          <span style={{ fontSize: '11px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.1em', marginRight: '4px' }}>GST:</span>
          <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: 700, color: !gstEnabled ? '#1e3a5f' : '#64748b' }}>
            <input type="radio" checked={!gstEnabled} onChange={() => setGstEnabled(false)} style={{ accentColor: '#1e3a5f' }} /> No GST
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: 700, color: gstEnabled ? '#d97706' : '#64748b' }}>
            <input type="radio" checked={gstEnabled} onChange={() => setGstEnabled(true)} style={{ accentColor: '#d97706' }} /> GST @ 18%
          </label>
        </div>

        {/* ── Date + Description ── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center flex-shrink-0 text-indigo-500 shadow-sm"><Calendar className="w-4 h-4" /></div>
            <div className="flex-1">
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">Date <span className="text-red-500">*</span></label>
              <input type="date" required value={data.date} onChange={e => setData({ ...data, date: e.target.value })}
                className="w-full h-10 px-3 rounded-lg border border-slate-200 focus:border-indigo-500 text-sm font-medium shadow-sm" />
            </div>
          </div>
          {showDesc && (
            <div className="flex gap-3 md:col-span-2">
              <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center flex-shrink-0 text-green-500 shadow-sm"><Tags className="w-4 h-4" /></div>
              <div className="flex-1">
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">Item / Description</label>
                <input type="text" placeholder="e.g. ms plate 120*40" value={data.itemName} onChange={e => setData({ ...data, itemName: e.target.value })}
                  className="w-full h-10 px-3 rounded-lg border border-slate-200 focus:border-indigo-500 text-sm font-medium placeholder:text-slate-400 shadow-sm" />
              </div>
            </div>
          )}
        </div>

        {/* ── Qty / Weight / Rate ── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {showQty && (
            <div className="flex gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0 text-blue-500 shadow-sm"><Hash className="w-4 h-4" /></div>
              <div className="flex-1">
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">Quantity / Pieces</label>
                <input type="number" step="any" placeholder="0" value={data.quantity} onChange={e => setData({ ...data, quantity: e.target.value })}
                  className="w-full h-10 px-3 rounded-lg border border-slate-200 focus:border-indigo-500 text-sm font-medium shadow-sm" />
              </div>
            </div>
          )}
          <div className="flex gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center flex-shrink-0 text-purple-500 shadow-sm"><Scale className="w-4 h-4" /></div>
            <div className="flex-1">
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">Weight (KG)</label>
              <input type="number" step="any" placeholder="0.00" value={data.weight} onChange={e => setData({ ...data, weight: e.target.value })}
                className="w-full h-10 px-3 rounded-lg border border-slate-200 focus:border-indigo-500 text-sm font-medium shadow-sm" />
            </div>
          </div>
          <div className="flex gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center flex-shrink-0 text-amber-500 shadow-sm"><IndianRupee className="w-4 h-4" /></div>
            <div className="flex-1">
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">Rate (₹/kg)</label>
              <input type="number" step="any" placeholder="0.00" value={data.rate} onChange={e => setData({ ...data, rate: e.target.value })}
                className="w-full h-10 px-3 rounded-lg border border-slate-200 focus:border-indigo-500 text-sm font-medium shadow-sm" />
            </div>
          </div>
        </div>

        {/* ── Billing ── */}
        <div className={`grid grid-cols-1 sm:grid-cols-3 ${data.paymentMode !== 'Pending' ? 'lg:grid-cols-4' : ''} gap-4`}>
          <div className="flex gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-50 flex items-center justify-center flex-shrink-0 text-rose-500 shadow-sm"><Receipt className="w-4 h-4" /></div>
            <div className="flex-1">
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                {gstEnabled ? 'Taxable Value (₹)' : 'Total Bill (₹)'}
              </label>
              <input type="number" step="any" placeholder="0.00" value={data.amount} onChange={e => setData({ ...data, amount: e.target.value })}
                className="w-full h-10 px-3 rounded-lg border border-rose-100 bg-rose-50/40 focus:border-rose-400 text-sm font-semibold text-slate-900 shadow-sm" />
            </div>
          </div>
          <div className="flex gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center flex-shrink-0 text-emerald-500 shadow-sm"><HandCoins className="w-4 h-4" /></div>
            <div className="flex-1">
              <div className="flex items-center justify-between mb-1">
                <label className="block text-[11px] font-semibold text-emerald-600">Paid Amount (₹)</label>
                {isEdit && <button type="button" onClick={() => setData((p: any) => ({ ...p, paid: p.amount }))} className="text-[9px] font-bold text-indigo-600 uppercase tracking-wide">Mark Paid</button>}
              </div>
              <input type="number" step="any" placeholder="0.00" value={data.paid} onChange={e => setData({ ...data, paid: e.target.value })}
                className="w-full h-10 px-3 rounded-lg border-2 border-emerald-400 bg-emerald-50/50 focus:border-emerald-500 text-sm font-semibold text-emerald-800 shadow-sm" />
            </div>
          </div>
          <div className="flex gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0 text-blue-500 shadow-sm"><CreditCard className="w-4 h-4" /></div>
            <div className="flex-1">
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">Payment Mode</label>
              <select value={data.paymentMode} onChange={e => {
                const newMode = e.target.value;
                const updates: any = { paymentMode: newMode };
                // Auto-fill paid amount if changing from Pending to an actual payment method and paid is empty
                if (newMode !== 'Pending' && data.paymentMode === 'Pending' && (!data.paid || parseFloat(data.paid) === 0)) {
                  updates.paid = data.amount;
                }
                setData({ ...data, ...updates });
              }}
                className="w-full h-10 px-3 rounded-lg border border-slate-200 focus:border-indigo-500 text-sm font-medium bg-white shadow-sm">
                <option value="Pending">Pending (Unpaid)</option>
                {PAYMENT_MODES.map(mode => <option key={mode} value={mode}>{mode}</option>)}
              </select>
            </div>
          </div>
          {data.paymentMode !== 'Pending' && (
            <div className="flex gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center flex-shrink-0 text-indigo-500 shadow-sm"><Calendar className="w-4 h-4" /></div>
              <div className="flex-1">
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">Payment Date</label>
                <input type="date" value={data.paymentDate} onChange={e => setData({ ...data, paymentDate: e.target.value })}
                  className="w-full h-10 px-3 rounded-lg border border-slate-200 focus:border-indigo-500 text-sm font-medium shadow-sm" />
              </div>
            </div>
          )}
        </div>

        {/* ── GST Breakdown Panel ── */}
        {gstEnabled && taxable > 0 && (
          <div style={{ background: '#fffbeb', border: '1px solid #fcd34d', padding: '14px 16px', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
            <div>
              <p style={{ fontSize: '10px', fontWeight: 800, color: '#92400e', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Taxable Value</p>
              <p style={{ fontSize: '20px', fontWeight: 900, color: '#1e293b', marginTop: '4px' }}>₹{taxable.toFixed(2)}</p>
            </div>
            <div>
              <p style={{ fontSize: '10px', fontWeight: 800, color: '#92400e', textTransform: 'uppercase', letterSpacing: '0.08em' }}>+ GST @ 18%</p>
              <p style={{ fontSize: '20px', fontWeight: 900, color: '#d97706', marginTop: '4px' }}>₹{gstAmt.toFixed(2)}</p>
            </div>
            <div style={{ background: '#1e3a5f', padding: '10px 12px' }}>
              <p style={{ fontSize: '10px', fontWeight: 800, color: '#93c5fd', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Invoice Value</p>
              <p style={{ fontSize: '20px', fontWeight: 900, color: '#fff', marginTop: '4px' }}>₹{invoiceAmt.toFixed(2)}</p>
            </div>
          </div>
        )}

        {/* ── Notes ── */}
        <div className="flex gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center flex-shrink-0 text-indigo-500 shadow-sm"><NotebookText className="w-4 h-4" /></div>
          <div className="flex-1">
            <label className="block text-[11px] font-semibold text-slate-700 mb-1">Notes (Optional)</label>
            <input type="text" placeholder="Optional notes regarding this transaction" value={data.notes} onChange={e => setData({ ...data, notes: e.target.value })}
              className="w-full h-10 px-3 rounded-lg border border-slate-200 focus:border-indigo-500 text-sm font-medium shadow-sm" />
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-5xl mx-auto p-3 sm:p-4 md:p-8 space-y-4 sm:space-y-6 animate-fade-in bg-[#f8fafc] min-h-full">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/parties')}
            className="w-10 h-10 flex items-center justify-center rounded-xl bg-white border border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-[#0B1A30] transition-colors shadow-sm shrink-0">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="min-w-0">
            <h1 className="text-[20px] sm:text-[24px] font-bold text-[#0B1A30] leading-tight truncate">{party.name}</h1>
            <p className="text-[12px] sm:text-[13px] text-slate-500 font-medium flex items-center gap-2 mt-0.5 flex-wrap">
              {party.phone ? <span>{party.phone}</span> : <span>No phone</span>}
              <span className="w-1 h-1 rounded-full bg-slate-300 shrink-0" />
              <span>{rows.length} transactions</span>
            </p>
          </div>
        </div>

        {/* Action buttons — always visible, wrap on small screens */}
        <div className="flex items-center gap-2 flex-wrap relative">
          {/* Payment History — always shown, icon-only on very small screens */}
          <button onClick={() => setShowPaymentHistory(true)}
            className="flex items-center gap-2 px-3 sm:px-4 py-2.5 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-700 text-sm font-semibold hover:bg-indigo-100 transition-colors shadow-sm">
            <History className="w-4 h-4" />
            <span className="hidden xs:inline">Payment History</span>
            <span className="xs:hidden">History</span>
          </button>
          <button onClick={() => setShowExport(!showExport)}
            className="flex items-center gap-2 px-3 sm:px-4 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-700 text-sm font-semibold hover:bg-slate-50 transition-colors shadow-sm">
            <Download className="w-4 h-4" />
            <span className="hidden xs:inline">Export</span>
          </button>
          {showExport && ledger && (
            <div className="absolute right-0 top-12 z-20 w-48 rounded-xl bg-white border border-slate-100 shadow-[0_10px_40px_rgba(0,0,0,0.1)] py-2">
              <button onClick={() => { exportPartyLedgerExcel(party, ledger); setShowExport(false); }}
                className="w-full text-left px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 flex items-center gap-3">
                <FileSpreadsheet className="w-4 h-4 text-green-600" /> Export to Excel
              </button>
              <button onClick={() => { exportPartyLedgerPDF(party, ledger); setShowExport(false); }}
                className="w-full text-left px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 flex items-center gap-3">
                <FileText className="w-4 h-4 text-red-500" /> Export to PDF
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-2 sm:gap-4">
        {/* Compact cards — stacked icon+label on mobile */}
        <div className="bg-white rounded-2xl p-3 sm:p-5 border border-slate-100 shadow-sm flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
          <div className="w-9 h-9 sm:w-12 sm:h-12 rounded-full bg-blue-50 flex items-center justify-center flex-shrink-0">
            <ShoppingBag className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
          </div>
          <div>
            <p className="text-[10px] sm:text-[12px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Sold</p>
            <p className="text-[14px] sm:text-[20px] font-bold text-[#0B1A30]">{formatCurrency(computedTotals.totalSold)}</p>
          </div>
        </div>
        <div className="bg-white rounded-2xl p-3 sm:p-5 border border-slate-100 shadow-sm flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
          <div className="w-9 h-9 sm:w-12 sm:h-12 rounded-full bg-green-50 flex items-center justify-center flex-shrink-0">
            <CreditCard className="w-4 h-4 sm:w-5 sm:h-5 text-green-600" />
          </div>
          <div>
            <p className="text-[10px] sm:text-[12px] font-bold text-green-600/70 uppercase tracking-wider mb-0.5">Paid</p>
            <p className="text-[14px] sm:text-[20px] font-bold text-green-600">{formatCurrency(computedTotals.totalPaid)}</p>
          </div>
        </div>
        <div className="bg-white rounded-2xl p-3 sm:p-5 border border-slate-100 shadow-sm flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4"
          style={{ backgroundColor: computedTotals.totalDue > 0 ? '#fef2f2' : '#fff' }}>
          <div className="w-9 h-9 sm:w-12 sm:h-12 rounded-full flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: computedTotals.totalDue > 0 ? '#fee2e2' : '#f1f5f9' }}>
            <IndianRupee className="w-4 h-4 sm:w-5 sm:h-5" style={{ color: computedTotals.totalDue > 0 ? '#ef4444' : '#64748b' }} />
          </div>
          <div>
            <p className="text-[10px] sm:text-[12px] font-bold uppercase tracking-wider mb-0.5"
              style={{ color: computedTotals.totalDue > 0 ? '#ef4444' : '#64748b' }}>Due</p>
            <p className="text-[14px] sm:text-[20px] font-bold"
              style={{ color: computedTotals.totalDue > 0 ? '#ef4444' : '#0B1A30' }}>{formatCurrency(computedTotals.totalDue)}</p>
          </div>
        </div>
      </div>

      {/* Main Ledger Area */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col">

        {/* Toolbar */}
        <div className="px-3 sm:px-6 py-3 sm:py-4 border-b border-slate-100 bg-slate-50">
          {/* Row 1: title + date filter */}
          <div className="flex items-center justify-between gap-3 mb-3">
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-[#0B1A30]">Ledger History</h2>
              <span className="px-2 py-0.5 rounded-full bg-white border border-slate-200 text-xs font-bold text-slate-600 shadow-sm">{filteredRows.length}</span>
            </div>
            <div className="relative flex items-center">
              <Filter className="w-4 h-4 text-slate-400 absolute left-2.5 pointer-events-none" />
              <input
                type="date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="h-9 text-xs rounded-lg border border-[var(--border)] bg-[var(--card)] text-[var(--foreground)] outline-none"
                style={{ paddingLeft: '30px', paddingRight: dateFilter ? '28px' : '8px' }}
              />
              {dateFilter && (
                <button onClick={() => setDateFilter('')} className="absolute right-2 bg-transparent border-none cursor-pointer">
                  <X className="w-3.5 h-3.5 text-slate-400 hover:text-red-500" />
                </button>
              )}
            </div>
          </div>
          {/* Row 2: action buttons — full width, stacked layout on mobile */}
          <div className="flex gap-2">
            <button
              onClick={() => {
                setIsAddingPayment(!isAddingPayment);
                setIsAdding(false);
                if (!isAddingPayment) {
                  setFormData({ ...formData, paymentMode: 'NEFT' });
                }
              }}
              className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 transition-colors shadow-md">
              {isAddingPayment ? <X className="w-4 h-4" /> : <HandCoins className="w-4 h-4" />}
              {isAddingPayment ? 'Cancel' : 'Receive Payment'}
            </button>
            <button
              onClick={() => {
                setIsAdding(!isAdding);
                setIsAddingPayment(false);
              }}
              className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-[#0B1A30] text-white text-sm font-semibold hover:bg-[#0f2342] transition-colors shadow-md">
              {isAdding ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
              {isAdding ? 'Cancel' : 'Add New Entry'}
            </button>
          </div>
        </div>

        {/* Add Payment Form Section */}
        {isAddingPayment && (
          <div className="p-6 bg-emerald-50/30 border-b border-emerald-100 animate-slide-down">
            <div className="mb-4">
              <h3 className="text-sm font-bold text-emerald-800 flex items-center gap-2">
                <HandCoins className="w-4 h-4" /> Record Payment Received
              </h3>
              <p className="text-xs text-emerald-600/70 mt-1">Add a payment (NEFT, Cheque, Cash) to deduct from the party's outstanding balance.</p>
            </div>
            <form onSubmit={handleAddEntry} className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">Date</label>
                  <input type="date" value={formData.date} onChange={e => setFormData({ ...formData, date: e.target.value })}
                    className="w-full h-10 px-3 rounded-lg border border-slate-200 focus:border-indigo-500 text-sm font-medium shadow-sm" required />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-emerald-700 mb-1">Amount Received (₹)</label>
                  <input type="number" step="any" placeholder="0.00" value={formData.paid} onChange={e => setFormData({ ...formData, paid: e.target.value })}
                    className="w-full h-10 px-3 rounded-lg border-2 border-emerald-400 bg-emerald-50/50 focus:border-emerald-500 text-sm font-bold text-emerald-800 shadow-sm" required />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">Payment Mode</label>
                  <select value={formData.paymentMode} onChange={e => setFormData({ ...formData, paymentMode: e.target.value })}
                    className="w-full h-10 px-3 rounded-lg border border-slate-200 focus:border-indigo-500 text-sm font-medium bg-white shadow-sm" required>
                    {PAYMENT_MODES.map(mode => <option key={mode} value={mode}>{mode}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">Payment Date</label>
                  <input type="date" value={formData.paymentDate} onChange={e => setFormData({ ...formData, paymentDate: e.target.value })}
                    className="w-full h-10 px-3 rounded-lg border border-slate-200 focus:border-indigo-500 text-sm font-medium shadow-sm" required />
                </div>
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">Reference / Notes (Optional)</label>
                <input type="text" placeholder="e.g. NEFT UTR or Cheque Number" value={formData.notes} onChange={e => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full h-10 px-3 rounded-lg border border-slate-200 focus:border-indigo-500 text-sm font-medium shadow-sm" />
              </div>
              <div className="pt-2 flex justify-end">
                <button type="submit" className="px-5 py-2.5 rounded-lg bg-emerald-600 text-white font-semibold text-sm hover:bg-emerald-700 transition-colors shadow-sm flex items-center gap-2">
                  <Check className="w-4 h-4" /> Save Payment
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Add Entry Form Section */}
        {isAdding && (
          <div className="p-6 bg-slate-50/50 border-b border-slate-200 animate-slide-down">
            <div className="mb-4">
              <h3 className="text-sm font-bold text-slate-800">Record New Transaction</h3>
              <p className="text-xs text-slate-500 mt-1">Fill in the details below to add a new purchase or payment to the ledger.</p>
            </div>
            <form onSubmit={handleAddEntry}>
              {renderFormFields(formData, setFormData, false, addShowDesc, setAddShowDesc, addShowQty, setAddShowQty, addGstEnabled, setAddGstEnabled)}
              <div className="pt-6 flex justify-end">
                <button type="submit"
                  className="px-6 py-3 rounded-xl bg-blue-600 text-white font-bold text-sm hover:bg-blue-700 transition-colors shadow-md shadow-blue-600/20 flex items-center gap-2">
                  <Check className="w-4 h-4" /> Save Ledger Entry
                </button>
              </div>
            </form>
          </div>
        )}

        {/* History List */}
        <div className="flex-1 max-h-[600px] overflow-y-auto bg-white custom-scrollbar">
          {filteredRows.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center px-4">
              <div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center mb-4 border border-slate-100">
                <FileText className="w-8 h-8 text-slate-300" />
              </div>
              <h3 className="text-lg font-bold text-slate-700 mb-1">No entries found</h3>
              <p className="text-sm text-slate-500 max-w-sm">
                {dateFilter ? 'No transactions found for the selected date. Clear the filter to see all history.' : 'Click "Add New Entry" to record your first purchase or payment for this party.'}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {filteredRows.map((row) => (
                <div key={row.id} className="p-3 sm:p-5 hover:bg-slate-50/50 transition-colors flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 relative group">

                  {/* Date & Icon */}
                  <div className="flex items-center gap-4 sm:w-[140px] flex-shrink-0">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${(row.paid || 0) > 0 && !(row.amount || 0) ? 'bg-green-100 text-green-600' : 'bg-blue-100 text-blue-600'}`}>
                      {(row.paid || 0) > 0 && !(row.amount || 0) ? <CreditCard className="w-5 h-5" /> : <ShoppingBag className="w-5 h-5" />}
                    </div>
                    <div>
                      <p className="text-[13px] font-bold text-slate-900">{formatDate(row.date).split(',')[0]}</p>
                      <p className="text-[11px] font-medium text-slate-500">{dayjs(row.date).format('YYYY')}</p>
                    </div>
                  </div>

                  {/* Details */}
                  <div className="flex-1 min-w-0">
                    <p className="text-[14px] font-bold text-slate-900 truncate">
                      {row.itemName || 'Payment Received'}
                    </p>
                    <div className="flex items-center flex-wrap gap-2 mt-1 text-[12px] font-medium text-slate-600">
                      {row.quantity ? <span className="bg-slate-100 px-2 py-0.5 rounded border border-slate-200">Qty: {row.quantity}</span> : null}
                      {row.weight ? <span className="bg-slate-100 px-2 py-0.5 rounded border border-slate-200">W: {row.weight}kg</span> : null}
                      {row.rate ? <span className="bg-slate-100 px-2 py-0.5 rounded border border-slate-200">@ ₹{row.rate}</span> : null}
                      {row.paymentMode && (row.paymentMode === 'Udhar' || row.paymentMode === 'Pending') ? (
                        <span className="bg-amber-50 text-amber-700 px-2 py-0.5 rounded border border-amber-200">Pending (Unpaid)</span>
                      ) : row.paymentMode ? (
                        <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded border border-blue-100 flex items-center gap-1">
                          {row.paymentMode} {row.paymentDate && <span className="text-blue-500 opacity-80 text-[10px]">({dayjs(row.paymentDate).format('DD MMM YY')})</span>}
                        </span>
                      ) : null}
                    </div>
                    {row.notes && (
                      <p className="text-[11px] text-slate-500 mt-1 italic line-clamp-1">{row.notes}</p>
                    )}
                  </div>

                  {/* Amounts */}
                  <div className="flex items-center gap-3 sm:gap-6 sm:w-[320px] justify-between sm:justify-end shrink-0">
                    <div className="text-right">
                      <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Bill</p>
                      <p className="text-[14px] font-bold text-slate-900">{row.amount ? formatCurrency(row.amount) : '—'}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[11px] font-bold text-green-600/70 uppercase tracking-wider mb-0.5">Paid</p>
                      <p className="text-[14px] font-bold text-green-600">{row.paid ? formatCurrency(row.paid) : '—'}</p>
                    </div>
                    <div className="text-right w-[80px]">
                      <p className="text-[11px] font-bold text-red-400 uppercase tracking-wider mb-0.5">Due</p>
                      <p className="text-[14px] font-bold text-red-500">
                        {((row.paid || 0) > 0 && !(row.amount || 0)) ? <span className="text-slate-300">—</span> : row.due ? formatCurrency(row.due) : <span className="text-slate-300">—</span>}
                      </p>
                    </div>
                  </div>

                  {/* Actions (Pencil Edit and Trash Delete) */}
                  <div className="flex items-center gap-1 pl-4 border-l border-slate-100 sm:w-[90px] justify-end opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                    <button onClick={() => handleOpenEdit(row)}
                      className="p-2 rounded-lg text-slate-400 hover:bg-white hover:text-blue-600 hover:shadow-sm border border-transparent hover:border-slate-200 transition-all"
                      title="Edit Entry">
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleDeleteRow(row.id)}
                      className="p-2 rounded-lg text-slate-400 hover:bg-white hover:text-red-500 hover:shadow-sm border border-transparent hover:border-red-100 transition-all"
                      title="Delete Entry">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                </div>
              ))}
            </div>
          )}
        </div>

      </div>

      {/* Edit Entry Modal */}
      {editingRow && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto"
          style={{ background: 'rgba(11, 26, 48, 0.4)', backdropFilter: 'blur(4px)' }}
          onClick={() => setEditingRow(null)}>
          <div className="w-full max-w-4xl rounded-2xl p-4 sm:p-6 md:p-8 bg-white shadow-2xl animate-slide-up my-auto"
            onClick={(e) => e.stopPropagation()}>

            <div className="flex items-start justify-between mb-6 sm:mb-8 pb-4 sm:pb-6 border-b border-slate-100">
              <div className="flex items-center gap-3 sm:gap-4">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-indigo-50 text-indigo-500 flex items-center justify-center shrink-0">
                  <Edit2 className="w-4 h-4 sm:w-5 sm:h-5" />
                </div>
                <div>
                  <h3 className="text-lg sm:text-xl font-bold text-slate-800 leading-tight">Edit Ledger Entry</h3>
                  <p className="text-xs sm:text-sm text-slate-500 mt-0.5 sm:mt-1">Update the details of this transaction</p>
                </div>
              </div>
              <button onClick={() => setEditingRow(null)} className="p-1.5 sm:p-2 rounded-lg text-slate-400 hover:bg-slate-100 transition-colors shrink-0">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit}>
              {renderFormFields(editFormData, setEditFormData, true, editShowDesc, setEditShowDesc, editShowQty, setEditShowQty, editGstEnabled, setEditGstEnabled)}

              <div className="flex flex-col-reverse sm:flex-row gap-3 sm:gap-4 justify-end pt-6 sm:pt-8 mt-6 sm:mt-8 border-t border-slate-100">
                <button type="button" onClick={() => setEditingRow(null)}
                  className="w-full sm:w-auto h-11 px-6 rounded-lg text-sm font-semibold border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors flex items-center justify-center gap-2 shadow-sm">
                  <X className="w-4 h-4" /> Cancel
                </button>
                <button type="submit"
                  className="w-full sm:w-auto h-11 px-8 rounded-lg bg-[#5255e3] text-white font-semibold text-sm hover:bg-[#4338ca] transition-colors shadow-sm flex items-center justify-center gap-2">
                  <Check className="w-4 h-4" /> Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Payment History Modal */}
      {showPaymentHistory && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl animate-scale-in">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50 rounded-t-2xl">
              <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <History className="w-5 h-5 text-indigo-600" />
                Payment History - {party?.name}
              </h2>
              <button onClick={() => setShowPaymentHistory(false)} className="w-8 h-8 flex items-center justify-center rounded-lg bg-white border border-slate-200 text-slate-500 hover:bg-slate-100 transition-colors shadow-sm">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1 bg-slate-50/30">
              {!ledger || ledger.rows.filter(r => r.paid && r.paid > 0).length === 0 ? (
                <div className="text-center py-10">
                  <HandCoins className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                  <p className="text-slate-500 font-medium">No payments recorded yet.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {ledger.rows.filter(r => r.paid && r.paid > 0).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(payment => (
                    <div key={payment.id} className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all hover:border-indigo-100">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600 shrink-0">
                          <HandCoins className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="font-bold text-slate-900 text-base">{formatCurrency(payment.paid || 0)}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-600">{payment.paymentMode || 'Unknown'}</span>
                            <span className="text-[12px] text-slate-500">{dayjs(payment.paymentDate || payment.date).format('DD MMM YYYY')}</span>
                          </div>
                        </div>
                      </div>
                      {payment.notes && (
                        <div className="text-sm text-slate-500 italic max-w-[200px] truncate sm:text-right">
                          "{payment.notes}"
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="px-6 py-4 border-t border-slate-100 bg-white rounded-b-2xl flex justify-between items-center">
              <div>
                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-0.5">Total Received</p>
                <p className="text-[18px] font-bold text-emerald-600">{formatCurrency(computedTotals.totalPaid)}</p>
              </div>
              <button onClick={() => setShowPaymentHistory(false)} className="px-6 py-2 bg-slate-800 text-white font-semibold text-sm rounded-xl hover:bg-slate-900 transition-colors shadow-md">
                Close
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
