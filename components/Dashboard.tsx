import React, { useMemo, useState } from 'react';
import { AppData, Sale, ViewType, WholesaleTransaction } from '../types';
import { 
  TrendingUp, 
  AlertCircle, 
  DollarSign, 
  Clock, 
  Receipt, 
  Zap, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Users, 
  ShoppingCart,
  X,
  Package
} from 'lucide-react';
import { translations, Language } from '../translations';

interface DashboardProps {
  data: AppData;
  lang: Language;
  setView: (view: ViewType) => void;
  onSelectSale: (sale: Sale) => void;
  cashBalance: number;
}

const Dashboard: React.FC<DashboardProps> = ({ data, lang, setView, onSelectSale }) => {
  const today = new Date().setHours(0, 0, 0, 0);
  const t = translations[lang];
  const [detailModal, setDetailModal] = useState<'today' | 'receivables' | 'payables' | null>(null);
  
  const stats = useMemo(() => {
    // Defensive access to arrays
    const sales = data?.sales || [];
    const wholesaleTrans = data?.wholesaleTransactions || [];
    const expenses = data?.expenses || [];
    const returns = data?.returns || [];
    const initialCash = data?.initialCash || 0;
    const salaryTrans = data?.salaryTransactions || [];

    // Today's stats (based on Paid Amount for financial reality)
    const todaySales = sales.filter(s => new Date(s.timestamp).setHours(0, 0, 0, 0) === today);
    const todayWholesaleSales = wholesaleTrans
      .filter(t => t.type === 'sale' && new Date(t.timestamp).setHours(0, 0, 0, 0) === today);
    
    const todayExpenses = expenses.filter(e => new Date(e.timestamp).setHours(0, 0, 0, 0) === today);
    const todayWholesalePurchases = wholesaleTrans
      .filter(t => t.type === 'purchase' && new Date(t.timestamp).setHours(0, 0, 0, 0) === today);

    // Financial Truth Logic: Revenue = Paid In, Costs = Paid Out
    const totalPaidIn = sales.reduce((acc, s) => acc + (s.paidAmount || s.total), 0) + 
                      wholesaleTrans.filter(t => t.type === 'sale').reduce((acc, t) => acc + (t.paidAmount || 0), 0);
    
    const totalPaidOut = expenses.reduce((acc, e) => acc + e.amount, 0) + 
                       returns.reduce((acc, r) => acc + r.totalRefund, 0) +
                       wholesaleTrans.filter(t => t.type === 'purchase').reduce((acc, t) => acc + (t.paidAmount || 0), 0) +
                       salaryTrans.reduce((acc, st) => acc + st.amount, 0);

    const netCash = initialCash + totalPaidIn - totalPaidOut;

    // Receivables Logic (Wholesale Debt + Retail Debt)
    const wholesaleReceivables = wholesaleTrans
      .filter(t => t.type === 'sale')
      .reduce((acc, t) => acc + (t.total - (t.paidAmount || 0)), 0);
    
    const retailReceivables = sales.reduce((acc, s) => acc + (s.remainingAmount || 0), 0);
    const totalReceivables = wholesaleReceivables + retailReceivables;

    // Payables Logic (Supplier Debt)
    const totalPayables = wholesaleTrans
      .filter(t => t.type === 'purchase')
      .reduce((acc, t) => acc + (t.total - (t.paidAmount || 0)), 0);

    // Stock
    const lowStockItems = (data?.products || []).filter(p => p.stock <= (p.minStock || 5));

    const todayRevTotal = todaySales.reduce((acc, s) => acc + s.total, 0) + todayWholesaleSales.reduce((acc, t) => acc + t.total, 0);
    const todayCostTotal = todayExpenses.reduce((acc, e) => acc + e.amount, 0) + todayWholesalePurchases.reduce((acc, t) => acc + t.paidAmount, 0);

    return {
      todayRevenue: todayRevTotal,
      todayCosts: todayCostTotal,
      todayCount: todaySales.length + todayWholesaleSales.length,
      netCash: netCash,
      lowStockCount: lowStockItems.length,
      receivables: totalReceivables,
      payables: totalPayables,
      margin: (todayRevTotal - todayCostTotal) / (todayRevTotal || 1) * 100
    };
  }, [data, today]);

  const debtorList = useMemo(() => {
    const balances: Record<string, { name: string; contact: string; balance: number; type: 'retail' | 'wholesale' }> = {};
    
    // Wholesale Debtors
    (data.wholesaleTransactions || []).filter(t => t.type === 'sale').forEach(t => {
      const partner = data.partners.find(p => p.id === t.partnerId);
      if (partner) {
        const debt = t.total - t.paidAmount;
        if (debt > 0) {
          if (!balances[partner.id]) balances[partner.id] = { name: partner.name, contact: partner.contact, balance: 0, type: 'wholesale' };
          balances[partner.id].balance += debt;
        }
      }
    });

    // Retail Debtors (Customers with balance)
    (data.sales || []).filter(s => (s.remainingAmount || 0) > 0).forEach(s => {
      const customer = data.customers.find(c => c.id === s.customerId);
      const name = customer?.name || s.deliveryDetails?.customerName || t.cash_customer;
      const contact = customer?.phone || s.deliveryDetails?.customerPhone || '---';
      const id = customer?.id || s.id; // Fallback to sale ID if not a registered customer
      
      if (!balances[id]) balances[id] = { name, contact, balance: 0, type: 'retail' };
      balances[id].balance += (s.remainingAmount || 0);
    });

    return Object.values(balances).filter(b => b.balance > 0).sort((a, b) => b.balance - a.balance);
  }, [data, t.cash_customer]);

  const creditorList = useMemo(() => {
    const balances: Record<string, number> = {};
    (data.wholesaleTransactions || []).filter(t => t.type === 'purchase').forEach(t => {
      balances[t.partnerId] = (balances[t.partnerId] || 0) + (t.total - t.paidAmount);
    });
    return Object.entries(balances)
      .filter(([_, bal]) => bal > 0)
      .map(([id, bal]) => ({ partner: data.partners.find(p => p.id === id), balance: bal }));
  }, [data.wholesaleTransactions, data.partners]);

  const todayTransactions = useMemo(() => {
    const retail = (data.sales || []).filter(s => new Date(s.timestamp).setHours(0, 0, 0, 0) === today).map(s => ({ ...s, type: 'retail' }));
    const wholesale = (data.wholesaleTransactions || [])
      .filter(t => t.type === 'sale' && new Date(t.timestamp).setHours(0, 0, 0, 0) === today).map(t => ({ ...t, type: 'wholesale' }));
    return [...retail, ...wholesale].sort((a, b) => b.timestamp - a.timestamp);
  }, [data.sales, data.wholesaleTransactions, today]);

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto text-start overflow-y-auto h-full scrollbar-thin pb-20">
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-6">
        
        {/* Total Liquidity Card */}
        <div className="lg:col-span-2 xl:col-span-1 bg-zinc-900 light:bg-white p-8 rounded-[40px] border border-zinc-800 light:border-zinc-200 shadow-2xl relative overflow-hidden group transition-all duration-300">
          <div className="absolute top-0 right-0 p-8 opacity-10 light:opacity-5 group-hover:scale-110 transition-transform">
             <DollarSign size={120} className="text-red-600" />
          </div>
          <div className="relative z-10 space-y-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-red-600 rounded-2xl shadow-lg shadow-red-900/40">
                <TrendingUp size={24} className="text-white" />
              </div>
              <div>
                <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-500 light:text-zinc-900">{t.net_position}</h4>
                <p className="text-xs font-bold text-zinc-400 light:text-zinc-50">{t.cash_on_hand}</p>
              </div>
            </div>
            <div>
              <p className="text-5xl font-black tracking-tighter text-zinc-100 light:text-zinc-900">
                <span className="text-red-600 text-3xl me-1">{data.currency}</span>
                {stats.netCash.toLocaleString()}
              </p>
            </div>
            <button onClick={() => setView('reports')} className="text-[10px] font-black uppercase text-zinc-500 light:text-zinc-600 hover:text-red-500 flex items-center gap-2 transition-all">
              {lang === 'ar' ? 'عرض السجل المالي الموحد' : 'View Unified Financial Ledger'} <ArrowUpRight size={14}/>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6">
           <button 
             onClick={() => setDetailModal('today')}
             className="bg-zinc-900/50 light:bg-white p-6 rounded-[32px] border border-zinc-800 light:border-zinc-200 text-start hover:bg-zinc-800/80 light:hover:bg-zinc-50 transition-all group shadow-sm"
           >
              <div className="flex justify-between items-center mb-4">
                <div className="p-2 bg-zinc-900 light:bg-zinc-100 rounded-xl text-emerald-500"><ShoppingCart size={20} /></div>
                <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500 light:text-zinc-900">{t.today_revenue}</span>
              </div>
              <p className="text-3xl font-black text-zinc-100 light:text-zinc-900">{data.currency} {stats.todayRevenue.toLocaleString()}</p>
              <div className="flex justify-between items-center mt-2">
                <p className="text-[10px] text-emerald-500 font-bold uppercase">{stats.todayCount} {t.transactions}</p>
                <ArrowUpRight size={16} className="text-zinc-700 light:text-zinc-400 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
              </div>
           </button>

           <button 
             onClick={() => setView('inventory')}
             className={`p-6 rounded-[32px] border text-start transition-all group shadow-sm ${stats.lowStockCount > 0 ? 'bg-orange-600/10 border-orange-500/50 hover:bg-orange-600/20' : 'bg-zinc-900/50 light:bg-white border border-zinc-800 light:border-zinc-200 hover:bg-zinc-800 light:hover:bg-zinc-50'}`}
           >
              <div className="flex justify-between items-center mb-4">
                <div className={`p-2 rounded-xl ${stats.lowStockCount > 0 ? 'bg-orange-500 text-white' : 'bg-zinc-900 light:bg-zinc-100 text-zinc-50'}`}><AlertCircle size={20} /></div>
                <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500 light:text-zinc-900">{t.low_stock}</span>
              </div>
              <p className="text-3xl font-black text-zinc-100 light:text-zinc-900">{stats.lowStockCount}</p>
              <p className="text-[10px] text-zinc-500 light:text-zinc-600 font-bold uppercase mt-2">{t.items_to_replenish}</p>
           </button>
        </div>

        <div className="grid grid-cols-1 gap-6">
           <button 
             onClick={() => setDetailModal('receivables')}
             className="bg-zinc-900/50 light:bg-white p-6 rounded-[32px] border border-zinc-800 light:border-zinc-200 text-start hover:bg-zinc-800/80 light:hover:bg-zinc-50 transition-all group shadow-sm"
           >
              <div className="flex justify-between items-center mb-4">
                <div className="p-2 bg-zinc-900 light:bg-zinc-100 rounded-xl text-blue-500"><ArrowUpRight size={20} /></div>
                <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500 light:text-zinc-900">{t.receivables}</span>
              </div>
              <p className="text-3xl font-black text-zinc-100 light:text-zinc-900">{data.currency} {stats.receivables.toLocaleString()}</p>
              <p className="text-[10px] text-blue-500 font-bold uppercase mt-2">{lang === 'ar' ? 'إجمالي مستحقات عند الغير (تجار وعملاء)' : 'Total Owed to Us (Traders & Retail)'}</p>
           </button>

           <button 
             onClick={() => setDetailModal('payables')}
             className="bg-zinc-900/50 light:bg-white p-6 rounded-[32px] border border-zinc-800 light:border-zinc-200 text-start hover:bg-zinc-800/80 light:hover:bg-zinc-50 transition-all group shadow-sm"
           >
              <div className="flex justify-between items-center mb-4">
                <div className="p-2 bg-zinc-900 light:bg-zinc-100 rounded-xl text-orange-500"><ArrowDownLeft size={20} /></div>
                <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500 light:text-zinc-900">{t.payables}</span>
              </div>
              <p className="text-3xl font-black text-zinc-100 light:text-zinc-900">{data.currency} {stats.payables.toLocaleString()}</p>
              <p className="text-[10px] text-orange-500 font-bold uppercase mt-2">{lang === 'ar' ? 'إجمالي مستحقات للموردين' : 'Total Supplier Debt'}</p>
           </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-zinc-900/30 light:bg-white border border-zinc-800 light:border-zinc-200 rounded-[40px] overflow-hidden backdrop-blur-sm shadow-xl transition-all duration-300">
          <div className="p-8 border-b border-zinc-800 light:border-zinc-200 flex justify-between items-center">
            <h3 className="text-sm font-black uppercase tracking-[0.2em] flex items-center gap-2 text-zinc-100 light:text-zinc-900">
              <Clock size={18} className="text-red-500" />
              {t.recent_transactions}
            </h3>
            <button onClick={() => setView('reports')} className="text-[9px] font-black uppercase text-red-500 hover:underline">{lang === 'ar' ? 'مشاهدة الكل' : 'View All'}</button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-start">
              <thead>
                <tr className="text-[9px] uppercase text-zinc-500 light:text-zinc-600 border-b border-zinc-800 light:border-zinc-200 font-black tracking-widest bg-black/20 light:bg-zinc-50">
                  <th className="px-8 py-5 text-start">{t.time}</th>
                  <th className="px-8 py-5 text-start">{t.items}</th>
                  <th className={`px-8 py-5 text-start`}>{t.total}</th>
                  <th className="px-8 py-5 text-end"></th>
                </tr>
              </thead>
              <tbody>
                {(data?.sales || []).slice(0, 5).map((sale) => (
                  <tr key={sale.id} onClick={() => onSelectSale(sale)} className="border-b border-zinc-800/50 light:border-zinc-100 hover:bg-zinc-800/30 light:hover:bg-zinc-50 transition-colors cursor-pointer group">
                    <td className="px-8 py-4 text-xs font-mono text-zinc-500 light:text-zinc-600">{new Date(sale.timestamp).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</td>
                    <td className="px-8 py-4 text-xs font-bold text-zinc-300 light:text-zinc-900">{sale.items.length} {t.items}</td>
                    <td className="px-8 py-4 text-sm font-black text-red-500">{data.currency} {sale.total.toLocaleString()}</td>
                    <td className="px-8 py-4 text-end opacity-0 group-hover:opacity-100 transition-opacity"><ArrowUpRight size={14} className="text-zinc-600 light:text-zinc-400 inline"/></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-zinc-900 light:bg-white border border-zinc-800 light:border-zinc-200 rounded-[40px] p-10 text-center space-y-8 flex flex-col justify-center shadow-2xl transition-all duration-300">
          <div className="relative inline-block mx-auto">
             <div className="absolute inset-0 bg-red-600 blur-2xl opacity-20 light:opacity-10 animate-pulse"></div>
             <div className="relative w-24 h-24 rounded-full bg-zinc-900 light:bg-white flex items-center justify-center border border-zinc-800 light:border-zinc-200">
                <Zap size={48} className="text-red-600" />
             </div>
          </div>
          <div className="space-y-2">
            <h4 className="text-2xl font-black text-zinc-100 light:text-zinc-900 uppercase tracking-tighter">TwinX Intel</h4>
            <p className="text-xs text-zinc-500 light:text-zinc-600 leading-relaxed font-bold">{lang === 'ar' ? 'المحرك الذكي يقوم بتحليل بياناتك حالياً لإيجاد أفضل التوصيات.' : 'Smart engine is analyzing your data to find best recommendations.'}</p>
          </div>
          <div className="p-4 bg-zinc-950 light:bg-zinc-100 rounded-2xl border border-zinc-800 light:border-zinc-200">
             <p className="text-[10px] text-zinc-500 light:text-zinc-900 font-black uppercase mb-1">{t.profit_margin_is}</p>
             <p className="text-3xl font-black text-red-600 tracking-tighter">{stats.margin.toFixed(1)}%</p>
          </div>
          <button onClick={() => setView('intelligence')} className="w-full py-5 bg-red-600 text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl shadow-red-900/40 hover:bg-red-700 transition-all">{t.execute_intel}</button>
        </div>
      </div>

      {detailModal && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/95 backdrop-blur-xl p-4 animate-in fade-in duration-300">
           <div className="bg-zinc-900 light:bg-white border border-zinc-800 light:border-zinc-200 w-full max-w-2xl rounded-[40px] overflow-hidden shadow-2xl flex flex-col max-h-[85vh]">
              <div className="p-8 border-b border-zinc-800 light:border-zinc-200 flex justify-between items-center bg-black/20 light:bg-zinc-50 shrink-0">
                <h4 className="text-2xl font-black uppercase tracking-tighter light:text-zinc-900">
                  {detailModal === 'today' && t.today_details}
                  {detailModal === 'receivables' && t.debtors_list}
                  {detailModal === 'payables' && t.creditors_list}
                </h4>
                <button onClick={() => setDetailModal(null)} className="p-3 hover:bg-zinc-800 light:hover:bg-zinc-100 rounded-full transition-colors text-zinc-500 hover:text-white light:hover:text-zinc-900"><X size={24}/></button>
              </div>
              
              <div className="flex-1 overflow-y-auto p-8 space-y-4 scrollbar-thin">
                 {detailModal === 'today' && (
                    <div className="space-y-3">
                       {todayTransactions.length === 0 ? (
                         <div className="py-20 text-center opacity-30 grayscale"><ShoppingCart size={60} className="mx-auto mb-4 light:text-zinc-300"/><p className="font-black text-xs uppercase light:text-zinc-900">{t.no_sales_today}</p></div>
                       ) : todayTransactions.map((t_item: any) => (
                         <div key={t_item.id} onClick={() => { if(t_item.type === 'retail') { onSelectSale(t_item); setDetailModal(null); } }} className="bg-zinc-950 light:bg-zinc-50 border border-zinc-800 light:border-zinc-200 p-5 rounded-3xl flex justify-between items-center hover:bg-zinc-800 light:hover:bg-zinc-100 transition-colors cursor-pointer group">
                            <div className="flex items-center gap-4">
                               <div className={`p-3 rounded-2xl ${t_item.type === 'retail' ? 'bg-emerald-600/10 text-emerald-500' : 'bg-blue-600/10 text-blue-500'}`}>
                                 {t_item.type === 'retail' ? <ShoppingCart size={20}/> : <Users size={20}/>}
                               </div>
                               <div>
                                 <p className="font-bold text-zinc-100 light:text-zinc-900">{t_item.type === 'retail' ? (lang === 'ar' ? 'بيع تجزئة' : 'Retail Sale') : (lang === 'ar' ? 'بيع جملة' : 'Wholesale Sale')}</p>
                                 <p className="text-[10px] text-zinc-500 light:text-zinc-600 uppercase font-black">{new Date(t_item.timestamp).toLocaleTimeString()}</p>
                               </div>
                            </div>
                            <div className="text-end">
                              <p className="font-black text-zinc-100 light:text-zinc-900">{data.currency} {t_item.total.toLocaleString()}</p>
                              {(t_item.total - (t_item.paidAmount || t_item.total) > 0 || (t_item.remainingAmount || 0) > 0) && <p className="text-[10px] text-orange-500 font-bold">{lang === 'ar' ? 'آجل' : 'Credit'}</p>}
                            </div>
                         </div>
                       ))}
                    </div>
                 )}

                 {detailModal === 'receivables' && (
                    <div className="space-y-3">
                       {debtorList.map((debtor, idx) => (
                         <div key={idx} className="bg-zinc-950 light:bg-zinc-50 border border-zinc-800 light:border-zinc-200 p-6 rounded-3xl flex items-center justify-between">
                            <div className="flex items-center gap-4">
                               <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${debtor.type === 'wholesale' ? 'bg-blue-600/10 text-blue-500' : 'bg-purple-600/10 text-purple-500'}`}>
                                 {debtor.type === 'wholesale' ? <Users size={24}/> : <ShoppingCart size={24}/>}
                               </div>
                               <div>
                                  <p className="font-black text-lg text-zinc-100 light:text-zinc-900 uppercase">{debtor.name}</p>
                                  <p className="text-xs text-zinc-500 light:text-zinc-600">{debtor.contact}</p>
                                  <p className="text-[8px] font-black uppercase tracking-widest text-zinc-600 mt-1">{debtor.type === 'wholesale' ? t.wholesale : t.retail_sale}</p>
                               </div>
                            </div>
                            <div className="text-end">
                               <p className="text-[10px] text-zinc-500 light:text-zinc-900 font-black uppercase mb-1">{lang === 'ar' ? 'إجمالي الدين' : 'Total Debt'}</p>
                               <p className="text-2xl font-black text-blue-500">{data.currency} {debtor.balance.toLocaleString()}</p>
                            </div>
                         </div>
                       ))}
                       {debtorList.length === 0 && <p className="text-center py-20 text-zinc-600 font-bold">{lang === 'ar' ? 'لا يوجد مديونيات حالياً' : 'No current receivables'}</p>}
                    </div>
                 )}

                 {detailModal === 'payables' && (
                    <div className="space-y-3">
                       {creditorList.map(({partner, balance}) => (
                         <div key={partner?.id} className="bg-zinc-950 light:bg-zinc-50 border border-zinc-800 light:border-zinc-200 p-6 rounded-3xl flex items-center justify-between">
                            <div className="flex items-center gap-4">
                               <div className="w-12 h-12 rounded-2xl bg-orange-600/10 flex items-center justify-center text-orange-500"><Package size={24}/></div>
                               <div>
                                  <p className="font-black text-lg text-zinc-100 light:text-zinc-900 uppercase">{partner?.name}</p>
                                  <p className="text-xs text-zinc-500 light:text-zinc-600">{partner?.contact}</p>
                               </div>
                            </div>
                            <div className="text-end">
                               <p className="text-[10px] text-zinc-500 light:text-zinc-900 font-black uppercase mb-1">{lang === 'ar' ? 'مطلوب للمورد' : 'Supplier Owed'}</p>
                               <p className="text-2xl font-black text-orange-500">{data.currency} {balance.toLocaleString()}</p>
                            </div>
                         </div>
                       ))}
                       {creditorList.length === 0 && <p className="text-center py-20 text-zinc-600 font-bold">{lang === 'ar' ? 'لا يوجد ديون للموردين' : 'No current payables'}</p>}
                    </div>
                 )}
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
