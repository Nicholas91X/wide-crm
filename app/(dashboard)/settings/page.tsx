import { getAllowedUsers } from "@/lib/auth";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ExternalLink, Shield } from "lucide-react";
import Link from "next/link";

function RoleBadge({ role }: { role: string }) {
  const colors: Record<string, string> = {
    admin: "bg-[#c9a96e]/20 text-[#c9a96e] border-[#c9a96e]/30",
    editor: "bg-blue-900/30 text-blue-400 border-blue-800",
    viewer: "bg-gray-800 text-gray-400 border-gray-700",
  };
  return (
    <span
      className={`inline-flex px-2.5 py-0.5 rounded text-xs font-medium border ${colors[role] ?? colors.viewer}`}
    >
      {role}
    </span>
  );
}

export default async function SettingsPage() {
  const session = await getServerSession(authOptions);
  const role = (session?.user as any)?.role;
  const users = getAllowedUsers();
  const pipelineId = process.env.NOTION_PIPELINE_DB_ID ?? "";
  const reportsId = process.env.NOTION_REPORTS_DB_ID ?? "";
  const clientsId = process.env.NOTION_CLIENTS_DB_ID ?? "";

  return (
    <div className="max-w-2xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-[#f5f5f5]">Impostazioni</h1>
        <p className="text-[#888] text-sm mt-1">
          Configurazione dell'applicazione
        </p>
      </div>

      {/* Team */}
      <Card className="bg-[#141414] border-[#1f1f1f]">
        <CardHeader>
          <CardTitle className="text-base text-[#f5f5f5]">Team</CardTitle>
        </CardHeader>
        <CardContent className="divide-y divide-[#1f1f1f]">
          {users.map((u) => (
            <div
              key={u.email}
              className="flex items-center justify-between py-3 first:pt-0 last:pb-0"
            >
              <span className="text-sm text-[#f5f5f5]">{u.email}</span>
              <RoleBadge role={u.role} />
            </div>
          ))}
          {users.length === 0 && (
            <p className="text-[#888] text-sm py-2">
              Nessun utente configurato
            </p>
          )}
        </CardContent>
      </Card>

      {/* Calendly */}
      <Card className="bg-[#141414] border-[#1f1f1f]">
        <CardHeader>
          <CardTitle className="text-base text-[#f5f5f5]">
            Configurazione
          </CardTitle>
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

      {/* Audit Log — admin only */}
      {role === "admin" && (
        <Link href="/settings/logs">
          <Card className="bg-[#141414] border-[#1f1f1f] hover:border-[#c9a96e]/30 transition-colors cursor-pointer">
            <CardContent className="flex items-center gap-4 py-5">
              <div className="w-10 h-10 rounded-xl bg-[#c9a96e]/10 border border-[#c9a96e]/20 flex items-center justify-center flex-shrink-0">
                <Shield size={18} className="text-[#c9a96e]" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-[#f5f5f5]">
                  Log Attività
                </p>
                <p className="text-xs text-[#555] mt-0.5">
                  Registro di tutte le operazioni: creazioni, modifiche,
                  cancellazioni
                </p>
              </div>
              <ExternalLink size={14} className="text-[#444]" />
            </CardContent>
          </Card>
        </Link>
      )}

      {/* Supabase Status */}
      <Card className="bg-[#141414] border-[#1f1f1f]">
        <CardHeader>
          <CardTitle className="text-base text-[#f5f5f5]">
            Database Supabase
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs text-[#888]">Stato Migrazione</span>
            <span className="text-xs font-bold text-green-400 bg-green-400/10 px-2 py-0.5 rounded border border-green-400/20">
              Completata
            </span>
          </div>
          <div>
            <p className="text-xs text-[#888] mb-1">Project ID</p>
            <div className="flex items-center gap-2">
              <code className="text-xs text-[#f5f5f5] bg-[#0d0d0d] border border-[#1f1f1f] rounded px-2 py-1 flex-1 truncate">
                {process.env.NEXT_PUBLIC_SUPABASE_URL?.split("//")[1]?.split(
                  ".",
                )[0] || "gwuungagtnwzbowvlrev"}
              </code>
              <a
                href={`https://supabase.com/dashboard/project/${process.env.NEXT_PUBLIC_SUPABASE_URL?.split("//")[1]?.split(".")[0] || "gwuungagtnwzbowvlrev"}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#888] hover:text-[#c9a96e] transition-colors"
              >
                <ExternalLink size={14} />
              </a>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
