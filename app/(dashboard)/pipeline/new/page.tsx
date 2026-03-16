"use client";

import { useState } from "react";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Loader2 } from "lucide-react";
import { SETTORI, CANALI } from "@/lib/types";

export default function NewLeadPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    nomeAzienda: "",
    settore: "",
    territorio: "",
    sitoWeb: "",
    profiloSocial: "",
    canale: "",
    note: "",
  });

  function set(key: string, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.nomeAzienda.trim()) {
      toast.error("Nome azienda obbligatorio");
      return;
    }
    if (!form.territorio.trim()) {
      toast.error("Territorio obbligatorio");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Errore");
      }
      const lead = await res.json();
      toast.success("Lead creato con successo");
      router.push(`/pipeline/${lead.id}`);
    } catch (err: any) {
      toast.error(err.message || "Errore nella creazione");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.back()}
          className="text-[#888] hover:text-[#f5f5f5]"
        >
          <ArrowLeft size={18} />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-[#f5f5f5]">Nuovo Lead</h1>
          <p className="text-[#888] text-sm">Aggiungi un nuovo lead alla pipeline</p>
        </div>
      </div>

      <Card className="bg-[#141414] border-[#1f1f1f]">
        <CardHeader>
          <CardTitle className="text-base text-[#f5f5f5]">Informazioni Lead</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="nomeAzienda" className="text-[#f5f5f5]">
                  Nome Azienda <span className="text-red-400">*</span>
                </Label>
                <Input
                  id="nomeAzienda"
                  value={form.nomeAzienda}
                  onChange={(e) => set("nomeAzienda", e.target.value)}
                  placeholder="es. Pizzeria da Mario"
                  className="bg-[#0d0d0d] border-[#1f1f1f] text-[#f5f5f5]"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label className="text-[#f5f5f5]">Settore</Label>
                <Select value={form.settore} onValueChange={(v) => set("settore", v)}>
                  <SelectTrigger className="bg-[#0d0d0d] border-[#1f1f1f] text-[#f5f5f5]">
                    <SelectValue placeholder="Seleziona settore" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#141414] border-[#1f1f1f]">
                    {SETTORI.map((s) => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="territorio" className="text-[#f5f5f5]">
                Territorio <span className="text-red-400">*</span>
              </Label>
              <Input
                id="territorio"
                value={form.territorio}
                onChange={(e) => set("territorio", e.target.value)}
                placeholder="es. Milano, Zona Nord"
                className="bg-[#0d0d0d] border-[#1f1f1f] text-[#f5f5f5]"
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="sitoWeb" className="text-[#f5f5f5]">Sito Web</Label>
                <Input
                  id="sitoWeb"
                  type="url"
                  value={form.sitoWeb}
                  onChange={(e) => set("sitoWeb", e.target.value)}
                  placeholder="https://..."
                  className="bg-[#0d0d0d] border-[#1f1f1f] text-[#f5f5f5]"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="profiloSocial" className="text-[#f5f5f5]">Profilo Social</Label>
                <Input
                  id="profiloSocial"
                  type="url"
                  value={form.profiloSocial}
                  onChange={(e) => set("profiloSocial", e.target.value)}
                  placeholder="https://..."
                  className="bg-[#0d0d0d] border-[#1f1f1f] text-[#f5f5f5]"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-[#f5f5f5]">Canale primo contatto</Label>
              <Select value={form.canale} onValueChange={(v) => set("canale", v)}>
                <SelectTrigger className="bg-[#0d0d0d] border-[#1f1f1f] text-[#f5f5f5]">
                  <SelectValue placeholder="Seleziona canale" />
                </SelectTrigger>
                <SelectContent className="bg-[#141414] border-[#1f1f1f]">
                  {CANALI.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="note" className="text-[#f5f5f5]">Note</Label>
              <Textarea
                id="note"
                value={form.note}
                onChange={(e) => set("note", e.target.value)}
                placeholder="Note aggiuntive sul lead..."
                rows={4}
                className="bg-[#0d0d0d] border-[#1f1f1f] text-[#f5f5f5] resize-none"
              />
            </div>

            <div className="flex gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
                className="border-[#1f1f1f] text-[#888]"
              >
                Annulla
              </Button>
              <Button
                type="submit"
                disabled={loading}
                className="bg-[#c9a96e] hover:bg-[#b8945a] text-[#0a0a0a] font-medium"
              >
                {loading ? (
                  <>
                    <Loader2 size={16} className="mr-2 animate-spin" /> Creazione...
                  </>
                ) : (
                  "Crea Lead"
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
