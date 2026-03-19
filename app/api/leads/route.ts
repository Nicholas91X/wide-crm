import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { getLeads, createLead, logAction } from "@/lib/db";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const filters = {
    settore: searchParams.get("settore") || undefined,
    stato: searchParams.get("stato") || undefined,
    territorio: searchParams.get("territorio") || undefined,
    score: searchParams.get("score") || undefined,
  };

  try {
    const leads = await getLeads(filters);
    return NextResponse.json(leads);
  } catch (err) {
    const error = err as Error;
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const role = (session.user as { role?: string }).role;
  if (role !== "admin" && role !== "editor") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const data = await req.json();
    const lead = await createLead({ ...data, inseritoDA: session.user?.email ?? "" });
    logAction({
      azione: "Creazione",
      entita: "Lead",
      nomeEntita: lead.nomeAzienda,
      entitaId: lead.id,
      eseguitaDa: session.user?.email ?? "unknown",
    }).catch(() => {});
    return NextResponse.json(lead, { status: 201 });
  } catch (err) {
    const error = err as Error;
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
