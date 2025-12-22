import { useMemo, useState } from 'react';
import { AppData, Sale, ViewType } from '../types';
import { 
  TrendingUp, 
  AlertCircle, 
  DollarSign, 
  Clock, 
  ArrowUpRight, 
  ArrowDownLeft, 
  ShoppingCart,
  X,
  Package,
  Calendar,
  AlertTriangle,
  Zap,
  BarChart2,
  // Fix: Added Receipt to the lucide-react imports
  Receipt
} from 'lucide-react';
import { translations, Language } from '../translations';

interface DashboardProps {
  data: AppData;
  lang: Language;
  setView: (view: ViewType) => void;
  onSelectSale: (sale: Sale) => void;
  cashBalance: number;
}

const Dashboard: React.FC<DashboardProps> = ({ data, lang, setView, onSelectSale, cashBalance }) => {
  const t = translations[lang];
  const [detailModal, setDetailModal] = useState<'today' | 'alerts' | null>(null);

  const stats = useMemo(() => {
    const sales = data?.sales || [];
    const expenses = data?.expenses || [];
    const returns = data?.returns || [];
    const salaryTrans = data?.salaryTransactions || [];
    const products = data?.products || [];

    // Financial calculations
    const totalRevenue = sales.reduce((acc, s) => acc + s.total, 0);
    const totalProfit = sales.reduce((acc, s) => acc + (s.totalProfit || 0), 0);
    const totalExpenses = expenses.reduce((acc, e) => acc + e.amount, 0) + 
                          salaryTrans.reduce((acc, st) => acc + st.amount, 0);

    // 7-Day Trend Logic
    const last7Days = [...Array(7)].map((_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - i);
      d.setHours(0, 0, 0, 0);
      return d;
    }).reverse();

    const chartData = last7Days.map(day => {
      const daySales = sales.filter(s => {
        const sDate = new Date(s.timestamp);
        sDate.setHours(0,0,0,0);
        return sDate.getTime() === day.getTime();
      });
      return { 
        label: day.toLocaleDateString(lang, { weekday: 'short' }),
        total: daySales.reduce((acc, s) => acc + s.total, 0) 
      };
    });

    const maxSales = Math.max(...chartData.map(d => d.total), 1);

    // Critical Alerts
    const now = new Date();
    const thirtyDaysLater = new Date();
    thirtyDaysLater.setDate(now.getDate() + 30);

    const lowStockItems = products.filter(p => p.stock <= (p.minStockLevel || p.minStock || 5));
    const expiringSoon = products.filter(p => {
      if (!p.expiryDate) return false;
      const expiry = new Date(p.expiryDate);
      return expiry > now && expiry <= thirtyDaysLater;
    });

    return {
      totalRevenue,
      totalProfit,
      totalExpenses,
      chartData,
      maxSales,
      lowStockCount: lowStockItems.length,
      expiringCount: expiringSoon.length,
      lowStockItems,
      expiringSoon
    };
  }, [data, lang]);

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto text-start overflow-y-auto h-full scrollbar-thin pb-24">
      
      {/* KPI SECTION */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        
        {/* REVENUE */}
        <div className="bg-zinc-900 light:bg-white p-8 rounded-[32px] border border-zinc-800 light:border-zinc-200 shadow-xl relative overflow-hidden group">
          <div className="relative z-10 space-y-4">
             <div className="flex items-center gap-3">
                <div className="p-2.5 bg-blue-600/10 text-blue-500 rounded-xl"><ShoppingCart size={20}/></div>
                <h4 className="text-[10px] font-black uppercase tracking-widest text-zinc-500">{lang === 'ar' ? 'إجمالي الإيرادات' : 'Total Revenue'}</h4>
             </div>
             <p className="text-3xl font-black text-zinc-100 light:text-zinc-900 tracking-tighter">{data.currency} {stats.totalRevenue.toLocaleString()}</p>
          </div>
          <ArrowUpRight size={80} className="absolute -bottom-4 -right-4 text-blue-500/5 group-hover:scale-110 transition-transform" />
        </div>

        {/* PROFIT */}
        <div className="bg-zinc-900 light:bg-white p-8 rounded-[32px] border border-zinc-800 light:border-zinc-200 shadow-xl relative overflow-hidden group">
          <div className="relative z-10 space-y-4">
             <div className="flex items-center gap-3">
                <div className="p-2.5 bg-emerald-600/10 text-emerald-500 rounded-xl"><TrendingUp size={20}/></div>
                <h4 className="text-[10px] font-black uppercase tracking-widest text-zinc-500">{lang === 'ar' ? 'صافي الأرباح' : 'Net Profit'}</h4>
             </div>
             <p className="text-3xl font-black text-emerald-500 tracking-tighter">{data.currency} {stats.totalProfit.toLocaleString()}</p>
          </div>
          <Zap size={80} className="absolute -bottom-4 -right-4 text-emerald-500/5 group-hover:scale-110 transition-transform" />
        </div>

        {/* EXPENSES */}
        <div className="bg-zinc-900 light:bg-white p-8 rounded-[32px] border border-zinc-800 light:border-zinc-200 shadow-xl relative overflow-hidden group">
          <div className="relative z-10 space-y-4">
             <div className="flex items-center gap-3">
                <div className="p-2.5 bg-orange-600/10 text-orange-500 rounded-xl"><ArrowDownLeft size={20}/></div>
                <h4 className="text-[10px] font-black uppercase tracking-widest text-zinc-500">{lang === 'ar' ? 'إجمالي التكاليف' : 'Total Expenses'}</h4>
             </div>
             <p className="text-3xl font-black text-orange-500 tracking-tighter">{data.currency} {stats.totalExpenses.toLocaleString()}</p>
          </div>
          <Receipt size={80} className="absolute -bottom-4 -right-4 text-orange-500/5 group-hover:scale-110 transition-transform" />
        </div>

        {/* CASH POSITION */}
        <div className="bg-red-600 p-8 rounded-[32px] shadow-2xl shadow-red-900/20 relative overflow-hidden group">
          <div className="relative z-10 space-y-4">
             <div className="flex items-center gap-3">
                <div className="p-2.5 bg-white/20 text-white rounded-xl"><DollarSign size={20}/></div>
                <h4 className="text-[10px] font-black uppercase tracking-widest text-red-100 opacity-80">{lang === 'ar' ? 'السيولة المتاحة' : 'Net Cash'}</h4>
             </div>
             <p className="text-3xl font-black text-white tracking-tighter">{data.currency} {cashBalance.toLocaleString()}</p>
          </div>
          <Package size={80} className="absolute -bottom-4 -right-4 text-white/10 group-hover:scale-110 transition-transform" />
        </div>
      </div>

      {/* ANALYTICS SECTION */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* SALES TREND CHART */}
        <div className="lg:col-span-2 bg-zinc-900 light:bg-white p-10 rounded-[40px] border border-zinc-800 light:border-zinc-200 shadow-xl flex flex-col gap-8">
           <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                 <BarChart2 className="text-red-500" size={24}/>
                 <h3 className="text-sm font-black uppercase tracking-[0.2em] text-zinc-100 light:text-zinc-900">{lang === 'ar' ? 'اتجاه المبيعات (7 أيام)' : '7-Day Sales Trend'}</h3>
              </div>
           </div>
           
           <div className="flex-1 flex items-end justify-between gap-4 h-64 px-4 pb-2 border-b border-zinc-800/50 light:border-zinc-200">
              {stats.chartData.map((day, idx) => {
                 const height = (day.total / stats.maxSales) * 100;
                 return (
                    <div key={idx} className="flex-1 flex flex-col items-center gap-4 group h-full justify-end">
                       <div className="relative w-full flex justify-center h-full items-end">
                          <div 
                             style={{ height: `${height}%` }}
                             className="w-10 xl:w-16 bg-gradient-to-t from-zinc-800 to-zinc-700 light:from-zinc-200 light:to-zinc-300 rounded-t-xl group-hover:from-red-600 group-hover:to-red-500 transition-all duration-500 relative"
                          >
                             <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-black text-white text-[9px] font-black px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-20">
                                {data.currency} {day.total.toLocaleString()}
                             </div>
                          </div>
                       </div>
                       <span className="text-[10px] font-black uppercase text-zinc-500 tracking-tighter">{day.label}</span>
                    </div>
                 );
              })}
           </div>
        </div>

        {/* ALERTS SECTION */}
        <div className="space-y-6">
           {/* Low Stock Alert */}
           <button 
             onClick={() => setDetailModal('alerts')}
             className={`w-full p-8 rounded-[32px] border text-start transition-all group ${stats.lowStockCount > 0 ? 'bg-orange-600/10 border-orange-500 shadow-lg' : 'bg-zinc-900 light:bg-white border-zinc-800 light:border-zinc-200'}`}
           >
              <div className="flex justify-between items-center mb-6">
                 <div className={`p-3 rounded-2xl ${stats.lowStockCount > 0 ? 'bg-orange-500 text-white' : 'bg-zinc-800 text-zinc-500'}`}><AlertTriangle size={24}/></div>
                 {stats.lowStockCount > 0 && <span className="flex h-3 w-3 rounded-full bg-orange-500 animate-ping"></span>}
              </div>
              <p className="text-4xl font-black text-zinc-100 light:text-zinc-900 tracking-tighter">{stats.lowStockCount}</p>
              <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mt-2">{lang === 'ar' ? 'منتجات أوشكت على النفاذ' : 'Items Low in Stock'}</p>
           </button>

           {/* Expiry Alert */}
           <button 
             onClick={() => setDetailModal('alerts')}
             className={`w-full p-8 rounded-[32px] border text-start transition-all group ${stats.expiringCount > 0 ? 'bg-red-600/10 border-red-500 shadow-lg' : 'bg-zinc-900 light:bg-white border-zinc-800 light:border-zinc-200'}`}
           >
              <div className="flex justify-between items-center mb-6">
                 <div className={`p-3 rounded-2xl ${stats.expiringCount > 0 ? 'bg-red-500 text-white' : 'bg-zinc-800 text-zinc-500'}`}><Calendar size={24}/></div>
                 {stats.expiringCount > 0 && <span className="flex h-3 w-3 rounded-full bg-red-500 animate-ping"></span>}
              </div>
              <p className="text-4xl font-black text-zinc-100 light:text-zinc-900 tracking-tighter">{stats.expiringCount}</p>
              <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mt-2">{lang === 'ar' ? 'منتجات تنتهي قريباً' : 'Expiring Within 30 Days'}</p>
           </button>
        </div>
      </div>

      {/* RECENT FEED */}
      <div className="bg-zinc-900/30 light:bg-white border border-zinc-800 light:border-zinc-200 rounded-[40px] overflow-hidden backdrop-blur-sm shadow-xl">
          <div className="p-8 border-b border-zinc-800 light:border-zinc-200 flex justify-between items-center">
            <h3 className="text-xs font-black uppercase tracking-[0.2em] flex items-center gap-2 text-zinc-100 light:text-zinc-900">
              <Clock size={18} className="text-red-500" />
              {t.recent_transactions}
            </h3>
            <button onClick={() => setView('reports')} className="text-[9px] font-black uppercase text-red-500 hover:underline">{lang === 'ar' ? 'مشاهدة الكل' : 'View Ledger'}</button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-start">
              <thead>
                <tr className="text-[9px] uppercase text-zinc-500 light:text-zinc-600 border-b border-zinc-800 light:border-zinc-200 font-black tracking-widest bg-black/20 light:bg-zinc-50">
                  <th className="px-8 py-5 text-start">{t.time}</th>
                  <th className="px-8 py-5 text-start">{lang === 'ar' ? 'المحتوى' : 'Items'}</th>
                  <th className="px-8 py-5 text-start">{t.total}</th>
                  <th className="px-8 py-5 text-start">{lang === 'ar' ? 'الربح' : 'Profit'}</th>
                  <th className="px-8 py-5 text-end"></th>
                </tr>
              </thead>
              <tbody>
                {(data?.sales || []).slice(0, 6).map((sale) => (
                  <tr key={sale.id} onClick={() => onSelectSale(sale)} className="border-b border-zinc-800/50 light:border-zinc-100 hover:bg-zinc-800/30 light:hover:bg-zinc-50 transition-colors cursor-pointer group">
                    <td className="px-8 py-4 text-[10px] font-mono text-zinc-500 light:text-zinc-400">{new Date(sale.timestamp).toLocaleTimeString()}</td>
                    <td className="px-8 py-4 text-xs font-bold text-zinc-300 light:text-zinc-900">{sale.items.length} {t.items}</td>
                    <td className="px-8 py-4 text-sm font-black text-zinc-100 light:text-zinc-900">{data.currency} {sale.total.toLocaleString()}</td>
                    <td className="px-8 py-4 text-xs font-black text-emerald-500">+{data.currency} {sale.totalProfit.toFixed(2)}</td>
                    <td className="px-8 py-4 text-end opacity-0 group-hover:opacity-100 transition-opacity"><ArrowUpRight size={14} className="text-zinc-600 inline"/></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
      </div>

      {/* ALERTS MODAL */}
      {detailModal === 'alerts' && (
         <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/95 backdrop-blur-xl p-4 animate-in fade-in duration-300">
            <div className="bg-zinc-900 light:bg-white border border-zinc-800 light:border-zinc-200 w-full max-w-4xl rounded-[40px] overflow-hidden shadow-2xl flex flex-col max-h-[85vh]">
               <div className="p-8 border-b border-zinc-800 light:border-zinc-200 flex justify-between items-center bg-black/20 light:bg-zinc-50">
                 <h4 className="text-2xl font-black uppercase tracking-tighter light:text-zinc-900">{lang === 'ar' ? 'مركز التنبيهات الحرجة' : 'Critical Alerts Dashboard'}</h4>
                 <button onClick={() => setDetailModal(null)} className="p-3 hover:bg-zinc-800 light:hover:bg-zinc-100 rounded-full transition-colors text-zinc-500 hover:text-white light:hover:text-zinc-900"><X size={24}/></button>
               </div>
               
               <div className="flex-1 overflow-y-auto p-10 grid grid-cols-1 md:grid-cols-2 gap-10 scrollbar-thin">
                  {/* Stock Risk List */}
                  <div className="space-y-6">
                     <h5 className="text-[10px] font-black uppercase tracking-[0.3em] text-orange-500 flex items-center gap-2"><AlertTriangle size={14}/> {lang === 'ar' ? 'مخاطر نفاذ المخزون' : 'Stock Exhaustion Risk'}</h5>
                     <div className="space-y-3">
                        {stats.lowStockItems.map(p => (
                           <div key={p.id} className="p-4 bg-black/20 light:bg-zinc-50 rounded-2xl border border-zinc-800 light:border-zinc-200 flex justify-between items-center">
                              <div>
                                 <p className="text-sm font-bold text-zinc-100 light:text-zinc-900">{p.name}</p>
                                 <p className="text-[10px] text-zinc-500 uppercase">{p.category}</p>
                              </div>
                              <div className="text-end">
                                 <p className="text-xs font-black text-orange-500">{p.stock} Units Left</p>
                                 <p className="text-[9px] text-zinc-600 uppercase">Limit: {p.minStockLevel || p.minStock}</p>
                              </div>
                           </div>
                        ))}
                     </div>
                  </div>

                  {/* Expiry Risk List */}
                  <div className="space-y-6">
                     <h5 className="text-[10px] font-black uppercase tracking-[0.3em] text-red-500 flex items-center gap-2"><Calendar size={14}/> {lang === 'ar' ? 'انتهاء الصلاحية الوشيك' : 'Imminent Expiry Warning'}</h5>
                     <div className="space-y-3">
                        {stats.expiringSoon.map(p => (
                           <div key={p.id} className="p-4 bg-black/20 light:bg-zinc-50 rounded-2xl border border-zinc-800 light:border-zinc-200 flex justify-between items-center">
                              <div>
                                 <p className="text-sm font-bold text-zinc-100 light:text-zinc-900">{p.name}</p>
                                 <p className="text-[10px] text-zinc-500 uppercase">{p.brand || 'No Brand'}</p>
                              </div>
                              <div className="text-end">
                                 <p className="text-xs font-black text-red-500">{new Date(p.expiryDate!).toLocaleDateString()}</p>
                                 <p className="text-[9px] text-zinc-600 uppercase">Aisle: {p.aisleLocation || '---'}</p>
                              </div>
                           </div>
                        ))}
                     </div>
                  </div>
               </div>
            </div>
         </div>
      )}
    </div>
  );
};

export default Dashboard;