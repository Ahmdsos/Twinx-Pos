import React, { useState, useMemo } from 'react';
import { AppData, Sale, LogEntry, WholesaleTransaction, SaleReturn, ReturnItem } from '../types';
import { Language, translations } from '../translations';
import { RotateCcw, Search, CheckCircle2, AlertTriangle, ArrowLeft, Package, Minus, Plus, History, Receipt, User, Info } from 'lucide-react';
import { TwinXOps } from '../services/operations';

interface ReturnsScreenProps {
  data: AppData;
  updateData: (newData: Partial<AppData>) => void;
  addLog: (log: Omit<LogEntry, 'id' | 'timestamp'>) => void;
  lang: Language;
}

const ReturnsScreen: React.FC<ReturnsScreenProps> = ({ data, updateData, addLog, lang }) => {
  const t = translations[lang];
  const [activeTab, setActiveTab] = useState<'process' | 'history'>('process');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedEntry, setSelectedEntry] = useState<{ id: string; type: 'retail' | 'wholesale'; original: any } | null>(null);
  const [returnQuantities, setReturnQuantities] = useState<Record<string, number>>({});
  const [isProcessing, setIsProcessing] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const unifiedSearch = useMemo(() => {
    const term = searchTerm.toLowerCase().trim();
    
    const retail = (data.sales || [])
      .map(s => ({ id: s.id, type: 'retail' as const, date: s.timestamp, total: s.total, original: s }));

    const wholesale = (data.wholesaleTransactions || [])
      .map(w => ({ id: w.id, type: 'wholesale' as const, date: w.timestamp, total: w.total, original: w }));

    const all = [...retail, ...wholesale].sort((a, b) => b.date - a.date);

    if (!term) return all.slice(0, 20);
    
    return all.filter(entry => 
      entry.id.toLowerCase().includes(term) || 
      (entry.type === 'wholesale' && entry.original.partnerId && 
        data.partners.find(p => p.id === entry.original.partnerId)?.name.toLowerCase().includes(term)) ||
      (entry.type === 'retail' && entry.original.deliveryDetails?.customerName?.toLowerCase().includes(term))
    );
  }, [data.sales, data.wholesaleTransactions, data.partners, searchTerm]);

  const handleSelect = (entry: any) => {
    setSelectedEntry(entry);
    const initialQuants: Record<string, number> = {};
    const items = entry.original?.items || [];
    items.forEach((item: any) => {
      const id = entry.type === 'retail' ? item.id : item.productId;
      initialQuants[id] = 0;
    });
    setReturnQuantities(initialQuants);
    setError(null);
  };

  const handleProcessReturn = () => {
    if (!selectedEntry) return;
    
    const returnItems: ReturnItem[] = [];
    const items = selectedEntry.original?.items || [];

    Object.entries(returnQuantities).forEach(([productId, qty]) => {
      if (qty > 0) {
        // Find item in original sale to get price for record
        const item = items.find((i: any) => (selectedEntry.type === 'retail' ? i.id : i.productId) === productId);
        if (item) {
          const price = selectedEntry.type === 'retail' ? item.price : item.unitPrice;
          returnItems.push({ 
            productId, 
            quantity: qty, 
            refundAmount: price * qty // TwinXOps will refine this with the Golden Ratio
          });
        }
      }
    });

    if (returnItems.length === 0) {
      setError(lang === 'ar' ? 'يرجى اختيار صنف واحد على الأقل للإرجاع' : 'Select at least one item to return');
      return;
    }

    setIsProcessing(true);

    try {
      if (selectedEntry.type === 'retail') {
        const returnRecord: SaleReturn = {
          id: crypto.randomUUID(),
          saleId: selectedEntry.id,
          timestamp: Date.now(),
          items: returnItems,
          totalRefund: 0, // Calculated by Ops
          customerName: selectedEntry.original.deliveryDetails?.customerName || (lang === 'ar' ? 'عميل كاش' : 'Cash Customer')
        };

        const updatedState = TwinXOps.processReturn(data, returnRecord);
        updateData(updatedState);
      } else {
        // Wholesale returns logic (Simple restock and record for now as per TwinX Alpha)
        const updatedProducts = data.products.map(p => {
          const returned = returnItems.find(ri => ri.productId === p.id);
          if (returned) {
            const isOutward = selectedEntry.original.type === 'sale';
            return { ...p, stock: isOutward ? p.stock + returned.quantity : p.stock - returned.quantity };
          }
          return p;
        });

        const newReturnRecord: SaleReturn = {
          id: crypto.randomUUID(),
          saleId: selectedEntry.id,
          timestamp: Date.now(),
          items: returnItems,
          totalRefund: returnItems.reduce((acc, i) => acc + i.refundAmount, 0),
          customerName: data.partners.find(p => p.id === selectedEntry.original.partnerId)?.name
        };

        updateData({
          products: updatedProducts,
          returns: [newReturnRecord, ...(data.returns || [])]
        });
        
        addLog({
          action: 'WHOLESALE_RETURN',
          category: 'wholesale',
          details: `Processed wholesale return for ${newReturnRecord.customerName}`
        });
      }

      setTimeout(() => {
        setIsProcessing(false);
        setSuccess(true);
        setTimeout(() => { 
          setSuccess(false); 
          setSelectedEntry(null); 
          setSearchTerm(''); 
        }, 1500);
      }, 800);

    } catch (err: any) {
      setIsProcessing(false);
      setError(err.message || 'Operation Failed');
    }
  };

  return (
    <div className="p-8 h-full flex flex-col gap-6 text-start bg-zinc-950 light:bg-zinc-50">
      {error && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[200] bg-red-600 text-white px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-3 animate-in slide-in-from-top-4 font-black text-sm border border-red-500/50">
          <AlertTriangle size={20} />
          {error}
        </div>
      )}

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-orange-600 rounded-lg shadow-lg shadow-orange-900/20">
            <RotateCcw size={24} className="text-white" />
          </div>
          <div>
            <h3 className="text-2xl font-bold text-zinc-100 light:text-zinc-900">{t.returns_mgmt}</h3>
            <p className="text-[10px] text-zinc-500 light:text-zinc-400 uppercase tracking-widest font-black">المرتجع الذكي - فحص حي للفواتير</p>
          </div>
        </div>
        <div className="flex bg-zinc-900 light:bg-zinc-200 border border-zinc-800 light:border-zinc-300 rounded-xl p-1 shrink-0">
          <button onClick={() => { setActiveTab('process'); setSelectedEntry(null); }} className={`px-6 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2 ${activeTab === 'process' ? 'bg-orange-600 text-white shadow-lg' : 'text-zinc-500 hover:text-zinc-300'}`}><RotateCcw size={14} /> {t.process_return}</button>
          <button onClick={() => setActiveTab('history')} className={`px-6 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2 ${activeTab === 'history' ? 'bg-orange-600 text-white shadow-lg' : 'text-zinc-500 hover:text-zinc-300'}`}><History size={14} /> {t.returns_history}</button>
        </div>
      </div>

      {activeTab === 'process' ? (
        <>
          {!selectedEntry ? (
            <div className="flex-1 flex flex-col gap-6 overflow-hidden">
              <div className="relative">
                <Search className={`absolute ${lang === 'ar' ? 'right-4' : 'left-4'} top-1/2 -translate-y-1/2 text-zinc-500`} size={20} />
                <input type="text" placeholder={t.search_invoice} className={`w-full bg-zinc-900 light:bg-white border border-zinc-800 light:border-zinc-200 rounded-2xl py-4 ${lang === 'ar' ? 'pr-12 pl-4' : 'pl-12 pr-4'} focus:outline-none focus:border-orange-500 transition-all font-bold text-zinc-100 light:text-zinc-900 shadow-xl light:shadow-sm`} value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
              </div>
              <div className="flex-1 bg-zinc-900/30 light:bg-white border border-zinc-800 light:border-zinc-200 rounded-[32px] overflow-hidden flex flex-col backdrop-blur-sm light:shadow-sm">
                <div className="p-4 bg-black/40 light:bg-zinc-100 border-b border-zinc-800 light:border-zinc-200 text-[10px] uppercase font-black tracking-widest text-zinc-500 px-6">
                  {lang === 'ar' ? 'اختر فاتورة للبدء' : 'Select an invoice to start'}
                </div>
                <div className="overflow-y-auto flex-1 scrollbar-thin">
                  <table className="w-full text-start border-collapse">
                    <thead>
                      <tr className="bg-black/20 light:bg-zinc-50 text-[10px] uppercase font-black tracking-widest text-zinc-600 light:text-zinc-400 border-b border-zinc-800 light:border-zinc-200">
                        <th className="px-8 py-5"># ID</th>
                        <th className="px-8 py-5">{lang === 'ar' ? 'العميل / التاجر' : 'Customer / Partner'}</th>
                        <th className="px-8 py-5 text-start">{t.total}</th>
                        <th className="px-8 py-5 text-end">{t.actions}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800/50 light:divide-zinc-200">
                      {unifiedSearch.map(entry => (
                        <tr key={entry.id} className="hover:bg-zinc-800/30 light:hover:bg-zinc-50 transition-colors">
                          <td className="px-8 py-4 font-mono text-xs text-zinc-400">{entry.id.split('-')[0].toUpperCase()}</td>
                          <td className="px-8 py-4 text-xs font-bold text-zinc-300 light:text-zinc-600">
                            {entry.type === 'retail' ? (entry.original.deliveryDetails?.customerName || (lang === 'ar' ? 'عميل كاش' : 'Cash Customer')) : data.partners.find(p => p.id === entry.original.partnerId)?.name}
                          </td>
                          <td className="px-8 py-4 font-bold text-zinc-100 light:text-zinc-900">{data.currency} {entry.total.toLocaleString()}</td>
                          <td className="px-8 py-4 text-end"><button onClick={() => handleSelect(entry)} className="bg-zinc-800 light:bg-zinc-100 hover:bg-orange-600 light:hover:bg-orange-600 text-zinc-300 light:text-zinc-600 hover:text-white px-4 py-2 rounded-xl text-xs font-bold transition-all">{t.select_for_return}</button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col gap-6 animate-in slide-in-from-right-8 duration-300 overflow-hidden">
              <button onClick={() => setSelectedEntry(null)} className="flex items-center gap-2 text-zinc-500 hover:text-white light:hover:text-zinc-900 transition-colors font-bold text-sm w-fit group"><ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform"/> {lang === 'ar' ? 'رجوع للفواتير' : 'Back to Invoices'}</button>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 overflow-hidden">
                <div className="lg:col-span-2 bg-zinc-900/30 light:bg-white border border-zinc-800 light:border-zinc-200 rounded-[32px] p-8 space-y-6 overflow-y-auto scrollbar-thin light:shadow-sm">
                  <h4 className="text-sm font-bold text-zinc-100 light:text-zinc-900 flex items-center gap-2 uppercase tracking-widest"><RotateCcw size={18} className="text-orange-500" /> {lang === 'ar' ? 'محتويات الفاتورة' : 'Invoice Items'}</h4>
                  <div className="space-y-3">
                    {(selectedEntry.original?.items || []).map((item: any) => {
                      const id = selectedEntry.type === 'retail' ? item.id : item.productId;
                      const previouslyReturned = item.returnedQuantity || 0;
                      const availableToReturn = item.quantity - previouslyReturned;
                      const qtyRequested = returnQuantities[id] || 0;
                      const isFullyReturned = availableToReturn <= 0;

                      return (
                        <div 
                          key={id} 
                          className={`bg-zinc-800/50 light:bg-zinc-50 border border-zinc-700/50 light:border-zinc-200 p-4 rounded-2xl flex items-center justify-between transition-all ${isFullyReturned ? 'opacity-40 grayscale pointer-events-none' : ''}`}
                        >
                          <div className="flex items-center gap-4 text-start">
                            <div className="w-10 h-10 rounded-lg bg-zinc-900 light:bg-white flex items-center justify-center border border-zinc-800 light:border-zinc-200"><Package size={20} className="text-zinc-600" /></div>
                            <div>
                                <p className="font-bold text-zinc-100 light:text-zinc-900 leading-tight mb-1">{item.name}</p>
                                <div className="flex items-center gap-3">
                                   <span className="text-[9px] font-black uppercase text-zinc-500">{lang === 'ar' ? 'المباع' : 'Sold'}: {item.quantity}</span>
                                   <span className="text-[9px] font-black uppercase text-orange-500">{lang === 'ar' ? 'المرتجع سابقاً' : 'Prev'}: {previouslyReturned}</span>
                                   <span className="text-[9px] font-black uppercase text-green-500 bg-green-500/10 px-1 rounded">{lang === 'ar' ? 'متاح' : 'Avail'}: {availableToReturn}</span>
                                </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-3 bg-zinc-950 light:bg-white p-1.5 rounded-xl border border-zinc-800 light:border-zinc-200">
                              <button 
                                onClick={() => setReturnQuantities({...returnQuantities, [id]: Math.max(0, qtyRequested - 1)})} 
                                disabled={isFullyReturned || qtyRequested <= 0}
                                className="w-8 h-8 rounded-lg bg-zinc-800 light:bg-zinc-100 flex items-center justify-center text-zinc-400 disabled:opacity-20 transition-all"
                              >
                                <Minus size={14}/>
                              </button>
                              <input 
                                type="number" 
                                value={qtyRequested} 
                                readOnly 
                                className="w-12 bg-transparent border-none p-0 text-center font-black text-orange-500 focus:ring-0" 
                              />
                              <button 
                                onClick={() => setReturnQuantities({...returnQuantities, [id]: Math.min(availableToReturn, qtyRequested + 1)})} 
                                disabled={isFullyReturned || qtyRequested >= availableToReturn}
                                className="w-8 h-8 rounded-lg bg-zinc-800 light:bg-zinc-100 flex items-center justify-center text-zinc-400 disabled:opacity-20 transition-all"
                              >
                                <Plus size={14}/>
                              </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
                <div className="bg-zinc-900 light:bg-white border border-zinc-800 light:border-zinc-200 rounded-[32px] p-8 flex flex-col gap-6 light:shadow-sm">
                  <div className="p-6 bg-black/20 light:bg-zinc-50 rounded-3xl border border-zinc-800 light:border-zinc-200">
                    <p className="text-[10px] text-zinc-500 uppercase font-black mb-1">المبلغ المرتجع التقديري</p>
                    <p className="text-4xl font-black text-orange-500 tracking-tighter">
                      {data.currency} {Object.entries(returnQuantities).reduce((acc, [id, q]) => {
                        const item = selectedEntry.original.items.find((i: any) => (selectedEntry.type === 'retail' ? i.id : i.productId) === id);
                        return acc + ((selectedEntry.type === 'retail' ? item?.price : item?.unitPrice) || 0) * q;
                      }, 0).toLocaleString()}
                    </p>
                    <p className="text-[9px] text-zinc-500 mt-2 flex items-center gap-1.5"><Info size={10}/> {lang === 'ar' ? 'سيتم تطبيق الخصم النسبي تلقائياً' : 'Proportional discount applied automatically'}</p>
                  </div>
                  <button 
                    onClick={handleProcessReturn} 
                    disabled={isProcessing}
                    className="w-full py-5 bg-orange-600 text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl disabled:opacity-50 flex items-center justify-center gap-2 transition-all"
                  >
                    {isProcessing ? <RotateCcw size={18} className="animate-spin" /> : t.authorize_refund}
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="flex-1 bg-zinc-900/30 light:bg-white border border-zinc-800 light:border-zinc-200 rounded-[32px] overflow-hidden flex flex-col light:shadow-sm">
           <div className="overflow-y-auto flex-1 scrollbar-thin">
              <table className="w-full text-start border-collapse">
                <thead>
                  <tr className="bg-black/20 light:bg-zinc-50 text-[10px] uppercase font-black tracking-widest text-zinc-600 light:text-zinc-400 border-b border-zinc-800 light:border-zinc-200">
                    <th className="px-8 py-5 text-start">{t.time}</th>
                    <th className="px-8 py-5 text-start">العميل / التاجر</th>
                    <th className="px-8 py-5 text-start">{t.total_refund}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/50 light:divide-zinc-200">
                  {(data.returns || []).map(ret => (
                    <tr key={ret.id}>
                      <td className="px-8 py-4 text-xs font-mono text-zinc-400">{new Date(ret.timestamp).toLocaleString()}</td>
                      <td className="px-8 py-4 text-xs font-bold text-zinc-300 light:text-zinc-600 flex items-center gap-2"><User size={12}/> {ret.customerName || '---'}</td>
                      <td className="px-8 py-4 font-black text-orange-500">{data.currency} {ret.totalRefund.toLocaleString()}</td>
                    </tr>
                  ))}
                  {(!data.returns || data.returns.length === 0) && (
                    <tr>
                      <td colSpan={3} className="px-8 py-20 text-center opacity-20 grayscale">
                        <History size={48} className="mx-auto mb-4" />
                        <p className="text-xs font-black uppercase tracking-widest">{lang === 'ar' ? 'لا توجد مرتجعات مسجلة' : 'No recorded returns'}</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
           </div>
        </div>
      )}

      {success && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/90 backdrop-blur-xl animate-in fade-in duration-300">
           <div className="bg-zinc-900 light:bg-white border border-zinc-800 light:border-zinc-200 p-12 rounded-[40px] text-center space-y-6 shadow-2xl animate-in zoom-in-95 duration-300">
              <div className="w-20 h-20 bg-green-500/10 rounded-full flex items-center justify-center mx-auto text-green-500 border border-green-500/20">
                <CheckCircle2 size={40} />
              </div>
              <div className="space-y-2">
                <h3 className="text-3xl font-black uppercase tracking-tighter light:text-zinc-900">{t.return_finalized}</h3>
                <p className="text-zinc-500 text-sm font-bold">{t.restock_notice}</p>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default ReturnsScreen;