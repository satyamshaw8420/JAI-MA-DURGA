import { usePartyStore } from '@/store/partyStore';
import dayjs from 'dayjs';
import { Bell, MessageSquare, Phone, IndianRupee, AlertCircle, Calendar } from 'lucide-react';
import type { Party } from '@/types';

export default function RemindersPage() {
  const { parties } = usePartyStore();

  // Helper to determine the baseline date for overdue calculation
  const getOverdueBaseDate = (party: Party): Date => {
    if (party.lastPaymentDate) return new Date(party.lastPaymentDate);
    if (party.lastTransactionDate) return new Date(party.lastTransactionDate);
    return new Date(party.createdAt);
  };

  const now = dayjs();

  // Filter parties to find those > 30 days overdue
  const overdueParties = parties
    .filter(p => p.totalDue > 0)
    .map(p => {
      const baseDate = getOverdueBaseDate(p);
      const daysOverdue = now.diff(dayjs(baseDate), 'day');
      return { party: p, daysOverdue, baseDate };
    })
    .filter(item => item.daysOverdue > 30)
    .sort((a, b) => b.daysOverdue - a.daysOverdue); // sort by most overdue first

  // Generate WhatsApp Link
  const getWhatsAppLink = (party: Party, daysOverdue: number, baseDate: Date) => {
    let phone = party.phone || '';
    // Remove non-numeric characters except +
    phone = phone.replace(/[^\d+]/g, '');

    // Format to E.164 if it's a 10 digit Indian number
    if (phone.length === 10 && !phone.startsWith('+')) {
      phone = `+91${phone}`;
    }

    const dateStr = dayjs(baseDate).format('DD MMM, YYYY');
    const message = `Hello ${party.name},\n\nThis is a gentle reminder from Jai Ma Durga Iron Stores that an amount of ₹${party.totalDue.toLocaleString('en-IN')} is pending since ${dateStr} (${daysOverdue} days).\n\nPlease clear it at your earliest convenience.\n\nThank you!`;
    
    return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <div className="w-14 h-14 rounded-2xl bg-red-100 flex items-center justify-center text-red-600 shadow-sm border border-red-200 shrink-0">
          <Bell className="w-7 h-7" />
        </div>
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[var(--foreground)] tracking-tight">Overdue Reminders</h1>
          <p className="text-sm text-[var(--muted-foreground)] mt-1 font-medium">
            Customers with pending payments older than 30 days
          </p>
        </div>
      </div>

      {/* Stats/Summary */}
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-5 sm:p-6 shadow-sm flex flex-col sm:flex-row gap-6 justify-between items-start sm:items-center">
        <div>
          <p className="text-sm font-semibold text-[var(--muted-foreground)] uppercase tracking-wider">Total Overdue Amount</p>
          <div className="flex items-center gap-1 mt-1 text-red-600">
            <IndianRupee className="w-7 h-7" />
            <span className="text-3xl sm:text-4xl font-extrabold tracking-tight">
              {overdueParties.reduce((sum, item) => sum + item.party.totalDue, 0).toLocaleString('en-IN')}
            </span>
          </div>
        </div>
        <div className="bg-red-50 text-red-700 px-5 py-2.5 rounded-xl font-bold border border-red-100 flex items-center gap-2 text-sm sm:text-base">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{overdueParties.length} Parties need reminders</span>
        </div>
      </div>

      {/* List */}
      {overdueParties.length === 0 ? (
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-3xl p-12 text-center shadow-sm flex flex-col items-center justify-center min-h-[300px]">
          <div className="w-24 h-24 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-6 border border-green-100">
            <Bell className="w-12 h-12 text-green-500" />
          </div>
          <h3 className="text-2xl font-extrabold text-[var(--foreground)] mb-3 tracking-tight">No Overdue Payments!</h3>
          <p className="text-[var(--muted-foreground)] max-w-md mx-auto text-base">
            Awesome! None of your customers have payments pending for more than 30 days. Your cash flow is looking great.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
          {overdueParties.map(({ party, daysOverdue, baseDate }, index) => (
            <div 
              key={party.id} 
              className="bg-[var(--card)] border border-[var(--border)] rounded-2xl overflow-hidden hover-lift shadow-sm flex flex-col"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <div className="p-5 flex-1 flex flex-col">
                <div className="flex justify-between items-start mb-5 gap-3">
                  <h3 className="font-extrabold text-[var(--foreground)] text-lg leading-tight line-clamp-2">{party.name}</h3>
                  <div className="bg-red-50 text-red-700 text-xs font-bold px-2.5 py-1.5 rounded-lg border border-red-100 shrink-0 uppercase tracking-wider">
                    {daysOverdue} Days
                  </div>
                </div>

                <div className="space-y-4 mt-auto">
                  <div className="flex items-center justify-between p-3.5 bg-red-50/50 rounded-xl border border-red-100/50">
                    <span className="text-sm font-bold text-slate-700">Amount Due</span>
                    <span className="font-extrabold text-red-600 flex items-center text-xl tracking-tight">
                      <IndianRupee className="w-5 h-5 mr-0.5" />
                      {party.totalDue.toLocaleString('en-IN')}
                    </span>
                  </div>

                  <div className="flex flex-col gap-2.5">
                    {party.phone && (
                      <div className="flex items-center gap-3 text-sm text-[var(--muted-foreground)] font-medium">
                        <div className="w-8 h-8 rounded-full bg-[var(--secondary)] flex items-center justify-center shrink-0">
                          <Phone className="w-4 h-4 text-slate-500" />
                        </div>
                        <span className="truncate">{party.phone}</span>
                      </div>
                    )}

                    <div className="flex items-center gap-3 text-sm text-[var(--muted-foreground)] font-medium">
                      <div className="w-8 h-8 rounded-full bg-[var(--secondary)] flex items-center justify-center shrink-0">
                        <Calendar className="w-4 h-4 text-slate-500" />
                      </div>
                      <span className="truncate">Since <span className="font-bold text-[var(--foreground)]">{dayjs(baseDate).format('DD MMM, YYYY')}</span></span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="p-4 bg-[var(--secondary)] border-t border-[var(--border)] mt-auto">
                <a
                  href={getWhatsAppLink(party, daysOverdue, baseDate)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={!party.phone ? "pointer-events-none opacity-50 block" : "block"}
                >
                  <button
                    disabled={!party.phone}
                    className="w-full py-3 bg-[#25D366] hover:bg-[#20bd5a] text-white rounded-xl font-bold flex items-center justify-center gap-2.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_4px_14px_rgba(37,211,102,0.3)] hover:shadow-[0_6px_20px_rgba(37,211,102,0.4)] hover:-translate-y-0.5"
                  >
                    <MessageSquare className="w-5 h-5" />
                    {party.phone ? 'Send WhatsApp Reminder' : 'No Phone Number'}
                  </button>
                </a>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
