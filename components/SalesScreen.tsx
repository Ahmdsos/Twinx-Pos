import React, { useState, useMemo, useEffect, useRef } from 'react';
import { AppData, Product, Sale, CartItem, LogEntry, Customer, SaleChannel, WholesalePartner, WholesaleTransaction } from '../types';
import { translations, Language } from '../translations';
import { 
  Search, 
  ShoppingCart, 
  Plus, 
  Minus, 
  CheckCircle2, 
  Truck,
  X,
  Package,
  AlertCircle,
  UserCheck,
  User,
  Phone,
  MapPin,
  DollarSign,
  Globe,
  Instagram,
  Store,
  Users,
  Lock,
  Unlock,
  ArrowUpRight,
  ArrowDownLeft,
  Briefcase,
  UserCircle,
  Contact,
  Tag,
  Percent
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
  const [discountType, setDiscountType] = useState<'percentage' | 'fixed'>('percentage');
  const [discountValue, setDiscountValue] = useState(0);
  const [isDelivery, setIsDelivery] = useState(false);
  const [deliveryFee, setDeliveryFee] = useState(0);
  const [selectedDriverId, setSelectedDriverId] = useState<string>('');
  const [saleChannel, setSaleChannel] = useState<SaleChannel>('store');
  
  // POS Mode: Retail or Wholesale
  const [posMode, setPosMode] = useState<'retail' | 'wholesale'>('retail');
  
  // Wholesale specific states
  const [wholesaleType, setWholesaleType] = useState<'sale' | 'purchase'>('sale');
  const [paidAmount, setPaidAmount] = useState<number>(0);
  const [isTraderLocked, setIsTraderLocked] = useState(false);
  const [traderDetails, setTraderDetails] = useState({
    name: '',
    contact: ''
  });

  // Customer management states (Retail)
  const [customerDetails, setCustomerDetails] = useState({
    name: '',
    phone: '',
    address: ''
  });
  const [isCustomerLocked, setIsCustomerLocked] = useState(false);
  
  // Lookup states
  const [lookupSearch, setLookupSearch] = useState('');
  const [showLookupDropdown, setShowLookupDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [successSale, setSuccessSale] = useState<{id: string, type: 'retail' | 'wholesale' } | null>(null);
  const [stockError, setStockError] = useState<string | null>(null);

  // Filter based on typed input
  const matchingLookup = useMemo(() => {
    const isLocked = posMode === 'retail' ? isCustomerLocked : isTraderLocked;
    if (isLocked || lookupSearch.length < 2) return [];
    
    if (posMode === 'retail') {
      return (data.customers || []).filter(c => 
        c.phone.includes(lookupSearch) || c.name.toLowerCase().includes(lookupSearch.toLowerCase())
      ).slice(0, 5);
    } else {
      return (data.partners || []).filter(p => 
        p.name.toLowerCase().includes(lookupSearch.toLowerCase()) || p.contact.includes(lookupSearch)
      ).slice(0, 5);
    }
  }, [lookupSearch, data.customers, data.partners, isCustomerLocked, isTraderLocked, posMode]);

  // Sync paidAmount with total when cart changes
  const subtotal = useMemo(() => {
    return cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);
  }, [cart]);

  const calculatedDiscountAmount = useMemo(() => {
    if (discountType === 'percentage') {
      return (subtotal * discountValue) / 100;
    }
    return discountValue;
  }, [subtotal, discountValue, discountType]);

  const total = useMemo(() => {
    return Math.max(0, subtotal - calculatedDiscountAmount + (isDelivery ? deliveryFee : 0));
  }, [subtotal, calculatedDiscountAmount, isDelivery, deliveryFee]);

  useEffect(() => {
    if (posMode === 'wholesale') {
      setPaidAmount(total);
    }
  }, [total, posMode]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowLookupDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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
      
      const isSelling = posMode === 'retail' || (posMode === 'wholesale' && wholesaleType === 'sale');
      if (isSelling && currentQtyInCart + 1 > product.stock) {
        setStockError(t.insufficient_stock);
        setTimeout(() => setStockError(null), 3000);
        return prev;
      }

      if (existing) {
        return prev.map(item => 
          item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      
      const initialPrice = posMode === 'wholesale' && wholesaleType === 'purchase' ? product.costPrice : product.price;
      return [...prev, { ...product, price: initialPrice, quantity: 1 }];
    });
  };

  const updateQuantity = (id: string, delta: number) => {
    const product = data.products.find(p => p.id === id);
    if (!product) return;

    setCart(prev => prev.map(item => {
      if (item.id === id) {
        const newQty = Math.max(1, item.quantity + delta);
        const isSelling = posMode === 'retail' || (posMode === 'wholesale' && wholesaleType === 'sale');
        if (isSelling && newQty > product.stock) {
          setStockError(t.insufficient_stock);
          setTimeout(() => setStockError(null), 3000);
          return item;
        }
        return { ...item, quantity: newQty };
      }
      return item;
    }));
  };

  const updatePrice = (id: string, newPrice: number) => {
    setCart(prev => prev.map(item => 
      item.id === id ? { ...item, price: newPrice } : item
    ));
  };

  const setManualQuantity = (id: string, value: string) => {
    const product = data.products.find(p => p.id === id);
    if (!product) return;

    const val = parseInt(value) || 0;
    let newQty = Math.max(0, val);
    
    const isSelling = posMode === 'retail' || (posMode === 'wholesale' && wholesaleType === 'sale');
    if (isSelling && newQty > product.stock) {
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

  const selectCustomer = (customer: Customer) => {
    setCustomerDetails({
      name: customer.name,
      phone: customer.phone,
      address: customer.address || ''
    });
    setLookupSearch(customer.phone);
    setIsCustomerLocked(true);
    setShowLookupDropdown(false);
  };

  const selectPartner = (partner: WholesalePartner) => {
    setTraderDetails({
      name: partner.name,
      contact: partner.contact
    });
    setLookupSearch(partner.name);
    setIsTraderLocked(true);
    setShowLookupDropdown(false);
  };

  const clearLookup = () => {
    setCustomerDetails({ name: '', phone: '', address: '' });
    setTraderDetails({ name: '', contact: '' });
    setLookupSearch('');
    setIsCustomerLocked(false);
    setIsTraderLocked(false);
  };

  const handleCheckout = () => {
    if (cart.length === 0) return;
    
    if (posMode === 'retail') {
      handleRetailCheckout();
    } else {
      handleWholesaleCheckout();
    }
  };

  const handleRetailCheckout = () => {
    if (isDelivery && !customerDetails.phone) {
      setStockError(lang === 'ar' ? 'يرجى إدخال رقم هاتف العميل' : 'Please enter customer phone');
      setTimeout(() => setStockError(null), 3000);
      return;
    }

    let updatedCustomers = [...data.customers];
    let linkedCustomerId: string | undefined = undefined;

    if (customerDetails.phone) {
      const existing = data.customers.find(c => c.phone === customerDetails.phone);
      if (existing) {
        linkedCustomerId = existing.id;
      } else {
        const newCustomer: Customer = {
          id: crypto.randomUUID(),
          name: customerDetails.name || (lang === 'ar' ? 'عميل جديد' : 'New Customer'),
          phone: customerDetails.phone,
          address: customerDetails.address,
          totalPurchases: total,
          invoiceCount: 1,
          channelsUsed: [saleChannel],
          lastOrderTimestamp: Date.now()
        };
        updatedCustomers.push(newCustomer);
        linkedCustomerId = newCustomer.id;
      }
    }

    const newSale: Sale = {
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      items: [...cart],
      subtotal,
      totalDiscount: calculatedDiscountAmount,
      discountType: discountType,
      discountValue: discountValue,
      total,
      paidAmount: total,
      remainingAmount: 0,
      saleChannel,
      customerId: linkedCustomerId,
      isDelivery,
      deliveryDetails: isDelivery ? {
        customerName: customerDetails.name,
        customerPhone: customerDetails.phone,
        deliveryAddress: customerDetails.address
      } : undefined,
      deliveryFee: isDelivery ? deliveryFee : undefined,
      driverId: isDelivery ? selectedDriverId : undefined
    };

    const updatedProducts = data.products.map(p => {
      const cartItem = cart.find(item => item.id === p.id);
      if (cartItem) return { ...p, stock: p.stock - cartItem.quantity };
      return p;
    });

    updateData({ 
      sales: [newSale, ...data.sales], 
      products: updatedProducts, 
      customers: updatedCustomers 
    });

    addLog({ 
      action: 'SALE_COMPLETED', 
      category: 'sale', 
      details: `Retail Sale: ${cart.length} items for ${data.currency} ${total}.` 
    });

    setSuccessSale({ id: newSale.id, type: 'retail' });
    resetPOS();
  };

  const handleWholesaleCheckout = () => {
    if (!traderDetails.name || !traderDetails.contact) {
      setStockError(lang === 'ar' ? 'يرجى إكمال بيانات التاجر (الاسم ورقم التواصل)' : 'Please complete trader details (Name & Contact)');
      setTimeout(() => setStockError(null), 3000);
      return;
    }

    let updatedPartners = [...data.partners];
    let partnerToUse = data.partners.find(p => p.contact === traderDetails.contact || p.name.toLowerCase() === traderDetails.name.toLowerCase());

    if (!partnerToUse) {
      // Create new trader record automatically
      const newPartner: WholesalePartner = {
        id: crypto.randomUUID(),
        name: traderDetails.name,
        contact: traderDetails.contact,
        type: wholesaleType === 'purchase' ? 'supplier' : 'buyer',
        createdAt: Date.now()
      };
      updatedPartners.push(newPartner);
      partnerToUse = newPartner;
      addLog({ action: 'PARTNER_AUTO_CREATED', category: 'wholesale', details: `New Trader Created: ${newPartner.name}` });
    }

    const newTrans: WholesaleTransaction = {
      id: crypto.randomUUID(),
      partnerId: partnerToUse.id,
      type: wholesaleType,
      timestamp: Date.now(),
      total,
      paidAmount: paidAmount,
      items: cart.map(i => ({
        productId: i.id,
        name: i.name,
        quantity: i.quantity,
        unitPrice: i.price
      })),
      payments: paidAmount > 0 ? [{ amount: paidAmount, timestamp: Date.now(), remainingAfter: total - paidAmount }] : []
    };

    const updatedProducts = data.products.map(p => {
      const item = cart.find(i => i.id === p.id);
      if (item) {
        return { 
          ...p, 
          stock: wholesaleType === 'purchase' ? p.stock + item.quantity : p.stock - item.quantity,
        };
      }
      return p;
    });

    updateData({
      wholesaleTransactions: [...(data.wholesaleTransactions || []), newTrans],
      products: updatedProducts,
      partners: updatedPartners
    });

    addLog({
      action: wholesaleType === 'sale' ? 'WHOLESALE_SALE' : 'WHOLESALE_PURCHASE',
      category: 'wholesale',
      details: `Wholesale ${wholesaleType}: ${partnerToUse.name}, Total: ${total}, Paid: ${paidAmount}`
    });

    setSuccessSale({ id: newTrans.id, type: 'wholesale' });
    resetPOS();
  };

  const resetPOS = () => {
    setCart([]);
    setDiscountValue(0);
    setDiscountType('percentage');
    setIsDelivery(false);
    setSelectedDriverId('');
    setSaleChannel('store');
    setDeliveryFee(0);
    clearLookup();
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
        <div className="p-4 border-b border-zinc-800 light:border-zinc-200">
          <div className="flex bg-zinc-900 light:bg-zinc-100 p-1 rounded-xl border border-zinc-800 light:border-zinc-200">
            <button 
              onClick={() => { setPosMode('retail'); clearLookup(); }}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${posMode === 'retail' ? 'bg-red-600 text-white shadow-lg' : 'text-zinc-500 hover:text-zinc-300'}`}
            >
              <UserCircle size={14}/> {t.retail_mode}
            </button>
            <button 
              onClick={() => { setPosMode('wholesale'); clearLookup(); }}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${posMode === 'wholesale' ? 'bg-red-600 text-white shadow-lg' : 'text-zinc-500 hover:text-zinc-300'}`}
            >
              <Briefcase size={14}/> {t.wholesale_mode}
            </button>
          </div>
        </div>

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
                <div className="text-end">
                   {posMode === 'wholesale' && (
                     <div className="flex items-center gap-1 mb-1 justify-end bg-black/20 light:bg-white px-2 py-0.5 rounded-lg border border-zinc-800 light:border-zinc-200">
                        <Tag size={10} className="text-zinc-600" />
                        <input 
                          type="number" 
                          value={item.price}
                          onChange={(e) => updatePrice(item.id, parseFloat(e.target.value) || 0)}
                          className="w-16 bg-transparent border-none p-0 text-[11px] font-black text-red-500 focus:ring-0 text-end"
                        />
                     </div>
                   )}
                   <p className="font-black text-red-500">{data.currency} {(item.price * item.quantity).toLocaleString()}</p>
                </div>
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
          <div className="space-y-4">
            <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-zinc-500">
              <span>{t.subtotal}</span>
              <span>{data.currency} {subtotal.toLocaleString()}</span>
            </div>

            {/* Discount Logic Integration */}
            <div className="space-y-3">
              <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 block">{t.add_global_discount}</label>
              <div className="flex gap-2">
                <div className="flex bg-black/40 light:bg-zinc-200 p-1 rounded-xl border border-zinc-800 light:border-zinc-300 w-28">
                  <button 
                    onClick={() => setDiscountType('percentage')}
                    className={`flex-1 flex items-center justify-center py-2 rounded-lg text-[10px] font-black transition-all ${discountType === 'percentage' ? 'bg-red-600 text-white shadow-md' : 'text-zinc-500'}`}
                  >
                    <Percent size={12} />
                  </button>
                  <button 
                    onClick={() => setDiscountType('fixed')}
                    className={`flex-1 flex items-center justify-center py-2 rounded-lg text-[10px] font-black transition-all ${discountType === 'fixed' ? 'bg-red-600 text-white shadow-md' : 'text-zinc-500'}`}
                  >
                    <DollarSign size={12} />
                  </button>
                </div>
                <div className="relative flex-1">
                  <input 
                    type="number" 
                    className="w-full bg-black/40 light:bg-white border border-zinc-800 light:border-zinc-200 rounded-xl px-4 py-2 text-sm font-black text-red-500 focus:outline-none focus:border-red-500 outline-none transition-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    placeholder="0"
                    value={discountValue || ''}
                    onChange={(e) => setDiscountValue(parseFloat(e.target.value) || 0)}
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-zinc-600 uppercase">
                    {discountType === 'percentage' ? '%' : data.currency}
                  </span>
                </div>
              </div>
            </div>

            {/* Entity Lookup Section */}
            <div className="space-y-3">
              <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 flex items-center gap-2">
                {posMode === 'retail' ? <Users size={14} /> : <Briefcase size={14}/>} 
                {posMode === 'retail' ? t.customer_details : t.trader_details}
              </label>
              <div className="p-4 bg-black/40 light:bg-zinc-50 rounded-2xl border border-zinc-800 light:border-zinc-200 space-y-3 relative" ref={dropdownRef}>
                {posMode === 'wholesale' && (
                  <div className="grid grid-cols-2 gap-2 mb-2 p-1 bg-zinc-950 light:bg-zinc-200 rounded-lg">
                    <button onClick={() => setWholesaleType('sale')} className={`py-2 rounded-md text-[9px] font-black uppercase transition-all ${wholesaleType === 'sale' ? 'bg-blue-600 text-white' : 'text-zinc-500'}`}>{t.selling_to_trader}</button>
                    <button onClick={() => setWholesaleType('purchase')} className={`py-2 rounded-md text-[9px] font-black uppercase transition-all ${wholesaleType === 'purchase' ? 'bg-orange-600 text-white' : 'text-zinc-500'}`}>{t.buying_from_trader}</button>
                  </div>
                )}
                
                <div className="relative">
                  <Search className={`absolute ${lang === 'ar' ? 'right-3' : 'left-3'} top-1/2 -translate-y-1/2 text-zinc-500`} size={14}/>
                  <input 
                    type="text" 
                    placeholder={posMode === 'retail' ? (lang === 'ar' ? 'بحث عن عميل (رقم/اسم)' : 'Search Customer (Name/No)') : (lang === 'ar' ? 'بحث عن تاجر (رقم/اسم)' : 'Search Trader (Name/No)')} 
                    readOnly={posMode === 'retail' ? isCustomerLocked : isTraderLocked}
                    className={`w-full bg-zinc-900 light:bg-white border border-zinc-800 light:border-zinc-200 rounded-xl ${lang === 'ar' ? 'pr-10 pl-10' : 'pl-10 pr-10'} py-2 text-xs focus:border-red-500 outline-none ${ (posMode === 'retail' ? isCustomerLocked : isTraderLocked) ? 'opacity-70 cursor-not-allowed' : ''}`} 
                    value={lookupSearch}
                    onChange={e => {
                        setLookupSearch(e.target.value);
                        setShowLookupDropdown(true);
                    }}
                    onFocus={() => setShowLookupDropdown(true)}
                  />
                  {(posMode === 'retail' ? isCustomerLocked : isTraderLocked) ? (
                    <button onClick={clearLookup} className={`absolute ${lang === 'ar' ? 'left-3' : 'right-3'} top-1/2 -translate-y-1/2 text-red-500`}>
                      <Lock size={14}/>
                    </button>
                  ) : (
                    <div className={`absolute ${lang === 'ar' ? 'left-3' : 'right-3'} top-1/2 -translate-y-1/2 text-zinc-600`}>
                      <Unlock size={14}/>
                    </div>
                  )}

                  {/* Search Results Dropdown */}
                  {showLookupDropdown && matchingLookup.length > 0 && (
                    <div className="absolute left-0 right-0 bottom-full mb-2 bg-zinc-900 light:bg-white border border-zinc-800 light:border-zinc-200 rounded-2xl shadow-2xl overflow-hidden z-50 animate-in fade-in slide-in-from-bottom-2">
                      {matchingLookup.map((item: any) => (
                        <button
                          key={item.id}
                          onClick={() => posMode === 'retail' ? selectCustomer(item) : selectPartner(item)}
                          className="w-full p-4 text-start hover:bg-zinc-800 light:hover:bg-zinc-100 flex items-center justify-between transition-colors border-b border-zinc-800/50 light:border-zinc-200 last:border-none"
                        >
                          <div>
                            <p className="font-bold text-xs text-zinc-100 light:text-zinc-900">{item.name}</p>
                            <p className="text-[10px] text-zinc-500 font-mono">{posMode === 'retail' ? item.phone : item.contact}</p>
                          </div>
                          <ArrowUpRight size={12} className="text-zinc-700" />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                
                {posMode === 'retail' && (
                  <div className="space-y-3">
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={14}/>
                      <input 
                        type="text" 
                        placeholder={t.phone_number} 
                        readOnly={isCustomerLocked}
                        className={`w-full bg-zinc-900 light:bg-white border border-zinc-800 light:border-zinc-200 rounded-xl pl-10 pr-4 py-2 text-xs focus:border-red-500 outline-none font-mono ${isCustomerLocked ? 'opacity-70 cursor-not-allowed' : ''}`} 
                        value={customerDetails.phone}
                        onChange={e => setCustomerDetails({...customerDetails, phone: e.target.value})}
                      />
                    </div>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={14}/>
                      <input 
                        type="text" 
                        placeholder={t.customer_name} 
                        readOnly={isCustomerLocked}
                        className={`w-full bg-zinc-900 light:bg-white border border-zinc-800 light:border-zinc-200 rounded-xl pl-10 pr-4 py-2 text-xs focus:border-red-500 outline-none ${isCustomerLocked ? 'opacity-70 cursor-not-allowed' : ''}`} 
                        value={customerDetails.name}
                        onChange={e => setCustomerDetails({...customerDetails, name: e.target.value})}
                      />
                    </div>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-3 text-zinc-500" size={14}/>
                      <textarea 
                        placeholder={t.delivery_address} 
                        readOnly={isCustomerLocked}
                        className={`w-full bg-zinc-900 light:bg-white border border-zinc-800 light:border-zinc-200 rounded-xl pl-10 pr-4 py-2 text-xs focus:border-red-500 outline-none resize-none ${isCustomerLocked ? 'opacity-70 cursor-not-allowed' : ''}`} 
                        rows={1}
                        value={customerDetails.address}
                        onChange={e => setCustomerDetails({...customerDetails, address: e.target.value})}
                      />
                    </div>
                  </div>
                )}

                {posMode === 'wholesale' && (
                  <div className="space-y-3">
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={14}/>
                      <input 
                        type="text" 
                        placeholder={t.trader_name} 
                        readOnly={isTraderLocked}
                        className={`w-full bg-zinc-900 light:bg-white border border-zinc-800 light:border-zinc-200 rounded-xl pl-10 pr-4 py-2 text-xs focus:border-red-500 outline-none ${isTraderLocked ? 'opacity-70 cursor-not-allowed' : ''}`} 
                        value={traderDetails.name}
                        onChange={e => setTraderDetails({...traderDetails, name: e.target.value})}
                      />
                    </div>
                    <div className="relative">
                      <Contact className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={14}/>
                      <input 
                        type="text" 
                        placeholder={lang === 'ar' ? 'رقم التواصل' : 'Contact Number'} 
                        readOnly={isTraderLocked}
                        className={`w-full bg-zinc-900 light:bg-white border border-zinc-800 light:border-zinc-200 rounded-xl pl-10 pr-4 py-2 text-xs focus:border-red-500 outline-none font-mono ${isTraderLocked ? 'opacity-70 cursor-not-allowed' : ''}`} 
                        value={traderDetails.contact}
                        onChange={e => setTraderDetails({...traderDetails, contact: e.target.value})}
                      />
                    </div>

                    <div className="p-4 bg-zinc-900/50 light:bg-white border border-orange-500/20 rounded-xl animate-in fade-in">
                      <label className="text-[10px] font-black uppercase text-orange-500 block mb-1">{t.paid_amount}</label>
                      <div className="flex items-center gap-2">
                         <DollarSign size={14} className="text-zinc-600" />
                         <input 
                          type="number" 
                          className="w-full bg-transparent border-none p-0 text-lg font-black text-zinc-100 light:text-zinc-900 focus:ring-0" 
                          value={paidAmount} 
                          onChange={e => setPaidAmount(parseFloat(e.target.value) || 0)}
                         />
                      </div>
                      {total - paidAmount > 0 && (
                        <div className="mt-2 text-[10px] font-bold text-orange-500 uppercase flex justify-between">
                           <span>{t.remaining_amount}:</span>
                           <span>{data.currency} {(total - paidAmount).toLocaleString()}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 block">{t.sale_channel}</label>
              <div className="grid grid-cols-3 gap-2 p-1 bg-zinc-950 light:bg-zinc-200 rounded-xl border border-zinc-800 light:border-zinc-300">
                <button 
                  onClick={() => setSaleChannel('store')}
                  className={`flex flex-col items-center gap-1 py-2 rounded-lg transition-all ${saleChannel === 'store' ? 'bg-red-600 text-white shadow-lg' : 'text-zinc-500 hover:text-zinc-300'}`}
                >
                  <Store size={14} />
                  <span className="text-[8px] font-black uppercase">{t.store}</span>
                </button>
                <button 
                  onClick={() => setSaleChannel('social_media')}
                  className={`flex flex-col items-center gap-1 py-2 rounded-lg transition-all ${saleChannel === 'social_media' ? 'bg-red-600 text-white shadow-lg' : 'text-zinc-500 hover:text-zinc-300'}`}
                >
                  <Instagram size={14} />
                  <span className="text-[8px] font-black uppercase">{t.social_media}</span>
                </button>
                <button 
                  onClick={() => setSaleChannel('website')}
                  className={`flex flex-col items-center gap-1 py-2 rounded-lg transition-all ${saleChannel === 'website' ? 'bg-red-600 text-white shadow-lg' : 'text-zinc-500 hover:text-zinc-300'}`}
                >
                  <Globe size={14} />
                  <span className="text-[8px] font-black uppercase">{t.website}</span>
                </button>
              </div>
            </div>

            {posMode === 'retail' && (
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
            )}

            {isDelivery && posMode === 'retail' && (
              <div className="p-4 bg-black/40 light:bg-zinc-50 rounded-2xl border border-zinc-800 light:border-zinc-200 space-y-4 animate-in slide-in-from-top-4">
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={14}/>
                    <input 
                      type="number" 
                      placeholder={t.delivery_fee}
                      className="w-full bg-zinc-900 light:bg-white border border-zinc-800 light:border-zinc-200 rounded-xl pl-8 pr-4 py-2 text-xs text-end font-black" 
                      value={deliveryFee}
                      onChange={e => setDeliveryFee(parseFloat(e.target.value) || 0)}
                    />
                  </div>
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
                <div className="flex flex-wrap justify-center gap-2 mt-4">
                  <div className="px-3 py-1 bg-zinc-800 light:bg-zinc-100 rounded-lg text-[10px] font-black uppercase text-zinc-400">
                    {successSale.type === 'retail' ? t.retail_mode : t.wholesale_mode}
                  </div>
                </div>
              </div>
              <button onClick={() => setSuccessSale(null)} className="w-full py-4 bg-zinc-800 light:bg-zinc-100 text-zinc-400 light:text-zinc-600 font-black uppercase tracking-widest text-xs rounded-2xl hover:bg-zinc-700 transition-colors">إغلاق</button>
           </div>
        </div>
      )}
    </div>
  );
};

export default SalesScreen;