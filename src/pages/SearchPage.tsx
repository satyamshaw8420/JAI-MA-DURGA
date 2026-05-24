import { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { usePartyStore } from '@/store/partyStore';
import { subscribeToParties } from '@/services/partyService';
import { getAllLedgersForUser } from '@/services/ledgerService';
import { formatCurrency, getInitials } from '@/lib/utils';
import type { Party, Ledger, LedgerRow } from '@/types';
import { Search as SearchIcon, ArrowRight, Star, Package, IndianRupee, Phone, Hash } from 'lucide-react';
import dayjs from 'dayjs';

type MatchSource = 'party_name' | 'party_phone' | 'item' | 'amount' | 'paid' | 'notes' | 'size' | 'mode';

interface SearchResult {
  party: Party;
  matchSources: MatchSource[];
  matchedRows: Array<{ row: LedgerRow; matchSources: MatchSource[] }>;
  score: number; // higher = more relevant
}

function highlight(text: string, query: string): React.ReactNode {
  if (!query.trim() || !text) return text;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return text;
  return (
    <>
      {text.slice(0, idx)}
      <mark style={{ background: '#fef08a', color: '#713f12', borderRadius: 0, padding: '0 2px', fontWeight: 700 }}>
        {text.slice(idx, idx + query.length)}
      </mark>
      {text.slice(idx + query.length)}
    </>
  );
}

const SOURCE_LABELS: Record<MatchSource, { label: string; color: string; bg: string }> = {
  party_name:  { label: 'Name',        color: '#1d4ed8', bg: '#dbeafe' },
  party_phone: { label: 'Phone',       color: '#6d28d9', bg: '#ede9fe' },
  item:        { label: 'Item',        color: '#0f766e', bg: '#ccfbf1' },
  amount:      { label: 'Sale Amt',    color: '#b45309', bg: '#fef3c7' },
  paid:        { label: 'Paid Amt',    color: '#15803d', bg: '#dcfce7' },
  notes:       { label: 'Notes',       color: '#475569', bg: '#f1f5f9' },
  size:        { label: 'Size',        color: '#0369a1', bg: '#e0f2fe' },
  mode:        { label: 'Pay Mode',    color: '#7c3aed', bg: '#f5f3ff' },
};

export default function SearchPage() {
  const { user } = useAuth();
  const { parties, setParties, setLoading, addRecentPartyId } = usePartyStore();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [ledgers, setLedgers] = useState<Ledger[]>([]);
  const [ledgersLoading, setLedgersLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!user) return;
    const unsub = subscribeToParties(
      user.uid,
      (data) => { setParties(data); setLoading(false); },
      console.error
    );
    return unsub;
  }, [user, setParties, setLoading]);

  // Fetch all ledgers once
  useEffect(() => {
    if (!user) return;
    setLedgersLoading(true);
    getAllLedgersForUser(user.uid)
      .then(data => { setLedgers(data); setLedgersLoading(false); })
      .catch(() => setLedgersLoading(false));
  }, [user]);

  // Focus input on mount
  useEffect(() => { inputRef.current?.focus(); }, []);

  const results: SearchResult[] = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];

    const resultsMap = new Map<string, SearchResult>();

    parties.forEach(party => {
      const partyMatchSources: MatchSource[] = [];
      let score = 0;

      if (party.name.toLowerCase().includes(q)) {
        partyMatchSources.push('party_name');
        score += party.name.toLowerCase().startsWith(q) ? 10 : 5;
      }
      if (party.phone && party.phone.includes(q)) {
        partyMatchSources.push('party_phone');
        score += 4;
      }

      // Find matching rows in this party's ledger
      const ledger = ledgers.find(l => l.partyId === party.id);
      const matchedRows: SearchResult['matchedRows'] = [];

      if (ledger) {
        ledger.rows.forEach(row => {
          const rowSources: MatchSource[] = [];

          if (row.itemName && row.itemName.toLowerCase().includes(q)) {
            rowSources.push('item'); score += 3;
          }
          if (row.size && row.size.toLowerCase().includes(q)) {
            rowSources.push('size'); score += 3;
          }
          if (row.notes && row.notes.toLowerCase().includes(q)) {
            rowSources.push('notes'); score += 2;
          }
          if (row.paymentMode && row.paymentMode.toLowerCase().includes(q)) {
            rowSources.push('mode'); score += 1;
          }
          // Amount match (search "1000" → find rows with amount near 1000)
          const numQ = parseFloat(q);
          if (!isNaN(numQ)) {
            if (row.amount && Math.abs(row.amount - numQ) < 1) {
              rowSources.push('amount'); score += 4;
            }
            if (row.paid && Math.abs(row.paid - numQ) < 1) {
              rowSources.push('paid'); score += 4;
            }
            // also match if the string representation includes the query
            if (row.amount && row.amount.toString().includes(q)) {
              if (!rowSources.includes('amount')) rowSources.push('amount');
              score += 2;
            }
            if (row.paid && row.paid.toString().includes(q)) {
              if (!rowSources.includes('paid')) rowSources.push('paid');
              score += 2;
            }
          }

          if (rowSources.length > 0) {
            matchedRows.push({ row, matchSources: rowSources });
          }
        });
      }

      if (partyMatchSources.length > 0 || matchedRows.length > 0) {
        resultsMap.set(party.id, {
          party,
          matchSources: partyMatchSources,
          matchedRows: matchedRows.sort((a, b) => dayjs(b.row.date).diff(dayjs(a.row.date))).slice(0, 4),
          score,
        });
      }
    });

    return Array.from(resultsMap.values()).sort((a, b) => b.score - a.score);
  }, [query, parties, ledgers]);

  const cardStyle: React.CSSProperties = {
    background: 'var(--card)',
    border: '1px solid var(--border)',
    borderRadius: 0,
  };

  return (
    <div className="p-4 md:p-6 lg:p-8 animate-fade-in" style={{ maxWidth: '900px', margin: '0 auto' }}>

      {/* Title */}
      <div style={{ marginBottom: '20px' }}>
        <h1 style={{ color: 'var(--foreground)', fontSize: '22px', fontWeight: 800, letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <SearchIcon className="w-5 h-5" /> Search
        </h1>
        <p style={{ color: 'var(--muted-foreground)', fontSize: '12px', marginTop: '4px' }}>
          Search by party name, phone, item name, size, amount, paid, mode, notes — anything.
        </p>
      </div>

      {/* Search Input */}
      <div style={{ position: 'relative', marginBottom: '20px' }}>
        <SearchIcon style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', width: '16px', height: '16px', color: 'var(--muted-foreground)', pointerEvents: 'none' }} />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Try: 'dinesh', '100×35', '5103', 'UPI', 'ms plate'..."
          style={{
            width: '100%',
            paddingLeft: '44px',
            paddingRight: '16px',
            paddingTop: '14px',
            paddingBottom: '14px',
            border: '2px solid #1e3a5f',
            borderRadius: 0,
            fontSize: '14px',
            fontWeight: 500,
            background: 'var(--card)',
            color: 'var(--foreground)',
            outline: 'none',
          }}
        />
        {query && (
          <button
            onClick={() => setQuery('')}
            style={{
              position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)',
              background: '#e2e8f0', border: 'none', width: '20px', height: '20px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', fontSize: '12px', color: '#64748b', borderRadius: 0,
            }}
          >✕</button>
        )}
      </div>

      {/* Loading */}
      {ledgersLoading && (
        <p style={{ color: 'var(--muted-foreground)', fontSize: '12px', marginBottom: '12px' }}>
          Loading ledger data...
        </p>
      )}

      {/* No query state — show all parties */}
      {!query.trim() && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <p style={{ color: 'var(--muted-foreground)', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '4px' }}>
            All Parties ({parties.length})
          </p>
          {parties.map(party => (
            <div
              key={party.id}
              onClick={() => { addRecentPartyId(party.id); navigate(`/parties/${party.id}`); }}
              style={{ ...cardStyle, display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', cursor: 'pointer' }}
              className="hover:border-blue-300 transition-colors"
            >
              <div style={{
                width: '40px', height: '40px', borderRadius: 0, flexShrink: 0,
                background: 'linear-gradient(135deg, #1e3a5f, #334e68)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'white', fontWeight: 800, fontSize: '14px',
              }}>
                {getInitials(party.name)}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ color: 'var(--foreground)', fontSize: '14px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
                  {party.name}
                  {party.isFavorite && <Star className="w-3 h-3 text-amber-400 fill-amber-400" />}
                </p>
                {party.phone && <p style={{ color: 'var(--muted-foreground)', fontSize: '11px', marginTop: '1px' }}>{party.phone}</p>}
              </div>
              <p style={{ fontSize: '13px', fontWeight: 800, color: party.totalDue > 0 ? '#dc2626' : '#16a34a', flexShrink: 0 }}>
                {formatCurrency(party.totalDue)}
              </p>
              <ArrowRight style={{ width: '14px', height: '14px', color: 'var(--muted-foreground)', flexShrink: 0 }} />
            </div>
          ))}
        </div>
      )}

      {/* No Results */}
      {query.trim() && results.length === 0 && !ledgersLoading && (
        <div style={{ ...cardStyle, padding: '48px 24px', textAlign: 'center' }}>
          <SearchIcon style={{ width: '32px', height: '32px', color: '#cbd5e1', margin: '0 auto 12px' }} />
          <p style={{ color: 'var(--foreground)', fontSize: '14px', fontWeight: 700 }}>No results found</p>
          <p style={{ color: 'var(--muted-foreground)', fontSize: '12px', marginTop: '6px' }}>
            Try searching for a name, phone number, item like "ms plate", or an amount like "5000".
          </p>
        </div>
      )}

      {/* Results */}
      {query.trim() && results.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <p style={{ color: 'var(--muted-foreground)', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '4px' }}>
            {results.length} result{results.length !== 1 ? 's' : ''} found
          </p>

          {results.map(result => (
            <div key={result.party.id} style={cardStyle}>
              
              {/* Party Header Row */}
              <div
                onClick={() => { addRecentPartyId(result.party.id); navigate(`/parties/${result.party.id}`); }}
                style={{
                  display: 'flex', alignItems: 'center', gap: '12px',
                  padding: '14px 16px',
                  borderBottom: result.matchedRows.length > 0 ? '1px solid var(--border)' : 'none',
                  cursor: 'pointer',
                  background: result.matchSources.length > 0 ? '#f8fafc' : 'transparent',
                }}
                className="hover:bg-slate-100 transition-colors"
              >
                <div style={{
                  width: '40px', height: '40px', borderRadius: 0, flexShrink: 0,
                  background: 'linear-gradient(135deg, #1e3a5f, #334e68)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: 'white', fontWeight: 800, fontSize: '14px',
                }}>
                  {getInitials(result.party.name)}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ color: 'var(--foreground)', fontSize: '14px', fontWeight: 700, display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '6px' }}>
                    {highlight(result.party.name, query)}
                    {result.party.isFavorite && <Star className="w-3 h-3 text-amber-400 fill-amber-400" />}
                    {/* Match source badges on party level */}
                    {result.matchSources.map(src => (
                      <span key={src} style={{
                        padding: '1px 6px', fontSize: '9px', fontWeight: 800,
                        textTransform: 'uppercase', letterSpacing: '0.08em',
                        background: SOURCE_LABELS[src].bg, color: SOURCE_LABELS[src].color,
                        border: `1px solid ${SOURCE_LABELS[src].bg}`,
                      }}>
                        {SOURCE_LABELS[src].label}
                      </span>
                    ))}
                  </p>
                  <div style={{ display: 'flex', gap: '12px', marginTop: '3px', flexWrap: 'wrap' }}>
                    {result.party.phone && (
                      <span style={{ color: 'var(--muted-foreground)', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '3px' }}>
                        <Phone className="w-3 h-3" />{highlight(result.party.phone, query)}
                      </span>
                    )}
                    <span style={{ color: 'var(--muted-foreground)', fontSize: '11px' }}>
                      Due: <strong style={{ color: result.party.totalDue > 0 ? '#dc2626' : '#16a34a' }}>{formatCurrency(result.party.totalDue)}</strong>
                    </span>
                    {result.matchedRows.length > 0 && (
                      <span style={{ color: 'var(--muted-foreground)', fontSize: '11px' }}>
                        {result.matchedRows.length} matching entr{result.matchedRows.length > 1 ? 'ies' : 'y'}
                      </span>
                    )}
                  </div>
                </div>
                <ArrowRight style={{ width: '14px', height: '14px', color: 'var(--muted-foreground)', flexShrink: 0 }} />
              </div>

              {/* Matched Ledger Rows */}
              {result.matchedRows.length > 0 && (
                <div>
                  {result.matchedRows.map(({ row, matchSources }) => (
                    <div
                      key={row.id}
                      onClick={() => { addRecentPartyId(result.party.id); navigate(`/parties/${result.party.id}`); }}
                      style={{
                        display: 'flex', alignItems: 'flex-start', gap: '12px',
                        padding: '10px 16px 10px 20px',
                        borderBottom: '1px solid var(--border)',
                        cursor: 'pointer',
                        borderLeft: '3px solid #e2e8f0',
                      }}
                      className="hover:bg-blue-50 hover:border-l-blue-400 transition-colors"
                    >
                      {/* Type icon */}
                      <div style={{
                        width: '30px', height: '30px', flexShrink: 0,
                        background: matchSources.includes('paid') ? '#ecfdf5' : '#eff6ff',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        {matchSources.includes('paid')
                          ? <IndianRupee style={{ width: '14px', height: '14px', color: '#16a34a' }} />
                          : <Package style={{ width: '14px', height: '14px', color: '#3b82f6' }} />}
                      </div>

                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                          <p style={{ color: 'var(--foreground)', fontSize: '12px', fontWeight: 700 }}>
                            {highlight(row.itemName || '—', query)}
                          </p>
                          {row.size && (
                            <span style={{ color: '#64748b', fontSize: '11px' }}>
                              {highlight(row.size, query)}
                            </span>
                          )}
                          {row.quantity && (
                            <span style={{ color: '#64748b', fontSize: '11px' }}>Qty: {row.quantity}</span>
                          )}
                          {/* Match source mini-badges */}
                          {matchSources.map(src => (
                            <span key={src} style={{
                              padding: '1px 5px', fontSize: '8px', fontWeight: 800,
                              textTransform: 'uppercase', letterSpacing: '0.06em',
                              background: SOURCE_LABELS[src].bg, color: SOURCE_LABELS[src].color,
                            }}>
                              {SOURCE_LABELS[src].label}
                            </span>
                          ))}
                        </div>
                        <div style={{ display: 'flex', gap: '12px', marginTop: '3px', flexWrap: 'wrap' }}>
                          <span style={{ color: 'var(--muted-foreground)', fontSize: '10px' }}>
                            {dayjs(row.date).format('DD MMM YYYY')}
                          </span>
                          {row.amount != null && row.amount > 0 && (
                            <span style={{ fontSize: '10px', color: '#0f172a', fontWeight: 700 }}>
                              Sale: {highlight(formatCurrency(row.amount), query)}
                            </span>
                          )}
                          {row.paid != null && row.paid > 0 && (
                            <span style={{ fontSize: '10px', color: '#16a34a', fontWeight: 700 }}>
                              Paid: {highlight(formatCurrency(row.paid), query)}
                            </span>
                          )}
                          {row.notes && (
                            <span style={{ color: '#64748b', fontSize: '10px', fontStyle: 'italic' }}>
                              "{highlight(row.notes, query)}"
                            </span>
                          )}
                          {row.paymentMode && (
                            <span style={{ fontSize: '9px', fontWeight: 700, textTransform: 'uppercase', color: '#7c3aed' }}>
                              {highlight(row.paymentMode, query)}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

            </div>
          ))}
        </div>
      )}

      {/* Bottom spacer */}
      <div style={{ height: '60px' }} />
    </div>
  );
}
