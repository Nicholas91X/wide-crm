import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { getEvent, updateEvent, deleteEvent, logAction } from "@/lib/db";
import { getRoleFromEmail } from "@/lib/auth";

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userEmail = session.user?.email;
  const role = (session.user as any).role || getRoleFromEmail(userEmail || "");

  try {
    const existingEvent = await getEvent(params.id);
    if (!existingEvent) return NextResponse.json({ error: "Evento non trovato" }, { status: 404 });

    if (role !== "admin" && existingEvent.membro !== userEmail) {
      return NextResponse.json({ error: "Forbidden: You can only edit your own events" }, { status: 403 });
    }

    const data = await req.json();
    const event = await updateEvent(params.id, data);

    logAction({
      azione: "Modifica",
      entita: "Evento",
      nomeEntita: event.titolo,
      entitaId: event.id,
      eseguitaDa: session.user?.email ?? "unknown",
    }).catch(() => {});

    return NextResponse.json(event);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userEmail = session.user?.email;
  const role = (session.user as any).role || getRoleFromEmail(userEmail || "");

  try {
    const existingEvent = await getEvent(params.id);
    if (!existingEvent) return NextResponse.json({ error: "Evento non trovato" }, { status: 404 });

    if (role !== "admin" && existingEvent.membro !== userEmail) {
      return NextResponse.json({ error: "Forbidden: You can only delete your own events" }, { status: 403 });
    }

    await deleteEvent(params.id);

    logAction({
      azione: "Eliminazione",
      entita: "Evento",
      nomeEntita: existingEvent.titolo,
      entitaId: params.id,
      eseguitaDa: session.user?.email ?? "unknown",
    }).catch(() => {});

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
