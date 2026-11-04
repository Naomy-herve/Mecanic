import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { query } from "@/lib/db";
import { createSession } from "@/lib/auth";

const schema = z.object({
  fullName: z.string().trim().min(2).max(100),
  email: z.email(),
  password: z.string().min(10).max(100),
});

export async function POST(req: Request) {
  try {
    const data = schema.parse(await req.json());
    const email = data.email.trim().toLowerCase();
    const configuredAdmin = process.env.KIA_ADMIN_EMAIL?.trim().toLowerCase();

    // The configured administrator address must never be claimable through
    // public registration, especially while email verification is disabled.
    if (configuredAdmin && email === configuredAdmin) {
      return NextResponse.json(
        { error: "Cette adresse est réservée à l’administration. Contactez le responsable du site." },
        { status: 403 }
      );
    }

    const hash = await bcrypt.hash(data.password, 12);
    const result = await query<{
      id: string;
      full_name: string;
      email: string;
      role: "customer" | "admin";
    }>(
      "INSERT INTO users(full_name,email,password_hash,role) VALUES($1,$2,$3,'customer') RETURNING id,full_name,email,role",
      [data.fullName, email, hash]
    );

    const user = result.rows[0];
    await createSession({
      id: user.id,
      fullName: user.full_name,
      email: user.email,
      role: user.role,
    });

    return NextResponse.json({
      user: {
        id: user.id,
        fullName: user.full_name,
        email: user.email,
        role: user.role,
      },
    }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Vérifiez les champs saisis." }, { status: 400 });
    }
    if ((error as { code?: string }).code === "23505") {
      return NextResponse.json({ error: "Cette adresse e-mail possède déjà un compte." }, { status: 409 });
    }
    return NextResponse.json({ error: "Inscription indisponible. Réessayez plus tard." }, { status: 500 });
  }
}
