"use client";

import { useState } from "react";


import { X, Loader2 } from "lucide-react";
import logger from "@/lib/logger";
import { adminRequest } from '@/lib/admin-api';

interface CategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentCount: number; // Para definir a ordem padrão
}

export function CategoryModal({ isOpen, onClose, currentCount }: CategoryModalProps) {
  const [name, setName] = useState("");
  const [order, setOrder] = useState((currentCount + 1).toString());
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsSubmitting(true);
    try {
      const ref = await adminRequest('/api/admin/categories', 'POST', {
        name: name.trim(),
        order: parseInt(order) || currentCount + 1,
        isActive: true
      });
      logger.info("Categoria criada", {
        action: "CREATE_CATEGORY",
        component: "CategoryModal",
        resourceId: ref.id,
        categoryName: name.trim(),
        order: parseInt(order) || currentCount + 1,
      });
      onClose();
      setName("");
      setOrder((currentCount + 2).toString());
    } catch (error) {
      logger.error("Falha ao salvar categoria", {
        action: "CREATE_CATEGORY",
        component: "CategoryModal",
        categoryName: name.trim(),
        ...logger.fromError(error),
      });
      alert("Erro ao salvar categoria.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-[90%] sm:w-[450px] shadow-2xl overflow-hidden flex flex-col">
        <div className="bg-white border-b border-[#e2e2e2] p-5 flex justify-between items-center">
          <h2 className="text-xl font-bold text-[#1f1f1f]">Nova Categoria</h2>
          <button onClick={onClose} className="p-2 text-[#a0a0a0] hover:text-[#1f1f1f] rounded-lg transition-colors">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-5">
          <div>
            <label className="block text-sm font-bold text-[#1f1f1f] mb-2">Nome da Categoria *</label>
            <input 
              type="text" 
              required
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Ex: Porções, Bebidas, Sobremesas..."
              className="w-full border border-[#e2e2e2] rounded-lg p-3 text-sm outline-none focus:border-[#d48806]"
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-[#1f1f1f] mb-2">Ordem de Exibição (Número)</label>
            <input 
              type="number" 
              value={order}
              onChange={e => setOrder(e.target.value)}
              placeholder="Ex: 1"
              className="w-full border border-[#e2e2e2] rounded-lg p-3 text-sm outline-none focus:border-[#d48806]"
            />
            <p className="text-xs text-[#a0a0a0] mt-1">Categorias com números menores aparecem primeiro no app.</p>
          </div>

          <div className="pt-4 border-t border-[#e2e2e2] flex justify-end gap-3 mt-2">
            <button 
              type="button"
              onClick={onClose}
              className="px-6 py-2.5 text-[#524435] font-bold hover:bg-[#e2e2e2] rounded-lg transition-colors"
            >
              Cancelar
            </button>
            <button 
              type="submit"
              disabled={isSubmitting || !name.trim()}
              className="flex items-center gap-2 px-6 py-2.5 bg-[#41af00] text-white font-bold rounded-lg transition-colors hover:bg-[#266d00] disabled:opacity-50"
            >
              {isSubmitting ? (
                <><Loader2 size={18} className="animate-spin" /> Salvando...</>
              ) : (
                "Salvar"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
