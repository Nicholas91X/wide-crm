import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { getLead, updateLead, createClient } from "@/lib/db";

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const role = (session.user as { role?: string }).role;
  if (role !== "admin" && role !== "editor") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const lead = await getLead(params.id);
    if (!lead) return NextResponse.json({ error: "Lead not found" }, { status: 404 });

    await updateLead(params.id, { stato: "Acquisito" });
    await createClient({
      nome: lead.nomeAzienda,
      settore: lead.settore,
      dataInizio: new Date().toISOString().split("T")[0],
      responsabile: session.user?.name ?? "",
    });
    return NextResponse.json({ success: true });
  } catch (err) {
    const error = err as Error;
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
