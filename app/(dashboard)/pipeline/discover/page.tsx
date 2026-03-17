"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft,
  Search,
  Plus,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Globe,
  Users,
  ChevronDown,
  ChevronUp,
  Sparkles,
} from "lucide-react";
import { SETTORI } from "@/lib/types";

interface DiscoveredLead {
  nomeAzienda: string;
  settore: string;
  territorio: string;
  sitoWeb: string;
  profiloSocial: string;
  note: string;
  isDuplicate?: boolean;
  addStatus?: "created" | "duplicate" | "error";
  addReason?: string;
}

type PageStatus = "idle" | "searching" | "checking" | "done" | "adding";

export default function DiscoverPage() {
  const router = useRouter();

  // Form state
  const [settore, setSettore] = useState("");
  const [territorio, setTerritorio] = useState("");
  const [tipoAttivita, setTipoAttivita] = useState("");
  const [count, setCount] = useState("5");
  const [additionalCriteria, setAdditionalCriteria] = useState("");

  // Results state
  const [leads, setLeads] = useState<DiscoveredLead[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [status, setStatus] = useState<PageStatus>("idle");
  const [statusText, setStatusText] = useState("");
  const [formExpanded, setFormExpanded] = useState(true);

  const abortRef = useRef<AbortController | null>(null);

  async function handleSearch() {
    if (!settore || !territorio) {
      toast.error("Settore e territorio sono obbligatori");
      return;
    }

    abortRef.current?.abort();
    const abort = new AbortController();
    abortRef.current = abort;

    setLeads([]);
    setSelected(new Set());
    setStatus("searching");
    setStatusText("Avvio ricerca con AI...");
    setFormExpanded(false);

    try {
      const res = await fetch("/api/discover-leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ settore, territorio, tipoAttivita, count: parseInt(count), additionalCriteria }),
        signal: abort.signal,
      });

      if (!res.ok) throw new Error("Errore nella ricerca");

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      const discovered: DiscoveredLead[] = [];

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed.startsWith("__LEAD__:")) {
            try {
              const lead = JSON.parse(trimmed.slice("__LEAD__:".length));
              discovered.push(lead);
              setLeads([...discovered]);
            } catch {}
          } else if (trimmed.startsWith("__ERROR__:")) {
            throw new Error(trimmed.slice("__ERROR__:".length));
          } else if (trimmed && trimmed !== "__DONE__" && !trimmed.includes("__LEAD__") && trimmed.length < 120) {
            setStatusText(trimmed);
          }
        }
      }

      // Duplicate pre-check against existing leads
      setStatus("checking");
      setStatusText("Verifico duplicati nel CRM...");

      try {
        const existingRes = await fetch("/api/leads");
        if (existingRes.ok) {
          const existingLeads = await existingRes.json();
          const existingNames = new Set<string>(
            existingLeads.map((l: any) => l.nomeAzienda?.toLowerCase().trim()).filter(Boolean)
          );
          const existingUrls = new Set<string>(
            existingLeads
              .filter((l: any) => l.sitoWeb)
              .map((l: any) => l.sitoWeb?.toLowerCase().trim().replace(/\/$/, ""))
          );

          const checked = discovered.map((l) => {
            const nameMatch = existingNames.has(l.nomeAzienda?.toLowerCase().trim());
            const urlMatch = l.sitoWeb && existingUrls.has(l.sitoWeb.toLowerCase().trim().replace(/\/$/, ""));
            return { ...l, isDuplicate: nameMatch || !!urlMatch };
          });

          setLeads(checked);

          // Auto-select non-duplicates
          const autoSelected = new Set<number>();
          checked.forEach((l, i) => { if (!l.isDuplicate) autoSelected.add(i); });
          setSelected(autoSelected);
        } else {
          // If check fails, select all
          setSelected(new Set(discovered.map((_, i) => i)));
        }
      } catch {
        setSelected(new Set(discovered.map((_, i) => i)));
      }

      setStatus("done");
      setStatusText("");
    } catch (err: any) {
      if (err.name !== "AbortError") {
        toast.error(err.message || "Errore nella ricerca");
        setStatus("idle");
        setFormExpanded(true);
      }
    }
  }

  async function handleAdd() {
    const selectedLeads = leads.filter((_, i) => selected.has(i));
    if (selectedLeads.length === 0) return;

    setStatus("adding");

    try {
      const res = await fetch("/api/leads/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leads: selectedLeads }),
      });

      if (!res.ok) throw new Error("Errore durante l'inserimento");

      const { results } = await res.json();

      let resultIndex = 0;
      setLeads((prev) =>
        prev.map((l, i) => {
          if (!selected.has(i)) return l;
          const result = results[resultIndex++];
          return { ...l, addStatus: result.status, addReason: result.reason };
        })
      );

      const created = results.filter((r: any) => r.status === "created").length;
      const duplicates = results.filter((r: any) => r.status === "duplicate").length;
      const errors = results.filter((r: any) => r.status === "error").length;

      if (created > 0) toast.success(`${created} lead aggiunt${created === 1 ? "o" : "i"} nel CRM`);
      if (duplicates > 0) toast.warning(`${duplicates} già present${duplicates === 1 ? "e" : "i"}, saltati`);
      if (errors > 0) toast.error(`${errors} error${errors === 1 ? "e" : "i"} durante l'inserimento`);

      setSelected(new Set());
      setStatus("done");
    } catch (err: any) {
      toast.error(err.message || "Errore nell'aggiunta");
      setStatus("done");
    }
  }

  function toggleSelect(i: number) {
    if (leads[i]?.isDuplicate || leads[i]?.addStatus) return;
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  }

  function selectAll() {
    setSelected(new Set(leads.map((_, i) => i).filter((i) => !leads[i].isDuplicate && !leads[i].addStatus)));
  }

  function deselectAll() {
    setSelected(new Set());
  }

  const isSearching = status === "searching" || status === "checking";
  const isAdding = status === "adding";
  const selectedCount = selected.size;
  const duplicateCount = leads.filter((l) => l.isDuplicate).length;
  const addedCount = leads.filter((l) => l.addStatus === "created").length;

  return (
    <div className="max-w-4xl mx-auto px-1 md:px-0 space-y-6 pb-40 md:pb-28">

      {/* Header */}
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push("/pipeline")}
          className="text-[#555] hover:text-[#f5f5f5] bg-white/5 rounded-full flex-shrink-0"
        >
          <ArrowLeft size={16} />
        </Button>
        <div className="min-w-0">
          <h1 className="text-xl font-bold text-[#f5f5f5] tracking-tight flex items-center gap-2">
            <Sparkles size={18} className="text-[#c9a96e]" />
            Scopri nuovi Lead
          </h1>
          <p className="text-[#555] text-xs">Ricerca AI di potenziali clienti nel tuo mercato</p>
        </div>
      </div>

      {/* Search form */}
      <div className="glass-dark border border-white/5 rounded-2xl overflow-hidden">
        <button
          className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-white/2 transition-colors"
          onClick={() => setFormExpanded((f) => !f)}
        >
          <span className="text-xs font-bold text-[#888] uppercase tracking-widest">
            {formExpanded
              ? "Criteri di ricerca"
              : `${settore || "—"} · ${territorio || "—"}${tipoAttivita ? ` · ${tipoAttivita}` : ""}`}
          </span>
          {formExpanded
            ? <ChevronUp size={14} className="text-[#555]" />
            : <ChevronDown size={14} className="text-[#555]" />
          }
        </button>

        {formExpanded && (
          <div className="px-5 pb-5 space-y-4 border-t border-white/5 pt-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-[10px] uppercase tracking-widest text-[#555] font-bold">
                  Settore *
                </Label>
                <Select value={settore} onValueChange={setSettore}>
                  <SelectTrigger className="glass border-white/5 text-xs h-10">
                    <SelectValue placeholder="Seleziona settore" />
                  </SelectTrigger>
                  <SelectContent className="glass-dark border-white/10">
                    {SETTORI.map((s) => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-[10px] uppercase tracking-widest text-[#555] font-bold">
                  Territorio *
                </Label>
                <Input
                  placeholder="es. Milano, Bergamo, Lombardia"
                  value={territorio}
                  onChange={(e) => setTerritorio(e.target.value)}
                  className="glass border-white/5 text-xs h-10"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-[10px] uppercase tracking-widest text-[#555] font-bold">
                  Tipo attività
                </Label>
                <Input
                  placeholder="es. ristorante, studio dentistico, palestra"
                  value={tipoAttivita}
                  onChange={(e) => setTipoAttivita(e.target.value)}
                  className="glass border-white/5 text-xs h-10"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-[10px] uppercase tracking-widest text-[#555] font-bold">
                  Numero lead
                </Label>
                <Select value={count} onValueChange={setCount}>
                  <SelectTrigger className="glass border-white/5 text-xs h-10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="glass-dark border-white/10">
                    {["5", "10", "15", "20"].map((n) => (
                      <SelectItem key={n} value={n}>{n} lead</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-[10px] uppercase tracking-widest text-[#555] font-bold">
                Criteri aggiuntivi
              </Label>
              <Textarea
                placeholder="es. Solo attività senza sito web aggiornato, con meno di 50 recensioni su Google..."
                value={additionalCriteria}
                onChange={(e) => setAdditionalCriteria(e.target.value)}
                className="glass border-white/5 text-xs resize-none h-16"
              />
            </div>

            <Button
              onClick={handleSearch}
              disabled={isSearching || !settore || !territorio}
              className="w-full bg-[#c9a96e] hover:bg-[#b8945a] text-[#0a0a0a] font-bold h-10 text-xs"
            >
              {isSearching ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-[#0a0a0a]/30 border-t-[#0a0a0a] rounded-full animate-spin mr-2" />
                  Ricerca in corso...
                </>
              ) : (
                <>
                  <Search size={14} className="mr-2" />
                  Trova Lead con AI
                </>
              )}
            </Button>
          </div>
        )}
      </div>

      {/* Status line */}
      {isSearching && (
        <div className="flex items-center gap-2 text-xs text-[#555] px-1">
          <div className="w-3 h-3 border border-[#c9a96e] border-t-transparent rounded-full animate-spin flex-shrink-0" />
          <span className="truncate">{statusText || "Elaborazione..."}</span>
        </div>
      )}

      {/* Results */}
      {leads.length > 0 && (
        <div className="space-y-3">

          {/* Results toolbar */}
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-3 text-xs text-[#888]">
              <span>
                <span className="text-[#f5f5f5] font-bold">{leads.length}</span> trovati
              </span>
              {duplicateCount > 0 && (
                <span className="text-yellow-500/70">
                  {duplicateCount} già nel CRM
                </span>
              )}
              {addedCount > 0 && (
                <span className="text-green-500/70">
                  {addedCount} aggiunti
                </span>
              )}
            </div>
            {status === "done" && leads.some((l) => !l.isDuplicate && !l.addStatus) && (
              <div className="flex gap-3 text-[10px]">
                <button onClick={selectAll} className="text-[#c9a96e] hover:text-[#b8945a] font-bold">
                  Seleziona tutti
                </button>
                <span className="text-[#333]">·</span>
                <button onClick={deselectAll} className="text-[#555] hover:text-[#888]">
                  Deseleziona
                </button>
              </div>
            )}
          </div>

          {/* Cards grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {leads.map((lead, i) => {
              const isSelected = selected.has(i);
              const isDisabled = !!lead.addStatus || !!lead.isDuplicate;
              const isClickable = status === "done" && !isDisabled;

              return (
                <div
                  key={i}
                  onClick={() => isClickable && toggleSelect(i)}
                  className={[
                    "glass-dark border rounded-xl p-4 transition-all",
                    isClickable ? "cursor-pointer" : "cursor-default",
                    lead.isDuplicate && !lead.addStatus ? "opacity-50" : "",
                    isSelected ? "border-[#c9a96e]/40 bg-[#c9a96e]/5" : "border-white/5",
                    !isSelected && isClickable ? "hover:border-white/10" : "",
                    lead.addStatus === "created" ? "border-green-900/30 opacity-70" : "",
                    lead.addStatus === "duplicate" ? "border-yellow-900/30 opacity-70" : "",
                    lead.addStatus === "error" ? "border-red-900/30 opacity-70" : "",
                  ].join(" ")}
                >
                  <div className="flex items-start gap-3">

                    {/* Checkbox / status icon */}
                    <div className="flex-shrink-0 mt-0.5">
                      {lead.addStatus === "created" ? (
                        <CheckCircle2 size={16} className="text-green-400" />
                      ) : lead.addStatus === "duplicate" ? (
                        <AlertCircle size={16} className="text-yellow-400" />
                      ) : lead.addStatus === "error" ? (
                        <XCircle size={16} className="text-red-400" />
                      ) : (
                        <div
                          className={[
                            "w-4 h-4 rounded border-2 flex items-center justify-center transition-colors",
                            lead.isDuplicate
                              ? "border-[#2a2a2a]"
                              : isSelected
                              ? "border-[#c9a96e] bg-[#c9a96e]"
                              : "border-[#333]",
                          ].join(" ")}
                        >
                          {isSelected && !lead.isDuplicate && (
                            <svg width="8" height="6" viewBox="0 0 8 6" fill="none">
                              <path d="M1 3L3 5L7 1" stroke="#0a0a0a" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-2 flex-wrap">
                        <h3 className="text-sm font-bold text-[#f5f5f5] leading-tight">{lead.nomeAzienda}</h3>
                        <div className="flex gap-1.5 flex-wrap justify-end">
                          {lead.isDuplicate && !lead.addStatus && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-yellow-900/20 text-yellow-400 border border-yellow-800/30 font-bold whitespace-nowrap">
                              Già nel CRM
                            </span>
                          )}
                          {lead.addStatus === "created" && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-green-900/20 text-green-400 border border-green-800/30 font-bold">
                              Aggiunto
                            </span>
                          )}
                          {lead.addStatus === "duplicate" && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-yellow-900/20 text-yellow-400 border border-yellow-800/30 font-bold">
                              Duplicato
                            </span>
                          )}
                          {lead.addStatus === "error" && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-900/20 text-red-400 border border-red-800/30 font-bold">
                              Errore
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Pills */}
                      <div className="flex flex-wrap gap-1.5 mb-2.5">
                        {lead.settore && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 text-[#666]">
                            {lead.settore}
                          </span>
                        )}
                        {lead.territorio && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 text-[#666]">
                            {lead.territorio}
                          </span>
                        )}
                      </div>

                      {/* Links & notes */}
                      <div className="space-y-1">
                        {lead.sitoWeb && (
                          <div className="flex items-center gap-1.5 text-[11px] text-[#555]">
                            <Globe size={10} className="flex-shrink-0" />
                            <a
                              href={lead.sitoWeb.startsWith("http") ? lead.sitoWeb : `https://${lead.sitoWeb}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="truncate hover:text-[#c9a96e] transition-colors"
                            >
                              {lead.sitoWeb.replace(/^https?:\/\//, "")}
                            </a>
                          </div>
                        )}
                        {lead.profiloSocial && (
                          <div className="flex items-center gap-1.5 text-[11px] text-[#555]">
                            <Users size={10} className="flex-shrink-0" />
                            <a
                              href={lead.profiloSocial.startsWith("http") ? lead.profiloSocial : `https://${lead.profiloSocial}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="truncate hover:text-[#c9a96e] transition-colors"
                            >
                              {lead.profiloSocial.replace(/^https?:\/\//, "").split("/").slice(0, 2).join("/")}
                            </a>
                          </div>
                        )}
                        {lead.note && (
                          <p className="text-[11px] text-[#444] italic leading-snug pt-0.5">{lead.note}</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Skeleton cards while searching */}
            {isSearching &&
              Array.from({ length: Math.min(2, parseInt(count) - leads.length) }).map((_, i) => (
                <div key={`sk-${i}`} className="glass-dark border border-white/5 rounded-xl p-4 animate-pulse">
                  <div className="flex gap-3">
                    <div className="w-4 h-4 bg-white/5 rounded mt-0.5 flex-shrink-0" />
                    <div className="flex-1 space-y-2.5">
                      <div className="h-3 bg-white/5 rounded w-3/4" />
                      <div className="h-2 bg-white/5 rounded w-1/3" />
                      <div className="h-2 bg-white/5 rounded w-2/3" />
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {status === "done" && leads.length === 0 && (
        <div className="text-center py-16 space-y-2">
          <p className="text-[#555] text-sm">Nessun lead trovato per questi criteri.</p>
          <p className="text-[#333] text-xs">Prova a modificare settore, territorio o i criteri aggiuntivi.</p>
        </div>
      )}

      {/* Sticky action bar */}
      {status === "done" && selectedCount > 0 && (
        <div className="fixed bottom-16 md:bottom-0 left-0 right-0 z-30 bg-[#0a0a0a]/95 backdrop-blur-xl border-t border-white/5">
          <div className="max-w-4xl mx-auto px-5 py-4 flex items-center justify-between gap-4">
            <div>
              <p className="text-sm text-[#888]">
                <span className="text-[#f5f5f5] font-bold">{selectedCount}</span> lead selezionat{selectedCount === 1 ? "o" : "i"}
              </p>
              <p className="text-[10px] text-[#444]">Verranno aggiunti nel CRM e assegnati a te</p>
            </div>
            <Button
              onClick={handleAdd}
              disabled={isAdding}
              className="bg-[#c9a96e] hover:bg-[#b8945a] text-[#0a0a0a] font-bold h-10 text-xs px-6 flex-shrink-0"
            >
              {isAdding ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-[#0a0a0a]/30 border-t-[#0a0a0a] rounded-full animate-spin mr-2" />
                  Aggiunta in corso...
                </>
              ) : (
                <>
                  <Plus size={14} className="mr-2" />
                  Aggiungi al CRM
                </>
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
