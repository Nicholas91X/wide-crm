"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { useState } from "react";
import {
  LayoutDashboard,
  GitBranch,
  FileText,
  Users,
  Settings,
  LogOut,
  Menu,
  X,
  ChevronRight,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/pipeline", label: "Pipeline", icon: GitBranch },
  { href: "/reports", label: "Report", icon: FileText },
  { href: "/clients", label: "Clienti", icon: Users },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [mobileOpen, setMobileOpen] = useState(false);
  const role = (session?.user as any)?.role;

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="px-6 py-6 border-b border-[#1f1f1f]">
        <span className="text-2xl font-bold tracking-widest text-[#c9a96e]">WIDE</span>
        <span className="text-xs text-[#888] ml-1 tracking-wider">CRM</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              onClick={() => setMobileOpen(false)}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors",
                active
                  ? "bg-[#c9a96e]/10 text-[#c9a96e]"
                  : "text-[#888] hover:text-[#f5f5f5] hover:bg-[#141414]"
              )}
            >
              <Icon size={18} />
              {label}
              {active && <ChevronRight size={14} className="ml-auto" />}
            </Link>
          );
        })}

        {role === "admin" && (
          <Link
            href="/settings"
            onClick={() => setMobileOpen(false)}
            className={cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors",
              pathname.startsWith("/settings")
                ? "bg-[#c9a96e]/10 text-[#c9a96e]"
                : "text-[#888] hover:text-[#f5f5f5] hover:bg-[#141414]"
            )}
          >
            <Settings size={18} />
            Impostazioni
            {pathname.startsWith("/settings") && <ChevronRight size={14} className="ml-auto" />}
          </Link>
        )}
      </nav>

      {/* User */}
      <div className="px-3 py-4 border-t border-[#1f1f1f]">
        <div className="flex items-center gap-3 px-3 py-2 rounded-md">
          <Avatar className="h-8 w-8">
            <AvatarImage src={session?.user?.image ?? ""} />
            <AvatarFallback className="bg-[#1f1f1f] text-[#c9a96e] text-xs">
              {session?.user?.name?.[0]?.toUpperCase() ?? "U"}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-[#f5f5f5] truncate">
              {session?.user?.name ?? "Utente"}
            </p>
            <p className="text-[10px] text-[#888] capitalize">{role ?? "viewer"}</p>
          </div>
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="text-[#888] hover:text-[#f5f5f5] transition-colors p-1"
            title="Logout"
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden md:flex flex-col w-56 bg-[#0d0d0d] border-r border-[#1f1f1f] h-screen sticky top-0">
        <SidebarContent />
      </aside>

      {/* Mobile toggle */}
      <div className="md:hidden fixed top-4 left-4 z-50">
        <Button
          variant="ghost"
          size="icon"
          className="bg-[#141414] border border-[#1f1f1f]"
          onClick={() => setMobileOpen(!mobileOpen)}
        >
          {mobileOpen ? <X size={18} /> : <Menu size={18} />}
        </Button>
      </div>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="md:hidden fixed inset-0 z-40 bg-black/60"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile drawer */}
      <aside
        className={cn(
          "md:hidden fixed left-0 top-0 z-50 h-screen w-56 bg-[#0d0d0d] border-r border-[#1f1f1f] transition-transform duration-200",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <SidebarContent />
      </aside>
    </>
  );
}
