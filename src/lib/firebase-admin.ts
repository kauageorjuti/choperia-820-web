import 'server-only';
import { cert, getApp, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

function createAdminApp() {
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const storageBucket = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;

  if (process.env.NEXT_PUBLIC_CHOPERIA_APP_HOSTING === 'true') {
    // App Hosting supplies FIREBASE_CONFIG and the runtime service account.
    return initializeApp();
  }
  if (process.env.FIRESTORE_EMULATOR_HOST) return initializeApp({ projectId });

  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');
  return initializeApp({
    projectId,
    storageBucket,
    ...(clientEmail && privateKey ? { credential: cert({ projectId, clientEmail, privateKey }) } : {}),
  });
}

export const adminApp = getApps().length ? getApp() : createAdminApp();
export const adminAuth = getAuth(adminApp);
export const adminDb = getFirestore(adminApp);
