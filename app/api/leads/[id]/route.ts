import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { getLead, updateLead, deleteLead, logAction } from "@/lib/db";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const lead = await getLead(params.id);
    return NextResponse.json(lead);
  } catch (err) {
    const error = err as Error;
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const role = (session.user as { role?: string }).role;
  if (role !== "admin" && role !== "editor") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const data = await req.json();
    const lead = await updateLead(params.id, data);
    logAction({
      azione: "Modifica",
      entita: "Lead",
      nomeEntita: lead.nomeAzienda,
      entitaId: params.id,
      eseguitaDa: session.user?.email ?? "unknown",
    }).catch(() => {});
    return NextResponse.json(lead);
  } catch (err) {
    const error = err as Error;
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const role = (session.user as { role?: string }).role;
  if (role !== "admin" && role !== "editor") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const lead = await getLead(params.id);
    if (lead) {
      await deleteLead(params.id);
      logAction({
        azione: "Eliminazione",
        entita: "Lead",
        nomeEntita: lead.nomeAzienda,
        entitaId: params.id,
        eseguitaDa: session.user?.email ?? "unknown",
      }).catch(() => {});
    }
    return NextResponse.json({ success: true });
  } catch (err) {
    const error = err as Error;
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
