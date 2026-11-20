import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore, doc, setDoc, getDoc } from 'firebase/firestore';
import { getStorage, type FirebaseStorage } from 'firebase/storage';
import type { FirebaseConfig } from '../types';

const FIREBASE_CONFIG_STORAGE_KEY = 'messmate_firebase_config_v1';

export const DEFAULT_FIREBASE_CONFIG: FirebaseConfig = {
  apiKey: "AIzaSyBd_Eq0HdZt6hfFAxsxGbbqqQT0f38PWL0",
  authDomain: "mess-mate-23518.firebaseapp.com",
  projectId: "mess-mate-23518",
  storageBucket: "mess-mate-23518.firebasestorage.app",
  messagingSenderId: "864092222786",
  appId: "1:864092222786:web:0672d1c268ce49bd6b44db"
};

export function getStoredFirebaseConfig(): FirebaseConfig | null {
  try {
    const fromStorage = localStorage.getItem(FIREBASE_CONFIG_STORAGE_KEY);
    if (fromStorage) {
      return JSON.parse(fromStorage);
    }
  } catch (e) {
    console.warn('Failed to parse stored Firebase config', e);
  }

  // Fallback to Vite env variables if provided
  const envKey = import.meta.env.VITE_FIREBASE_API_KEY;
  if (envKey) {
    return {
      apiKey: envKey,
      authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || '',
      projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || '',
      storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || '',
      messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
      appId: import.meta.env.VITE_FIREBASE_APP_ID || '',
    };
  }

  // Default to connected Firebase project
  return DEFAULT_FIREBASE_CONFIG;
}

export function saveStoredFirebaseConfig(config: FirebaseConfig | null): void {
  if (config) {
    localStorage.setItem(FIREBASE_CONFIG_STORAGE_KEY, JSON.stringify(config));
  } else {
    localStorage.removeItem(FIREBASE_CONFIG_STORAGE_KEY);
  }
}

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;
let storage: FirebaseStorage | null = null;

export function initFirebase(): {
  app: FirebaseApp | null;
  auth: Auth | null;
  db: Firestore | null;
  storage: FirebaseStorage | null;
  isConfigured: boolean;
} {
  const config = getStoredFirebaseConfig();
  if (!config || !config.apiKey || !config.projectId) {
    return { app: null, auth: null, db: null, storage: null, isConfigured: false };
  }

  try {
    if (!getApps().length) {
      app = initializeApp(config);
    } else {
      app = getApps()[0];
    }
    auth = getAuth(app);
    db = getFirestore(app);
    storage = getStorage(app);
    return { app, auth, db, storage, isConfigured: true };
  } catch (error) {
    console.error('Firebase initialization error:', error);
    return { app: null, auth: null, db: null, storage: null, isConfigured: false };
  }
}

export const firebaseStatus = initFirebase();

export async function uploadDataToCloud(data: any): Promise<{ success: boolean; error?: string }> {
  const { db, isConfigured } = initFirebase();
  if (!isConfigured || !db) {
    return { success: false, error: 'Firebase is not configured. Please enter your Firebase Project ID & API Key in Settings.' };
  }
  try {
    const docRef = doc(db, 'messmate_data', 'main_backup');
    await setDoc(docRef, {
      ...data,
      syncedAt: new Date().toISOString(),
    });
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to sync data to Firestore' };
  }
}

export async function downloadDataFromCloud(): Promise<{ success: boolean; data?: any; error?: string }> {
  const { db, isConfigured } = initFirebase();
  if (!isConfigured || !db) {
    return { success: false, error: 'Firebase is not configured. Please enter your Firebase Project ID & API Key in Settings.' };
  }
  try {
    const docRef = doc(db, 'messmate_data', 'main_backup');
    const snap = await getDoc(docRef);
    if (!snap.exists()) {
      return { success: false, error: 'No cloud data found in your Firestore collection yet.' };
    }
    return { success: true, data: snap.data() };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to retrieve data from Firestore' };
  }
}

export async function uploadUsersToCloud(users: any[]): Promise<{ success: boolean; error?: string }> {
  const { db, isConfigured } = initFirebase();
  if (!isConfigured || !db) return { success: false, error: 'Firebase not configured' };
  try {
    const docRef = doc(db, 'messmate_auth', 'accounts');
    await setDoc(docRef, {
      users,
      updatedAt: new Date().toISOString(),
    });
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to sync users to cloud' };
  }
}

export async function downloadUsersFromCloud(): Promise<{ success: boolean; users?: any[]; error?: string }> {
  const { db, isConfigured } = initFirebase();
  if (!isConfigured || !db) return { success: false, error: 'Firebase not configured' };
  try {
    const docRef = doc(db, 'messmate_auth', 'accounts');
    const snap = await getDoc(docRef);
    if (!snap.exists()) {
      return { success: false, error: 'No cloud users found' };
    }
    const data = snap.data();
    return { success: true, users: data.users || [] };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to fetch users from cloud' };
  }
}
