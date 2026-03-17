import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { getClient, updateClient, deleteClient, logAction } from "@/lib/notion";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const client = await getClient(params.id);
    return NextResponse.json(client);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const role = (session.user as any)?.role;
  if (role !== "admin" && role !== "editor") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  try {
    const data = await req.json();
    const client = await updateClient(params.id, data);
    logAction({ azione: "Modifica", entita: "Cliente", nomeEntita: client.nome, entitaId: params.id, eseguitaDa: session.user?.email ?? "unknown" }).catch(() => {});
    return NextResponse.json(client);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const role = (session.user as any)?.role;
  if (role !== "admin" && role !== "editor") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  try {
    const client = await getClient(params.id);
    await deleteClient(params.id);
    logAction({ azione: "Cancellazione", entita: "Cliente", nomeEntita: client.nome, entitaId: params.id, eseguitaDa: session.user?.email ?? "unknown" }).catch(() => {});
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
