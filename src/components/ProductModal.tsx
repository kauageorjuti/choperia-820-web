"use client";

import { useState, useEffect } from "react";

import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "@/lib/firebase";
import { X, Upload, Loader2 } from "lucide-react";
import logger from "@/lib/logger";
import { adminRequest } from '@/lib/admin-api';

interface ProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  productToEdit?: any;
  categories: any[];
}

export function ProductModal({ isOpen, onClose, productToEdit, categories }: ProductModalProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [ingredients, setIngredients] = useState('');
  const [category, setCategory] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (productToEdit) {
        setName(productToEdit.name || "");
        setDescription(productToEdit.description || "");
        setPrice(productToEdit.price?.toString() || "");
        setIngredients((productToEdit.ingredients || []).join(', '));
        setCategory(productToEdit.category || (categories.length > 0 ? categories[0].name : ""));
        setImagePreview(productToEdit.image || "");
      } else {
        setName("");
        setDescription("");
        setPrice("");
        setIngredients('');
        setCategory(categories.length > 0 ? categories[0].name : "");
        setImageFile(null);
        setImagePreview("");
      }
    }
  }, [isOpen, productToEdit, categories]);

  if (!isOpen) return null;

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !price) return;
    
    setIsSubmitting(true);
    try {
      let finalImageUrl = productToEdit?.image || "";

      // Se escolheu imagem nova, fazer upload para o Firebase Storage
      if (imageFile) {
        console.log("Iniciando upload da imagem para o Firebase Storage...");
        const fileRef = ref(storage, `products/${Date.now()}_${imageFile.name}`);
        const snapshot = await uploadBytes(fileRef, imageFile);
        console.log("Upload concluído, pegando URL...");
        finalImageUrl = await getDownloadURL(snapshot.ref);
        console.log("URL da imagem:", finalImageUrl);
      }

      const productData = {
        name: name.trim(),
        description: description.trim(),
        price: parseFloat(price.replace(',', '.')),
        category: category,
        image: finalImageUrl,
        ingredients: ingredients.split(',').map(i => i.trim()).filter(Boolean),
        isActive: productToEdit?.isActive ?? true,
      };

      if (productToEdit) {
        console.log("Iniciando updateDoc no Firestore...");
        await adminRequest(`/api/admin/products/${productToEdit.id}`, 'PATCH', productData);
        console.log("updateDoc concluído com sucesso!");
        logger.info("Produto atualizado", {
          action: "UPDATE_PRODUCT",
          component: "ProductModal",
          resourceId: productToEdit.id,
          productName: productData.name,
          category: productData.category,
          price: productData.price,
        });
      } else {
        console.log("Iniciando addDoc no Firestore...");
        const ref = await adminRequest('/api/admin/products', 'POST', productData);
        console.log("addDoc concluído com sucesso!");
        logger.info("Produto criado", {
          action: "CREATE_PRODUCT",
          component: "ProductModal",
          resourceId: ref.id,
          productName: productData.name,
          category: productData.category,
          price: productData.price,
        });
      }

      onClose();
    } catch (error) {
      logger.error("Falha ao salvar produto", {
        action: productToEdit ? "UPDATE_PRODUCT" : "CREATE_PRODUCT",
        component: "ProductModal",
        resourceId: productToEdit?.id ?? undefined,
        productName: name.trim(),
        ...logger.fromError(error),
      });
      alert("Erro ao salvar produto. Verifique as regras de segurança do Firebase Storage.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-[90%] sm:w-[600px] max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col">
        <div className="sticky top-0 bg-white border-b border-[#e2e2e2] p-6 flex justify-between items-center z-10">
          <h2 className="text-xl font-bold text-[#1f1f1f]">
            {productToEdit ? "Editar Produto" : "Novo Produto"}
          </h2>
          <button onClick={onClose} className="p-2 text-[#a0a0a0] hover:text-[#1f1f1f] rounded-lg transition-colors">
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-6">
          {/* Foto */}
          <div>
            <label className="block text-sm font-bold text-[#1f1f1f] mb-2">Foto do Produto</label>
            <div className="flex items-center gap-6">
              <div className="w-32 h-32 rounded-xl border-2 border-dashed border-[#e2e2e2] flex items-center justify-center bg-[#f9f9f9] overflow-hidden relative">
                {imagePreview ? (
                  <img 
                    src={imagePreview.startsWith('http') || imagePreview.startsWith('blob') ? imagePreview : `/${imagePreview.replace(/^\//, '')}`} 
                    alt="Preview" 
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                      e.currentTarget.parentElement?.classList.add('flex', 'items-center', 'justify-center');
                      const icon = document.createElement('div');
                      icon.className = 'text-[#a0a0a0] text-xs font-bold text-center p-2';
                      icon.innerText = 'IMAGEM\nINDISPONÍVEL';
                      e.currentTarget.parentElement?.appendChild(icon);
                    }}
                  />
                ) : (
                  <Upload size={32} className="text-[#a0a0a0]" />
                )}
                <input 
                  type="file" 
                  accept="image/*" 
                  onChange={handleImageChange}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
              </div>
              <div className="flex-1 text-sm text-[#a0a0a0]">
                <p className="font-semibold text-[#1f1f1f]">Clique no quadrado para adicionar foto.</p>
                <p className="mt-1">Tamanho recomendado: 500x500px.</p>
                <p>Formatos: JPG, PNG ou WEBP.</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-bold text-[#1f1f1f] mb-2">Nome do Produto *</label>
              <input 
                type="text" 
                required
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Ex: Porção de Fritas"
                className="w-full border border-[#e2e2e2] rounded-lg p-3 text-sm outline-none focus:border-[#d48806]"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-[#1f1f1f] mb-2">Categoria *</label>
              <select 
                value={category}
                onChange={e => setCategory(e.target.value)}
                required
                className="w-full border border-[#e2e2e2] rounded-lg p-3 text-sm outline-none focus:border-[#d48806] bg-white"
              >
                {categories.length === 0 && <option value="">Sem categorias criadas</option>}
                {categories.map(cat => (
                  <option key={cat.id || cat.name} value={cat.name}>{cat.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-[#1f1f1f] mb-2">Descrição Curta</label>
            <textarea 
              value={description}
              required
              onChange={e => setDescription(e.target.value)}
              placeholder="Ex: Batata frita crocante com queijo e bacon..."
              className="w-full border border-[#e2e2e2] rounded-lg p-3 text-sm outline-none focus:border-[#d48806] min-h-[80px]"
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-[#1f1f1f] mb-2">Preço Base (R$) *</label>
            <input 
              type="number" 
              step="0.01"
              min="0.01"
              required
              value={price}
              onChange={e => setPrice(e.target.value)}
              placeholder="0.00"
              className="w-full md:w-1/3 border border-[#e2e2e2] rounded-lg p-3 text-sm outline-none focus:border-[#d48806]"
            />
          </div>

          <label className="text-sm font-bold">Ingredientes (separados por vírgula)<input className="block w-full border rounded-lg p-3 mt-2 font-normal" value={ingredients} onChange={e => setIngredients(e.target.value)} placeholder="Batata, queijo, bacon" /></label>
          <div className="pt-4 border-t border-[#e2e2e2] flex justify-end gap-3 mt-4">
            <button 
              type="button"
              onClick={onClose}
              className="px-6 py-2.5 text-[#524435] font-bold hover:bg-[#e2e2e2] rounded-lg transition-colors"
            >
              Cancelar
            </button>
            <button 
              type="submit"
              disabled={isSubmitting || !name.trim() || !price || categories.length === 0}
              className="flex items-center gap-2 px-6 py-2.5 bg-[#41af00] text-white font-bold rounded-lg transition-colors hover:bg-[#266d00] disabled:opacity-50"
            >
              {isSubmitting ? (
                <><Loader2 size={18} className="animate-spin" /> Salvando...</>
              ) : (
                "Salvar Produto"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
