
import React, { useMemo, useState } from 'react';
import { AppData, Sale, WholesaleTransaction } from '../types';
import { BarChart3, Calendar, Package, Clock, Receipt, X, Printer, ArrowUpRight, ArrowDownLeft, DollarSign } from 'lucide-react';
import { translations, Language } from '../translations';

interface ReportsScreenProps {
  data: AppData;
  lang: Language;
  onSelectSale: (sale: Sale) => void;
}

const ReportsScreen: React.FC<ReportsScreenProps> = ({ data, lang, onSelectSale }) => {
  const t = translations[lang];
  const [activeTab, setActiveTab] = useState<'history' | 'stats'>('history');
  const [selectedWholesale, setSelectedWholesale] = useState<WholesaleTransaction | null>(null);

  const unifiedLedger = useMemo(() => {
    const retail = data.sales.map(s => ({
      id: s.id,
      timestamp: s.timestamp,
      total: s.total,
      type: 'retail_sale' as const,
      itemsCount: (s.items || []).length,
      original: s
    }));

    const wholesale = (data.wholesaleTransactions || []).map(w => ({
      id: w.id,
      timestamp: w.timestamp,
      total: w.type === 'purchase' ? -w.total : w.total,
      type: (w.type === 'sale' ? 'wholesale_sale' : 'wholesale_purchase') as any,
      itemsCount: (w.items || []).length,
      original: w
    }));

    return [...retail, ...wholesale].sort((a, b) => b.timestamp - a.timestamp);
  }, [data.sales, data.wholesaleTransactions]);

  const dailySummary = useMemo(() => {
    const dailyMap = new Map<string, { total: number; count: number }>();
    unifiedLedger.forEach(entry => {
      const dateKey = new Date(entry.timestamp).toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-US');
      const current = dailyMap.get(dateKey) || { total: 0, count: 0 };
      dailyMap.set(dateKey, {
        total: current.total + entry.total,
        count: current.count + 1,
      });
    });
    return Array.from(dailyMap.entries()).sort((a, b) => new Date(b[0]).getTime() - new Date(a[0]).getTime());
  }, [unifiedLedger, lang]);

  const handleEntryClick = (entry: any) => {
    if (entry.type === 'retail_sale') {
      onSelectSale(entry.original);
    } else {
      setSelectedWholesale(entry.original);
    }
  };

  const printWholesale = (trans: WholesaleTransaction) => {
    const printArea = document.getElementById('print-area');
    if (!printArea) return;
    const partner = data.partners.find(p => p.id === trans.partnerId);
    
    printArea.innerHTML = `
      <div dir="${lang === 'ar' ? 'rtl' : 'ltr'}" style="width: 80mm; padding: 5mm; font-family: Arial; font-size: 10pt; color: black; background: white;">
        <h2 style="text-align:center; margin-bottom: 5px;">TWINX WHOLESALE</h2>
        <p style="text-align:center; font-size: 8pt; margin-bottom: 20px;">OFFLINE B2B LEDGER</p>
        <div style="border-top: 1px dashed black; padding-top: 10px; margin-bottom: 10px;">
          <p><b>${lang === 'ar' ? 'الشريك' : 'Partner'}:</b> ${partner?.name}</p>
          <p><b>${lang === 'ar' ? 'نوع العملية' : 'Type'}:</b> ${trans.type === 'sale' ? (lang === 'ar' ? 'بيع جملة' : 'Wholesale Sale') : (lang === 'ar' ? 'شراء جملة' : 'Wholesale Purchase')}</p>
          <p><b>${lang === 'ar' ? 'التاريخ' : 'Date'}:</b> ${new Date(trans.timestamp).toLocaleString()}</p>
        </div>
        <table style="width:100%; border-collapse:collapse; margin-bottom: 20px;">
          <thead>
            <tr style="border-bottom: 1px solid black; text-align: ${lang === 'ar' ? 'right' : 'left'};">
              <th>${lang === 'ar' ? 'الصنف' : 'Item'}</th>
              <th>${lang === 'ar' ? 'الكمية' : 'Qty'}</th>
              <th>${lang === 'ar' ? 'السعر' : 'Price'}</th>
            </tr>
          </thead>
          <tbody>
            ${trans.items.map(i => `
              <tr style="border-bottom: 1px dashed #eee;">
                <td>${i.name}</td>
                <td>${i.quantity}</td>
                <td>${data.currency} ${(i.quantity * i.unitPrice).toLocaleString()}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        <div style="border-top: 1px solid black; padding-top: 10px; text-align: ${lang === 'ar' ? 'left' : 'right'};">
          <p>${lang === 'ar' ? 'المبلغ المدفوع' : 'Paid'}: ${data.currency} ${trans.paidAmount.toLocaleString()}</p>
          <p>${lang === 'ar' ? 'المبلغ المتبقي' : 'Remaining'}: ${data.currency} ${(trans.total - trans.paidAmount).toLocaleString()}</p>
          <h3 style="margin-top:5px;">${lang === 'ar' ? 'الإجمالي' : 'Total'}: ${data.currency} ${trans.total.toLocaleString()}</h3>
        </div>
      </div>
    `;
    setTimeout(() => {
        window.print();
    }, 100);
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-12 pb-20 text-start">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-red-600 rounded-lg shadow-lg shadow-red-900/20">
            <BarChart3 size={24} className="text-white" />
          </div>
          <div>
            <h3 className="text-2xl font-bold tracking-tight text-zinc-100">{t.business_reports}</h3>
            <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-black">{t.unified_ledger}</p>
          </div>
        </div>

        <div className="flex bg-zinc-900 border border-zinc-800 rounded-xl p-1">
          <button 
            onClick={() => setActiveTab('history')}
            className={`px-6 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'history' ? 'bg-red-600 text-white' : 'text-zinc-500'}`}
          >
            {lang === 'ar' ? 'سجل الحركات' : 'Unified Ledger'}
          </button>
          <button 
            onClick={() => setActiveTab('stats')}
            className={`px-6 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'stats' ? 'bg-red-600 text-white' : 'text-zinc-500'}`}
          >
            {lang === 'ar' ? 'إحصائيات' : 'Statistics'}
          </button>
        </div>
      </div>

      {activeTab === 'history' ? (
        <div className="bg-zinc-900/30 border border-zinc-800 rounded-[32px] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-start border-collapse">
              <thead>
                <tr className="bg-black/40 text-[10px] uppercase font-black tracking-widest text-zinc-500 border-b border-zinc-800">
                  <th className="px-8 py-5"># ID</th>
                  <th className="px-8 py-5">{t.time}</th>
                  <th className="px-8 py-5">{t.trans_type}</th>
                  <th className="px-8 py-5">{t.items}</th>
                  <th className="px-8 py-5 text-start">{t.total}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/50">
                {unifiedLedger.map(entry => (
                  <tr 
                    key={entry.id} 
                    onClick={() => handleEntryClick(entry)}
                    className="cursor-pointer hover:bg-zinc-800/30 transition-colors group"
                  >
                    <td className="px-8 py-4 font-mono text-xs text-zinc-500">{entry.id.split('-')[0].toUpperCase()}</td>
                    <td className="px-8 py-4 text-sm text-zinc-300">{new Date(entry.timestamp).toLocaleString(lang === 'ar' ? 'ar-EG' : 'en-US')}</td>
                    <td className="px-8 py-4">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                        entry.type === 'retail_sale' ? 'bg-green-500/10 text-green-500' : 
                        entry.type === 'wholesale_sale' ? 'bg-blue-500/10 text-blue-500' : 'bg-orange-500/10 text-orange-500'
                      }`}>
                        {t[entry.type as keyof typeof t] || entry.type}
                      </span>
                    </td>
                    <td className="px-8 py-4 text-sm text-zinc-400">{entry.itemsCount}</td>
                    <td className={`px-8 py-4 text-lg font-black ${entry.total >= 0 ? 'text-red-500' : 'text-orange-500'}`}>
                      {data.currency} {Math.abs(entry.total).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <Calendar size={18} className="text-red-500" />
              <h4 className="text-sm font-black uppercase tracking-widest text-zinc-400">{t.daily_journal}</h4>
            </div>
            <div className="bg-zinc-900/30 border border-zinc-800 rounded-[32px] overflow-hidden">
              <table className="w-full text-start">
                <thead>
                  <tr className="bg-black/40 text-[10px] uppercase font-black tracking-widest text-zinc-500 border-b border-zinc-800">
                    <th className="px-6 py-4">{lang === 'ar' ? 'التاريخ' : 'Date'}</th>
                    <th className="px-6 py-4 text-start">{t.revenue}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/50">
                  {dailySummary.map(([date, stats]) => (
                    <tr key={date} className="hover:bg-zinc-800/30 transition-colors">
                      <td className="px-6 py-4 text-sm font-medium text-zinc-300">{date}</td>
                      <td className={`px-6 py-4 text-sm font-black ${stats.total >= 0 ? 'text-red-500' : 'text-orange-500'}`}>
                        {data.currency} {stats.total.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {selectedWholesale && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/95 backdrop-blur-xl p-4 animate-in fade-in duration-300">
          <div className="bg-zinc-900 border border-zinc-800 w-full max-w-2xl rounded-[40px] overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            <div className="p-8 border-b border-zinc-800 flex justify-between items-center bg-black/20 shrink-0">
              <div>
                <h4 className="text-2xl font-black uppercase tracking-tighter">تفاصيل فاتورة الجملة</h4>
                <p className="text-[10px] text-zinc-500 font-black tracking-widest uppercase">ID: {selectedWholesale.id.toUpperCase()}</p>
              </div>
              <div className="flex gap-4">
                <button onClick={() => printWholesale(selectedWholesale)} className="p-3 bg-zinc-800 hover:bg-zinc-700 rounded-full text-zinc-100 transition-all"><Printer size={20}/></button>
                <button onClick={() => setSelectedWholesale(null)} className="p-3 hover:bg-zinc-800 rounded-full transition-colors text-zinc-500 hover:text-white"><X size={24}/></button>
              </div>
            </div>
            <div className="p-8 space-y-6 overflow-y-auto scrollbar-thin">
               <div className="bg-zinc-950 p-6 rounded-3xl border border-zinc-800 space-y-6">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-4">
                      <div className={`p-3 rounded-2xl ${selectedWholesale.type === 'sale' ? 'bg-blue-600/10 text-blue-500' : 'bg-orange-600/10 text-orange-500'}`}>
                        {selectedWholesale.type === 'sale' ? <ArrowUpRight size={24}/> : <ArrowDownLeft size={24}/>}
                      </div>
                      <div>
                        <p className="text-xs font-black text-zinc-500 uppercase">الشريك</p>
                        <p className="text-xl font-bold text-zinc-100">{data.partners.find(p => p.id === selectedWholesale.partnerId)?.name}</p>
                      </div>
                    </div>
                    <div className="text-end">
                      <p className="text-xs font-black text-zinc-500 uppercase">إجمالي الفاتورة</p>
                      <p className="text-3xl font-black text-zinc-100">{data.currency} {selectedWholesale.total.toLocaleString()}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 pt-6 border-t border-zinc-800">
                     <div className="p-4 bg-zinc-900/50 rounded-2xl border border-zinc-800">
                        <p className="text-[10px] font-black text-zinc-500 uppercase mb-1">المبلغ المدفوع</p>
                        <p className="text-xl font-black text-green-500">{data.currency} {selectedWholesale.paidAmount.toLocaleString()}</p>
                     </div>
                     <div className="p-4 bg-zinc-900/50 rounded-2xl border border-zinc-800">
                        <p className="text-[10px] font-black text-zinc-500 uppercase mb-1">المبلغ المتبقي</p>
                        <p className="text-xl font-black text-orange-500">{data.currency} {(selectedWholesale.total - selectedWholesale.paidAmount).toLocaleString()}</p>
                     </div>
                  </div>
               </div>

               <div className="space-y-3">
                 <p className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] mb-2 px-2">الأصناف المشحونة</p>
                 {selectedWholesale.items.map((item, idx) => (
                   <div key={idx} className="flex justify-between items-center bg-zinc-900 border border-zinc-800 p-4 rounded-2xl">
                     <div className="text-start">
                       <p className="font-bold text-zinc-100">{item.name}</p>
                       <p className="text-xs text-zinc-500">{item.quantity} x {item.unitPrice}</p>
                     </div>
                     <p className="font-black text-zinc-100">{data.currency} {(item.quantity * item.unitPrice).toLocaleString()}</p>
                   </div>
                 ))}
               </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReportsScreen;
