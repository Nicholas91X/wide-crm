"use client";

import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import ReactMarkdown from "react-markdown";
import { Report } from "@/lib/types";

export default function PublicReportPage() {
  const { id } = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);
  const [invalid, setInvalid] = useState(false);

  useEffect(() => {
    if (!token) { setInvalid(true); setLoading(false); return; }
    fetch(`/api/reports/${id}?token=${token}`)
      .then((r) => {
        if (!r.ok) { setInvalid(true); setLoading(false); return null; }
        return r.json();
      })
      .then((data) => {
        if (data) setReport(data);
      })
      .catch(() => setInvalid(true))
      .finally(() => setLoading(false));
  }, [id, token]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#c9a96e] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (invalid || !report) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="text-center space-y-3">
          <h1 className="text-2xl font-bold text-[#f5f5f5]">Link non valido o scaduto</h1>
          <p className="text-[#888]">Questo link non è più accessibile. Contatta il mittente.</p>
        </div>
      </div>
    );
  }

  const calendlyUrl = process.env.NEXT_PUBLIC_CALENDLY_URL || "#";

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      {/* Header */}
      <div className="border-b border-[#1f1f1f] bg-[#0d0d0d]">
        <div className="max-w-4xl mx-auto px-6 py-5 flex items-center justify-between">
          <div>
            <span className="text-2xl font-bold tracking-widest text-[#c9a96e]">WIDE</span>
            <span className="text-xs text-[#888] ml-1 tracking-wider">DIGITAL AGENCY</span>
          </div>
          <div className="text-right">
            <p className="text-xs text-[#888]">Analisi Digitale Riservata per</p>
            <p className="text-sm font-semibold text-[#f5f5f5]">{report.azienda}</p>
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
              day: "2-digit", month: "long", year: "numeric",
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
            Scopri come migliorare la tua presenza digitale con una strategia su misura.
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
