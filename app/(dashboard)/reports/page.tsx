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
import { Filter } from "lucide-react";
import { Report, SETTORI, STATI_REPORT, ESITI_REPORT } from "@/lib/types";

function formatDate(d: string) {
  if (!d) return "-";
  return new Date(d).toLocaleDateString("it-IT", { day: "2-digit", month: "short", year: "numeric" });
}

function StatoBadge({ stato }: { stato: string }) {
  const colors: Record<string, string> = {
    Bozza: "bg-gray-800 text-gray-300",
    Pronto: "bg-blue-900/40 text-blue-400",
    Inviato: "bg-green-900/40 text-green-400",
  };
  return (
    <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${colors[stato] ?? "bg-gray-800 text-gray-300"}`}>
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
    <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${colors[esito] ?? "bg-gray-800 text-gray-300"}`}>
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
      if (filters.stato && filters.stato !== "all") params.set("stato", filters.stato);
      if (filters.esito && filters.esito !== "all") params.set("esito", filters.esito);
      if (filters.settore && filters.settore !== "all") params.set("settore", filters.settore);
      const res = await fetch(`/api/reports?${params}`);
      if (!res.ok) throw new Error();
      setReports(await res.json());
    } catch {
      toast.error("Errore nel caricamento dei report");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [filters]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#f5f5f5]">Report</h1>
        <p className="text-[#888] text-sm mt-1">{reports.length} report generati</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <Filter size={16} className="text-[#888]" />
        <Select
          value={filters.stato || "all"}
          onValueChange={(v) => setFilters((f) => ({ ...f, stato: v === "all" ? "" : v }))}
        >
          <SelectTrigger className="w-36 bg-[#141414] border-[#1f1f1f] text-sm">
            <SelectValue placeholder="Stato" />
          </SelectTrigger>
          <SelectContent className="bg-[#141414] border-[#1f1f1f]">
            <SelectItem value="all">Tutti gli stati</SelectItem>
            {STATI_REPORT.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>

        <Select
          value={filters.esito || "all"}
          onValueChange={(v) => setFilters((f) => ({ ...f, esito: v === "all" ? "" : v }))}
        >
          <SelectTrigger className="w-36 bg-[#141414] border-[#1f1f1f] text-sm">
            <SelectValue placeholder="Esito" />
          </SelectTrigger>
          <SelectContent className="bg-[#141414] border-[#1f1f1f]">
            <SelectItem value="all">Tutti gli esiti</SelectItem>
            {ESITI_REPORT.map((e) => <SelectItem key={e} value={e}>{e}</SelectItem>)}
          </SelectContent>
        </Select>

        <Select
          value={filters.settore || "all"}
          onValueChange={(v) => setFilters((f) => ({ ...f, settore: v === "all" ? "" : v }))}
        >
          <SelectTrigger className="w-40 bg-[#141414] border-[#1f1f1f] text-sm">
            <SelectValue placeholder="Settore" />
          </SelectTrigger>
          <SelectContent className="bg-[#141414] border-[#1f1f1f]">
            <SelectItem value="all">Tutti i settori</SelectItem>
            {SETTORI.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-[#c9a96e] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : reports.length === 0 ? (
        <div className="text-center py-20 text-[#888]">Nessun report trovato</div>
      ) : (
        <Card className="bg-[#141414] border-[#1f1f1f] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#1f1f1f]">
                  {["Titolo", "Azienda", "Settore", "Data generazione", "Stato", "Esito"].map((h) => (
                    <th key={h} className="text-left px-4 py-3 text-xs text-[#888] font-medium whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {reports.map((r) => (
                  <tr
                    key={r.id}
                    className="border-b border-[#1f1f1f] last:border-0 hover:bg-[#1a1a1a] transition-colors cursor-pointer"
                  >
                    <td className="px-4 py-3">
                      <Link
                        href={`/reports/${r.id}`}
                        className="font-medium text-[#f5f5f5] hover:text-[#c9a96e] max-w-[200px] block truncate"
                      >
                        {r.titolo || "-"}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-[#888]">{r.azienda || "-"}</td>
                    <td className="px-4 py-3 text-[#888]">{r.settore || "-"}</td>
                    <td className="px-4 py-3 text-[#888] whitespace-nowrap">{formatDate(r.dataGenerazione)}</td>
                    <td className="px-4 py-3"><StatoBadge stato={r.stato} /></td>
                    <td className="px-4 py-3"><EsitoBadge esito={r.esito} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
