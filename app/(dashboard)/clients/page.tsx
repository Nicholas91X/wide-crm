"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { TrendingUp } from "lucide-react";
import { Client } from "@/lib/types";

function formatDate(d: string) {
  if (!d) return "-";
  return new Date(d).toLocaleDateString("it-IT", { day: "2-digit", month: "short", year: "numeric" });
}

function StatoBadge({ stato }: { stato: string }) {
  const colors: Record<string, string> = {
    Attivo: "bg-green-900/40 text-green-400",
    "In scadenza": "bg-yellow-900/40 text-yellow-400",
    Sospeso: "bg-orange-900/40 text-orange-400",
    Chiuso: "bg-red-900/40 text-red-400",
  };
  return (
    <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${colors[stato] ?? "bg-gray-800 text-gray-300"}`}>
      {stato || "-"}
    </span>
  );
}

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Client | null>(null);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/clients");
      if (!res.ok) throw new Error();
      setClients(await res.json());
    } catch {
      toast.error("Errore nel caricamento dei clienti");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  const totalMonthly = clients
    .filter((c) => c.statoContratto === "Attivo")
    .reduce((sum, c) => sum + (c.valoreNetto || 0), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#f5f5f5]">Clienti</h1>
          <p className="text-[#888] text-sm mt-1">{clients.length} clienti totali</p>
        </div>
        <div className="flex items-center gap-2 bg-[#141414] border border-[#1f1f1f] rounded-lg px-4 py-2">
          <TrendingUp size={16} className="text-[#c9a96e]" />
          <div>
            <p className="text-xs text-[#888]">Fatturato mensile</p>
            <p className="text-lg font-bold text-[#c9a96e]">
              €{totalMonthly.toLocaleString("it-IT")}
            </p>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-[#c9a96e] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : clients.length === 0 ? (
        <div className="text-center py-20 text-[#888]">Nessun cliente trovato</div>
      ) : (
        <Card className="bg-[#141414] border-[#1f1f1f] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#1f1f1f]">
                  {["Nome", "Settore", "Valore mensile", "Data inizio", "Prossimo rinnovo", "Stato contratto", "Responsabile"].map(
                    (h) => (
                      <th key={h} className="text-left px-4 py-3 text-xs text-[#888] font-medium whitespace-nowrap">
                        {h}
                      </th>
                    )
                  )}
                </tr>
              </thead>
              <tbody>
                {clients.map((c) => (
                  <tr
                    key={c.id}
                    className="border-b border-[#1f1f1f] last:border-0 hover:bg-[#1a1a1a] transition-colors cursor-pointer"
                    onClick={() => setSelected(c)}
                  >
                    <td className="px-4 py-3 font-medium text-[#f5f5f5]">{c.nome || "-"}</td>
                    <td className="px-4 py-3 text-[#888]">{c.settore || "-"}</td>
                    <td className="px-4 py-3 text-[#c9a96e] font-semibold">
                      {c.valoreNetto ? `€${c.valoreNetto.toLocaleString("it-IT")}` : "-"}
                    </td>
                    <td className="px-4 py-3 text-[#888] whitespace-nowrap">{formatDate(c.dataInizio)}</td>
                    <td className="px-4 py-3 text-[#888] whitespace-nowrap">{formatDate(c.prossimoRinnovo)}</td>
                    <td className="px-4 py-3"><StatoBadge stato={c.statoContratto} /></td>
                    <td className="px-4 py-3 text-[#888]">{c.responsabile || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Detail modal */}
      <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
        <DialogContent className="bg-[#141414] border-[#1f1f1f]">
          <DialogHeader>
            <DialogTitle className="text-[#f5f5f5]">{selected?.nome}</DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-3 text-sm">
              <Row label="Settore" value={selected.settore} />
              <Row
                label="Valore mensile"
                value={selected.valoreNetto ? `€${selected.valoreNetto.toLocaleString("it-IT")}` : "-"}
                accent
              />
              <Row label="Data inizio" value={formatDate(selected.dataInizio)} />
              <Row label="Prossimo rinnovo" value={formatDate(selected.prossimoRinnovo)} />
              <Row label="Stato contratto" value={selected.statoContratto} />
              <Row label="Responsabile" value={selected.responsabile} />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Row({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="flex justify-between items-center py-2 border-b border-[#1f1f1f] last:border-0">
      <span className="text-[#888]">{label}</span>
      <span className={accent ? "text-[#c9a96e] font-semibold" : "text-[#f5f5f5]"}>{value || "-"}</span>
    </div>
  );
}
