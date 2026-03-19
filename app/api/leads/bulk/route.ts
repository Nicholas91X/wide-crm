import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { createLeads, getLeads, logAction } from "@/lib/db";

interface LeadResult {
  status: "created" | "duplicate" | "error";
  id?: string;
  reason?: string;
  nomeAzienda?: string;
  [key: string]: unknown;
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = (session.user as { role?: string })?.role;
  if (role !== "admin" && role !== "editor") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { leads } = await req.json();
  if (!Array.isArray(leads) || leads.length === 0) {
    return NextResponse.json({ error: "Array leads obbligatorio" }, { status: 400 });
  }

  // Fetch existing leads for duplicate detection
  const existingLeads = await getLeads().catch(() => []);
  const existingNames = new Set(
    existingLeads.map((l) => l.nomeAzienda?.toLowerCase().trim()).filter(Boolean)
  );
  const existingUrls = new Set(
    existingLeads
      .filter((l) => l.sitoWeb)
      .map((l) => (l.sitoWeb as string).toLowerCase().trim().replace(/\/$/, ""))
  );

  const leadsToCreate: Record<string, unknown>[] = [];
  const results: LeadResult[] = [];

  for (const lead of leads) {
    const name = lead.nomeAzienda?.toLowerCase().trim();
    const url = lead.sitoWeb?.toLowerCase().trim().replace(/\/$/, "");

    // Duplicate check
    if (name && existingNames.has(name)) {
      results.push({ ...lead, status: "duplicate", reason: "Nome azienda già presente nel CRM" });
      continue;
    }
    if (url && existingUrls.has(url)) {
      results.push({ ...lead, status: "duplicate", reason: "Sito web già presente nel CRM" });
      continue;
    }

    leadsToCreate.push({
      ...lead,
      inseritoDA: session.user?.email ?? "",
    });
  }

  if (leadsToCreate.length > 0) {
    try {
      const createdLeads = await createLeads(leadsToCreate);
      createdLeads.forEach((l: { id: string }, i: number) => {
        results.push({ ...leadsToCreate[i], status: "created", id: l.id });
      });
    } catch (err) {
      const error = err as Error;
      leadsToCreate.forEach((l) => {
        results.push({ ...l, status: "error", reason: error.message });
      });
    }
  }

  const numCreated = results.filter((r) => r.status === "created").length;
  if (numCreated > 0) {
    logAction({
      azione: "Creazione",
      entita: "Lead",
      nomeEntita: `${numCreated} lead aggiunti via AI Discovery`,
      eseguitaDa: session.user?.email ?? "unknown",
      dettagli: results.filter((r) => r.status === "created").map((r) => r.nomeAzienda).join(", "),
    }).catch(() => {});
  }

  return NextResponse.json({ results });
}
