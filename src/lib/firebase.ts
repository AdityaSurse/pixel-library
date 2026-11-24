import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getDatabase } from 'firebase/database';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'placeholder_api_key',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'pixel-library-demo.firebaseapp.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'pixel-library-demo',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'pixel-library-demo.appspot.com',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '000000000000',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '1:000000000000:web:0000000000000000000000',
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL || 'https://pixel-library-demo-default-rtdb.firebaseio.com',
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

export const db = getFirestore(app);
export const rtdb = getDatabase(app);

export default app;
