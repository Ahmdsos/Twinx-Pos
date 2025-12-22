import React, { useState, useMemo } from 'react';
import { AppData, Customer, LogEntry, Sale } from '../types';
import { translations, Language } from '../translations';
import { 
  Contact, 
  Plus, 
  Search, 
  Trash2, 
  Edit2, 
  X, 
  Save, 
  Phone, 
  User, 
  MapPin, 
  ArrowUpRight, 
  History,
  Star,
  Clock,
  Receipt,
  Globe,
  Instagram,
  Store,
  DollarSign,
  Hash
} from 'lucide-react';

interface CustomersScreenProps {
  data: AppData;
  updateData: (newData: Partial<AppData>) => void;
  addLog: (log: Omit<LogEntry, 'id' | 'timestamp'>) => void;
  lang: Language;
  onSelectSale: (sale: Sale) => void;
}

const CustomersScreen: React.FC<CustomersScreenProps> = ({ data, updateData, addLog, lang, onSelectSale }) => {
  const t = translations[lang];
  const [searchTerm, setSearchTerm] = useState('');
  const [showFormModal, setShowFormModal] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);

  const [formData, setFormData] = useState<Omit<Customer, 'id' | 'totalPurchases' | 'invoiceCount' | 'channelsUsed' | 'totalPoints' | 'lastOrderTimestamp' | 'lastVisit'>>({
    name: '',
    phone: '',
    address: ''
  });

  const filteredCustomers = useMemo(() => {
    return (data.customers || []).filter(c => 
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      c.phone.includes(searchTerm)
    );
  }, [data.customers, searchTerm]);

  const handleSave = () => {
    if (!formData.name || !formData.phone) return;

    if (editingCustomer) {
      const updated = data.customers.map(c => c.id === editingCustomer.id ? { ...c, ...formData } : c);
      updateData({ customers: updated });
      addLog({ action: 'CUSTOMER_UPDATED', category: 'system', details: `Updated profile: ${formData.name}` });
    } else {
      const newCustomer: Customer = {
        ...formData,
        id: crypto.randomUUID(),
        totalPurchases: 0,
        invoiceCount: 0,
        channelsUsed: [],
        totalPoints: 0,
        lastOrderTimestamp: undefined,
        lastVisit: undefined
      };
      updateData({ customers: [...(data.customers || []), newCustomer] });
      addLog({ action: 'CUSTOMER_ADDED', category: 'system', details: `Registered customer: ${formData.name} (${formData.phone})` });
    }

    setShowFormModal(false);
    setEditingCustomer(null);
    setFormData({ name: '', phone: '', address: '' });
  };

  const deleteCustomer = (id: string) => {
    if (confirm(t.delete_confirm)) {
      updateData({ customers: data.customers.filter(c => c.id !== id) });
      addLog({ action: 'CUSTOMER_REMOVED', category: 'system', details: `Deleted profile ${id}` });
      if (selectedCustomer?.id === id) setSelectedCustomer(null);
    }
  };

  const customerInvoices = useMemo(() => {
    if (!selectedCustomer) return [];
    return data.sales
      .filter(s => s.customerId === selectedCustomer.id || (s.deliveryDetails?.customerPhone === selectedCustomer.phone))
      .sort((a, b) => b.timestamp - a.timestamp);
  }, [data.sales, selectedCustomer]);

  const avgOrderValue = useMemo(() => {
    if (!selectedCustomer || selectedCustomer.invoiceCount === 0) return 0;
    return selectedCustomer.totalPurchases / selectedCustomer.invoiceCount;
  }, [selectedCustomer]);

  const getChannelIcon = (channel: string) => {
    switch (channel) {
      case 'social_media': return <Instagram size={12} />;
      case 'website': return <Globe size={12} />;
      default: return <Store size={12} />;
    }
  };

  return (
    <div className="p-8 h-full flex flex-col gap-6 text-start bg-zinc-950 light:bg-zinc-50 overflow-hidden">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-600 rounded-lg shadow-lg shadow-blue-900/20">
            <Contact size={24} className="text-white" />
          </div>
          <div>
            <h3 className="text-2xl font-black tracking-tighter text-zinc-100 light:text-zinc-900 uppercase leading-none">{t.customers}</h3>
            <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-black mt-1">{lang === 'ar' ? 'قاعدة بيانات المستهلكين' : 'Consumer Database Management'}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <Search size={18} className={`absolute ${lang === 'ar' ? 'right-3' : 'left-3'} top-1/2 -translate-y-1/2 text-zinc-500`} />
            <input
              type="text"
              placeholder={t.search}
              className="bg-zinc-900 light:bg-white border border-zinc-800 light:border-zinc-200 rounded-xl py-2.5 px-10 focus:outline-none focus:border-blue-500 w-64 text-sm light:text-zinc-900 shadow-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button onClick={() => { setEditingCustomer(null); setFormData({name:'', phone:'', address:''}); setShowFormModal(true); }} className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl flex items-center gap-2 font-black transition-all shadow-xl shadow-blue-900/20 text-sm uppercase">
            <Plus size={20} /> {t.add_customer}
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 overflow-hidden">
        {/* Directory */}
        <div className="lg:col-span-1 bg-zinc-900/30 light:bg-white border border-zinc-800 light:border-zinc-200 rounded-[32px] overflow-hidden flex flex-col shadow-xl">
           <div className="p-4 bg-black/40 light:bg-zinc-100 border-b border-zinc-800 light:border-zinc-200 text-[10px] uppercase font-black tracking-widest text-zinc-500 px-6">
             {t.active_customers} ({filteredCustomers.length})
           </div>
           <div className="flex-1 overflow-y-auto divide-y divide-zinc-800/50 light:divide-zinc-200 scrollbar-thin">
             {filteredCustomers.map(c => (
               <button 
                key={c.id} 
                onClick={() => setSelectedCustomer(c)}
                className={`w-full p-6 text-start hover:bg-zinc-800/30 light:hover:bg-zinc-50 transition-all flex items-center justify-between ${selectedCustomer?.id === c.id ? 'bg-blue-600/5 light:bg-blue-50 border-s-4 border-blue-600' : ''}`}
               >
                 <div className="flex items-center gap-4">
                   <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-black ${selectedCustomer?.id === c.id ? 'bg-blue-600 text-white' : 'bg-zinc-800 light:bg-zinc-100 text-zinc-500'}`}>{c.name.charAt(0)}</div>
                   <div className="min-w-0">
                     <p className="font-bold text-zinc-100 light:text-zinc-900 truncate">{c.name}</p>
                     <div className="flex items-center gap-2 mt-0.5">
                        <p className="text-[10px] text-zinc-500 font-mono">{c.phone}</p>
                        {c.totalPoints > 0 && <span className="flex items-center gap-0.5 text-[9px] font-black text-yellow-500 uppercase"><Star size={8} fill="currentColor"/> {c.totalPoints}</span>}
                     </div>
                   </div>
                 </div>
               </button>
             ))}
           </div>
        </div>

        {/* Profile */}
        <div className="lg:col-span-2 bg-zinc-900/10 light:bg-zinc-50 border border-zinc-800 light:border-zinc-200 rounded-[40px] overflow-hidden flex flex-col shadow-2xl relative">
           {!selectedCustomer ? (
             <div className="flex-1 flex flex-col items-center justify-center text-center p-12 space-y-4 opacity-30">
               <div className="w-24 h-24 rounded-full bg-zinc-900 light:bg-white flex items-center justify-center border border-zinc-800 light:border-zinc-200"><Contact size={48} /></div>
               <p className="text-sm font-black uppercase tracking-widest">{lang === 'ar' ? 'اختر ملف عميل للمراجعة' : 'Select a customer profile to review history'}</p>
             </div>
           ) : (
             <div className="flex-1 flex flex-col animate-in fade-in duration-300 overflow-hidden">
               <div className="p-8 border-b border-zinc-800 light:border-zinc-200 bg-black/20 light:bg-white flex justify-between items-start shrink-0">
                 <div className="flex items-center gap-6 text-start">
                    <div className="w-20 h-20 rounded-3xl bg-blue-600 text-white flex items-center justify-center text-3xl font-black shadow-xl">{selectedCustomer.name.charAt(0)}</div>
                    <div>
                      <h4 className="text-3xl font-black tracking-tighter text-zinc-100 light:text-zinc-900 uppercase leading-none mb-3">{selectedCustomer.name}</h4>
                      <div className="flex flex-wrap gap-4">
                        <span className="flex items-center gap-1.5 text-[10px] font-black uppercase text-zinc-500"><Phone size={12}/> {selectedCustomer.phone}</span>
                        {selectedCustomer.address && <span className="flex items-center gap-1.5 text-[10px] font-black uppercase text-zinc-500"><MapPin size={12}/> {selectedCustomer.address}</span>}
                      </div>
                    </div>
                 </div>
                 <div className="flex gap-2">
                    <button onClick={() => { setEditingCustomer(selectedCustomer); setFormData({name: selectedCustomer.name, phone: selectedCustomer.phone, address: selectedCustomer.address || ''}); setShowFormModal(true); }} className="p-3 text-zinc-500 hover:text-blue-500 transition-all"><Edit2 size={20}/></button>
                    <button onClick={() => deleteCustomer(selectedCustomer.id)} className="p-3 text-zinc-700 hover:text-red-500 transition-all"><Trash2 size={20}/></button>
                 </div>
               </div>

               <div className="p-8 grid grid-cols-1 md:grid-cols-4 gap-4 shrink-0 bg-black/10 light:bg-zinc-100/50 border-b border-zinc-800/50 light:border-zinc-200">
                  <div className="p-6 bg-zinc-900 light:bg-white border border-zinc-800 light:border-zinc-200 rounded-3xl shadow-sm text-start">
                    <p className="text-[9px] font-black uppercase text-zinc-500 mb-1">{t.invoice_count}</p>
                    <p className="text-3xl font-black text-zinc-100 light:text-zinc-900">{selectedCustomer.invoiceCount}</p>
                  </div>
                  <div className="p-6 bg-zinc-900 light:bg-white border border-zinc-800 light:border-zinc-200 rounded-3xl shadow-sm text-start">
                    <p className="text-[9px] font-black uppercase text-zinc-500 mb-1">{lang === 'ar' ? 'نقاط الولاء' : 'Loyalty Points'}</p>
                    <p className="text-3xl font-black text-yellow-500 flex items-center gap-2 tracking-tighter"><Star fill="currentColor" size={24}/> {selectedCustomer.totalPoints}</p>
                  </div>
                  <div className="p-6 bg-zinc-900 light:bg-white border border-zinc-800 light:border-zinc-200 rounded-3xl shadow-sm text-start">
                    <p className="text-[9px] font-black uppercase text-zinc-500 mb-1">{t.total_purchases}</p>
                    <p className="text-3xl font-black text-red-500 tracking-tighter">{data.currency} {selectedCustomer.totalPurchases.toLocaleString()}</p>
                  </div>
                  <div className="p-6 bg-zinc-900 light:bg-white border border-zinc-800 light:border-zinc-200 rounded-3xl shadow-sm text-start">
                    <p className="text-[9px] font-black uppercase text-zinc-500 mb-1">{lang === 'ar' ? 'آخر زيارة' : 'Last Visit'}</p>
                    <p className="text-sm font-black text-zinc-400 mt-2 uppercase">{selectedCustomer.lastVisit ? new Date(selectedCustomer.lastVisit).toLocaleDateString() : '---'}</p>
                  </div>
               </div>

               <div className="flex-1 overflow-y-auto p-8 scrollbar-thin">
                 <div className="flex items-center gap-2 mb-4 text-[10px] font-black uppercase tracking-widest text-zinc-500">
                   <History size={14}/> {t.invoice_history}
                 </div>
                 <div className="space-y-3">
                   {customerInvoices.map(sale => (
                     <div key={sale.id} onClick={() => onSelectSale(sale)} className="w-full bg-zinc-900 light:bg-white border border-zinc-800 light:border-zinc-200 p-6 rounded-[24px] flex items-center justify-between group hover:border-blue-600 transition-all cursor-pointer shadow-lg">
                       <div className="flex items-center gap-4 text-start">
                         <div className="w-10 h-10 rounded-xl bg-zinc-800 light:bg-zinc-100 flex items-center justify-center text-zinc-500 group-hover:text-blue-500 transition-colors"><Receipt size={20}/></div>
                         <div>
                           <p className="font-black text-zinc-100 light:text-zinc-900 uppercase tracking-tighter leading-none mb-1">#{sale.id.split('-')[0]}</p>
                           <p className="text-[10px] text-zinc-500 font-mono font-black">{new Date(sale.timestamp).toLocaleString()}</p>
                         </div>
                       </div>
                       <div className="text-end flex items-center gap-6">
                         <div>
                            <p className="font-black text-xl text-red-500 tracking-tighter">{data.currency} {sale.total.toLocaleString()}</p>
                            <p className="text-[8px] font-black uppercase tracking-widest text-zinc-600">{t[sale.saleChannel]}</p>
                         </div>
                         <ArrowUpRight size={18} className="text-zinc-700 opacity-0 group-hover:opacity-100 transition-opacity" />
                       </div>
                     </div>
                   ))}
                 </div>
               </div>
             </div>
           )}
        </div>
      </div>

      {/* FORM MODAL */}
      {showFormModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 backdrop-blur-md p-4 animate-in fade-in">
          <div className="bg-zinc-900 light:bg-white border border-zinc-800 light:border-zinc-200 w-full max-w-md rounded-[40px] overflow-hidden shadow-2xl animate-in zoom-in-95">
            <div className="p-8 border-b border-zinc-800 light:border-zinc-200 flex justify-between items-center bg-black/20 light:bg-zinc-50">
              <h4 className="text-2xl font-black tracking-tighter uppercase light:text-zinc-900">{editingCustomer ? t.edit_customer : t.add_customer}</h4>
              <button onClick={() => setShowFormModal(false)} className="p-3 text-zinc-500 hover:text-white transition-colors"><X size={24}/></button>
            </div>
            <div className="p-10 space-y-6 text-start">
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 block mb-2">{t.customer_name}</label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600" size={18}/>
                  <input type="text" autoFocus className="w-full bg-black light:bg-zinc-100 border border-zinc-800 light:border-zinc-200 rounded-2xl pl-12 pr-4 py-4 focus:outline-none focus:border-blue-500 text-zinc-100 light:text-zinc-900 font-bold" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                </div>
              </div>
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 block mb-2">{t.phone_number}</label>
                <div className="relative">
                  <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600" size={18}/>
                  <input type="text" className="w-full bg-black light:bg-zinc-100 border border-zinc-800 light:border-zinc-200 rounded-2xl pl-12 pr-4 py-4 focus:outline-none focus:border-blue-500 text-zinc-100 light:text-zinc-900 font-mono" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
                </div>
              </div>
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 block mb-2">{t.delivery_address}</label>
                <div className="relative">
                  <MapPin className="absolute left-4 top-4 text-zinc-600" size={18}/>
                  <textarea rows={3} className="w-full bg-black light:bg-zinc-100 border border-zinc-800 light:border-zinc-200 rounded-2xl pl-12 pr-4 py-4 focus:outline-none focus:border-blue-500 text-zinc-100 light:text-zinc-900 resize-none" value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} />
                </div>
              </div>
            </div>
            <div className="p-8 bg-black/40 light:bg-zinc-50 border-t border-zinc-800 light:border-zinc-200 flex gap-4">
              <button onClick={() => setShowFormModal(false)} className="flex-1 py-4 bg-zinc-800 light:bg-zinc-200 text-zinc-400 font-black uppercase text-xs rounded-2xl tracking-widest">{t.discard}</button>
              <button onClick={handleSave} className="flex-1 py-4 bg-blue-600 text-white font-black uppercase text-xs rounded-2xl shadow-xl shadow-blue-900/30 tracking-widest">{t.save_ledger}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomersScreen;