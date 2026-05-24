import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import type { Party, Ledger, LedgerRow } from '@/types';
import { formatCurrency, formatDate } from '@/lib/utils';
import dayjs from 'dayjs';

// ===== EXCEL EXPORTS =====

export function exportPartyLedgerExcel(party: Party, ledger: Ledger) {
  const wb = XLSX.utils.book_new();

  // Sheet 1: Party Info
  const infoData = [
    ['Party Name', party.name],
    ['Phone', party.phone || '—'],
    ['Total Sold', party.totalSold],
    ['Total Paid', party.totalPaid],
    ['Outstanding Due', party.totalDue],
    ['Last Transaction', formatDate(party.lastTransactionDate)],
    ['Last Payment', formatDate(party.lastPaymentDate)],
  ];
  const ws1 = XLSX.utils.aoa_to_sheet(infoData);
  XLSX.utils.book_append_sheet(wb, ws1, 'Party Info');

  // Detect which optional columns are needed
  const hasDesc = ledger.rows.some(r => r.itemName);
  const hasQty  = ledger.rows.some(r => r.quantity);
  const hasGST  = ledger.rows.some(r => (r as any).gstEnabled);

  // Build dynamic column headers
  const headers = [
    'Date',
    ...(hasDesc ? ['Item Details'] : []),
    ...(hasQty  ? ['Qty']          : []),
    'Weight (kg)', 'Rate (Rs)',
    ...(hasGST
      ? ['Taxable Value', 'GST (18%)', 'Invoice Value']
      : ['Total Bill']),
    'Paid', 'Due', 'Mode',
  ];

  const rows = ledger.rows.map((r) => [
    formatDate(r.date).split(',')[0],
    ...(hasDesc ? [r.itemName || ''] : []),
    ...(hasQty  ? [r.quantity || ''] : []),
    r.weight || '',
    r.rate || '',
    ...(hasGST
      ? [
          (r as any).taxableAmount || r.amount || '',
          (r as any).gstAmount || '',
          r.amount || '',
        ]
      : [r.amount || '']),
    r.paid || '',
    ((r.paid || 0) > 0 && !(r.amount || 0)) ? '-' : (r.due !== undefined && r.due !== null ? r.due : ''),
    r.paymentMode ? `${r.paymentMode}${r.paymentDate ? ` (${dayjs(r.paymentDate).format('DD MMM YY')})` : ''}` : ''
  ]);

  const ws2 = XLSX.utils.aoa_to_sheet([headers, ...rows]);
  XLSX.utils.book_append_sheet(wb, ws2, 'Ledger');

  const filename = `${party.name}_Ledger_${dayjs().format('YYYY-MM-DD')}.xlsx`;
  XLSX.writeFile(wb, filename);
}

export function exportDueSummaryExcel(parties: Party[]) {
  const wb = XLSX.utils.book_new();
  const headers = ['Party Name', 'Phone', 'Total Sold', 'Total Paid', 'Total Due', 'Last Transaction'];
  const rows = parties
    .filter((p) => p.totalDue > 0)
    .sort((a, b) => b.totalDue - a.totalDue)
    .map((p) => [p.name, p.phone || '—', p.totalSold, p.totalPaid, p.totalDue, formatDate(p.lastTransactionDate)]);

  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
  XLSX.utils.book_append_sheet(wb, ws, 'Due Summary');
  XLSX.writeFile(wb, `DueSummary_${dayjs().format('YYYY-MM-DD')}.xlsx`);
}

// ===== PDF EXPORTS =====

import autoTable from 'jspdf-autotable';

// Helper to format currency for PDF since default fonts don't support the ₹ symbol
const formatPDFCurrency = (amount: number | null | undefined): string => {
  if (amount == null) return 'Rs. 0';
  return 'Rs. ' + amount.toLocaleString('en-IN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
};

export function exportPartyLedgerPDF(party: Party, ledger: Ledger) {
  const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const pageWidth = pdf.internal.pageSize.getWidth();

  // Draw Header Banner
  pdf.setFillColor(11, 26, 48); // Deep Navy (#0B1A30)
  pdf.rect(0, 0, pageWidth, 40, 'F');

  // Shop Name / Branding
  pdf.setTextColor(255, 255, 255);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(24);
  pdf.text('JAI MA DURGA IRON STORES', pageWidth / 2, 20, { align: 'center' });
  
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'normal');
  pdf.text('Dealer in IRON AND STEEL ,GENERAL ORDER SUPPLIER,Etc', pageWidth / 2, 28, { align: 'center' });

  // Party Details Section
  pdf.setTextColor(0, 0, 0);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(14);
  pdf.text(`Ledger Statement: ${party.name}`, 14, 55);

  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'normal');
  pdf.text(`Phone: ${party.phone || 'N/A'}`, 14, 62);
  pdf.text(`Date Generated: ${dayjs().format('DD MMM, YYYY')}`, 14, 68);

  // Financial Summary Box
  pdf.setDrawColor(220, 220, 220);
  pdf.setFillColor(248, 250, 252);
  pdf.roundedRect(pageWidth - 95, 48, 80, 25, 2, 2, 'FD');
  
  pdf.setFontSize(9);
  pdf.text('Total Amount:', pageWidth - 90, 55);
  pdf.text('Total Paid:', pageWidth - 90, 62);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Balance Due:', pageWidth - 90, 69);
  
  pdf.setFont('helvetica', 'normal');
  pdf.text(`${formatPDFCurrency(party.totalSold)}`, pageWidth - 20, 55, { align: 'right' });
  pdf.setTextColor(22, 163, 74); // Green
  pdf.text(`${formatPDFCurrency(party.totalPaid)}`, pageWidth - 20, 62, { align: 'right' });
  pdf.setTextColor(220, 38, 38); // Red
  pdf.setFont('helvetica', 'bold');
  pdf.text(`${formatPDFCurrency(party.totalDue)}`, pageWidth - 20, 69, { align: 'right' });
  pdf.setTextColor(0, 0, 0);

  // Detect which optional columns are needed
  const hasDesc = ledger.rows.some(r => r.itemName);
  const hasQty  = ledger.rows.some(r => r.quantity);
  const hasGST  = ledger.rows.some(r => (r as any).gstEnabled);

  // Build dynamic column headers
  const tableCols = [
    'Date',
    ...(hasDesc ? ['Item Details'] : []),
    ...(hasQty  ? ['Qty']          : []),
    'Weight', 'Rate',
    ...(hasGST
      ? ['Taxable Value', 'GST (18%)', 'Invoice Value']
      : ['Total Bill']),
    'Paid', 'Due', 'Mode',
  ];

  // Sort rows by date descending
  const sortedRows = [...ledger.rows].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const tableRows = sortedRows.map(row => [
    formatDate(row.date).split(',')[0],
    ...(hasDesc ? [row.itemName || '-']                                             : []),
    ...(hasQty  ? [row.quantity ? `${row.quantity} pcs` : '-']                     : []),
    row.weight ? `${row.weight} kg` : '-',
    row.rate   ? `Rs. ${row.rate}`  : '-',
    ...(hasGST
      ? [
          (row as any).taxableAmount ? formatPDFCurrency((row as any).taxableAmount) : (row.amount ? formatPDFCurrency(row.amount) : '-'),
          (row as any).gstAmount     ? formatPDFCurrency((row as any).gstAmount)     : '-',
          row.amount ? formatPDFCurrency(row.amount) : '-',
        ]
      : [row.amount ? formatPDFCurrency(row.amount) : '-']),
    row.paid ? formatPDFCurrency(row.paid) : '-',
    ((row.paid || 0) > 0 && !(row.amount || 0)) ? '-' : (row.due !== undefined && row.due !== null ? formatPDFCurrency(row.due) : '-'),
    row.paymentMode ? `${row.paymentMode}${row.paymentDate ? `\n(${dayjs(row.paymentDate).format('DD MMM YY')})` : ''}` : '-',
  ]);

  // Generate Table
  autoTable(pdf, {
    startY: 85,
    head: [tableCols],
    body: tableRows,
    theme: 'grid',
    headStyles: { fillColor: [11, 26, 48], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 9, halign: 'center' },
    bodyStyles: { fontSize: 9, textColor: [50, 50, 50] },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    margin: { top: 85, left: 14, right: 14 },
  });

  // Add Terms & Conditions at the end of the table
  const finalY = (pdf as any).lastAutoTable.finalY || 85;
  
  if (finalY + 40 > pdf.internal.pageSize.getHeight()) {
    pdf.addPage();
  }
  
  const currentY = finalY > pdf.internal.pageSize.getHeight() - 50 ? 20 : finalY + 15;

  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Terms & Conditions:', 14, currentY);
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(8);
  pdf.setTextColor(100, 100, 100);
  pdf.text('1. Goods once sold will not be taken back or exchanged.', 14, currentY + 6);
  pdf.text('2. All disputes are subject to local jurisdiction only.', 14, currentY + 11);
  pdf.text('3. Interest @ 18% p.a. will be charged if payment is delayed beyond 30 days.', 14, currentY + 16);

  // Signature Block
  pdf.setTextColor(0, 0, 0);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(10);
  pdf.text('For JAI MA DURGA IRON STORES', pageWidth - 14, currentY + 6, { align: 'right' });
  
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(9);
  pdf.text('Authorized Signatory', pageWidth - 14, currentY + 25, { align: 'right' });
  
  // Draw line for signature
  pdf.setDrawColor(150, 150, 150);
  pdf.line(pageWidth - 70, currentY + 20, pageWidth - 14, currentY + 20);

  pdf.save(`Ledger_${party.name.replace(/\\s+/g, '_')}_${dayjs().format('YYYYMMDD')}.pdf`);
}


export function exportDueSummaryPDF(parties: Party[]) {
  const pdf = new jsPDF({ unit: 'mm', format: 'a4' });
  const pageWidth = pdf.internal.pageSize.getWidth();

  pdf.setFontSize(16);
  pdf.setFont('helvetica', 'bold');
  pdf.text('JAI MA DURGA IRON STORES', pageWidth / 2, 15, { align: 'center' });
  pdf.setFontSize(12);
  pdf.text('Outstanding Due Summary', pageWidth / 2, 23, { align: 'center' });
  pdf.setFontSize(9);
  pdf.text(`Date: ${dayjs().format('DD/MM/YYYY')}`, 14, 30);

  const dueParties = parties.filter((p) => p.totalDue > 0).sort((a, b) => b.totalDue - a.totalDue);

  let y = 38;
  const cols = ['#', 'Party Name', 'Total Amount', 'Total Paid', 'Due'];
  const cw = [10, 60, 35, 35, 35];

  pdf.setFillColor(30, 58, 95);
  pdf.rect(14, y - 4, pageWidth - 28, 7, 'F');
  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(8);
  let x = 14;
  cols.forEach((c, i) => { pdf.text(c, x + 1, y); x += cw[i]; });

  pdf.setTextColor(0, 0, 0);
  pdf.setFont('helvetica', 'normal');
  y += 6;

  dueParties.forEach((p, idx) => {
    if (y > 270) { pdf.addPage(); y = 15; }
    x = 14;
    const vals = [(idx + 1).toString(), p.name, formatPDFCurrency(p.totalSold), formatPDFCurrency(p.totalPaid), formatPDFCurrency(p.totalDue)];
    vals.forEach((v, i) => { pdf.text(v, x + 1, y); x += cw[i]; });
    y += 5;
  });

  pdf.save(`DueSummary_${dayjs().format('YYYY-MM-DD')}.pdf`);
}
