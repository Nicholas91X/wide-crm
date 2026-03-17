"use client";

import { useEffect, useState, useMemo } from "react";
import { useParams, useSearchParams } from "next/navigation";
import ReactMarkdown from "react-markdown";
import { Report } from "@/lib/types";

// ─── Types ────────────────────────────────────────────────────────────────────

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

// ─── Parsers ──────────────────────────────────────────────────────────────────

function parseReportSections(content: string): ReportSection[] {
  const regex = /^## (\d+)\.\s+(.+)$/gm;
  const matches = [...content.matchAll(regex)];
  if (matches.length === 0) return [];
  return matches.map((match, i) => {
    const start = match.index! + match[0].length;
    const end = matches[i + 1]?.index ?? content.length;
    return { num: parseInt(match[1]), title: match[2].trim(), body: content.slice(start, end).trim() };
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

// ─── Design config ────────────────────────────────────────────────────────────

const SCORE_CONFIG: Record<string, { level: number; color: string; bg: string; border: string; label: string; subtitle: string }> = {
  ASSENTE:   { level: 1, color: "#ef4444", bg: "#fef2f2", border: "#fecaca", label: "Assente",          subtitle: "Nessuna presenza digitale rilevata" },
  DEBOLE:    { level: 2, color: "#f97316", bg: "#fff7ed", border: "#fed7aa", label: "Debole",            subtitle: "Presenza molto limitata" },
  MEDIA:     { level: 3, color: "#eab308", bg: "#fefce8", border: "#fef08a", label: "Da migliorare",     subtitle: "Ampi margini di crescita disponibili" },
  BUONA:     { level: 4, color: "#22c55e", bg: "#f0fdf4", border: "#bbf7d0", label: "Buona",             subtitle: "Presenza solida, ottimizzabile" },
  ECCELLENTE:{ level: 5, color: "#10b981", bg: "#ecfdf5", border: "#6ee7b7", label: "Eccellente",        subtitle: "Presenza digitale ottimizzata" },
};

const IMPACT_CONFIG: Record<string, { color: string; bg: string; border: string }> = {
  ALTO:  { color: "#dc2626", bg: "#fef2f2", border: "#fecaca" },
  ALTA:  { color: "#dc2626", bg: "#fef2f2", border: "#fecaca" },
  MEDIO: { color: "#d97706", bg: "#fffbeb", border: "#fde68a" },
  MEDIA: { color: "#d97706", bg: "#fffbeb", border: "#fde68a" },
  BASSO: { color: "#16a34a", bg: "#f0fdf4", border: "#bbf7d0" },
  BASSA: { color: "#16a34a", bg: "#f0fdf4", border: "#bbf7d0" },
};

const DIFFICULTY_LABELS: Record<string, string> = {
  ALTA:  "Progetto strutturato",
  ALTO:  "Progetto strutturato",
  MEDIA: "Medio termine",
  MEDIO: "Medio termine",
  BASSA: "Implementazione rapida",
  BASSO: "Implementazione rapida",
};

const COMPETITOR_COLORS = ["#3b82f6", "#8b5cf6", "#ec4899", "#14b8a6"];

const SECTION_ICONS     = ["📊", "⚠️", "🏆", "🎯", "💡"];
const SECTION_SUBTITLES = [
  "Come si presenta oggi la tua azienda sul web",
  "I problemi che ti stanno costando visibilità",
  "Chi stai affrontando nel tuo mercato digitale",
  "Le azioni prioritarie per crescere online",
  "La sintesi e i prossimi passi consigliati",
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getBadgeImpatto(badges: Array<{ label: string; value: string }>) {
  return badges.find(b => b.label === "Impatto");
}

function getAccentColorFromImpatto(badges: Array<{ label: string; value: string }>): string {
  const b = getBadgeImpatto(badges);
  if (!b) return "#9ca3af";
  const u = b.value.toUpperCase();
  if (u === "ALTO") return "#ef4444";
  if (u === "MEDIO") return "#f59e0b";
  return "#22c55e";
}

// ─── Markdown components ──────────────────────────────────────────────────────

const mdLight: Record<string, React.FC<any>> = {
  p:      ({ children }) => <p className="text-[#4b5563] leading-relaxed mb-3 text-[15px]">{children}</p>,
  strong: ({ children }) => <strong className="text-[#111827] font-semibold">{children}</strong>,
  ul:     ({ children }) => <ul className="space-y-2 mb-3 ml-1">{children}</ul>,
  li:     ({ children }) => (
    <li className="text-[#4b5563] text-[15px] flex gap-2.5 items-start">
      <span className="text-[#c9a96e] mt-1.5 flex-shrink-0 text-xs leading-none">◆</span>
      <span>{children}</span>
    </li>
  ),
  h3: ({ children }) => <h3 className="text-[#111827] font-bold text-base mt-4 mb-2">{children}</h3>,
};

const mdDark: Record<string, React.FC<any>> = {
  p:      ({ children }) => <p className="text-[#c9bfa8] leading-relaxed mb-3 text-[15px]">{children}</p>,
  strong: ({ children }) => <strong className="text-[#f5e6c8] font-bold">{children}</strong>,
  ul:     ({ children }) => <ul className="space-y-2 mb-3">{children}</ul>,
  li:     ({ children }) => (
    <li className="text-[#c9bfa8] text-[15px] flex gap-2.5 items-start">
      <span className="text-[#c9a96e] mt-1.5 flex-shrink-0 text-xs leading-none">◆</span>
      <span>{children}</span>
    </li>
  ),
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionHeader({ num, title, icon, subtitle }: { num: number; title: string; icon: string; subtitle: string }) {
  return (
    <div className="mb-7">
      <div className="flex items-center gap-2 mb-1.5">
        <span className="text-xs font-bold text-[#c9a96e] tracking-widest">{String(num).padStart(2, "0")}</span>
        <span className="text-xs text-[#9ca3af] tracking-wide">· {subtitle}</span>
      </div>
      <h2 className="text-2xl font-black text-[#111827] flex items-center gap-3">
        <span className="text-xl">{icon}</span>
        {title}
      </h2>
    </div>
  );
}

function ScoreDisplay({ rating }: { rating: string }) {
  const cfg = SCORE_CONFIG[rating] ?? SCORE_CONFIG.MEDIA;
  return (
    <div
      className="flex flex-col items-center gap-3 rounded-2xl px-6 py-5 border"
      style={{ backgroundColor: cfg.bg, borderColor: cfg.border }}
    >
      <div className="flex gap-2">
        {[1, 2, 3, 4, 5].map((d) => (
          <div
            key={d}
            className="w-4 h-4 rounded-full"
            style={{ backgroundColor: d <= cfg.level ? cfg.color : "#e5e7eb" }}
          />
        ))}
      </div>
      <div className="text-center">
        <p className="text-lg font-black" style={{ color: cfg.color }}>{cfg.label}</p>
        <p className="text-xs text-[#9ca3af] mt-0.5 max-w-[140px] text-center leading-snug">{cfg.subtitle}</p>
      </div>
    </div>
  );
}

function ImpactBadge({ label, value }: { label: string; value: string }) {
  const upper = value.toUpperCase();
  const cfg = IMPACT_CONFIG[upper] ?? { color: "#6b7280", bg: "#f9fafb", border: "#e5e7eb" };
  const displayLabel =
    label === "Urgenza"
      ? upper === "ALTA" || upper === "ALTO" ? "Urgente" : upper === "MEDIA" || upper === "MEDIO" ? "Media urgenza" : "Non urgente"
      : `Impatto ${value.toLowerCase()}`;
  return (
    <span
      className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold border"
      style={{ color: cfg.color, backgroundColor: cfg.bg, borderColor: cfg.border }}
    >
      {displayLabel}
    </span>
  );
}

// ─── Section 1: Presenza Digitale ────────────────────────────────────────────

function SectionPresenza({ body }: { body: string }) {
  const { rating, cleanBody } = extractRating(body);
  return (
    <div className="space-y-4">
      {rating && (
        <div className="flex flex-col sm:flex-row items-start gap-5 p-5 bg-white rounded-2xl border border-[#f0ece3] shadow-sm">
          <ScoreDisplay rating={rating} />
          <div className="flex-1 pt-1">
            <p className="text-sm font-bold text-[#111827] mb-1.5">Valutazione Digitale Complessiva</p>
            <p className="text-sm text-[#6b7280] leading-relaxed">
              Questa valutazione riassume come la tua azienda appare online: sito web, social media, presenza sui motori di ricerca e visibilità in generale. È il punto di partenza per capire dove si trovano le opportunità di crescita più importanti.
            </p>
          </div>
        </div>
      )}
      <div className="bg-white rounded-2xl border border-[#f0ece3] shadow-sm p-6">
        <ReactMarkdown components={mdLight}>{cleanBody}</ReactMarkdown>
      </div>
    </div>
  );
}

// ─── Section 2: Criticità ─────────────────────────────────────────────────────

function SectionCriticita({ body }: { body: string }) {
  const { subsections, intro } = parseSubsections(body);
  return (
    <div className="space-y-4">
      {intro && (
        <div className="bg-white rounded-2xl border border-[#f0ece3] shadow-sm p-5">
          <ReactMarkdown components={mdLight}>{intro}</ReactMarkdown>
        </div>
      )}
      {subsections.map((s, i) => {
        const accent = getAccentColorFromImpatto(s.badges);
        return (
          <div key={i} className="bg-white rounded-2xl border border-[#f0ece3] shadow-sm overflow-hidden">
            {/* Top color bar */}
            <div className="h-1 w-full" style={{ backgroundColor: accent }} />
            <div className="p-5">
              <div className="flex items-start justify-between gap-3 mb-3 flex-wrap">
                <div className="flex items-center gap-3">
                  <span
                    className="w-8 h-8 rounded-xl flex items-center justify-center text-sm font-black flex-shrink-0"
                    style={{ backgroundColor: `${accent}18`, color: accent }}
                  >
                    {i + 1}
                  </span>
                  <h3 className="text-[15px] font-bold text-[#111827]">{s.title}</h3>
                </div>
                <div className="flex gap-2 flex-wrap">
                  {s.badges.map((b) => <ImpactBadge key={b.label} label={b.label} value={b.value} />)}
                </div>
              </div>
              <div className="ml-11">
                <ReactMarkdown components={mdLight}>{s.description}</ReactMarkdown>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Section 3: Competitor ────────────────────────────────────────────────────

function SectionCompetitor({ body }: { body: string }) {
  const { subsections, intro } = parseSubsections(body);
  return (
    <div className="space-y-4">
      {intro && (
        <div className="bg-white rounded-2xl border border-[#f0ece3] shadow-sm p-5">
          <ReactMarkdown components={mdLight}>{intro}</ReactMarkdown>
        </div>
      )}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {subsections.map((s, i) => {
          const color = COMPETITOR_COLORS[i % COMPETITOR_COLORS.length];
          return (
            <div key={i} className="bg-white rounded-2xl border border-[#f0ece3] shadow-sm overflow-hidden">
              <div className="h-1 w-full" style={{ backgroundColor: color }} />
              <div className="p-5">
                <div className="flex items-center gap-3 mb-3">
                  <span
                    className="w-8 h-8 rounded-xl flex items-center justify-center text-sm font-black text-white flex-shrink-0"
                    style={{ backgroundColor: color }}
                  >
                    {i + 1}
                  </span>
                  <h3 className="text-sm font-bold text-[#111827] leading-snug">{s.title}</h3>
                </div>
                <ReactMarkdown components={mdLight}>{s.description}</ReactMarkdown>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Section 4: Azioni ────────────────────────────────────────────────────────

function SectionAzioni({ body }: { body: string }) {
  const { subsections, intro } = parseSubsections(body);

  function getActionColor(badges: Array<{ label: string; value: string }>): string {
    const b = getBadgeImpatto(badges);
    if (!b) return "#c9a96e";
    const u = b.value.toUpperCase();
    if (u === "ALTO") return "#059669";
    if (u === "MEDIO") return "#2563eb";
    return "#6b7280";
  }

  function getDiffLabel(badges: Array<{ label: string; value: string }>): string | null {
    const d = badges.find(b => b.label === "Difficoltà");
    if (!d) return null;
    return DIFFICULTY_LABELS[d.value.toUpperCase()] ?? d.value;
  }

  return (
    <div className="space-y-4">
      {intro && (
        <div className="bg-white rounded-2xl border border-[#f0ece3] shadow-sm p-5">
          <ReactMarkdown components={mdLight}>{intro}</ReactMarkdown>
        </div>
      )}
      {subsections.map((s, i) => {
        const color = getActionColor(s.badges);
        const diffLabel = getDiffLabel(s.badges);
        return (
          <div key={i} className="bg-white rounded-2xl border border-[#f0ece3] shadow-sm p-5">
            <div className="flex items-start gap-4">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center text-base font-black text-white flex-shrink-0 mt-0.5"
                style={{ backgroundColor: color }}
              >
                {i + 1}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2 mb-2 flex-wrap">
                  <h3 className="text-[15px] font-bold text-[#111827]">{s.title}</h3>
                  {diffLabel && (
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-[#f5f0e8] text-[#78716c] border border-[#e7dfd0] flex-shrink-0">
                      {diffLabel}
                    </span>
                  )}
                </div>
                <ReactMarkdown components={mdLight}>{s.description}</ReactMarkdown>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Section 5: Executive Summary ────────────────────────────────────────────

function SectionSummary({ body }: { body: string }) {
  return (
    <div
      className="rounded-2xl p-7 md:p-9 relative overflow-hidden"
      style={{ background: "linear-gradient(135deg, #1a1200 0%, #0d0c08 100%)", border: "1px solid rgba(201,169,110,0.2)" }}
    >
      <div
        className="absolute top-0 right-0 w-72 h-72 rounded-full pointer-events-none"
        style={{ background: "radial-gradient(circle, rgba(201,169,110,0.12) 0%, transparent 70%)", transform: "translate(30%,-30%)" }}
      />
      <div className="relative">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-1 h-8 rounded-full" style={{ backgroundColor: "#c9a96e" }} />
          <p className="text-xs font-bold text-[#c9a96e] uppercase tracking-widest">Sintesi e Conclusioni</p>
        </div>
        <ReactMarkdown components={mdDark}>{body}</ReactMarkdown>
      </div>
    </div>
  );
}

// ─── Section renderers map ────────────────────────────────────────────────────

const SECTION_RENDERERS = [
  SectionPresenza,
  SectionCriticita,
  SectionCompetitor,
  SectionAzioni,
  SectionSummary,
];

// ─── Main page ────────────────────────────────────────────────────────────────

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

  const sections = useMemo(() => parseReportSections(report?.contenuto || ""), [report]);

  const calendlyUrl = process.env.NEXT_PUBLIC_CALENDLY_URL || "#";

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f7f6f3] flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-10 h-10 border-2 border-[#c9a96e] border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm text-[#9ca3af]">Caricamento in corso...</p>
        </div>
      </div>
    );
  }

  if (invalid || !report) {
    return (
      <div className="min-h-screen bg-[#f7f6f3] flex items-center justify-center px-6">
        <div className="text-center space-y-3 max-w-sm">
          <div className="w-14 h-14 rounded-2xl bg-white shadow-sm border border-[#f0ece3] flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">🔒</span>
          </div>
          <h1 className="text-xl font-black text-[#111827]">Link non valido</h1>
          <p className="text-[#6b7280] text-sm leading-relaxed">
            Questo link è scaduto o non è più accessibile.<br />
            Contatta WIDE Digital Agency per riceverne uno nuovo.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f7f6f3]">

      {/* Sticky header */}
      <header className="sticky top-0 z-20 bg-white/95 backdrop-blur-md border-b border-[#ede9e0] shadow-sm">
        <div className="max-w-4xl mx-auto px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#1a1200] flex items-center justify-center shadow-sm">
              <span className="text-[#c9a96e] text-sm font-black">W</span>
            </div>
            <div>
              <span className="text-sm font-black tracking-widest text-[#1a1200]">WIDE</span>
              <span className="text-[10px] text-[#9ca3af] ml-1.5 tracking-widest hidden sm:inline">DIGITAL AGENCY</span>
            </div>
          </div>
          <div className="text-right">
            <p className="text-[10px] text-[#9ca3af] uppercase tracking-widest">Analisi per</p>
            <p className="text-xs font-bold text-[#111827]">{report.azienda}</p>
          </div>
        </div>
      </header>

      {/* Hero */}
      <div style={{ background: "linear-gradient(160deg, #1c1400 0%, #0d0d0d 100%)" }}>
        <div className="max-w-4xl mx-auto px-5 py-12 md:py-16">
          <p className="text-xs font-bold text-[#c9a96e] uppercase tracking-widest mb-4">
            Analisi Digitale Riservata
          </p>
          <h1 className="text-3xl md:text-4xl font-black leading-tight mb-4 text-white max-w-2xl">
            {report.titolo}
          </h1>
          <p className="text-[#6b5e45] text-sm">
            Documento generato il{" "}
            {new Date(report.createdTime).toLocaleDateString("it-IT", {
              day: "2-digit", month: "long", year: "numeric",
            })}
            {" "}· Riservato e confidenziale
          </p>
        </div>
      </div>

      {/* TOC tabs */}
      {sections.length > 0 && (
        <div className="bg-white border-b border-[#ede9e0]">
          <div className="max-w-4xl mx-auto px-5 py-3 flex gap-1 overflow-x-auto no-scrollbar">
            {sections.map((s, i) => (
              <a
                key={s.num}
                href={`#section-${s.num}`}
                className="flex-shrink-0 flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold text-[#6b7280] hover:text-[#c9a96e] hover:bg-[#fef9ec] transition-colors"
              >
                <span>{SECTION_ICONS[i]}</span>
                <span className="hidden sm:inline">{s.title.split(" ").slice(0, 3).join(" ")}</span>
                <span className="sm:hidden font-black text-xs">{s.num}</span>
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Main content */}
      <main className="max-w-4xl mx-auto px-5 py-12 space-y-14">

        {sections.length > 0 ? sections.map((section, i) => {
          const Renderer = SECTION_RENDERERS[i] ?? SectionPresenza;
          return (
            <section key={section.num} id={`section-${section.num}`} className="scroll-mt-20">
              <SectionHeader
                num={section.num}
                title={section.title}
                icon={SECTION_ICONS[i]}
                subtitle={SECTION_SUBTITLES[i]}
              />
              <Renderer body={section.body} />
            </section>
          );
        }) : (
          <div className="bg-white rounded-2xl border border-[#f0ece3] shadow-sm p-6">
            <ReactMarkdown components={mdLight}>{report.contenuto || ""}</ReactMarkdown>
          </div>
        )}

        {/* CTA block */}
        <div
          className="relative overflow-hidden rounded-2xl p-8 md:p-12 text-center"
          style={{ background: "linear-gradient(135deg, #1a1200 0%, #0d0c08 100%)", border: "1px solid rgba(201,169,110,0.15)" }}
        >
          <div
            className="absolute inset-0 pointer-events-none"
            style={{ background: "radial-gradient(ellipse at 50% 0%, rgba(201,169,110,0.12), transparent 60%)" }}
          />
          <div className="relative">
            <p className="text-xs font-bold text-[#c9a96e] uppercase tracking-widest mb-5">
              Passo Successivo
            </p>
            <p className="text-2xl md:text-3xl font-black text-white mb-3 max-w-md mx-auto leading-tight">
              Pronti a tradurre questa analisi in crescita reale?
            </p>
            <p className="text-[#9c8b6e] text-sm mb-8 max-w-sm mx-auto leading-relaxed">
              In 30 minuti analizziamo insieme le priorità e costruiamo un piano concreto per la tua attività.
            </p>
            <a
              href={calendlyUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-[#c9a96e] hover:bg-[#b8945a] text-[#1a1200] font-black px-8 py-3.5 rounded-xl transition-colors text-sm tracking-wide shadow-lg shadow-[#c9a96e]/20"
            >
              Prenota la call gratuita →
            </a>
            <p className="text-[#4b3e27] text-xs mt-4">Gratuita · 30 minuti · Senza impegno</p>
          </div>
        </div>

      </main>

      {/* Footer */}
      <footer className="border-t border-[#ede9e0] py-8 text-center bg-white">
        <p className="text-xs text-[#b5aea2]">
          © WIDE Digital Agency · Documento riservato e confidenziale
        </p>
      </footer>

    </div>
  );
}
