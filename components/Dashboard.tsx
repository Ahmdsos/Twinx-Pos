
import React, { useMemo, useState } from 'react';
import { AppData, Sale, ViewType, Product, Expense, SalaryTransaction } from '../types';
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
  Receipt,
  Coins,
  Wallet,
  HandCoins,
  Scale,
  Lock,
  Unlock,
  Eye,
  FileText
} from 'lucide-react';
import { translations, Language } from '../translations';
import { TwinXOps } from '../services/operations';

interface DashboardProps {
  data: AppData;
  updateData: (newData: Partial<AppData>) => void;
  lang: Language;
  setView: (view: ViewType) => void;
  onSelectSale: (sale: Sale) => void;
  cashBalance: number;
}

type DrillDownType = 'net_cash' | 'receivables' | 'payables' | 'net_profit' | 'inventory_alerts';

const Dashboard: React.FC<DashboardProps> = ({ data, updateData, lang, setView, onSelectSale, cashBalance }) => {
  const t = translations[lang];
  const [drillDown, setDrillDown] = useState<DrillDownType | null>(null);
  const [showShiftModal, setShowShiftModal] = useState<'open' | 'close' | null>(null);
  const [shiftAmount, setShiftAmount] = useState<number>(0);

  const activeShift = useMemo(() => data.shifts.find(s => s.status === 'open'), [data.shifts]);

  const handleShiftAction = () => {
     try {
       if (showShiftModal === 'open') {
         updateData(TwinXOps.openShift(data, shiftAmount, 'Admin')); 
       } else {
         updateData(TwinXOps.closeShift(data, shiftAmount, 'Shift Closed via Dashboard'));
       }
       setShowShiftModal(null);
       setShiftAmount(0);
     } catch (err: any) {
       alert(err.message);
     }
  };

  const stats = useMemo(() => {
    const sales = data?.sales || [];
    const wholesale = data?.wholesaleTransactions || [];
    const expenses = data?.expenses || [];
    const salaries = data?.salaryTransactions || [];
    const products = data?.products || [];

    // 1. Core Financials (Money Section)
    const totalRetailReceivables = sales.reduce((acc, s) => acc + (s.status !== 'cancelled' ? (s.remainingAmount || 0) : 0), 0);
    const totalWholesaleReceivables = wholesale
      .filter(t => t.type === 'sale')
      .reduce((acc, t) => acc + (t.total - t.paidAmount), 0);
    
    const receivables = totalRetailReceivables + totalWholesaleReceivables;

    const payables = wholesale
      .filter(t => t.type === 'purchase')
      .reduce((acc, t) => acc + (t.total - t.paidAmount), 0);

    // NET PROFIT CALCULATION (Corrected: Don't subtract Salary twice)
    // Formula: (Retail Sales Revenue + Delivery Income) - (COGS) - (Expenses) - (Salaries) - (Returns)
    const productRevenue = sales.reduce((acc, s) => acc + (s.status !== 'cancelled' ? (s.subtotal - s.totalDiscount) : 0), 0);
    const deliveryIncome = sales.reduce((acc, s) => acc + (s.status !== 'cancelled' ? (s.deliveryFee || 0) : 0), 0);
    const cogs = sales.reduce((acc, s) => acc + (s.status !== 'cancelled' ? (s.totalCost || 0) : 0), 0);
    
    const totalExpenses = expenses.reduce((acc, e) => acc + e.amount, 0);
    const totalSalaries = salaries.reduce((acc, s) => acc + s.amount, 0);
    const totalReturns = (data.returns || []).reduce((acc, r) => acc + r.totalRefund, 0);

    const netProfit = (productRevenue + deliveryIncome) - cogs - totalExpenses - totalSalaries - totalReturns;

    const totalOperatingExpenses = totalExpenses + totalSalaries; // Used for Expense Card display

    // 3. 7-Day Trend Logic
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
        return sDate.getTime() === day.getTime() && s.status !== 'cancelled';
      });
      return { 
        label: day.toLocaleDateString(lang, { weekday: 'short' }),
        total: daySales.reduce((acc, s) => acc + s.total, 0) 
      };
    });

    const maxSales = Math.max(...chartData.map(d => d.total), 1);

    // 4. Inventory Alerts
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
      receivables,
      payables,
      netProfit,
      productRevenue,
      cogs,
      deliveryIncome,
      totalOperatingExpenses,
      totalExpenses, // Raw expenses
      totalSalaries, // Raw salaries
      totalReturns,
      chartData,
      maxSales,
      lowStockCount: lowStockItems.length,
      expiringCount: expiringSoon.length,
      lowStockItems,
      expiringSoon
    };
  }, [data, lang]);

  return (
    <div className="p-8 space-y-10 max-w-7xl mx-auto text-start overflow-y-auto h-full scrollbar-thin pb-24">
      
      {/* SECTION 1: THE MONEY (FINANCIAL TRUTH) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        
        {/* SHIFT / NET CASH */}
        <div className="bg-red-600 p-8 rounded-[40px] shadow-2xl shadow-red-900/40 relative overflow-hidden group border border-red-500">
           <div className="relative z-10">
             <div className="flex justify-between items-start mb-6">
                <div className="flex items-center gap-3">
                   <div className="p-2.5 bg-white/20 text-white rounded-2xl"><Wallet size={20}/></div>
                   <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-red-100">{lang === 'ar' ? 'السيولة (كاش)' : 'Net Cash'}</h4>
                </div>
                <button 
                  onClick={() => setShowShiftModal(activeShift ? 'close' : 'open')}
                  className="px-3 py-1 bg-black/20 hover:bg-black/40 text-white rounded-lg text-[9px] font-black uppercase tracking-widest flex items-center gap-2 transition-colors"
                >
                  {activeShift ? <><Lock size={10}/> {lang === 'ar' ? 'إغلاق الوردية' : 'Close Shift'}</> : <><Unlock size={10}/> {lang === 'ar' ? 'فتح وردية' : 'Open Shift'}</>}
                </button>
             </div>
             <p className="text-4xl font-black text-white tracking-tighter cursor-pointer" onClick={() => setDrillDown('net_cash')}>{data.currency} {cashBalance.toLocaleString()}</p>
             <p className="text-[9px] text-red-200 mt-2 uppercase font-black tracking-widest">
               {activeShift ? (lang === 'ar' ? `وردية مفتوحة: ${new Date(activeShift.startTime).toLocaleTimeString()}` : `Shift Open: ${new Date(activeShift.startTime).toLocaleTimeString()}`) : (lang === 'ar' ? 'الوردية مغلقة' : 'Shift Closed')}
             </p>
           </div>
           <HandCoins size={100} className="absolute -bottom-6 -right-6 text-white/10 group-hover:scale-110 transition-transform duration-700" />
        </div>

        {/* RECEIVABLES */}
        <button onClick={() => setDrillDown('receivables')} className="bg-zinc-900 light:bg-white p-8 rounded-[40px] border border-zinc-800 light:border-zinc-200 shadow-xl relative overflow-hidden group text-start hover:scale-[1.02] transition-transform">
          <div className="relative z-10">
             <div className="flex items-center gap-3 mb-6">
                <div className="p-2.5 bg-blue-600/10 text-blue-500 rounded-2xl"><ArrowUpRight size={20}/></div>
                <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">{lang === 'ar' ? 'المديونيات (لينا)' : 'Receivables (Leena)'}</h4>
             </div>
             <p className="text-4xl font-black text-zinc-100 light:text-zinc-900 tracking-tighter">{data.currency} {stats.receivables.toLocaleString()}</p>
             <p className="text-[9px] text-zinc-600 mt-2 uppercase font-black tracking-widest">{lang === 'ar' ? 'مستحقات عند العملاء' : 'Uncollected Revenue'}</p>
          </div>
          <TrendingUp size={100} className="absolute -bottom-6 -right-6 text-blue-500/5 group-hover:scale-110 transition-transform duration-700" />
        </button>

        {/* PAYABLES */}
        <button onClick={() => setDrillDown('payables')} className="bg-zinc-900 light:bg-white p-8 rounded-[40px] border border-zinc-800 light:border-zinc-200 shadow-xl relative overflow-hidden group text-start hover:scale-[1.02] transition-transform">
          <div className="relative z-10">
             <div className="flex items-center gap-3 mb-6">
                <div className="p-2.5 bg-orange-600/10 text-orange-500 rounded-2xl"><ArrowDownLeft size={20}/></div>
                <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">{lang === 'ar' ? 'المستحقات (علينا)' : 'Payables (3alena)'}</h4>
             </div>
             <p className="text-4xl font-black text-zinc-100 light:text-zinc-900 tracking-tighter">{data.currency} {stats.payables.toLocaleString()}</p>
             <p className="text-[9px] text-zinc-600 mt-2 uppercase font-black tracking-widest">{lang === 'ar' ? 'ديون للموردين' : 'Supplier Obligations'}</p>
          </div>
          <Coins size={100} className="absolute -bottom-6 -right-6 text-orange-500/5 group-hover:scale-110 transition-transform duration-700" />
        </button>

        {/* NET PROFIT (Detailed Drill Down) */}
        <button onClick={() => setDrillDown('net_profit')} className="bg-zinc-900 light:bg-white p-8 rounded-[40px] border border-zinc-800 light:border-zinc-200 shadow-xl relative overflow-hidden group text-start hover:scale-[1.02] transition-transform">
          <div className="relative z-10">
             <div className="flex items-center gap-3 mb-6">
                <div className="p-2.5 bg-emerald-600/10 text-emerald-500 rounded-2xl"><Zap size={20}/></div>
                <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">{lang === 'ar' ? 'صافي الربح' : 'Net Profit'}</h4>
             </div>
             <p className={`text-4xl font-black tracking-tighter ${stats.netProfit >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>{data.currency} {stats.netProfit.toLocaleString()}</p>
             <p className="text-[9px] text-zinc-600 mt-2 uppercase font-black tracking-widest">{lang === 'ar' ? 'الربح بعد خصم التكاليف' : 'Bottom Line Revenue'}</p>
          </div>
          <Scale size={100} className="absolute -bottom-6 -right-6 text-emerald-500/5 group-hover:scale-110 transition-transform duration-700" />
        </button>
      </div>

      {/* SECTION 2: PROFIT BREAKDOWN ROW */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Card A: Product Revenue */}
        <div className="bg-zinc-900/50 light:bg-zinc-50 p-6 rounded-3xl border border-zinc-800 light:border-zinc-200 shadow-sm flex items-center gap-4">
           <div className="p-3 bg-zinc-800 light:bg-white rounded-xl text-zinc-400"><ShoppingCart size={20}/></div>
           <div className="text-start">
              <p className="text-[8px] font-black uppercase text-zinc-500 tracking-widest">{lang === 'ar' ? 'إيراد المنتجات' : 'Product Revenue'}</p>
              <p className="text-lg font-black text-zinc-100 light:text-zinc-900 tracking-tight">{data.currency} {stats.productRevenue.toLocaleString()}</p>
           </div>
        </div>

        {/* Card B: COGS */}
        <div className="bg-zinc-900/50 light:bg-zinc-50 p-6 rounded-3xl border border-zinc-800 light:border-zinc-200 shadow-sm flex items-center gap-4">
           <div className="p-3 bg-zinc-800 light:bg-white rounded-xl text-zinc-400"><Package size={20}/></div>
           <div className="text-start">
              <p className="text-[8px] font-black uppercase text-zinc-500 tracking-widest">{lang === 'ar' ? 'تكلفة المبيعات' : 'COGS'}</p>
              <p className="text-lg font-black text-zinc-100 light:text-zinc-900 tracking-tight">{data.currency} {stats.cogs.toLocaleString()}</p>
           </div>
        </div>

        {/* Card C: Delivery Income */}
        <div className="bg-zinc-900/50 light:bg-zinc-50 p-6 rounded-3xl border border-zinc-800 light:border-zinc-200 shadow-sm flex items-center gap-4">
           <div className="p-3 bg-zinc-800 light:bg-white rounded-xl text-zinc-400"><HandCoins size={20}/></div>
           <div className="text-start">
              <p className="text-[8px] font-black uppercase text-zinc-500 tracking-widest">{lang === 'ar' ? 'دخل الدليفري' : 'Delivery Income'}</p>
              <p className="text-lg font-black text-green-500 tracking-tight">{data.currency} {stats.deliveryIncome.toLocaleString()}</p>
           </div>
        </div>

        {/* Card D: Total Expenses */}
        <div onClick={() => setDrillDown('net_profit')} className="bg-zinc-900/50 light:bg-zinc-50 p-6 rounded-3xl border border-zinc-800 light:border-zinc-200 shadow-sm flex items-center gap-4 cursor-pointer hover:bg-zinc-800/50 light:hover:bg-zinc-100 transition-colors">
           <div className="p-3 bg-zinc-800 light:bg-white rounded-xl text-zinc-400"><Receipt size={20}/></div>
           <div className="text-start">
              <p className="text-[8px] font-black uppercase text-zinc-500 tracking-widest">{t.expenses} (Click)</p>
              <p className="text-lg font-black text-orange-500 tracking-tight">{data.currency} {stats.totalOperatingExpenses.toLocaleString()}</p>
           </div>
        </div>
      </div>

      {/* SECTION 3: VISUALS (CHART & ALERTS) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* SALES TREND CHART */}
        <div className="lg:col-span-2 bg-zinc-900 light:bg-white p-10 rounded-[40px] border border-zinc-800 light:border-zinc-200 shadow-xl flex flex-col gap-10">
           <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                 <BarChart2 className="text-red-500" size={24}/>
                 <h3 className="text-sm font-black uppercase tracking-[0.2em] text-zinc-100 light:text-zinc-900">{lang === 'ar' ? 'اتجاه المبيعات (7 أيام)' : '7-Day Sales Trend'}</h3>
              </div>
           </div>
           
           <div className="flex-1 flex items-end justify-between gap-2 h-72 px-4 pb-2 border-b border-zinc-800/50 light:border-zinc-200">
              {stats.chartData.map((day, idx) => {
                 const height = (day.total / stats.maxSales) * 100;
                 return (
                    <div key={idx} className="flex-1 flex flex-col items-center gap-4 group h-full justify-end">
                       <div className="relative w-full flex justify-center h-full items-end max-w-[80px]">
                          <div 
                             style={{ height: `${Math.max(height, 5)}%` }}
                             className="w-full bg-gradient-to-t from-zinc-800 to-zinc-700 light:from-zinc-200 light:to-zinc-300 rounded-t-xl group-hover:from-red-600 group-hover:to-red-500 transition-all duration-500 relative shadow-sm"
                          >
                             <div className="absolute -top-12 left-1/2 -translate-x-1/2 bg-black text-white text-[9px] font-black px-3 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-all scale-75 group-hover:scale-100 whitespace-nowrap z-20 shadow-2xl">
                                {data.currency} {day.total.toLocaleString()}
                             </div>
                          </div>
                       </div>
                       <span className="text-[10px] font-black uppercase text-zinc-500 tracking-tighter whitespace-nowrap">{day.label}</span>
                    </div>
                 );
              })}
           </div>
        </div>

        {/* ALERTS SECTION */}
        <div className="flex flex-col gap-6">
           {/* Low Stock Alert */}
           <button 
             onClick={() => setDrillDown('inventory_alerts')}
             className={`flex-1 p-8 rounded-[40px] border text-start transition-all group ${stats.lowStockCount > 0 ? 'bg-orange-600/10 border-orange-500 shadow-lg shadow-orange-900/10' : 'bg-zinc-900 light:bg-white border-zinc-800 light:border-zinc-200 shadow-xl'}`}
           >
              <div className="flex justify-between items-center mb-6">
                 <div className={`p-4 rounded-3xl ${stats.lowStockCount > 0 ? 'bg-orange-500 text-white shadow-lg' : 'bg-zinc-800 text-zinc-500'}`}><AlertTriangle size={24}/></div>
                 {stats.lowStockCount > 0 && <span className="flex h-3 w-3 rounded-full bg-orange-500 animate-ping"></span>}
              </div>
              <p className="text-5xl font-black text-zinc-100 light:text-zinc-900 tracking-tighter">{stats.lowStockCount}</p>
              <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mt-2">{lang === 'ar' ? 'منتجات أوشكت على النفاذ' : 'Items Low in Stock'}</p>
           </button>

           {/* Expiry Alert */}
           <button 
             onClick={() => setDrillDown('inventory_alerts')}
             className={`flex-1 p-8 rounded-[40px] border text-start transition-all group ${stats.expiringCount > 0 ? 'bg-red-600/10 border-red-500 shadow-lg shadow-red-900/10' : 'bg-zinc-900 light:bg-white border-zinc-800 light:border-zinc-200 shadow-xl'}`}
           >
              <div className="flex justify-between items-center mb-6">
                 <div className={`p-4 rounded-3xl ${stats.expiringCount > 0 ? 'bg-red-500 text-white shadow-lg' : 'bg-zinc-800 text-zinc-500'}`}><Calendar size={24}/></div>
                 {stats.expiringCount > 0 && <span className="flex h-3 w-3 rounded-full bg-red-500 animate-ping"></span>}
              </div>
              <p className="text-5xl font-black text-zinc-100 light:text-zinc-900 tracking-tighter">{stats.expiringCount}</p>
              <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mt-2">{lang === 'ar' ? 'منتجات تنتهي قريباً' : 'Expiring Within 30 Days'}</p>
           </button>
        </div>
      </div>

      {/* SHIFT MODAL */}
      {showShiftModal && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/95 backdrop-blur-xl p-4 animate-in fade-in duration-300">
           <div className="bg-zinc-900 light:bg-white border border-zinc-800 light:border-zinc-200 w-full max-w-md rounded-[48px] overflow-hidden shadow-2xl">
              <div className="p-8 border-b border-zinc-800 light:border-zinc-200 flex justify-between items-center bg-black/20 light:bg-zinc-50">
                <h4 className="text-2xl font-black uppercase tracking-tighter light:text-zinc-900">{showShiftModal === 'open' ? (lang === 'ar' ? 'فتح وردية جديدة' : 'Open New Shift') : (lang === 'ar' ? 'إغلاق الوردية الحالية' : 'Close Current Shift')}</h4>
                <button onClick={() => setShowShiftModal(null)} className="p-3 text-zinc-500"><X size={24}/></button>
              </div>
              <div className="p-8 space-y-6">
                 <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 block mb-2">{showShiftModal === 'open' ? (lang === 'ar' ? 'رصيد البداية' : 'Starting Cash') : (lang === 'ar' ? 'رصيد النهاية (الفعلي)' : 'Closing Cash (Actual)')}</label>
                    <input type="number" className="w-full bg-black light:bg-zinc-100 border border-zinc-800 light:border-zinc-200 rounded-2xl px-6 py-4 text-3xl font-black text-red-500" autoFocus value={shiftAmount} onChange={e => setShiftAmount(parseFloat(e.target.value) || 0)} />
                 </div>
                 <button onClick={handleShiftAction} className="w-full py-4 bg-red-600 text-white rounded-2xl font-black uppercase tracking-widest shadow-xl">
                   {lang === 'ar' ? 'تأكيد' : 'Confirm'}
                 </button>
              </div>
           </div>
        </div>
      )}

      {/* DRILL DOWN MODAL */}
      {drillDown && (
         <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/95 backdrop-blur-xl p-4 animate-in fade-in duration-300">
            <div className="bg-zinc-900 light:bg-white border border-zinc-800 light:border-zinc-200 w-full max-w-5xl rounded-[48px] overflow-hidden shadow-2xl flex flex-col max-h-[85vh]">
               <div className="p-10 border-b border-zinc-800 light:border-zinc-200 flex justify-between items-center bg-black/20 light:bg-zinc-50">
                 <div>
                    <h4 className="text-2xl font-black uppercase tracking-tighter light:text-zinc-900">{lang === 'ar' ? 'تفاصيل المؤشرات' : 'Metric Breakdown'}</h4>
                    <p className="text-[10px] text-zinc-500 uppercase font-black">{drillDown.replace('_', ' ')}</p>
                 </div>
                 <button onClick={() => setDrillDown(null)} className="p-3 hover:bg-zinc-800 light:hover:bg-zinc-100 rounded-full transition-colors text-zinc-500 hover:text-white light:hover:text-zinc-900"><X size={28}/></button>
               </div>
               
               <div className="flex-1 overflow-y-auto p-12 scrollbar-thin">
                  {drillDown === 'net_profit' && (
                    <div className="space-y-8">
                       <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                          <div className="p-6 bg-zinc-950 light:bg-zinc-100 rounded-3xl border border-zinc-800 light:border-zinc-200">
                             <p className="text-xs font-black text-zinc-500 uppercase mb-2">Revenue (Sales)</p>
                             <p className="text-2xl font-black text-green-500">{data.currency} {stats.productRevenue.toLocaleString()}</p>
                          </div>
                          <div className="p-6 bg-zinc-950 light:bg-zinc-100 rounded-3xl border border-zinc-800 light:border-zinc-200">
                             <p className="text-xs font-black text-zinc-500 uppercase mb-2">Cost (COGS)</p>
                             <p className="text-2xl font-black text-red-500">-{data.currency} {stats.cogs.toLocaleString()}</p>
                          </div>
                          <div className="p-6 bg-zinc-950 light:bg-zinc-100 rounded-3xl border border-zinc-800 light:border-zinc-200">
                             <p className="text-xs font-black text-zinc-500 uppercase mb-2">Expenses & Salaries</p>
                             <p className="text-2xl font-black text-orange-500">-{data.currency} {stats.totalOperatingExpenses.toLocaleString()}</p>
                          </div>
                       </div>

                       <div>
                          <h5 className="text-sm font-black uppercase text-zinc-400 mb-4 flex items-center gap-2"><Receipt size={16}/> Breakdown</h5>
                          <table className="w-full text-start">
                             <thead>
                                <tr className="text-[10px] uppercase font-black text-zinc-600 border-b border-zinc-800/50">
                                   <th className="pb-2 text-start">Type</th>
                                   <th className="pb-2 text-start">Details</th>
                                   <th className="pb-2 text-end">Amount</th>
                                </tr>
                             </thead>
                             <tbody className="divide-y divide-zinc-800/30">
                                {data.expenses.slice(0,10).map(e => (
                                   <tr key={e.id}>
                                      <td className="py-3 text-xs font-bold text-red-400">Expense</td>
                                      <td className="py-3 text-xs text-zinc-400">{e.description}</td>
                                      <td className="py-3 text-end text-xs font-black text-red-500">-{e.amount.toLocaleString()}</td>
                                   </tr>
                                ))}
                                {data.salaryTransactions.slice(0,10).map(s => (
                                   <tr key={s.id}>
                                      <td className="py-3 text-xs font-bold text-blue-400">Salary</td>
                                      <td className="py-3 text-xs text-zinc-400">Payroll: {data.employees.find(e => e.id === s.employeeId)?.name || 'Staff'}</td>
                                      <td className="py-3 text-end text-xs font-black text-red-500">-{s.amount.toLocaleString()}</td>
                                   </tr>
                                ))}
                             </tbody>
                          </table>
                       </div>
                    </div>
                  )}

                  {drillDown === 'inventory_alerts' && (
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                       <div className="space-y-4">
                          <h5 className="text-[11px] font-black uppercase tracking-[0.3em] text-orange-500 flex items-center gap-3"><AlertTriangle size={18}/> Stock Risk</h5>
                          {stats.lowStockItems.map(p => (
                             <div key={p.id} className="p-4 bg-zinc-950 light:bg-zinc-100 rounded-2xl flex justify-between items-center">
                                <span className="font-bold text-sm light:text-zinc-900">{p.name}</span>
                                <span className="font-black text-xs text-orange-500">{p.stock} left</span>
                             </div>
                          ))}
                       </div>
                       <div className="space-y-4">
                          <h5 className="text-[11px] font-black uppercase tracking-[0.3em] text-red-500 flex items-center gap-3"><Calendar size={18}/> Expiry Risk</h5>
                          {stats.expiringSoon.map(p => (
                             <div key={p.id} className="p-4 bg-zinc-950 light:bg-zinc-100 rounded-2xl flex justify-between items-center">
                                <span className="font-bold text-sm light:text-zinc-900">{p.name}</span>
                                <span className="font-black text-xs text-red-500">{new Date(p.expiryDate!).toLocaleDateString()}</span>
                             </div>
                          ))}
                       </div>
                     </div>
                  )}
                  
                  {/* Additional views for Receivables/Payables can be added here following same pattern */}
                  {drillDown === 'receivables' && (
                     <div className="space-y-4">
                        <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-2xl text-blue-400 text-sm font-bold text-center">
                           Total: {data.currency} {stats.receivables.toLocaleString()}
                        </div>
                        {data.customers.filter(c => (c.totalPurchases - (c.invoiceCount * 0 /* Need Logic for Paid vs Credit */)) > 0).length === 0 && <p className="text-center text-zinc-500 py-10">No specific credit data tracked yet per customer invoice.</p>}
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
