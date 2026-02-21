import { create } from 'zustand';
import { onAuthStateChanged, signInWithPopup, signInAnonymously, GoogleAuthProvider } from 'firebase/auth';
import type { User } from 'firebase/auth';
import { auth } from '../firebase';

const googleProvider = new GoogleAuthProvider();

interface AuthStore {
  user: User | null;
  isLoading: boolean;
  initAuth: () => () => void;
  signInWithGoogle: () => Promise<void>;
  signInAsGuest: () => Promise<void>;
}

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  isLoading: true,

  initAuth: () => {
    return onAuthStateChanged(auth, (user) => {
      set({ user, isLoading: false });
    });
  },

  signInWithGoogle: async () => {
    await signInWithPopup(auth, googleProvider);
    // onAuthStateChanged will update the store automatically
  },

  signInAsGuest: async () => {
    await signInAnonymously(auth);
    // onAuthStateChanged will update the store automatically
  },
}));
