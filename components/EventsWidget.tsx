"use client";

import { useState } from "react";
import { format, parseISO } from "date-fns";
import { it } from "date-fns/locale";
import {
  Calendar as CalendarIcon,
  Clock,
  ChevronLeft,
  ChevronRight,
  MapPin,
  Tag,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Event {
  id: string;
  titolo: string;
  inizio: string;
  fine: string;
  membro: string;
  collaboratori?: string;
  leadId: string;
  tipo: string;
  note: string;
}

const EVENT_TYPES = [
  { value: "Meet", color: "bg-blue-500/20 text-blue-400 border-blue-500/50" },
  {
    value: "Chiamata",
    color: "bg-green-500/20 text-green-400 border-green-500/50",
  },
  {
    value: "Follow-up",
    color: "bg-purple-500/20 text-purple-400 border-purple-500/50",
  },
  {
    value: "Sopralluogo",
    color: "bg-amber-500/20 text-amber-400 border-amber-500/50",
  },
  {
    value: "Contratto",
    color: "bg-cyan-500/20 text-cyan-400 border-cyan-500/50",
  },
  { value: "Scadenza", color: "bg-red-500/20 text-red-400 border-red-500/50" },
  {
    value: "Briefing",
    color: "bg-indigo-500/20 text-indigo-400 border-indigo-500/50",
  },
  { value: "Lancio", color: "bg-pink-500/20 text-pink-400 border-pink-500/50" },
  {
    value: "Revisione",
    color: "bg-orange-500/20 text-orange-400 border-orange-500/50",
  },
  { value: "Altro", color: "bg-gray-500/20 text-gray-400 border-gray-500/50" },
];

export function EventsWidget({ events }: { events: Event[] }) {
  const [currentPage, setCurrentPage] = useState(0);
  const eventsPerPage = 4;

  const now = new Date();
  // Filter for upcoming events and sort ascending by date
  const upcomingEvents = events
    .filter((e) => new Date(e.inizio) >= now)
    .sort(
      (a, b) => new Date(a.inizio).getTime() - new Date(b.inizio).getTime(),
    );

  const totalPages = Math.ceil(upcomingEvents.length / eventsPerPage);
  const currentEvents = upcomingEvents.slice(
    currentPage * eventsPerPage,
    (currentPage + 1) * eventsPerPage,
  );

  const prevPage = () => setCurrentPage((p) => Math.max(0, p - 1));
  const nextPage = () => setCurrentPage((p) => Math.min(totalPages - 1, p + 1));

  return (
    <div className="glass-dark border border-white/5 rounded-xl p-5 flex flex-col h-full">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-bold text-[#f5f5f5] flex items-center gap-2">
          <CalendarIcon size={16} className="text-[#c9a96e]" />
          Prossimi Eventi
        </h2>
        {totalPages > 1 && (
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={prevPage}
              disabled={currentPage === 0}
              className="h-6 w-6 text-[#ccc] disabled:opacity-30"
            >
              <ChevronLeft size={16} />
            </Button>
            <span className="text-[10px] text-[#888]">
              {currentPage + 1} / {totalPages}
            </span>
            <Button
              variant="ghost"
              size="icon"
              onClick={nextPage}
              disabled={currentPage >= totalPages - 1}
              className="h-6 w-6 text-[#ccc] disabled:opacity-30"
            >
              <ChevronRight size={16} />
            </Button>
          </div>
        )}
      </div>

      <div className="flex-1 space-y-3">
        {upcomingEvents.length === 0 ? (
          <div className="h-full flex items-center justify-center py-6">
            <p className="text-[#999] text-xs text-center">
              Nessun evento in programma
            </p>
          </div>
        ) : (
          currentEvents.map((event) => {
            const typeInfo =
              EVENT_TYPES.find((t) => t.value === event.tipo) || EVENT_TYPES[9];
            return (
              <div
                key={event.id}
                className="group p-3 rounded-lg border border-white/5 bg-white/5 hover:bg-white/10 transition-colors"
              >
                <div className="flex justify-between items-start mb-1">
                  <h4 className="text-xs font-semibold text-[#f5f5f5] line-clamp-1 group-hover:text-[#c9a96e] transition-colors">
                    {event.titolo}
                  </h4>
                  <span
                    className={cn(
                      "text-[9px] px-2 py-0.5 rounded border flex-shrink-0",
                      typeInfo.color,
                    )}
                  >
                    {event.tipo}
                  </span>
                </div>
                <div className="flex items-center justify-between mt-2">
                  <div className="flex items-center gap-1.5 text-[10px] text-[#ccc]">
                    <Clock size={12} className="text-[#888]" />
                    {format(parseISO(event.inizio), "d MMM, HH:mm", {
                      locale: it,
                    })}
                  </div>
                  <div className="flex items-center gap-1.5 text-[10px] text-[#aaa]">
                    <MapPin size={12} className="text-[#888]" />
                    {/* Placeholder user name/email to visualize ownership directly on widget */}
                    {event.membro.split("@")[0]}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
