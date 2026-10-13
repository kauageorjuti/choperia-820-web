"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { 
  ClipboardList, 
  BookOpen, 
  DollarSign, 
  Users, 
  Bike, 
  LogOut, 
  LayoutDashboard,
  Settings,
  UserSquare2
} from "lucide-react";

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = async () => {
    await signOut(auth);
    localStorage.removeItem("admin_session");
    router.push("/admin");
  };

  const navItems = [
    { name: "Visão Geral", path: "/admin/dashboard", icon: LayoutDashboard },
    { name: "Pedidos", path: "/admin/dashboard/pedidos", icon: ClipboardList },
{ name: "Histórico", path: "/admin/dashboard/historico", icon: ClipboardList },
    { name: "Cardápio", path: "/admin/dashboard/cardapio", icon: BookOpen },
    { name: "Clientes", path: "/admin/dashboard/clientes", icon: Users },
    { name: "Equipe", path: "/admin/dashboard/funcionarios", icon: UserSquare2 },
    { name: "Financeiro", path: "/admin/dashboard/financeiro", icon: DollarSign },
    { name: "Entregadores", path: "/admin/dashboard/entregadores", icon: Bike },
    { name: "Configurações", path: "/admin/dashboard/configuracoes", icon: Settings },
  ];
  const mobileNavItems = navItems.filter((item) => [
    "/admin/dashboard",
    "/admin/dashboard/pedidos",
    "/admin/dashboard/cardapio",
    "/admin/dashboard/financeiro",
    "/admin/dashboard/configuracoes",
  ].includes(item.path));

  return (
    <>
    <aside className="hidden md:flex w-64 bg-[#1f1f1f] text-white flex-col h-full shrink-0 border-r border-[#2a2c2c] print:hidden">
      <div className="p-6">
        <h2 className="text-3xl font-bold text-[#d48806]">Choperia 820</h2>
        <p className="text-[#a0a0a0] text-sm mt-1">Painel de Controle</p>
      </div>

      <nav className="flex-1 py-4 flex flex-col gap-1">
        {navItems.map((item) => {
          const isActive = pathname === item.path;
          return (
            <Link
              key={item.path}
              href={item.path}
              className={`flex items-center gap-4 px-6 py-3 transition-colors relative ${
                isActive ? "bg-[#2f3131] text-white" : "text-[#a0a0a0] hover:bg-[#2a2c2c] hover:text-white"
              }`}
            >
              {isActive && (
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#d48806] rounded-r-md" />
              )}
              <item.icon size={24} className={isActive ? "text-[#d48806]" : "text-[#a0a0a0]"} />
              <span className="font-semibold">{item.name}</span>
            </Link>
          );
        })}
      </nav>

      <div className="p-4">
        <button
          onClick={handleLogout}
          className="flex items-center gap-4 px-6 py-4 w-full text-left text-[#a0a0a0] hover:bg-[#ba1a1a]/10 hover:text-[#ba1a1a] transition-colors rounded-xl"
        >
          <LogOut size={24} />
          <span className="font-semibold">Sair</span>
        </button>
      </div>
    </aside>
    <nav className="fixed inset-x-0 bottom-0 z-50 grid grid-cols-5 border-t border-[#e2e2e2] bg-white px-1 pb-[max(env(safe-area-inset-bottom),0.25rem)] pt-1 shadow-[0_-8px_24px_rgba(31,31,31,0.08)] md:hidden print:hidden">
      {mobileNavItems.map((item) => {
        const isActive = pathname === item.path;
        return (
          <Link
            key={item.path}
            href={item.path}
            className={`flex min-h-14 flex-col items-center justify-center gap-1 rounded-xl text-[10px] font-bold transition-colors ${
              isActive ? "bg-[#fff8e1] text-[#855300]" : "text-[#737373]"
            }`}
          >
            <item.icon size={19} strokeWidth={isActive ? 2.5 : 2} />
            <span className="truncate">{item.name === "Visão Geral" ? "Início" : item.name}</span>
          </Link>
        );
      })}
    </nav>
    </>
  );
}
