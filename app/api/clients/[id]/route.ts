import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { getClient, updateClient, deleteClient, logAction } from "@/lib/db";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const client = await getClient(params.id);
    if (!client) return NextResponse.json({ error: "Cliente non trovato" }, { status: 404 });
    return NextResponse.json(client);
  } catch (err) {
    const error = err as Error;
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const role = (session.user as { role?: string })?.role;
  if (role !== "admin" && role !== "editor") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  try {
    const data = await req.json();
    const client = await updateClient(params.id, data);
    if (!client) return NextResponse.json({ error: "Cliente non trovato" }, { status: 404 });
    logAction({ azione: "Modifica", entita: "Cliente", nomeEntita: client.nome, entitaId: params.id, eseguitaDa: session.user?.email ?? "unknown" }).catch(() => {});
    return NextResponse.json(client);
  } catch (err) {
    const error = err as Error;
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const role = (session.user as { role?: string })?.role;
  if (role !== "admin" && role !== "editor") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  try {
    const client = await getClient(params.id);
    if (!client) return NextResponse.json({ error: "Cliente non trovato" }, { status: 404 });
    await deleteClient(params.id);
    logAction({ azione: "Eliminazione", entita: "Cliente", nomeEntita: client.nome, entitaId: params.id, eseguitaDa: session.user?.email ?? "unknown" }).catch(() => {});
    return NextResponse.json({ success: true });
  } catch (err) {
    const error = err as Error;
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
