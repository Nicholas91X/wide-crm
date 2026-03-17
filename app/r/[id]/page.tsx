"use client";

import { useEffect, useState, useMemo } from "react";
import { useParams, useSearchParams } from "next/navigation";
import ReactMarkdown from "react-markdown";
import { Report } from "@/lib/types";

// --- Types ---
interface ReportSection {
  num: number;
  title: string;
  body: string;
}
interface Subsection {
  title: string;
  badges: Array<{ label: string; value: string }>;
  description: string;
}

// --- Parsers ---
function parseReportSections(content: string): ReportSection[] {
  const regex = /^## (\d+)\.\s+(.+)$/gm;
  const matches = [...content.matchAll(regex)];
  if (matches.length === 0) return [];
  return matches.map((match, i) => {
    const start = match.index! + match[0].length;
    const end = matches[i + 1]?.index ?? content.length;
    return {
      num: parseInt(match[1]),
      title: match[2].trim(),
      body: content.slice(start, end).trim(),
    };
  });
}

function parseSubsections(body: string): { subsections: Subsection[]; intro: string } {
  const regex = /^### (.+)$/gm;
  const matches = [...body.matchAll(regex)];
  if (matches.length === 0) return { subsections: [], intro: body };
  const intro = body.slice(0, matches[0].index).trim();
  const subsections: Subsection[] = matches.map((match, i) => {
    const start = match.index! + match[0].length;
    const end = matches[i + 1]?.index ?? body.length;
    const raw = body.slice(start, end).trim();
    const badges: Array<{ label: string; value: string }> = [];
    let description = raw;
    const badgeRegex = /^- \*\*(.+?):\*\*\s+(.+)$/gm;
    for (const b of [...raw.matchAll(badgeRegex)]) {
      if (["Impatto", "Urgenza", "Difficoltà"].includes(b[1])) {
        badges.push({ label: b[1], value: b[2].trim() });
        description = description.replace(b[0], "").trim();
      }
    }
    return { title: match[1].trim(), badges, description };
  });
  return { subsections, intro };
}

function extractRating(body: string): { rating: string | null; cleanBody: string } {
  const regex = /\*\*Valutazione\s+complessiva:\s*([A-Z]+)\*\*/i;
  const match = body.match(regex);
  if (!match) return { rating: null, cleanBody: body };
  return { rating: match[1].toUpperCase(), cleanBody: body.replace(match[0], "").trim() };
}

// --- Badge colors ---
const RATING_STYLES: Record<string, string> = {
  ASSENTE: "bg-red-900/20 text-red-400 border border-red-800/30",
  DEBOLE: "bg-orange-900/20 text-orange-400 border border-orange-800/30",
  MEDIA: "bg-yellow-900/20 text-yellow-400 border border-yellow-800/30",
  BUONA: "bg-blue-900/20 text-blue-400 border border-blue-800/30",
  ECCELLENTE: "bg-green-900/20 text-green-400 border border-green-800/30",
};
const RATING_DOTS: Record<string, number> = {
  ASSENTE: 1, DEBOLE: 2, MEDIA: 3, BUONA: 4, ECCELLENTE: 5,
};
const IMPACT_STYLES: Record<string, string> = {
  ALTO: "bg-red-900/20 text-red-400",
  ALTA: "bg-red-900/20 text-red-400",
  MEDIO: "bg-yellow-900/20 text-yellow-400",
  MEDIA: "bg-yellow-900/20 text-yellow-400",
  BASSO: "bg-green-900/20 text-green-400",
  BASSA: "bg-green-900/20 text-green-400",
};

// --- Shared MD components ---
const md: Record<string, React.FC<any>> = {
  p: ({ children }) => <p className="text-[#b0b0b0] leading-relaxed mb-2.5 text-sm">{children}</p>,
  strong: ({ children }) => <strong className="text-[#e8e8e8] font-semibold">{children}</strong>,
  ul: ({ children }) => <ul className="space-y-1 mb-2.5 ml-4 list-none">{children}</ul>,
  li: ({ children }) => (
    <li className="text-[#b0b0b0] text-sm flex gap-2 items-start">
      <span className="text-[#c9a96e] mt-1 flex-shrink-0">·</span>
      <span>{children}</span>
    </li>
  ),
  h3: ({ children }) => <h3 className="text-[#e8e8e8] font-semibold text-sm mt-3 mb-1">{children}</h3>,
};

function Badge({ label, value }: { label: string; value: string }) {
  const style = IMPACT_STYLES[value.toUpperCase()] || "bg-[#1f1f1f] text-[#888]";
  return (
    <span className="inline-flex items-center gap-1.5 text-xs">
      <span className="text-[#444]">{label}</span>
      <span className={`px-2 py-0.5 rounded font-bold text-xs ${style}`}>{value}</span>
    </span>
  );
}

function RatingBar({ rating }: { rating: string }) {
  const upper = rating.toUpperCase();
  const style = RATING_STYLES[upper] || "bg-[#1f1f1f] text-[#888] border border-[#333]";
  const dots = RATING_DOTS[upper] || 0;
  return (
    <div className={`inline-flex items-center gap-3 px-4 py-2.5 rounded-xl mt-4 ${style}`}>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((d) => (
          <span
            key={d}
            className={`w-2 h-2 rounded-full ${d <= dots ? "opacity-100" : "opacity-20"}`}
            style={{ background: "currentColor" }}
          />
        ))}
      </div>
      <span className="text-xs font-bold tracking-wider">{upper}</span>
    </div>
  );
}

// --- Section renderers ---
function SectionPresenza({ body }: { body: string }) {
  const { rating, cleanBody } = extractRating(body);
  return (
    <div>
      <ReactMarkdown components={md}>{cleanBody}</ReactMarkdown>
      {rating && <RatingBar rating={rating} />}
    </div>
  );
}

function SectionCriticita({ body }: { body: string }) {
  const { subsections, intro } = parseSubsections(body);
  return (
    <div className="space-y-3">
      {intro && <ReactMarkdown components={md}>{intro}</ReactMarkdown>}
      {subsections.map((s, i) => (
        <div key={i} className="bg-[#0d0d0d] border border-red-900/20 rounded-xl p-4">
          <div className="flex items-start justify-between gap-3 mb-2">
            <h3 className="text-sm font-bold text-[#f0f0f0]">{s.title}</h3>
            <div className="flex gap-3 flex-shrink-0">
              {s.badges.map((b) => <Badge key={b.label} label={b.label} value={b.value} />)}
            </div>
          </div>
          <ReactMarkdown components={md}>{s.description}</ReactMarkdown>
        </div>
      ))}
    </div>
  );
}

function SectionCompetitor({ body }: { body: string }) {
  const { subsections, intro } = parseSubsections(body);
  return (
    <div className="space-y-3">
      {intro && <ReactMarkdown components={md}>{intro}</ReactMarkdown>}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {subsections.map((s, i) => (
          <div key={i} className="bg-[#0d0d0d] border border-[#1a1a1a] rounded-xl p-4">
            <div className="flex items-center gap-2.5 mb-3">
              <span className="w-7 h-7 rounded-lg bg-[#1a1a1a] flex items-center justify-center text-xs font-black text-[#888]">
                {i + 1}
              </span>
              <h3 className="text-sm font-bold text-[#f0f0f0]">{s.title}</h3>
            </div>
            <ReactMarkdown components={md}>{s.description}</ReactMarkdown>
          </div>
        ))}
      </div>
    </div>
  );
}

function SectionAzioni({ body }: { body: string }) {
  const { subsections, intro } = parseSubsections(body);
  return (
    <div className="space-y-3">
      {intro && <ReactMarkdown components={md}>{intro}</ReactMarkdown>}
      {subsections.map((s, i) => (
        <div key={i} className="bg-[#0d0d0d] border border-[#c9a96e]/10 rounded-xl p-4">
          <div className="flex items-start justify-between gap-3 mb-2">
            <div className="flex items-center gap-2.5">
              <span className="w-6 h-6 rounded-lg bg-[#c9a96e]/10 flex items-center justify-center text-xs font-black text-[#c9a96e] flex-shrink-0">
                {i + 1}
              </span>
              <h3 className="text-sm font-bold text-[#f0f0f0]">{s.title}</h3>
            </div>
            <div className="flex gap-3 flex-shrink-0">
              {s.badges.map((b) => <Badge key={b.label} label={b.label} value={b.value} />)}
            </div>
          </div>
          <ReactMarkdown components={md}>{s.description}</ReactMarkdown>
        </div>
      ))}
    </div>
  );
}

function SectionSummary({ body }: { body: string }) {
  return (
    <div className="relative overflow-hidden rounded-xl border border-[#c9a96e]/15 bg-[#0d0d0d] p-6">
      <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-[#c9a96e] to-[#8a7245] rounded-l-xl" />
      <ReactMarkdown
        components={{
          ...md,
          p: ({ children }) => (
            <p className="text-[#c8c8c8] leading-relaxed text-sm mb-2.5">{children}</p>
          ),
        }}
      >
        {body}
      </ReactMarkdown>
    </div>
  );
}

const SECTION_ICONS = ["🔍", "⚠️", "🏆", "🚀", "📋"];
const SECTION_RENDERERS = [
  SectionPresenza,
  SectionCriticita,
  SectionCompetitor,
  SectionAzioni,
  SectionSummary,
];

// --- Main page ---
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
      .then((data) => { if (data) setReport(data); })
      .catch(() => setInvalid(true))
      .finally(() => setLoading(false));
  }, [id, token]);

  const sections = useMemo(
    () => parseReportSections(report?.contenuto || ""),
    [report]
  );

  const calendlyUrl = process.env.NEXT_PUBLIC_CALENDLY_URL || "#";

  if (loading) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#c9a96e] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (invalid || !report) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center px-6">
        <div className="text-center space-y-3 max-w-sm">
          <div className="w-12 h-12 rounded-2xl bg-[#1a1a1a] flex items-center justify-center mx-auto mb-4">
            <span className="text-xl">🔒</span>
          </div>
          <h1 className="text-xl font-black text-[#f5f5f5]">Link non valido</h1>
          <p className="text-[#666] text-sm">Questo link è scaduto o non è più accessibile. Contatta il mittente per riceverne uno nuovo.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050505] text-[#f5f5f5]">

      {/* Navbar */}
      <header className="sticky top-0 z-20 border-b border-white/5 bg-[#050505]/80 backdrop-blur-xl">
        <div className="max-w-3xl mx-auto px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#c9a96e]/10 border border-[#c9a96e]/20 flex items-center justify-center">
              <span className="text-[#c9a96e] text-sm font-black">W</span>
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-sm font-black tracking-widest text-[#c9a96e]">WIDE</span>
              <span className="text-[10px] text-[#444] tracking-widest hidden sm:block">DIGITAL AGENCY</span>
            </div>
          </div>
          <div className="text-right">
            <p className="text-[10px] text-[#444] uppercase tracking-widest">Analisi riservata per</p>
            <p className="text-xs font-semibold text-[#ccc]">{report.azienda}</p>
          </div>
        </div>
      </header>

      {/* Hero */}
      <div className="border-b border-white/5 bg-[#080808]">
        <div className="max-w-3xl mx-auto px-5 py-10">
          <p className="text-xs text-[#c9a96e] uppercase tracking-widest font-bold mb-3">
            Documento Riservato
          </p>
          <h1 className="text-2xl md:text-3xl font-black text-[#f5f5f5] leading-tight mb-3">
            {report.titolo}
          </h1>
          <p className="text-[#444] text-xs">
            Generato il{" "}
            {new Date(report.createdTime).toLocaleDateString("it-IT", {
              day: "2-digit", month: "long", year: "numeric",
            })}
            {" "}· Confidenziale
          </p>
        </div>
      </div>

      {/* Table of contents */}
      {sections.length > 0 && (
        <div className="border-b border-white/5 bg-[#060606]">
          <div className="max-w-3xl mx-auto px-5 py-4 flex gap-2 overflow-x-auto no-scrollbar">
            {sections.map((s, i) => (
              <a
                key={s.num}
                href={`#section-${s.num}`}
                className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#111] border border-white/5 text-xs text-[#888] hover:text-[#c9a96e] hover:border-[#c9a96e]/20 transition-colors"
              >
                <span>{SECTION_ICONS[i]}</span>
                <span className="hidden sm:block">{s.num}. {s.title.split(" ").slice(0, 2).join(" ")}</span>
                <span className="sm:hidden">{s.num}</span>
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Content */}
      <main className="max-w-3xl mx-auto px-5 py-10 space-y-10">

        {sections.length > 0 ? sections.map((section, i) => {
          const Renderer = SECTION_RENDERERS[i] ?? SectionPresenza;
          return (
            <section key={section.num} id={`section-${section.num}`}>
              <div className="flex items-center gap-3 mb-5">
                <span className="text-xl">{SECTION_ICONS[i]}</span>
                <h2 className="text-sm font-black text-[#f5f5f5] uppercase tracking-widest">
                  {section.title}
                </h2>
                <div className="flex-1 h-px bg-white/5" />
                <span className="text-[10px] text-[#333] font-bold">{String(section.num).padStart(2, "0")}</span>
              </div>
              <Renderer body={section.body} />
            </section>
          );
        }) : (
          <div className="prose-report">
            <ReactMarkdown>{report.contenuto || ""}</ReactMarkdown>
          </div>
        )}

        {/* CTA */}
        <div className="relative overflow-hidden rounded-2xl border border-[#c9a96e]/20 bg-[#0a0a0a] p-8 text-center mt-4">
          <div className="absolute inset-0 bg-gradient-to-br from-[#c9a96e]/5 via-transparent to-transparent pointer-events-none" />
          <p className="text-[10px] text-[#c9a96e] uppercase tracking-widest font-bold mb-4">Prossimo Passo</p>
          <p className="text-xl font-black text-[#f5f5f5] mb-2 max-w-sm mx-auto leading-tight">
            Vuoi trasformare questi dati in risultati concreti?
          </p>
          <p className="text-[#666] text-sm mb-8 max-w-xs mx-auto">
            In 30 minuti analizziamo insieme le priorità e costruiamo una strategia su misura per la tua attività.
          </p>
          <a
            href={calendlyUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 bg-[#c9a96e] hover:bg-[#b8945a] text-[#050505] font-black px-8 py-3.5 rounded-xl transition-colors text-sm tracking-wide"
          >
            Prenota la call gratuita →
          </a>
          <p className="text-[#444] text-xs mt-4">Gratuita · 30 minuti · Senza impegno</p>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/5 py-8 text-center">
        <p className="text-xs text-[#2a2a2a]">
          © WIDE Digital Agency · Documento riservato e confidenziale
        </p>
      </footer>

    </div>
  );
}
