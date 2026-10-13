import { NextResponse } from "next/server";
import { adminDb, adminAuth } from "@/lib/firebase-admin";
import { z } from "zod";

// Validação de segurança dos inputs com Zod
const loginSchema = z.object({
  id: z.string().min(1, "ID é obrigatório"),
  pin: z.string().length(6, "O PIN deve ter exatamente 6 dígitos").regex(/^\d+$/, "Apenas números"),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    
    // Backend Validation
    const parsed = loginSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Formato de dados inválido" }, { status: 400 });
    }

    const { id, pin } = parsed.data;

    // Acesso via Admin SDK (bypassa firestore.rules)
    const docRef = adminDb.collection("staff").doc(id);
    const snap = await docRef.get();
    
    if (!snap.exists) {
      return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 });
    }
    
    const data = snap.data();
    
    if (!data?.isActive) {
      return NextResponse.json({ error: "Usuário inativo" }, { status: 403 });
    }

    // SECURITY: PIN validation no servidor
    if (data.pinCode === pin) {
      
      // Gera um Token Customizado do Firebase para esse funcionário
      // O Frontend usará este token com signInWithCustomToken
      const customToken = await adminAuth.createCustomToken(id, {
        admin: true,
        role: data.role,
      });

      return NextResponse.json({
        success: true,
        token: customToken,
        user: {
          id: snap.id,
          name: data.name,
          role: data.role,
          avatarIcon: data.avatarIcon
        }
      });
    } else {
      return NextResponse.json({ error: "PIN inválido" }, { status: 401 });
    }
  } catch (error: any) {
    console.error("Error verifying PIN:", error);
    // Se o erro for do Firebase Admin (ex: falta de chaves .env) avisamos para não quebrar silenciosamente
    if (error?.message?.includes("credential")) {
       return NextResponse.json({ error: "Servidor não configurado (Faltam chaves do Firebase Admin)" }, { status: 500 });
    }
    return NextResponse.json({ error: "Erro interno no servidor" }, { status: 500 });
  }
}
