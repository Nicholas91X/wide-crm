import Sidebar from "@/components/layout/Sidebar";
import BottomNav from "@/components/layout/BottomNav";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen overflow-hidden bg-[#0a0a0a]">
      <Sidebar />
      <main className="flex-1 overflow-y-auto pb-16 md:pb-0">
        <div className="p-4 md:p-8 max-w-[1600px] mx-auto">{children}</div>
      </main>
      <BottomNav />
    </div>
  );
}
