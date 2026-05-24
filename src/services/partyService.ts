import {
  collection,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  where,
  orderBy,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { localDb } from '@/lib/dexie';
import type { Party, PartyFormData } from '@/types';
import { generateId } from '@/lib/utils';
import { logAudit } from './auditService';

const COLLECTION = 'parties';

export function subscribeToParties(
  userId: string,
  onData: (parties: Party[]) => void,
  onError: (error: Error) => void
) {
  const q = query(
    collection(db, COLLECTION),
    where('userId', '==', userId)
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      // Sort locally to avoid Firestore composite index requirement
      docs.sort((a: any, b: any) => (a.name || '').localeCompare(b.name || ''));

      const parties: Party[] = docs.map((data: any) => {
        return {
          id: data.id,
          userId: data.userId,
          name: data.name,
          phone: data.phone || null,
          notes: data.notes || null,
          isFavorite: data.isFavorite || false,
          totalSold: data.totalSold || 0,
          totalPaid: data.totalPaid || 0,
          totalDue: data.totalDue || 0,
          lastTransactionDate: data.lastTransactionDate?.toDate?.()?.toISOString() || data.lastTransactionDate || null,
          lastPaymentDate: data.lastPaymentDate?.toDate?.()?.toISOString() || data.lastPaymentDate || null,
          createdAt: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
          updatedAt: data.updatedAt?.toDate?.()?.toISOString() || new Date().toISOString(),
        };
      });
      onData(parties);
      // Mirror to IndexedDB
      localDb.parties.bulkPut(parties).catch(console.warn);
    },
    onError
  );
}

export async function addParty(
  userId: string,
  userEmail: string,
  data: PartyFormData
): Promise<Party> {
  const id = generateId();
  const now = new Date().toISOString();

  const party: Party = {
    id,
    userId,
    name: data.name.trim(),
    phone: data.phone?.trim() || null,
    notes: data.notes?.trim() || null,
    isFavorite: false,
    totalSold: 0,
    totalPaid: 0,
    totalDue: 0,
    lastTransactionDate: null,
    lastPaymentDate: null,
    createdAt: now,
    updatedAt: now,
  };

  const firestoreData = {
    ...party,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  await setDoc(doc(db, COLLECTION, id), firestoreData);

  // Cache locally
  await localDb.parties.put(party);

  // Audit
  logAudit('PARTY_CREATED', userId, userEmail, id, null, { name: party.name });

  return party;
}

export async function updateParty(
  userId: string,
  userEmail: string,
  partyId: string,
  data: Partial<PartyFormData>,
  before?: Partial<Party>
) {
  const updateData: Record<string, unknown> = {
    ...data,
    updatedAt: serverTimestamp(),
  };

  if (data.name) updateData.name = data.name.trim();
  if (data.phone !== undefined) updateData.phone = data.phone?.trim() || null;
  if (data.notes !== undefined) updateData.notes = data.notes?.trim() || null;

  await updateDoc(doc(db, COLLECTION, partyId), updateData);

  // Update local cache
  await localDb.parties.update(partyId, {
    ...data,
    updatedAt: new Date().toISOString(),
  });

  logAudit('PARTY_UPDATED', userId, userEmail, partyId, before, data);
}

export async function deleteParty(
  userId: string,
  userEmail: string,
  partyId: string,
  partyName: string
) {
  await deleteDoc(doc(db, COLLECTION, partyId));
  await localDb.parties.delete(partyId);

  // Also delete associated ledger
  await deleteDoc(doc(db, 'ledgers', partyId)).catch(() => {});
  await localDb.ledgers.delete(partyId);

  logAudit('PARTY_DELETED', userId, userEmail, partyId, { name: partyName }, null);
}

export async function toggleFavorite(partyId: string, current: boolean) {
  await updateDoc(doc(db, COLLECTION, partyId), {
    isFavorite: !current,
    updatedAt: serverTimestamp(),
  });
  await localDb.parties.update(partyId, { isFavorite: !current });
}

export async function updatePartyTotals(
  partyId: string,
  totals: {
    totalSold: number;
    totalPaid: number;
    totalDue: number;
    lastTransactionDate: string | null;
    lastPaymentDate: string | null;
  }
) {
  const updateData: Record<string, unknown> = {
    ...totals,
    updatedAt: serverTimestamp(),
  };

  if (totals.lastTransactionDate) {
    updateData.lastTransactionDate = Timestamp.fromDate(new Date(totals.lastTransactionDate));
  }
  if (totals.lastPaymentDate) {
    updateData.lastPaymentDate = Timestamp.fromDate(new Date(totals.lastPaymentDate));
  }

  await updateDoc(doc(db, COLLECTION, partyId), updateData);
  await localDb.parties.update(partyId, {
    ...totals,
    updatedAt: new Date().toISOString(),
  });
}

export async function getPartiesFromCache(userId: string): Promise<Party[]> {
  return localDb.parties.where('userId').equals(userId).toArray();
}
