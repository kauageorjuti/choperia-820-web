"use client";

import { useState, useEffect } from "react";
import { Bell, VolumeX, Save, Store, Truck, Loader2 } from "lucide-react";
import { doc, onSnapshot, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import logger from "@/lib/logger";

export default function ConfiguracoesPage() {
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Store Settings State
  const [storeOpen, setStoreOpen] = useState(true);
  const [deliveryFee, setDeliveryFee] = useState("0");
  const [isSaving, setIsSaving] = useState(false);
  const [loadingSettings, setLoadingSettings] = useState(true);

  useEffect(() => {
    // Carregar preferência salva
    const savedPref = localStorage.getItem("soundEnabled");
    if (savedPref === "false") {
      setSoundEnabled(false);
    }

    // Escutar configurações da loja no Firebase
    const unsub = onSnapshot(
      doc(db, "store_settings", "main"),
      (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          setStoreOpen(data.isOpen ?? true);
          setDeliveryFee(data.deliveryFee?.toString() ?? "0");
        }
        setLoadingSettings(false);
      },
      (error) => {
        logger.error("Falha no listener de configurações", {
          action: "SETTINGS_SNAPSHOT",
          component: "ConfiguracoesPage",
          ...logger.fromError(error),
        });
        setLoadingSettings(false);
      }
    );

    return () => unsub();
  }, []);

  const handleToggleSound = () => {
    const newVal = !soundEnabled;
    setSoundEnabled(newVal);
    localStorage.setItem("soundEnabled", newVal.toString());
  };

  const handleSaveStoreSettings = async () => {
    setIsSaving(true);
    try {
      await setDoc(doc(db, "store_settings", "main"), {
        isOpen: storeOpen,
        deliveryFee: parseFloat(deliveryFee.replace(',', '.')) || 0,
      }, { merge: true });
      logger.info("Configurações da loja salvas", {
        action: "SAVE_SETTINGS",
        component: "ConfiguracoesPage",
        isOpen: storeOpen,
        deliveryFee: parseFloat(deliveryFee.replace(',', '.')) || 0,
      });
      alert("Configurações da loja salvas com sucesso!");
    } catch (error) {
      logger.error("Falha ao salvar configurações", {
        action: "SAVE_SETTINGS",
        component: "ConfiguracoesPage",
        ...logger.fromError(error),
      });
      alert("Erro ao salvar configurações.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-8 max-w-4xl">
      <div>
        <h1 className="text-3xl font-bold text-[#1f1f1f]">Configurações</h1>
        <p className="text-[#a0a0a0] mt-2">Gerencie as preferências do painel administrativo.</p>
      </div>

      <div className="bg-white p-6 rounded-2xl border border-[#e2e2e2] shadow-sm">
        <h2 className="text-xl font-bold text-[#1f1f1f] mb-6 flex items-center gap-2">
          <Bell className="text-[#d48806]" /> 
          Notificações e Alertas
        </h2>

        <div className="flex items-center justify-between py-4 border-b border-[#f0f0f0]">
          <div>
            <h3 className="font-bold text-[#1f1f1f]">Alerta Sonoro de Novo Pedido</h3>
            <p className="text-sm text-[#a0a0a0] mt-1">
              Toca um som ("ding") toda vez que um novo pedido chega na coluna "Recebidos".
            </p>
          </div>
          <button 
            onClick={handleToggleSound}
            className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors ${
              soundEnabled ? 'bg-[#41af00]' : 'bg-[#d1d1d1]'
            }`}
          >
            <span 
              className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
                soundEnabled ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>

        {!soundEnabled && (
          <div className="mt-4 flex items-center gap-2 text-[#a0a0a0] bg-[#f9f9f9] p-3 rounded-lg text-sm border border-[#e2e2e2]">
            <VolumeX size={16} />
            <span>O painel não fará nenhum barulho ao receber pedidos. Fique de olho na tela!</span>
          </div>
        )}
      </div>

      {/* Operação da Loja */}
      <div className="bg-white p-6 rounded-2xl border border-[#e2e2e2] shadow-sm">
        <h2 className="text-xl font-bold text-[#1f1f1f] mb-6 flex items-center gap-2">
          <Store className="text-[#d48806]" /> 
          Operação da Loja
        </h2>

        {loadingSettings ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="animate-spin text-[#d48806]" size={32} />
          </div>
        ) : (
          <div className="flex flex-col gap-6">
            {/* Toggle Loja Aberta/Fechada */}
            <div className="flex items-center justify-between pb-6 border-b border-[#f0f0f0]">
              <div>
                <h3 className="font-bold text-[#1f1f1f]">Status da Loja</h3>
                <p className="text-sm text-[#a0a0a0] mt-1">
                  Se a loja estiver fechada, os clientes não poderão fazer novos pedidos no aplicativo.
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className={`text-sm font-bold ${storeOpen ? 'text-[#41af00]' : 'text-[#e53935]'}`}>
                  {storeOpen ? 'ABERTA' : 'FECHADA'}
                </span>
                <button 
                  onClick={() => setStoreOpen(!storeOpen)}
                  className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors ${
                    storeOpen ? 'bg-[#41af00]' : 'bg-[#e53935]'
                  }`}
                >
                  <span 
                    className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${
                      storeOpen ? 'translate-x-7' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            </div>

            {/* Taxa de Entrega */}
            <div className="flex items-center justify-between pb-6">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-[#f9f9f9] rounded-xl text-[#a0a0a0]">
                  <Truck size={24} />
                </div>
                <div>
                  <h3 className="font-bold text-[#1f1f1f]">Taxa de Entrega Padrão</h3>
                  <p className="text-sm text-[#a0a0a0] mt-1">
                    Valor fixo cobrado em todos os pedidos de delivery.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-[#1f1f1f]">R$</span>
                <input 
                  type="number" 
                  step="0.01"
                  value={deliveryFee}
                  onChange={(e) => setDeliveryFee(e.target.value)}
                  className="w-24 border border-[#e2e2e2] rounded-lg p-2 text-center outline-none focus:border-[#d48806] font-bold"
                />
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t border-[#f0f0f0]">
              <button 
                onClick={handleSaveStoreSettings}
                disabled={isSaving}
                className="flex items-center gap-2 bg-[#d48806] hover:bg-[#b47000] text-white font-bold px-6 py-3 rounded-xl transition-colors disabled:opacity-50"
              >
                {isSaving ? (
                  <><Loader2 size={20} className="animate-spin" /> Salvando...</>
                ) : (
                  <><Save size={20} /> Salvar Alterações</>
                )}
              </button>
            </div>
          </div>
        )}
      </div>

    </div>
  );
}
