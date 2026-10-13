"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Lock, User, ChefHat, Users } from "lucide-react";
import { useRouter } from "next/navigation";
import { signInWithCustomToken } from "firebase/auth";
import { auth } from "@/lib/firebase";
import logger from "@/lib/logger";

interface StaffMember {
  id: string;
  name: string;
  role: string;
  avatarIcon?: string;
}

export default function LoginPage() {
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [selectedStaff, setSelectedStaff] = useState<StaffMember | null>(null);
  const [pinInput, setPinInput] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();

  useEffect(() => {
    const fetchStaff = async () => {
      try {
        const res = await fetch("/api/staff");
        if (!res.ok) throw new Error("Falha ao buscar staff da API");
        const staffData = await res.json();
        
        if (staffData.length === 0) {
          setError("Nenhum funcionário ativo. Configure no banco de dados.");
        } else {
          setStaff(staffData);
        }
      } catch (err) {
        logger.error("Falha ao carregar funcionários para login", {
          action: "FETCH_STAFF",
          component: "LoginPage",
          ...logger.fromError(err),
        });
        setError("Erro ao carregar funcionários.");
      }
    };
    
    fetchStaff();
  }, []);

  const handlePinClick = (num: string) => {
    setError("");
    setPinInput(prev => prev.length < 6 ? prev + num : prev);
  };

  const handleBackspace = () => {
    setPinInput(prev => prev.slice(0, -1));
  };

  useEffect(() => {
    if (!selectedStaff) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (/^[0-9]$/.test(e.key)) {
        handlePinClick(e.key);
      } else if (e.key === "Backspace") {
        handleBackspace();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedStaff]);

  const handleLogin = async () => {
    if (!selectedStaff) return;
    
    try {
      const res = await fetch("/api/auth/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: selectedStaff.id, pin: pinInput })
      });
      
      const data = await res.json();
      
      if (res.ok && data.success && data.token) {
        // SECURITY: Auth official no Firebase Client
        await signInWithCustomToken(auth, data.token);

        logger.info("Login realizado com sucesso", {
          action: "LOGIN",
          component: "LoginPage",
          userId: data.user.id,
          userName: data.user.name,
        });
        localStorage.setItem("admin_session", JSON.stringify(data.user));
        router.push("/admin/dashboard");
      } else {
        logger.warn("Tentativa de login falhou (PIN incorreto)", {
          action: "LOGIN_FAILED",
          component: "LoginPage",
          userId: selectedStaff.id,
        });
        setError("PIN incorreto");
        setPinInput("");
      }
    } catch (err) {
      logger.error("Erro de rede ao verificar PIN", {
        action: "LOGIN_ERROR",
        component: "LoginPage",
        userId: selectedStaff.id,
        ...logger.fromError(err)
      });
      setError("Erro ao conectar com o servidor.");
      setPinInput("");
    }
  };

  useEffect(() => {
    if (pinInput.length === 6 && selectedStaff) {
      handleLogin();
    }
  }, [pinInput, selectedStaff]);

  const renderIcon = (iconName?: string) => {
    switch (iconName) {
      case "manager": return <User size={40} className="text-dark-charcoal" />;
      case "cashier": return <User size={40} className="text-dark-charcoal" />;
      case "kitchen": return <ChefHat size={40} className="text-deep-amber" />;
      case "staff": return <Users size={40} className="text-deep-amber" />;
      default: return <User size={40} className="text-dark-charcoal" />;
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#f9f9f9] flex flex-col font-sans">
      
      {/* Header */}
      <header className="w-full pt-16 pb-2 flex justify-center shrink-0">
        <h1 className="text-5xl font-bold text-[#d48806]">Choperia 820</h1>
      </header>

      {/* Main Content */}
      <main className="flex-grow w-full flex flex-col items-center justify-start pt-8 px-4">
        
        {!selectedStaff ? (
          <div className="flex flex-col items-center w-full max-w-6xl">
            <h2 className="text-3xl font-semibold text-[#1f1f1f] mb-2">Selecione seu Perfil</h2>
            <p className="text-[#524435] mb-12">Clique no seu nome para iniciar o login</p><Link href="/admin/login" className="mb-6 underline text-sm">Entrar com e-mail e senha</Link>

            <div className="flex flex-wrap justify-center gap-6">
              {staff.map((member) => (
                <button
                  key={member.id}
                  onClick={() => setSelectedStaff(member)}
                  className="bg-[#f3f3f3] hover:bg-[#e8e8e8] transition-colors rounded-xl p-8 flex flex-col items-center justify-center w-64 h-64 border border-[#e2e2e2] shadow-sm hover:shadow-md"
                >
                  <div className="w-24 h-24 rounded-full bg-[#e2e2e2] flex items-center justify-center mb-6 overflow-hidden shadow-inner">
                    {renderIcon(member.avatarIcon)}
                  </div>
                  <h3 className="text-xl font-bold text-[#1f1f1f]">{member.name}</h3>
                  <p className="text-sm font-semibold text-[#d48806] uppercase tracking-wider mt-1">
                    {member.role}
                  </p>
                </button>
              ))}
            </div>
            {error && <p className="text-[#ba1a1a] mt-8 font-medium">{error}</p>}
          </div>
        ) : (
          /* PIN PAD MODE */
          <div className="flex flex-col items-center bg-white p-6 sm:p-8 rounded-2xl shadow-[0_4px_24px_rgba(31,31,31,0.08)] border border-[#e2e2e2] max-w-sm w-full min-w-[340px]">
            <button 
              onClick={() => { setSelectedStaff(null); setPinInput(""); setError(""); }}
              className="self-start text-sm text-[#524435] hover:text-[#d48806] font-medium mb-4 flex items-center gap-2 transition-colors"
            >
              ← Voltar
            </button>
            
            <div className="w-16 h-16 rounded-full bg-[#e8e8e8] flex items-center justify-center mb-2">
               {renderIcon(selectedStaff.avatarIcon)}
            </div>
            
            <h2 className="text-xl font-bold text-[#1f1f1f] mb-1">
              {selectedStaff.name}
            </h2>
            <p className="text-[#524435] mb-4 text-xs uppercase tracking-wider font-semibold">
              {selectedStaff.role}
            </p>

            <div className="flex gap-4 mb-6">
              {[...Array(6)].map((_, i) => (
                <div 
                  key={i} 
                  className={`w-4 h-4 rounded-full transition-all duration-200 ${
                    i < pinInput.length ? "bg-[#d48806] scale-110 shadow-sm" : "bg-[#e8e8e8]"
                  }`}
                />
              ))}
            </div>

            {error && (
              <p className="text-[#ba1a1a] text-sm font-medium mb-4 animate-pulse">
                {error}
              </p>
            )}

            <div className="grid grid-cols-3 gap-3 w-full">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
                <button
                  key={num}
                  onClick={() => handlePinClick(num.toString())}
                  className="w-full h-14 rounded-xl text-xl font-semibold text-[#1f1f1f] bg-[#f9f9f9] hover:bg-[#e8e8e8] active:bg-[#d48806] active:text-white transition-all shadow-sm border border-[#e2e2e2]"
                >
                  {num}
                </button>
              ))}
              <div className="col-start-2">
                <button
                  onClick={() => handlePinClick("0")}
                  className="w-full h-14 rounded-xl text-xl font-semibold text-[#1f1f1f] bg-[#f9f9f9] hover:bg-[#e8e8e8] active:bg-[#d48806] active:text-white transition-all shadow-sm border border-[#e2e2e2]"
                >
                  0
                </button>
              </div>
              <button
                onClick={handleBackspace}
                className="w-full h-14 rounded-xl flex items-center justify-center text-[#524435] hover:text-[#ba1a1a] bg-[#f9f9f9] hover:bg-[#ffdad6] active:scale-95 transition-all shadow-sm border border-[#e2e2e2]"
              >
                ⌫
              </button>
            </div>
          </div>
        )}

      </main>

      {/* Footer */}
      <footer className="w-full pb-8 flex items-center justify-center gap-2 text-[#524435] text-sm font-medium">
        <Lock size={16} />
        Acesso restrito a funcionários autorizados da Choperia 820.
      </footer>
    </div>
  );
}
