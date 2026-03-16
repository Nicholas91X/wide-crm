import { getLeads, getReports, getClients } from "@/lib/notion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { GitBranch, FileText, Users, TrendingUp, Calendar } from "lucide-react";
import Link from "next/link";

function formatDate(d: string) {
  if (!d) return "-";
  return new Date(d).toLocaleDateString("it-IT", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
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
    (r) => r.createdTime && new Date(r.createdTime) >= firstOfMonth,
  ).length;

  const activeClients = clients.filter((c) => c.statoContratto === "Attivo");
  const monthlyRevenue = activeClients.reduce(
    (sum, c) => sum + (c.valoreNetto || 0),
    0,
  );

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
        <p className="text-[#888] text-sm mt-1">
          Panoramica della pipeline commerciale
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <Card className="glass-dark border-white/5">
          <CardHeader className="flex flex-row items-center justify-between pb-2 px-4 pt-4">
            <CardTitle className="text-[10px] md:text-sm font-medium text-[#888] uppercase tracking-wider">
              Lead
            </CardTitle>
            <GitBranch size={16} className="text-[#c9a96e]" />
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="text-2xl md:text-3xl font-bold text-[#f5f5f5]">
              {leads.length}
            </div>
            <p className="text-[10px] text-[#555] mt-1">totali attivi</p>
          </CardContent>
        </Card>

        <Card className="glass-dark border-white/5">
          <CardHeader className="flex flex-row items-center justify-between pb-2 px-4 pt-4">
            <CardTitle className="text-[10px] md:text-sm font-medium text-[#888] uppercase tracking-wider">
              Report
            </CardTitle>
            <FileText size={16} className="text-[#c9a96e]" />
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="text-2xl md:text-3xl font-bold text-[#f5f5f5]">
              {reportsThisMonth}
            </div>
            <p className="text-[10px] text-[#555] mt-1">questo mese</p>
          </CardContent>
        </Card>

        <Card className="glass-dark border-white/5">
          <CardHeader className="flex flex-row items-center justify-between pb-2 px-4 pt-4">
            <CardTitle className="text-[10px] md:text-sm font-medium text-[#888] uppercase tracking-wider">
              Clienti
            </CardTitle>
            <Users size={16} className="text-[#c9a96e]" />
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="text-2xl md:text-3xl font-bold text-[#f5f5f5]">
              {activeClients.length}
            </div>
            <p className="text-[10px] text-[#555] mt-1">contratti attivi</p>
          </CardContent>
        </Card>

        <Card className="glass-dark border-white/5">
          <CardHeader className="flex flex-row items-center justify-between pb-2 px-4 pt-4">
            <CardTitle className="text-[10px] md:text-sm font-medium text-[#888] uppercase tracking-wider">
              Revenue
            </CardTitle>
            <TrendingUp size={16} className="text-[#c9a96e]" />
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="text-xl md:text-3xl font-bold text-[#f5f5f5]">
              €{monthlyRevenue.toLocaleString("it-IT")}
            </div>
            <p className="text-[10px] text-[#555] mt-1">ricorrente mensile</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Latest leads */}
        <Card className="glass-dark border-white/5">
          <CardHeader className="flex flex-row items-center justify-between px-6 pt-6 pb-2">
            <CardTitle className="text-base font-semibold text-[#f5f5f5]">
              Ultimi Lead
            </CardTitle>
            <Link
              href="/pipeline"
              className="text-xs text-[#c9a96e] hover:underline bg-[#c9a96e]/10 px-2 py-1 rounded"
            >
              Vedi tutti →
            </Link>
          </CardHeader>
          <CardContent className="p-0">
            {latestLeads.length === 0 ? (
              <p className="px-6 py-4 text-[#888] text-sm text-center">
                Nessun lead trovato
              </p>
            ) : (
              <div className="md:block hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/5">
                      <th className="text-left px-6 py-3 text-xs text-[#888] font-medium uppercase tracking-wider">
                        Azienda
                      </th>
                      <th className="text-left px-4 py-3 text-xs text-[#888] font-medium uppercase tracking-wider">
                        Settore
                      </th>
                      <th className="text-left px-4 py-3 text-xs text-[#888] font-medium uppercase tracking-wider">
                        Stato
                      </th>
                      <th className="text-right px-6 py-3 text-xs text-[#888] font-medium uppercase tracking-wider">
                        Score
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {latestLeads.map((lead) => (
                      <tr
                        key={lead.id}
                        className="border-b border-white/5 last:border-0 hover:bg-white/[0.02] transition-colors"
                      >
                        <td className="px-6 py-4">
                          <Link
                            href={`/pipeline/${lead.id}`}
                            className="text-[#f5f5f5] hover:text-[#c9a96e] font-medium truncate max-w-[140px] block"
                          >
                            {lead.nomeAzienda || "-"}
                          </Link>
                        </td>
                        <td className="px-4 py-4 text-[#888]">
                          {lead.settore || "-"}
                        </td>
                        <td className="px-4 py-4">
                          <StatoBadge stato={lead.stato} />
                        </td>
                        <td className="px-6 py-4 text-right">
                          <span className="text-[#c9a96e] font-semibold">
                            {lead.score || "-"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {/* Mobile view cards */}
            <div className="md:hidden divide-y divide-white/5">
              {latestLeads.map((lead) => (
                <Link
                  key={lead.id}
                  href={`/pipeline/${lead.id}`}
                  className="flex items-center justify-between px-6 py-4 hover:bg-white/[0.02] transition-colors"
                >
                  <div className="min-w-0 flex-1 mr-4">
                    <p className="text-sm font-medium text-[#f5f5f5] truncate">
                      {lead.nomeAzienda}
                    </p>
                    <p className="text-[11px] text-[#555] truncate">
                      {lead.settore}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <StatoBadge stato={lead.stato} />
                    <span className="text-[10px] text-[#c9a96e] font-bold">
                      {lead.score || "-"}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Follow-up scaduti */}
        <Card className="glass-dark border-white/5">
          <CardHeader className="flex flex-row items-center justify-between px-6 pt-6 pb-2">
            <CardTitle className="text-base font-semibold text-[#f5f5f5]">
              Follow-up
            </CardTitle>
            <Calendar size={18} className="text-[#c9a96e]" />
          </CardHeader>
          <CardContent className="p-0">
            {followUps.length === 0 ? (
              <p className="px-6 py-8 text-[#555] text-sm text-center">
                Nessun follow-up in scadenza
              </p>
            ) : (
              <div className="divide-y divide-white/5">
                {followUps.map((lead) => (
                  <Link
                    key={lead.id}
                    href={`/pipeline/${lead.id}`}
                    className="flex items-center justify-between px-6 py-4 hover:bg-white/[0.02] transition-colors"
                  >
                    <div className="min-w-0 flex-1 mr-4">
                      <p className="text-sm font-medium text-[#f5f5f5] truncate">
                        {lead.nomeAzienda}
                      </p>
                      <p className="text-[11px] text-[#555] truncate">
                        {lead.settore}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-red-400 font-bold bg-red-400/10 px-2 py-0.5 rounded shadow-sm">
                        {formatDate(lead.dataFollowUp)}
                      </p>
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
    "Report completato": "bg-cyan-900/40 text-cyan-400",
    "Report inviato": "bg-purple-900/40 text-purple-400",
    "Follow-up": "bg-orange-900/40 text-orange-400",
    Acquisito: "bg-green-900/40 text-green-400",
    "Non interessato": "bg-red-900/40 text-red-400",
  };
  return (
    <span
      className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${colors[stato] ?? "bg-gray-800 text-gray-300"}`}
    >
      {stato || "-"}
    </span>
  );
}
