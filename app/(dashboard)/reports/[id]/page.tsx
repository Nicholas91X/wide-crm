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
import { Copy, ArrowLeft, ExternalLink } from "lucide-react";
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

              <div className="flex flex-col gap-2 pt-2">
                <Button
                  variant="outline"
                  className="w-full border-white/10 text-[#f5f5f5] hover:bg-white/5 text-xs h-10 font-bold"
                  onClick={copyPublicLink}
                >
                  <Copy size={14} className="mr-2" /> Link Pubblico
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
