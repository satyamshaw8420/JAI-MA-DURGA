import React, { useState, useEffect } from 'react';
import { Receipt, FileText, Plus, Trash2, Eye, X, Building2, Package, Calculator, ArrowRight, Printer } from 'lucide-react';
import { toast } from 'sonner';
import { InvoiceState, InvoiceItem, autoCalculateTaxRates } from '@/lib/invoiceUtils';
import InvoiceTemplate from '@/components/invoice/InvoiceTemplate';

const initialItem: InvoiceItem = { id: '1', description: '', hsn: '', quantity: '', rate: '' };

const initialState: InvoiceState = {
  originalRecipient: true,
  duplicateTransporter: false,
  triplicateSupplier: false,
  extraCopy: false,
  invoiceNo: '',
  orderNo: '',
  modeOfTransport: '',
  date: new Date().toISOString().split('T')[0],
  orderDate: '',
  vehicleNo: '',
  consigneeName: '',
  consigneeAddress: '',
  consigneeState: 'West Bengal',
  consigneeStateCode: '19',
  consigneeGst: '',
  shipToName: '',
  shipToAddress: '',
  shipToState: '',
  shipToStateCode: '',
  shipToGst: '',
  items: [{ ...initialItem }],
  freight: '',
  cgstRate: 9,
  sgstRate: 9,
  igstRate: 0,
};

// Shared card wrapper for form sections to keep UI breathing
const SectionCard = ({ icon: Icon, title, children, action }: any) => (
  <div className="bg-white rounded-2xl border border-slate-200/60 shadow-[0_2px_10px_rgba(0,0,0,0.02)] overflow-hidden">
    <div className="border-b border-slate-100 px-6 py-4 flex items-center justify-between bg-slate-50/50">
      <div className="flex items-center gap-2.5">
        <div className="p-2 bg-white rounded-lg shadow-sm border border-slate-100">
          <Icon className="w-4 h-4 text-indigo-600" />
        </div>
        <h3 className="text-[15px] font-bold text-slate-900 tracking-tight">{title}</h3>
      </div>
      {action && <div>{action}</div>}
    </div>
    <div className="p-6">
      {children}
    </div>
  </div>
);

export default function CreateBillPage() {
  const [data, setData] = useState<InvoiceState>(initialState);
  const [showPreview, setShowPreview] = useState(false);
  const [syncShipTo, setSyncShipTo] = useState(true);

  useEffect(() => {
    const rates = autoCalculateTaxRates('19', data.consigneeStateCode);
    setData(prev => ({ ...prev, ...rates }));
  }, [data.consigneeStateCode]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    const isCheckbox = type === 'checkbox';
    const checked = isCheckbox ? (e.target as HTMLInputElement).checked : false;

    // Turn off automatic sync if user manually types in any Ship To field
    if (syncShipTo && name.startsWith('shipTo')) {
      setSyncShipTo(false);
    }

    setData(prev => {
      const updated = { ...prev, [name]: isCheckbox ? checked : value };
      
      // Auto copy consignee values to shipTo if sync is enabled
      if (syncShipTo) {
        if (name === 'consigneeName') updated.shipToName = value;
        if (name === 'consigneeAddress') updated.shipToAddress = value;
        if (name === 'consigneeState') updated.shipToState = value;
        if (name === 'consigneeStateCode') updated.shipToStateCode = value;
        if (name === 'consigneeGst') updated.shipToGst = value;
      }
      
      return updated;
    });
  };

  const handleItemChange = (index: number, field: keyof InvoiceItem, value: string) => {
    const newItems = [...data.items];
    newItems[index] = { ...newItems[index], [field]: value };
    setData({ ...data, items: newItems });
  };

  const addItem = () => {
    setData({ ...data, items: [...data.items, { ...initialItem, id: Math.random().toString() }] });
  };

  const removeItem = (index: number) => {
    if (data.items.length === 1) return;
    const newItems = data.items.filter((_, i) => i !== index);
    setData({ ...data, items: newItems });
  };


  // ── Print PDF via browser native print dialog ──────────────────────────────
  const printInvoice = () => {
    window.print();
  };

  const inputClass = "w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-2.5 text-[14px] text-slate-900 transition-all duration-200 focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 focus:outline-none placeholder:text-slate-400";
  const labelClass = "block text-[13px] font-semibold text-slate-700 mb-1.5 ml-0.5";

  return (
    <div className="min-h-screen bg-[#f8fafc] p-4 sm:p-6 lg:p-8 pb-32 font-sans">
      
      <div className="max-w-[1000px] mx-auto space-y-6">
        
        {/* Modern Sticky Header */}
        <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 sticky top-6 z-30">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-br from-indigo-50 to-blue-50 rounded-xl flex items-center justify-center border border-indigo-100 shadow-inner">
              <Receipt className="w-6 h-6 text-indigo-600" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">Create Invoice</h1>
              <p className="text-[13px] font-medium text-slate-500 mt-0.5">Fill details to generate a professional A4 bill</p>
            </div>
          </div>
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button 
              onClick={() => setShowPreview(true)}
              className="flex-1 sm:flex-none px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[14px] font-bold rounded-xl flex items-center justify-center gap-2 transition-all"
            >
              <Eye className="w-4 h-4" />
              <span>Preview</span>
            </button>
            <button 
              onClick={printInvoice}
              className="flex-1 sm:flex-none px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-[14px] font-bold rounded-xl flex items-center justify-center gap-2 transition-all shadow-[0_4px_14px_rgba(5,150,105,0.25)]"
            >
              <Printer className="w-4 h-4" />
              <span>Print PDF</span>
            </button>
          </div>
        </div>

        {/* Form Sections */}
        <div className="space-y-6">
          
          {/* Section 1: Bill Copies */}
          <SectionCard icon={FileText} title="Invoice Copies">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {['originalRecipient', 'duplicateTransporter', 'triplicateSupplier', 'extraCopy'].map((key) => (
                <label key={key} className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/30 cursor-pointer transition-all group">
                  <div className="relative flex items-center justify-center w-5 h-5">
                    <input 
                      type="checkbox" 
                      name={key} 
                      checked={data[key as keyof InvoiceState] as boolean} 
                      onChange={handleChange} 
                      className="peer appearance-none w-5 h-5 border-2 border-slate-300 rounded focus:ring-2 focus:ring-indigo-500/30 focus:outline-none checked:bg-indigo-600 checked:border-indigo-600 transition-all cursor-pointer" 
                    />
                    <svg className="absolute w-3 h-3 text-white pointer-events-none opacity-0 peer-checked:opacity-100 transition-opacity" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <span className="text-[14px] font-semibold text-slate-700 group-hover:text-slate-900 capitalize">{key.replace(/([A-Z])/g, ' $1')}</span>
                </label>
              ))}
            </div>
          </SectionCard>

          {/* Section 2: General Details */}
          <SectionCard icon={Receipt} title="General Details">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className={labelClass}>Invoice No.</label>
                <input type="text" name="invoiceNo" value={data.invoiceNo} onChange={handleChange} className={inputClass} placeholder="e.g. 74-26-27" />
              </div>
              <div>
                <label className={labelClass}>Invoice Date</label>
                <input type="date" name="date" value={data.date} onChange={handleChange} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Order No.</label>
                <input type="text" name="orderNo" value={data.orderNo} onChange={handleChange} className={inputClass} placeholder="Optional" />
              </div>
              <div>
                <label className={labelClass}>Order Date</label>
                <input type="date" name="orderDate" value={data.orderDate} onChange={handleChange} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Transport Mode</label>
                <input type="text" name="modeOfTransport" value={data.modeOfTransport} onChange={handleChange} className={inputClass} placeholder="e.g. Road" />
              </div>
              <div>
                <label className={labelClass}>Vehicle No.</label>
                <input type="text" name="vehicleNo" value={data.vehicleNo} onChange={handleChange} className={inputClass} placeholder="WB 11..." />
              </div>
            </div>
          </SectionCard>

          {/* Section 3: Parties */}
          <SectionCard 
            icon={Building2} 
            title="Party Details"
            action={
              <label className="flex items-center gap-2 cursor-pointer bg-indigo-50/80 hover:bg-indigo-100/80 border border-indigo-100/50 px-3.5 py-1.5 rounded-xl transition-all">
                <input 
                  type="checkbox" 
                  checked={syncShipTo} 
                  onChange={(e) => {
                    const checked = e.target.checked;
                    setSyncShipTo(checked);
                    if (checked) {
                      setData(prev => ({
                        ...prev,
                        shipToName: prev.consigneeName,
                        shipToAddress: prev.consigneeAddress,
                        shipToState: prev.consigneeState,
                        shipToStateCode: prev.consigneeStateCode,
                        shipToGst: prev.consigneeGst
                      }));
                      toast.success('Synced Ship To with Consignee');
                    }
                  }}
                  className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500/20 w-4 h-4 cursor-pointer"
                />
                <span className="text-[12px] font-bold text-indigo-700 select-none cursor-pointer">Same as Consignee</span>
              </label>
            }
          >
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              
              {/* Consignee Panel */}
              <div className="bg-slate-50/50 p-5 rounded-xl border border-slate-200">
                <div className="flex items-center gap-2 mb-5">
                  <div className="w-1.5 h-4 bg-indigo-600 rounded-full"></div>
                  <h4 className="text-[14px] font-bold text-slate-900 uppercase tracking-wide">Consignee (Buyer)</h4>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className={labelClass}>Name</label>
                    <input type="text" name="consigneeName" value={data.consigneeName} onChange={handleChange} className={inputClass} placeholder="Buyer's Firm Name" />
                  </div>
                  <div>
                    <label className={labelClass}>Address</label>
                    <textarea name="consigneeAddress" value={data.consigneeAddress} onChange={handleChange} className={inputClass} rows={2} placeholder="Full Address" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className={labelClass}>State</label>
                      <input type="text" name="consigneeState" value={data.consigneeState} onChange={handleChange} className={inputClass} />
                    </div>
                    <div>
                      <label className={labelClass}>State Code</label>
                      <input type="text" name="consigneeStateCode" value={data.consigneeStateCode} onChange={handleChange} className={inputClass} placeholder="e.g. 19" />
                    </div>
                  </div>
                  <div>
                    <label className={labelClass}>GSTIN</label>
                    <input type="text" name="consigneeGst" value={data.consigneeGst} onChange={handleChange} className={`${inputClass} uppercase`} placeholder="22AAAAA0000A1Z5" />
                  </div>
                </div>
              </div>

              {/* Ship To Panel */}
              <div className="bg-slate-50/50 p-5 rounded-xl border border-slate-200">
                <div className="flex items-center gap-2 mb-5">
                  <div className="w-1.5 h-4 bg-emerald-500 rounded-full"></div>
                  <h4 className="text-[14px] font-bold text-slate-900 uppercase tracking-wide">Ship To Party</h4>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className={labelClass}>Name</label>
                    <input type="text" name="shipToName" value={data.shipToName} onChange={handleChange} className={inputClass} placeholder="Receiver's Firm Name" />
                  </div>
                  <div>
                    <label className={labelClass}>Address</label>
                    <textarea name="shipToAddress" value={data.shipToAddress} onChange={handleChange} className={inputClass} rows={2} placeholder="Full Delivery Address" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className={labelClass}>State</label>
                      <input type="text" name="shipToState" value={data.shipToState} onChange={handleChange} className={inputClass} />
                    </div>
                    <div>
                      <label className={labelClass}>State Code</label>
                      <input type="text" name="shipToStateCode" value={data.shipToStateCode} onChange={handleChange} className={inputClass} />
                    </div>
                  </div>
                  <div>
                    <label className={labelClass}>GSTIN</label>
                    <input type="text" name="shipToGst" value={data.shipToGst} onChange={handleChange} className={`${inputClass} uppercase`} />
                  </div>
                </div>
              </div>

            </div>
          </SectionCard>

          {/* Section 4: Items & Goods */}
          <SectionCard 
            icon={Package} 
            title="Items / Goods Details"
            action={
              <button onClick={addItem} className="text-[13px] font-bold text-white bg-slate-900 hover:bg-slate-800 px-4 py-2 rounded-lg flex items-center gap-2 transition-all shadow-sm">
                <Plus className="w-4 h-4" /> Add Row
              </button>
            }
          >
            <div className="space-y-4">
              {data.items.map((item, index) => (
                <div key={item.id} className="relative bg-white p-5 rounded-xl border border-slate-200 shadow-sm transition-all hover:border-indigo-200 group">
                  
                  {/* Delete Button */}
                  {data.items.length > 1 && (
                    <button 
                      onClick={() => removeItem(index)} 
                      className="absolute -top-3 -right-3 bg-white border border-slate-200 text-red-500 hover:text-white hover:bg-red-500 hover:border-red-500 rounded-full p-2 shadow-sm transition-all z-10 opacity-0 group-hover:opacity-100"
                      title="Remove Item"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                  
                  <div className="flex items-center gap-3 mb-4">
                    <span className="flex items-center justify-center w-6 h-6 rounded-full bg-slate-100 text-[12px] font-bold text-slate-500">{index + 1}</span>
                    <h5 className="text-[14px] font-bold text-slate-900">Item Details</h5>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                    <div className="md:col-span-5">
                      <label className={labelClass}>Description of Goods</label>
                      <input type="text" value={item.description} onChange={e => handleItemChange(index, 'description', e.target.value)} className={inputClass} placeholder="e.g. MS Angle 50x50x5" />
                    </div>
                    <div className="md:col-span-2">
                      <label className={labelClass}>HSN Code</label>
                      <input type="text" value={item.hsn} onChange={e => handleItemChange(index, 'hsn', e.target.value)} className={inputClass} placeholder="7216" />
                    </div>
                    <div className="md:col-span-2">
                      <label className={labelClass}>Qty / Wt.</label>
                      <input type="number" value={item.quantity} onChange={e => handleItemChange(index, 'quantity', e.target.value)} className={inputClass} placeholder="0" />
                    </div>
                    <div className="md:col-span-3">
                      <label className={labelClass}>Rate (₹)</label>
                      <input type="number" value={item.rate} onChange={e => handleItemChange(index, 'rate', e.target.value)} className={inputClass} placeholder="0.00" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </SectionCard>

          {/* Section 5: Adjustments & Taxes */}
          <SectionCard icon={Calculator} title="Adjustments & Taxes">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              
              <div className="space-y-4">
                <div>
                  <label className={labelClass}>Freight / Loading Charge (₹)</label>
                  <input type="number" name="freight" value={data.freight} onChange={handleChange} className={inputClass} placeholder="0.00" />
                </div>
              </div>

              <div className="bg-indigo-50/50 p-5 rounded-xl border border-indigo-100 flex flex-col justify-center">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></div>
                  <p className="text-[13px] font-bold text-indigo-900">Automatic GST Detection</p>
                </div>
                <p className="text-[13px] text-indigo-700 leading-relaxed">
                  Taxes are calculated automatically based on the Consignee State Code.
                </p>
                <div className="mt-3 bg-white px-4 py-2.5 rounded-lg border border-indigo-100 shadow-sm inline-flex w-fit">
                  <p className="text-[14px] font-bold text-indigo-700">
                    Applied: {data.cgstRate > 0 ? `CGST (${data.cgstRate}%) + SGST (${data.sgstRate}%)` : `IGST (${data.igstRate}%)`}
                  </p>
                </div>
              </div>

            </div>
          </SectionCard>

        </div>
      </div>


      {/* Full Screen Preview Modal */}
      {showPreview && (
        <div className="fixed inset-0 bg-slate-900/90 z-[100] flex flex-col items-center overflow-y-auto backdrop-blur-sm">
          
          <div className="w-full bg-slate-900/80 p-4 sticky top-0 z-10 flex items-center justify-between border-b border-slate-700/50">
            <h2 className="text-white text-lg font-bold px-4">Invoice Preview</h2>
            <div className="flex items-center gap-3">
              <button 
                onClick={printInvoice}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-[14px] font-bold rounded-xl flex items-center gap-2 transition-all"
              >
                <Printer className="w-4 h-4" />
                Print PDF
              </button>
              <button 
                onClick={() => setShowPreview(false)}
                className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition-all"
                title="Close Preview"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
          
          <div className="py-8 px-4 w-full flex justify-center">
            <div 
              className="bg-white shadow-[0_0_40px_rgba(0,0,0,0.5)] origin-top"
              style={{ 
                width: '794px', 
                height: '1123px',
                transform: `scale(${Math.min(1, (typeof window !== 'undefined' ? window.innerWidth - 32 : 794) / 794)})`,
                transformOrigin: 'top center'
              }}
            >
              <InvoiceTemplate data={data} />
            </div>
          </div>
        </div>
      )}

      {/* Always-mounted print container — hidden on screen, shown only during window.print() */}
      <div
        id="invoice-print-root"
        style={{ position: 'fixed', left: '-9999px', top: 0, visibility: 'hidden', pointerEvents: 'none' }}
        aria-hidden="true"
      >
        {(() => {
          const activeCopies = [];
          if (data.originalRecipient) activeCopies.push('originalRecipient');
          if (data.duplicateTransporter) activeCopies.push('duplicateTransporter');
          if (data.triplicateSupplier) activeCopies.push('triplicateSupplier');
          if (data.extraCopy) activeCopies.push('extraCopy');
          
          const printPages = activeCopies.length > 0 ? activeCopies : ['originalRecipient'];
          return printPages.map((copyType) => {
            const pageData = {
              ...data,
              originalRecipient: copyType === 'originalRecipient',
              duplicateTransporter: copyType === 'duplicateTransporter',
              triplicateSupplier: copyType === 'triplicateSupplier',
              extraCopy: copyType === 'extraCopy',
            };
            return (
              <div key={copyType} className="print-page">
                <InvoiceTemplate data={pageData} />
              </div>
            );
          });
        })()}
      </div>

    </div>
  );
}
