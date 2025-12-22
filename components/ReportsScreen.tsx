import React, { useMemo, useState } from 'react';
import { AppData, Sale, Product, Employee, SalaryTransaction } from '../types';
import { 
  BarChart3, 
  Calendar, 
  Package, 
  Clock, 
  Receipt, 
  ArrowUpRight, 
  ArrowDownLeft, 
  DollarSign, 
  TrendingUp,
  Download,
  Users,
  Target,
  FileText,
  Activity,
  CalendarDays,
  ShieldAlert,
  Percent,
  Truck,
  Briefcase
} from 'lucide-react';
import { translations, Language } from '../translations';

interface ReportsScreenProps {
  data: AppData;
  lang: Language;
  onSelectSale: (sale: Sale) => void;
}

type TabType = 'summary' | 'ledger' | 'products' | 'employees';
type DateRange = 'today' | 'week' | 'month' | 'all';

const ReportsScreen: React.FC<ReportsScreenProps> = ({ data, lang, onSelectSale }) => {
  const t = translations[lang];
  const [activeTab, setActiveTab] = useState<TabType>('summary');
  const [dateRange, setDateRange] = useState<DateRange>('today');

  // --- FILTERED DATA SET ---
  const filteredSales = useMemo(() => {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const startOfWeek = now.getTime() - (7 * 24 * 60 * 60 * 1000);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();

    return data.sales.filter(s => {
      if (dateRange === 'today') return s.timestamp >= startOfToday;
      if (dateRange === 'week') return s.timestamp >= startOfWeek;
      if (dateRange === 'month') return s.timestamp >= startOfMonth;
      return true;
    });
  }, [data.sales, dateRange]);

  // --- AGGREGATED STATS ---
  const stats = useMemo(() => {
    const sales = filteredSales;
    const expenses = data.expenses || [];
    const salaries = data.salaryTransactions || [];
    const returns = data.returns || [];

    const revenue = sales.reduce((acc, s) => acc + s.total, 0);
    const cost = sales.reduce((acc, s) => acc + (s.totalCost || 0), 0);
    const deliveryIncome = sales.reduce((acc, s) => acc + (s.deliveryFee || 0), 0);
    const totalDiscounts = sales.reduce((acc, s) => acc + s.totalDiscount, 0);
    
    // Operating Expenses
    const opsExpenses = expenses.reduce((acc, e) => acc + e.amount, 0);
    const salaryCosts = salaries.reduce((acc, s) => acc + s.amount, 0);
    const refundOutflow = returns.reduce((acc, r) => acc + r.totalRefund, 0);

    const netProfit = (revenue - cost) - opsExpenses - salaryCosts - refundOutflow;

    // Daily trend (Profit)
    const last7Days = [...Array(7)].map((_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - i);
      d.setHours(0,0,0,0);
      return d;
    }).reverse();

    const dailyProfitTrend = last7Days.map(day => {
      const daySales = data.sales.filter(s => {
        const sDate = new Date(s.timestamp);
        sDate.setHours(0,0,0,0);
        return sDate.getTime() === day.getTime();
      });
      const dayRev = daySales.reduce((acc, s) => acc + s.total, 0);
      const dayCost = daySales.reduce((acc, s) => acc + (s.totalCost || 0), 0);
      return { 
        label: day.toLocaleDateString(lang, { weekday: 'short' }),
        profit: dayRev - dayCost
      };
    });

    return { revenue, cost, deliveryIncome, totalDiscounts, opsExpenses, salaryCosts, netProfit, dailyProfitTrend };
  }, [filteredSales, data, lang]);

  // --- PRODUCT PERFORMANCE LOGIC ---
  const productPerformance = useMemo(() => {
    const perf: Record<string, { name: string; category: string; qty: number; cost: number; revenue: number; profit: number }> = {};
    
    filteredSales.forEach(s => {
      s.items.forEach(item => {
        if (!perf[item.id]) {
          perf[item.id] = { name: item.name, category: item.category, qty: 0, cost: 0, revenue: 0, profit: 0 };
        }
        const itemCost = (item.costPrice || 0) * item.quantity;
        const itemRev = item.price * item.quantity;
        perf[item.id].qty += item.quantity;
        perf[item.id].cost += itemCost;
        perf[item.id].revenue += itemRev;
        perf[item.id].profit += (itemRev - itemCost);
      });
    });

    return Object.values(perf).sort((a, b) => b.profit - a.profit);
  }, [filteredSales]);

  // --- EMPLOYEE AUDIT LOGIC ---
  const employeeAudit = useMemo(() => {
    const audit: Record<string, { name: string; role: string; salesCount: number; revenue: number; discounts: number }> = {};
    
    filteredSales.forEach(s => {
      const staffId = s.driverId || 'Store-Direct';
      if (!audit[staffId]) {
        const staff = data.employees.find(e => e.id === staffId);
        audit[staffId] = { 
          name: staff?.name || (staffId === 'Store-Direct' ? (lang === 'ar' ? 'مبيعات المحل' : 'Store Direct') : 'Deleted Staff'), 
          role: staff?.role || '---', 
          salesCount: 0, 
          revenue: 0, 
          discounts: 0 
        };
      }
      audit[staffId].salesCount++;
      audit[staffId].revenue += s.total;
      audit[staffId].discounts += s.totalDiscount;
    });

    return Object.values(audit).sort((a, b) => b.revenue - a.revenue);
  }, [filteredSales, data.employees, lang]);

  // --- CSV EXPORT HELPERS ---
  const downloadCSV = (rows: string[][], filename: string) => {
    const csvContent = "data:text/csv;charset=utf-8," + rows.map(e => e.join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${filename}_${dateRange}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportSalesLedger = () => {
    const rows = [["ID", "Date", "Items", "Total", "Profit", "Channel", "Status"]];
    filteredSales.forEach(s => {
      rows.push([
        s.id.split('-')[0],
        new Date(s.timestamp).toLocaleString(),
        s.items.length.toString(),
        s.total.toString(),
        (s.totalProfit || 0).toString(),
        s.saleChannel,
        s.status || 'completed'
      ]);
    });
    downloadCSV(rows, "twinx_sales_ledger");
  };

  // --- RENDER HELPERS ---
  const StatCard = ({ label, value, subValue, icon: Icon, colorClass }: any) => (
    <div className="bg-zinc-900 light:bg-white border border-zinc-800 light:border-zinc-200 p-6 rounded-[32px] shadow-lg flex flex-col justify-between">
      <div className="flex justify-between items-start mb-4">
        <div className={`p-3 rounded-2xl ${colorClass} bg-opacity-10`}><Icon size={20} className={colorClass.split(' ')[0]} /></div>
        <p className="text-[10px] font-black uppercase text-zinc-500 tracking-widest">{label}</p>
      </div>
      <div>
        <p className="text-3xl font-black text-zinc-100 light:text-zinc-900 tracking-tighter">{data.currency} {value.toLocaleString()}</p>
        <p className="text-[10px] text-zinc-600 font-bold mt-1 uppercase">{subValue}</p>
      </div>
    </div>
  );

  return (
    <div className="p-8 h-full flex flex-col gap-8 text-start bg-zinc-950 light:bg-zinc-50 overflow-hidden">
      
      {/* HEADER SECTION */}
      <header className="flex flex-col xl:flex-row xl:items-center justify-between gap-6 shrink-0">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-red-600 rounded-2xl shadow-2xl shadow-red-900/40">
            <BarChart3 size={28} className="text-white" />
          </div>
          <div>
            <h3 className="text-3xl font-black tracking-tighter text-zinc-100 light:text-zinc-900 uppercase">Master Reports</h3>
            <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-black">TwinX Financial Audit v3.0</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Date Range Selector */}
          <div className="flex bg-zinc-900 light:bg-zinc-200 border border-zinc-800 light:border-zinc-300 rounded-xl p-1">
            {(['today', 'week', 'month', 'all'] as const).map(range => (
              <button 
                key={range}
                onClick={() => setDateRange(range)}
                className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${dateRange === range ? 'bg-zinc-100 light:bg-zinc-900 text-zinc-950 light:text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
              >
                {range}
              </button>
            ))}
          </div>

          <div className="h-8 w-[1px] bg-zinc-800 mx-2 hidden xl:block"></div>

          {/* Main Tab Switcher */}
          <div className="flex bg-zinc-900 light:bg-zinc-200 border border-zinc-800 light:border-zinc-300 rounded-xl p-1 gap-1">
            <button onClick={() => setActiveTab('summary')} className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'summary' ? 'bg-red-600 text-white shadow-lg' : 'text-zinc-500 hover:text-zinc-300'}`}>{lang === 'ar' ? 'الملخص' : 'Summary'}</button>
            <button onClick={() => setActiveTab('ledger')} className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'ledger' ? 'bg-red-600 text-white shadow-lg' : 'text-zinc-500 hover:text-zinc-300'}`}>{lang === 'ar' ? 'الدفتر' : 'Ledger'}</button>
            <button onClick={() => setActiveTab('products')} className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'products' ? 'bg-red-600 text-white shadow-lg' : 'text-zinc-500 hover:text-zinc-300'}`}>{lang === 'ar' ? 'المنتجات' : 'Products'}</button>
            <button onClick={() => setActiveTab('employees')} className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'employees' ? 'bg-red-600 text-white shadow-lg' : 'text-zinc-500 hover:text-zinc-300'}`}>{lang === 'ar' ? 'الموظفين' : 'Employees'}</button>
          </div>
        </div>
      </header>

      {/* TABS CONTENT */}
      <div className="flex-1 overflow-y-auto scrollbar-thin pr-2 pb-12">
        
        {/* TAB 1: GENERAL SUMMARY */}
        {activeTab === 'summary' && (
          <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6">
              <StatCard label="Revenue" value={stats.revenue} subValue="Sales + Delivery" icon={TrendingUp} colorClass="text-emerald-500" />
              <StatCard label="Net Profit" value={stats.netProfit} subValue="After all deductions" icon={DollarSign} colorClass="text-green-500" />
              <StatCard label="Expenses" value={stats.opsExpenses} subValue="Rent, Utilities, etc" icon={Receipt} colorClass="text-red-500" />
              <StatCard label="Salaries" value={stats.salaryCosts} subValue="Staff Payroll Paid" icon={Briefcase} colorClass="text-blue-500" />
              <StatCard label="Delivery Inc." value={stats.deliveryIncome} subValue="Fees Collected" icon={Truck} colorClass="text-orange-500" />
              <StatCard label="Discounts" value={stats.totalDiscounts} subValue="Revenue Sacrificed" icon={Percent} colorClass="text-zinc-400" />
            </div>

            <div className="bg-zinc-900/40 light:bg-white border border-zinc-800 light:border-zinc-200 p-10 rounded-[40px] shadow-2xl">
              <div className="flex items-center justify-between mb-12">
                <h4 className="text-sm font-black uppercase tracking-[0.3em] text-zinc-500 flex items-center gap-3"><Activity size={18} className="text-red-500" /> 7-Day Profit Trajectory</h4>
                <div className="flex items-center gap-2 px-3 py-1.5 bg-zinc-950 light:bg-zinc-100 border border-zinc-800 light:border-zinc-200 rounded-lg text-[9px] font-black uppercase text-zinc-600">
                  <Clock size={12} /> Auto-calculated live
                </div>
              </div>
              <div className="flex items-end justify-between gap-4 h-64 px-4">
                {stats.dailyProfitTrend.map((day, i) => {
                  const maxProfit = Math.max(...stats.dailyProfitTrend.map(d => d.profit), 1);
                  const height = (day.profit / maxProfit) * 100;
                  return (
                    <div key={i} className="flex-1 flex flex-col items-center gap-4 group">
                      <div className="w-full relative h-full flex flex-col justify-end">
                        <div 
                          style={{ height: `${Math.max(height, 5)}%` }}
                          className="w-full bg-gradient-to-t from-zinc-800 to-red-600 light:from-zinc-100 light:to-red-500 rounded-xl group-hover:scale-x-105 transition-all duration-700 relative shadow-lg"
                        >
                          <div className="absolute -top-10 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 bg-black text-white text-[9px] px-2 py-1 rounded-md whitespace-nowrap z-20 pointer-events-none transition-opacity">
                            {data.currency} {day.profit.toLocaleString()}
                          </div>
                        </div>
                      </div>
                      <span className="text-[10px] font-black text-zinc-600 uppercase tracking-tighter">{day.label}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: SALES LEDGER */}
        {activeTab === 'ledger' && (
          <div className="space-y-6 animate-in fade-in">
             <div className="flex justify-between items-center bg-zinc-900/30 p-4 rounded-2xl border border-zinc-800">
                <p className="text-[10px] font-black uppercase text-zinc-500 flex items-center gap-2"><FileText size={14}/> Records: {filteredSales.length}</p>
                <button onClick={exportSalesLedger} className="flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-xl text-[10px] font-black uppercase tracking-widest text-zinc-100 transition-all border border-zinc-700"><Download size={14}/> Export Ledger</button>
             </div>
             
             <div className="bg-zinc-900/50 light:bg-white border border-zinc-800 light:border-zinc-200 rounded-[32px] overflow-hidden">
                <table className="w-full border-collapse">
                   <thead>
                      <tr className="bg-zinc-950 light:bg-zinc-100 text-[10px] uppercase font-black tracking-widest text-zinc-500 border-b border-zinc-800 light:border-zinc-200">
                         <th className="px-8 py-5 text-start">ID</th>
                         <th className="px-8 py-5 text-start">Timestamp</th>
                         <th className="px-8 py-5 text-start">Customer</th>
                         <th className="px-8 py-5 text-start">Items</th>
                         <th className="px-8 py-5 text-start">Total</th>
                         <th className="px-8 py-5 text-start">Profit</th>
                         <th className="px-8 py-5 text-end">Status</th>
                      </tr>
                   </thead>
                   <tbody className="divide-y divide-zinc-800/50 light:divide-zinc-200">
                      {filteredSales.map(s => (
                        <tr key={s.id} onClick={() => onSelectSale(s)} className="hover:bg-zinc-800/30 light:hover:bg-zinc-50 cursor-pointer transition-colors group">
                           <td className="px-8 py-4 font-mono text-[11px] text-zinc-400 group-hover:text-red-500">#{s.id.split('-')[0].toUpperCase()}</td>
                           <td className="px-8 py-4 text-xs font-bold text-zinc-500">{new Date(s.timestamp).toLocaleTimeString()}</td>
                           <td className="px-8 py-4 text-xs font-bold text-zinc-100 light:text-zinc-900">{s.deliveryDetails?.customerName || t.cash_customer}</td>
                           <td className="px-8 py-4 text-xs font-black text-zinc-600">{s.items.length} units</td>
                           <td className="px-8 py-4 font-black text-zinc-100 light:text-zinc-900">{data.currency} {s.total.toLocaleString()}</td>
                           <td className="px-8 py-4 text-xs font-black text-emerald-500">+{data.currency} {(s.totalProfit || 0).toLocaleString()}</td>
                           <td className="px-8 py-4 text-end">
                              <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest border ${s.status === 'cancelled' ? 'bg-red-600/10 text-red-500 border-red-500/20' : 'bg-green-500/10 text-green-500 border-green-500/20'}`}>
                                {s.status || 'completed'}
                              </span>
                           </td>
                        </tr>
                      ))}
                      {filteredSales.length === 0 && (
                        <tr><td colSpan={7} className="py-24 text-center opacity-20 font-black uppercase text-xs tracking-widest">No entries for this period</td></tr>
                      )}
                   </tbody>
                </table>
             </div>
          </div>
        )}

        {/* TAB 3: PRODUCT PERFORMANCE */}
        {activeTab === 'products' && (
          <div className="space-y-6 animate-in fade-in">
             <div className="bg-zinc-900/50 light:bg-white border border-zinc-800 light:border-zinc-200 rounded-[32px] overflow-hidden">
                <table className="w-full border-collapse">
                   <thead>
                      <tr className="bg-zinc-950 light:bg-zinc-100 text-[10px] uppercase font-black tracking-widest text-zinc-500 border-b border-zinc-800 light:border-zinc-200">
                         <th className="px-8 py-5 text-start">Rank</th>
                         <th className="px-8 py-5 text-start">Product Name</th>
                         <th className="px-8 py-5 text-start">Category</th>
                         <th className="px-8 py-5 text-start">Units Sold</th>
                         <th className="px-8 py-5 text-start">Revenue</th>
                         <th className="px-8 py-5 text-start">COGS</th>
                         <th className="px-8 py-5 text-end">Total Profit</th>
                      </tr>
                   </thead>
                   <tbody className="divide-y divide-zinc-800/50 light:divide-zinc-200">
                      {productPerformance.map((p, idx) => (
                        <tr key={idx} className="hover:bg-zinc-800/30 light:hover:bg-zinc-50 transition-colors">
                           <td className="px-8 py-4">
                              {idx < 3 ? (
                                <span className={`w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-black ${idx === 0 ? 'bg-yellow-500 text-yellow-950 shadow-lg shadow-yellow-500/20' : idx === 1 ? 'bg-zinc-400 text-zinc-900' : 'bg-orange-600 text-orange-100'}`}>{idx + 1}</span>
                              ) : <span className="text-zinc-600 font-bold ml-2">{idx + 1}</span>}
                           </td>
                           <td className="px-8 py-4 text-xs font-black text-zinc-100 light:text-zinc-900 uppercase">{p.name}</td>
                           <td className="px-8 py-4"><span className="text-[10px] font-black text-zinc-500 uppercase bg-zinc-950 light:bg-zinc-100 px-2 py-1 rounded border border-zinc-800 light:border-zinc-200">{p.category}</span></td>
                           <td className="px-8 py-4 text-xs font-bold text-zinc-500">{p.qty.toLocaleString()}</td>
                           <td className="px-8 py-4 text-xs font-bold text-zinc-100 light:text-zinc-900">{data.currency} {p.revenue.toLocaleString()}</td>
                           <td className="px-8 py-4 text-xs font-bold text-zinc-500">{data.currency} {p.cost.toLocaleString()}</td>
                           <td className="px-8 py-4 text-end font-black text-emerald-500">+{data.currency} {p.profit.toLocaleString()}</td>
                        </tr>
                      ))}
                      {productPerformance.length === 0 && (
                        <tr><td colSpan={7} className="py-24 text-center opacity-20 font-black uppercase text-xs tracking-widest">Inert Inventory - No Sales Logged</td></tr>
                      )}
                   </tbody>
                </table>
             </div>
          </div>
        )}

        {/* TAB 4: EMPLOYEE AUDIT */}
        {activeTab === 'employees' && (
          <div className="space-y-10 animate-in fade-in">
             <div className="bg-red-600/10 border border-red-500/20 p-6 rounded-[24px] flex items-center gap-4 text-start">
                <ShieldAlert size={24} className="text-red-600 shrink-0" />
                <div>
                   <h5 className="text-xs font-black uppercase text-red-600 tracking-widest">Fraud Prevention Audit</h5>
                   <p className="text-[10px] text-zinc-500 font-bold mt-1 uppercase">Monitor high discount values per staff to identify suspicious activity or margin bleeding.</p>
                </div>
             </div>

             <div className="bg-zinc-900/50 light:bg-white border border-zinc-800 light:border-zinc-200 rounded-[32px] overflow-hidden shadow-xl">
                <table className="w-full border-collapse">
                   <thead>
                      <tr className="bg-zinc-950 light:bg-zinc-100 text-[10px] uppercase font-black tracking-widest text-zinc-500 border-b border-zinc-800 light:border-zinc-200">
                         <th className="px-8 py-5 text-start">Staff Name</th>
                         <th className="px-8 py-5 text-start">Role</th>
                         <th className="px-8 py-5 text-start">Total Sales</th>
                         <th className="px-8 py-5 text-start">Total Revenue</th>
                         <th className="px-8 py-5 text-end">Discounts Given</th>
                      </tr>
                   </thead>
                   <tbody className="divide-y divide-zinc-800/50 light:divide-zinc-200">
                      {employeeAudit.map((e, idx) => {
                         const discountRatio = (e.discounts / (e.revenue + e.discounts || 1)) * 100;
                         const isHighRisk = discountRatio > 10; // Rule: >10% average discount is suspicious

                         return (
                          <tr key={idx} className="hover:bg-zinc-800/30 light:hover:bg-zinc-50 transition-colors">
                             <td className="px-8 py-4">
                                <div className="flex items-center gap-3">
                                   <div className="w-8 h-8 rounded-lg bg-zinc-800 flex items-center justify-center font-black text-[10px] text-zinc-500">{e.name.charAt(0)}</div>
                                   <span className="font-bold text-zinc-100 light:text-zinc-900">{e.name}</span>
                                </div>
                             </td>
                             <td className="px-8 py-4 text-[10px] font-black uppercase text-zinc-600">{e.role}</td>
                             <td className="px-8 py-4 text-xs font-bold text-zinc-400">{e.salesCount} Invoices</td>
                             <td className="px-8 py-4 font-black text-zinc-100 light:text-zinc-900">{data.currency} {e.revenue.toLocaleString()}</td>
                             <td className="px-8 py-4 text-end">
                                <div className="flex flex-col items-end">
                                   <p className={`font-black text-sm ${isHighRisk ? 'text-red-500 animate-pulse' : 'text-zinc-500'}`}>{data.currency} {e.discounts.toLocaleString()}</p>
                                   <p className={`text-[8px] font-black uppercase tracking-tighter ${isHighRisk ? 'text-red-600' : 'text-zinc-700'}`}>{discountRatio.toFixed(1)}% of Net Sales</p>
                                </div>
                             </td>
                          </tr>
                         );
                      })}
                      {employeeAudit.length === 0 && (
                        <tr><td colSpan={5} className="py-24 text-center opacity-20 font-black uppercase text-xs tracking-widest">No Staff Contributions Logged</td></tr>
                      )}
                   </tbody>
                </table>
             </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ReportsScreen;