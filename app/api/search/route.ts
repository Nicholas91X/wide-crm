import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { getLeads, getReports, getClients } from "@/lib/db";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const q = new URL(req.url).searchParams.get("q")?.toLowerCase().trim() ?? "";
  if (!q || q.length < 2) return NextResponse.json([]);

  const [leads, reports, clients] = await Promise.all([
    getLeads().catch(() => []),
    getReports().catch(() => []),
    getClients().catch(() => []),
  ]);

  const results: any[] = [];

  leads
    .filter(l => 
      l.nomeAzienda?.toLowerCase().includes(q) || 
      l.settore?.toLowerCase().includes(q) || 
      l.territorio?.toLowerCase().includes(q)
    )
    .slice(0, 5)
    .forEach(l => {
      results.push({ 
        id: l.id, 
        type: "lead", 
        title: l.nomeAzienda, 
        subtitle: `${l.settore || ""} · ${l.stato || ""}`, 
        href: `/pipeline/${l.id}` 
      });
    });

  reports
    .filter(r => 
      r.titolo?.toLowerCase().includes(q) || 
      r.azienda?.toLowerCase().includes(q)
    )
    .slice(0, 4)
    .forEach(r => {
      results.push({ 
        id: r.id, 
        type: "report", 
        title: r.titolo, 
        subtitle: r.azienda, 
        href: `/reports/${r.token}` // Reports are often accessed via token in this app
      });
    });

  clients
    .filter(c => 
      c.nome?.toLowerCase().includes(q) || 
      c.settore?.toLowerCase().includes(q)
    )
    .slice(0, 3)
    .forEach(c => {
      results.push({ 
        id: c.id, 
        type: "client", 
        title: c.nome, 
        subtitle: `${c.settore || ""} · ${c.statoContratto || ""}`, 
        href: `/clients/${c.id}` 
      });
    });

  return NextResponse.json(results.slice(0, 10));
}
