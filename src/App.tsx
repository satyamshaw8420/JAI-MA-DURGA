import { lazy, Suspense, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'sonner';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, setDoc, deleteDoc, serverTimestamp, onSnapshot, collection, query, where, getDoc, arrayUnion } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { useAuthStore } from '@/store/authStore';
import PrivateRoute from '@/components/auth/PrivateRoute';
import AppLayout from '@/components/layout/AppLayout';
import { Loader2 } from 'lucide-react';

const LoginPage = lazy(() => import('@/pages/LoginPage'));
const DashboardPage = lazy(() => import('@/pages/DashboardPage'));
const CreateBillPage = lazy(() => import('@/pages/CreateBillPage'));
const PartiesPage = lazy(() => import('@/pages/PartiesPage'));
const PartyDetailPage = lazy(() => import('@/pages/PartyDetailPage'));
const LedgerPage = lazy(() => import('@/pages/LedgerPage'));
const PaymentsPage = lazy(() => import('@/pages/PaymentsPage'));
const ReportsPage = lazy(() => import('@/pages/ReportsPage'));
const SearchPage = lazy(() => import('@/pages/SearchPage'));
const SettingsPage = lazy(() => import('@/pages/SettingsPage'));
const RemindersPage = lazy(() => import('@/pages/RemindersPage'));

function LoadingFallback() {
  return (
    <div className="flex items-center justify-center min-h-[40vh]">
      <Loader2 className="w-8 h-8 animate-spin" style={{ color: 'var(--muted-foreground)' }} />
    </div>
  );
}

export default function App() {
  const { setUser, setWorkspace, setActiveWorkspaceId, setWorkspaceLoading } = useAuthStore();

  useEffect(() => {
    let unsubscribeWorkspace: (() => void) | null = null;

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      // Clean up previous workspace listener
      if (unsubscribeWorkspace) {
        unsubscribeWorkspace();
        unsubscribeWorkspace = null;
      }

      if (firebaseUser) {
        // Update user doc in Firestore
        try {
          await setDoc(
            doc(db, 'users', firebaseUser.uid),
            {
              uid: firebaseUser.uid,
              email: firebaseUser.email,
              displayName: firebaseUser.displayName || '',
              photoURL: firebaseUser.photoURL || '',
              lastLoginAt: serverTimestamp(),
            },
            { merge: true }
          );
        } catch (e) {
          console.warn('Failed to update user doc:', e);
        }

        const userEmail = (firebaseUser.email || '').toLowerCase().trim();
        const userUid = firebaseUser.uid;

        setWorkspaceLoading(true);

        // Ensure personal workspace exists
        const myWorkspaceRef = doc(db, 'workspaces', userUid);
        try {
          const snap = await getDoc(myWorkspaceRef);
          
          if (!snap.exists()) {
            await setDoc(myWorkspaceRef, {
              ownerUid: userUid,
              ownerEmail: userEmail,
              name: userEmail === 'satyamshaw842@gmail.com' ? 'JAI MA DURGA IRON STORES' : `${firebaseUser.displayName || userEmail.split('@')[0].toUpperCase()}'S BUSINESS`,
              allowedEmails: [userEmail],
              createdAt: serverTimestamp(),
            });
          }

          // ONE-OFF MIGRATION FOR SATYAM
          if (userEmail === 'satyamshaw842@gmail.com') {
            const oldDummyRef = doc(db, 'workspaces', 'jai-ma-durga-iron-stores');
            const oldSnap = await getDoc(oldDummyRef);
            
            if (oldSnap.exists()) {
               const oldData = oldSnap.data();
               const oldEmails = oldData.allowedEmails || [];
               
               // Merge emails and fix name in real workspace
               await setDoc(myWorkspaceRef, { 
                  name: 'JAI MA DURGA IRON STORES',
                  allowedEmails: arrayUnion(...oldEmails)
               }, { merge: true });
               
               // Delete the dummy workspace
               await deleteDoc(oldDummyRef);
               console.log("Migrated and deleted old dummy workspace");
            } else if (snap.exists() && snap.data().name !== 'JAI MA DURGA IRON STORES') {
               // Just ensure the name is correct if it was already created as Satyam'S BUSINESS
               await setDoc(myWorkspaceRef, { name: 'JAI MA DURGA IRON STORES' }, { merge: true });
            }
          }
        } catch (err) {
          console.warn('Could not check/create personal workspace:', err);
        }

        // Subscribe to ALL workspaces the user has access to
        const workspacesQuery = query(
          collection(db, 'workspaces'),
          where('allowedEmails', 'array-contains', userEmail)
        );

        unsubscribeWorkspace = onSnapshot(
          workspacesQuery,
          (snapshot) => {
            const rawList = snapshot.docs.map(d => {
              const data = d.data();
              return {
                id: d.id,
                name: data.name || 'Workspace',
                ownerUid: data.ownerUid,
                ownerEmail: data.ownerEmail,
                allowedEmails: data.allowedEmails || []
              };
            });

            // Deduplicate: For workspaces owned by the current user,
            // only keep the canonical one (doc id === user uid).
            // Delete any stale duplicates (like old 'jai-ma-durga-iron-stores').
            const seen = new Set<string>();
            const workspacesList = rawList.filter(ws => {
              // Skip exact duplicate IDs
              if (seen.has(ws.id)) return false;
              seen.add(ws.id);
              
              // If this user owns multiple workspace docs, only keep the one with id === uid
              if (ws.ownerUid === userUid && ws.id !== userUid) {
                // This is a stale duplicate — try to clean it up
                deleteDoc(doc(db, 'workspaces', ws.id)).catch(() => {});
                return false; // exclude from UI
              }
              return true;
            });

            useAuthStore.getState().setAvailableWorkspaces(workspacesList);

            const currentActiveId = useAuthStore.getState().activeWorkspaceId;
            const storedActiveId = localStorage.getItem('activeWorkspaceId');

            let newActiveId = currentActiveId || storedActiveId || userUid;
            
            const hasAccess = workspacesList.some(w => w.id === newActiveId);
            if (!hasAccess) {
              newActiveId = userUid;
            }

            const activeWorkspaceObj = workspacesList.find(w => w.id === newActiveId) || null;

            useAuthStore.getState().setActiveWorkspaceId(newActiveId);
            useAuthStore.getState().setWorkspace(activeWorkspaceObj);
            
            if (newActiveId) {
              localStorage.setItem('activeWorkspaceId', newActiveId);
            }

            setWorkspaceLoading(false);
            setUser(firebaseUser);
          },
          (err) => {
            console.error('Workspace subscription error:', err);
            useAuthStore.getState().setActiveWorkspaceId(firebaseUser.uid);
            useAuthStore.getState().setWorkspace(null);
            setWorkspaceLoading(false);
            setUser(firebaseUser);
          }
        );
      } else {
        setUser(null);
        setWorkspace(null);
        setActiveWorkspaceId(null);
        setWorkspaceLoading(false);
      }
    });

    return () => {
      unsub();
      if (unsubscribeWorkspace) {
        unsubscribeWorkspace();
      }
    };

    // We alias the outer unsubscribe
    function unsub() { unsubscribe(); }
  }, [setUser, setWorkspace, setActiveWorkspaceId, setWorkspaceLoading]);

  return (
    <BrowserRouter>
      <Toaster
        position="top-center"
        toastOptions={{
          style: {
            background: 'var(--card)',
            border: '1px solid var(--border)',
            color: 'var(--foreground)',
            fontSize: '13px',
          },
        }}
      />
      <Suspense fallback={<LoadingFallback />}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route element={<PrivateRoute><AppLayout /></PrivateRoute>}>
            <Route index element={<DashboardPage />} />
            <Route path="create-bill" element={<CreateBillPage />} />
            <Route path="parties" element={<PartiesPage />} />
            <Route path="parties/:id" element={<PartyDetailPage />} />
            <Route path="ledger" element={<LedgerPage />} />
            <Route path="payments" element={<PaymentsPage />} />
            <Route path="reports" element={<ReportsPage />} />
            <Route path="search" element={<SearchPage />} />
            <Route path="reminders" element={<RemindersPage />} />
            <Route path="settings" element={<SettingsPage />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
