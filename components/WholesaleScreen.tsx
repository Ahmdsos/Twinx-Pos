
import React, { useState, useMemo, useEffect } from 'react';
import { AppData, WholesalePartner, WholesaleTransaction, LogEntry, Product } from '../types';
import { translations, Language } from '../translations';
import { 
  Users, 
  Plus, 
  Search, 
  Trash2, 
  ArrowUpRight, 
  ArrowDownLeft, 
  X, 
  Save, 
  Phone, 
  Calendar,
  Package,
  History,
  DollarSign,
  AlertCircle,
  Coins
} from 'lucide-react';

interface WholesaleScreenProps {
  data: AppData;
  updateData: (newData: Partial<AppData>) => void;
  addLog: (log: Omit<LogEntry, 'id' | 'timestamp'>) => void;
  lang: Language;
}

const WholesaleScreen: React.FC<WholesaleScreenProps> = ({ data, updateData, addLog, lang }) => {
  const [partnerFilter, setPartnerFilter] = useState<'all' | 'buyer' | 'supplier'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [showPartnerModal, setShowPartnerModal] = useState(false);
  const [showTransactionModal, setShowTransactionModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState<WholesaleTransaction | null>(null);
  const [selectedPartner, setSelectedPartner] = useState<WholesalePartner | null>(null);
  const t = translations[lang];

  const [partnerForm, setPartnerForm] = useState<Omit<WholesalePartner, 'id' | 'createdAt'>>({
    name: '',
    contact: '',
    type: 'buyer'
  });

  const [transItems, setTransItems] = useState<{ productId: string; quantity: number; unitPrice: number }[]>([]);
  const [paidAmount, setPaidAmount] = useState<number>(0);
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [productSearch, setProductSearch] = useState('');
  const [stockError, setStockError] = useState<string | null>(null);

  const currentTotal = useMemo(() => {
    return transItems.reduce((acc, i) => acc + (i.unitPrice * i.quantity), 0);
  }, [transItems]);

  useEffect(() => {
    setPaidAmount(currentTotal);
  }, [currentTotal]);

  const filteredPartners = useMemo(() => {
    return (data.partners || []).filter(p => {
      const matchesType = partnerFilter === 'all' || p.type === partnerFilter;
      const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesType && matchesSearch;
    });
  }, [data.partners, partnerFilter, searchTerm]);

  const savePartner = () => {
    if (!partnerForm.name) return;
    const newPartner: WholesalePartner = {
      ...partnerForm,
      id: crypto.randomUUID(),
      createdAt: Date.now()
    };
    updateData({ partners: [...(data.partners || []), newPartner] });
    addLog({
      action: 'PARTNER_CREATED',
      category: 'wholesale',
      details: `Registered wholesale ${partnerForm.type}: ${partnerForm.name}`
    });
    setShowPartnerModal(false);
    setPartnerForm({ name: '', contact: '', type: 'buyer' });
  };

  const deletePartner = (id: string) => {
    if (confirm(t.delete_confirm)) {
      updateData({
        partners: (data.partners || []).filter(p => p.id !== id),
        wholesaleTransactions: (data.wholesaleTransactions || []).filter(t => t.partnerId !== id)
      });
      addLog({ action: 'PARTNER_DELETED', category: 'wholesale', details: `Removed partner ${id}` });
    }
  };

  const addItemToTrans = (p: Product) => {
    if (transItems.find(i => i.productId === p.id)) return;
    setTransItems([...transItems, { productId: p.id, quantity: 1, unitPrice: selectedPartner?.type === 'supplier' ? p.costPrice : p.price }]);
  };

  const finalizeTransaction = () => {
    if (!selectedPartner || transItems.length === 0) return;
    const total = currentTotal;
    const transType = selectedPartner.type === 'supplier' ? 'purchase' : 'sale';

    const newTrans: WholesaleTransaction = {
      id: crypto.randomUUID(),
      partnerId: selectedPartner.id,
      type: transType,
      timestamp: Date.now(),
      total,
      paidAmount: paidAmount,
      items: transItems.map(i => ({
        productId: i.productId,
        name: data.products.find(p => p.id === i.productId)?.name || 'Unknown',
        quantity: i.quantity,
        unitPrice: i.unitPrice
      }))
    };

    const updatedProducts = data.products.map(p => {
      const item = transItems.find(i => i.productId === p.id);
      if (item) {
        return { 
          ...p, 
          stock: transType === 'purchase' ? p.stock + item.quantity : p.stock - item.quantity,
        };
      }
      return p;
    });

    updateData({
      wholesaleTransactions: [...(data.wholesaleTransactions || []), newTrans],
      products: updatedProducts
    });

    addLog({
      action: transType === 'sale' ? 'WHOLESALE_SALE' : 'WHOLESALE_PURCHASE',
      category: 'wholesale',
      details: `${transType === 'sale' ? 'Sold to' : 'Purchased from'} ${selectedPartner.name}: Total ${data.currency} ${total.toLocaleString()}, Paid: ${paidAmount.toLocaleString()}`
    });

    setShowTransactionModal(false);
    setTransItems([]);
    setPaidAmount(0);
  };

  const handleDebtPayment = () => {
    if (!showPaymentModal || paymentAmount <= 0) return;
    const updatedTransactions = data.wholesaleTransactions.map(t => {
      if (t.id === showPaymentModal.id) {
        return { ...t, paidAmount: t.paidAmount + paymentAmount };
      }
      return t;
    });

    updateData({ wholesaleTransactions: updatedTransactions });
    addLog({
      action: 'DEBT_PAYMENT',
      category: 'cash',
      details: `Received/Paid ${data.currency} ${paymentAmount} for wholesale trans ${showPaymentModal.id.split('-')[0]}`
    });

    setShowPaymentModal(null);
    setPaymentAmount(0);
  };

  const partnerTransactions = useMemo(() => {
    if (!selectedPartner) return [];
    return (data.wholesaleTransactions || [])
      .filter(t => t.partnerId === selectedPartner.id)
      .sort((a, b) => b.timestamp - a.timestamp);
  }, [data.wholesaleTransactions, selectedPartner]);

  return (
    <div className="p-8 h-full flex flex-col gap-6 text-start relative bg-zinc-950 light:bg-zinc-50">
       {stockError && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[200] bg-orange-600 text-white px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-3 animate-in slide-in-from-top-4 font-black text-sm border border-orange-500/50">
          <AlertCircle size={20} />
          {stockError}
        </div>
      )}

      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-zinc-800 light:bg-white light:border-zinc-200 border border-zinc-700 rounded-lg text-red-500 light:shadow-sm">
            <Users size={24} />
          </div>
          <div>
            <h3 className="text-2xl font-bold tracking-tight text-zinc-100 light:text-zinc-900">{t.wholesale_mgmt}</h3>
            <p className="text-[10px] text-zinc-500 light:text-zinc-400 uppercase tracking-widest font-black">{lang === 'ar' ? 'سلسلة التوريد والتوزيع B2B' : 'B2B Supply & Distribution Chain'}</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <Search size={18} className={`absolute ${lang === 'ar' ? 'right-3' : 'left-3'} top-1/2 -translate-y-1/2 text-zinc-500`} />
            <input
              type="text"
              placeholder={t.search}
              className={`bg-zinc-900 light:bg-white border border-zinc-800 light:border-zinc-200 rounded-xl py-2.5 ${lang === 'ar' ? 'pr-10 pl-4' : 'pl-10 pr-4'} focus:outline-none focus:border-red-500 w-full sm:w-64 text-sm light:text-zinc-900 light:shadow-sm`}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="flex bg-zinc-900 light:bg-zinc-200 border border-zinc-800 light:border-zinc-300 rounded-xl p-1 gap-1">
            {['all', 'buyer', 'supplier'].map(type => (
              <button
                key={type}
                onClick={() => setPartnerFilter(type as any)}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                  partnerFilter === type 
                  ? 'bg-zinc-800 light:bg-white text-zinc-100 light:text-zinc-900 shadow-sm' 
                  : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                {type === 'all' ? (lang === 'ar' ? 'الكل' : 'All') : t[`wholesale_${type}` as keyof typeof t]}
              </button>
            ))}
          </div>

          <button
            onClick={() => setShowPartnerModal(true)}
            className="bg-red-600 hover:bg-red-700 text-white px-5 py-2.5 rounded-xl flex items-center gap-2 font-black transition-all shadow-xl shadow-red-900/20 text-sm uppercase"
          >
            <Plus size={20} /> {t.add_partner}
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 overflow-hidden">
        <div className="lg:col-span-1 bg-zinc-900/30 light:bg-white border border-zinc-800 light:border-zinc-200 rounded-[32px] overflow-hidden flex flex-col backdrop-blur-sm light:shadow-sm">
          <div className="p-4 bg-black/40 light:bg-zinc-100 border-b border-zinc-800 light:border-zinc-200 text-[10px] uppercase font-black tracking-widest text-zinc-500">
             {lang === 'ar' ? 'السجلات النشطة' : 'Active Records'} ({filteredPartners.length})
          </div>
          <div className="flex-1 overflow-y-auto divide-y divide-zinc-800/50 light:divide-zinc-200 scrollbar-thin">
            {filteredPartners.map(p => (
              <button
                key={p.id}
                onClick={() => setSelectedPartner(p)}
                className={`w-full p-6 text-start hover:bg-zinc-800/30 light:hover:bg-zinc-50 transition-all group flex items-center justify-between ${selectedPartner?.id === p.id ? 'bg-zinc-800/50 light:bg-zinc-100' : ''}`}
              >
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`w-1.5 h-1.5 rounded-full ${p.type === 'buyer' ? 'bg-blue-500' : 'bg-orange-500'}`}></span>
                    <span className="font-bold text-zinc-100 light:text-zinc-900">{p.name}</span>
                  </div>
                  <p className="text-[10px] text-zinc-500 light:text-zinc-400 font-mono truncate max-w-[200px]">{p.contact}</p>
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="lg:col-span-2 bg-zinc-900/10 light:bg-zinc-50 border border-zinc-800 light:border-zinc-200 rounded-[32px] overflow-hidden flex flex-col relative light:shadow-sm">
          {!selectedPartner ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-12">
               <Users size={40} className="text-zinc-700 light:text-zinc-300 mb-4" />
               <p className="text-zinc-500 light:text-zinc-400 text-sm">{lang === 'ar' ? 'اختر شريكاً لعرض سجل الحركات' : 'Select a partner to view bulk history'}</p>
            </div>
          ) : (
            <div className="flex-1 flex flex-col animate-in fade-in duration-300 overflow-hidden">
              <div className="p-8 border-b border-zinc-800 light:border-zinc-200 flex items-start justify-between bg-black/20 light:bg-white shrink-0">
                <div>
                  <div className="flex items-center gap-3">
                    <h4 className="text-3xl font-black tracking-tighter text-zinc-100 light:text-zinc-900 uppercase">{selectedPartner.name}</h4>
                    <span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-widest ${selectedPartner.type === 'buyer' ? 'bg-blue-500/10 text-blue-500 border border-blue-500/20' : 'bg-orange-500/10 text-orange-500 border border-orange-500/20'}`}>
                      {t[`wholesale_${selectedPartner.type}` as keyof typeof t]}
                    </span>
                  </div>
                  <p className="text-xs text-zinc-500 light:text-zinc-400 mt-1">{selectedPartner.contact}</p>
                </div>

                <div className="flex gap-3">
                  <button onClick={() => deletePartner(selectedPartner.id)} className="p-3 hover:bg-red-900/30 text-zinc-600 hover:text-red-500 rounded-xl transition-all"><Trash2 size={20} /></button>
                  <button 
                    onClick={() => { setTransItems([]); setShowTransactionModal(true); }}
                    className="bg-zinc-100 light:bg-zinc-900 light:text-white text-black px-6 py-3 rounded-2xl flex items-center gap-2 font-black text-xs uppercase tracking-widest hover:scale-105 transition-all shadow-xl shadow-black/20"
                  >
                    {selectedPartner.type === 'buyer' ? <ArrowUpRight size={18}/> : <ArrowDownLeft size={18}/>}
                    {selectedPartner.type === 'buyer' ? t.record_bulk_sale : t.record_bulk_purchase}
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-8 space-y-6 scrollbar-thin">
                <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-2">
                  <History size={14}/> {lang === 'ar' ? 'سجل الحركات المالية' : 'Financial Ledger History'}
                </div>
                {partnerTransactions.map(t_item => {
                  const remaining = t_item.total - t_item.paidAmount;
                  return (
                    <div key={t_item.id} className="bg-zinc-900/50 light:bg-white border border-zinc-800 light:border-zinc-200 p-6 rounded-[24px] group light:shadow-sm">
                       <div className="flex justify-between items-start mb-4">
                          <div className="flex items-center gap-3">
                             <div className={`p-2 rounded-lg ${t_item.type === 'sale' ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
                                {t_item.type === 'sale' ? <ArrowUpRight size={20}/> : <ArrowDownLeft size={20}/>}
                             </div>
                             <div>
                                <p className="text-sm font-bold text-zinc-100 light:text-zinc-900 uppercase">{t_item.type === 'sale' ? (lang === 'ar' ? 'مبيعات' : 'Sale') : (lang === 'ar' ? 'مشتريات' : 'Purchase')}</p>
                                <p className="text-[10px] text-zinc-500 light:text-zinc-400 font-mono">{new Date(t_item.timestamp).toLocaleString()}</p>
                             </div>
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="text-end">
                              <p className="text-2xl font-black text-zinc-100 light:text-zinc-900">{data.currency} {t_item.total.toLocaleString()}</p>
                              {remaining > 0 && (
                                  <span className="text-[10px] font-black text-orange-500 bg-orange-500/10 px-2 py-0.5 rounded border border-orange-500/20 uppercase tracking-widest animate-pulse">
                                    {lang === 'ar' ? 'متبقي: ' : 'Rem: '} {data.currency} {remaining.toLocaleString()}
                                  </span>
                              )}
                            </div>
                            {remaining > 0 && (
                              <button onClick={() => setShowPaymentModal(t_item)} className="p-3 bg-orange-600 text-white rounded-xl hover:bg-orange-700 transition-all shadow-lg" title={t.add_payment}><Coins size={20}/></button>
                            )}
                          </div>
                       </div>
                       <div className="grid grid-cols-2 gap-4 pt-4 border-t border-zinc-800/50 light:border-zinc-100">
                          <div>
                            <p className="text-[9px] font-black text-zinc-500 uppercase mb-1">{t.paid_amount}</p>
                            <p className="text-xs font-bold text-zinc-300 light:text-zinc-600">{data.currency} {t_item.paidAmount.toLocaleString()}</p>
                          </div>
                          <div className="text-end">
                            <p className="text-[9px] font-black text-zinc-500 uppercase mb-1">{t.remaining_amount}</p>
                            <p className={`text-xs font-bold ${remaining > 0 ? 'text-orange-500' : 'text-zinc-500'}`}>{data.currency} {remaining.toLocaleString()}</p>
                          </div>
                       </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* مودال التحصيل */}
      {showPaymentModal && (
        <div className="fixed inset-0 z-[210] flex items-center justify-center bg-black/90 backdrop-blur-xl p-4 animate-in fade-in duration-200">
          <div className="bg-zinc-900 light:bg-white border border-zinc-800 light:border-zinc-200 w-full max-w-md rounded-[40px] overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300">
             <div className="p-8 border-b border-zinc-800 light:border-zinc-200 flex justify-between items-center bg-black/20 light:bg-zinc-50">
                <h4 className="text-xl font-black uppercase tracking-tighter light:text-zinc-900">{t.add_payment}</h4>
                <button onClick={() => setShowPaymentModal(null)} className="p-3 hover:bg-zinc-800 light:hover:bg-zinc-100 rounded-full transition-colors text-zinc-500 hover:text-white light:hover:text-zinc-900"><X size={24}/></button>
             </div>
             <div className="p-10 space-y-6">
                <div className="p-6 bg-zinc-950 light:bg-zinc-50 rounded-3xl border border-zinc-800 light:border-zinc-200">
                   <p className="text-[10px] text-zinc-500 light:text-zinc-400 font-black uppercase mb-1">{lang === 'ar' ? 'إجمالي المتبقي' : 'Total Remaining'}</p>
                   <p className="text-3xl font-black text-orange-500">{data.currency} {(showPaymentModal.total - showPaymentModal.paidAmount).toLocaleString()}</p>
                </div>
                <div>
                   <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 light:text-zinc-400 block mb-2">{t.payment_amount}</label>
                   <input type="number" autoFocus className="w-full bg-black light:bg-zinc-100 border border-zinc-800 light:border-zinc-200 rounded-2xl px-6 py-4 focus:outline-none focus:border-red-500 text-zinc-100 light:text-zinc-900 font-black text-2xl" value={paymentAmount} onChange={e => setPaymentAmount(parseFloat(e.target.value) || 0)} />
                </div>
             </div>
             <div className="p-8 bg-black/40 light:bg-zinc-50 border-t border-zinc-800 light:border-zinc-200 flex gap-4">
                <button onClick={() => setShowPaymentModal(null)} className="flex-1 py-4 bg-zinc-800 light:bg-zinc-200 text-zinc-400 light:text-zinc-600 font-black uppercase tracking-widest text-xs rounded-2xl">{t.discard}</button>
                <button onClick={handleDebtPayment} className="flex-1 py-4 bg-red-600 text-white font-black uppercase tracking-widest text-xs rounded-2xl shadow-xl shadow-red-900/30">{t.save_ledger}</button>
             </div>
          </div>
        </div>
      )}

      {/* بقية المودالات (إضافة شريك، معاملة جديدة) */}
      {showPartnerModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="bg-zinc-900 light:bg-white border border-zinc-800 light:border-zinc-200 w-full max-w-lg rounded-[40px] overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300">
            <div className="p-8 border-b border-zinc-800 light:border-zinc-200 flex justify-between items-center bg-black/20 light:bg-zinc-50">
              <h4 className="text-2xl font-black tracking-tighter uppercase light:text-zinc-900">{t.add_partner}</h4>
              <button onClick={() => setShowPartnerModal(false)} className="p-3 hover:bg-zinc-800 light:hover:bg-zinc-100 rounded-full transition-colors text-zinc-500 hover:text-white light:hover:text-zinc-900"><X size={24}/></button>
            </div>
            <div className="p-10 space-y-6 text-start">
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 block mb-2">{lang === 'ar' ? 'نوع الشريك' : 'Partner Type'}</label>
                <div className="grid grid-cols-2 gap-4">
                  <button onClick={() => setPartnerForm({...partnerForm, type: 'buyer'})} className={`py-4 rounded-2xl font-black text-xs uppercase tracking-widest border transition-all ${partnerForm.type === 'buyer' ? 'bg-blue-600 border-blue-500 text-white' : 'bg-zinc-800 light:bg-zinc-100 border-zinc-700 light:border-zinc-200 text-zinc-500 light:text-zinc-400'}`}>{t.wholesale_buyer}</button>
                  <button onClick={() => setPartnerForm({...partnerForm, type: 'supplier'})} className={`py-4 rounded-2xl font-black text-xs uppercase tracking-widest border transition-all ${partnerForm.type === 'supplier' ? 'bg-orange-600 border-orange-500 text-white' : 'bg-zinc-800 light:bg-zinc-100 border-zinc-700 light:border-zinc-200 text-zinc-500 light:text-zinc-400'}`}>{t.wholesale_supplier}</button>
                </div>
              </div>
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 block mb-2">{t.entity_name}</label>
                <input type="text" autoFocus className="w-full bg-black light:bg-zinc-100 border border-zinc-800 light:border-zinc-200 rounded-2xl px-6 py-4 focus:outline-none focus:border-red-500 text-zinc-100 light:text-zinc-900 font-bold" value={partnerForm.name} onChange={e => setPartnerForm({...partnerForm, name: e.target.value})} />
              </div>
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 block mb-2">{t.contact_details}</label>
                <input type="text" className="w-full bg-black light:bg-zinc-100 border border-zinc-800 light:border-zinc-200 rounded-2xl px-6 py-4 focus:outline-none focus:border-red-500 text-zinc-100 light:text-zinc-900 font-mono" value={partnerForm.contact} onChange={e => setPartnerForm({...partnerForm, contact: e.target.value})} />
              </div>
            </div>
            <div className="p-8 bg-black/40 light:bg-zinc-50 border-t border-zinc-800 light:border-zinc-200 flex gap-4">
              <button onClick={() => setShowPartnerModal(false)} className="flex-1 py-4 bg-zinc-800 light:bg-zinc-200 text-zinc-400 light:text-zinc-600 font-black uppercase tracking-widest text-xs rounded-2xl">{t.discard}</button>
              <button onClick={savePartner} className="flex-1 py-4 bg-red-600 text-white font-black uppercase tracking-widest text-xs rounded-2xl shadow-xl shadow-red-900/30">{t.save_ledger}</button>
            </div>
          </div>
        </div>
      )}

      {showTransactionModal && selectedPartner && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="bg-zinc-900 light:bg-white border border-zinc-800 light:border-zinc-200 w-full max-w-5xl rounded-[40px] overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300 flex flex-col max-h-[90vh]">
            <div className="p-8 border-b border-zinc-800 light:border-zinc-200 flex justify-between items-center bg-black/20 light:bg-zinc-50 shrink-0">
               <div>
                 <h4 className="text-2xl font-black uppercase tracking-tighter light:text-zinc-900">{selectedPartner.type === 'buyer' ? t.bulk_dispatch : t.bulk_ingestion}</h4>
                 <p className="text-[10px] text-zinc-500 light:text-zinc-400 uppercase font-black tracking-widest">{selectedPartner.name}</p>
               </div>
               <button onClick={() => setShowTransactionModal(false)} className="p-3 hover:bg-zinc-800 light:hover:bg-zinc-100 rounded-full transition-colors text-zinc-500 hover:text-white light:hover:text-zinc-900"><X size={24}/></button>
            </div>
            <div className="flex-1 flex overflow-hidden">
               <div className="w-1/2 border-r border-zinc-800 light:border-zinc-200 flex flex-col p-8 space-y-6">
                 <div className="relative">
                    <Search className={`absolute ${lang === 'ar' ? 'right-4' : 'left-4'} top-1/2 -translate-y-1/2 text-zinc-500`} size={18} />
                    <input type="text" placeholder={t.search} className={`w-full bg-black light:bg-white border border-zinc-800 light:border-zinc-200 rounded-xl py-3 ${lang === 'ar' ? 'pr-12 pl-4' : 'pl-12 pr-4'} focus:outline-none focus:border-red-500 text-sm`} value={productSearch} onChange={e => setProductSearch(e.target.value)} />
                 </div>
                 <div className="flex-1 overflow-y-auto space-y-2 scrollbar-thin">
                    {(data.products || []).filter(p => p.name.toLowerCase().includes(productSearch.toLowerCase())).map(p => (
                      <button key={p.id} onClick={() => addItemToTrans(p)} className="w-full p-4 bg-zinc-800/40 light:bg-zinc-100 hover:bg-zinc-800 light:hover:bg-zinc-200 rounded-2xl text-start flex items-center justify-between group transition-all">
                        <div>
                          <p className="font-bold text-zinc-100 light:text-zinc-900">{p.name}</p>
                          <p className="text-[10px] text-zinc-500 light:text-zinc-400 font-black uppercase">{t.stock_level}: {p.stock}</p>
                        </div>
                        <Plus size={18} className="text-zinc-700 light:text-zinc-300 group-hover:text-red-500" />
                      </button>
                    ))}
                 </div>
               </div>
               <div className="w-1/2 flex flex-col bg-black/10 light:bg-zinc-50">
                 <div className="flex-1 overflow-y-auto p-8 space-y-4 scrollbar-thin">
                    {transItems.map((item, idx) => {
                      const prod = data.products.find(p => p.id === item.productId);
                      return (
                        <div key={idx} className="bg-zinc-900 light:bg-white border border-zinc-800 light:border-zinc-200 p-4 rounded-2xl flex items-center gap-4 animate-in slide-in-from-right-4 light:shadow-sm">
                           <div className="flex-1 min-w-0">
                             <p className="font-bold text-sm text-zinc-100 light:text-zinc-900 truncate">{prod?.name}</p>
                             <div className="flex gap-2 mt-2">
                                <div className="flex-1">
                                  <label className="text-[8px] uppercase font-black text-zinc-600">{lang === 'ar' ? 'الكمية' : 'Qty'}</label>
                                  <input type="number" className="w-full bg-black light:bg-zinc-100 border border-zinc-800 light:border-zinc-200 rounded-lg px-2 py-1 text-xs text-zinc-100 light:text-zinc-900 font-bold" value={item.quantity} onChange={e => {
                                      const updated = [...transItems];
                                      updated[idx].quantity = parseInt(e.target.value) || 0;
                                      setTransItems(updated);
                                  }} />
                                </div>
                                <div className="flex-1">
                                  <label className="text-[8px] uppercase font-black text-zinc-600">{lang === 'ar' ? 'سعر الوحدة' : 'Unit Price'}</label>
                                  <input type="number" className="w-full bg-black light:bg-zinc-100 border border-zinc-800 light:border-zinc-200 rounded-lg px-2 py-1 text-xs text-red-500 font-bold" value={item.unitPrice} onChange={e => {
                                      const updated = [...transItems];
                                      updated[idx].unitPrice = parseFloat(e.target.value) || 0;
                                      setTransItems(updated);
                                  }} />
                                </div>
                             </div>
                           </div>
                           <button onClick={() => setTransItems(transItems.filter((_, i) => i !== idx))} className="text-zinc-700 light:text-zinc-300 hover:text-red-500 p-2"><Trash2 size={16}/></button>
                        </div>
                      );
                    })}
                 </div>
                 <div className="p-8 border-t border-zinc-800 light:border-zinc-200 bg-black/40 light:bg-zinc-100 shrink-0 space-y-6">
                    <div className="grid grid-cols-2 gap-6">
                       <div className="p-4 bg-zinc-900 light:bg-white rounded-2xl border border-zinc-800 light:border-zinc-200 light:shadow-sm">
                          <label className="text-[10px] font-black uppercase text-zinc-500 block mb-1">{t.total}</label>
                          <p className="text-2xl font-black text-zinc-100 light:text-zinc-900">{data.currency} {currentTotal.toLocaleString()}</p>
                       </div>
                       <div className="p-4 bg-zinc-900 light:bg-white rounded-2xl border border-orange-500/30 light:shadow-sm">
                          <label className="text-[10px] font-black uppercase text-orange-500 block mb-1">{t.paid_amount}</label>
                          <div className="flex items-center gap-2">
                             <span className="text-xs font-black text-zinc-500">{data.currency}</span>
                             <input 
                              type="number" 
                              className="w-full bg-transparent border-none p-0 text-xl font-black text-zinc-100 light:text-zinc-900 focus:ring-0" 
                              value={paidAmount} 
                              onChange={e => setPaidAmount(parseFloat(e.target.value) || 0)}
                             />
                          </div>
                       </div>
                    </div>
                    <div className="flex justify-between items-center">
                       <div className="text-start">
                         <p className="text-[10px] font-black uppercase text-zinc-500 tracking-widest">{t.remaining_amount}</p>
                         <p className={`text-2xl font-black tracking-tighter ${currentTotal - paidAmount > 0 ? 'text-orange-500' : 'text-zinc-500'}`}>
                           {data.currency} {(currentTotal - paidAmount).toLocaleString()}
                         </p>
                       </div>
                       <button onClick={finalizeTransaction} disabled={transItems.length === 0} className="bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white px-10 py-5 rounded-2xl font-black uppercase tracking-widest text-xs transition-all flex items-center gap-3 shadow-2xl shadow-red-900/40 uppercase tracking-widest"><Save size={18} /> {t.finalize_settlement}</button>
                    </div>
                 </div>
               </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WholesaleScreen;
