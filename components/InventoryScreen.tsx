
import React, { useState, useRef, useMemo, useEffect } from 'react';
import { AppData, Product, LogEntry } from '../types';
import { translations, Language } from '../translations';
import { 
  Plus, 
  Edit2, 
  Trash2, 
  Image as ImageIcon, 
  Search, 
  Package, 
  Save, 
  X, 
  Camera,
  Upload,
  Printer,
  Barcode as BarcodeIcon,
  RefreshCw,
  Tag,
  DollarSign,
  AlertCircle
} from 'lucide-react';
import { imageStorage } from '../services/imageStorage';
import LocalImage from './LocalImage';
import JsBarcode from 'jsbarcode';

interface InventoryScreenProps {
  data: AppData;
  updateData: (newData: Partial<AppData>) => void;
  addLog: (log: Omit<LogEntry, 'id' | 'timestamp'>) => void;
  lang: Language;
}

const InventoryScreen: React.FC<InventoryScreenProps> = ({ data, updateData, addLog, lang }) => {
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const t = translations[lang];
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState<Omit<Product, 'id'>>({
    name: '', barcode: '', price: 0, costPrice: 0, stock: 0, minStock: 5, imagePath: '', isSystemGenerated: false,
  });
  
  const [previewFile, setPreviewFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPreviewFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleSave = async () => {
    if (!formData.name) return;
    let finalImagePath = formData.imagePath;
    if (previewFile) {
      if (editingId && formData.imagePath) await imageStorage.deleteImage(formData.imagePath);
      finalImagePath = await imageStorage.saveImage(previewFile);
    }

    if (editingId) {
      const updated = data.products.map(p => p.id === editingId ? { ...formData, id: editingId, imagePath: finalImagePath } : p);
      updateData({ products: updated });
      addLog({ action: 'PRODUCT_UPDATED', category: 'inventory', details: `Updated ${formData.name}` });
      setEditingId(null);
      setIsAdding(false);
    } else {
      const newProduct: Product = { ...formData, id: crypto.randomUUID(), imagePath: finalImagePath };
      updateData({ products: [...data.products, newProduct] });
      addLog({ action: 'PRODUCT_ADDED', category: 'inventory', details: `Added ${formData.name}` });
      setIsAdding(false);
    }
    resetForm();
  };

  const resetForm = () => {
    setFormData({ name: '', barcode: '', price: 0, costPrice: 0, stock: 0, minStock: 5, imagePath: '', isSystemGenerated: false });
    setPreviewFile(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setEditingId(null);
  };

  const filtered = data.products.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()) || (p.barcode && p.barcode.toLowerCase().includes(searchTerm.toLowerCase())));

  const generateBarcode = () => {
    setFormData({ ...formData, barcode: `TX-${Math.random().toString(36).substr(2, 9).toUpperCase()}` });
  };

  return (
    <div className="p-8 h-full flex flex-col gap-6 text-start bg-zinc-950 light:bg-zinc-50">
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-red-600 rounded-lg shadow-lg shadow-red-900/20">
            <Package size={24} className="text-white" />
          </div>
          <div>
            <h3 className="text-2xl font-black tracking-tighter text-zinc-100 light:text-zinc-900 uppercase">{t.inventory}</h3>
            <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-black">{lang === 'ar' ? 'إدارة المخزون' : 'Stock Control'}</p>
          </div>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <Search size={18} className={`absolute ${lang === 'ar' ? 'right-3' : 'left-3'} top-1/2 -translate-y-1/2 text-zinc-500`} />
            <input
              type="text"
              placeholder={t.search}
              className={`bg-zinc-900 light:bg-white border border-zinc-800 light:border-zinc-200 rounded-xl py-2.5 ${lang === 'ar' ? 'pr-10 pl-4' : 'pl-10 pr-4'} focus:outline-none focus:border-red-500 w-full sm:w-64 text-sm font-bold text-zinc-100 light:text-zinc-900 transition-all`}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button onClick={() => { setIsAdding(true); setEditingId(null); resetForm(); setIsAdding(true); }} className="bg-red-600 hover:bg-red-700 text-white px-5 py-2.5 rounded-xl flex items-center gap-2 font-black transition-all shadow-xl shadow-red-900/20 text-sm uppercase">
            <Plus size={20} /> {t.add_product}
          </button>
        </div>
      </div>

      <div className="flex-1 bg-zinc-900/30 light:bg-white border border-zinc-800 light:border-zinc-200 rounded-[32px] overflow-hidden flex flex-col backdrop-blur-sm light:shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-start">
            <thead>
              <tr className="bg-black/40 light:bg-zinc-50 text-[10px] uppercase font-black tracking-widest text-zinc-500 border-b border-zinc-800 light:border-zinc-200">
                <th className="px-8 py-5 text-start">{t.product_name}</th>
                <th className="px-8 py-5 text-start">{t.selling_price}</th>
                <th className="px-8 py-5 text-start">{t.stock_level}</th>
                <th className="px-8 py-5 text-start">{t.actions}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/50 light:divide-zinc-200">
              {filtered.map(product => (
                <tr key={product.id} className="hover:bg-zinc-800/30 light:hover:bg-zinc-50 transition-colors group">
                  <td className="px-8 py-4">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl border border-zinc-700 light:border-zinc-200 flex items-center justify-center overflow-hidden bg-zinc-800 light:bg-zinc-100 shrink-0">
                        <LocalImage path={product.imagePath} className="w-full h-full object-cover" />
                      </div>
                      <div className="text-start">
                        <p className="font-bold text-zinc-100 light:text-zinc-900">{product.name}</p>
                        <p className="text-[10px] text-zinc-500 font-black uppercase tracking-widest font-mono">{product.barcode || '---'}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-4">
                    <p className="text-lg font-black text-red-500 tracking-tighter">{data.currency} {product.price.toLocaleString()}</p>
                  </td>
                  <td className="px-8 py-4">
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${product.stock <= product.minStock ? 'bg-orange-500/10 text-orange-500' : 'bg-green-500/10 text-green-500'}`}>
                      {product.stock} {t.units}
                    </span>
                  </td>
                  <td className="px-8 py-4">
                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => { setEditingId(product.id); setFormData({...product}); setIsAdding(true); }} className="p-2.5 hover:bg-zinc-700 light:hover:bg-zinc-100 rounded-xl text-zinc-400 light:text-zinc-500 hover:text-white light:hover:text-zinc-900 transition-colors"><Edit2 size={18} /></button>
                      <button onClick={() => updateData({ products: data.products.filter(p => p.id !== product.id) })} className="p-2.5 hover:bg-red-900/30 light:hover:bg-red-50 rounded-xl text-zinc-400 light:text-zinc-500 hover:text-red-500 transition-colors"><Trash2 size={18} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {isAdding && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="bg-zinc-900 light:bg-white border border-zinc-800 light:border-zinc-200 w-full max-w-2xl rounded-[40px] overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300 flex flex-col max-h-[90vh]">
            <div className="p-8 border-b border-zinc-800 light:border-zinc-200 flex justify-between items-center bg-black/20 light:bg-zinc-50 shrink-0">
              <h4 className="text-2xl font-black tracking-tighter uppercase light:text-zinc-900">{editingId ? t.edit_product : t.add_product}</h4>
              <button onClick={() => { setIsAdding(false); resetForm(); }} className="p-3 hover:bg-zinc-800 light:hover:bg-zinc-100 rounded-full transition-colors text-zinc-500 hover:text-white light:hover:text-zinc-900"><X size={24}/></button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-10 space-y-8 scrollbar-thin">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-6">
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 block mb-2">{t.product_name}</label>
                    <input type="text" autoFocus className="w-full bg-black light:bg-zinc-100 border border-zinc-800 light:border-zinc-200 rounded-2xl px-6 py-4 focus:outline-none focus:border-red-500 text-zinc-100 light:text-zinc-900 font-bold" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 block mb-2">{t.barcode}</label>
                    <div className="flex gap-2">
                       <input type="text" className="flex-1 bg-black light:bg-zinc-100 border border-zinc-800 light:border-zinc-200 rounded-2xl px-6 py-4 focus:outline-none focus:border-red-500 text-zinc-100 light:text-zinc-900 font-mono" value={formData.barcode} onChange={e => setFormData({...formData, barcode: e.target.value})} />
                       <button onClick={generateBarcode} className="p-4 bg-zinc-800 light:bg-zinc-100 border border-zinc-700 light:border-zinc-200 rounded-2xl text-zinc-400 hover:text-red-500 transition-all"><RefreshCw size={20}/></button>
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 block mb-2">{t.selling_price}</label>
                      <input type="number" className="w-full bg-black light:bg-zinc-100 border border-zinc-800 light:border-zinc-200 rounded-2xl px-6 py-4 focus:outline-none focus:border-red-500 text-red-500 font-black text-xl" value={formData.price} onChange={e => setFormData({...formData, price: parseFloat(e.target.value) || 0})} />
                    </div>
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 block mb-2">{t.cost_price}</label>
                      <input type="number" className="w-full bg-black light:bg-zinc-100 border border-zinc-800 light:border-zinc-200 rounded-2xl px-6 py-4 focus:outline-none focus:border-red-500 text-zinc-400 font-black text-xl" value={formData.costPrice} onChange={e => setFormData({...formData, costPrice: parseFloat(e.target.value) || 0})} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 block mb-2">{t.stock_quantity}</label>
                      <input type="number" className="w-full bg-black light:bg-zinc-100 border border-zinc-800 light:border-zinc-200 rounded-2xl px-6 py-4 focus:outline-none focus:border-red-500 text-zinc-100 light:text-zinc-900 font-black" value={formData.stock} onChange={e => setFormData({...formData, stock: parseInt(e.target.value) || 0})} />
                    </div>
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 block mb-2">{t.alert_limit}</label>
                      <input type="number" className="w-full bg-black light:bg-zinc-100 border border-zinc-800 light:border-zinc-200 rounded-2xl px-6 py-4 focus:outline-none focus:border-red-500 text-orange-500 font-black" value={formData.minStock} onChange={e => setFormData({...formData, minStock: parseInt(e.target.value) || 0})} />
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                 <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 block mb-2">{t.product_image}</label>
                 <div className="flex items-center gap-6">
                    <div className="w-32 h-32 rounded-[32px] border-2 border-dashed border-zinc-800 light:border-zinc-200 flex items-center justify-center overflow-hidden bg-black/20 light:bg-zinc-50 shrink-0">
                       {previewUrl ? <img src={previewUrl} className="w-full h-full object-cover" /> : formData.imagePath ? <LocalImage path={formData.imagePath} className="w-full h-full object-cover" /> : <ImageIcon className="text-zinc-800 light:text-zinc-300" size={40} />}
                    </div>
                    <div className="flex flex-col gap-3">
                       <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileChange} />
                       <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-2 px-6 py-3 bg-zinc-800 light:bg-zinc-100 text-zinc-100 light:text-zinc-900 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-zinc-700 transition-all"><Upload size={16}/> {t.select_image}</button>
                       { (previewUrl || formData.imagePath) && <button onClick={() => { setPreviewFile(null); setPreviewUrl(null); setFormData({...formData, imagePath: ''}); }} className="text-xs font-black uppercase text-red-500 hover:underline">{t.no_image}</button>}
                    </div>
                 </div>
              </div>
            </div>

            <div className="p-8 bg-black/40 light:bg-zinc-50 border-t border-zinc-800 light:border-zinc-200 flex gap-4 shrink-0">
              <button onClick={() => { setIsAdding(false); resetForm(); }} className="flex-1 py-4 bg-zinc-800 light:bg-zinc-200 text-zinc-400 light:text-zinc-600 font-black uppercase tracking-widest text-xs rounded-2xl">{t.discard}</button>
              <button onClick={handleSave} className="flex-1 py-4 bg-red-600 text-white font-black uppercase tracking-widest text-xs rounded-2xl shadow-xl shadow-red-900/30 flex items-center justify-center gap-2"><Save size={18} /> {t.save_ledger}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InventoryScreen;
