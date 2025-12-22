
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
  Clock, 
  Receipt,
  ShoppingCart,
  TrendingUp,
  History,
  Globe,
  Instagram,
  Store
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

  const [formData, setFormData] = useState<Omit<Customer, 'id' | 'totalPurchases' | 'invoiceCount' | 'channelsUsed'>>({
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
      addLog({ action: 'CUSTOMER_UPDATED', category: 'system', details: `Updated customer: ${formData.name}` });
    } else {
      const newCustomer: Customer = {
        ...formData,
        id: crypto.randomUUID(),
        totalPurchases: 0,
        invoiceCount: 0,
        channelsUsed: [],
        lastOrderTimestamp: undefined
      };
      updateData({ customers: [...(data.customers || []), newCustomer] });
      addLog({ action: 'CUSTOMER_ADDED', category: 'system', details: `Registered customer: ${formData.name}` });
    }

    setShowFormModal(false);
    setEditingCustomer(null);
    setFormData({ name: '', phone: '', address: '' });
  };

  const deleteCustomer = (id: string) => {
    if (confirm(t.delete_confirm)) {
      updateData({ customers: data.customers.filter(c => c.id !== id) });
      addLog({ action: 'CUSTOMER_REMOVED', category: 'system', details: `Removed customer profile ${id}` });
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
    <div className="p-8 h-full flex flex-col gap-6 text-start bg-zinc-950 light:bg-zinc-50">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-zinc-800 light:bg-white border border-zinc-700 light:border-zinc-200 rounded-lg text-blue-500 light:shadow-sm">
            <Contact size={24} />
          </div>
          <div>
            <h3 className="text-2xl font-bold tracking-tight text-zinc-100 light:text-zinc-900">{t.customers}</h3>
            <p className="text-[10px] text-zinc-500 light:text-zinc-400 uppercase tracking-widest font-black">{lang === 'ar' ? 'إدارة سجلات المستهلكين' : 'Consumer Records Management'}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <Search size={18} className={`absolute ${lang === 'ar' ? 'right-3' : 'left-3'} top-1/2 -translate-y-1/2 text-zinc-500`} />
            <input
              type="text"
              placeholder={t.search}
              className={`bg-zinc-900 light:bg-white border border-zinc-800 light:border-zinc-200 rounded-xl py-2.5 ${lang === 'ar' ? 'pr-10 pl-4' : 'pl-10 pr-4'} focus:outline-none focus:border-blue-500 w-full sm:w-64 text-sm light:text-zinc-900 light:shadow-sm`}
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
        {/* Customer Directory */}
        <div className="lg:col-span-1 bg-zinc-900/30 light:bg-white border border-zinc-800 light:border-zinc-200 rounded-[32px] overflow-hidden flex flex-col backdrop-blur-sm light:shadow-sm">
           <div className="p-4 bg-black/40 light:bg-zinc-100 border-b border-zinc-800 light:border-zinc-200 text-[10px] uppercase font-black tracking-widest text-zinc-500 px-6">
             {t.active_customers} ({filteredCustomers.length})
           </div>
           <div className="flex-1 overflow-y-auto divide-y divide-zinc-800/50 light:divide-zinc-200 scrollbar-thin">
             {filteredCustomers.map(c => (
               <button 
                key={c.id} 
                onClick={() => setSelectedCustomer(c)}
                className={`w-full p-6 text-start hover:bg-zinc-800/30 light:hover:bg-zinc-50 transition-all flex items-center justify-between ${selectedCustomer?.id === c.id ? 'bg-zinc-800/50 light:bg-zinc-100' : ''}`}
               >
                 <div className="flex items-center gap-4">
                   <div className="w-10 h-10 rounded-full bg-blue-600/10 text-blue-500 flex items-center justify-center font-black">{c.name.charAt(0)}</div>
                   <div>
                     <p className="font-bold text-zinc-100 light:text-zinc-900">{c.name}</p>
                     <p className="text-[10px] text-zinc-500 font-mono">{c.phone}</p>
                   </div>
                 </div>
                 {selectedCustomer?.id === c.id && <ArrowUpRight size={16} className="text-blue-500 animate-pulse"/>}
               </button>
             ))}
             {filteredCustomers.length === 0 && (
               <div className="p-10 text-center text-zinc-600 text-xs font-bold uppercase">{t.no_customers}</div>
             )}
           </div>
        </div>

        {/* Customer Profile View */}
        <div className="lg:col-span-2 bg-zinc-900/10 light:bg-zinc-50 border border-zinc-800 light:border-zinc-200 rounded-[40px] overflow-hidden flex flex-col light:shadow-sm">
           {!selectedCustomer ? (
             <div className="flex-1 flex flex-col items-center justify-center text-center opacity-30 grayscale p-12">
               <Contact size={64} className="mb-4 text-zinc-700 light:text-zinc-300" />
               <p className="text-sm font-black uppercase tracking-widest">{lang === 'ar' ? 'اختر عميلاً لعرض السجل الكامل' : 'Select a customer to view full history'}</p>
             </div>
           ) : (
             <div className="flex-1 flex flex-col animate-in fade-in duration-300 overflow-hidden">
               {/* Header */}
               <div className="p-8 border-b border-zinc-800 light:border-zinc-200 bg-black/20 light:bg-white flex justify-between items-start shrink-0">
                 <div className="flex items-center gap-6">
                    <div className="w-20 h-20 rounded-3xl bg-blue-600 text-white flex items-center justify-center text-3xl font-black shadow-xl shadow-blue-900/20">{selectedCustomer.name.charAt(0)}</div>
                    <div>
                      <h4 className="text-3xl font-black tracking-tighter text-zinc-100 light:text-zinc-900 uppercase">{selectedCustomer.name}</h4>
                      <div className="flex gap-4 mt-2 flex-wrap">
                        <span className="flex items-center gap-1.5 text-xs text-zinc-500"><Phone size={12}/> {selectedCustomer.phone}</span>
                        {selectedCustomer.address && <span className="flex items-center gap-1.5 text-xs text-zinc-500"><MapPin size={12}/> {selectedCustomer.address}</span>}
                      </div>
                    </div>
                 </div>
                 <div className="flex gap-2">
                    <button onClick={() => { setEditingCustomer(selectedCustomer); setFormData({name: selectedCustomer.name, phone: selectedCustomer.phone, address: selectedCustomer.address || ''}); setShowFormModal(true); }} className="p-3 text-zinc-500 hover:text-blue-500 hover:bg-blue-500/10 rounded-xl transition-all"><Edit2 size={20}/></button>
                    <button onClick={() => deleteCustomer(selectedCustomer.id)} className="p-3 text-zinc-700 hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-all"><Trash2 size={20}/></button>
                 </div>
               </div>

               {/* Stats Grid */}
               <div className="p-8 grid grid-cols-1 md:grid-cols-3 gap-4 shrink-0 bg-black/10 light:bg-zinc-100/50 border-b border-zinc-800/50 light:border-zinc-200">
                  <div className="p-6 bg-zinc-900/50 light:bg-white border border-zinc-800 light:border-zinc-200 rounded-3xl light:shadow-sm">
                    <p className="text-[10px] font-black uppercase text-zinc-500 mb-1">{t.invoice_count}</p>
                    <p className="text-3xl font-black text-zinc-100 light:text-zinc-900">{selectedCustomer.invoiceCount}</p>
                  </div>
                  <div className="p-6 bg-zinc-900/50 light:bg-white border border-zinc-800 light:border-zinc-200 rounded-3xl light:shadow-sm">
                    <p className="text-[10px] font-black uppercase text-zinc-500 mb-1">{t.total_purchases}</p>
                    <p className="text-3xl font-black text-red-500">{data.currency} {selectedCustomer.totalPurchases.toLocaleString()}</p>
                  </div>
                  <div className="p-6 bg-zinc-900/50 light:bg-white border border-zinc-800 light:border-zinc-200 rounded-3xl light:shadow-sm">
                    <p className="text-[10px] font-black uppercase text-zinc-500 mb-1">{t.avg_order_value}</p>
                    <p className="text-3xl font-black text-emerald-500">{data.currency} {avgOrderValue.toLocaleString()}</p>
                  </div>
               </div>

               <div className="p-8 flex items-center justify-between shrink-0 bg-zinc-900/20 light:bg-white">
                  <div className="flex items-center gap-4">
                     <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">{t.preferred_channels}:</span>
                     <div className="flex gap-2">
                        {selectedCustomer.channelsUsed.map(ch => (
                           <span key={ch} className="px-3 py-1 bg-zinc-800 light:bg-zinc-100 border border-zinc-700 light:border-zinc-200 rounded-full text-[9px] font-black uppercase text-zinc-400 light:text-zinc-600 flex items-center gap-1.5">
                              {getChannelIcon(ch)} {t[ch as keyof typeof t]}
                           </span>
                        ))}
                        {selectedCustomer.channelsUsed.length === 0 && <span className="text-[10px] text-zinc-600">---</span>}
                     </div>
                  </div>
               </div>

               {/* Invoices List */}
               <div className="flex-1 overflow-y-auto p-8 scrollbar-thin">
                 <div className="flex items-center gap-2 mb-4 text-[10px] font-black uppercase tracking-widest text-zinc-500">
                   <History size={14}/> {t.invoice_history}
                 </div>
                 <div className="space-y-3">
                   {customerInvoices.map(sale => (
                     <button 
                      key={sale.id} 
                      onClick={() => onSelectSale(sale)}
                      className="w-full bg-zinc-900/50 light:bg-white border border-zinc-800 light:border-zinc-200 p-5 rounded-2xl flex items-center justify-between group hover:border-blue-500/50 transition-all light:shadow-sm"
                     >
                       <div className="flex items-center gap-4 text-start">
                         <div className="w-10 h-10 rounded-xl bg-black/40 light:bg-zinc-100 flex items-center justify-center text-zinc-500"><Receipt size={20}/></div>
                         <div>
                           <p className="font-bold text-zinc-100 light:text-zinc-900">#{sale.id.split('-')[0].toUpperCase()}</p>
                           <p className="text-[10px] text-zinc-500 uppercase font-black">{new Date(sale.timestamp).toLocaleString()}</p>
                         </div>
                       </div>
                       <div className="flex items-center gap-6">
                         <div className="text-end">
                           <p className="font-black text-red-500">{data.currency} {sale.total.toLocaleString()}</p>
                           <p className="text-[9px] text-zinc-500 font-bold uppercase">{t[sale.saleChannel]}</p>
                         </div>
                         <ArrowUpRight size={16} className="text-zinc-700 opacity-0 group-hover:opacity-100 transition-opacity" />
                       </div>
                     </button>
                   ))}
                   {customerInvoices.length === 0 && <p className="text-center py-20 text-zinc-600 font-bold uppercase text-xs">{lang === 'ar' ? 'لا توجد فواتير مرتبطة بهذا الحساب' : 'No invoices linked to this profile'}</p>}
                 </div>
               </div>
             </div>
           )}
        </div>
      </div>

      {/* Add/Edit Modal */}
      {showFormModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="bg-zinc-900 light:bg-white border border-zinc-800 light:border-zinc-200 w-full max-w-md rounded-[40px] overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300">
            <div className="p-8 border-b border-zinc-800 light:border-zinc-200 flex justify-between items-center bg-black/20 light:bg-zinc-50">
              <h4 className="text-2xl font-black tracking-tighter uppercase light:text-zinc-900">{editingCustomer ? t.edit_customer : t.add_customer}</h4>
              <button onClick={() => setShowFormModal(false)} className="p-3 hover:bg-zinc-800 light:hover:bg-zinc-100 rounded-full transition-colors text-zinc-500 hover:text-white light:hover:text-zinc-900"><X size={24}/></button>
            </div>
            <div className="p-10 space-y-6">
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 light:text-zinc-400 block mb-2">{t.customer_name}</label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600" size={18}/>
                  <input type="text" autoFocus className="w-full bg-black light:bg-zinc-100 border border-zinc-800 light:border-zinc-200 rounded-2xl pl-12 pr-6 py-4 focus:outline-none focus:border-blue-500 text-zinc-100 light:text-zinc-900 font-bold" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                </div>
              </div>
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 light:text-zinc-400 block mb-2">{t.phone_number}</label>
                <div className="relative">
                  <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600" size={18}/>
                  <input type="text" className="w-full bg-black light:bg-zinc-100 border border-zinc-800 light:border-zinc-200 rounded-2xl pl-12 pr-6 py-4 focus:outline-none focus:border-blue-500 text-zinc-100 light:text-zinc-900 font-mono" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
                </div>
              </div>
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 light:text-zinc-400 block mb-2">{t.delivery_address}</label>
                <div className="relative">
                  <MapPin className="absolute left-4 top-4 text-zinc-600" size={18}/>
                  <textarea rows={3} className="w-full bg-black light:bg-zinc-100 border border-zinc-800 light:border-zinc-200 rounded-2xl pl-12 pr-6 py-4 focus:outline-none focus:border-blue-500 text-zinc-100 light:text-zinc-900 resize-none" value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} />
                </div>
              </div>
            </div>
            <div className="p-8 bg-black/40 light:bg-zinc-50 border-t border-zinc-800 light:border-zinc-200 flex gap-4">
              <button onClick={() => setShowFormModal(false)} className="flex-1 py-4 bg-zinc-800 light:bg-zinc-200 text-zinc-400 light:text-zinc-600 font-black uppercase tracking-widest text-xs rounded-2xl">{t.discard}</button>
              <button onClick={handleSave} className="flex-1 py-4 bg-blue-600 text-white font-black uppercase tracking-widest text-xs rounded-2xl shadow-xl shadow-blue-900/30">{t.save_ledger}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomersScreen;
