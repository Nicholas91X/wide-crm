"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Filter, FileText, MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Report, SETTORI, STATI_REPORT, ESITI_REPORT } from "@/lib/types";

function formatDate(d: string) {
  if (!d) return "-";
  return new Date(d).toLocaleDateString("it-IT", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function StatoBadge({ stato }: { stato: string }) {
  const colors: Record<string, string> = {
    Bozza: "bg-gray-800 text-gray-300",
    Pronto: "bg-blue-900/40 text-blue-400",
    Inviato: "bg-green-900/40 text-green-400",
  };
  return (
    <span
      className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${colors[stato] ?? "bg-gray-800 text-gray-300"}`}
    >
      {stato || "-"}
    </span>
  );
}

function EsitoBadge({ esito }: { esito: string }) {
  const colors: Record<string, string> = {
    "In attesa": "bg-yellow-900/40 text-yellow-400",
    "Interesse manifestato": "bg-blue-900/40 text-blue-400",
    "Call prenotata": "bg-purple-900/40 text-purple-400",
    Acquisito: "bg-green-900/40 text-green-400",
    "Nessuna risposta": "bg-gray-800 text-gray-400",
    Rifiutato: "bg-red-900/40 text-red-400",
  };
  return (
    <span
      className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${colors[esito] ?? "bg-gray-800 text-gray-300"}`}
    >
      {esito || "-"}
    </span>
  );
}

export default function ReportsPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ stato: "", esito: "", settore: "" });

  async function load() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.stato && filters.stato !== "all")
        params.set("stato", filters.stato);
      if (filters.esito && filters.esito !== "all")
        params.set("esito", filters.esito);
      if (filters.settore && filters.settore !== "all")
        params.set("settore", filters.settore);
      const res = await fetch(`/api/reports?${params}`);
      if (!res.ok) throw new Error();
      setReports(await res.json());
    } catch {
      toast.error("Errore nel caricamento dei report");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [filters]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#f5f5f5] tracking-tight">
            Report
          </h1>
          <p className="text-[#555] text-xs mt-1 uppercase tracking-widest">
            {reports.length} report generati
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-2 md:flex md:flex-wrap gap-2 md:gap-3 items-center">
        <div className="flex items-center gap-2 col-span-2 md:col-auto mb-1 md:mb-0">
          <Filter size={14} className="text-[#555]" />
          <span className="text-[10px] uppercase text-[#555] font-bold tracking-widest hidden md:inline">
            Filtri
          </span>
        </div>

        <Select
          value={filters.stato || "all"}
          onValueChange={(v) =>
            setFilters((f) => ({ ...f, stato: v === "all" ? "" : v }))
          }
        >
          <SelectTrigger className="glass border-white/5 text-xs h-9">
            <SelectValue placeholder="Stato" />
          </SelectTrigger>
          <SelectContent className="glass-dark border-white/10">
            <SelectItem value="all">Tutti gli stati</SelectItem>
            {STATI_REPORT.map((s) => (
              <SelectItem key={s} value={s}>
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={filters.esito || "all"}
          onValueChange={(v) =>
            setFilters((f) => ({ ...f, esito: v === "all" ? "" : v }))
          }
        >
          <SelectTrigger className="glass border-white/5 text-xs h-9">
            <SelectValue placeholder="Esito" />
          </SelectTrigger>
          <SelectContent className="glass-dark border-white/10">
            <SelectItem value="all">Tutti gli esiti</SelectItem>
            {ESITI_REPORT.map((e) => (
              <SelectItem key={e} value={e}>
                {e}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={filters.settore || "all"}
          onValueChange={(v) =>
            setFilters((f) => ({ ...f, settore: v === "all" ? "" : v }))
          }
        >
          <SelectTrigger className="glass border-white/5 text-xs h-9">
            <SelectValue placeholder="Settore" />
          </SelectTrigger>
          <SelectContent className="glass-dark border-white/10">
            <SelectItem value="all">Tutti i settori</SelectItem>
            {SETTORI.map((s) => (
              <SelectItem key={s} value={s}>
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-[#c9a96e] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : reports.length === 0 ? (
        <div className="text-center py-20 text-[#888]">
          Nessun report trovato
        </div>
      ) : (
        <Card className="glass-dark border-white/5 overflow-hidden">
          {/* Desktop Table */}
          <div className="md:block hidden overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/5">
                  {[
                    "Titolo",
                    "Azienda",
                    "Settore",
                    "Data",
                    "Stato",
                    "Esito",
                  ].map((h) => (
                    <th
                      key={h}
                      className="text-left px-4 py-4 text-[10px] text-[#555] font-bold uppercase tracking-widest whitespace-nowrap"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {reports.map((r) => (
                  <tr
                    key={r.id}
                    className="border-b border-white/5 last:border-0 hover:bg-white/[0.02] transition-colors"
                  >
                    <td className="px-4 py-4">
                      <Link
                        href={`/reports/${r.id}`}
                        className="font-semibold text-[#f5f5f5] hover:text-[#c9a96e] max-w-[200px] block truncate transition-colors"
                      >
                        {r.titolo || "-"}
                      </Link>
                    </td>
                    <td className="px-4 py-4 text-[#888] text-xs">
                      {r.azienda || "-"}
                    </td>
                    <td className="px-4 py-4 text-[#888] text-xs">
                      {r.settore || "-"}
                    </td>
                    <td className="px-4 py-4 text-[#555] text-xs whitespace-nowrap">
                      {formatDate(r.dataGenerazione)}
                    </td>
                    <td className="px-4 py-4">
                      <StatoBadge stato={r.stato} />
                    </td>
                    <td className="px-4 py-4">
                      <EsitoBadge esito={r.esito} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden divide-y divide-white/5">
            {reports.map((r) => (
              <Link
                key={r.id}
                href={`/reports/${r.id}`}
                className="block p-4 hover:bg-white/[0.02] transition-colors active:bg-white/[0.05]"
              >
                <div className="flex justify-between items-start mb-2">
                  <div className="min-w-0 flex-1 pr-2">
                    <h3 className="font-bold text-[#f5f5f5] text-sm truncate">
                      {r.titolo}
                    </h3>
                    <p className="text-[10px] text-[#555] font-bold uppercase tracking-widest mt-0.5">
                      {r.azienda}
                    </p>
                  </div>
                  <StatoBadge stato={r.stato} />
                </div>

                <div className="flex items-center justify-between mt-3 text-[10px]">
                  <div className="flex items-center gap-3">
                    <span className="text-[#555] font-medium">{r.settore}</span>
                    <span className="text-[#555]">•</span>
                    <span className="text-[#555]">
                      {formatDate(r.dataGenerazione)}
                    </span>
                  </div>
                  <EsitoBadge esito={r.esito} />
                </div>
              </Link>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
