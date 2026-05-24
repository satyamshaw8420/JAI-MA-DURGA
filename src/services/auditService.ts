import { collection, addDoc, serverTimestamp, query, where, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { AuditAction, AuditLog } from '@/types';

const COLLECTION = 'audit_logs';

export function logAudit(
  action: AuditAction,
  userId: string,
  userEmail: string,
  partyId: string | null,
  before: unknown | null,
  after: unknown | null
) {
  addDoc(collection(db, COLLECTION), {
    action, userId, userEmail, partyId,
    before: before || null,
    after: after || null,
    timestamp: serverTimestamp(),
  }).catch(console.warn);
}

export function subscribeToRecentActivity(
  userId: string,
  count: number,
  onData: (logs: AuditLog[]) => void
) {
  const q = query(
    collection(db, COLLECTION),
    where('userId', '==', userId)
  );
  return onSnapshot(q, (snapshot) => {
    let logs: AuditLog[] = snapshot.docs.map((d) => {
      const data = d.data();
      return {
        id: d.id, action: data.action, userId: data.userId,
        userEmail: data.userEmail, partyId: data.partyId || null,
        before: data.before, after: data.after,
        timestamp: data.timestamp?.toDate?.()?.toISOString() || new Date().toISOString(),
      };
    });
    
    // Sort locally (newest first) to avoid composite index requirement
    logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    
    // Limit locally
    logs = logs.slice(0, count);
    
    onData(logs);
  });
}
