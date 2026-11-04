import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { db } from "@/lib/db";
import { createSession } from "@/lib/auth";

const schema = z.object({
  fullName: z.string().trim().min(2).max(100),
  email: z.string().trim().toLowerCase().pipe(z.email().max(254)),
  password: z.string().min(10).max(100),
  setupToken: z.string().min(32).max(256),
});

export async function POST(request: Request) {
  const configuredEmail = process.env.KIA_ADMIN_EMAIL?.trim().toLowerCase();
  const configuredToken = process.env.KIA_ADMIN_SETUP_TOKEN;
  if (!configuredEmail || !configuredToken || configuredToken.length < 32) {
    return NextResponse.json({ error: "La configuration initiale de l’administration est indisponible." }, { status: 503 });
  }

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Vérifiez les champs et le code de configuration." }, { status: 400 });
  }

  const data = parsed.data;
  const supplied = Buffer.from(data.setupToken);
  const expected = Buffer.from(configuredToken);
  if (supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) {
    return NextResponse.json({ error: "Code de configuration incorrect." }, { status: 403 });
  }
  if (data.email !== configuredEmail) {
    return NextResponse.json({ error: "Cette adresse ne correspond pas à l’adresse administrateur configurée." }, { status: 403 });
  }

  const client = await db.connect();
  try {
    await client.query("BEGIN");
    await client.query("LOCK TABLE users IN EXCLUSIVE MODE");
    const existingAdmin = await client.query("SELECT id FROM users WHERE role='admin' LIMIT 1");
    if (existingAdmin.rowCount) {
      await client.query("ROLLBACK");
      return NextResponse.json({ error: "Un administrateur est déjà configuré. Connectez-vous depuis l’espace client." }, { status: 409 });
    }

    const passwordHash = await bcrypt.hash(data.password, 12);
    const existingUser = await client.query("SELECT id FROM users WHERE lower(email)=$1 LIMIT 1", [configuredEmail]);
    let user;
    if (existingUser.rowCount) {
      const updated = await client.query(
        "UPDATE users SET full_name=$1,email=$2,password_hash=$3,role='admin',updated_at=now() WHERE id=$4 RETURNING id,full_name,email,role",
        [data.fullName, configuredEmail, passwordHash, existingUser.rows[0].id]
      );
      user = updated.rows[0];
    } else {
      const inserted = await client.query(
        "INSERT INTO users(full_name,email,password_hash,role) VALUES($1,$2,$3,'admin') RETURNING id,full_name,email,role",
        [data.fullName, configuredEmail, passwordHash]
      );
      user = inserted.rows[0];
    }
    await client.query("COMMIT");
    await createSession({ id: user.id, fullName: user.full_name, email: user.email, role: "admin" });
    return NextResponse.json({ ok: true, user: { id: user.id, fullName: user.full_name, email: user.email, role: "admin" } }, { status: 201 });
  } catch {
    await client.query("ROLLBACK").catch(() => {});
    return NextResponse.json({ error: "Initialisation impossible pour le moment." }, { status: 500 });
  } finally {
    client.release();
  }
}
