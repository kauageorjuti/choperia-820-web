import { Sidebar } from "@/components/Sidebar";
import { Header } from "@/components/Header";
import { DashboardAuthGuard } from "@/components/DashboardAuthGuard";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <DashboardAuthGuard>
      <div className="flex h-screen w-full bg-[#f9f9f9] overflow-hidden font-sans">
        <Sidebar />
        <div className="flex min-w-0 flex-1 flex-col h-full overflow-hidden">
          <Header />
          <main className="min-w-0 flex-1 overflow-y-auto bg-[#f9f9f9] p-4 pb-24 sm:p-6 sm:pb-24 lg:p-8 lg:pb-8">
            {children}
          </main>
        </div>
      </div>
    </DashboardAuthGuard>
  );
}
