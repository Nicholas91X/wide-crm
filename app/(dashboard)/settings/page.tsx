import { getAllowedUsers } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ExternalLink } from "lucide-react";

function RoleBadge({ role }: { role: string }) {
  const colors: Record<string, string> = {
    admin: "bg-[#c9a96e]/20 text-[#c9a96e] border-[#c9a96e]/30",
    editor: "bg-blue-900/30 text-blue-400 border-blue-800",
    viewer: "bg-gray-800 text-gray-400 border-gray-700",
  };
  return (
    <span className={`inline-flex px-2.5 py-0.5 rounded text-xs font-medium border ${colors[role] ?? colors.viewer}`}>
      {role}
    </span>
  );
}

export default function SettingsPage() {
  const users = getAllowedUsers();
  const pipelineId = process.env.NOTION_PIPELINE_DB_ID ?? "";
  const reportsId = process.env.NOTION_REPORTS_DB_ID ?? "";
  const clientsId = process.env.NOTION_CLIENTS_DB_ID ?? "";

  return (
    <div className="max-w-2xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-[#f5f5f5]">Impostazioni</h1>
        <p className="text-[#888] text-sm mt-1">Configurazione dell'applicazione</p>
      </div>

      {/* Team */}
      <Card className="bg-[#141414] border-[#1f1f1f]">
        <CardHeader>
          <CardTitle className="text-base text-[#f5f5f5]">Team</CardTitle>
        </CardHeader>
        <CardContent className="divide-y divide-[#1f1f1f]">
          {users.map((u) => (
            <div key={u.email} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
              <span className="text-sm text-[#f5f5f5]">{u.email}</span>
              <RoleBadge role={u.role} />
            </div>
          ))}
          {users.length === 0 && (
            <p className="text-[#888] text-sm py-2">Nessun utente configurato</p>
          )}
        </CardContent>
      </Card>

      {/* Calendly */}
      <Card className="bg-[#141414] border-[#1f1f1f]">
        <CardHeader>
          <CardTitle className="text-base text-[#f5f5f5]">Configurazione</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <p className="text-xs text-[#888]">CALENDLY_URL (env)</p>
            <p className="text-sm text-[#f5f5f5] bg-[#0d0d0d] border border-[#1f1f1f] rounded px-3 py-2 font-mono">
              {process.env.CALENDLY_URL ?? "Non configurato"}
            </p>
            <p className="text-xs text-[#555]">
              Modifica questa variabile in .env.local e riavvia il server.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Notion databases */}
      <Card className="bg-[#141414] border-[#1f1f1f]">
        <CardHeader>
          <CardTitle className="text-base text-[#f5f5f5]">Database Notion</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {[
            { label: "Pipeline Lead", id: pipelineId },
            { label: "Report Generati", id: reportsId },
            { label: "Clienti Attivi", id: clientsId },
          ].map(({ label, id }) => (
            <div key={label}>
              <p className="text-xs text-[#888] mb-1">{label}</p>
              <div className="flex items-center gap-2">
                <code className="text-xs text-[#f5f5f5] bg-[#0d0d0d] border border-[#1f1f1f] rounded px-2 py-1 flex-1 truncate">
                  {id || "Non configurato"}
                </code>
                {id && (
                  <a
                    href={`https://notion.so/${id.replace(/-/g, "")}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#888] hover:text-[#c9a96e] transition-colors"
                  >
                    <ExternalLink size={14} />
                  </a>
                )}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
