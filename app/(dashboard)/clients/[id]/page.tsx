"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ArrowLeft,
  Save,
  Loader2,
  Trash2,
  AlertTriangle,
  Globe,
} from "lucide-react";
import { Client, SETTORI, STATI_CONTRATTO } from "@/lib/types";

function formatDate(d: string) {
  if (!d) return "-";
  return new Date(d).toLocaleDateString("it-IT", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function daysUntil(dateStr: string): number | null {
  if (!dateStr) return null;
  const diff = new Date(dateStr).getTime() - new Date().setHours(0, 0, 0, 0);
  return Math.ceil(diff / 86400000);
}

export default function ClientDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { data: session } = useSession();
  const role = (session?.user as { role?: string })?.role;
  const canEdit = role === "admin" || role === "editor";

  const [client, setClient] = useState<Client | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [form, setForm] = useState<Partial<Client>>({});

  useEffect(() => {
    fetch(`/api/clients/${id}`)
      .then((r) => r.json())
      .then((data) => {
        setClient(data);
        setForm(data);
      })
      .catch(() => toast.error("Errore nel caricamento"))
      .finally(() => setLoading(false));
  }, [id]);

  function setField<K extends keyof Client>(key: K, value: Client[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function save() {
    setSaving(true);
    try {
      const res = await fetch(`/api/clients/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error();
      const updated = await res.json();
      setClient(updated);
      setForm(updated);
      toast.success("Modifiche salvate");
    } catch {
      toast.error("Errore nel salvataggio");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!confirm(`Eliminare definitivamente "${client?.nome}"?`)) return;
    setDeleting(true);
    try {
      await fetch(`/api/clients/${id}`, { method: "DELETE" });
      toast.success("Cliente eliminato");
      router.push("/clients");
    } catch {
      toast.error("Errore nell'eliminazione");
    } finally {
      setDeleting(false);
    }
  }

  if (loading)
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-[#c9a96e] border-t-transparent rounded-full animate-spin" />
      </div>
    );

  if (!client)
    return (
      <div className="text-[#888] text-center py-20">Cliente non trovato</div>
    );

  const renewalDays = daysUntil(client.prossimoRinnovo);
  const renewalUrgent = renewalDays !== null && renewalDays <= 30;
  const renewalExpired = renewalDays !== null && renewalDays < 0;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push("/clients")}
          className="text-[#555] hover:text-[#f5f5f5] bg-white/5 rounded-full"
        >
          <ArrowLeft size={16} />
        </Button>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-[#f5f5f5]">{client.nome}</h1>
          <p className="text-[#555] text-xs uppercase tracking-widest">
            {client.settore} · {client.statoContratto}
          </p>
        </div>
      </div>

      {/* Renewal alert */}
      {renewalUrgent && (
        <div
          className={`flex items-center gap-3 px-4 py-3 rounded-xl border ${renewalExpired ? "bg-red-900/20 border-red-800/40 text-red-400" : "bg-orange-900/20 border-orange-800/40 text-orange-400"}`}
        >
          <AlertTriangle size={16} />
          <p className="text-sm font-medium">
            {renewalExpired
              ? `Rinnovo scaduto il ${formatDate(client.prossimoRinnovo)}`
              : `Rinnovo in scadenza tra ${renewalDays} giorni (${formatDate(client.prossimoRinnovo)})`}
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main form */}
        <div className="lg:col-span-2 space-y-4">
          <Card className="glass-dark border-white/5">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-bold uppercase tracking-widest text-[#555]">
                Informazioni Cliente
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label className="text-[10px] uppercase text-[#555] font-bold tracking-tight">
                    Nome
                  </Label>
                  <Input
                    value={form.nome ?? ""}
                    onChange={(e) => setField("nome", e.target.value)}
                    disabled={!canEdit}
                    className="glass border-white/5 text-sm h-10"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] uppercase text-[#555] font-bold tracking-tight">
                    Settore
                  </Label>
                  <Select
                    value={form.settore ?? ""}
                    onValueChange={(v) => setField("settore", v)}
                    disabled={!canEdit}
                  >
                    <SelectTrigger className="glass border-white/5 text-sm h-10">
                      <SelectValue placeholder="Settore" />
                    </SelectTrigger>
                    <SelectContent className="glass-dark border-white/10">
                      {SETTORI.map((s) => (
                        <SelectItem key={s} value={s}>
                          {s}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] uppercase text-[#555] font-bold tracking-tight">
                    Valore mensile (€)
                  </Label>
                  <Input
                    type="number"
                    value={form.valoreNetto ?? ""}
                    onChange={(e) =>
                      setField("valoreNetto", Number(e.target.value))
                    }
                    disabled={!canEdit}
                    className="glass border-white/5 text-sm h-10"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] uppercase text-[#555] font-bold tracking-tight">
                    Responsabile
                  </Label>
                  <Input
                    value={form.responsabile ?? ""}
                    onChange={(e) => setField("responsabile", e.target.value)}
                    disabled={!canEdit}
                    className="glass border-white/5 text-sm h-10"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] uppercase text-[#555] font-bold tracking-tight">
                    Sito Web
                  </Label>
                  <Input
                    value={form.sitoWeb ?? ""}
                    onChange={(e) => setField("sitoWeb", e.target.value)}
                    disabled={!canEdit}
                    className="glass border-white/5 text-sm h-10"
                    placeholder="https://..."
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] uppercase text-[#555] font-bold tracking-tight">
                    Stato contratto
                  </Label>
                  <Select
                    value={form.statoContratto ?? ""}
                    onValueChange={(v) => setField("statoContratto", v)}
                    disabled={!canEdit}
                  >
                    <SelectTrigger className="glass border-white/5 text-sm h-10">
                      <SelectValue placeholder="Stato" />
                    </SelectTrigger>
                    <SelectContent className="glass-dark border-white/10">
                      {STATI_CONTRATTO.map((s) => (
                        <SelectItem key={s} value={s}>
                          {s}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] uppercase text-[#555] font-bold tracking-tight">
                    Data inizio
                  </Label>
                  <Input
                    type="date"
                    value={form.dataInizio ?? ""}
                    onChange={(e) => setField("dataInizio", e.target.value)}
                    disabled={!canEdit}
                    className="glass border-white/5 text-sm h-10"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] uppercase text-[#555] font-bold tracking-tight">
                    Prossimo rinnovo
                  </Label>
                  <Input
                    type="date"
                    value={form.prossimoRinnovo ?? ""}
                    onChange={(e) =>
                      setField("prossimoRinnovo", e.target.value)
                    }
                    disabled={!canEdit}
                    className="glass border-white/5 text-sm h-10"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] uppercase text-[#555] font-bold tracking-tight">
                  Note
                </Label>
                <Textarea
                  value={form.note ?? ""}
                  onChange={(e) => setField("note", e.target.value)}
                  disabled={!canEdit}
                  rows={3}
                  className="glass border-white/5 text-sm resize-none"
                />
              </div>
              {canEdit && (
                <div className="flex gap-3 pt-2">
                  <Button
                    onClick={save}
                    disabled={saving}
                    className="bg-[#c9a96e] hover:bg-[#b8945a] text-[#0a0a0a] font-bold px-8"
                  >
                    {saving ? (
                      <>
                        <Loader2 size={16} className="mr-2 animate-spin" />
                        Salvataggio...
                      </>
                    ) : (
                      <>
                        <Save size={16} className="mr-2" />
                        Salva modifiche
                      </>
                    )}
                  </Button>
                  <Button
                    onClick={handleDelete}
                    disabled={deleting}
                    variant="outline"
                    className="border-red-900/40 text-red-400 hover:bg-red-900/20"
                  >
                    {deleting ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      <Trash2 size={16} />
                    )}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <Card className="glass-dark border-white/5">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-bold uppercase tracking-widest text-[#555]">
                Riepilogo
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="text-center py-3">
                <p className="text-3xl font-black text-[#c9a96e]">
                  €{(client.valoreNetto || 0).toLocaleString("it-IT")}
                </p>
                <p className="text-[10px] text-[#555] uppercase tracking-wider mt-1">
                  mensile
                </p>
              </div>
              {[
                { label: "Data inizio", value: formatDate(client.dataInizio) },
                {
                  label: "Prossimo rinnovo",
                  value: formatDate(client.prossimoRinnovo),
                  urgent: renewalUrgent,
                },
                { label: "Responsabile", value: client.responsabile },
              ].map(({ label, value, urgent }) => (
                <div
                  key={label}
                  className="flex justify-between items-center text-xs border-t border-white/5 pt-2"
                >
                  <span className="text-[#555]">{label}</span>
                  <span
                    className={
                      urgent ? "text-orange-400 font-bold" : "text-[#888]"
                    }
                  >
                    {value || "-"}
                  </span>
                </div>
              ))}
              {client.sitoWeb && (
                <a
                  href={client.sitoWeb}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-xs text-[#555] hover:text-[#c9a96e] border-t border-white/5 pt-2 transition-colors"
                >
                  <Globe size={12} />{" "}
                  {client.sitoWeb.replace(/^https?:\/\//, "").slice(0, 30)}
                </a>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
