import Dexie, { type Table } from 'dexie';
import type { Party, Ledger, PendingSync } from '@/types';

export class AppDatabase extends Dexie {
  parties!: Table<Party, string>;
  ledgers!: Table<Ledger, string>;
  pendingSync!: Table<PendingSync, number>;

  constructor() {
    super('JMDIronStores');
    this.version(1).stores({
      parties: 'id, userId, name, isFavorite, updatedAt',
      ledgers: 'partyId, userId, updatedAt',
      pendingSync: '++id, operation, collection, docId, timestamp',
    });
  }
}

export const localDb = new AppDatabase();

// Clear all local data (on logout)
export async function clearLocalData() {
  await localDb.parties.clear();
  await localDb.ledgers.clear();
  await localDb.pendingSync.clear();
}
