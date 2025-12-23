
import React, { useState, useMemo } from 'react';
import { AppData, Sale, LogEntry, CartItem } from '../types';
import { translations, Language } from '../translations';
import { 
  Truck, 
  Search, 
  ArrowUpRight, 
  Clock, 
  Receipt, 
  AlertTriangle, 
  Phone, 
  Hash, 
  ChevronRight, 
  CheckCircle2, 
  XCircle, 
  Package, 
  RefreshCw, 
  RotateCcw 
} from 'lucide-react';
import { TwinXOps } from '../services/operations';

interface DeliveryScreenProps {
  data: AppData;
  updateData: (newData: Partial<AppData>) => void;
  addLog: (log: Omit<LogEntry, 'id' | 'timestamp'>) => void;
  lang: Language;
  onSelectSale: (sale: Sale) => void;
  onReorder: (items: CartItem[]) => void;
}

const DeliveryScreen: React.FC<DeliveryScreenProps> = ({ data, updateData, addLog, lang, onSelectSale, onReorder }) => {
  const t = translations[lang];
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDriverId, setSelectedDriverId] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState<string | null>(null);

  // Unified Driver Source: Filter from HR
  const deliveryStaff = useMemo(() => {
    return (data.employees || []).filter(e => 
      e.role === 'delivery' && 
      e.isActive &&
      (e.name.toLowerCase().includes(searchTerm.toLowerCase()) || e.phone.includes(searchTerm))
    );
  }, [data.employees, searchTerm]);

  const selectedDriver = useMemo(() => {
    return deliveryStaff.find(d => d.id === selectedDriverId) || null;
  }, [deliveryStaff, selectedDriverId]);

  const driverOrders = useMemo(() => {
    if (!selectedDriverId) return [];
    return data.sales
      .filter(s => s.driverId === selectedDriverId && s.isDelivery)
      .sort((a, b) => b.timestamp - a.timestamp);
  }, [data.sales, selectedDriverId]);

  const driverStats = useMemo(() => {
    return driverOrders.reduce((acc, sale) => {
      // Only count non-cancelled orders for cash totals
      const isCountable = sale.status !== 'cancelled';
      return {
        totalCash: acc.totalCash + (isCountable ? sale.total : 0),
        totalFees: acc.totalFees + (isCountable ? (sale.deliveryFee || 0) : 0),
        count: acc.count + (isCountable ? 1 : 0)
      };
    }, { totalCash: 0, totalFees: 0, count: 0 });
  }, [driverOrders]);

  /**
   * TWINX COMMAND: Update status with Event Bubbling protection
   */
  const handleUpdateStatus = (e: React.MouseEvent, saleId: string, status: 'delivered' | 'cancelled' | 'pending') => {
    e.stopPropagation(); // CRITICAL: Stop parent card from opening SaleDetailsModal
    setIsProcessing(saleId);
    
    try {
      // Snapshot -> Mutate -> Commit
      const updatedData = TwinXOps.updateDeliveryStatus(data, saleId, status);
      updateData(updatedData);
      
      // Visual feedback delay
      setTimeout(() => setIsProcessing(null), 150);
    } catch (err: any) {
      alert(err.message);
      setIsProcessing(null);
    }
  };

  /**
   * TWINX COMMAND: Clone transaction as fresh entry to cart
   */
  const handleReOrder = (e: React.MouseEvent, sale: Sale) => {
    e.stopPropagation();
    onReorder(sale.items);
  };

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case 'delivered':
        return <span className="px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest bg-green-500/10 text-green-500 border border-green-500/20">{lang === 'ar' ? 'تم التوصيل' : 'Delivered'}</span>;
      case 'cancelled':
        return <span className="px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest bg-red-500/10 text-red-500 border border-red-500/20">{lang === 'ar' ? 'ملغي' : 'Cancelled'}</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest bg-orange-500/10 text-orange-500 border border-orange-500/20 animate-pulse">{lang === 'ar' ? 'قيد التوصيل' : 'Pending'}</span>;
    }
  };

  const getCardBorderStyle = (status?: string) => {
    switch (status) {
      case 'delivered': return 'border-green-600/30 shadow-green-900/5';
      case 'cancelled': return 'border-red-600/30 shadow-red-900/5';
      default: return 'border-orange-600/30 shadow-orange-900/5';
    }
  };

  // Helper to check if driver has active orders
  const hasActiveOrders = (driverId: string) => {
    return data.sales.some(s => s.driverId === driverId && s.isDelivery && s.status === 'pending');
  };

  return (
    <div className="p-8 h-full flex flex-col gap-6 text-start bg-zinc-950 light:bg-zinc-50 overflow-hidden">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-red-600 rounded-lg shadow-lg shadow-red-900/20">
            <Truck size={24} className="text-white" />
          </div>
          <div>
            <h3 className="text-2xl font-black tracking-tight text-zinc-100 light:text-zinc-900">{t.delivery}</h3>
            <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-black">{lang === 'ar' ? 'متابعة تشغيل الدليفري' : 'Delivery Dispatch Control'}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <Search size={18} className={`absolute ${lang === 'ar' ? 'right-3' : 'left-3'} top-1/2 -translate-y-1/2 text-zinc-500`} />
            <input
              type="text"
              placeholder={t.search}
              className="bg-zinc-900 light:bg-white border border-zinc-800 light:border-zinc-200 rounded-xl py-2.5 px-10 focus:outline-none focus:border-red-500 w-64 text-sm light:text-zinc-900 shadow-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="px-4 py-2 bg-zinc-800 light:bg-zinc-100 rounded-xl text-[10px] font-black uppercase text-zinc-500 border border-zinc-700 light:border-zinc-200 shadow-sm">
             {lang === 'ar' ? 'المتاح حالياً: ' : 'Active: '} {deliveryStaff.length}
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 overflow-hidden">
        {/* SIDEBAR: STAFF LIST */}
        <div className="lg:col-span-1 bg-zinc-900/30 light:bg-white border border-zinc-800 light:border-zinc-200 rounded-[32px] overflow-hidden flex flex-col shadow-xl">
           <div className="p-4 bg-black/40 light:bg-zinc-100 border-b border-zinc-800 light:border-zinc-200 text-[10px] uppercase font-black tracking-widest text-zinc-500 px-6">
             {lang === 'ar' ? 'طاقم التوصيل المسجل' : 'Registered Delivery Staff'}
           </div>
           
           <div className="flex-1 overflow-y-auto divide-y divide-zinc-800/50 light:divide-zinc-200 scrollbar-thin">
             {deliveryStaff.length === 0 ? (
               <div className="p-10 text-center space-y-4">
                  <AlertTriangle size={32} className="text-orange-500 mx-auto" />
                  <p className="text-[11px] font-black uppercase text-zinc-500 leading-relaxed">
                    {lang === 'ar' ? 'لا يوجد طيارين مسجلين. يرجى إضافة موظفين بدور "Delivery" من شاشة الموظفين.' : 'No delivery staff found. Please add employees with "Delivery" role in HR Screen.'}
                  </p>
               </div>
             ) : deliveryStaff.map(d => {
               const isActive = hasActiveOrders(d.id);
               return (
               <button 
                key={d.id} 
                onClick={() => setSelectedDriverId(d.id)}
                className={`w-full p-6 text-start hover:bg-zinc-800/30 light:hover:bg-zinc-50 transition-all flex items-center justify-between group ${selectedDriverId === d.id ? 'bg-red-600/5 light:bg-red-50 border-s-4 border-red-600' : ''}`}
               >
                 <div className="flex items-center gap-4">
                   <div className="relative">
                      <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-black ${selectedDriverId === d.id ? 'bg-red-600 text-white' : 'bg-zinc-800 light:bg-zinc-100 text-zinc-500'}`}>{d.name.charAt(0)}</div>
                      {isActive && <span className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-zinc-950 animate-pulse"></span>}
                   </div>
                   <div className="min-w-0">
                     <p className="font-bold text-zinc-100 light:text-zinc-900 truncate uppercase tracking-tight">{d.name}</p>
                     <p className="text-[10px] text-zinc-500 font-mono">{d.phone}</p>
                   </div>
                 </div>
                 <ChevronRight size={16} className={`text-zinc-700 transition-transform ${selectedDriverId === d.id ? 'translate-x-1 text-red-500' : ''}`}/>
               </button>
             )})}
           </div>
        </div>

        {/* MAIN VIEW: DISPATCH BOARD */}
        <div className="lg:col-span-2 bg-zinc-900/10 light:bg-zinc-50 border border-zinc-800 light:border-zinc-200 rounded-[40px] overflow-hidden flex flex-col shadow-2xl relative">
           {!selectedDriver ? (
             <div className="flex-1 flex flex-col items-center justify-center text-center p-12 space-y-4 opacity-40">
               <div className="w-24 h-24 rounded-full bg-zinc-900 light:bg-white flex items-center justify-center border border-zinc-800 light:border-zinc-200">
                 <Truck size={48} className="text-zinc-700 light:text-zinc-300" />
               </div>
               <p className="text-sm font-black uppercase tracking-widest leading-relaxed">
                 {lang === 'ar' ? 'اختر طياراً لمراجعة الأوردرات المسندة والتحصيل المالي' : 'Select a staff member to audit assigned trips & collections'}
               </p>
             </div>
           ) : (
             <div className="flex-1 flex flex-col animate-in fade-in duration-300 overflow-hidden">
               {/* Driver Stats View */}
               <div className="p-8 border-b border-zinc-800 light:border-zinc-200 bg-black/20 light:bg-white flex justify-between items-center shrink-0">
                  <div className="flex items-center gap-6 text-start">
                    <div className="w-20 h-20 rounded-3xl bg-red-600 text-white flex items-center justify-center text-4xl font-black shadow-2xl shadow-red-900/20">{selectedDriver.name.charAt(0)}</div>
                    <div>
                      <h4 className="text-3xl font-black tracking-tighter text-zinc-100 light:text-zinc-900 uppercase leading-none mb-2">{selectedDriver.name}</h4>
                      <div className="flex flex-wrap gap-4">
                        <span className="flex items-center gap-1.5 text-[10px] font-black uppercase text-zinc-500"><Phone size={12}/> {selectedDriver.phone}</span>
                        {selectedDriver.vehicleId && <span className="flex items-center gap-1.5 text-[10px] font-black uppercase text-zinc-500"><Hash size={12}/> {selectedDriver.vehicleId}</span>}
                      </div>
                    </div>
                  </div>
               </div>

               {/* Snapshot Metrics */}
               <div className="p-8 grid grid-cols-1 md:grid-cols-3 gap-6 shrink-0 bg-black/10 light:bg-zinc-100/50 border-b border-zinc-800/50 light:border-zinc-200">
                  <div className="p-6 bg-zinc-950 light:bg-white border border-zinc-800 light:border-zinc-200 rounded-[32px] shadow-sm text-start">
                    <p className="text-[10px] font-black uppercase text-zinc-500 mb-1">{t.orders_assigned}</p>
                    <p className="text-3xl font-black text-zinc-100 light:text-zinc-900 tracking-tighter">{driverStats.count}</p>
                  </div>
                  <div className="p-6 bg-zinc-950 light:bg-white border border-zinc-800 light:border-zinc-200 rounded-[32px] shadow-sm text-start">
                    <p className="text-[10px] font-black uppercase text-zinc-500 mb-1">{t.collected_cash}</p>
                    <p className="text-3xl font-black text-red-600 tracking-tighter">{data.currency} {driverStats.totalCash.toLocaleString()}</p>
                  </div>
                  <div className="p-6 bg-zinc-950 light:bg-white border border-zinc-800 light:border-zinc-200 rounded-[32px] shadow-sm text-start">
                    <p className="text-[10px] font-black uppercase text-zinc-500 mb-1">{lang === 'ar' ? 'إجمالي الأجر' : 'Earnings'}</p>
                    <p className="text-3xl font-black text-green-500 tracking-tighter">{data.currency} {driverStats.totalFees.toLocaleString()}</p>
                  </div>
               </div>

               {/* Live Order Tracking List */}
               <div className="flex-1 overflow-y-auto p-8 space-y-6 scrollbar-thin">
                 <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-zinc-500">
                      <Clock size={14}/> {lang === 'ar' ? 'سجل رحلات اليوم' : 'Daily Trips'}
                    </div>
                 </div>
                 
                 <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                   {driverOrders.map(sale => (
                     <div 
                        key={`${sale.id}-${sale.status}`} // Force re-render on status change to refresh badges/buttons
                        onClick={() => onSelectSale(sale)}
                        className={`bg-zinc-900 light:bg-white border border-zinc-800 light:border-zinc-200 p-6 rounded-[32px] flex flex-col gap-6 hover:scale-[1.01] transition-all shadow-lg group relative overflow-hidden cursor-pointer ${getCardBorderStyle(sale.status)} ${sale.status === 'cancelled' ? 'opacity-60 grayscale' : ''}`}
                      >
                        
                        {isProcessing === sale.id && (
                          <div className="absolute inset-0 z-20 bg-black/60 backdrop-blur-sm flex items-center justify-center animate-in fade-in">
                            <RefreshCw className="text-white animate-spin" size={32}/>
                          </div>
                        )}

                        <div className="flex justify-between items-start">
                           <div className="flex items-center gap-3">
                              <div className={`w-10 h-10 rounded-2xl bg-zinc-800 light:bg-zinc-100 flex items-center justify-center transition-colors ${sale.status === 'delivered' ? 'text-green-500' : sale.status === 'cancelled' ? 'text-red-500' : 'text-orange-500 group-hover:text-red-500'}`}><Receipt size={20}/></div>
                              <div className="text-start">
                                 <div className="flex items-center gap-2 mb-1">
                                    <p className="font-black text-zinc-100 light:text-zinc-900 leading-none uppercase tracking-tighter">#{sale.id.split('-')[0]}</p>
                                    {getStatusBadge(sale.status)}
                                 </div>
                                 <p className="text-[10px] text-zinc-500 font-mono font-black">{new Date(sale.timestamp).toLocaleString()}</p>
                              </div>
                           </div>
                           <ArrowUpRight size={18} className="text-zinc-600 group-hover:text-zinc-100 transition-colors" />
                        </div>

                        <div className="p-4 bg-zinc-950 light:bg-zinc-50 rounded-2xl border border-zinc-800 light:border-zinc-200 space-y-1 text-start">
                           <p className="text-[9px] font-black uppercase text-zinc-500">{t.customer_details}</p>
                           <p className="font-bold text-sm light:text-zinc-900 truncate uppercase tracking-tight">{sale.deliveryDetails?.customerName || t.cash_customer}</p>
                           <p className="text-xs text-zinc-600 font-mono">{sale.deliveryDetails?.customerPhone}</p>
                        </div>

                        <div className="flex items-center justify-between mt-auto">
                           <div className="text-start">
                              <p className="text-[9px] font-black uppercase text-zinc-600">{lang === 'ar' ? 'المطلوب تحصيله' : 'To Collect'}</p>
                              <p className="text-xl font-black text-red-600 tracking-tighter">{data.currency} {sale.total.toLocaleString()}</p>
                           </div>
                           <div className="flex gap-2">
                              {/* Order Lifecycle Controls with propagation protection */}
                              {(!sale.status || sale.status === 'pending') ? (
                                <>
                                  <button 
                                    onClick={(e) => handleUpdateStatus(e, sale.id, 'delivered')}
                                    className="w-12 h-12 rounded-2xl bg-green-500/10 text-green-500 border border-green-500/20 flex items-center justify-center hover:bg-green-600 hover:text-white transition-all shadow-lg"
                                    title={lang === 'ar' ? 'توصيل' : 'Deliver'}
                                  >
                                    <CheckCircle2 size={22}/>
                                  </button>
                                  <button 
                                    onClick={(e) => handleUpdateStatus(e, sale.id, 'cancelled')}
                                    className="w-12 h-12 rounded-2xl bg-red-500/10 text-red-500 border border-red-500/20 flex items-center justify-center hover:bg-red-600 hover:text-white transition-all shadow-lg"
                                    title={lang === 'ar' ? 'إلغاء' : 'Cancel'}
                                  >
                                    <XCircle size={22}/>
                                  </button>
                                </>
                              ) : sale.status === 'cancelled' ? (
                                <button 
                                  onClick={(e) => handleUpdateStatus(e, sale.id, 'pending')}
                                  className="px-4 py-2 rounded-xl bg-orange-600/10 text-orange-500 border border-orange-500/20 flex items-center gap-2 text-[10px] font-black uppercase hover:bg-orange-600 hover:text-white transition-all"
                                >
                                  <RotateCcw size={14}/> {lang === 'ar' ? 'استعادة' : 'Restore'}
                                </button>
                              ) : (
                                <button 
                                  onClick={(e) => handleReOrder(e, sale)}
                                  className="px-4 py-2 rounded-xl bg-blue-600/10 text-blue-500 border border-blue-500/20 flex items-center gap-2 text-[10px] font-black uppercase hover:bg-blue-600 hover:text-white transition-all"
                                >
                                  <RefreshCw size={14}/> {lang === 'ar' ? 'تكرار الطلب' : 'Re-Order'}
                                </button>
                              )}
                           </div>
                        </div>
                     </div>
                   ))}
                   {driverOrders.length === 0 && (
                     <div className="col-span-full py-24 text-center space-y-4 opacity-20">
                        <Package size={48} className="mx-auto text-zinc-700" />
                        <p className="text-xs font-black uppercase tracking-widest leading-relaxed">
                          {lang === 'ar' ? 'لا توجد أوردرات نشطة للطيار' : 'No active orders assigned'}
                        </p>
                     </div>
                   )}
                 </div>
               </div>
             </div>
           )}
        </div>
      </div>
    </div>
  );
};

export default DeliveryScreen;
