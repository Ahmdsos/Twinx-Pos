import React, { useState, useRef, useMemo } from 'react';
import { AppData, Product, LogEntry } from '../types';
import { translations, Language } from '../translations';
import { 
  Plus, 
  Edit2, 
  Trash2, 
  Search, 
  Package, 
  Save, 
  X, 
  Upload, 
  RefreshCw, 
  Settings, 
  AlertTriangle, 
  Tag,
  ChevronDown,
  Filter,
  Truck,
  Hash,
  DollarSign,
  MapPin,
  Calendar,
  AlertCircle
} from 'lucide-react';
import { imageStorage } from '../services/imageStorage';
import LocalImage from './LocalImage';
import { TwinXOps } from '../services/operations';

interface InventoryScreenProps {
  data: AppData;
  updateData: (newData: Partial<AppData>) => void;
  addLog: (log: Omit<LogEntry, 'id' | 'timestamp'>) => void;
  lang: Language;
}

const InventoryScreen: React.FC<InventoryScreenProps> = ({ data, updateData, addLog, lang }) => {
  const t = translations[lang];
  const fileInputRef = useRef<HTMLInputElement>(null);

  // View States
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [isStocktakingMode, setIsStocktakingMode] = useState(false);
  
  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form States (Upgraded for Pro + Extended Details)
  const [formData, setFormData] = useState<Omit<Product, 'id'>>({
    name: '',
    category: 'General',
    barcode: '',
    price: 0,
    costPrice: 0,
    stock: 0,
    minStock: 5,
    minStockLevel: 5,
    supplier: '',
    imagePath: '',
    isSystemGenerated: false,
    brand: '',
    aisleLocation: '',
    expiryDate: '',
  });
  
  const [previewFile, setPreviewFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // Category Management State
  const [newCategoryName, setNewCategoryName] = useState('');

  // Stocktaking Temporary States
  const [stockAdjustment, setStockAdjustment] = useState<Record<string, { actual: number; reason: string }>>({});

  const categories = useMemo(() => data.categories || [], [data.categories]);

  const filteredProducts = useMemo(() => {
    return data.products.filter(p => {
      const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          (p.barcode && p.barcode.toLowerCase().includes(searchTerm.toLowerCase())) ||
                          (p.brand && p.brand.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchesCategory = selectedCategory === 'all' || p.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [data.products, searchTerm, selectedCategory]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPreviewFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleSaveProduct = async () => {
    if (!formData.name) return;
    let finalImagePath = formData.imagePath;
    
    if (previewFile) {
      if (editingId && formData.imagePath) await imageStorage.deleteImage(formData.imagePath);
      finalImagePath = await imageStorage.saveImage(previewFile);
    }

    if (editingId) {
      const updated = data.products.map(p => p.id === editingId ? { ...formData, id: editingId, imagePath: finalImagePath } : p);
      updateData({ products: updated });
      addLog({ action: 'PRODUCT_UPDATED', category: 'inventory', details: `Updated ${formData.name}.` });
      setEditingId(null);
      setShowAddModal(false);
    } else {
      const newProduct: Product = { ...formData, id: crypto.randomUUID(), imagePath: finalImagePath };
      updateData({ products: [...data.products, newProduct] });
      addLog({ action: 'PRODUCT_ADDED', category: 'inventory', details: `Added ${formData.name}.` });
      setShowAddModal(false);
    }
    resetForm();
  };

  const resetForm = () => {
    setFormData({ 
      name: '', 
      category: 'General', 
      barcode: '', 
      price: 0, 
      costPrice: 0, 
      stock: 0, 
      minStock: 5, 
      minStockLevel: 5,
      supplier: '',
      imagePath: '', 
      isSystemGenerated: false,
      brand: '',
      aisleLocation: '',
      expiryDate: '',
    });
    setPreviewFile(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setEditingId(null);
  };

  const generateBarcode = () => {
    setFormData({ ...formData, barcode: `TX-${Math.random().toString(36).substr(2, 9).toUpperCase()}` });
  };

  const handleAddCategory = () => {
    if (!newCategoryName.trim()) return;
    updateData(TwinXOps.addCategory(data, newCategoryName.trim()));
    setNewCategoryName('');
  };

  const handleDeleteCategory = (cat: string) => {
    if (confirm(lang === 'ar' ? `هل أنت متأكد من حذف تصنيف "${cat}"؟ لن يتم حذف المنتجات المرتبطة به.` : `Delete category "${cat}"? Products won't be deleted.`)) {
      updateData(TwinXOps.deleteCategory(data, cat));
    }
  };

  const commitStockAdjustment = (productId: string) => {
    const adj = stockAdjustment[productId];
    if (!adj) return;

    try {
      const updatedData = TwinXOps.adjustStock(
        data, 
        productId, 
        adj.actual, 
        adj.reason || 'Manual Adjustment', 
        'SYSTEM_ADMIN'
      );
      updateData(updatedData);
      
      const newState = { ...stockAdjustment };
      delete newState[productId];
      setStockAdjustment(newState);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const getExpiryStatus = (dateStr?: string) => {
    if (!dateStr) return null;
    const expiry = new Date(dateStr);
    const now = new Date();
    const diffTime = expiry.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) return { label: lang === 'ar' ? 'منتهي' : 'Expired', color: 'text-red-500', icon: <AlertCircle size={12} /> };
    if (diffDays <= 30) return { label: `${diffDays} ${lang === 'ar' ? 'يوم' : 'days'}`, color: 'text-orange-500', icon: <AlertTriangle size={12} /> };
    return { label: dateStr, color: 'text-zinc-500', icon: null };
  };

  return (
    <div className="p-8 h-full flex flex-col gap-6 text-start bg-zinc-950 light:bg-zinc-50 overflow-hidden">
      <header className="flex flex-col xl:flex-row xl:items-center justify-between gap-6 shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-red-600 rounded-lg shadow-lg shadow-red-900/20">
            <Package size={24} className="text-white" />
          </div>
          <div>
            <h3 className="text-2xl font-black tracking-tighter text-zinc-100 light:text-zinc-900 uppercase leading-none">{t.inventory}</h3>
            <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-black mt-1">
              {isStocktakingMode ? (lang === 'ar' ? 'وضع جرد المخازن' : 'Stocktaking Mode') : (lang === 'ar' ? 'إدارة المستودع' : 'Warehouse Management')}
            </p>
          </div>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <Search size={18} className={`absolute ${lang === 'ar' ? 'right-3' : 'left-3'} top-1/2 -translate-y-1/2 text-zinc-500`} />
            <input
              type="text"
              placeholder={t.search}
              className="bg-zinc-900 light:bg-white border border-zinc-800 light:border-zinc-200 rounded-xl py-2.5 px-10 focus:outline-none focus:border-red-500 w-64 text-sm light:text-zinc-900"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="relative group">
            <Filter size={16} className={`absolute ${lang === 'ar' ? 'right-3' : 'left-3'} top-1/2 -translate-y-1/2 text-zinc-500`} />
            <select 
              className="appearance-none bg-zinc-900 light:bg-white border border-zinc-800 light:border-zinc-200 rounded-xl py-2.5 px-10 focus:outline-none focus:border-red-500 text-sm font-bold text-zinc-300 light:text-zinc-900 cursor-pointer min-w-[150px]"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
            >
              <option value="all">{lang === 'ar' ? 'جميع التصنيفات' : 'All Categories'}</option>
              {categories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <ChevronDown size={14} className={`absolute ${lang === 'ar' ? 'right-3' : 'left-3'} top-1/2 -translate-y-1/2 text-zinc-600 pointer-events-none`} />
          </div>

          <button onClick={() => setShowCategoryModal(true)} className="p-3 bg-zinc-900 light:bg-zinc-100 border border-zinc-800 light:border-zinc-200 rounded-xl text-zinc-400 hover:text-white transition-all shadow-lg" title="Manage Categories">
            <Settings size={18} />
          </button>

          <div className="h-8 w-[1px] bg-zinc-800 mx-2 hidden md:block"></div>

          <div className="flex bg-zinc-900 light:bg-zinc-200 border border-zinc-800 light:border-zinc-300 rounded-xl p-1">
            <button onClick={() => setIsStocktakingMode(false)} className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${!isStocktakingMode ? 'bg-red-600 text-white shadow-lg' : 'text-zinc-500 hover:text-zinc-300'}`}>{lang === 'ar' ? 'عرض' : 'View'}</button>
            <button onClick={() => setIsStocktakingMode(true)} className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${isStocktakingMode ? 'bg-orange-600 text-white shadow-lg' : 'text-zinc-500 hover:text-zinc-300'}`}>{lang === 'ar' ? 'جرد' : 'Stocktake'}</button>
          </div>

          {!isStocktakingMode && (
            <button onClick={() => { setEditingId(null); resetForm(); setShowAddModal(true); }} className="bg-red-600 hover:bg-red-700 text-white px-5 py-2.5 rounded-xl flex items-center gap-2 font-black transition-all shadow-xl shadow-red-900/20 text-sm uppercase">
              <Plus size={20} /> {t.add_product}
            </button>
          )}
        </div>
      </header>

      <div className="flex-1 bg-zinc-900/30 light:bg-white border border-zinc-800 light:border-zinc-200 rounded-[32px] overflow-hidden flex flex-col backdrop-blur-sm shadow-xl">
        <div className="overflow-x-auto scrollbar-thin">
          <table className="w-full text-start border-collapse min-w-[1100px]">
            <thead>
              <tr className="bg-black/40 light:bg-zinc-50 text-[10px] uppercase font-black tracking-widest text-zinc-500 border-b border-zinc-800 light:border-zinc-200">
                <th className="px-8 py-5 text-start">{t.product_name}</th>
                {!isStocktakingMode && <th className="px-8 py-5 text-start">{lang === 'ar' ? 'تاريخ الانتهاء' : 'Expiry'}</th>}
                {!isStocktakingMode && <th className="px-8 py-5 text-start">{t.selling_price}</th>}
                {!isStocktakingMode && <th className="px-8 py-5 text-start">{lang === 'ar' ? 'التكلفة' : 'Cost'}</th>}
                <th className="px-8 py-5 text-start">{isStocktakingMode ? (lang === 'ar' ? 'النظري' : 'Theory') : t.stock_level}</th>
                {isStocktakingMode && <th className="px-8 py-5 text-start">{lang === 'ar' ? 'الفعلي' : 'Actual'}</th>}
                {isStocktakingMode && <th className="px-8 py-5 text-start">{lang === 'ar' ? 'السبب' : 'Reason'}</th>}
                <th className="px-8 py-5 text-end">{t.actions}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/50 light:divide-zinc-200">
              {filteredProducts.map(product => {
                const adj = stockAdjustment[product.id];
                const threshold = product.minStockLevel || product.minStock || 5;
                const isLow = product.stock <= threshold;
                const expiry = getExpiryStatus(product.expiryDate);
                
                return (
                  <tr key={product.id} className={`hover:bg-zinc-800/30 light:hover:bg-zinc-50 transition-colors group ${isLow ? 'border-s-4 border-s-red-600/50' : ''}`}>
                    <td className="px-8 py-4">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl border border-zinc-700 light:border-zinc-200 flex items-center justify-center overflow-hidden bg-zinc-800 light:bg-zinc-100 shrink-0">
                          <LocalImage path={product.imagePath} className="w-full h-full object-cover" />
                        </div>
                        <div className="text-start min-w-0">
                          <div className="flex items-center gap-2">
                             <p className="font-bold text-zinc-100 light:text-zinc-900 uppercase tracking-tight truncate">{product.name}</p>
                             {product.brand && <span className="px-1.5 py-0.5 rounded bg-zinc-800 light:bg-zinc-100 text-[8px] font-black uppercase text-zinc-500 border border-zinc-700 light:border-zinc-200">{product.brand}</span>}
                          </div>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[9px] text-zinc-500 font-black uppercase bg-zinc-950 light:bg-zinc-100 px-1.5 py-0.5 rounded border border-zinc-800 light:border-zinc-200">{product.category}</span>
                            <span className="text-[9px] text-zinc-600 font-mono" title="Barcode">{product.barcode || '---'}</span>
                          </div>
                        </div>
                      </div>
                    </td>

                    {!isStocktakingMode && (
                      <td className="px-8 py-4">
                         {expiry ? (
                            <div className={`flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest ${expiry.color}`}>
                               {expiry.icon}
                               {expiry.label}
                            </div>
                         ) : <span className="text-[10px] text-zinc-700">---</span>}
                      </td>
                    )}
                    
                    {!isStocktakingMode && (
                      <td className="px-8 py-4">
                        <p className="text-lg font-black text-red-500 tracking-tighter">{data.currency} {product.price.toLocaleString()}</p>
                      </td>
                    )}

                    {!isStocktakingMode && (
                      <td className="px-8 py-4">
                        <p className="text-sm font-bold text-zinc-500 tracking-tight">{data.currency} {product.costPrice.toLocaleString()}</p>
                      </td>
                    )}

                    <td className="px-8 py-4">
                      <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest ${isLow ? 'bg-red-500/10 text-red-500' : 'bg-green-500/10 text-green-500'}`}>
                         {product.stock} {t.units}
                         {isLow && <AlertTriangle size={12} />}
                      </div>
                    </td>

                    {isStocktakingMode && (
                      <td className="px-8 py-4">
                         <input 
                           type="number" 
                           className="bg-black light:bg-zinc-100 border border-zinc-800 light:border-zinc-200 rounded-xl px-4 py-2 w-24 text-sm font-black text-red-500 focus:outline-none focus:border-red-500"
                           value={adj ? adj.actual : ''}
                           placeholder={product.stock.toString()}
                           onChange={(e) => setStockAdjustment({
                             ...stockAdjustment,
                             [product.id]: { actual: parseInt(e.target.value) || 0, reason: adj?.reason || 'Counting Error' }
                           })}
                         />
                      </td>
                    )}

                    {isStocktakingMode && (
                      <td className="px-8 py-4">
                         <select 
                           className="bg-black light:bg-zinc-100 border border-zinc-800 light:border-zinc-200 rounded-xl px-4 py-2 text-[10px] font-black uppercase text-zinc-500 outline-none"
                           value={adj?.reason || 'Counting Error'}
                           onChange={(e) => setStockAdjustment({
                             ...stockAdjustment,
                             [product.id]: { actual: adj?.actual || product.stock, reason: e.target.value }
                           })}
                         >
                            <option value="Counting Error">Counting Error</option>
                            <option value="Damaged">Damaged</option>
                            <option value="Theft">Theft / Missing</option>
                            <option value="Gift/Samples">Gift / Samples</option>
                            <option value="Found">Found Unrecorded</option>
                         </select>
                      </td>
                    )}

                    <td className="px-8 py-4 text-end">
                      {isStocktakingMode ? (
                        adj && adj.actual !== product.stock && (
                          <button onClick={() => commitStockAdjustment(product.id)} className="bg-orange-600 text-white p-3 rounded-xl shadow-lg hover:scale-105 transition-all animate-in zoom-in-90"><Save size={18} /></button>
                        )
                      ) : (
                        <div className="flex gap-2 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => { setEditingId(product.id); setFormData({...product}); setShowAddModal(true); }} className="p-2.5 hover:bg-zinc-700 light:hover:bg-zinc-100 rounded-xl text-zinc-400 light:text-zinc-500 hover:text-white transition-colors"><Edit2 size={18} /></button>
                          <button onClick={() => updateData({ products: data.products.filter(p => p.id !== product.id) })} className="p-2.5 hover:bg-red-900/30 light:hover:bg-red-50 rounded-xl text-zinc-400 light:text-zinc-500 hover:text-red-500 transition-colors"><Trash2 size={18} /></button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* CATEGORY MODAL */}
      {showCategoryModal && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/90 backdrop-blur-md p-4 animate-in fade-in">
           <div className="bg-zinc-900 light:bg-white border border-zinc-800 light:border-zinc-200 w-full max-w-md rounded-[40px] overflow-hidden shadow-2xl animate-in zoom-in-95">
              <div className="p-8 border-b border-zinc-800 light:border-zinc-200 flex justify-between items-center bg-black/20">
                <h4 className="text-xl font-black uppercase tracking-tighter light:text-zinc-900">{lang === 'ar' ? 'إدارة التصنيفات' : 'Manage Categories'}</h4>
                <button onClick={() => setShowCategoryModal(false)} className="p-3 text-zinc-500"><X size={24}/></button>
              </div>
              <div className="p-8 space-y-6">
                 <div className="flex gap-2">
                    <input type="text" placeholder={lang === 'ar' ? 'اسم التصنيف الجديد...' : 'New category name...'} className="flex-1 bg-black light:bg-zinc-100 border border-zinc-800 light:border-zinc-200 rounded-2xl px-6 py-4 focus:border-red-500 text-zinc-100 light:text-zinc-900 font-bold" value={newCategoryName} onChange={e => setNewCategoryName(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAddCategory()} />
                    <button onClick={handleAddCategory} className="bg-red-600 text-white p-4 rounded-2xl"><Plus/></button>
                 </div>
                 <div className="max-h-64 overflow-y-auto space-y-2 scrollbar-thin">
                    {categories.map(cat => (
                      <div key={cat} className="flex items-center justify-between p-4 bg-black/20 light:bg-zinc-50 border border-zinc-800 light:border-zinc-200 rounded-2xl group">
                         <span className="text-xs font-black uppercase tracking-widest text-zinc-300 light:text-zinc-900">{cat}</span>
                         <button onClick={() => handleDeleteCategory(cat)} className="p-2 text-zinc-700 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"><Trash2 size={16}/></button>
                      </div>
                    ))}
                 </div>
              </div>
           </div>
        </div>
      )}

      {/* ADD/EDIT PRODUCT MODAL (PRO) */}
      {showAddModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-md p-4 animate-in fade-in">
          <div className="bg-zinc-900 light:bg-white border border-zinc-800 light:border-zinc-200 w-full max-w-6xl rounded-[40px] overflow-hidden shadow-2xl animate-in zoom-in-95 flex flex-col max-h-[95vh]">
            <div className="p-8 border-b border-zinc-800 light:border-zinc-200 flex justify-between items-center bg-black/20 light:bg-zinc-50 shrink-0">
              <h4 className="text-2xl font-black tracking-tighter uppercase light:text-zinc-900">{editingId ? t.edit_product : t.add_product}</h4>
              <button onClick={() => { setShowAddModal(false); resetForm(); }} className="p-3 hover:bg-zinc-800 light:hover:bg-zinc-100 rounded-full transition-colors text-zinc-500 hover:text-white light:hover:text-zinc-900"><X size={24}/></button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-10 space-y-10 scrollbar-thin text-start">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                {/* Column 1: Core Details */}
                <div className="space-y-6">
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 block mb-2">{t.product_name}</label>
                    <input type="text" autoFocus className="w-full bg-black light:bg-zinc-100 border border-zinc-800 light:border-zinc-200 rounded-2xl px-6 py-4 focus:outline-none focus:border-red-500 text-zinc-100 light:text-zinc-900 font-bold" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 block mb-2">{lang === 'ar' ? 'التصنيف' : 'Category'}</label>
                      <select className="w-full bg-black light:bg-zinc-100 border border-zinc-800 light:border-zinc-200 rounded-2xl px-6 py-4 focus:outline-none focus:border-red-500 text-zinc-100 light:text-zinc-900 font-bold" value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})}>
                        {categories.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 block mb-2">{lang === 'ar' ? 'الماركة / العلامة' : 'Brand'}</label>
                      <div className="relative">
                        <Tag size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600" />
                        <input type="text" className="w-full bg-black light:bg-zinc-100 border border-zinc-800 light:border-zinc-200 rounded-2xl pl-10 pr-4 py-4 focus:outline-none focus:border-red-500 text-zinc-100 light:text-zinc-900 font-bold" value={formData.brand} onChange={e => setFormData({...formData, brand: e.target.value})} />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 block mb-2">{lang === 'ar' ? 'المورد' : 'Supplier'}</label>
                      <div className="relative">
                        <Truck size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600" />
                        <input type="text" className="w-full bg-black light:bg-zinc-100 border border-zinc-800 light:border-zinc-200 rounded-2xl pl-10 pr-4 py-4 focus:outline-none focus:border-red-500 text-zinc-100 light:text-zinc-900 font-bold" value={formData.supplier} onChange={e => setFormData({...formData, supplier: e.target.value})} />
                      </div>
                    </div>
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 block mb-2">{lang === 'ar' ? 'موقع الرف / المخزن' : 'Aisle/Shelf'}</label>
                      <div className="relative">
                        <MapPin size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600" />
                        <input type="text" className="w-full bg-black light:bg-zinc-100 border border-zinc-800 light:border-zinc-200 rounded-2xl pl-10 pr-4 py-4 focus:outline-none focus:border-red-500 text-zinc-100 light:text-zinc-900 font-bold" value={formData.aisleLocation} onChange={e => setFormData({...formData, aisleLocation: e.target.value})} />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                       <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 block mb-2">{t.barcode}</label>
                       <div className="flex gap-2">
                          <div className="relative flex-1">
                            <Hash size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600" />
                            <input type="text" className="w-full bg-black light:bg-zinc-100 border border-zinc-800 light:border-zinc-200 rounded-2xl pl-10 pr-4 py-4 focus:outline-none focus:border-red-500 text-zinc-100 light:text-zinc-900 font-mono" value={formData.barcode} onChange={e => setFormData({...formData, barcode: e.target.value})} />
                          </div>
                          <button onClick={generateBarcode} className="p-4 bg-zinc-800 light:bg-zinc-100 border border-zinc-700 light:border-zinc-200 rounded-2xl text-zinc-400 hover:text-red-500 transition-all shadow-md"><RefreshCw size={20}/></button>
                       </div>
                    </div>
                    <div>
                       <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 block mb-2">{lang === 'ar' ? 'تاريخ الانتهاء' : 'Expiry Date'}</label>
                       <div className="relative">
                          <Calendar size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600" />
                          <input type="date" className="w-full bg-black light:bg-zinc-100 border border-zinc-800 light:border-zinc-200 rounded-2xl pl-10 pr-4 py-4 focus:outline-none focus:border-red-500 text-zinc-100 light:text-zinc-900 font-bold" value={formData.expiryDate} onChange={e => setFormData({...formData, expiryDate: e.target.value})} />
                       </div>
                    </div>
                  </div>
                </div>

                {/* Column 2: Pricing, Stock & Image */}
                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 block mb-2">{t.selling_price}</label>
                      <div className="relative">
                        <DollarSign size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600" />
                        <input type="number" className="w-full bg-black light:bg-zinc-100 border border-zinc-800 light:border-zinc-200 rounded-2xl pl-10 pr-4 py-4 focus:outline-none focus:border-red-500 text-red-500 font-black text-xl shadow-inner" value={formData.price} onChange={e => setFormData({...formData, price: parseFloat(e.target.value) || 0})} />
                      </div>
                    </div>
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 block mb-2">{lang === 'ar' ? 'سعر التكلفة' : 'Cost Price'}</label>
                      <div className="relative">
                        <DollarSign size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600" />
                        <input type="number" className="w-full bg-black light:bg-zinc-100 border border-zinc-800 light:border-zinc-200 rounded-2xl pl-10 pr-4 py-4 focus:outline-none focus:border-red-500 text-zinc-400 font-black text-xl shadow-inner" value={formData.costPrice} onChange={e => setFormData({...formData, costPrice: parseFloat(e.target.value) || 0})} />
                      </div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 block mb-2">{t.stock_quantity}</label>
                      <input type="number" className="w-full bg-black light:bg-zinc-100 border border-zinc-800 light:border-zinc-200 rounded-2xl px-6 py-4 focus:outline-none focus:border-red-500 text-zinc-100 light:text-zinc-900 font-black shadow-inner" value={formData.stock} onChange={e => setFormData({...formData, stock: parseInt(e.target.value) || 0})} />
                    </div>
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 block mb-2">{lang === 'ar' ? 'حد التنبيه' : 'Alert Limit'}</label>
                      <input type="number" className="w-full bg-black light:bg-zinc-100 border border-zinc-800 light:border-zinc-200 rounded-2xl px-6 py-4 focus:outline-none focus:border-red-500 text-orange-500 font-black shadow-inner" value={formData.minStockLevel || formData.minStock} onChange={e => setFormData({...formData, minStockLevel: parseInt(e.target.value) || 0})} />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 block mb-2">{t.product_image}</label>
                    <div className="flex items-center gap-8">
                       <div className="w-40 h-40 rounded-[40px] border-2 border-dashed border-zinc-800 light:border-zinc-200 flex items-center justify-center overflow-hidden bg-black/20 light:bg-zinc-50 shrink-0">
                          {previewUrl ? <img src={previewUrl} className="w-full h-full object-cover" /> : formData.imagePath ? <LocalImage path={formData.imagePath} className="w-full h-full object-cover" /> : <div className="text-zinc-800 light:text-zinc-300 flex flex-col items-center gap-2"><Plus size={32}/><span className="text-[8px] font-black uppercase tracking-[0.2em]">Upload</span></div>}
                       </div>
                       <div className="flex flex-col gap-4">
                          <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileChange} />
                          <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-3 px-8 py-4 bg-zinc-800 light:bg-zinc-100 text-zinc-100 light:text-zinc-900 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-zinc-700 transition-all shadow-xl"><Upload size={20}/> {t.select_image}</button>
                          { (previewUrl || formData.imagePath) && <button onClick={() => { setPreviewFile(null); setPreviewUrl(null); setFormData({...formData, imagePath: ''}); }} className="text-xs font-black uppercase text-red-500 hover:underline">{t.no_image}</button>}
                       </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-8 bg-black/40 light:bg-zinc-50 border-t border-zinc-800 light:border-zinc-200 flex gap-4 shrink-0">
              <button onClick={() => { setShowAddModal(false); resetForm(); }} className="flex-1 py-5 bg-zinc-800 light:bg-zinc-200 text-zinc-400 light:text-zinc-600 font-black uppercase tracking-widest text-xs rounded-2xl">{t.discard}</button>
              <button onClick={handleSaveProduct} className="flex-1 py-5 bg-red-600 text-white font-black uppercase tracking-widest text-xs rounded-2xl shadow-xl shadow-red-900/30 flex items-center justify-center gap-3 transition-all hover:scale-[1.02] active:scale-95"><Save size={20} /> {t.save_ledger}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InventoryScreen;