"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { ArrowLeft, Shield, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

type AuditLog = {
  id: string;
  createdTime: string;
  azione: string;
  entita: string;
  nomeEntita: string;
  eseguitaDa: string;
  data: string;
  dettagli?: string;
};

const AZIONE_STYLES: Record<string, string> = {
  Creazione: "bg-green-900/20 text-green-400 border-green-800/30",
  Modifica: "bg-blue-900/20 text-blue-400 border-blue-800/30",
  Cancellazione: "bg-red-900/20 text-red-400 border-red-800/30",
  Generazione: "bg-purple-900/20 text-purple-400 border-purple-800/30",
  Ricerca: "bg-yellow-900/20 text-yellow-400 border-yellow-800/30",
  Accesso: "bg-[#1a1a1a] text-[#999] border-white/5",
};

const ENTITA_STYLES: Record<string, string> = {
  Lead: "text-[#c9a96e]",
  Report: "text-blue-400",
  Cliente: "text-green-400",
  "Ricerca Lead": "text-purple-400",
};

function formatDate(d: string) {
  if (!d) return "—";
  return new Date(d).toLocaleString("it-IT", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function AuditLogsPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const role = (session?.user as any)?.role;

  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("Tutti");

  async function loadLogs() {
    setLoading(true);
    try {
      const res = await fetch("/api/audit-logs");
      const data = await res.json();
      setLogs(Array.isArray(data) ? data : []);
    } catch {
      setLogs([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (role === "admin") loadLogs();
  }, [role]);

  if (role && role !== "admin") {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <Shield size={32} className="text-[#777]" />
        <p className="text-[#999] text-sm">
          Accesso riservato agli amministratori
        </p>
      </div>
    );
  }

  const FILTERS = [
    "Tutti",
    "Creazione",
    "Modifica",
    "Cancellazione",
    "Generazione",
    "Ricerca",
  ];
  const filtered =
    filter === "Tutti" ? logs : logs.filter((l) => l.azione === filter);

  return (
    <div className="max-w-4xl space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push("/settings")}
          className="text-[#999] hover:text-[#f5f5f5] bg-white/5 rounded-full"
        >
          <ArrowLeft size={16} />
        </Button>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-[#f5f5f5] flex items-center gap-2">
            <Shield size={18} className="text-[#c9a96e]" />
            Log Attività
          </h1>
          <p className="text-[#999] text-xs mt-0.5">
            Registro di tutte le operazioni eseguite
          </p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={loadLogs}
          disabled={loading}
          className="text-[#999] hover:text-[#f5f5f5]"
          title="Aggiorna"
        >
          <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
        </Button>
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
              filter === f
                ? "bg-[#c9a96e]/20 text-[#c9a96e] border-[#c9a96e]/30"
                : "bg-[#0d0d0d] text-[#999] border-white/5 hover:text-[#ccc]"
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Log list */}
      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className="glass-dark border border-white/5 rounded-xl p-4 animate-pulse"
            >
              <div className="flex gap-3 items-center">
                <div className="h-5 w-16 bg-white/5 rounded-full" />
                <div className="h-4 w-24 bg-white/5 rounded" />
                <div className="h-3 w-32 bg-white/5 rounded ml-auto" />
              </div>
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <Shield size={28} className="text-[#777] mx-auto mb-3" />
          <p className="text-[#999] text-sm">Nessun log trovato</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((log) => (
            <div
              key={log.id}
              className="glass-dark border border-white/5 rounded-xl px-4 py-3"
            >
              <div className="flex items-start gap-3 flex-wrap">
                {/* Azione badge */}
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-full border font-bold flex-shrink-0 mt-0.5 ${AZIONE_STYLES[log.azione] ?? AZIONE_STYLES["Accesso"]}`}
                >
                  {log.azione}
                </span>

                {/* Main info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className={`text-xs font-semibold ${ENTITA_STYLES[log.entita] ?? "text-[#ccc]"}`}
                    >
                      {log.entita}
                    </span>
                    <span className="text-xs text-[#ddd] truncate">
                      {log.nomeEntita}
                    </span>
                  </div>
                  {log.dettagli && (
                    <p className="text-[11px] text-[#888] mt-0.5 truncate max-w-md">
                      {log.dettagli}
                    </p>
                  )}
                </div>

                {/* Meta */}
                <div className="text-right flex-shrink-0">
                  <p className="text-[11px] text-[#999]">{log.eseguitaDa}</p>
                  <p className="text-[10px] text-[#777] mt-0.5">
                    {formatDate(log.createdTime)}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && filtered.length > 0 && (
        <p className="text-center text-[10px] text-[#777]">
          {filtered.length} event{filtered.length === 1 ? "o" : "i"} · ultimi
          100
        </p>
      )}
    </div>
  );
}
