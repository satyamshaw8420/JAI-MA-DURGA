import { useState, useCallback } from 'react';
import {
  signInWithPopup,
  GoogleAuthProvider,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
} from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { useAuthStore } from '@/store/authStore';

const googleProvider = new GoogleAuthProvider();

export function useAuth() {
  const {
    user,
    isLoading,
    isAuthenticated,
    workspace,
    activeWorkspaceId,
    isWorkspaceLoading,
    availableWorkspaces,
    setLoading,
  } = useAuthStore();
  const [error, setError] = useState<string | null>(null);

  const loginWithGoogle = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Google sign-in failed';
      setError(msg);
      setLoading(false);
    }
  }, [setLoading]);

  const loginWithEmail = useCallback(
    async (email: string, password: string) => {
      setError(null);
      setLoading(true);
      try {
        await signInWithEmailAndPassword(auth, email, password);
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : 'Login failed';
        setError(msg);
        setLoading(false);
      }
    },
    [setLoading]
  );

  const registerWithEmail = useCallback(
    async (email: string, password: string) => {
      setError(null);
      setLoading(true);
      try {
        const cred = await createUserWithEmailAndPassword(auth, email, password);
        await setDoc(doc(db, 'users', cred.user.uid), {
          uid: cred.user.uid,
          email: cred.user.email,
          displayName: '',
          photoURL: '',
          createdAt: serverTimestamp(),
          lastLoginAt: serverTimestamp(),
        });
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : 'Registration failed';
        setError(msg);
        setLoading(false);
      }
    },
    [setLoading]
  );

  const logout = useCallback(async () => {
    try {
      await signOut(auth);
    } catch (e: unknown) {
      console.error('Logout failed:', e);
    }
  }, []);

  const updateWorkspaceAllowedEmails = useCallback(async (emails: string[]) => {
    try {
      if (!activeWorkspaceId) throw new Error("No active workspace to update");
      const workspaceRef = doc(db, 'workspaces', activeWorkspaceId);
      await setDoc(workspaceRef, { allowedEmails: emails }, { merge: true });
    } catch (error) {
      console.error('Failed to update workspace allowed emails:', error);
      throw error;
    }
  }, [activeWorkspaceId]);

  return {
    user,
    isLoading: isLoading || isWorkspaceLoading,
    workspace,
    activeWorkspaceId,
    availableWorkspaces,
    isWorkspaceLoading,
    isAuthenticated,
    error,
    loginWithGoogle,
    loginWithEmail,
    registerWithEmail,
    logout,
    updateWorkspaceAllowedEmails,
    clearError: () => setError(null),
  };
}
