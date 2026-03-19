import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { getEvents, createEvent, logAction } from "@/lib/db";
import { getRoleFromEmail } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userEmail = session.user?.email;
  const userRole = (session.user as any).role || getRoleFromEmail(userEmail || "");

  try {
    let events = await getEvents();
    
    // Filtro in base ai ruoli:
    // admin: vede tutto
    // editor: vede i propri + quelli di altri editor
    // viewer: vede solo i propri
    if (userRole === "admin") {
      // Nessun filtro
    } else if (userRole === "editor") {
      events = events.filter(e => {
        if (e.membro === userEmail) return true;
        const ownerRole = getRoleFromEmail(e.membro);
        return ownerRole === "editor";
      });
    } else {
      // viewer o altro
      events = events.filter(e => e.membro === userEmail);
    }
    
    return NextResponse.json(events);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  
  const role = (session.user as any).role || getRoleFromEmail(session.user?.email || "");

  try {
    const data = await req.json();
    // Forziamo il membro come l'utente corrente se non è admin
    if (role !== "admin") {
      data.membro = session.user?.email;
    }
    const event = await createEvent(data);
    
    logAction({
      azione: "Creazione",
      entita: "Evento",
      nomeEntita: event.titolo,
      entitaId: event.id,
      eseguitaDa: session.user?.email ?? "unknown",
      dettagli: `Tipo: ${event.tipo}, Inizio: ${event.inizio}`,
    }).catch(() => {});

    return NextResponse.json(event, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
