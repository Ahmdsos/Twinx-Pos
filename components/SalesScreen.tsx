
import React, { useState, useMemo } from 'react';
import { AppData, Product, Sale, CartItem, LogEntry, DraftInvoice } from '../types';
import { translations, Language } from '../translations';
import { 
  Search, 
  ShoppingCart, 
  Plus, 
  Minus, 
  Clock, 
  Save, 
  Printer, 
  CheckCircle2, 
  Truck,
  Tag,
  X,
  ArrowRight,
  Package,
  AlertCircle,
  UserCheck
} from 'lucide-react';
import LocalImage from './LocalImage';

interface SalesScreenProps {
  data: AppData;
  updateData: (newData: Partial<AppData>) => void;
  addLog: (log: Omit<LogEntry, 'id' | 'timestamp'>) => void;
  lang: Language;
}

const SalesScreen: React.FC<SalesScreenProps> = ({ data, updateData, addLog, lang }) => {
  const t = translations[lang];
  const [searchTerm, setSearchTerm] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [discount, setDiscount] = useState(0);
  const [isDelivery, setIsDelivery] = useState(false);
  const [deliveryFee, setDeliveryFee] = useState(0);
  const [selectedDriverId, setSelectedDriverId] = useState<string>('');
  const [deliveryDetails, setDeliveryDetails] = useState({
    customerName: '',
    customerPhone: '',
    deliveryAddress: ''
  });
  const [successSale, setSuccessSale] = useState<Sale | null>(null);
  const [stockError, setStockError] = useState<string | null>(null);

  const displayedProducts = useMemo(() => {
    const term = searchTerm.toLowerCase().trim();
    if (!term) return data.products;
    return data.products.filter(p => 
      p.name.toLowerCase().includes(term) || 
      (p.barcode && p.barcode.toLowerCase().includes(term))
    );
  }, [data.products, searchTerm]);

  const addToCart = (product: Product) => {
    setCart(prev => {
      const existing = prev.find(item => item.id === product.id);
      const currentQtyInCart = existing ? existing.quantity : 0;
      
      if (currentQtyInCart + 1 > product.stock) {
        setStockError(t.insufficient_stock);
        setTimeout(() => setStockError(null), 3000);
        return prev;
      }

      if (existing) {
        return prev.map(item => 
          item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prev, { ...product, quantity: 1 }];
    });
  };

  const updateQuantity = (id: string, delta: number) => {
    const product = data.products.find(p => p.id === id);
    if (!product) return;

    setCart(prev => prev.map(item => {
      if (item.id === id) {
        const newQty = Math.max(1, item.quantity + delta);
        if (newQty > product.stock) {
          setStockError(t.insufficient_stock);
          setTimeout(() => setStockError(null), 3000);
          return item;
        }
        return { ...item, quantity: newQty };
      }
      return item;
    }));
  };

  const setManualQuantity = (id: string, value: string) => {
    const product = data.products.find(p => p.id === id);
    if (!product) return;

    const val = parseInt(value) || 0;
    let newQty = Math.max(0, val);
    
    if (newQty > product.stock) {
      setStockError(t.insufficient_stock);
      setTimeout(() => setStockError(null), 3000);
      newQty = product.stock;
    }

    if (newQty === 0) {
      removeFromCart(id);
      return;
    }

    setCart(prev => prev.map(item => 
      item.id === id ? { ...item, quantity: newQty } : item
    ));
  };

  const removeFromCart = (id: string) => {
    setCart(prev => prev.filter(item => item.id !== id));
  };

  const subtotal = useMemo(() => {
    return cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);
  }, [cart]);

  const total = useMemo(() => {
    return Math.max(0, subtotal - discount + (isDelivery ? deliveryFee : 0));
  }, [subtotal, discount, isDelivery, deliveryFee]);

  const handleCheckout = () => {
    if (cart.length === 0) return;
    const newSale: Sale = {
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      items: [...cart],
      subtotal,
      totalDiscount: discount,
      total,
      isDelivery,
      deliveryDetails: isDelivery ? deliveryDetails : undefined,
      deliveryFee: isDelivery ? deliveryFee : undefined,
      driverId: isDelivery ? selectedDriverId : undefined
    };

    const updatedProducts = data.products.map(p => {
      const cartItem = cart.find(item => item.id === p.id);
      if (cartItem) return { ...p, stock: p.stock - cartItem.quantity };
      return p;
    });

    updateData({ sales: [newSale, ...data.sales], products: updatedProducts });
    addLog({ action: 'SALE_COMPLETED', category: 'sale', details: `Sold ${cart.length} items for ${data.currency} ${total}` });
    setSuccessSale(newSale);
    setCart([]);
    setDiscount(0);
    setIsDelivery(false);
    setSelectedDriverId('');
    setDeliveryFee(0);
    setDeliveryDetails({ customerName: '', customerPhone: '', deliveryAddress: '' });
  };

  return (
    <div className="flex h-full overflow-hidden text-start bg-zinc-950 light:bg-zinc-50">
      {stockError && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[200] bg-orange-600 text-white px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-3 animate-in slide-in-from-top-4 font-black text-sm border border-orange-500/50">
          <AlertCircle size={20} />
          {stockError}
        </div>
      )}

      <div className="flex-1 flex flex-col p-8 gap-6 overflow-hidden">
        <div className="relative shrink-0">
          <Search size={20} className={`absolute ${lang === 'ar' ? 'right-4' : 'left-4'} top-1/2 -translate-y-1/2 text-zinc-500`} />
          <input
            type="text"
            placeholder={t.scan_barcode}
            className={`w-full bg-zinc-900 light:bg-white border border-zinc-800 light:border-zinc-200 rounded-2xl py-4 ${lang === 'ar' ? 'pr-12 pl-4' : 'pl-12 pr-4'} focus:outline-none focus:border-red-500 transition-all font-bold text-zinc-100 light:text-zinc-900 shadow-lg light:shadow-sm`}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="flex-1 flex flex-col gap-6 overflow-hidden">
          <div className="flex-1 bg-zinc-900/30 light:bg-white border border-zinc-800 light:border-zinc-200 rounded-[32px] overflow-hidden flex flex-col backdrop-blur-sm light:shadow-sm">
            <div className="p-4 bg-black/40 light:bg-zinc-50 border-b border-zinc-800 light:border-zinc-200 flex justify-between items-center">
               <span className="text-[10px] uppercase font-black tracking-widest text-zinc-500 flex items-center gap-2">
                 <Package size={14}/> {lang === 'ar' ? 'أصناف العرض المباشر' : 'Live Item Display'}
               </span>
               <span className="text-[10px] font-black text-red-500 uppercase tracking-widest">{displayedProducts.length} {lang === 'ar' ? 'صنف متاح' : 'items'}</span>
            </div>
            <div className="flex-1 overflow-y-auto p-4 scrollbar-thin">
              <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3">
                {displayedProducts.map(p => (
                  <button
                    key={p.id}
                    onClick={() => addToCart(p)}
                    className="group bg-zinc-900/50 light:bg-white hover:bg-zinc-800 light:hover:bg-zinc-50 border border-zinc-800 light:border-zinc-200 hover:border-red-500/50 rounded-2xl p-3 transition-all flex flex-col gap-3 text-start relative overflow-hidden shadow-sm"
                  >
                    <div className="aspect-square w-full rounded-xl bg-black light:bg-zinc-100 border border-zinc-800 light:border-zinc-200 overflow-hidden shrink-0">
                       <LocalImage path={p.imagePath} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-xs text-zinc-100 light:text-zinc-900 truncate">{p.name}</p>
                      <div className="flex justify-between items-center mt-1">
                        <p className="font-black text-red-500 text-sm tracking-tighter">{data.currency} {p.price.toLocaleString()}</p>
                        <p className={`text-[9px] font-black uppercase ${p.stock <= p.minStock ? 'text-orange-500' : 'text-zinc-600'}`}>S: {p.stock}</p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <aside className="w-[400px] border-l border-zinc-800 light:border-zinc-200 bg-black light:bg-white flex flex-col shadow-2xl light:shadow-sm z-20 transition-all duration-500">
        <div className="p-6 border-b border-zinc-800 light:border-zinc-200 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <ShoppingCart className="text-red-500" size={20} />
            <h3 className="font-black uppercase tracking-widest text-sm light:text-zinc-900">{t.sales}</h3>
          </div>
          <button onClick={() => setCart([])} className="text-[10px] font-black uppercase text-zinc-500 hover:text-red-500 transition-colors">{lang === 'ar' ? 'تفريغ' : 'Empty'}</button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4 scrollbar-thin">
          {cart.map(item => (
            <div key={item.id} className="bg-zinc-900/50 light:bg-zinc-50 border border-zinc-800 light:border-zinc-200 p-4 rounded-2xl space-y-3 shadow-inner">
              <div className="flex justify-between items-start gap-4 text-start">
                <p className="font-bold text-sm text-zinc-100 light:text-zinc-900 leading-tight">{item.name}</p>
                <button onClick={() => removeFromCart(item.id)} className="text-zinc-600 hover:text-red-500 transition-colors"><X size={16} /></button>
              </div>
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2 bg-black/40 light:bg-white p-1 rounded-xl border border-zinc-800 light:border-zinc-200">
                  <button onClick={() => updateQuantity(item.id, -1)} className="w-8 h-8 rounded-lg hover:bg-zinc-800 light:hover:bg-zinc-100 flex items-center justify-center text-zinc-400 transition-colors"><Minus size={14}/></button>
                  <input 
                    type="number"
                    value={item.quantity}
                    onChange={(e) => setManualQuantity(item.id, e.target.value)}
                    className="w-12 bg-transparent border-none p-0 text-center text-xs font-black text-zinc-100 light:text-zinc-900 focus:ring-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                  <button onClick={() => updateQuantity(item.id, 1)} className="w-8 h-8 rounded-lg hover:bg-zinc-800 light:hover:bg-zinc-100 flex items-center justify-center text-zinc-400 transition-colors"><Plus size={14}/></button>
                </div>
                <p className="font-black text-red-500">{data.currency} {(item.price * item.quantity).toLocaleString()}</p>
              </div>
            </div>
          ))}
          {cart.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center text-center py-20 opacity-20 grayscale">
              <ShoppingCart size={64} className="mb-4 text-zinc-700" />
              <p className="font-black uppercase tracking-widest text-xs">{t.cart_empty}</p>
            </div>
          )}
        </div>

        <div className="p-6 bg-zinc-900/50 light:bg-zinc-100 border-t border-zinc-800 light:border-zinc-200 space-y-6 shrink-0 transition-all duration-500">
          <div className="space-y-3">
            <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-zinc-500">
              <span>{t.subtotal}</span>
              <span>{data.currency} {subtotal.toLocaleString()}</span>
            </div>
            
            <button 
              onClick={() => setIsDelivery(!isDelivery)}
              className={`w-full p-4 rounded-2xl border transition-all flex items-center justify-between ${isDelivery ? 'bg-orange-600/10 border-orange-500 text-orange-500 shadow-lg shadow-orange-900/20' : 'bg-zinc-900 light:bg-white border-zinc-800 light:border-zinc-200 text-zinc-500'}`}
            >
              <div className="flex items-center gap-3">
                <Truck size={18} />
                <span className="text-[10px] font-black uppercase tracking-widest">{t.delivery_mode}</span>
              </div>
              <span className="text-xs font-black">{isDelivery ? 'ON' : 'OFF'}</span>
            </button>

            {isDelivery && (
              <div className="p-4 bg-black/40 light:bg-zinc-50 rounded-2xl border border-zinc-800 light:border-zinc-200 space-y-4 animate-in slide-in-from-top-4">
                 <input 
                  type="text" 
                  placeholder={t.customer_name} 
                  className="w-full bg-zinc-900 light:bg-white border border-zinc-800 light:border-zinc-200 rounded-xl px-4 py-2 text-xs focus:border-red-500 outline-none" 
                  value={deliveryDetails.customerName}
                  onChange={e => setDeliveryDetails({...deliveryDetails, customerName: e.target.value})}
                />
                <div className="flex gap-2">
                  <input 
                    type="number" 
                    placeholder={t.delivery_fee}
                    className="flex-1 bg-zinc-900 light:bg-white border border-zinc-800 light:border-zinc-200 rounded-xl px-4 py-2 text-xs text-end font-black" 
                    value={deliveryFee}
                    onChange={e => setDeliveryFee(parseFloat(e.target.value) || 0)}
                  />
                  <div className="relative flex-1">
                    <UserCheck className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={14}/>
                    <select 
                      className="w-full bg-zinc-900 light:bg-white border border-zinc-800 light:border-zinc-200 rounded-xl pl-8 pr-4 py-2 text-xs focus:border-red-500 outline-none font-bold"
                      value={selectedDriverId}
                      onChange={e => setSelectedDriverId(e.target.value)}
                    >
                      <option value="">{t.assign_driver}</option>
                      {data.drivers.filter(d => d.isActive).map(d => (
                        <option key={d.id} value={d.id}>{d.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-between items-end">
            <div className="text-start">
              <p className="text-[10px] font-black uppercase text-zinc-500 tracking-widest">{t.total}</p>
              <p className="text-4xl font-black text-zinc-100 light:text-zinc-900 tracking-tighter">{data.currency} {total.toLocaleString()}</p>
            </div>
            <button 
              onClick={handleCheckout} 
              disabled={cart.length === 0}
              className="bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white px-8 py-4 rounded-2xl font-black uppercase tracking-widest text-xs transition-all shadow-2xl shadow-red-900/40"
            >
              {t.authorize_payment}
            </button>
          </div>
        </div>
      </aside>

      {successSale && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/90 backdrop-blur-xl animate-in fade-in duration-300">
           <div className="bg-zinc-900 light:bg-white border border-zinc-800 light:border-zinc-200 p-12 rounded-[40px] text-center space-y-6 shadow-2xl animate-in zoom-in-95 duration-300">
              <div className="w-20 h-20 bg-green-500/10 rounded-full flex items-center justify-center mx-auto text-green-500 border border-green-500/20">
                <CheckCircle2 size={40} />
              </div>
              <div className="space-y-2">
                <h3 className="text-3xl font-black uppercase tracking-tighter light:text-zinc-900">{t.approved}</h3>
                <p className="text-zinc-500 text-sm font-bold">{t.new_transaction} #{successSale.id.split('-')[0].toUpperCase()}</p>
              </div>
              <button onClick={() => setSuccessSale(null)} className="w-full py-4 bg-zinc-800 light:bg-zinc-100 text-zinc-400 light:text-zinc-600 font-black uppercase tracking-widest text-xs rounded-2xl hover:bg-zinc-700 transition-colors">إغلاق</button>
           </div>
        </div>
      )}
    </div>
  );
};

export default SalesScreen;
