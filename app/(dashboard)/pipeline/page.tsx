"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Plus, MoreHorizontal, List, Columns, Filter, Sparkles, GripVertical, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
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
import {
  DndContext,
  DragEndEvent,
  useDraggable,
  useDroppable,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";

function exportLeadsCSV(leads: Lead[]) {
  const headers = ["Nome Azienda", "Settore", "Territorio", "Stato", "Score", "Canale", "Data primo contatto", "Data follow-up", "Risposta", "Sito Web", "Inserito da"];
  const rows = leads.map(l => [
    l.nomeAzienda, l.settore, l.territorio, l.stato, l.score, l.canale,
    l.dataPrimoContatto, l.dataFollowUp, l.risposta, l.sitoWeb, l.inseritoDA,
  ].map(v => `"${(v || "").replace(/"/g, '""')}"`).join(","));
  const csv = [headers.join(","), ...rows].join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `pipeline_${new Date().toISOString().split("T")[0]}.csv`;
  a.click();
  URL.revokeObjectURL(url);
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

function formatDate(d: string) {
  if (!d) return "-";
  return new Date(d).toLocaleDateString("it-IT", {
    day: "2-digit",
    month: "short",
  });
}

const KANBAN_COLS = [
  "Da contattare",
  "Contattato",
  "Report in lavorazione",
  "Report completato",
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
  const [filters, setFilters] = useState({
    settore: "",
    stato: "",
    territorio: "",
    score: "",
  });

  async function loadLeads() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.settore && filters.settore !== "all")
        params.set("settore", filters.settore);
      if (filters.stato && filters.stato !== "all")
        params.set("stato", filters.stato);
      if (filters.territorio) params.set("territorio", filters.territorio);
      if (filters.score && filters.score !== "all")
        params.set("score", filters.score);
      const res = await fetch(`/api/leads?${params}`);
      if (!res.ok) throw new Error();
      setLeads(await res.json());
    } catch {
      toast.error("Errore nel caricamento dei lead");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadLeads();
  }, [filters]);

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

  async function moveCard(leadId: string, newStato: string) {
    const original = leads.find((l) => l.id === leadId)?.stato;
    setLeads((prev) => prev.map((l) => l.id === leadId ? { ...l, stato: newStato } : l));
    try {
      const res = await fetch(`/api/leads/${leadId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stato: newStato }),
      });
      if (!res.ok) throw new Error();
      toast.success(`Spostato in "${newStato}"`);
    } catch {
      if (original) setLeads((prev) => prev.map((l) => l.id === leadId ? { ...l, stato: original } : l));
      toast.error("Errore nello spostamento");
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#f5f5f5] tracking-tight">
            Pipeline
          </h1>
          <p className="text-[#555] text-xs mt-1 uppercase tracking-widest">
            {leads.length} lead totali
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-white/5 rounded-lg p-1 border border-white/5">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setView("table")}
              className={cn(
                "h-8 gap-2",
                view === "table"
                  ? "bg-[#c9a96e]/10 text-[#c9a96e]"
                  : "text-[#888]",
              )}
            >
              <List size={16} />
              <span className="text-xs hidden sm:inline">Lista</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setView("kanban")}
              className={cn(
                "h-8 gap-2",
                view === "kanban"
                  ? "bg-[#c9a96e]/10 text-[#c9a96e]"
                  : "text-[#888]",
              )}
            >
              <Columns size={16} />
              <span className="text-xs hidden sm:inline">Kanban</span>
            </Button>
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => exportLeadsCSV(leads)}
              disabled={leads.length === 0}
              className="border-white/10 text-[#888] hover:text-[#f5f5f5] font-bold h-8 text-xs"
            >
              <Download size={14} className="mr-1" /> CSV
            </Button>
            {canEdit && (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => router.push("/pipeline/discover")}
                  className="border-[#c9a96e]/20 text-[#c9a96e] hover:bg-[#c9a96e]/10 font-bold h-8 text-xs"
                >
                  <Sparkles size={14} className="mr-1" /> Scopri
                </Button>
                <Button
                  size="sm"
                  onClick={() => router.push("/pipeline/new")}
                  className="bg-[#c9a96e] hover:bg-[#b8945a] text-[#0a0a0a] font-bold h-8"
                >
                  <Plus size={16} className="mr-1" /> Nuovo
                </Button>
              </>
            )}
          </div>
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
            {STATI_LEAD.map((s) => (
              <SelectItem key={s} value={s}>
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={filters.score || "all"}
          onValueChange={(v) =>
            setFilters((f) => ({ ...f, score: v === "all" ? "" : v }))
          }
        >
          <SelectTrigger className="glass border-white/5 text-xs h-9">
            <SelectValue placeholder="Score" />
          </SelectTrigger>
          <SelectContent className="glass-dark border-white/10">
            <SelectItem value="all">Tutti gli score</SelectItem>
            {SCORE_OPTIONS.map((s) => (
              <SelectItem key={s} value={s}>
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Input
          placeholder="Territorio..."
          value={filters.territorio}
          onChange={(e) =>
            setFilters((f) => ({ ...f, territorio: e.target.value }))
          }
          className="glass border-white/5 text-xs h-9 col-span-1"
        />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-[#c9a96e] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : view === "table" ? (
        <TableView
          leads={leads}
          canEdit={canEdit}
          onMarkAcquired={markAcquired}
          onArchive={archiveLead}
        />
      ) : (
        <KanbanView leads={leads} onMoveCard={canEdit ? moveCard : undefined} />
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
      <div className="text-center py-20 text-[#888]">Nessun lead trovato</div>
    );
  }

  return (
    <Card className="glass-dark border-white/5 overflow-hidden">
      <div className="md:block hidden overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/5">
              {[
                "Nome Azienda",
                "Settore",
                "Territorio",
                "Score",
                "Stato",
                "1° Contatto",
                "Follow-up",
                "",
              ].map((h) => (
                <th
                  key={h}
                  className="text-left px-4 py-4 text-[10px] text-[#555] font-bold uppercase tracking-wider whitespace-nowrap"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {leads.map((lead) => (
              <tr
                key={lead.id}
                className="border-b border-white/5 last:border-0 hover:bg-white/[0.02] transition-colors"
              >
                <td className="px-4 py-4 text-xs">
                  <Link
                    href={`/pipeline/${lead.id}`}
                    className="font-semibold text-[#f5f5f5] hover:text-[#c9a96e] max-w-[180px] block truncate"
                  >
                    {lead.nomeAzienda || "-"}
                  </Link>
                </td>
                <td className="px-4 py-4 text-[#888] text-xs">
                  {lead.settore || "-"}
                </td>
                <td className="px-4 py-4 text-[#888] text-xs">
                  {lead.territorio || "-"}
                </td>
                <td className="px-4 py-4 text-xs font-bold text-[#c9a96e]">
                  {lead.score || "-"}
                </td>
                <td className="px-4 py-4">
                  <StatoBadge stato={lead.stato} />
                </td>
                <td className="px-4 py-4 text-[#555] text-xs whitespace-nowrap">
                  {formatDate(lead.dataPrimoContatto)}
                </td>
                <td className="px-4 py-4 text-red-400/80 text-xs whitespace-nowrap font-medium">
                  {formatDate(lead.dataFollowUp)}
                </td>
                <td className="px-4 py-4 text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-[#555] hover:text-[#f5f5f5]"
                      >
                        <MoreHorizontal size={14} />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                      className="glass-dark border-white/10"
                      align="end"
                    >
                      <DropdownMenuItem
                        className="text-xs text-[#f5f5f5] hover:bg-white/5 cursor-pointer"
                        onClick={() => router.push(`/pipeline/${lead.id}`)}
                      >
                        Apri dettaglio
                      </DropdownMenuItem>
                      {canEdit && (
                        <>
                          <DropdownMenuItem
                            className="text-xs text-[#f5f5f5] hover:bg-white/5 cursor-pointer"
                            onClick={() =>
                              router.push(`/pipeline/${lead.id}?generate=1`)
                            }
                          >
                            Genera Report
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-xs text-green-400 hover:bg-white/5 cursor-pointer"
                            onClick={() => onMarkAcquired(lead.id)}
                          >
                            Segna Acquisito
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-xs text-red-400 hover:bg-white/5 cursor-pointer"
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

      {/* Mobile view cards for pipeline list */}
      <div className="md:hidden divide-y divide-white/5">
        {leads.map((lead) => (
          <div
            key={lead.id}
            className="p-4 hover:bg-white/[0.02] transition-colors relative group"
          >
            <Link href={`/pipeline/${lead.id}`} className="block">
              <div className="flex justify-between items-start mb-2">
                <div className="min-w-0 flex-1">
                  <h3 className="font-bold text-[#f5f5f5] text-sm truncate pr-2">
                    {lead.nomeAzienda}
                  </h3>
                  <p className="text-[10px] text-[#555] uppercase tracking-wider">
                    {lead.settore} · {lead.territorio}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <StatoBadge stato={lead.stato} />
                  <span className="text-[10px] font-bold text-[#c9a96e]">
                    {lead.score || "N/A"}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-4 text-[10px] text-[#555] font-medium">
                <div>
                  <span className="opacity-50">Contatto:</span>{" "}
                  {formatDate(lead.dataPrimoContatto)}
                </div>
                {lead.dataFollowUp && (
                  <div>
                    <span className="opacity-50">Follow-up:</span>{" "}
                    <span className="text-red-400/80">
                      {formatDate(lead.dataFollowUp)}
                    </span>
                  </div>
                )}
              </div>
            </Link>
            <div className="absolute right-2 bottom-3">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-[#555]"
                  >
                    <MoreHorizontal size={14} />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  className="glass-dark border-white/10"
                  align="end"
                >
                  <DropdownMenuItem
                    className="text-xs"
                    onClick={() => router.push(`/pipeline/${lead.id}`)}
                  >
                    Dettaglio
                  </DropdownMenuItem>
                  {canEdit && (
                    <DropdownMenuItem
                      className="text-xs text-green-400"
                      onClick={() => onMarkAcquired(lead.id)}
                    >
                      Acquisisci
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

function KanbanView({
  leads,
  onMoveCard,
}: {
  leads: Lead[];
  onMoveCard?: (id: string, newStato: string) => void;
}) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || !onMoveCard) return;
    const leadId = active.id as string;
    const newStato = over.id as string;
    const current = leads.find((l) => l.id === leadId)?.stato;
    if (!current || current === newStato) return;
    onMoveCard(leadId, newStato);
  }

  return (
    <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
      <div className="overflow-x-auto pb-6">
        <div className="flex gap-3 min-w-max">
          {KANBAN_COLS.map((col) => (
            <KanbanColumn key={col} col={col} leads={leads.filter((l) => l.stato === col)} canDrag={!!onMoveCard} />
          ))}
        </div>
      </div>
    </DndContext>
  );
}

const KANBAN_COL_ACCENT: Record<string, string> = {
  "Da contattare": "border-gray-700",
  Contattato: "border-blue-800/50",
  "Report in lavorazione": "border-yellow-800/50",
  "Report completato": "border-cyan-800/50",
  "Report inviato": "border-purple-800/50",
  "Follow-up": "border-orange-800/50",
  Acquisito: "border-green-800/50",
  "Non interessato": "border-red-900/50",
};

function KanbanColumn({ col, leads, canDrag }: { col: string; leads: Lead[]; canDrag: boolean }) {
  const { isOver, setNodeRef } = useDroppable({ id: col });

  return (
    <div className="w-56 flex-shrink-0 flex flex-col">
      <div className="flex items-center justify-between mb-2 px-1">
        <h3 className="text-[10px] font-bold text-[#555] uppercase tracking-wider truncate pr-2">{col}</h3>
        <span className="text-[10px] bg-[#1a1a1a] text-[#555] rounded-full px-2 py-0.5 flex-shrink-0">{leads.length}</span>
      </div>
      <div
        ref={setNodeRef}
        className={cn(
          "flex-1 space-y-2 min-h-[120px] rounded-xl p-2 transition-colors border",
          isOver ? "bg-[#c9a96e]/5 border-[#c9a96e]/20" : "bg-[#0d0d0d] border-white/5"
        )}
      >
        {leads.map((lead) => (
          <KanbanCard key={lead.id} lead={lead} canDrag={canDrag} />
        ))}
        {leads.length === 0 && (
          <div className="flex items-center justify-center h-16 border border-dashed border-white/5 rounded-lg">
            <span className="text-[10px] text-[#333]">Vuoto</span>
          </div>
        )}
      </div>
    </div>
  );
}

function KanbanCard({ lead, canDrag }: { lead: Lead; canDrag: boolean }) {
  const router = useRouter();
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: lead.id,
    data: { stato: lead.stato },
    disabled: !canDrag,
  });

  const style = transform
    ? { transform: CSS.Translate.toString(transform), zIndex: 50 }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "bg-[#141414] border border-[#1f1f1f] rounded-lg p-3 group hover:border-[#c9a96e]/30 transition-colors relative",
        isDragging && "opacity-40 shadow-2xl"
      )}
    >
      {canDrag && (
        <button
          {...listeners}
          {...attributes}
          className="absolute top-2 right-2 text-[#333] hover:text-[#555] cursor-grab active:cursor-grabbing touch-none"
          onClick={(e) => e.stopPropagation()}
        >
          <GripVertical size={12} />
        </button>
      )}
      <button
        className="text-left w-full pr-4"
        onClick={() => router.push(`/pipeline/${lead.id}`)}
      >
        <p className="text-xs font-semibold text-[#f5f5f5] truncate leading-tight">{lead.nomeAzienda}</p>
        {lead.settore && (
          <p className="text-[10px] text-[#555] mt-0.5 truncate">{lead.settore}</p>
        )}
        {lead.territorio && (
          <p className="text-[10px] text-[#444] truncate">{lead.territorio}</p>
        )}
        <div className="flex items-center justify-between mt-2">
          {lead.score ? (
            <span className="text-[10px] text-[#c9a96e] font-bold">{lead.score}</span>
          ) : <span />}
          {lead.dataFollowUp && (
            <span className="text-[9px] text-[#444]">{formatDate(lead.dataFollowUp)}</span>
          )}
        </div>
      </button>
    </div>
  );
}
