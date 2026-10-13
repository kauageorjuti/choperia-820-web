"use client";

import { useEffect, useState } from "react";
import { collection, query, onSnapshot, addDoc, updateDoc, deleteDoc, doc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Users, Plus, Trash2, Edit2, KeyRound } from "lucide-react";
import logger from "@/lib/logger";

interface StaffMember {
  id: string;
  name: string;
  role: string;
  pinCode: string;
  isActive: boolean;
  avatarIcon: string;
}

export default function FuncionariosPage() {
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    name: "",
    role: "Caixa",
    pinCode: "",
    isActive: true,
    avatarIcon: "cashier"
  });

  useEffect(() => {
    const q = query(collection(db, "staff"));
    const unsub = onSnapshot(
      q,
      (snap) => {
        const staffData = snap.docs.map(d => ({ id: d.id, ...d.data() })) as StaffMember[];
        // Auto-seed if completely empty
        if (staffData.length === 0) {
          const defaultStaff = [
            { name: "João", role: "Gerente", pinCode: "123456", avatarIcon: "manager", isActive: true },
            { name: "Maria", role: "Caixa", pinCode: "111111", avatarIcon: "cashier", isActive: true },
            { name: "Cozinha", role: "Operacional", pinCode: "222222", avatarIcon: "kitchen", isActive: true },
            { name: "Equipe Geral", role: "Padrão", pinCode: "333333", avatarIcon: "staff", isActive: true }
          ];
          logger.warn("Staff vazio — executando seed inicial", { action: "SEED_STAFF", component: "FuncionariosPage", count: defaultStaff.length });
          // Usa Promise.all para aguardar todos os addDoc corretamente
          Promise.all(defaultStaff.map(s => addDoc(collection(db, "staff"), s)))
            .catch((err) => logger.error("Falha no seed de staff", { action: "SEED_STAFF", component: "FuncionariosPage", ...logger.fromError(err) }));
        } else {
          setStaff(staffData);
          setIsLoading(false);
        }
      },
      (error) => {
        logger.error("Falha no listener de funcionários", {
          action: "STAFF_SNAPSHOT",
          component: "FuncionariosPage",
          ...logger.fromError(error),
        });
        setIsLoading(false);
      }
    );
    return () => unsub();
  }, []);

  const handleOpenModal = (member?: StaffMember) => {
    if (member) {
      setEditingId(member.id);
      setFormData({
        name: member.name,
        role: member.role,
        pinCode: member.pinCode,
        isActive: member.isActive ?? true,
        avatarIcon: member.avatarIcon || "staff"
      });
    } else {
      setEditingId(null);
      setFormData({
        name: "",
        role: "Caixa",
        pinCode: "",
        isActive: true,
        avatarIcon: "cashier"
      });
    }
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (!formData.name || !formData.pinCode || formData.pinCode.length < 4) {
      alert("Preencha o nome e um PIN de no mínimo 4 dígitos.");
      return;
    }
    try {
      if (editingId) {
        await updateDoc(doc(db, "staff", editingId), formData);
        logger.info("Funcionário atualizado", {
          action: "UPDATE_STAFF",
          component: "FuncionariosPage",
          resourceId: editingId,
          staffName: formData.name,
          staffRole: formData.role,
          // pinCode é automaticamente mascarado pelo logger
        });
      } else {
        const ref = await addDoc(collection(db, "staff"), formData);
        logger.info("Funcionário criado", {
          action: "CREATE_STAFF",
          component: "FuncionariosPage",
          resourceId: ref.id,
          staffName: formData.name,
          staffRole: formData.role,
        });
      }
      setIsModalOpen(false);
    } catch (e) {
      logger.error("Falha ao salvar funcionário", {
        action: editingId ? "UPDATE_STAFF" : "CREATE_STAFF",
        component: "FuncionariosPage",
        resourceId: editingId ?? undefined,
        staffName: formData.name,
        ...logger.fromError(e),
      });
      alert("Erro ao salvar funcionário.");
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm("Tem certeza que deseja excluir este funcionário?")) {
      try {
        await deleteDoc(doc(db, "staff", id));
        logger.info("Funcionário excluído", {
          action: "DELETE_STAFF",
          component: "FuncionariosPage",
          resourceId: id,
        });
      } catch (e) {
        logger.error("Falha ao excluir funcionário", {
          action: "DELETE_STAFF",
          component: "FuncionariosPage",
          resourceId: id,
          ...logger.fromError(e),
        });
        alert("Erro ao excluir funcionário. Tente novamente.");
      }
    }
  };

  const toggleActive = async (member: StaffMember) => {
    try {
      await updateDoc(doc(db, "staff", member.id), { isActive: !member.isActive });
      logger.info("Status do funcionário alterado", {
        action: "TOGGLE_STAFF_ACTIVE",
        component: "FuncionariosPage",
        resourceId: member.id,
        staffName: member.name,
        newStatus: !member.isActive,
      });
    } catch (e) {
      logger.error("Falha ao alterar status do funcionário", {
        action: "TOGGLE_STAFF_ACTIVE",
        component: "FuncionariosPage",
        resourceId: member.id,
        ...logger.fromError(e),
      });
      alert("Erro ao alterar status. Tente novamente.");
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-8 h-8 border-4 border-[#d48806] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 pb-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-[#1f1f1f]">Equipe e Acessos</h1>
          <p className="text-[#524435] mt-1">
            Gerencie os funcionários que têm acesso ao painel.
          </p>
        </div>
        <button 
          onClick={() => handleOpenModal()}
          className="flex items-center gap-2 bg-[#d48806] hover:bg-[#b87300] text-white px-5 py-2.5 rounded-xl font-bold transition-colors"
        >
          <Plus size={20} />
          Novo Funcionário
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {staff.map(member => (
          <div key={member.id} className={`bg-white rounded-2xl border ${member.isActive ? 'border-[#e2e2e2]' : 'border-red-200 opacity-70'} shadow-sm p-6 relative flex flex-col`}>
            <div className="flex items-start justify-between mb-4">
              <div className="w-14 h-14 rounded-full bg-[#f0f0f0] flex items-center justify-center text-[#524435]">
                <Users size={28} />
              </div>
              <div className="flex gap-2">
                <button onClick={() => handleOpenModal(member)} className="p-2 text-[#a0a0a0] hover:text-[#d48806] transition-colors">
                  <Edit2 size={18} />
                </button>
                <button onClick={() => handleDelete(member.id)} className="p-2 text-[#a0a0a0] hover:text-[#ba1a1a] transition-colors">
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
            
            <h3 className="text-xl font-bold text-[#1f1f1f]">{member.name}</h3>
            <p className="text-sm font-semibold text-[#d48806] uppercase tracking-wider mb-4">{member.role}</p>

            <div className="mt-auto pt-4 border-t border-[#f0f0f0] flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm text-[#524435] font-mono bg-[#f9f9f9] px-3 py-1 rounded-lg">
                <KeyRound size={14} /> {member.pinCode.replace(/./g, '•')}
              </div>
              
              <button 
                onClick={() => toggleActive(member)}
                className={`text-xs font-bold px-3 py-1.5 rounded-full transition-colors ${member.isActive ? 'bg-[#dcfce7] text-[#166534] hover:bg-green-200' : 'bg-[#ffebee] text-[#c62828] hover:bg-red-200'}`}
              >
                {member.isActive ? 'Ativo' : 'Inativo'}
              </button>
            </div>
          </div>
        ))}

        {staff.length === 0 && (
          <div className="col-span-full p-12 flex flex-col items-center justify-center bg-white border border-[#e2e2e2] border-dashed rounded-2xl text-[#a0a0a0]">
            <Users size={48} className="mb-4 opacity-20" />
            <p>Nenhum funcionário cadastrado.</p>
          </div>
        )}
      </div>

      {/* Modal Form */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 print:hidden">
          <div className="bg-white rounded-2xl w-[90%] sm:w-[450px] shadow-2xl overflow-hidden flex flex-col">
            <div className="p-6 border-b border-[#f0f0f0]">
              <h2 className="text-xl font-bold text-[#1f1f1f]">
                {editingId ? "Editar Funcionário" : "Novo Funcionário"}
              </h2>
            </div>
            
            <div className="p-6 flex flex-col gap-4">
              <div>
                <label className="block text-sm font-bold text-[#524435] mb-1">Nome Completo</label>
                <input 
                  type="text" 
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                  className="w-full px-4 py-2 bg-white border border-[#e2e2e2] rounded-xl outline-none focus:border-[#d48806]"
                  placeholder="Ex: Carlos Silva"
                />
              </div>
              
              <div>
                <label className="block text-sm font-bold text-[#524435] mb-1">Cargo / Função</label>
                <select 
                  value={formData.role}
                  onChange={e => setFormData({...formData, role: e.target.value})}
                  className="w-full px-4 py-2 bg-white border border-[#e2e2e2] rounded-xl outline-none focus:border-[#d48806]"
                >
                  <option value="Gerente">Gerente (Acesso Total)</option>
                  <option value="Caixa">Caixa (Operação Diária)</option>
                  <option value="Cozinha">Cozinha (Apenas Visualização)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-bold text-[#524435] mb-1">PIN de Acesso (Senha Numérica)</label>
                <input 
                  type="text" 
                  maxLength={6}
                  value={formData.pinCode}
                  onChange={e => setFormData({...formData, pinCode: e.target.value.replace(/\D/g, '')})}
                  className="w-full px-4 py-2 bg-white border border-[#e2e2e2] rounded-xl outline-none focus:border-[#d48806]"
                  placeholder="Ex: 123456"
                />
                <p className="text-xs text-[#a0a0a0] mt-1">O funcionário usará este código para entrar no painel.</p>
              </div>
              
              <div className="flex items-center gap-3 mt-2">
                <label className="text-sm font-bold text-[#524435]">Ícone do Avatar:</label>
                <select 
                  value={formData.avatarIcon}
                  onChange={e => setFormData({...formData, avatarIcon: e.target.value})}
                  className="px-3 py-1 bg-white border border-[#e2e2e2] rounded-lg text-sm outline-none focus:border-[#d48806]"
                >
                  <option value="manager">Gerente</option>
                  <option value="cashier">Caixa</option>
                  <option value="kitchen">Cozinha</option>
                  <option value="staff">Equipe</option>
                </select>
              </div>
            </div>

            <div className="p-6 border-t border-[#f0f0f0] flex justify-end gap-3 bg-[#f9f9f9]">
              <button 
                onClick={() => setIsModalOpen(false)}
                className="px-5 py-2 rounded-xl text-[#524435] font-bold hover:bg-[#e2e2e2] transition-colors"
              >
                Cancelar
              </button>
              <button 
                onClick={handleSave}
                className="px-5 py-2 rounded-xl bg-[#d48806] text-white font-bold hover:bg-[#b87300] transition-colors"
              >
                Salvar Funcionário
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
