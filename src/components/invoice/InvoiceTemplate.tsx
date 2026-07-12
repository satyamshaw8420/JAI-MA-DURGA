import React, { forwardRef } from 'react';
import { InvoiceState, numberToWords } from '@/lib/invoiceUtils';

interface Props { data: InvoiceState; }

// ─── Shared style tokens ──────────────────────────────────────────────────────
const BLUE   = '#1e3a8a';
const RED    = '#dc2626';
const LIGHT  = '#eff6ff';
const BLACK  = '#000000';
const WHITE  = '#ffffff';
const FONT   = 'Arial, Helvetica, sans-serif';
const BORDER = `1.5px solid ${BLUE}`;
const DOTTED = `1.5px dotted ${BLUE}`;

// Reusable dotted-line field row
const Field = ({
  label, value, labelW = 70, flex = 1, textTransform,
}: { label: string; value?: string; labelW?: number; flex?: number; textTransform?: 'none' | 'capitalize' | 'uppercase' }) => (
  <div style={{ display: 'flex', alignItems: 'flex-end', height: '22px', flex: flex }}>
    <span style={{
      width: `${labelW}px`, display: 'flex', justifyContent: 'space-between',
      fontSize: '12px', fontWeight: 'bold', color: BLUE, flexShrink: 0,
    }}>
      {label} <span>:</span>
    </span>
    <div style={{
      borderBottom: DOTTED, flex: 1, height: '22px', position: 'relative', marginLeft: '6px',
    }}>
      <span style={{
        position: 'absolute', bottom: '2px', left: '4px',
        color: BLACK, fontSize: '12px', fontWeight: 'bold', lineHeight: 1,
        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        maxWidth: '100%',
        textTransform: textTransform || 'none',
      }}>
        {value}
      </span>
    </div>
  </div>
);

// Helper to wrap/split address into 2 or 3 lines nicely
function splitAddressLines(address: string, maxLen1 = 30, maxLen2 = 38): string[] {
  if (!address) return ['', ''];
  
  // Clean all weird whitespace characters (including non-breaking spaces) into normal spaces
  const cleanAddress = address.replace(/[\u00a0\r\t\n]/g, ' ').replace(/\s+/g, ' ').trim();
  
  const words = cleanAddress.split(' ');
  const resultLines: string[] = [];
  let currentLine = '';

  for (const word of words) {
    const currentLineIdx = resultLines.length;
    if (currentLineIdx >= 2) {
      currentLine = currentLine ? currentLine + ' ' + word : word;
      continue;
    }

    const maxLen = currentLineIdx === 0 ? maxLen1 : maxLen2;
    const testLine = currentLine ? currentLine + ' ' + word : word;
    
    if (testLine.length <= maxLen) {
      currentLine = testLine;
    } else {
      if (currentLine) {
        resultLines.push(currentLine.trim());
      }
      currentLine = word;
    }
  }
  if (currentLine) {
    resultLines.push(currentLine.trim());
  }

  while (resultLines.length < 2) {
    resultLines.push('');
  }
  
  if (resultLines.length > 3) {
    const mainLines = resultLines.slice(0, 2);
    const rest = resultLines.slice(2).join(' ').trim();
    if (rest) mainLines.push(rest);
    return mainLines;
  }

  return resultLines;
}

// Multi-line address component with dotted lines
const AddressFields = ({ address }: { address?: string }) => {
  const lines = splitAddressLines(address || '');
  return (
    <>
      <div style={{ display: 'flex', alignItems: 'flex-end', height: '22px' }}>
        <span style={{
          width: '70px', display: 'flex', justifyContent: 'space-between',
          fontSize: '12px', fontWeight: 'bold', color: BLUE, flexShrink: 0,
        }}>
          Address <span>:</span>
        </span>
        <div style={{
          borderBottom: DOTTED, flex: 1, minHeight: '22px', marginLeft: '6px',
          display: 'flex', alignItems: 'flex-end', paddingBottom: '2px', paddingLeft: '4px',
          overflow: 'hidden'
        }}>
          <span style={{
            color: BLACK, fontSize: '12px', fontWeight: 'bold', lineHeight: 1,
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            textTransform: 'capitalize',
          }}>
            {lines[0] ? lines[0].trim() : ''}
          </span>
        </div>
      </div>

      {lines.length > 1 && (
        <div style={{ display: 'flex', alignItems: 'flex-end', height: '22px' }}>
          <span style={{
            width: '70px', flexShrink: 0,
          }} />
          <div style={{
            borderBottom: DOTTED, flex: 1, minHeight: '22px', marginLeft: '6px',
            display: 'flex', alignItems: 'flex-end', paddingBottom: '2px', paddingLeft: '4px',
            overflow: 'hidden'
          }}>
            <span style={{
              color: BLACK, fontSize: '12px', fontWeight: 'bold', lineHeight: 1,
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
              textTransform: 'capitalize',
            }}>
              {lines[1] ? lines[1].trim() : ''}
            </span>
          </div>
        </div>
      )}

      {lines.length > 2 && lines[2] && (
        <div style={{ display: 'flex', alignItems: 'flex-end', height: '22px' }}>
          <span style={{
            width: '70px', flexShrink: 0,
          }} />
          <div style={{
            borderBottom: DOTTED, flex: 1, minHeight: '22px', marginLeft: '6px',
            display: 'flex', alignItems: 'flex-end', paddingBottom: '2px', paddingLeft: '4px',
            overflow: 'hidden'
          }}>
            <span style={{
              color: BLACK, fontSize: '12px', fontWeight: 'bold', lineHeight: 1,
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
              textTransform: 'capitalize',
            }}>
              {lines[2].trim()}
            </span>
          </div>
        </div>
      )}
    </>
  );
};


// ─── Main Component ───────────────────────────────────────────────────────────
const InvoiceTemplate = forwardRef<HTMLDivElement, Props>(({ data }, ref) => {
  const totalAmount = data.items.reduce(
    (s, i) => s + Number(i.quantity || 0) * Number(i.rate || 0), 0
  );
  const freight    = Number(data.freight || 0);
  const cgstAmt    = (totalAmount * data.cgstRate) / 100;
  const sgstAmt    = (totalAmount * data.sgstRate) / 100;
  const igstAmt    = (totalAmount * data.igstRate) / 100;
  const totalTax   = cgstAmt + sgstAmt + igstAmt;
  const subTotal   = totalAmount + freight + totalTax;
  const roundedOff = Math.round(subTotal) - subTotal;
  const finalAmt   = Math.round(subTotal);
  const words      = numberToWords(finalAmt);

  const fmt = (n: number) => n > 0 ? n.toFixed(2) : '';

  return (
    <div
      ref={ref}
      style={{
        width: '794px', height: '1123px',
        padding: '18px',
        backgroundColor: WHITE,
        fontFamily: FONT,
        boxSizing: 'border-box',
        overflow: 'hidden',
      }}
    >
      {/* ── Outer border ─────────────────────────────────────────────────── */}
      <div style={{
        width: '100%', height: '100%',
        border: BORDER,
        display: 'flex', flexDirection: 'column',
        padding: '4px',
        boxSizing: 'border-box',
      }}>

        {/* ── Header ───────────────────────────────────────────────────────── */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
          position: 'relative', padding: '6px 8px 0',
        }}>
          {/* Copy checkboxes */}
          <div style={{ fontSize: '10px', fontWeight: 'bold', color: BLUE, lineHeight: '1.6' }}>
            {[
              ['originalRecipient',   'Original for Recipient'],
              ['duplicateTransporter','Duplicate for Transporter'],
              ['triplicateSupplier',  'Triplicate for Supplier'],
              ['extraCopy',           'Extra Copy'],
            ].map(([key, label]) => (
              <div key={key} style={{ display: 'flex', alignItems: 'center', marginBottom: '2px' }}>
                <div style={{
                  width: '11px', height: '11px', border: `1px solid ${BLUE}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  marginRight: '5px', flexShrink: 0,
                }}>
                  {data[key as keyof InvoiceState] && (
                    <div style={{ width: '7px', height: '7px', backgroundColor: BLUE }} />
                  )}
                </div>
                <span>{label}</span>
              </div>
            ))}
          </div>

          {/* Center: logo + TAX INVOICE badge */}
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            position: 'absolute', left: '50%', transform: 'translateX(-50%)', top: '4px',
          }}>
            <img
              src="/ganesha-logo.png"
              alt="Logo"
              style={{ height: '44px', objectFit: 'contain', marginBottom: '3px' }}
              onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
            />
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{
                backgroundColor: RED, color: WHITE,
                padding: '1px 8px', fontSize: '11px', fontWeight: 'bold',
              }}>TAX INVOICE</span>
              <span style={{ color: RED, fontSize: '11px', fontWeight: 'bold' }}>
                (Form GST INV-1)
              </span>
            </div>
          </div>

          {/* Right: contact */}
          <div style={{ textAlign: 'right', fontSize: '11px', fontWeight: 'bold', color: RED }}>
            <div>Mobile : 9830767268</div>
            <div style={{ marginTop: '2px' }}>E-mail ID : dshaw4626@gmail.com</div>
          </div>
        </div>

        {/* ── Company name block ────────────────────────────────────────────── */}
        <div style={{ textAlign: 'center', marginTop: '8px', marginBottom: '2px' }}>
          <div style={{
            fontSize: '32px', fontWeight: 900, color: BLUE,
            fontFamily: 'Impact, Arial Black, sans-serif', letterSpacing: '-0.5px',
            lineHeight: 1.1,
          }}>
            JAI MA DURGA IRON STORES
          </div>
          <div style={{
            color: RED, fontStyle: 'italic', fontWeight: 'bold',
            fontSize: '12px', marginTop: '2px',
          }}>
            Dealers in : IRON AND STEEL ETC., GENERAL ORDER SUPPLIERS
          </div>
          <div style={{ fontWeight: 'bold', fontSize: '12px', color: BLUE, marginTop: '2px' }}>
            30, I. R. BELILIOUS LANE, HOWRAH - 711 101
            <span style={{ marginLeft: '20px' }}>STATE CODE : 19</span>
          </div>
          {/* GSTIN pill */}
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', marginTop: '5px', gap: '6px' }}>
            <div style={{ width: '60px', height: '1.5px', backgroundColor: RED }} />
            <div style={{
              border: `1px solid ${RED}`, borderRadius: '999px',
              padding: '1px 14px', color: RED, fontWeight: 'bold', fontSize: '11px',
            }}>
              GSTIN : 19ATLPS9664G1ZS
            </div>
            <div style={{ width: '60px', height: '1.5px', backgroundColor: RED }} />
          </div>
        </div>

        {/* ── Invoice / transport details (2 rows × 3 cols) ────────────────── */}
        <div style={{
          padding: '8px 8px 0',
          display: 'grid', gridTemplateColumns: '1fr 1fr 1fr',
          columnGap: '16px', rowGap: '6px',
        }}>
          <div style={{ display: 'flex', alignItems: 'flex-end', height: '22px' }}>
            <span style={{ whiteSpace: 'nowrap', fontSize: '12px', fontWeight: 'bold', color: BLUE }}>Invoice No. &nbsp;:&nbsp;</span>
            <div style={{ borderBottom: DOTTED, flex: 1, height: '22px', position: 'relative' }}>
              <span style={{ position: 'absolute', bottom: '2px', left: '4px', fontSize: '12px', fontWeight: 'bold', color: BLACK, lineHeight: 1, textTransform: 'uppercase' }}>{data.invoiceNo}</span>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end', height: '22px' }}>
            <span style={{ whiteSpace: 'nowrap', fontSize: '12px', fontWeight: 'bold', color: BLUE }}>Order No. &nbsp;:&nbsp;</span>
            <div style={{ borderBottom: DOTTED, flex: 1, height: '22px', position: 'relative' }}>
              <span style={{ position: 'absolute', bottom: '2px', left: '4px', fontSize: '12px', fontWeight: 'bold', color: BLACK, lineHeight: 1 }}>{data.orderNo}</span>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end', height: '22px' }}>
            <span style={{ whiteSpace: 'nowrap', fontSize: '12px', fontWeight: 'bold', color: BLUE }}>Mode of Transport &nbsp;:&nbsp;</span>
            <div style={{ borderBottom: DOTTED, flex: 1, height: '22px', position: 'relative' }}>
              <span style={{ position: 'absolute', bottom: '2px', left: '4px', fontSize: '12px', fontWeight: 'bold', color: BLACK, lineHeight: 1, textTransform: 'capitalize' }}>{data.modeOfTransport}</span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'flex-end', height: '22px' }}>
            <span style={{ whiteSpace: 'nowrap', fontSize: '12px', fontWeight: 'bold', color: BLUE }}>Date &nbsp;:&nbsp;</span>
            <div style={{ borderBottom: DOTTED, flex: 1, height: '22px', position: 'relative' }}>
              <span style={{ position: 'absolute', bottom: '2px', left: '4px', fontSize: '12px', fontWeight: 'bold', color: BLACK, lineHeight: 1 }}>{data.date}</span>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end', height: '22px' }}>
            <span style={{ whiteSpace: 'nowrap', fontSize: '12px', fontWeight: 'bold', color: BLUE }}>Order Date &nbsp;:&nbsp;</span>
            <div style={{ borderBottom: DOTTED, flex: 1, height: '22px', position: 'relative' }}>
              <span style={{ position: 'absolute', bottom: '2px', left: '4px', fontSize: '12px', fontWeight: 'bold', color: BLACK, lineHeight: 1 }}>{data.orderDate}</span>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end', height: '22px' }}>
            <span style={{ whiteSpace: 'nowrap', fontSize: '12px', fontWeight: 'bold', color: BLUE }}>Vehicle No. &nbsp;:&nbsp;</span>
            <div style={{ borderBottom: DOTTED, flex: 1, height: '22px', position: 'relative' }}>
              <span style={{ position: 'absolute', bottom: '2px', left: '4px', fontSize: '12px', fontWeight: 'bold', color: BLACK, lineHeight: 1, textTransform: 'uppercase' }}>{data.vehicleNo}</span>
            </div>
          </div>
        </div>

        {/* ── Consignee / Ship-To ───────────────────────────────────────────── */}
        <div style={{
          marginTop: '8px',
          display: 'grid', gridTemplateColumns: '1fr 1fr',
          borderTop: BORDER, borderBottom: BORDER,
        }}>
          {/* Consignee */}
          <div style={{ borderRight: BORDER }}>
            <div style={{
              backgroundColor: LIGHT, textAlign: 'center',
              fontWeight: 'bold', fontSize: '12px', color: BLUE,
              padding: '3px 0', borderBottom: BORDER,
            }}>Details of Consignee</div>
            <div style={{ padding: '6px 8px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <Field label="Name"    value={data.consigneeName} textTransform="capitalize" />
              <AddressFields address={data.consigneeAddress} />
              <div style={{ display: 'flex', alignItems: 'flex-end', height: '22px', gap: '4px' }}>
                <Field label="State" value={data.consigneeState} flex={2} textTransform="capitalize" />
                <span style={{ fontSize: '12px', fontWeight: 'bold', color: BLUE, whiteSpace: 'nowrap', marginBottom: '2px' }}>State Code :</span>
                <div style={{ borderBottom: DOTTED, width: '36px', height: '22px', position: 'relative' }}>
                  <span style={{ position: 'absolute', bottom: '2px', left: '2px', fontSize: '12px', fontWeight: 'bold', color: BLACK, lineHeight: 1 }}>{data.consigneeStateCode}</span>
                </div>
              </div>
              <Field label="GSTIN" value={data.consigneeGst} textTransform="uppercase" />
            </div>
          </div>

          {/* Ship To */}
          <div>
            <div style={{
              backgroundColor: LIGHT, textAlign: 'center',
              fontWeight: 'bold', fontSize: '12px', color: BLUE,
              padding: '3px 0', borderBottom: BORDER,
            }}>Details of Ship to Party</div>
            <div style={{ padding: '6px 8px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <Field label="Name"    value={data.shipToName} textTransform="capitalize" />
              <AddressFields address={data.shipToAddress} />
              <div style={{ display: 'flex', alignItems: 'flex-end', height: '22px', gap: '4px' }}>
                <Field label="State" value={data.shipToState} flex={2} textTransform="capitalize" />
                <span style={{ fontSize: '12px', fontWeight: 'bold', color: BLUE, whiteSpace: 'nowrap', marginBottom: '2px' }}>State Code :</span>
                <div style={{ borderBottom: DOTTED, width: '36px', height: '22px', position: 'relative' }}>
                  <span style={{ position: 'absolute', bottom: '2px', left: '2px', fontSize: '12px', fontWeight: 'bold', color: BLACK, lineHeight: 1 }}>{data.shipToStateCode}</span>
                </div>
              </div>
              <Field label="GSTIN" value={data.shipToGst} textTransform="uppercase" />
            </div>
          </div>
        </div>

        {/* ── Goods Table ───────────────────────────────────────────────────── */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', borderBottom: BORDER, position: 'relative', overflow: 'hidden' }}>
          {/* Table header */}
          <div style={{
            display: 'flex', backgroundColor: LIGHT,
            borderBottom: BORDER, fontWeight: 'bold',
            fontSize: '12px', textAlign: 'center', color: BLUE, flexShrink: 0,
          }}>
            {[
              { w: '38px',  label: 'Sl.\nNo.' },
              { w: 'flex',  label: 'Description of Goods' },
              { w: '76px',  label: 'HSN\nCODE' },
              { w: '76px',  label: 'Qnty. /\nWeight' },
              { w: '76px',  label: 'Rate\n(Per Kg.)' },
              { w: '100px', label: 'Amount' },
            ].map(({ w, label }, i, arr) => (
              <div key={i} style={{
                width: w === 'flex' ? undefined : w,
                flex: w === 'flex' ? 1 : undefined,
                padding: '6px 4px',
                borderRight: i < arr.length - 1 ? BORDER : 'none',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                whiteSpace: 'pre-line', lineHeight: '1.3', boxSizing: 'border-box',
              }}>
                {label}
              </div>
            ))}
          </div>

          {/* Column borders (full height) */}
          <div style={{ position: 'absolute', top: '0', left: '0', right: '0', bottom: '0', display: 'flex', pointerEvents: 'none' }}>
            <div style={{ width: '38px',  borderRight: BORDER }} />
            <div style={{ flex: 1,        borderRight: BORDER }} />
            <div style={{ width: '76px',  borderRight: BORDER }} />
            <div style={{ width: '76px',  borderRight: BORDER }} />
            <div style={{ width: '76px',  borderRight: BORDER }} />
            <div style={{ width: '100px' }} />
          </div>

          {/* Item rows */}
          <div style={{ position: 'relative', zIndex: 1 }}>
            {data.items.map((item, i) => {
              const amt = Number(item.quantity || 0) * Number(item.rate || 0);
              return (
                <div key={item.id} style={{
                  display: 'flex', fontSize: '12px', fontWeight: 'bold', color: BLACK,
                  borderBottom: i < data.items.length - 1 ? `1px solid #c7d8f5` : 'none',
                  padding: '5px 0',
                }}>
                  <div style={{ width: '38px',  textAlign: 'center' }}>{i + 1}</div>
                  <div style={{ flex: 1,        paddingLeft: '6px', paddingRight: '4px', textTransform: 'uppercase' }}>{item.description}</div>
                  <div style={{ width: '76px',  textAlign: 'center' }}>{item.hsn}</div>
                  <div style={{ width: '76px',  textAlign: 'center' }}>{item.quantity ? `${item.quantity} Kg.` : ''}</div>
                  <div style={{ width: '76px',  textAlign: 'center' }}>{item.rate ? Number(item.rate).toFixed(2) : ''}</div>
                  <div style={{ width: '100px', textAlign: 'right', paddingRight: '6px', boxSizing: 'border-box' }}>{fmt(amt)}</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Footer ───────────────────────────────────────────────────────── */}
        <div style={{ display: 'flex' }}>

          {/* Left: amount in words + T&C */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', borderRight: BORDER }}>
            <div style={{ padding: '6px 8px 4px' }}>
              <div style={{ fontSize: '12px', fontWeight: 'bold', color: BLUE, marginBottom: '4px' }}>
                Total Invoice Amount in Words :
              </div>
              <div style={{ position: 'relative', minHeight: '52px' }}>
                <div style={{ position: 'absolute', top: '20px', left: 0, right: 0, borderBottom: DOTTED }} />
                <div style={{ position: 'absolute', top: '44px', left: 0, right: 0, borderBottom: DOTTED }} />
                <div style={{
                  position: 'absolute', top: 0, left: '4px', right: '4px',
                  fontSize: '13px', fontWeight: 'bold', color: BLACK,
                  textTransform: 'uppercase', lineHeight: '24px', letterSpacing: '0.02em',
                }}>
                  {words}
                </div>
              </div>
            </div>

            <div style={{ marginTop: 'auto' }}>
              <div style={{
                backgroundColor: BLUE, color: WHITE,
                fontWeight: 'bold', fontSize: '11px',
                display: 'inline-block',
                padding: '2px 8px', margin: '6px 0 0 6px',
              }}>Terms and Conditions</div>
              <div style={{
                padding: '3px 8px 6px', fontSize: '9px',
                color: BLUE, lineHeight: '1.4',
              }}>
                <div>The amount indicated represent the price actually charged and the</div>
                <div>there is no flow of additional consideration directly or indirectly</div>
                <div>from the buyers. *Interest @ 24% per annum will be charged</div>
                <div>extra if bill is not paid within 15 Days.</div>
              </div>
              <div style={{
                backgroundColor: LIGHT, textAlign: 'center',
                fontWeight: 'bold', fontSize: '11px', color: BLUE,
                padding: '4px 0', borderTop: BORDER,
              }}>
                SUBJECT TO HOWRAH JURISDICTION
              </div>
            </div>
          </div>

          {/* Right: totals + signature */}
          <div style={{ width: '230px', display: 'flex', flexDirection: 'column', fontWeight: 'bold', fontSize: '12px' }}>

            {/* ── Totals table — uses <table> for guaranteed print border rendering ── */}
            <table style={{
              width: '100%',
              borderCollapse: 'collapse',
              fontSize: '12px',
              fontWeight: 'bold',
            }}>
              <tbody>
                {[
                  { label: 'Total',                value: fmt(totalAmount) },
                  { label: 'Freight / Loading',    value: fmt(freight) },
                  ...(data.cgstRate > 0 ? [{ label: `CGST ${data.cgstRate}%`, value: fmt(cgstAmt) }] : []),
                  ...(data.sgstRate > 0 ? [{ label: `SGST ${data.sgstRate}%`, value: fmt(sgstAmt) }] : []),
                  ...(data.igstRate > 0 ? [{ label: `IGST ${data.igstRate}%`, value: fmt(igstAmt) }] : []),
                  { label: 'Total Tax Amount',     value: fmt(totalTax) },
                  { label: 'Rounded Off',          value: roundedOff !== 0 ? roundedOff.toFixed(2) : '' },
                ].map(({ label, value }) => (
                  <tr key={label}>
                    <td style={{
                      padding: '3px 8px', color: BLUE,
                      border: `1px solid ${BLUE}`,
                    }}>{label}</td>
                    <td style={{
                      padding: '3px 8px', color: BLACK,
                      textAlign: 'right', width: '85px',
                      border: `1px solid ${BLUE}`,
                    }}>{value}</td>
                  </tr>
                ))}
                {/* Highlighted total row */}
                <tr style={{ backgroundColor: LIGHT }}>
                  <td style={{
                    padding: '3px 8px', color: BLUE,
                    border: `1px solid ${BLUE}`,
                  }}>Total Amount After Tax</td>
                  <td style={{
                    padding: '3px 8px', color: BLACK,
                    textAlign: 'right', width: '85px',
                    border: `1px solid ${BLUE}`,
                  }}>{finalAmt > 0 ? finalAmt.toFixed(2) : ''}</td>
                </tr>
              </tbody>
            </table>

            {/* Signature */}
            <div style={{
              flex: 1, padding: '8px 6px 6px',
              display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
              textAlign: 'center', minHeight: '80px',
            }}>
              <div>
                <div style={{ fontSize: '9px', color: BLUE, lineHeight: '1.4' }}>
                  Certified that the particulars given above are true and correct.
                </div>
                <div style={{ fontSize: '11px', fontWeight: 'bold', color: BLUE, marginTop: '6px' }}>
                  For JAI MA DURGA IRON STORES
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                <span style={{ fontSize: '9px', color: BLUE }}>[E&amp;OE]</span>
                <span style={{ fontSize: '10px', color: BLUE }}>Authorised Signatory</span>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
});

InvoiceTemplate.displayName = 'InvoiceTemplate';
export default InvoiceTemplate;
