import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { createLead, getLeads, logAction } from "@/lib/notion";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = (session.user as any)?.role;
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
      .map((l) => l.sitoWeb.toLowerCase().trim().replace(/\/$/, ""))
  );

  const results = await Promise.allSettled(
    leads.map(async (lead: any) => {
      const name = lead.nomeAzienda?.toLowerCase().trim();
      const url = lead.sitoWeb?.toLowerCase().trim().replace(/\/$/, "");

      // Duplicate check
      if (name && existingNames.has(name)) {
        return { ...lead, status: "duplicate", reason: "Nome azienda già presente nel CRM" };
      }
      if (url && existingUrls.has(url)) {
        return { ...lead, status: "duplicate", reason: "Sito web già presente nel CRM" };
      }

      const created = await createLead({
        nomeAzienda: lead.nomeAzienda,
        settore: lead.settore || undefined,
        territorio: lead.territorio || "",
        sitoWeb: lead.sitoWeb || undefined,
        profiloSocial: lead.profiloSocial || undefined,
        note: lead.note || undefined,
        inseritoDA: session.user?.email ?? "",
      });

      return { ...lead, status: "created", id: created.id };
    })
  );

  const output = results.map((r, i) => {
    if (r.status === "fulfilled") return r.value;
    return { ...leads[i], status: "error", reason: (r.reason as any)?.message ?? "Errore sconosciuto" };
  });

  const numCreated = output.filter((r: any) => r.status === "created").length;
  if (numCreated > 0) {
    logAction({
      azione: "Creazione",
      entita: "Lead",
      nomeEntita: `${numCreated} lead aggiunti via AI Discovery`,
      eseguitaDa: session.user?.email ?? "unknown",
      dettagli: output.filter((r: any) => r.status === "created").map((r: any) => r.nomeAzienda).join(", "),
    }).catch(() => {});
  }

  return NextResponse.json({ results: output });
}
