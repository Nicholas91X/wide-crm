import { getLeads, getReports, getClients } from "@/lib/db";
import { STATI_LEAD } from "@/lib/types";
import {
  GitBranch,
  Users,
  TrendingUp,
  Calendar,
  CheckCircle,
  AlertTriangle,
} from "lucide-react";
import Link from "next/link";

function formatDate(d: string) {
  if (!d) return "-";
  return new Date(d).toLocaleDateString("it-IT", {
    day: "2-digit",
    month: "short",
  });
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
      className={`inline-flex px-2 py-0.5 rounded text-[10px] font-medium ${colors[stato] ?? "bg-gray-800 text-gray-300"}`}
    >
      {stato || "-"}
    </span>
  );
}

const STATO_COLORS: Record<string, string> = {
  "Da contattare": "bg-gray-600",
  Contattato: "bg-blue-500",
  "Report in lavorazione": "bg-yellow-500",
  "Report completato": "bg-cyan-500",
  "Report inviato": "bg-purple-500",
  "Follow-up": "bg-orange-500",
  Acquisito: "bg-green-500",
  "Non interessato": "bg-red-800",
};

export default async function DashboardPage() {
  const [leads, reports, clients] = await Promise.all([
    getLeads().catch(() => []),
    getReports().catch(() => []),
    getClients().catch(() => []),
  ]);

  const now = new Date();
  const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const todayStr = now.toISOString().split("T")[0];
  const tomorrowStr = new Date(now.getTime() + 86400000)
    .toISOString()
    .split("T")[0];

  const activeClients = clients.filter((c) => c.statoContratto === "Attivo");
  const mrr = activeClients.reduce((s, c) => s + (c.valoreNetto || 0), 0);
  const acquisiti = leads.filter((l) => l.stato === "Acquisito").length;
  const reportsThisMonth = reports.filter(
    (r) => r.createdTime && new Date(r.createdTime) >= firstOfMonth,
  ).length;

  // Follow-up urgenti: any lead with dataFollowUp <= tomorrow, not acquired/not interested
  const followUpsUrgent = leads
    .filter((l) => {
      if (!l.dataFollowUp) return false;
      if (l.stato === "Acquisito" || l.stato === "Non interessato")
        return false;
      return l.dataFollowUp <= tomorrowStr;
    })
    .sort((a, b) => a.dataFollowUp.localeCompare(b.dataFollowUp))
    .slice(0, 8);

  // Pipeline distribution
  const statoDistribution = STATI_LEAD.map((s) => ({
    stato: s,
    count: leads.filter((l) => l.stato === s).length,
  })).filter((s) => s.count > 0);
  const maxCount = Math.max(...statoDistribution.map((s) => s.count), 1);

  const latestLeads = leads.slice(0, 5);

  const kpis = [
    {
      label: "Lead totali",
      value: leads.length,
      sub: "nella pipeline",
      icon: GitBranch,
      color: "text-[#c9a96e]",
    },
    {
      label: "Acquisiti",
      value: acquisiti,
      sub: `${reportsThisMonth} report questo mese`,
      icon: CheckCircle,
      color: "text-green-400",
    },
    {
      label: "Clienti attivi",
      value: activeClients.length,
      sub: "contratti in corso",
      icon: Users,
      color: "text-blue-400",
    },
    {
      label: "MRR",
      value: `€${mrr.toLocaleString("it-IT")}`,
      sub: "ricorrente mensile",
      icon: TrendingUp,
      color: "text-[#c9a96e]",
      large: true,
    },
  ];

  return (
    <div className="space-y-6 max-w-6xl">
      <div>
        <h1 className="text-2xl font-bold text-[#f5f5f5]">Dashboard</h1>
        <p className="text-[#888] text-sm mt-1">
          Panoramica della pipeline commerciale
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {kpis.map(({ label, value, sub, icon: Icon, color, large }) => (
          <div
            key={label}
            className="glass-dark border border-white/5 rounded-xl p-4"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] uppercase tracking-wider text-[#555] font-bold">
                {label}
              </span>
              <Icon size={14} className={color} />
            </div>
            <div
              className={`${large ? "text-xl" : "text-2xl"} font-black text-[#f5f5f5]`}
            >
              {value}
            </div>
            <p className="text-[10px] text-[#444] mt-1">{sub}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Pipeline Distribution */}
        <div className="lg:col-span-1 glass-dark border border-white/5 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold text-[#f5f5f5]">
              Distribuzione Pipeline
            </h2>
            <Link
              href="/pipeline"
              className="text-[10px] text-[#c9a96e] hover:underline"
            >
              Vedi →
            </Link>
          </div>
          {statoDistribution.length === 0 ? (
            <p className="text-[#555] text-xs text-center py-6">Nessun lead</p>
          ) : (
            <div className="space-y-2.5">
              {statoDistribution.map(({ stato, count }) => (
                <Link
                  key={stato}
                  href={`/pipeline?stato=${encodeURIComponent(stato)}`}
                  className="flex items-center gap-3 group"
                >
                  <span className="text-[10px] text-[#555] w-28 truncate group-hover:text-[#888] transition-colors flex-shrink-0">
                    {stato}
                  </span>
                  <div className="flex-1 bg-white/5 rounded-full h-1.5">
                    <div
                      className={`h-1.5 rounded-full transition-all ${STATO_COLORS[stato] ?? "bg-gray-600"}`}
                      style={{ width: `${(count / maxCount) * 100}%` }}
                    />
                  </div>
                  <span className="text-[10px] font-bold text-[#888] w-4 text-right flex-shrink-0">
                    {count}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Follow-up urgenti */}
        <div className="lg:col-span-2 glass-dark border border-white/5 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold text-[#f5f5f5] flex items-center gap-2">
              <Calendar size={14} className="text-[#c9a96e]" />
              Follow-up urgenti
              {followUpsUrgent.length > 0 && (
                <span className="bg-red-500/20 text-red-400 text-[10px] font-bold px-2 py-0.5 rounded-full border border-red-500/20">
                  {followUpsUrgent.length}
                </span>
              )}
            </h2>
            <Link
              href="/pipeline"
              className="text-[10px] text-[#c9a96e] hover:underline"
            >
              Pipeline →
            </Link>
          </div>
          {followUpsUrgent.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 gap-2">
              <CheckCircle size={20} className="text-green-500/40" />
              <p className="text-[#444] text-xs">
                Nessun follow-up in scadenza
              </p>
            </div>
          ) : (
            <div className="divide-y divide-white/5">
              {followUpsUrgent.map((lead) => {
                const isOverdue = lead.dataFollowUp < todayStr;
                const isToday = lead.dataFollowUp === todayStr;
                const urgencyClass = isOverdue
                  ? "text-red-400 bg-red-400/10 border-red-500/20"
                  : isToday
                    ? "text-orange-400 bg-orange-400/10 border-orange-500/20"
                    : "text-yellow-400 bg-yellow-400/10 border-yellow-500/20";
                return (
                  <Link
                    key={lead.id}
                    href={`/pipeline/${lead.id}`}
                    className="flex items-center justify-between py-2.5 hover:bg-white/[0.02] -mx-1 px-1 rounded transition-colors"
                  >
                    <div className="min-w-0 flex-1 mr-4">
                      <p className="text-sm font-medium text-[#f5f5f5] truncate">
                        {lead.nomeAzienda}
                      </p>
                      <p className="text-[10px] text-[#555]">
                        {lead.settore} · {lead.stato}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {isOverdue && (
                        <AlertTriangle size={12} className="text-red-400" />
                      )}
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded border ${urgencyClass}`}
                      >
                        {isOverdue ? "Scaduto" : isToday ? "Oggi" : "Domani"} ·{" "}
                        {formatDate(lead.dataFollowUp)}
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Ultimi Lead */}
      <div className="glass-dark border border-white/5 rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
          <h2 className="text-sm font-bold text-[#f5f5f5]">Ultimi Lead</h2>
          <Link
            href="/pipeline"
            className="text-[10px] text-[#c9a96e] hover:underline"
          >
            Vedi tutti →
          </Link>
        </div>
        {latestLeads.length === 0 ? (
          <p className="px-5 py-8 text-[#555] text-sm text-center">
            Nessun lead
          </p>
        ) : (
          <>
            {/* Desktop */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/5">
                    {["Azienda", "Settore", "Territorio", "Stato", "Score"].map(
                      (h) => (
                        <th
                          key={h}
                          className="text-left px-5 py-3 text-[10px] text-[#555] font-bold uppercase tracking-wider"
                        >
                          {h}
                        </th>
                      ),
                    )}
                  </tr>
                </thead>
                <tbody>
                  {latestLeads.map((lead) => (
                    <tr
                      key={lead.id}
                      className="border-b border-white/5 last:border-0 hover:bg-white/[0.02] transition-colors"
                    >
                      <td className="px-5 py-3">
                        <Link
                          href={`/pipeline/${lead.id}`}
                          className="font-semibold text-[#f5f5f5] hover:text-[#c9a96e] truncate max-w-[160px] block"
                        >
                          {lead.nomeAzienda || "-"}
                        </Link>
                      </td>
                      <td className="px-5 py-3 text-[#888] text-xs">
                        {lead.settore || "-"}
                      </td>
                      <td className="px-5 py-3 text-[#888] text-xs">
                        {lead.territorio || "-"}
                      </td>
                      <td className="px-5 py-3">
                        <StatoBadge stato={lead.stato} />
                      </td>
                      <td className="px-5 py-3 text-[#c9a96e] text-xs font-bold">
                        {lead.score || "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {/* Mobile */}
            <div className="md:hidden divide-y divide-white/5">
              {latestLeads.map((lead) => (
                <Link
                  key={lead.id}
                  href={`/pipeline/${lead.id}`}
                  className="flex items-center justify-between px-5 py-4 hover:bg-white/[0.02]"
                >
                  <div className="min-w-0 flex-1 mr-3">
                    <p className="text-sm font-medium text-[#f5f5f5] truncate">
                      {lead.nomeAzienda}
                    </p>
                    <p className="text-[10px] text-[#555]">{lead.settore}</p>
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
          </>
        )}
      </div>
    </div>
  );
}
