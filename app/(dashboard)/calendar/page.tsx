"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Calendar as CalendarIcon,
  Clock,
  User,
  Tag,
  MoreVertical,
  X,
} from "lucide-react";
import {
  format,
  addMonths,
  subMonths,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  isSameMonth,
  isSameDay,
  addDays,
  parseISO,
  isToday,
} from "date-fns";
import { it } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Event {
  id: string;
  titolo: string;
  inizio: string;
  fine: string;
  membro: string;
  leadId: string;
  tipo: string;
  note: string;
}

const EVENT_TYPES = [
  { value: "Meet", color: "bg-blue-500/20 text-blue-400 border-blue-500/50" },
  {
    value: "Call",
    color: "bg-green-500/20 text-green-400 border-green-500/50",
  },
  {
    value: "Follow-up",
    color: "bg-purple-500/20 text-purple-400 border-purple-500/50",
  },
  { value: "Altro", color: "bg-gray-500/20 text-gray-400 border-gray-500/50" },
];

export default function CalendarPage() {
  const { data: session } = useSession();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const [formData, setFormData] = useState({
    titolo: "",
    inizio: "",
    fine: "",
    tipo: "Meet",
    membro: "",
    note: "",
    leadId: "",
  });

  const role = (session?.user as any)?.role;
  const userEmail = session?.user?.email ?? "";

  useEffect(() => {
    fetchEvents();
  }, []);

  async function fetchEvents() {
    try {
      setLoading(true);
      const res = await fetch("/api/events");
      if (!res.ok) throw new Error("Errore nel caricamento eventi");
      const data = await res.json();
      setEvents(data);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }

  // L'API filtra già gli eventi in base al ruolo, ma facciamo un controllo di sicurezza anche qui
  const visibleEvents = events;

  const handlePrevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
  const handleNextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));

  const onDateClick = (day: Date) => {
    setFormData({
      titolo: "",
      inizio: format(day, "yyyy-MM-dd'T'HH:mm"),
      fine: format(day, "yyyy-MM-dd'T'HH:mm"),
      tipo: "Meet",
      membro: userEmail,
      note: "",
      leadId: "",
    });
    setSelectedEvent(null);
    setIsDialogOpen(true);
  };

  const onEventClick = (e: Event) => {
    setSelectedEvent(e);
    setFormData({
      titolo: e.titolo,
      inizio: e.inizio ? format(parseISO(e.inizio), "yyyy-MM-dd'T'HH:mm") : "",
      fine: e.fine ? format(parseISO(e.fine), "yyyy-MM-dd'T'HH:mm") : "",
      tipo: e.tipo,
      membro: e.membro,
      note: e.note,
      leadId: e.leadId,
    });
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.titolo || !formData.inizio) {
      toast.error("Titolo e data inizio sono obbligatori");
      return;
    }

    try {
      const url = selectedEvent
        ? `/api/events/${selectedEvent.id}`
        : "/api/events";
      const method = selectedEvent ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!res.ok) throw new Error("Errore durante il salvataggio");

      toast.success(selectedEvent ? "Evento aggiornato" : "Evento creato");
      setIsDialogOpen(false);
      fetchEvents();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleDelete = async () => {
    if (!selectedEvent) return;
    try {
      setIsDeleting(true);
      const res = await fetch(`/api/events/${selectedEvent.id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Errore durante l'eliminazione");

      toast.success("Evento eliminato");
      setIsDialogOpen(false);
      fetchEvents();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsDeleting(false);
    }
  };

  const renderHeader = () => {
    return (
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-[#f5f5f5] capitalize">
            {format(currentMonth, "MMMM yyyy", { locale: it })}
          </h1>
          <p className="text-[#888] text-sm mt-1">
            Gestisci i tuoi appuntamenti e follow-up
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center bg-[#141414] rounded-lg border border-white/5 p-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={handlePrevMonth}
              className="h-8 w-8 text-[#888]"
            >
              <ChevronLeft size={18} />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setCurrentMonth(new Date())}
              className="text-xs px-3 text-[#f5f5f5]"
            >
              Oggi
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleNextMonth}
              className="h-8 w-8 text-[#888]"
            >
              <ChevronRight size={18} />
            </Button>
          </div>
          <Button
            onClick={() => onDateClick(new Date())}
            className="bg-[#c9a96e] hover:bg-[#b3915a] text-black gap-2"
          >
            <Plus size={18} />
            Nuovo Evento
          </Button>
        </div>
      </div>
    );
  };

  const renderDays = () => {
    const days = ["Dom", "Lun", "Mar", "Mer", "Gio", "Ven", "Sab"];
    return (
      <div className="grid grid-cols-7 mb-2">
        {days.map((d) => (
          <div
            key={d}
            className="text-center text-[10px] font-bold uppercase tracking-wider text-[#666] py-2"
          >
            {d}
          </div>
        ))}
      </div>
    );
  };

  const renderCells = () => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart);
    const endDate = endOfWeek(monthEnd);

    const rows = [];
    let days = [];
    let day = startDate;
    let formattedDate = "";

    while (day <= endDate) {
      for (let i = 0; i < 7; i++) {
        formattedDate = format(day, "d");
        const cloneDay = day;
        const dayEvents = visibleEvents.filter((e) =>
          isSameDay(parseISO(e.inizio), cloneDay),
        );

        days.push(
          <div
            key={day.toString()}
            className={cn(
              "min-h-[120px] border border-white/5 p-2 transition-colors relative flex flex-col group",
              !isSameMonth(day, monthStart)
                ? "bg-[#0a0a0a]/50 opacity-30"
                : "bg-[#141414]/30 hover:bg-[#1f1f1f]/50",
              isToday(day) &&
                "bg-[#c9a96e]/5 ring-1 ring-inset ring-[#c9a96e]/20",
            )}
            onClick={() => onDateClick(cloneDay)}
          >
            <div className="flex justify-between items-start mb-2">
              <span
                className={cn(
                  "text-xs font-medium w-6 h-6 flex items-center justify-center rounded-full transition-colors",
                  isToday(day) ? "bg-[#c9a96e] text-black" : "text-[#888]",
                )}
              >
                {formattedDate}
              </span>
              <button className="opacity-0 group-hover:opacity-100 p-1 text-[#666] hover:text-[#f5f5f5] transition-opacity">
                <Plus size={14} />
              </button>
            </div>

            <div className="flex-1 space-y-1 overflow-y-auto custom-scrollbar">
              {dayEvents.map((event) => {
                const typeInfo =
                  EVENT_TYPES.find((t) => t.value === event.tipo) ||
                  EVENT_TYPES[3];
                return (
                  <div
                    key={event.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      onEventClick(event);
                    }}
                    className={cn(
                      "px-2 py-1 rounded text-[10px] truncate border cursor-pointer transition-transform hover:scale-[1.02]",
                      typeInfo.color,
                      event.membro !== userEmail &&
                        role !== "admin" &&
                        "opacity-60 border-dashed",
                    )}
                  >
                    {event.titolo}{" "}
                    {event.membro !== userEmail &&
                      `(${event.membro.split("@")[0]})`}
                  </div>
                );
              })}
            </div>
          </div>,
        );
        day = addDays(day, 1);
      }
      rows.push(
        <div className="grid grid-cols-7" key={day.toString()}>
          {days}
        </div>,
      );
      days = [];
    }
    return (
      <div className="border border-white/5 rounded-xl overflow-hidden shadow-2xl">
        {rows}
      </div>
    );
  };

  return (
    <div className="p-8 max-w-[1400px] mx-auto animate-in fade-in duration-500">
      {renderHeader()}

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-8">
        <div className="xl:col-span-3">
          {renderDays()}
          {loading ? (
            <div className="min-h-[600px] flex items-center justify-center border border-white/5 rounded-xl bg-[#141414]/20">
              <div className="flex flex-col items-center gap-4">
                <div className="h-8 w-8 border-2 border-[#c9a96e] border-t-transparent rounded-full animate-spin" />
                <p className="text-[#888] text-sm">Caricamento calendario...</p>
              </div>
            </div>
          ) : (
            renderCells()
          )}
        </div>

        <div className="space-y-6">
          <Card className="bg-[#141414]/40 border-white/5 backdrop-blur-sm">
            <CardHeader className="pb-3 border-b border-white/5">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Clock size={16} className="text-[#c9a96e]" />
                Prossimi Eventi
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 px-3">
              <div className="space-y-4">
                {visibleEvents
                  .filter((e) => new Date(e.inizio) >= new Date())
                  .slice(0, 5)
                  .map((e) => {
                    const typeInfo =
                      EVENT_TYPES.find((t) => t.value === e.tipo) ||
                      EVENT_TYPES[3];
                    return (
                      <div
                        key={e.id}
                        className="group p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors cursor-pointer"
                        onClick={() => onEventClick(e)}
                      >
                        <div className="flex justify-between items-start mb-1">
                          <h4 className="text-xs font-semibold text-[#f5f5f5] line-clamp-1 group-hover:text-[#c9a96e] transition-colors">
                            {e.titolo}
                          </h4>
                          <Badge
                            variant="outline"
                            className={cn(
                              "text-[9px] h-4 py-0",
                              typeInfo.color,
                            )}
                          >
                            {e.tipo}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2 text-[10px] text-[#888]">
                          <CalendarIcon size={10} />
                          {format(parseISO(e.inizio), "d MMM, HH:mm", {
                            locale: it,
                          })}
                        </div>
                      </div>
                    );
                  })}
                {visibleEvents.length === 0 && (
                  <div className="text-center py-8">
                    <p className="text-xs text-[#666]">
                      Nessun evento in programma
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-[#141414]/40 border-white/5 backdrop-blur-sm">
            <CardHeader className="pb-3 border-b border-white/5">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Tag size={16} className="text-[#c9a96e]" />
                Legenda
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 flex flex-wrap gap-2">
              {EVENT_TYPES.map((type) => (
                <Badge
                  key={type.value}
                  variant="outline"
                  className={cn("text-[10px] py-1 px-3", type.color)}
                >
                  {type.value}
                </Badge>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="bg-[#0f0f0f] border-white/10 text-[#f5f5f5] max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              {selectedEvent ? "Modifica Evento" : "Nuovo Evento"}
            </DialogTitle>
            <DialogDescription className="text-[#888]">
              {selectedEvent
                ? "Modifica i dettagli dell'appuntamento esistente."
                : "Aggiungi un nuovo appuntamento al tuo calendario."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="titolo" className="text-xs text-[#888]">
                Titolo
              </Label>
              <Input
                id="titolo"
                value={formData.titolo}
                onChange={(e) =>
                  setFormData({ ...formData, titolo: e.target.value })
                }
                className="bg-white/5 border-white/10 focus:border-[#c9a96e]/50"
                placeholder="Es: Meeting con Rossi"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="inizio" className="text-xs text-[#888]">
                  Inizio
                </Label>
                <div className="relative">
                  <Input
                    id="inizio"
                    type="datetime-local"
                    value={formData.inizio}
                    onChange={(e) =>
                      setFormData({ ...formData, inizio: e.target.value })
                    }
                    className="bg-white/5 border-white/10 focus:border-[#c9a96e]/50 pl-9"
                  />
                  <Clock
                    className="absolute left-3 top-2.5 text-[#666]"
                    size={14}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="fine" className="text-xs text-[#888]">
                  Fine (Opzionale)
                </Label>
                <div className="relative">
                  <Input
                    id="fine"
                    type="datetime-local"
                    value={formData.fine}
                    onChange={(e) =>
                      setFormData({ ...formData, fine: e.target.value })
                    }
                    className="bg-white/5 border-white/10 focus:border-[#c9a96e]/50 pl-9"
                  />
                  <Clock
                    className="absolute left-3 top-2.5 text-[#666]"
                    size={14}
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="tipo" className="text-xs text-[#888]">
                  Tipo
                </Label>
                <Select
                  value={formData.tipo}
                  onValueChange={(val) =>
                    setFormData({ ...formData, tipo: val })
                  }
                >
                  <SelectTrigger className="bg-white/5 border-white/10">
                    <SelectValue placeholder="Seleziona tipo" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1a1a1a] border-white/10 text-white">
                    {EVENT_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        {t.value}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="membro" className="text-xs text-[#888]">
                  Assegnato a
                </Label>
                <div className="relative">
                  <Input
                    id="membro"
                    value={formData.membro}
                    readOnly={role !== "admin"}
                    onChange={(e) =>
                      setFormData({ ...formData, membro: e.target.value })
                    }
                    className="bg-white/5 border-white/10 focus:border-[#c9a96e]/50 pl-9 opacity-70"
                  />
                  <User
                    className="absolute left-3 top-2.5 text-[#666]"
                    size={14}
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="note" className="text-xs text-[#888]">
                Note
              </Label>
              <Textarea
                id="note"
                value={formData.note}
                onChange={(e) =>
                  setFormData({ ...formData, note: e.target.value })
                }
                className="bg-white/5 border-white/10 focus:border-[#c9a96e]/50 min-h-[80px]"
                placeholder="Dettagli dell'incontro..."
              />
            </div>
          </div>

          <DialogFooter className="flex items-center justify-between sm:justify-between w-full mt-4">
            {selectedEvent &&
            (role === "admin" || selectedEvent.membro === userEmail) ? (
              <Button
                variant="destructive"
                onClick={handleDelete}
                disabled={isDeleting}
                className="bg-red-500/10 text-red-500 hover:bg-red-500/20 border-red-500/20"
              >
                Elimina
              </Button>
            ) : (
              <div />
            )}
            <div className="flex gap-3">
              <Button
                variant="ghost"
                onClick={() => setIsDialogOpen(false)}
                className="text-[#888] hover:text-[#f5f5f5]"
              >
                Annulla
              </Button>
              {(!selectedEvent ||
                role === "admin" ||
                selectedEvent?.membro === userEmail) && (
                <Button
                  onClick={handleSave}
                  className="bg-[#c9a96e] hover:bg-[#b3915a] text-black"
                >
                  Salva
                </Button>
              )}
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
