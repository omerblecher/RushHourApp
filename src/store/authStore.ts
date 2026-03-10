import { create } from 'zustand';
import {
  onAuthStateChanged,
  signInWithPopup,
  signInAnonymously,
  linkWithPopup,
  linkWithCredential,
  signInWithCredential,
  signOut as firebaseSignOut,
  GoogleAuthProvider,
} from 'firebase/auth';
import type { User, AuthError } from 'firebase/auth';
import { Capacitor } from '@capacitor/core';
import { FirebaseAuthentication } from '@capacitor-firebase/authentication';
import { auth } from '../firebase';
import { mergeAnonymousScores } from '../services/scoreService';

const googleProvider = new GoogleAuthProvider();

async function nativeGoogleSignIn() {
  const result = await FirebaseAuthentication.signInWithGoogle();
  const credential = GoogleAuthProvider.credential(
    result.credential?.idToken ?? null,
    result.credential?.accessToken ?? null,
  );
  return signInWithCredential(auth, credential);
}

async function getNativeGoogleCredential() {
  const result = await FirebaseAuthentication.signInWithGoogle();
  return GoogleAuthProvider.credential(
    result.credential?.idToken ?? null,
    result.credential?.accessToken ?? null,
  );
}

interface AuthStore {
  user: User | null;
  isLoading: boolean;
  upgradeStatus: 'idle' | 'upgrading' | 'success' | 'error';
  initAuth: () => () => void;
  signInWithGoogle: () => Promise<void>;
  signInAsGuest: () => Promise<void>;
  upgradeAnonymousToGoogle: () => Promise<'linked' | 'merged' | 'cancelled' | 'error'>;
  signOut: () => Promise<void>;
}

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  isLoading: true,
  upgradeStatus: 'idle',

  initAuth: () => {
    return onAuthStateChanged(auth, (user) => {
      set({ user, isLoading: false });
    });
  },

  signInWithGoogle: async () => {
    if (Capacitor.isNativePlatform()) {
      await nativeGoogleSignIn();
    } else {
      await signInWithPopup(auth, googleProvider);
    }
    // onAuthStateChanged will update the store automatically
  },

  signInAsGuest: async () => {
    await signInAnonymously(auth);
    // onAuthStateChanged will update the store automatically
  },

  upgradeAnonymousToGoogle: async () => {
    const currentUser = auth.currentUser;
    if (!currentUser || !currentUser.isAnonymous) return 'error';

    set({ upgradeStatus: 'upgrading' });

    try {
      if (Capacitor.isNativePlatform()) {
        const credential = await getNativeGoogleCredential();
        await linkWithCredential(currentUser, credential);
      } else {
        // Happy path: link anonymous account to Google — UID is preserved
        await linkWithPopup(currentUser, googleProvider);
      }
      // Scores were stored locally only for anon users; same UID, no cross-user transfer needed
      await mergeAnonymousScores(currentUser.uid, currentUser.uid);
      set({ upgradeStatus: 'success' });
      return 'linked';
    } catch (err) {
      const error = err as AuthError;

      if (
        error.code === 'auth/popup-closed-by-user' ||
        error.code === 'auth/cancelled-popup-request' ||
        error.code === 'auth/cancelled'
      ) {
        set({ upgradeStatus: 'idle' });
        return 'cancelled';
      }

      if (error.code === 'auth/credential-already-in-use') {
        // This Google account already has a Firebase identity.
        // Extract credential, sign in as Google user, merge anonymous scores.
        try {
          const credential = (error as AuthError & { credential?: ReturnType<typeof GoogleAuthProvider.credentialFromError> }).credential;
          if (!credential) {
            set({ upgradeStatus: 'error' });
            return 'error';
          }
          const anonUid = currentUser.uid;
          const result = await signInWithCredential(auth, credential);
          // Merge anonymous scores from anonUid -> result.user.uid
          await mergeAnonymousScores(anonUid, result.user.uid);
          set({ upgradeStatus: 'success' });
          return 'merged';
        } catch {
          set({ upgradeStatus: 'error' });
          return 'error';
        }
      }

      set({ upgradeStatus: 'error' });
      return 'error';
    }
  },

  signOut: async () => {
    await firebaseSignOut(auth);
    // onAuthStateChanged will fire with null, setting user: null
    // App.tsx gates on !user -> shows AuthPromptScreen
  },
}));
