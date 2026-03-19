"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Sparkles,
  ChevronRight,
  Globe,
  Calendar,
  User,
  Search,
} from "lucide-react";
import { SearchLog } from "@/lib/types";

function formatDate(d: string) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("it-IT", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

const METHOD_STYLES: Record<string, string> = {
  Tavily: "bg-green-900/20 text-green-400 border-green-800/30",
  "Web Search": "bg-blue-900/20 text-blue-400 border-blue-800/30",
  "Conoscenza Base": "bg-[#1a1a1a] text-[#555] border-white/5",
};

function MethodBadge({ method }: { method: string }) {
  const style = METHOD_STYLES[method] ?? METHOD_STYLES["Conoscenza Base"];
  return (
    <span
      className={`text-[10px] px-2 py-0.5 rounded-full border font-bold ${style}`}
    >
      {method || "—"}
    </span>
  );
}

function StatPill({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div className="flex items-center gap-1.5">
      <span className={`text-xs font-bold ${color}`}>{value}</span>
      <span className="text-[10px] text-[#999]">{label}</span>
    </div>
  );
}

export default function LeadsPage() {
  const router = useRouter();
  const [logs, setLogs] = useState<SearchLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetch("/api/search-logs")
      .then((r) => r.json())
      .then((data) => setLogs(Array.isArray(data) ? data : []))
      .catch(() => setLogs([]))
      .finally(() => setLoading(false));
  }, []);

  function toggleExpand(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const totalTrovati = logs.reduce((s, l) => s + (l.numTrovati || 0), 0);
  const totalAggiunti = logs.reduce((s, l) => s + (l.numAggiunti || 0), 0);

  return (
    <div className="max-w-4xl mx-auto px-1 md:px-0 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-[#f5f5f5] tracking-tight flex items-center gap-2">
            <Sparkles size={18} className="text-[#c9a96e]" />
            Lead Discovery
          </h1>
          <p className="text-[#999] text-xs mt-0.5">
            Storico ricerche AI e lead generati
          </p>
        </div>
        <Button
          onClick={() => router.push("/leads/discover")}
          className="bg-[#c9a96e] hover:bg-[#b8945a] text-[#0a0a0a] font-bold h-9 text-xs px-4 flex-shrink-0"
        >
          <Search size={13} className="mr-1.5" /> Nuova ricerca
        </Button>
      </div>

      {/* Summary stats */}
      {logs.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          {[
            {
              label: "Ricerche totali",
              value: logs.length,
              color: "text-[#c9a96e]",
            },
            {
              label: "Lead trovati",
              value: totalTrovati,
              color: "text-blue-400",
            },
            {
              label: "Lead aggiunti",
              value: totalAggiunti,
              color: "text-green-400",
            },
          ].map((s) => (
            <div
              key={s.label}
              className="glass-dark border border-white/5 rounded-xl p-4 text-center"
            >
              <p className={`text-2xl font-black ${s.color}`}>{s.value}</p>
              <p className="text-[10px] text-[#555] mt-0.5 uppercase tracking-wider">
                {s.label}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Log list */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="glass-dark border border-white/5 rounded-xl p-5 animate-pulse"
            >
              <div className="flex gap-3">
                <div className="flex-1 space-y-2">
                  <div className="h-3 bg-white/5 rounded w-1/2" />
                  <div className="h-2 bg-white/5 rounded w-1/3" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : logs.length === 0 ? (
        <div className="text-center py-20 space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-[#c9a96e]/10 border border-[#c9a96e]/20 flex items-center justify-center mx-auto">
            <Sparkles size={24} className="text-[#c9a96e]" />
          </div>
          <div>
            <p className="text-[#ccc] text-sm font-medium">
              Nessuna ricerca ancora effettuata
            </p>
            <p className="text-[#888] text-xs mt-1">
              Avvia la prima ricerca per trovare potenziali clienti
            </p>
          </div>
          <Button
            onClick={() => router.push("/leads/discover")}
            className="bg-[#c9a96e] hover:bg-[#b8945a] text-[#0a0a0a] font-bold h-9 text-xs"
          >
            <Search size={13} className="mr-1.5" /> Inizia a cercare
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {logs.map((log) => {
            const isOpen = expanded.has(log.id);
            return (
              <div
                key={log.id}
                className="glass-dark border border-white/5 rounded-xl overflow-hidden"
              >
                {/* Row */}
                <button
                  className="w-full flex items-center gap-4 px-5 py-4 text-left hover:bg-white/2 transition-colors"
                  onClick={() => toggleExpand(log.id)}
                >
                  {/* Date */}
                  <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center">
                    <Calendar size={14} className="text-[#555]" />
                  </div>

                  {/* Main info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="text-sm font-bold text-[#f5f5f5] truncate">
                        {log.titolo || "Ricerca senza titolo"}
                      </span>
                      <MethodBadge method={log.metodo} />
                    </div>
                    <div className="flex items-center gap-3 flex-wrap">
                      <div className="flex items-center gap-1 text-[11px] text-[#555]">
                        <User size={10} />
                        <span>{log.effettuataDa || "—"}</span>
                      </div>
                      <span className="text-[#333] text-[10px]">·</span>
                      <span className="text-[11px] text-[#555]">
                        {formatDate(log.dataRicerca || log.createdTime)}
                      </span>
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="flex-shrink-0 hidden sm:flex items-center gap-4 mr-2">
                    <StatPill
                      label="trovati"
                      value={log.numTrovati || 0}
                      color="text-[#f5f5f5]"
                    />
                    <StatPill
                      label="aggiunti"
                      value={log.numAggiunti || 0}
                      color="text-green-400"
                    />
                  </div>

                  <ChevronRight
                    size={14}
                    className={`text-[#555] flex-shrink-0 transition-transform ${isOpen ? "rotate-90" : ""}`}
                  />
                </button>

                {/* Expanded detail */}
                {isOpen && (
                  <div className="border-t border-white/5 px-5 py-4 space-y-4">
                    {/* Criteria */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {[
                        { label: "Settore", value: log.settore },
                        { label: "Territorio", value: log.territorio },
                        { label: "Tipo attività", value: log.tipoAttivita },
                        {
                          label: "Richiesti",
                          value: log.numRichiesti
                            ? `${log.numRichiesti} lead`
                            : null,
                        },
                      ]
                        .filter((f) => f.value)
                        .map((f) => (
                          <div key={f.label}>
                            <p className="text-[10px] text-[#444] uppercase tracking-wider mb-0.5">
                              {f.label}
                            </p>
                            <p className="text-xs text-[#ccc] font-medium">
                              {f.value}
                            </p>
                          </div>
                        ))}
                    </div>

                    {log.criteriAggiuntivi && (
                      <div>
                        <p className="text-[10px] text-[#444] uppercase tracking-wider mb-1">
                          Criteri aggiuntivi
                        </p>
                        <p className="text-xs text-[#888] italic">
                          {log.criteriAggiuntivi}
                        </p>
                      </div>
                    )}

                    {/* Stats mobile */}
                    <div className="flex items-center gap-4 sm:hidden">
                      <StatPill
                        label="trovati"
                        value={log.numTrovati || 0}
                        color="text-[#f5f5f5]"
                      />
                      <StatPill
                        label="aggiunti"
                        value={log.numAggiunti || 0}
                        color="text-green-400"
                      />
                    </div>

                    {/* Lead list */}
                    {log.leads && log.leads.length > 0 ? (
                      <div>
                        <p className="text-[10px] text-[#444] uppercase tracking-wider mb-2">
                          Lead trovati
                        </p>
                        <div className="space-y-2">
                          {log.leads.map(
                            (
                              l: {
                                aggiunto?: boolean;
                                nomeAzienda?: string;
                                sitoWeb?: string;
                                note?: string;
                              },
                              i: number,
                            ) => (
                              <div
                                key={i}
                                className="flex items-start gap-3 py-2 border-b border-white/5 last:border-0"
                              >
                                <div
                                  className={`w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 ${l.aggiunto ? "bg-green-400" : "bg-[#333]"}`}
                                />
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="text-xs font-semibold text-[#ddd]">
                                      {l.nomeAzienda}
                                    </span>
                                    {l.aggiunto && (
                                      <span className="text-[11px] text-[#999] font-bold">
                                        Aggiunto
                                      </span>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                                    {l.sitoWeb && (
                                      <a
                                        href={l.sitoWeb}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center gap-1 text-[11px] text-[#555] hover:text-[#c9a96e]"
                                      >
                                        <Globe size={9} />
                                        {l.sitoWeb
                                          .replace(/^https?:\/\//, "")
                                          .slice(0, 30)}
                                      </a>
                                    )}
                                    {l.note && (
                                      <span className="text-[11px] text-[#888] italic truncate max-w-[200px]">
                                        {l.note}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            ),
                          )}
                        </div>
                      </div>
                    ) : (
                      <p className="text-[11px] font-medium text-[#ccc] mb-1 italic">
                        Dettaglio lead non disponibile per questa ricerca
                      </p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
