"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  GitBranch,
  FileText,
  Users,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useSession } from "next-auth/react";

const navItems = [
  { href: "/dashboard", label: "Home", icon: LayoutDashboard },
  { href: "/pipeline", label: "Pipeline", icon: GitBranch },
  { href: "/reports", label: "Report", icon: FileText },
  { href: "/clients", label: "Clienti", icon: Users },
];

export default function BottomNav() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const role = (session?.user as any)?.role;

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 glass-dark border-t border-white/5 pb-safe">
      <div className="flex items-center justify-around h-16">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex flex-col items-center justify-center w-full h-full gap-1 transition-colors",
                active ? "text-[#c9a96e]" : "text-[#888]",
              )}
            >
              <Icon size={20} className={cn(active && "scale-110")} />
              <span className="text-[10px] font-medium">{label}</span>
            </Link>
          );
        })}
        {role === "admin" && (
          <Link
            href="/settings"
            className={cn(
              "flex flex-col items-center justify-center w-full h-full gap-1 transition-colors",
              pathname.startsWith("/settings")
                ? "text-[#c9a96e]"
                : "text-[#888]",
            )}
          >
            <Settings size={20} />
            <span className="text-[10px] font-medium">Impostazioni</span>
          </Link>
        )}
      </div>
    </nav>
  );
}
