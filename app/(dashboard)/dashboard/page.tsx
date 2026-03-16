import { getLeads, getReports, getClients } from "@/lib/notion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { GitBranch, FileText, Users, TrendingUp, Calendar } from "lucide-react";
import Link from "next/link";

function formatDate(d: string) {
  if (!d) return "-";
  return new Date(d).toLocaleDateString("it-IT", { day: "2-digit", month: "short", year: "numeric" });
}

export default async function DashboardPage() {
  const [leads, reports, clients] = await Promise.all([
    getLeads().catch(() => []),
    getReports().catch(() => []),
    getClients().catch(() => []),
  ]);

  const now = new Date();
  const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const reportsThisMonth = reports.filter(
    (r) => r.createdTime && new Date(r.createdTime) >= firstOfMonth
  ).length;

  const activeClients = clients.filter((c) => c.statoContratto === "Attivo");
  const monthlyRevenue = activeClients.reduce((sum, c) => sum + (c.valoreNetto || 0), 0);

  const latestLeads = leads.slice(0, 5);

  const followUps = leads.filter((l) => {
    if (l.stato !== "Follow-up") return false;
    if (!l.dataFollowUp) return false;
    return new Date(l.dataFollowUp) <= now;
  });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-[#f5f5f5]">Dashboard</h1>
        <p className="text-[#888] text-sm mt-1">Panoramica della pipeline commerciale</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-[#141414] border-[#1f1f1f]">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-[#888]">Lead in Pipeline</CardTitle>
            <GitBranch size={18} className="text-[#c9a96e]" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-[#f5f5f5]">{leads.length}</div>
            <p className="text-xs text-[#888] mt-1">totali attivi</p>
          </CardContent>
        </Card>

        <Card className="bg-[#141414] border-[#1f1f1f]">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-[#888]">Report Inviati</CardTitle>
            <FileText size={18} className="text-[#c9a96e]" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-[#f5f5f5]">{reportsThisMonth}</div>
            <p className="text-xs text-[#888] mt-1">questo mese</p>
          </CardContent>
        </Card>

        <Card className="bg-[#141414] border-[#1f1f1f]">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-[#888]">Clienti Attivi</CardTitle>
            <Users size={18} className="text-[#c9a96e]" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-[#f5f5f5]">{activeClients.length}</div>
            <p className="text-xs text-[#888] mt-1">contratti attivi</p>
          </CardContent>
        </Card>

        <Card className="bg-[#141414] border-[#1f1f1f]">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-[#888]">Fatturato Mensile</CardTitle>
            <TrendingUp size={18} className="text-[#c9a96e]" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-[#f5f5f5]">
              €{monthlyRevenue.toLocaleString("it-IT")}
            </div>
            <p className="text-xs text-[#888] mt-1">ricorrente mensile</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Latest leads */}
        <Card className="bg-[#141414] border-[#1f1f1f]">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base font-semibold text-[#f5f5f5]">Ultimi Lead</CardTitle>
            <Link href="/pipeline" className="text-xs text-[#c9a96e] hover:underline">
              Vedi tutti →
            </Link>
          </CardHeader>
          <CardContent className="p-0">
            {latestLeads.length === 0 ? (
              <p className="px-6 py-4 text-[#888] text-sm">Nessun lead trovato</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#1f1f1f]">
                    <th className="text-left px-6 py-3 text-xs text-[#888] font-medium">Azienda</th>
                    <th className="text-left px-4 py-3 text-xs text-[#888] font-medium">Settore</th>
                    <th className="text-left px-4 py-3 text-xs text-[#888] font-medium">Stato</th>
                    <th className="text-right px-6 py-3 text-xs text-[#888] font-medium">Score</th>
                  </tr>
                </thead>
                <tbody>
                  {latestLeads.map((lead) => (
                    <tr
                      key={lead.id}
                      className="border-b border-[#1f1f1f] last:border-0 hover:bg-[#1a1a1a]"
                    >
                      <td className="px-6 py-3">
                        <Link
                          href={`/pipeline/${lead.id}`}
                          className="text-[#f5f5f5] hover:text-[#c9a96e] font-medium truncate max-w-[140px] block"
                        >
                          {lead.nomeAzienda || "-"}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-[#888]">{lead.settore || "-"}</td>
                      <td className="px-4 py-3">
                        <StatoBadge stato={lead.stato} />
                      </td>
                      <td className="px-6 py-3 text-right text-xs">
                        <span className="text-[#c9a96e]">{lead.score || "-"}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>

        {/* Follow-up scaduti */}
        <Card className="bg-[#141414] border-[#1f1f1f]">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base font-semibold text-[#f5f5f5]">
              Follow-up in Scadenza
            </CardTitle>
            <Calendar size={18} className="text-[#c9a96e]" />
          </CardHeader>
          <CardContent className="p-0">
            {followUps.length === 0 ? (
              <p className="px-6 py-4 text-[#888] text-sm">Nessun follow-up in scadenza</p>
            ) : (
              <div className="divide-y divide-[#1f1f1f]">
                {followUps.map((lead) => (
                  <Link
                    key={lead.id}
                    href={`/pipeline/${lead.id}`}
                    className="flex items-center justify-between px-6 py-3 hover:bg-[#1a1a1a] transition-colors"
                  >
                    <div>
                      <p className="text-sm font-medium text-[#f5f5f5]">{lead.nomeAzienda}</p>
                      <p className="text-xs text-[#888]">{lead.settore}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-red-400 font-medium">
                        {formatDate(lead.dataFollowUp)}
                      </p>
                      <p className="text-xs text-[#888]">Follow-up</p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StatoBadge({ stato }: { stato: string }) {
  const colors: Record<string, string> = {
    "Da contattare": "bg-gray-800 text-gray-300",
    Contattato: "bg-blue-900/40 text-blue-400",
    "Report in lavorazione": "bg-yellow-900/40 text-yellow-400",
    "Report inviato": "bg-purple-900/40 text-purple-400",
    "Follow-up": "bg-orange-900/40 text-orange-400",
    Acquisito: "bg-green-900/40 text-green-400",
    "Non interessato": "bg-red-900/40 text-red-400",
  };
  return (
    <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${colors[stato] ?? "bg-gray-800 text-gray-300"}`}>
      {stato || "-"}
    </span>
  );
}
