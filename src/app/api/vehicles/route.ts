import { NextResponse } from "next/server";
import { query } from "@/lib/db";

export async function GET() {
  try {
    const result = await query(
      `SELECT id, make, model, year_from, year_to, engine, generation
       FROM vehicles
       ORDER BY model, year_from NULLS FIRST, year_to NULLS LAST
       LIMIT 300`
    );
    return NextResponse.json({ vehicles: result.rows });
  } catch {
    return NextResponse.json({ error: "Données véhicules momentanément indisponibles." }, { status: 503 });
  }
}
