import * as admin from 'firebase-admin';

if (!admin.apps.length) {
  try {
    admin.initializeApp({
      ...(process.env.FIRESTORE_EMULATOR_HOST ? { projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID } : { credential: admin.credential.cert({
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        // Handles escaped newlines from env variables
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      }) }),
    });
    console.log("Firebase Admin SDK initialized successfully.");
  } catch (error) {
    console.error("Firebase admin initialization error. Certifique-se de configurar FIREBASE_CLIENT_EMAIL e FIREBASE_PRIVATE_KEY no .env.local", error);
  }
}

export const adminAuth = admin.auth();
export const adminDb = admin.firestore();
