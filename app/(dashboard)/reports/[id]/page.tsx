"use client";

import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import ReactMarkdown from "react-markdown";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Copy, ArrowLeft, ExternalLink, Trash2, Loader2, RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";
import { Report, STATI_REPORT, ESITI_REPORT } from "@/lib/types";

function formatDate(d: string) {
  if (!d) return "-";
  return new Date(d).toLocaleDateString("it-IT", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

export default function ReportDetailPage() {
  const { id } = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { data: session, status } = useSession();
  const token = searchParams.get("token");

  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);
  const [tokenValid, setTokenValid] = useState(false);
  const [invalidToken, setInvalidToken] = useState(false);
  const [saving, setSaving] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [regenContent, setRegenContent] = useState("");
  const [regenDone, setRegenDone] = useState(false);
  const [showRegenModal, setShowRegenModal] = useState(false);
  const [regenInfo, setRegenInfo] = useState("");

  useEffect(() => {
    async function load() {
      try {
        const url = token
          ? `/api/reports/${id}?token=${token}`
          : `/api/reports/${id}`;
        const res = await fetch(url);
        if (!res.ok) {
          if (token) setInvalidToken(true);
          throw new Error();
        }
        const data = await res.json();
        setReport(data);
        if (token) setTokenValid(true);
      } catch {
        if (!token) toast.error("Errore nel caricamento del report");
      } finally {
        setLoading(false);
      }
    }
    if (status !== "loading") load();
  }, [id, token, status]);

  async function updateReport(field: string, value: string) {
    setSaving(true);
    try {
      await fetch(`/api/reports/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [field]: value }),
      });
      setReport((r) => (r ? { ...r, [field]: value } : r));
      toast.success("Aggiornato");
    } catch {
      toast.error("Errore nell'aggiornamento");
    } finally {
      setSaving(false);
    }
  }

  function copyPublicLink() {
    if (!report) return;
    const url = `${window.location.origin}/r/${id}?token=${report.token}`;
    navigator.clipboard.writeText(url);
    toast.success("Link copiato negli appunti");
  }

  function openPublicLink() {
    if (!report) return;
    window.open(`${window.location.origin}/r/${id}?token=${report.token}`, "_blank");
  }

  async function handleDelete() {
    if (!confirm("Eliminare definitivamente questo report?")) return;
    try {
      await fetch(`/api/reports/${id}`, { method: "DELETE" });
      toast.success("Report eliminato");
      router.push("/reports");
    } catch {
      toast.error("Errore nell'eliminazione");
    }
  }

  async function regenerateReport() {
    if (!report?.leadId) {
      toast.error("Questo report non ha un lead associato");
      return;
    }
    setRegenerating(true);
    setRegenContent("");
    setRegenDone(false);
    try {
      const res = await fetch("/api/generate-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leadId: report.leadId,
          companyName: report.azienda,
          sector: report.settore,
          additionalInfo: regenInfo,
        }),
      });
      if (!res.ok) throw new Error("Errore nella rigenerazione");
      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let full = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        for (const line of chunk.split("\n")) {
          if (line.startsWith("__REPORT_ID__:") || line.startsWith("__ERROR__:")) continue;
          full += line + "\n";
          setRegenContent(prev => prev + line + "\n");
        }
      }
      setRegenDone(true);
      toast.success("Report rigenerato — ricarica la pagina per vederlo aggiornato");
    } catch (err: any) {
      toast.error(err.message || "Errore nella rigenerazione");
    } finally {
      setRegenerating(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#0a0a0a]">
        <div className="w-8 h-8 border-2 border-[#c9a96e] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (invalidToken) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-bold text-[#f5f5f5]">Link non valido</h1>
          <p className="text-[#888]">Questo link è scaduto o non è valido.</p>
        </div>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="text-[#888] text-center py-20">Report non trovato</div>
    );
  }

  // Public view (token present and valid)
  if (token && tokenValid) {
    return <PublicReportView report={report} />;
  }

  // Authenticated view
  return (
    <div className="space-y-6 max-w-5xl mx-auto px-1 md:px-0">
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push("/reports")}
          className="text-[#555] hover:text-[#f5f5f5] bg-white/5 rounded-full"
        >
          <ArrowLeft size={16} />
        </Button>
        <div className="min-w-0 flex-1">
          <h1 className="text-xl font-bold text-[#f5f5f5] truncate tracking-tight">
            {report.titolo}
          </h1>
          <p className="text-[#555] text-[10px] md:text-xs uppercase tracking-widest">
            {report.azienda} · {formatDate(report.dataGenerazione)}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar - Shows first on mobile for quick actions */}
        <div className="order-1 lg:order-2 space-y-4">
          <Card className="glass-dark border-white/5">
            <CardHeader className="pb-2">
              <CardTitle className="text-[10px] font-bold uppercase tracking-widest text-[#555]">
                Stato e Azioni
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1">
                <Label className="text-[10px] uppercase text-[#555] font-bold tracking-tight">
                  Stato Invio
                </Label>
                <Select
                  value={report.stato || ""}
                  onValueChange={(v) => updateReport("stato", v)}
                  disabled={saving}
                >
                  <SelectTrigger className="glass border-white/5 text-xs h-10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="glass-dark border-white/10">
                    {STATI_REPORT.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-[10px] uppercase text-[#555] font-bold tracking-tight">
                  Esito Business
                </Label>
                <Select
                  value={report.esito || ""}
                  onValueChange={(v) => updateReport("esito", v)}
                  disabled={saving}
                >
                  <SelectTrigger className="glass border-white/5 text-xs h-10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="glass-dark border-white/10">
                    {ESITI_REPORT.map((e) => (
                      <SelectItem key={e} value={e}>
                        {e}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {report.generatoDa && (
                <div className="pt-1 flex items-center justify-between text-xs">
                  <span className="text-[#555] uppercase tracking-wider font-bold text-[10px]">Generato da</span>
                  <span className="text-[#888]">{report.generatoDa}</span>
                </div>
              )}

              <div className="flex flex-col gap-2 pt-2">
                <Button
                  variant="outline"
                  className="w-full border-white/10 text-[#f5f5f5] hover:bg-white/5 text-xs h-10 font-bold"
                  onClick={copyPublicLink}
                >
                  <Copy size={14} className="mr-2" /> Copia link pubblico
                </Button>

                <Button
                  variant="outline"
                  className="w-full border-[#c9a96e]/20 text-[#c9a96e] hover:bg-[#c9a96e]/10 text-xs h-10 font-bold"
                  onClick={openPublicLink}
                >
                  <ExternalLink size={14} className="mr-2" /> Apri link pubblico
                </Button>

                {report.leadId && (
                  <Button
                    variant="outline"
                    className="w-full border-white/10 text-[#888] hover:text-[#f5f5f5] text-xs h-10 font-medium"
                    onClick={() => router.push(`/pipeline/${report.leadId}`)}
                  >
                    <ExternalLink size={14} className="mr-2" /> Vai al Lead
                  </Button>
                )}

                {report.leadId && (
                  <Button
                    variant="outline"
                    className="w-full border-[#c9a96e]/20 text-[#c9a96e]/80 hover:bg-[#c9a96e]/10 text-xs h-10 font-bold"
                    onClick={() => setShowRegenModal(true)}
                    disabled={regenerating}
                  >
                    <RefreshCw size={14} className="mr-2" /> Rigenera Report AI
                  </Button>
                )}

                <Button
                  variant="outline"
                  className="w-full border-red-900/30 text-red-400 hover:bg-red-900/20 text-xs h-10 font-medium mt-2"
                  onClick={handleDelete}
                >
                  <Trash2 size={14} className="mr-2" /> Elimina report
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Report content */}
        <div className="order-2 lg:order-1 lg:col-span-3">
          <Card className="glass-dark border-white/5">
            <CardContent className="p-4 md:p-8">
              <div className="prose-report max-w-none">
                <ReactMarkdown>
                  {report.contenuto || "*Nessun contenuto disponibile*"}
                </ReactMarkdown>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Regen modal */}
      {showRegenModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4" onClick={() => { if (!regenerating) setShowRegenModal(false); }}>
          <div className="absolute inset-0 bg-black/60" />
          <div className="relative w-full max-w-2xl bg-[#141414] border border-[#1f1f1f] rounded-xl p-6 space-y-4 max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <h3 className="text-base font-bold text-[#f5f5f5]">Rigenera Report — {report.azienda}</h3>
            {!regenerating && !regenDone && (
              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] uppercase text-[#555] font-bold tracking-tight">Info aggiuntive (opzionale)</label>
                  <textarea
                    value={regenInfo}
                    onChange={e => setRegenInfo(e.target.value)}
                    placeholder="Aggiornamenti, nuove info sull'azienda..."
                    rows={3}
                    className="w-full bg-[#0d0d0d] border border-[#1f1f1f] text-[#f5f5f5] text-sm rounded-md px-3 py-2 resize-none outline-none focus:border-[#c9a96e]/30"
                  />
                </div>
                <div className="flex gap-3">
                  <button onClick={() => setShowRegenModal(false)} className="px-4 py-2 rounded-md border border-[#1f1f1f] text-[#888] text-sm hover:text-[#f5f5f5]">Annulla</button>
                  <button onClick={regenerateReport} className="flex-1 bg-[#c9a96e] hover:bg-[#b8945a] text-[#0a0a0a] font-bold px-4 py-2 rounded-md text-sm">Avvia Rigenerazione</button>
                </div>
              </div>
            )}
            {(regenerating || regenContent) && (
              <div className="space-y-3">
                {regenerating && (
                  <div className="flex items-center gap-2 text-[#c9a96e] text-sm">
                    <Loader2 size={16} className="animate-spin" />
                    Rigenerazione in corso...
                  </div>
                )}
                <div className="bg-[#0d0d0d] border border-[#1f1f1f] rounded-lg p-4 max-h-72 overflow-y-auto text-sm">
                  <ReactMarkdown>{regenContent}</ReactMarkdown>
                  {regenerating && <span className="inline-block w-2 h-4 bg-[#c9a96e] animate-pulse ml-1" />}
                </div>
                {regenDone && (
                  <div className="flex gap-3">
                    <button onClick={() => { setShowRegenModal(false); window.location.reload(); }} className="flex-1 bg-[#c9a96e] hover:bg-[#b8945a] text-[#0a0a0a] font-bold px-4 py-2 rounded-md text-sm">Chiudi e aggiorna</button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function PublicReportView({ report }: { report: Report }) {
  const calendlyUrl = process.env.NEXT_PUBLIC_CALENDLY_URL || "#";

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      {/* Header */}
      <div className="border-b border-[#1f1f1f] bg-[#0d0d0d]">
        <div className="max-w-4xl mx-auto px-6 py-5 flex items-center justify-between">
          <div>
            <span className="text-2xl font-bold tracking-widest text-[#c9a96e]">
              WIDE
            </span>
            <span className="text-xs text-[#888] ml-1 tracking-wider">
              DIGITAL AGENCY
            </span>
          </div>
          <div className="text-right">
            <p className="text-xs text-[#888]">
              Analisi Digitale Riservata per
            </p>
            <p className="text-sm font-semibold text-[#f5f5f5]">
              {report.azienda}
            </p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-6 py-10">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-[#f5f5f5]">{report.titolo}</h1>
          <p className="text-[#888] text-sm mt-1">
            Documento riservato · Generato il{" "}
            {new Date(report.createdTime).toLocaleDateString("it-IT", {
              day: "2-digit",
              month: "long",
              year: "numeric",
            })}
          </p>
        </div>

        <div className="bg-[#141414] border border-[#1f1f1f] rounded-xl p-8 prose-report">
          <ReactMarkdown>{report.contenuto || ""}</ReactMarkdown>
        </div>

        {/* CTA */}
        <div className="mt-10 bg-[#141414] border border-[#c9a96e]/30 rounded-xl p-8 text-center">
          <p className="text-lg font-semibold text-[#f5f5f5] mb-2">
            Vuoi trasformare questi dati in risultati concreti?
          </p>
          <p className="text-[#888] text-sm mb-6">
            Scopri come migliorare la tua presenza digitale con una strategia su
            misura.
          </p>
          <a
            href={calendlyUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 bg-[#c9a96e] hover:bg-[#b8945a] text-[#0a0a0a] font-semibold px-8 py-3 rounded-lg transition-colors"
          >
            Prenota una call gratuita →
          </a>
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-[#1f1f1f] mt-10 py-6 text-center">
        <p className="text-xs text-[#555]">
          © WIDE Digital Agency · Documento riservato e confidenziale
        </p>
      </div>
    </div>
  );
}
