import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";

export async function GET() {
  try {
    // Usamos o Admin SDK para bypassar o firestore.rules (que bloqueia acesso client-side)
    const staffRef = adminDb.collection("staff");
    const snapshot = await staffRef.where("isActive", "==", true).get();
    
    const staffData = snapshot.docs.map(doc => {
      const data = doc.data();
      // Omit pinCode to prevent it from leaking to the browser memory
      return {
        id: doc.id,
        name: data.name,
        role: data.role,
        avatarIcon: data.avatarIcon,
        isActive: data.isActive
      };
    });
    
    return NextResponse.json(staffData);
  } catch (error) {
    console.error("Error fetching staff from API:", error);
    return NextResponse.json({ error: "Failed to fetch staff" }, { status: 500 });
  }
}
