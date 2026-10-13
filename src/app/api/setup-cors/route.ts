import { NextRequest, NextResponse } from "next/server";
import * as admin from "firebase-admin";

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Erro desconhecido";
}

export async function POST(request: NextRequest) {
  try {
    const authorization = request.headers.get("authorization");
    const token = authorization?.startsWith("Bearer ")
      ? authorization.slice("Bearer ".length)
      : null;

    if (!token) {
      return NextResponse.json({ success: false, error: "Autenticação obrigatória" }, { status: 401 });
    }

    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
        }),
        storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
      });
    }

    const decodedToken = await admin.auth().verifyIdToken(token);
    if (decodedToken.admin !== true) {
      return NextResponse.json({ success: false, error: "Acesso administrativo obrigatório" }, { status: 403 });
    }

    const bucketName = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
    if (!bucketName) {
      return NextResponse.json({ success: false, error: "Storage bucket não configurado" }, { status: 500 });
    }

    const allowedOrigins = (process.env.STORAGE_CORS_ORIGINS ?? "http://localhost:3000")
      .split(",")
      .map((origin) => origin.trim())
      .filter(Boolean);
    const bucket = admin.storage().bucket(bucketName);

    await bucket.setCorsConfiguration([
      {
        origin: allowedOrigins,
        method: ["GET", "POST", "PUT", "OPTIONS"],
        responseHeader: ["Content-Type", "Authorization", "Content-Length", "User-Agent", "x-goog-resumable"],
        maxAgeSeconds: 3600,
      },
    ]);

    return NextResponse.json({ success: true, message: "CORS do Firebase Storage configurado com sucesso." });
  } catch (error: unknown) {
    console.error("Erro ao configurar CORS:", error);
    return NextResponse.json({ success: false, error: errorMessage(error) }, { status: 500 });
  }
}
