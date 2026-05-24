import { useState, useEffect, useCallback } from 'react';
import {
  signInWithPopup,
  GoogleAuthProvider,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { useAuthStore } from '@/store/authStore';

const googleProvider = new GoogleAuthProvider();

export function useAuth() {
  const { user, isLoading, isAuthenticated, setUser, setLoading } = useAuthStore();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
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
        setUser(firebaseUser);
      } else {
        setUser(null);
      }
    });

    return () => unsubscribe();
  }, [setUser]);

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

  return {
    user,
    isLoading,
    isAuthenticated,
    error,
    loginWithGoogle,
    loginWithEmail,
    registerWithEmail,
    logout,
    clearError: () => setError(null),
  };
}
