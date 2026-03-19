import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { getReport, updateReport, deleteReport, logAction } from "@/lib/db";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  // Public access with token
  const { searchParams } = new URL(req.url);
  const token = searchParams.get("token");

  try {
    const report = await getReport(params.id);
    if (!report) return NextResponse.json({ error: "Report non trovato" }, { status: 404 });

    if (token) {
      if (report.token !== token) {
        return NextResponse.json({ error: "Token non valido" }, { status: 403 });
      }
      return NextResponse.json(report);
    }

    // Authenticated access
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    return NextResponse.json(report);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const role = (session.user as any)?.role;
  if (role !== "admin" && role !== "editor") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const data = await req.json();
    const report = await updateReport(params.id, data);
    if (!report) return NextResponse.json({ error: "Report non trovato" }, { status: 404 });

    logAction({
      azione: "Modifica",
      entita: "Report",
      nomeEntita: report.titolo,
      entitaId: params.id,
      eseguitaDa: session.user?.email ?? "unknown",
    }).catch(() => {});
    return NextResponse.json(report);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = (session.user as any)?.role;
  if (role !== "admin" && role !== "editor") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const report = await getReport(params.id);
    if (!report) return NextResponse.json({ error: "Report non trovato" }, { status: 404 });

    await deleteReport(params.id);
    logAction({
      azione: "Eliminazione",
      entita: "Report",
      nomeEntita: report.titolo,
      entitaId: params.id,
      eseguitaDa: session.user?.email ?? "unknown",
    }).catch(() => {});
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
