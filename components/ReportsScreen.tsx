import React, { useMemo, useState } from 'react';
import { AppData, Sale, WholesaleTransaction, Product, Employee } from '../types';
import { 
  BarChart3, 
  Calendar, 
  Package, 
  Clock, 
  Receipt, 
  X, 
  Printer, 
  ArrowUpRight, 
  ArrowDownLeft, 
  DollarSign, 
  CheckCircle2, 
  History,
  TrendingUp,
  AlertCircle,
  Download,
  Users,
  Target,
  FileText,
  Activity,
  ArrowRight
} from 'lucide-react';
import { translations, Language } from '../translations';

interface ReportsScreenProps {
  data: AppData;
  lang: Language;
  onSelectSale: (sale: Sale) => void;
}

type TabType = 'financial' | 'inventory' | 'performance' | 'export';

const ReportsScreen: React.FC<ReportsScreenProps> = ({ data, lang, onSelectSale }) => {
  const t = translations[lang];
  const [activeTab, setActiveTab] = useState<TabType>('financial');

  // --- DATA AGGREGATION ---

  const stats = useMemo(() => {
    const sales = data.sales || [];
    const wholesale = data.wholesaleTransactions || [];
    const expenses = data.expenses || [];
    const returns = data.returns || [];
    const salaries = data.salaryTransactions || [];
    const products = data.products || [];

    // 1. Revenue
    const retailRevenue = sales.reduce((acc, s) => acc + s.total, 0);
    const wholesaleRevenue = wholesale.filter(t => t.type === 'sale').reduce((acc, t) => acc + t.total, 0);
    const totalRevenue = retailRevenue + wholesaleRevenue;

    // 2. Expenses / Outflow
    const directExpenses = expenses.reduce((acc, e) => acc + e.amount, 0);
    const payrollCosts = salaries.reduce((acc, s) => acc + s.amount, 0);
    const wholesalePurchases = wholesale.filter(t => t.type === 'purchase').reduce((acc, t) => acc + t.total, 0);
    const refundOutflow = returns.reduce((acc, r) => acc + r.totalRefund, 0);
    const totalExpenses = directExpenses + payrollCosts + wholesalePurchases + refundOutflow;

    // 3. Stock Analytics
    const totalStockValue = products.reduce((acc, p) => acc + (p.stock * p.price), 0);
    const totalStockCost = products.reduce((acc, p) => acc + (p.stock * p.costPrice), 0);
    const lowStockItems = products.filter(p => p.stock <= (p.minStock || 5));

    // 4. Sales Velocity (Top Selling)
    const productSales: Record<string, { name: string; qty: number; total: number }> = {};
    sales.forEach(s => {
      s.items.forEach(i => {
        if (!productSales[i.id]) productSales[i.id] = { name: i.name, qty: 0, total: 0 };
        productSales[i.id].qty += i.quantity;
        productSales[i.id].total += (i.quantity * i.price);
      });
    });
    const topProducts = Object.values(productSales).sort((a, b) => b.qty - a.qty).slice(0, 5);

    // 5. Employee Performance
    const employeeSales: Record<string, { name: string; total: number; count: number }> = {};
    sales.forEach(s => {
      if (s.driverId) {
        const emp = data.employees?.find(e => e.id === s.driverId);
        const name = emp?.name || 'Unknown Staff';
        if (!employeeSales[s.driverId]) employeeSales[s.driverId] = { name, total: 0, count: 0 };
        employeeSales[s.driverId].total += s.total;
        employeeSales[s.driverId].count += 1;
      }
    });
    const topEmployees = Object.values(employeeSales).sort((a, b) => b.total - a.total);

    return {
      totalRevenue,
      totalExpenses,
      netProfit: totalRevenue - totalExpenses,
      totalStockValue,
      totalStockCost,
      lowStockItems,
      topProducts,
      topEmployees
    };
  }, [data]);

  // --- EXPORT LOGIC ---

  const downloadCSV = (content: string, filename: string) => {
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportSales = () => {
    let csv = 'Invoice ID,Timestamp,Items Count,Subtotal,Discount,Total,Channel,Status\n';
    data.sales.forEach(s => {
      csv += `${s.id.split('-')[0]},${new Date(s.timestamp).toLocaleString()},${s.items.length},${s.subtotal},${s.totalDiscount},${s.total},${s.saleChannel},${s.remainingAmount > 0 ? 'Credit' : 'Paid'}\n`;
    });
    downloadCSV(csv, `twinx_sales_${Date.now()}.csv`);
  };

  const exportInventory = () => {
    let csv = 'Product Name,Category,Barcode,Stock,Price,Cost,Stock Value\n';
    data.products.forEach(p => {
      csv += `${p.name},${p.category},${p.barcode || ''},${p.stock},${p.price},${p.costPrice},${p.stock * p.price}\n`;
    });
    downloadCSV(csv, `twinx_inventory_${Date.now()}.csv`);
  };

  // --- SUB-COMPONENTS ---

  const ReportCard = ({ title, value, sub, icon, color }: any) => (
    <div className="bg-zinc-900 light:bg-white border border-zinc-800 light:border-zinc-200 p-8 rounded-[32px] flex items-center justify-between shadow-xl transition-all hover:scale-[1.01]">
      <div className="text-start">
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 mb-2">{title}</p>
        <p className={`text-4xl font-black tracking-tighter ${color || 'text-zinc-100 light:text-zinc-900'}`}>{value}</p>
        <p className="text-[11px] text-zinc-500 font-bold mt-1 uppercase">{sub}</p>
      </div>
      <div className={`p-5 rounded-2xl ${color?.includes('red') ? 'bg-red-600/10 text-red-500' : color?.includes('orange') ? 'bg-orange-600/10 text-orange-500' : 'bg-zinc-800 text-zinc-400'}`}>
        {icon}
      </div>
    </div>
  );

  return (
    <div className="p-8 h-full flex flex-col gap-8 text-start bg-zinc-950 light:bg-zinc-50 overflow-hidden">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-red-600 rounded-lg shadow-lg shadow-red-900/20">
            <BarChart3 size={24} className="text-white" />
          </div>
          <div>
            <h3 className="text-2xl font-black tracking-tighter text-zinc-100 light:text-zinc-900 uppercase">مركز التحكم والتقارير</h3>
            <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-black">Analytical Business Engine v2.0</p>
          </div>
        </div>

        <div className="flex bg-zinc-900 light:bg-zinc-200 border border-zinc-800 light:border-zinc-300 rounded-xl p-1 gap-1">
          <button onClick={() => setActiveTab('financial')} className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'financial' ? 'bg-red-600 text-white shadow-lg' : 'text-zinc-500 hover:text-zinc-300'}`}>{lang === 'ar' ? 'المالية' : 'Financial'}</button>
          <button onClick={() => setActiveTab('inventory')} className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'inventory' ? 'bg-red-600 text-white shadow-lg' : 'text-zinc-500 hover:text-zinc-300'}`}>{lang === 'ar' ? 'المخزون' : 'Inventory'}</button>
          <button onClick={() => setActiveTab('performance')} className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'performance' ? 'bg-red-600 text-white shadow-lg' : 'text-zinc-500 hover:text-zinc-300'}`}>{lang === 'ar' ? 'الأداء' : 'Performance'}</button>
          <button onClick={() => setActiveTab('export')} className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'export' ? 'bg-red-600 text-white shadow-lg' : 'text-zinc-500 hover:text-zinc-300'}`}>{lang === 'ar' ? 'تصدير' : 'Export'}</button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto scrollbar-thin pr-2">
        {activeTab === 'financial' && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              <ReportCard 
                title={lang === 'ar' ? 'إجمالي الإيرادات' : 'Total Revenue'} 
                value={`${data.currency} ${stats.totalRevenue.toLocaleString()}`}
                sub={lang === 'ar' ? 'صافي المبيعات (تجزئة + جملة)' : 'Net Inbound (Retail + Wholesale)'}
                icon={<TrendingUp size={28}/>}
              />
              <ReportCard 
                title={lang === 'ar' ? 'إجمالي التكاليف' : 'Total Expenses'} 
                value={`${data.currency} ${stats.totalExpenses.toLocaleString()}`}
                sub={lang === 'ar' ? 'مصاريف + رواتب + مشتريات' : 'Ops + Payroll + Purchases'}
                icon={<ArrowDownLeft size={28}/>}
                color="text-orange-500"
              />
              <ReportCard 
                title={lang === 'ar' ? 'صافي الربح' : 'Net Profit'} 
                value={`${data.currency} ${stats.netProfit.toLocaleString()}`}
                sub={lang === 'ar' ? 'فائض السيولة التشغيلي' : 'Operating Cash Surplus'}
                icon={<DollarSign size={28}/>}
                color="text-emerald-500"
              />
            </div>

            <div className="bg-zinc-900/30 light:bg-white border border-zinc-800 light:border-zinc-200 p-10 rounded-[40px] flex flex-col gap-10">
               <div className="flex items-center justify-between">
                  <h4 className="text-sm font-black uppercase tracking-[0.2em] text-zinc-400">التدفقات النقدية (النسبة المئوية)</h4>
                  <div className="flex gap-6">
                     <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-red-600"></span><span className="text-[10px] font-black uppercase text-zinc-500">Revenue</span></div>
                     <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-orange-600"></span><span className="text-[10px] font-black uppercase text-zinc-500">Expenses</span></div>
                  </div>
               </div>
               
               <div className="space-y-6">
                  <div className="relative h-16 w-full bg-zinc-950 light:bg-zinc-100 rounded-2xl overflow-hidden flex border border-zinc-800 light:border-zinc-200">
                    <div 
                      className="h-full bg-red-600 flex items-center px-6 transition-all duration-1000 shadow-lg shadow-red-900/40" 
                      style={{ width: `${(stats.totalRevenue / (stats.totalRevenue + stats.totalExpenses || 1)) * 100}%` }}
                    >
                       <span className="text-white font-black text-xs">REVENUE</span>
                    </div>
                    <div 
                      className="h-full bg-orange-600 flex items-center px-6 transition-all duration-1000" 
                      style={{ width: `${(stats.totalExpenses / (stats.totalRevenue + stats.totalExpenses || 1)) * 100}%` }}
                    >
                       <span className="text-white font-black text-xs">EXPENSES</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                     <p className="text-[10px] font-black text-zinc-600 uppercase text-start">Current Cash Efficiency: {((stats.netProfit / (stats.totalRevenue || 1)) * 100).toFixed(1)}%</p>
                     <p className="text-[10px] font-black text-zinc-600 uppercase text-end">Last Updated: {new Date().toLocaleTimeString()}</p>
                  </div>
               </div>
            </div>
          </div>
        )}

        {activeTab === 'inventory' && (
          <div className="space-y-8 animate-in fade-in duration-500">
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <ReportCard 
                  title={lang === 'ar' ? 'قيمة المخزون (بيع)' : 'Stock Value (Retail)'} 
                  value={`${data.currency} ${stats.totalStockValue.toLocaleString()}`}
                  sub={lang === 'ar' ? 'القيمة السوقية للمنتجات المتوفرة' : 'Market value of current items'}
                  icon={<Package size={28}/>}
                />
                <ReportCard 
                  title={lang === 'ar' ? 'تكلفة المخزون (جملة)' : 'Inventory Cost'} 
                  value={`${data.currency} ${stats.totalStockCost.toLocaleString()}`}
                  sub={lang === 'ar' ? 'رأس المال المحبوس في البضاعة' : 'Locked capital in stock'}
                  icon={<Receipt size={28}/>}
                  color="text-orange-500"
                />
             </div>

             <div className="bg-zinc-900/30 light:bg-white border border-zinc-800 light:border-zinc-200 rounded-[32px] overflow-hidden">
                <div className="p-6 border-b border-zinc-800 light:border-zinc-200 flex items-center gap-3">
                   <AlertCircle size={20} className="text-orange-500" />
                   <h4 className="text-xs font-black uppercase tracking-widest text-zinc-100 light:text-zinc-900">{lang === 'ar' ? 'تنبيه النواقص (أقل من 5 قطع)' : 'Low Stock Warning (Under 5)'}</h4>
                </div>
                <div className="overflow-x-auto">
                   <table className="w-full text-start">
                      <thead>
                         <tr className="bg-black/40 light:bg-zinc-50 text-[10px] uppercase font-black tracking-widest text-zinc-500 border-b border-zinc-800 light:border-zinc-200">
                            <th className="px-8 py-4">Item Name</th>
                            <th className="px-8 py-4">Category</th>
                            <th className="px-8 py-4 text-start">Current Stock</th>
                         </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-800/50 light:divide-zinc-200">
                         {stats.lowStockItems.map(p => (
                            <tr key={p.id} className="hover:bg-zinc-800/30 light:hover:bg-zinc-50 transition-colors">
                               <td className="px-8 py-4 font-bold text-zinc-200 light:text-zinc-900">{p.name}</td>
                               <td className="px-8 py-4 text-[10px] text-zinc-500 uppercase font-black">{p.category}</td>
                               <td className="px-8 py-4"><span className="px-2 py-1 bg-red-600/10 text-red-500 border border-red-500/20 rounded font-black">{p.stock} units</span></td>
                            </tr>
                         ))}
                         {stats.lowStockItems.length === 0 && (
                            <tr><td colSpan={3} className="px-8 py-10 text-center text-zinc-600 font-bold uppercase text-[10px]">No immediate stock risks</td></tr>
                         )}
                      </tbody>
                   </table>
                </div>
             </div>
          </div>
        )}

        {activeTab === 'performance' && (
          <div className="space-y-8 animate-in fade-in duration-500">
             <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                <div className="bg-zinc-900/30 light:bg-white border border-zinc-800 light:border-zinc-200 rounded-[32px] overflow-hidden flex flex-col">
                   <div className="p-6 border-b border-zinc-800 light:border-zinc-200 flex items-center justify-between">
                      <h4 className="text-xs font-black uppercase tracking-widest text-zinc-100 light:text-zinc-900 flex items-center gap-2"><Target size={18} className="text-red-500"/> الأكثر مبيعاً (Top Items)</h4>
                   </div>
                   <div className="flex-1">
                      {stats.topProducts.map((p, idx) => (
                         <div key={idx} className="flex items-center justify-between p-6 border-b border-zinc-800 last:border-none hover:bg-zinc-800/20 transition-all">
                            <div className="flex items-center gap-4 text-start">
                               <div className="w-8 h-8 rounded-lg bg-zinc-800 flex items-center justify-center font-black text-xs text-zinc-500">{idx+1}</div>
                               <div>
                                  <p className="font-bold text-zinc-100 light:text-zinc-900">{p.name}</p>
                                  <p className="text-[10px] text-zinc-500 font-black uppercase">{p.qty} Units Sold</p>
                               </div>
                            </div>
                            <p className="font-black text-red-500">{data.currency} {p.total.toLocaleString()}</p>
                         </div>
                      ))}
                      {stats.topProducts.length === 0 && <div className="p-20 text-center opacity-20"><Activity size={40} className="mx-auto mb-2"/><p className="text-[10px] font-black uppercase">No Sales Data</p></div>}
                   </div>
                </div>

                <div className="bg-zinc-900/30 light:bg-white border border-zinc-800 light:border-zinc-200 rounded-[32px] overflow-hidden flex flex-col">
                   <div className="p-6 border-b border-zinc-800 light:border-zinc-200 flex items-center justify-between">
                      <h4 className="text-xs font-black uppercase tracking-widest text-zinc-100 light:text-zinc-900 flex items-center gap-2"><Users size={18} className="text-blue-500"/> أداء الموظفين (Leaderboard)</h4>
                   </div>
                   <div className="flex-1">
                      {stats.topEmployees.map((e, idx) => (
                         <div key={idx} className="flex items-center justify-between p-6 border-b border-zinc-800 last:border-none hover:bg-zinc-800/20 transition-all">
                            <div className="flex items-center gap-4 text-start">
                               <div className="w-8 h-8 rounded-full bg-blue-600/10 flex items-center justify-center font-black text-[10px] text-blue-500">{idx+1}</div>
                               <div>
                                  <p className="font-bold text-zinc-100 light:text-zinc-900">{e.name}</p>
                                  <p className="text-[10px] text-zinc-500 font-black uppercase">{e.count} Successful Orders</p>
                               </div>
                            </div>
                            <p className="font-black text-green-500">{data.currency} {e.total.toLocaleString()}</p>
                         </div>
                      ))}
                      {stats.topEmployees.length === 0 && <div className="p-20 text-center opacity-20"><Users size={40} className="mx-auto mb-2"/><p className="text-[10px] font-black uppercase">No Staff Contribution Logged</p></div>}
                   </div>
                </div>
             </div>
          </div>
        )}

        {activeTab === 'export' && (
          <div className="max-w-3xl mx-auto space-y-6 animate-in fade-in duration-500">
             <div className="bg-zinc-900 light:bg-white border border-zinc-800 light:border-zinc-200 p-12 rounded-[40px] text-center space-y-8 shadow-2xl">
                <div className="w-20 h-20 bg-red-600/10 rounded-3xl flex items-center justify-center mx-auto text-red-600 border border-red-600/20">
                   <Download size={40}/>
                </div>
                <div>
                   <h4 className="text-3xl font-black uppercase tracking-tighter light:text-zinc-900">تصدير البيانات (CSV)</h4>
                   <p className="text-zinc-500 text-sm font-bold mt-2">قم باستخراج بيانات النظام للتحليل الخارجي عبر Excel أو Google Sheets.</p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
                   <button 
                    onClick={exportSales}
                    className="p-8 bg-zinc-950 light:bg-zinc-50 border border-zinc-800 light:border-zinc-200 rounded-3xl text-start hover:border-red-600/50 transition-all group"
                   >
                      <FileText className="text-zinc-600 group-hover:text-red-600 mb-4 transition-colors" size={24}/>
                      <p className="font-black uppercase tracking-widest text-xs text-zinc-100 light:text-zinc-900">سجل المبيعات (Sales Ledger)</p>
                      <p className="text-[10px] text-zinc-500 mt-1 uppercase font-bold">Download Full Transaction CSV</p>
                   </button>

                   <button 
                    onClick={exportInventory}
                    className="p-8 bg-zinc-950 light:bg-zinc-50 border border-zinc-800 light:border-zinc-200 rounded-3xl text-start hover:border-red-600/50 transition-all group"
                   >
                      <Package className="text-zinc-600 group-hover:text-red-600 mb-4 transition-colors" size={24}/>
                      <p className="font-black uppercase tracking-widest text-xs text-zinc-100 light:text-zinc-900">قائمة الأصناف (Inventory List)</p>
                      <p className="text-[10px] text-zinc-500 mt-1 uppercase font-bold">Export Current Stock & Pricing</p>
                   </button>
                </div>
                
                <div className="p-6 bg-orange-600/10 border border-orange-500/20 rounded-2xl flex items-center gap-4 text-start">
                   <AlertCircle className="text-orange-500 shrink-0" size={20}/>
                   <p className="text-[11px] text-orange-500 font-bold uppercase leading-relaxed">System Note: Exporting data does not affect local storage. Ensure you keep periodic manual backups from Settings.</p>
                </div>
             </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ReportsScreen;