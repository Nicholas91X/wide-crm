"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, X, GitBranch, FileText, Users } from "lucide-react";

type SearchResult = {
  id: string;
  type: "lead" | "report" | "client";
  title: string;
  subtitle: string;
  href: string;
};

export function SearchModal() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState(0);
  const router = useRouter();

  // Cmd+K / Ctrl+K shortcut
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen(o => !o);
      }
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Search
  useEffect(() => {
    if (!query.trim()) { setResults([]); return; }
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
        const data = await res.json();
        setResults(data);
        setSelected(0);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [query]);

  function navigate(href: string) {
    router.push(href);
    setOpen(false);
    setQuery("");
    setResults([]);
  }

  // Arrow key navigation
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "ArrowDown") { e.preventDefault(); setSelected(s => Math.min(s + 1, results.length - 1)); }
      if (e.key === "ArrowUp") { e.preventDefault(); setSelected(s => Math.max(s - 1, 0)); }
      if (e.key === "Enter" && results[selected]) navigate(results[selected].href);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, results, selected]);

  if (!open) return (
    <button
      onClick={() => setOpen(true)}
      className="flex items-center gap-2 text-[#444] hover:text-[#888] transition-colors text-xs"
      title="Cerca (Ctrl+K)"
    >
      <Search size={15} />
    </button>
  );

  const typeIcon = { lead: GitBranch, report: FileText, client: Users };
  const typeLabel = { lead: "Lead", report: "Report", client: "Cliente" };
  const typeColor = { lead: "text-[#c9a96e]", report: "text-blue-400", client: "text-green-400" };

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh] px-4" onClick={() => setOpen(false)}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div className="relative w-full max-w-xl bg-[#141414] border border-[#2a2a2a] rounded-2xl shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
        {/* Input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-[#1f1f1f]">
          <Search size={16} className="text-[#555] flex-shrink-0" />
          <input
            autoFocus
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Cerca lead, report, clienti..."
            className="flex-1 bg-transparent text-[#f5f5f5] text-sm outline-none placeholder:text-[#444]"
          />
          {query && (
            <button onClick={() => { setQuery(""); setResults([]); }} className="text-[#555] hover:text-[#888]">
              <X size={14} />
            </button>
          )}
          <kbd className="text-[10px] text-[#444] bg-[#0d0d0d] border border-[#2a2a2a] px-1.5 py-0.5 rounded">ESC</kbd>
        </div>

        {/* Results */}
        <div className="max-h-80 overflow-y-auto">
          {loading && (
            <div className="flex items-center justify-center py-8">
              <div className="w-5 h-5 border-2 border-[#c9a96e] border-t-transparent rounded-full animate-spin" />
            </div>
          )}
          {!loading && query && results.length === 0 && (
            <div className="text-center py-8 text-[#444] text-sm">Nessun risultato per &quot;{query}&quot;</div>
          )}
          {!loading && results.length > 0 && (
            <div className="py-2">
              {results.map((r, i) => {
                const Icon = typeIcon[r.type];
                return (
                  <button
                    key={r.id}
                    onClick={() => navigate(r.href)}
                    onMouseEnter={() => setSelected(i)}
                    className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${i === selected ? "bg-[#c9a96e]/10" : "hover:bg-white/5"}`}
                  >
                    <Icon size={14} className={`flex-shrink-0 ${typeColor[r.type]}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-[#f5f5f5] truncate font-medium">{r.title}</p>
                      <p className="text-[10px] text-[#555] truncate">{r.subtitle}</p>
                    </div>
                    <span className={`text-[9px] font-bold uppercase tracking-wider flex-shrink-0 ${typeColor[r.type]}`}>
                      {typeLabel[r.type]}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
          {!query && (
            <div className="py-6 text-center text-[#444] text-xs">
              Digita per cercare tra lead, report e clienti
            </div>
          )}
        </div>

        <div className="px-4 py-2 border-t border-[#1f1f1f] flex items-center gap-4 text-[10px] text-[#333]">
          <span>↑↓ naviga</span>
          <span>↵ apri</span>
          <span>ESC chiudi</span>
        </div>
      </div>
    </div>
  );
}
