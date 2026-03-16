"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Plus, MoreHorizontal, List, Columns, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Lead, STATI_LEAD, SETTORI, SCORE_OPTIONS } from "@/lib/types";

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

function formatDate(d: string) {
  if (!d) return "-";
  return new Date(d).toLocaleDateString("it-IT", { day: "2-digit", month: "short" });
}

const KANBAN_COLS = [
  "Da contattare",
  "Contattato",
  "Report in lavorazione",
  "Report inviato",
  "Follow-up",
  "Acquisito",
  "Non interessato",
];

export default function PipelinePage() {
  const { data: session } = useSession();
  const router = useRouter();
  const role = (session?.user as any)?.role;
  const canEdit = role === "admin" || role === "editor";

  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"table" | "kanban">("table");
  const [filters, setFilters] = useState({ settore: "", stato: "", territorio: "", score: "" });

  async function loadLeads() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.settore && filters.settore !== "all") params.set("settore", filters.settore);
      if (filters.stato && filters.stato !== "all") params.set("stato", filters.stato);
      if (filters.territorio) params.set("territorio", filters.territorio);
      if (filters.score && filters.score !== "all") params.set("score", filters.score);
      const res = await fetch(`/api/leads?${params}`);
      if (!res.ok) throw new Error();
      setLeads(await res.json());
    } catch {
      toast.error("Errore nel caricamento dei lead");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadLeads(); }, [filters]);

  async function markAcquired(id: string) {
    try {
      await fetch(`/api/leads/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stato: "Acquisito" }),
      });
      toast.success("Lead segnato come Acquisito");
      loadLeads();
    } catch {
      toast.error("Errore nell'aggiornamento");
    }
  }

  async function archiveLead(id: string) {
    try {
      await fetch(`/api/leads/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stato: "Non interessato" }),
      });
      toast.success("Lead archiviato");
      loadLeads();
    } catch {
      toast.error("Errore nell'archiviazione");
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#f5f5f5]">Pipeline</h1>
          <p className="text-[#888] text-sm mt-1">{leads.length} lead totali</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setView("table")}
            className={view === "table" ? "text-[#c9a96e]" : "text-[#888]"}
            title="Vista tabella"
          >
            <List size={18} />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setView("kanban")}
            className={view === "kanban" ? "text-[#c9a96e]" : "text-[#888]"}
            title="Vista kanban"
          >
            <Columns size={18} />
          </Button>
          {canEdit && (
            <Button
              onClick={() => router.push("/pipeline/new")}
              className="bg-[#c9a96e] hover:bg-[#b8945a] text-[#0a0a0a] font-medium"
            >
              <Plus size={16} className="mr-1" /> Nuovo Lead
            </Button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <Filter size={16} className="text-[#888]" />
        <Select
          value={filters.settore || "all"}
          onValueChange={(v) => setFilters((f) => ({ ...f, settore: v === "all" ? "" : v }))}
        >
          <SelectTrigger className="w-40 bg-[#141414] border-[#1f1f1f] text-sm">
            <SelectValue placeholder="Settore" />
          </SelectTrigger>
          <SelectContent className="bg-[#141414] border-[#1f1f1f]">
            <SelectItem value="all">Tutti i settori</SelectItem>
            {SETTORI.map((s) => (
              <SelectItem key={s} value={s}>{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={filters.stato || "all"}
          onValueChange={(v) => setFilters((f) => ({ ...f, stato: v === "all" ? "" : v }))}
        >
          <SelectTrigger className="w-44 bg-[#141414] border-[#1f1f1f] text-sm">
            <SelectValue placeholder="Stato" />
          </SelectTrigger>
          <SelectContent className="bg-[#141414] border-[#1f1f1f]">
            <SelectItem value="all">Tutti gli stati</SelectItem>
            {STATI_LEAD.map((s) => (
              <SelectItem key={s} value={s}>{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={filters.score || "all"}
          onValueChange={(v) => setFilters((f) => ({ ...f, score: v === "all" ? "" : v }))}
        >
          <SelectTrigger className="w-36 bg-[#141414] border-[#1f1f1f] text-sm">
            <SelectValue placeholder="Score" />
          </SelectTrigger>
          <SelectContent className="bg-[#141414] border-[#1f1f1f]">
            <SelectItem value="all">Tutti gli score</SelectItem>
            {SCORE_OPTIONS.map((s) => (
              <SelectItem key={s} value={s}>{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Input
          placeholder="Filtra territorio..."
          value={filters.territorio}
          onChange={(e) => setFilters((f) => ({ ...f, territorio: e.target.value }))}
          className="w-48 bg-[#141414] border-[#1f1f1f] text-sm"
        />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-[#c9a96e] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : view === "table" ? (
        <TableView leads={leads} canEdit={canEdit} onMarkAcquired={markAcquired} onArchive={archiveLead} />
      ) : (
        <KanbanView leads={leads} />
      )}
    </div>
  );
}

function TableView({
  leads,
  canEdit,
  onMarkAcquired,
  onArchive,
}: {
  leads: Lead[];
  canEdit: boolean;
  onMarkAcquired: (id: string) => void;
  onArchive: (id: string) => void;
}) {
  const router = useRouter();

  if (leads.length === 0) {
    return (
      <div className="text-center py-20 text-[#888]">
        Nessun lead trovato
      </div>
    );
  }

  return (
    <Card className="bg-[#141414] border-[#1f1f1f] overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#1f1f1f]">
              {["Nome Azienda", "Settore", "Territorio", "Score", "Stato", "1° Contatto", "Follow-up", "Risposta", ""].map(
                (h) => (
                  <th
                    key={h}
                    className="text-left px-4 py-3 text-xs text-[#888] font-medium whitespace-nowrap"
                  >
                    {h}
                  </th>
                )
              )}
            </tr>
          </thead>
          <tbody>
            {leads.map((lead) => (
              <tr
                key={lead.id}
                className="border-b border-[#1f1f1f] last:border-0 hover:bg-[#1a1a1a] transition-colors"
              >
                <td className="px-4 py-3">
                  <Link
                    href={`/pipeline/${lead.id}`}
                    className="font-medium text-[#f5f5f5] hover:text-[#c9a96e] max-w-[180px] block truncate"
                  >
                    {lead.nomeAzienda || "-"}
                  </Link>
                </td>
                <td className="px-4 py-3 text-[#888]">{lead.settore || "-"}</td>
                <td className="px-4 py-3 text-[#888]">{lead.territorio || "-"}</td>
                <td className="px-4 py-3 text-sm">{lead.score || "-"}</td>
                <td className="px-4 py-3"><StatoBadge stato={lead.stato} /></td>
                <td className="px-4 py-3 text-[#888] whitespace-nowrap">{formatDate(lead.dataPrimoContatto)}</td>
                <td className="px-4 py-3 text-[#888] whitespace-nowrap">{formatDate(lead.dataFollowUp)}</td>
                <td className="px-4 py-3 text-[#888] max-w-[120px] truncate">{lead.risposta || "-"}</td>
                <td className="px-4 py-3">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-[#888]">
                        <MoreHorizontal size={16} />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="bg-[#141414] border-[#1f1f1f]" align="end">
                      <DropdownMenuItem
                        className="text-[#f5f5f5] hover:bg-[#1f1f1f] cursor-pointer"
                        onClick={() => router.push(`/pipeline/${lead.id}`)}
                      >
                        Apri dettaglio
                      </DropdownMenuItem>
                      {canEdit && (
                        <>
                          <DropdownMenuItem
                            className="text-[#f5f5f5] hover:bg-[#1f1f1f] cursor-pointer"
                            onClick={() => router.push(`/pipeline/${lead.id}?generate=1`)}
                          >
                            Genera Report
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-green-400 hover:bg-[#1f1f1f] cursor-pointer"
                            onClick={() => onMarkAcquired(lead.id)}
                          >
                            Segna Acquisito
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-red-400 hover:bg-[#1f1f1f] cursor-pointer"
                            onClick={() => onArchive(lead.id)}
                          >
                            Archivia
                          </DropdownMenuItem>
                        </>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function KanbanView({ leads }: { leads: Lead[] }) {
  return (
    <div className="overflow-x-auto pb-4">
      <div className="flex gap-4 min-w-max">
        {KANBAN_COLS.map((col) => {
          const colLeads = leads.filter((l) => l.stato === col);
          return (
            <div key={col} className="w-60 flex-shrink-0">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-semibold text-[#888] uppercase tracking-wider">
                  {col}
                </h3>
                <span className="text-xs bg-[#1f1f1f] text-[#888] rounded-full px-2 py-0.5">
                  {colLeads.length}
                </span>
              </div>
              <div className="space-y-2">
                {colLeads.map((lead) => (
                  <Link key={lead.id} href={`/pipeline/${lead.id}`}>
                    <div className="bg-[#141414] border border-[#1f1f1f] rounded-lg p-3 hover:border-[#c9a96e]/40 transition-colors cursor-pointer">
                      <p className="text-sm font-medium text-[#f5f5f5] truncate">{lead.nomeAzienda}</p>
                      <p className="text-xs text-[#888] mt-1">{lead.settore} · {lead.territorio}</p>
                      {lead.score && (
                        <p className="text-xs text-[#c9a96e] mt-2 font-semibold">{lead.score}</p>
                      )}
                    </div>
                  </Link>
                ))}
                {colLeads.length === 0 && (
                  <div className="border border-dashed border-[#1f1f1f] rounded-lg p-4 text-center text-xs text-[#555]">
                    Vuoto
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
