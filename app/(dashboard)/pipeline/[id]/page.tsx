"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ArrowLeft, FileText, Loader2, Save, CheckCircle, ExternalLink } from "lucide-react";
import { Lead, STATI_LEAD, SETTORI, CANALI, SCORE_OPTIONS, RISPOSTA_OPTIONS } from "@/lib/types";

export default function LeadDetailPage() {
  const { id } = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { data: session } = useSession();
  const role = (session?.user as any)?.role;
  const canEdit = role === "admin" || role === "editor";

  const [lead, setLead] = useState<Lead | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<Partial<Lead>>({});

  // Report generation
  const [showReportModal, setShowReportModal] = useState(false);
  const [additionalInfo, setAdditionalInfo] = useState("");
  const [generating, setGenerating] = useState(false);
  const [reportContent, setReportContent] = useState("");
  const [reportDone, setReportDone] = useState(false);
  const [reportId, setReportId] = useState("");

  async function loadLead() {
    try {
      const res = await fetch(`/api/leads/${id}`);
      if (!res.ok) throw new Error();
      const data: Lead = await res.json();
      setLead(data);
      setForm(data);
    } catch {
      toast.error("Errore nel caricamento del lead");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadLead();
    if (searchParams.get("generate") === "1") {
      setShowReportModal(true);
    }
  }, [id]);

  function setField(key: keyof Lead, value: any) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function saveChanges() {
    setSaving(true);
    try {
      const res = await fetch(`/api/leads/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error();
      const updated = await res.json();
      setLead(updated);
      setForm(updated);
      toast.success("Modifiche salvate");
    } catch {
      toast.error("Errore nel salvataggio");
    } finally {
      setSaving(false);
    }
  }

  async function markAcquired() {
    setSaving(true);
    try {
      await fetch(`/api/leads/${id}/acquire`, { method: "POST" });
      toast.success("Lead segnato come Acquisito e cliente creato");
      loadLead();
    } catch {
      toast.error("Errore nell'acquisizione");
    } finally {
      setSaving(false);
    }
  }

  async function generateReport() {
    if (!lead) return;
    setGenerating(true);
    setReportContent("");
    setReportDone(false);

    try {
      const res = await fetch("/api/generate-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leadId: id,
          companyName: lead.nomeAzienda,
          sector: lead.settore,
          territory: lead.territorio,
          additionalInfo,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Errore");
      }

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let fullContent = "";
      let generatedReportId = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });

        // Check for report ID signal
        const lines = chunk.split("\n");
        for (const line of lines) {
          if (line.startsWith("__REPORT_ID__:")) {
            generatedReportId = line.replace("__REPORT_ID__:", "").trim();
          } else if (line.startsWith("__ERROR__:")) {
            throw new Error(line.replace("__ERROR__:", "").trim());
          } else {
            fullContent += line + (lines.indexOf(line) < lines.length - 1 ? "\n" : "");
            setReportContent((prev) => prev + line + (lines.indexOf(line) < lines.length - 1 ? "\n" : ""));
          }
        }
      }

      setReportId(generatedReportId);
      setReportDone(true);
      loadLead();
      toast.success("Report generato con successo");
    } catch (err: any) {
      toast.error(err.message || "Errore nella generazione");
    } finally {
      setGenerating(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-[#c9a96e] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!lead) {
    return <div className="text-[#888] text-center py-20">Lead non trovato</div>;
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push("/pipeline")}
          className="text-[#888] hover:text-[#f5f5f5]"
        >
          <ArrowLeft size={18} />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-[#f5f5f5]">{lead.nomeAzienda}</h1>
          <p className="text-[#888] text-sm">{lead.settore} · {lead.territorio}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column: fields */}
        <div className="lg:col-span-2 space-y-4">
          <Card className="bg-[#141414] border-[#1f1f1f]">
            <CardHeader>
              <CardTitle className="text-base text-[#f5f5f5]">Dettaglio Lead</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs text-[#888]">Nome Azienda</Label>
                  <Input
                    value={form.nomeAzienda ?? ""}
                    onChange={(e) => setField("nomeAzienda", e.target.value)}
                    disabled={!canEdit}
                    className="bg-[#0d0d0d] border-[#1f1f1f] text-[#f5f5f5] h-9"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-[#888]">Settore</Label>
                  <Select
                    value={form.settore ?? ""}
                    onValueChange={(v) => setField("settore", v)}
                    disabled={!canEdit}
                  >
                    <SelectTrigger className="bg-[#0d0d0d] border-[#1f1f1f] text-[#f5f5f5] h-9">
                      <SelectValue placeholder="Settore" />
                    </SelectTrigger>
                    <SelectContent className="bg-[#141414] border-[#1f1f1f]">
                      {SETTORI.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-[#888]">Territorio</Label>
                  <Input
                    value={form.territorio ?? ""}
                    onChange={(e) => setField("territorio", e.target.value)}
                    disabled={!canEdit}
                    className="bg-[#0d0d0d] border-[#1f1f1f] text-[#f5f5f5] h-9"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-[#888]">Canale primo contatto</Label>
                  <Select
                    value={form.canale ?? ""}
                    onValueChange={(v) => setField("canale", v)}
                    disabled={!canEdit}
                  >
                    <SelectTrigger className="bg-[#0d0d0d] border-[#1f1f1f] text-[#f5f5f5] h-9">
                      <SelectValue placeholder="Canale" />
                    </SelectTrigger>
                    <SelectContent className="bg-[#141414] border-[#1f1f1f]">
                      {CANALI.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-[#888]">Sito Web</Label>
                  <Input
                    value={form.sitoWeb ?? ""}
                    onChange={(e) => setField("sitoWeb", e.target.value)}
                    disabled={!canEdit}
                    className="bg-[#0d0d0d] border-[#1f1f1f] text-[#f5f5f5] h-9"
                    placeholder="https://..."
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-[#888]">Profilo Social</Label>
                  <Input
                    value={form.profiloSocial ?? ""}
                    onChange={(e) => setField("profiloSocial", e.target.value)}
                    disabled={!canEdit}
                    className="bg-[#0d0d0d] border-[#1f1f1f] text-[#f5f5f5] h-9"
                    placeholder="https://..."
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs text-[#888]">Risposta</Label>
                <Select
                  value={form.risposta ?? ""}
                  onValueChange={(v) => setField("risposta", v)}
                  disabled={!canEdit}
                >
                  <SelectTrigger className="bg-[#0d0d0d] border-[#1f1f1f] text-[#f5f5f5] h-9">
                    <SelectValue placeholder="Risposta" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#141414] border-[#1f1f1f]">
                    {RISPOSTA_OPTIONS.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs text-[#888]">Note</Label>
                <Textarea
                  value={form.note ?? ""}
                  onChange={(e) => setField("note", e.target.value)}
                  disabled={!canEdit}
                  rows={4}
                  className="bg-[#0d0d0d] border-[#1f1f1f] text-[#f5f5f5] resize-none"
                />
              </div>

              {canEdit && (
                <Button
                  onClick={saveChanges}
                  disabled={saving}
                  className="bg-[#c9a96e] hover:bg-[#b8945a] text-[#0a0a0a] font-medium"
                >
                  {saving ? (
                    <><Loader2 size={16} className="mr-2 animate-spin" />Salvataggio...</>
                  ) : (
                    <><Save size={16} className="mr-2" />Salva modifiche</>
                  )}
                </Button>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right column: actions */}
        <div className="space-y-4">
          {/* Quick edit */}
          <Card className="bg-[#141414] border-[#1f1f1f]">
            <CardHeader>
              <CardTitle className="text-base text-[#f5f5f5]">Azioni Rapide</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-xs text-[#888]">Score Qualificazione</Label>
                <Select
                  value={form.score ?? ""}
                  onValueChange={(v) => setField("score", v)}
                  disabled={!canEdit}
                >
                  <SelectTrigger className="bg-[#0d0d0d] border-[#1f1f1f] text-[#c9a96e] font-semibold h-9">
                    <SelectValue placeholder="Score" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#141414] border-[#1f1f1f]">
                    {SCORE_OPTIONS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs text-[#888]">Stato</Label>
                <Select
                  value={form.stato ?? ""}
                  onValueChange={(v) => setField("stato", v)}
                  disabled={!canEdit}
                >
                  <SelectTrigger className="bg-[#0d0d0d] border-[#1f1f1f] text-[#f5f5f5] h-9">
                    <SelectValue placeholder="Stato" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#141414] border-[#1f1f1f]">
                    {STATI_LEAD.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs text-[#888]">Data Follow-up</Label>
                <Input
                  type="date"
                  value={form.dataFollowUp ?? ""}
                  onChange={(e) => setField("dataFollowUp", e.target.value)}
                  disabled={!canEdit}
                  className="bg-[#0d0d0d] border-[#1f1f1f] text-[#f5f5f5] h-9"
                />
              </div>

              {canEdit && (
                <Button
                  variant="outline"
                  className="w-full border-green-700 text-green-400 hover:bg-green-900/20"
                  onClick={markAcquired}
                  disabled={saving}
                >
                  <CheckCircle size={16} className="mr-2" /> Segna come Acquisito
                </Button>
              )}

              {lead.urlReport && (
                <Button
                  variant="outline"
                  className="w-full border-[#1f1f1f] text-[#888]"
                  onClick={() => router.push(lead.urlReport)}
                >
                  <ExternalLink size={16} className="mr-2" /> Vedi Report
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Generate report */}
          {canEdit && (
            <Card className="bg-[#141414] border-[#1f1f1f] border-[#c9a96e]/20">
              <CardHeader>
                <CardTitle className="text-base text-[#f5f5f5] flex items-center gap-2">
                  <FileText size={16} className="text-[#c9a96e]" /> Genera Report
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-[#888] mb-3">
                  Genera un report di analisi digitale per questo lead usando AI con ricerca web.
                </p>
                <Button
                  className="w-full bg-[#c9a96e] hover:bg-[#b8945a] text-[#0a0a0a] font-medium"
                  onClick={() => setShowReportModal(true)}
                >
                  Genera Report AI
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Report generation modal */}
      <Dialog open={showReportModal} onOpenChange={(open) => {
        if (!generating) {
          setShowReportModal(open);
          if (!open) {
            setReportContent("");
            setReportDone(false);
            setAdditionalInfo("");
          }
        }
      }}>
        <DialogContent className="bg-[#141414] border-[#1f1f1f] max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-[#f5f5f5]">
              Genera Report — {lead.nomeAzienda}
            </DialogTitle>
          </DialogHeader>

          {!generating && !reportDone && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-[#888] text-xs">Info aggiuntive (opzionale)</Label>
                <Textarea
                  value={additionalInfo}
                  onChange={(e) => setAdditionalInfo(e.target.value)}
                  placeholder="Es: hanno un ristorante di fascia alta, target 30-50 anni..."
                  rows={3}
                  className="bg-[#0d0d0d] border-[#1f1f1f] text-[#f5f5f5] resize-none"
                />
              </div>
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => setShowReportModal(false)}
                  className="border-[#1f1f1f] text-[#888]"
                >
                  Annulla
                </Button>
                <Button
                  onClick={generateReport}
                  className="bg-[#c9a96e] hover:bg-[#b8945a] text-[#0a0a0a] font-medium flex-1"
                >
                  Avvia Generazione
                </Button>
              </div>
            </div>
          )}

          {(generating || reportContent) && (
            <div className="space-y-4">
              {generating && (
                <div className="flex items-center gap-2 text-[#c9a96e] text-sm">
                  <Loader2 size={16} className="animate-spin" />
                  Generazione in corso — ricerca web + analisi AI...
                </div>
              )}
              <div className="bg-[#0d0d0d] rounded-lg p-4 max-h-80 overflow-y-auto border border-[#1f1f1f]">
                <div className="prose-report text-sm">
                  <ReactMarkdown>{reportContent}</ReactMarkdown>
                </div>
                {generating && (
                  <span className="inline-block w-2 h-4 bg-[#c9a96e] animate-pulse ml-1" />
                )}
              </div>
              {reportDone && (
                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowReportModal(false);
                      setReportContent("");
                      setReportDone(false);
                    }}
                    className="border-[#1f1f1f] text-[#888]"
                  >
                    Chiudi
                  </Button>
                  {reportId && (
                    <Button
                      onClick={() => router.push(`/reports/${reportId}`)}
                      className="bg-[#c9a96e] hover:bg-[#b8945a] text-[#0a0a0a] font-medium"
                    >
                      Vai al Report →
                    </Button>
                  )}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
