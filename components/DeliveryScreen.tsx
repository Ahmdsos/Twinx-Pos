
import React, { useState, useMemo } from 'react';
import { AppData, Driver, Sale, LogEntry } from '../types';
import { translations, Language } from '../translations';
import { 
  Truck, 
  Plus, 
  Search, 
  User, 
  Phone, 
  Hash, 
  X, 
  Save, 
  Trash2, 
  ArrowUpRight, 
  Clock, 
  DollarSign,
  Briefcase,
  Receipt
} from 'lucide-react';

interface DeliveryScreenProps {
  data: AppData;
  updateData: (newData: Partial<AppData>) => void;
  addLog: (log: Omit<LogEntry, 'id' | 'timestamp'>) => void;
  lang: Language;
  onSelectSale: (sale: Sale) => void;
}

const DeliveryScreen: React.FC<DeliveryScreenProps> = ({ data, updateData, addLog, lang, onSelectSale }) => {
  const t = translations[lang];
  const [searchTerm, setSearchTerm] = useState('');
  const [showDriverModal, setShowDriverModal] = useState(false);
  const [selectedDriver, setSelectedDriver] = useState<Driver | null>(null);

  const [driverForm, setDriverForm] = useState<Omit<Driver, 'id' | 'isActive'>>({
    name: '',
    phone: '',
    vehicleId: ''
  });

  const filteredDrivers = useMemo(() => {
    return (data.drivers || []).filter(d => 
      d.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      d.phone.includes(searchTerm)
    );
  }, [data.drivers, searchTerm]);

  const saveDriver = () => {
    if (!driverForm.name || !driverForm.phone) return;
    const newDriver: Driver = {
      ...driverForm,
      id: crypto.randomUUID(),
      isActive: true
    };
    updateData({ drivers: [...(data.drivers || []), newDriver] });
    addLog({ action: 'DRIVER_ADDED', category: 'delivery', details: `Added driver: ${driverForm.name}` });
    setShowDriverModal(false);
    setDriverForm({ name: '', phone: '', vehicleId: '' });
  };

  const deleteDriver = (id: string) => {
    if (confirm(t.delete_confirm)) {
      updateData({ drivers: data.drivers.filter(d => d.id !== id) });
      addLog({ action: 'DRIVER_REMOVED', category: 'delivery', details: `Removed driver ${id}` });
      if (selectedDriver?.id === id) setSelectedDriver(null);
    }
  };

  const driverOrders = useMemo(() => {
    if (!selectedDriver) return [];
    return data.sales
      .filter(s => s.driverId === selectedDriver.id)
      .sort((a, b) => b.timestamp - a.timestamp);
  }, [data.sales, selectedDriver]);

  const driverStats = useMemo(() => {
    if (!selectedDriver) return { totalCash: 0, totalFees: 0, count: 0 };
    return driverOrders.reduce((acc, sale) => ({
      totalCash: acc.totalCash + sale.total,
      totalFees: acc.totalFees + (sale.deliveryFee || 0),
      count: acc.count + 1
    }), { totalCash: 0, totalFees: 0, count: 0 });
  }, [driverOrders, selectedDriver]);

  return (
    <div className="p-8 h-full flex flex-col gap-6 text-start bg-zinc-950 light:bg-zinc-50">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-zinc-800 light:bg-white border border-zinc-700 light:border-zinc-200 rounded-lg text-red-500 light:shadow-sm">
            <Truck size={24} />
          </div>
          <div>
            <h3 className="text-2xl font-bold tracking-tight text-zinc-100 light:text-zinc-900">{t.delivery}</h3>
            <p className="text-[10px] text-zinc-500 light:text-zinc-400 uppercase tracking-widest font-black">{t.drivers_mgmt}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
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
          <button onClick={() => setShowDriverModal(true)} className="bg-red-600 hover:bg-red-700 text-white px-5 py-2.5 rounded-xl flex items-center gap-2 font-black transition-all shadow-xl shadow-red-900/20 text-sm uppercase">
            <Plus size={20} /> {t.add_driver}
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 overflow-hidden">
        {/* قائمة الطيارين */}
        <div className="lg:col-span-1 bg-zinc-900/30 light:bg-white border border-zinc-800 light:border-zinc-200 rounded-[32px] overflow-hidden flex flex-col backdrop-blur-sm light:shadow-sm">
           <div className="p-4 bg-black/40 light:bg-zinc-100 border-b border-zinc-800 light:border-zinc-200 text-[10px] uppercase font-black tracking-widest text-zinc-500 px-6">
             {t.active_drivers} ({filteredDrivers.length})
           </div>
           <div className="flex-1 overflow-y-auto divide-y divide-zinc-800/50 light:divide-zinc-200 scrollbar-thin">
             {filteredDrivers.map(d => (
               <button 
                key={d.id} 
                onClick={() => setSelectedDriver(d)}
                className={`w-full p-6 text-start hover:bg-zinc-800/30 light:hover:bg-zinc-50 transition-all flex items-center justify-between ${selectedDriver?.id === d.id ? 'bg-zinc-800/50 light:bg-zinc-100' : ''}`}
               >
                 <div className="flex items-center gap-4">
                   <div className="w-10 h-10 rounded-full bg-red-600/10 text-red-500 flex items-center justify-center font-black">{d.name.charAt(0)}</div>
                   <div>
                     <p className="font-bold text-zinc-100 light:text-zinc-900">{d.name}</p>
                     <p className="text-[10px] text-zinc-500 font-mono">{d.phone}</p>
                   </div>
                 </div>
                 {selectedDriver?.id === d.id && <ArrowUpRight size={16} className="text-red-500 animate-pulse"/>}
               </button>
             ))}
           </div>
        </div>

        {/* تفاصيل الطيار وأوردراته */}
        <div className="lg:col-span-2 bg-zinc-900/10 light:bg-zinc-50 border border-zinc-800 light:border-zinc-200 rounded-[40px] overflow-hidden flex flex-col light:shadow-sm">
           {!selectedDriver ? (
             <div className="flex-1 flex flex-col items-center justify-center text-center opacity-30 grayscale p-12">
               <Truck size={64} className="mb-4 text-zinc-700 light:text-zinc-300" />
               <p className="text-sm font-black uppercase tracking-widest">{lang === 'ar' ? 'اختر طياراً لمتابعة العهدة' : 'Select a driver to track account'}</p>
             </div>
           ) : (
             <div className="flex-1 flex flex-col animate-in fade-in duration-300 overflow-hidden">
               {/* هيدر الطيار */}
               <div className="p-8 border-b border-zinc-800 light:border-zinc-200 bg-black/20 light:bg-white flex justify-between items-start shrink-0">
                 <div className="flex items-center gap-6">
                    <div className="w-20 h-20 rounded-3xl bg-red-600 text-white flex items-center justify-center text-3xl font-black shadow-xl shadow-red-900/20">{selectedDriver.name.charAt(0)}</div>
                    <div>
                      <h4 className="text-3xl font-black tracking-tighter text-zinc-100 light:text-zinc-900 uppercase">{selectedDriver.name}</h4>
                      <div className="flex gap-4 mt-2">
                        <span className="flex items-center gap-1.5 text-xs text-zinc-500"><Phone size={12}/> {selectedDriver.phone}</span>
                        {selectedDriver.vehicleId && <span className="flex items-center gap-1.5 text-xs text-zinc-500"><Hash size={12}/> {selectedDriver.vehicleId}</span>}
                      </div>
                    </div>
                 </div>
                 <button onClick={() => deleteDriver(selectedDriver.id)} className="p-3 text-zinc-700 hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-all"><Trash2 size={24}/></button>
               </div>

               {/* إحصائيات سريعة للطيار */}
               <div className="p-8 grid grid-cols-1 md:grid-cols-3 gap-4 shrink-0 bg-black/10 light:bg-zinc-100/50">
                  <div className="p-6 bg-zinc-900/50 light:bg-white border border-zinc-800 light:border-zinc-200 rounded-3xl light:shadow-sm">
                    <p className="text-[10px] font-black uppercase text-zinc-500 mb-1">{t.orders_assigned}</p>
                    <p className="text-3xl font-black text-zinc-100 light:text-zinc-900">{driverStats.count}</p>
                  </div>
                  <div className="p-6 bg-zinc-900/50 light:bg-white border border-zinc-800 light:border-zinc-200 rounded-3xl light:shadow-sm">
                    <p className="text-[10px] font-black uppercase text-zinc-500 mb-1">{t.collected_cash}</p>
                    <p className="text-3xl font-black text-red-500">{data.currency} {driverStats.totalCash.toLocaleString()}</p>
                  </div>
                  <div className="p-6 bg-zinc-900/50 light:bg-white border border-zinc-800 light:border-zinc-200 rounded-3xl light:shadow-sm">
                    <p className="text-[10px] font-black uppercase text-zinc-500 mb-1">{t.delivery_fee}</p>
                    <p className="text-3xl font-black text-emerald-500">{data.currency} {driverStats.totalFees.toLocaleString()}</p>
                  </div>
               </div>

               {/* جدول أوردرات الطيار */}
               <div className="flex-1 overflow-y-auto p-8 scrollbar-thin">
                 <div className="flex items-center gap-2 mb-4 text-[10px] font-black uppercase tracking-widest text-zinc-500">
                   <Clock size={14}/> {lang === 'ar' ? 'سجل الرحلات اليومية' : 'Daily Trip Log'}
                 </div>
                 <div className="space-y-3">
                   {driverOrders.map(sale => (
                     <button 
                      key={sale.id} 
                      onClick={() => onSelectSale(sale)}
                      className="w-full bg-zinc-900/50 light:bg-white border border-zinc-800 light:border-zinc-200 p-5 rounded-2xl flex items-center justify-between group hover:border-red-500/50 transition-all light:shadow-sm"
                     >
                       <div className="flex items-center gap-4 text-start">
                         <div className="w-10 h-10 rounded-xl bg-black/40 light:bg-zinc-100 flex items-center justify-center text-zinc-500"><Receipt size={20}/></div>
                         <div>
                           <p className="font-bold text-zinc-100 light:text-zinc-900">#{sale.id.split('-')[0].toUpperCase()}</p>
                           <p className="text-[10px] text-zinc-500 uppercase font-black">{new Date(sale.timestamp).toLocaleTimeString()}</p>
                         </div>
                       </div>
                       <div className="text-end">
                         <p className="font-black text-red-500">{data.currency} {sale.total.toLocaleString()}</p>
                         <p className="text-[10px] text-zinc-500 font-bold uppercase">{sale.deliveryDetails?.customerName}</p>
                       </div>
                     </button>
                   ))}
                   {driverOrders.length === 0 && <p className="text-center py-20 text-zinc-600 font-bold">{lang === 'ar' ? 'لا توجد طلبات مسندة لهذا الطيار' : 'No orders assigned to this driver'}</p>}
                 </div>
               </div>
             </div>
           )}
        </div>
      </div>

      {/* مودال إضافة طيار */}
      {showDriverModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="bg-zinc-900 light:bg-white border border-zinc-800 light:border-zinc-200 w-full max-w-md rounded-[40px] overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300">
            <div className="p-8 border-b border-zinc-800 light:border-zinc-200 flex justify-between items-center bg-black/20 light:bg-zinc-50">
              <h4 className="text-2xl font-black tracking-tighter uppercase light:text-zinc-900">{t.add_driver}</h4>
              <button onClick={() => setShowDriverModal(false)} className="p-3 hover:bg-zinc-800 light:hover:bg-zinc-100 rounded-full transition-colors text-zinc-500 hover:text-white light:hover:text-zinc-900"><X size={24}/></button>
            </div>
            <div className="p-10 space-y-6">
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 light:text-zinc-400 block mb-2">{t.driver_name}</label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600" size={18}/>
                  <input type="text" autoFocus className="w-full bg-black light:bg-zinc-100 border border-zinc-800 light:border-zinc-200 rounded-2xl pl-12 pr-6 py-4 focus:outline-none focus:border-red-500 text-zinc-100 light:text-zinc-900 font-bold" value={driverForm.name} onChange={e => setDriverForm({...driverForm, name: e.target.value})} />
                </div>
              </div>
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 light:text-zinc-400 block mb-2">{t.phone_number}</label>
                <div className="relative">
                  <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600" size={18}/>
                  <input type="text" className="w-full bg-black light:bg-zinc-100 border border-zinc-800 light:border-zinc-200 rounded-2xl pl-12 pr-6 py-4 focus:outline-none focus:border-red-500 text-zinc-100 light:text-zinc-900 font-mono" value={driverForm.phone} onChange={e => setDriverForm({...driverForm, phone: e.target.value})} />
                </div>
              </div>
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 light:text-zinc-400 block mb-2">{t.vehicle_info}</label>
                <div className="relative">
                  <Truck className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600" size={18}/>
                  <input type="text" className="w-full bg-black light:bg-zinc-100 border border-zinc-800 light:border-zinc-200 rounded-2xl pl-12 pr-6 py-4 focus:outline-none focus:border-red-500 text-zinc-100 light:text-zinc-900" value={driverForm.vehicleId || ''} onChange={e => setDriverForm({...driverForm, vehicleId: e.target.value})} />
                </div>
              </div>
            </div>
            <div className="p-8 bg-black/40 light:bg-zinc-50 border-t border-zinc-800 light:border-zinc-200 flex gap-4">
              <button onClick={() => setShowDriverModal(false)} className="flex-1 py-4 bg-zinc-800 light:bg-zinc-200 text-zinc-400 light:text-zinc-600 font-black uppercase tracking-widest text-xs rounded-2xl">{t.discard}</button>
              <button onClick={saveDriver} className="flex-1 py-4 bg-red-600 text-white font-black uppercase tracking-widest text-xs rounded-2xl shadow-xl shadow-red-900/30">{t.save_ledger}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DeliveryScreen;