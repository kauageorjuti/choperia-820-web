"use client";

import { useState, useEffect } from "react";
import { collection, onSnapshot, query, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Plus, Search, Edit2, Trash2, Image as ImageIcon } from "lucide-react";
import Image from "next/image";
import { ProductModal } from "@/components/ProductModal";
import { CategoryModal } from "@/components/CategoryModal";
import logger from "@/lib/logger";
import { adminRequest } from '@/lib/admin-api';

export default function CardapioPage() {
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>("Todos");
  const [searchQuery, setSearchQuery] = useState("");

  // Modais
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [productToEdit, setProductToEdit] = useState<any | null>(null);

  useEffect(() => {
    // Escutar categorias
    const qCat = query(collection(db, "categories"), orderBy("order", "asc"));
    const unsubCat = onSnapshot(
      qCat,
      (snapshot) => {
        setCategories(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      },
      (error) => {
        logger.error("Falha no listener de categorias", {
          action: "CATEGORIES_SNAPSHOT",
          component: "CardapioPage",
          ...logger.fromError(error),
        });
      }
    );

    // Escutar produtos
    const qProd = query(collection(db, "products"));
    const unsubProd = onSnapshot(
      qProd,
      (snapshot) => {
        setProducts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        setLoading(false);
      },
      (error) => {
        logger.error("Falha no listener de produtos", {
          action: "PRODUCTS_SNAPSHOT",
          component: "CardapioPage",
          ...logger.fromError(error),
        });
        setLoading(false);
      }
    );

    return () => {
      unsubCat();
      unsubProd();
    };
  }, []);

  const handleToggleActive = async (productId: string, currentStatus: boolean) => {
    try {
      await adminRequest(`/api/admin/products/${productId}`, 'PATCH', { isActive: !currentStatus });
      logger.info("Status do produto alterado", {
        action: "TOGGLE_PRODUCT_ACTIVE",
        component: "CardapioPage",
        resourceId: productId,
        newStatus: !currentStatus,
      });
    } catch (error) {
      logger.error("Falha ao alterar status do produto", {
        action: "TOGGLE_PRODUCT_ACTIVE",
        component: "CardapioPage",
        resourceId: productId,
        ...logger.fromError(error),
      });
      alert("Erro ao alterar status do produto. Tente novamente.");
    }
  };

  const handleDeleteProduct = async (productId: string) => {
    if (!window.confirm("Tem certeza que deseja excluir este produto? Esta ação não pode ser desfeita.")) return;
    try {
      await adminRequest(`/api/admin/products/${productId}`, 'DELETE');
      logger.info("Produto excluído", {
        action: "DELETE_PRODUCT",
        component: "CardapioPage",
        resourceId: productId,
      });
    } catch (error) {
      logger.error("Falha ao excluir produto", {
        action: "DELETE_PRODUCT",
        component: "CardapioPage",
        resourceId: productId,
        ...logger.fromError(error),
      });
      alert("Erro ao excluir produto. Tente novamente.");
    }
  };

  const handleDeleteCategory = async (catName: string) => {
    const cat = categories.find(c => c.name === catName);
    if (!cat) return;
    if (!window.confirm(`Deseja excluir a categoria "${catName}"? Os produtos não serão apagados, mas a categoria sumirá.`)) return;
    try {
      await adminRequest(`/api/admin/categories/${cat.id}`, 'DELETE');
      setSelectedCategory("Todos");
      logger.info("Categoria excluída", {
        action: "DELETE_CATEGORY",
        component: "CardapioPage",
        resourceId: cat.id,
        categoryName: catName,
      });
    } catch (error) {
      logger.error("Falha ao excluir categoria", {
        action: "DELETE_CATEGORY",
        component: "CardapioPage",
        resourceId: cat.id,
        categoryName: catName,
        ...logger.fromError(error),
      });
      alert("Erro ao excluir categoria. Tente novamente.");
    }
  };

  // Filtros
  const filteredProducts = products.filter(p => {
    const matchesCategory = selectedCategory === "Todos" || p.category === selectedCategory;
    const matchesSearch = p.name?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const getImageUrl = (image: string) => {
    if (!image) return null;
    if (image.startsWith('http') || image.startsWith('data:')) return image;
    if (image.startsWith('assets/')) return '/' + image;
    return image;
  };

  return (
    <div className="mx-auto flex h-full w-full max-w-[1600px] min-w-0 flex-col gap-5">
      {/* Header e Barra de Busca */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-[#1f1f1f]">Cardápio</h1>
          <p className="text-[#a0a0a0] mt-1">Gerencie os produtos, preços e disponibilidade no app.</p>
        </div>

        <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
          <button 
            onClick={() => setIsCategoryModalOpen(true)}
            className="flex items-center justify-center gap-2 bg-white border border-[#e2e2e2] text-[#1f1f1f] font-semibold px-5 py-2.5 rounded-lg shadow-sm hover:bg-[#f9f9f9] transition-colors"
          >
            <Plus size={18} />
            Nova Categoria
          </button>
          <button 
            onClick={() => { setProductToEdit(null); setIsProductModalOpen(true); }}
            className="flex items-center justify-center gap-2 bg-[#d48806] hover:bg-[#b47000] text-white font-semibold px-5 py-2.5 rounded-lg shadow-sm transition-colors"
          >
            <Plus size={18} />
            Novo Produto
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-4 md:flex-row md:items-center">
        {/* Barra de Busca e Excluir Categoria */}
        <div className="flex gap-4 w-full">
          <div className="relative flex-1 md:w-96 md:flex-none">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#a0a0a0]" size={20} />
            <input 
              type="text" 
              placeholder="Buscar produto por nome..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 rounded-xl border border-[#e2e2e2] outline-none focus:border-[#d48806] bg-white shadow-sm"
            />
          </div>
          {selectedCategory !== "Todos" && (
            <button 
              onClick={() => handleDeleteCategory(selectedCategory)}
              className="px-4 border border-[#e53935] text-[#e53935] hover:bg-[#e53935]/10 rounded-xl transition-colors font-bold flex items-center gap-2 whitespace-nowrap"
              title={`Excluir Categoria ${selectedCategory}`}
            >
              <Trash2 size={18} />
              <span className="hidden md:inline">Excluir Categoria</span>
            </button>
          )}
        </div>
      </div>

      {/* Abas de Categorias */}
      <div className="flex min-w-0 gap-2 overflow-x-auto rounded-xl border border-[#e2e2e2] bg-white p-2 shadow-sm">
        <button 
          onClick={() => setSelectedCategory("Todos")}
          className={`whitespace-nowrap px-6 py-2.5 rounded-full font-bold transition-colors ${
            selectedCategory === "Todos" 
              ? 'bg-[#1f1f1f] text-white' 
              : 'bg-white text-[#a0a0a0] border border-[#e2e2e2] hover:border-[#d48806] hover:text-[#d48806]'
          }`}
        >
          Todos os Produtos
        </button>
        {categories.map(cat => (
          <button 
            key={cat.id}
            onClick={() => setSelectedCategory(cat.name)}
            className={`whitespace-nowrap px-6 py-2.5 rounded-full font-bold transition-colors ${
              selectedCategory === cat.name 
                ? 'bg-[#1f1f1f] text-white' 
                : 'bg-white text-[#a0a0a0] border border-[#e2e2e2] hover:border-[#d48806] hover:text-[#d48806]'
            }`}
          >
            {cat.name}
          </button>
        ))}
        {/* Fallback de categorias extraídas dos produtos caso Firebase não tenha a collection categories criada */}
        {categories.length === 0 && Array.from(new Set(products.map(p => p.category))).filter(Boolean).map(catName => (
          <button 
            key={catName}
            onClick={() => setSelectedCategory(catName)}
            className={`whitespace-nowrap px-6 py-2.5 rounded-full font-bold transition-colors ${
              selectedCategory === catName 
                ? 'bg-[#1f1f1f] text-white' 
                : 'bg-white text-[#a0a0a0] border border-[#e2e2e2] hover:border-[#d48806] hover:text-[#d48806]'
            }`}
          >
            {catName}
          </button>
        ))}
      </div>

      {/* Grid de Produtos */}
      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#d48806]"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 pb-10">
          {filteredProducts.map(product => {
            const isActive = product.isActive !== false; // Default is true if undefined
            return (
              <div key={product.id} className="bg-white border border-[#e2e2e2] rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all flex flex-col">
                <div className="relative h-48 bg-[#f9f9f9] border-b border-[#e2e2e2] flex items-center justify-center overflow-hidden">
                  {product.image ? (
                    <Image 
                      src={getImageUrl(product.image)!} 
                      alt={product.name} 
                      fill 
                      sizes="(max-width: 768px) 100vw, 33vw" 
                      className="object-cover" 
                      priority 
                      unoptimized={!product.image.startsWith('http')}
                    />
                  ) : (
                    <ImageIcon size={48} className="text-[#d1d1d1]" />
                  )}
                  {/* Badge Status */}
                  <div className={`absolute top-3 left-3 px-3 py-1 rounded-full text-xs font-bold shadow-sm backdrop-blur-md ${
                    isActive ? 'bg-[#41af00]/90 text-white' : 'bg-[#e53935]/90 text-white'
                  }`}>
                    {isActive ? 'ATIVO NO APP' : 'PAUSADO'}
                  </div>
                </div>

                <div className="p-5 flex flex-col flex-1">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-bold text-lg text-[#1f1f1f] leading-tight">{product.name}</h3>
                  </div>
                  <p className="text-sm text-[#a0a0a0] line-clamp-2 mb-4 flex-1">
                    {product.description || "Sem descrição."}
                  </p>
                  
                  <div className="flex items-end justify-between mt-auto mb-5">
                    <div>
                      <span className="text-xs font-bold text-[#d48806] uppercase tracking-wider">{product.category}</span>
                      <div className="text-xl font-black text-[#1f1f1f]">
                        R$ {Number(product.price || 0).toFixed(2).replace('.', ',')}
                      </div>
                    </div>
                  </div>

                  {/* Ações */}
                  <div className="flex items-center gap-3 pt-4 border-t border-[#f0f0f0]">
                    {/* Toggle Switch */}
                    <button type="button" aria-pressed={isActive} aria-label={`${isActive ? "Desativar" : "Ativar"} ${product.name}`} onClick={() => handleToggleActive(product.id, isActive)} className="flex flex-1 items-center gap-2 rounded-lg text-left outline-none transition-colors hover:bg-[#f9f9f9] focus-visible:ring-2 focus-visible:ring-[#d48806]">
                      <div className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors ${
                        isActive ? 'bg-[#41af00]' : 'bg-[#d1d1d1]'
                      }`}>
                        <span className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
                          isActive ? 'translate-x-6' : 'translate-x-1'
                        }`} />
                      </div>
                      <span className="text-xs font-bold text-[#a0a0a0]">
                        {isActive ? 'LIGADO' : 'DESLIGADO'}
                      </span>
                    </button>

                    <button 
                      onClick={() => { setProductToEdit(product); setIsProductModalOpen(true); }}
                      className="p-2 text-[#a0a0a0] hover:text-[#d48806] hover:bg-[#d48806]/10 rounded-lg transition-colors"
                      title="Editar Produto"
                    >
                      <Edit2 size={18} />
                    </button>
                    <button 
                      onClick={() => handleDeleteProduct(product.id)}
                      className="p-2 text-[#a0a0a0] hover:text-[#e53935] hover:bg-[#e53935]/10 rounded-lg transition-colors"
                      title="Excluir Produto"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}

          {filteredProducts.length === 0 && (
            <div className="col-span-full py-20 flex flex-col items-center justify-center text-[#a0a0a0]">
              <Search size={48} className="mb-4 opacity-20" />
              <p className="text-xl font-bold text-[#1f1f1f]">Nenhum produto encontrado</p>
              <p className="mt-2">Tente buscar com outras palavras ou limpar os filtros.</p>
            </div>
          )}
        </div>
      )}

      {/* Modais */}
      <ProductModal 
        isOpen={isProductModalOpen} 
        onClose={() => { setIsProductModalOpen(false); setProductToEdit(null); }} 
        productToEdit={productToEdit}
        categories={categories}
      />

      <CategoryModal 
        isOpen={isCategoryModalOpen}
        onClose={() => setIsCategoryModalOpen(false)}
        currentCount={categories.length}
      />
      
    </div>
  );
}
