
import React, { useRef } from 'react';
import { AppData, LogEntry } from '../types';
import { 
  Download, 
  Upload, 
  DollarSign, 
  ShieldAlert, 
  ChevronRight,
  UserCog,
  Database
} from 'lucide-react';
import { storageService } from '../services/storage';
import { translations, Language } from '../translations';

interface SettingsScreenProps {
  data: AppData;
  updateData: (newData: Partial<AppData>) => void;
  setData: (data: AppData) => void;
  addLog: (log: Omit<LogEntry, 'id' | 'timestamp'>) => void;
  lang: Language;
}

const SettingsScreen: React.FC<SettingsScreenProps> = ({ data, updateData, setData, addLog, lang }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const t = translations[lang];

  const handleExport = () => {
    const timestamp = storageService.exportData(data);
    updateData({ lastBackupTimestamp: timestamp });
    addLog({ action: 'BACKUP_EXPORTED', category: 'system', details: 'Exported system ledger' });
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const imported = await storageService.importData(file);
      if (imported && confirm(lang === 'ar' ? 'هذا سيؤدي لمسح البيانات الحالية واستبدالها. هل أنت متأكد؟' : 'This will overwrite current data. Proceed?')) {
        setData(imported);
        storageService.saveData(imported);
        addLog({ action: 'SYSTEM_RESTORED', category: 'system', details: 'Imported data from file' });
      }
    }
  };

  const handleReset = () => {
    if (confirm(lang === 'ar' ? 'تحذير: سيتم مسح كافة البيانات (مبيعات، موظفين، مخزون، إعدادات). هل أنت متأكد تماماً؟' : 'WARNING: This will wipe ALL data (Sales, Staff, Inventory, Settings). Are you absolutely sure?')) {
      const resetData: AppData = { 
        products: [], 
        sales: [], 
        expenses: [], 
        returns: [], 
        drafts: [],
        partners: [], 
        wholesaleTransactions: [], 
        drivers: [], 
        customers: [], 
        employees: [],
        attendance: [],
        salaryTransactions: [],
        shifts: [],
        categories: [],
        stockLogs: [],
        logs: [], 
        initialCash: 0, 
        draftExpiryMinutes: 120, 
        currency: 'EGP'
      };
      setData(resetData);
      storageService.saveData(resetData);
      addLog({ action: 'FACTORY_RESET', category: 'system', details: 'System reset to factory settings' });
    }
  };

  const currencies = [
    { code: 'EGP', label: t.currency_egp },
    { code: 'USD', label: t.currency_usd },
    { code: 'EUR', label: t.currency_eur },
    { code: 'SAR', label: t.currency_sar },
    { code: 'AED', label: t.currency_aed },
    { code: 'KWD', label: t.currency_kwd },
  ];

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-10 pb-24 text-start">
      <header>
        <h3 className="text-3xl font-black tracking-tighter uppercase text-zinc-100 light:text-zinc-900 mb-2">{t.sys_admin}</h3>
        <p className="text-sm text-zinc-500 font-medium">{lang === 'ar' ? 'إدارة قواعد البيانات المحلية وتكوين منطق البيع' : 'Manage local database and configure logic'}</p>
      </header>

      {/* SECTION 1: OPS & CURRENCY */}
      <section className="bg-zinc-950 light:bg-white border border-zinc-800 light:border-zinc-200 rounded-[40px] overflow-hidden backdrop-blur-md">
        <div className="p-8 border-b border-zinc-800 light:border-zinc-200 bg-black/20 light:bg-zinc-50 flex items-center gap-3">
          <div className="p-2 bg-red-600 rounded-xl"><DollarSign size={20} className="text-white" /></div>
          <h4 className="text-xl font-bold light:text-zinc-900">{lang === 'ar' ? 'المعايير التشغيلية والعملة' : 'Operational Parameters & Currency'}</h4>
        </div>
        <div className="p-10 grid grid-cols-1 md:grid-cols-2 gap-12">
          <div className="space-y-4 text-start">
             <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 light:text-zinc-600">{t.select_currency}</label>
             <div className="grid grid-cols-2 gap-2">
                {currencies.map(curr => (
                  <button 
                    key={curr.code}
                    onClick={() => updateData({ currency: curr.code })}
                    className={`px-4 py-3 rounded-xl border text-[10px] font-black uppercase tracking-widest transition-all ${data.currency === curr.code ? 'bg-red-600 border-red-500 text-white shadow-lg shadow-red-900/20' : 'bg-zinc-900 light:bg-zinc-100 border-zinc-800 light:border-zinc-200 text-zinc-500 hover:text-zinc-300 light:hover:text-zinc-900'}`}
                  >
                    {curr.label} ({curr.code})
                  </button>
                ))}
             </div>
          </div>
          <div className="space-y-4">
             <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 light:text-zinc-600">{t.opening_cash}</label>
             <div className="relative">
                <span className={`absolute ${lang === 'ar' ? 'right-6' : 'left-6'} top-1/2 -translate-y-1/2 text-zinc-600 font-black`}>{data.currency}</span>
                <input type="number" value={data.initialCash} onChange={(e) => updateData({ initialCash: parseFloat(e.target.value) || 0 })} className={`w-full bg-black light:bg-zinc-100 border border-zinc-800 light:border-zinc-200 rounded-2xl py-5 px-6 ${lang === 'ar' ? 'pr-16' : 'pl-16'} focus:outline-none focus:border-red-500 text-3xl font-black text-red-500`} />
             </div>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        {/* SECTION 2: DATA & BACKUP */}
        <section className="bg-zinc-950 light:bg-white border border-zinc-800 light:border-zinc-200 rounded-[40px] overflow-hidden">
          <div className="p-8 border-b border-zinc-800 light:border-zinc-200 bg-black/20 light:bg-zinc-50 flex justify-between items-center">
            <div className="flex items-center gap-3">
               <Database size={20} className="text-blue-500"/>
               <h4 className="text-xl font-bold light:text-zinc-900">{lang === 'ar' ? 'البيانات' : 'Data Management'}</h4>
            </div>
            <span className="text-[10px] font-black uppercase text-zinc-500 light:text-zinc-400">{t.last_backup}: {data.lastBackupTimestamp ? new Date(data.lastBackupTimestamp).toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-US') : '---'}</span>
          </div>
          <div className="p-8 space-y-4">
            <button onClick={handleExport} className="w-full flex items-center justify-between p-6 bg-zinc-900/40 light:bg-zinc-50 hover:bg-blue-600 rounded-3xl transition-all group border border-zinc-800 light:border-zinc-200">
              <div className="flex items-center gap-4">
                <Download className="text-blue-500 group-hover:text-white" />
                <span className="font-bold light:text-zinc-900 group-hover:text-white">{t.generate_backup}</span>
              </div>
              <ChevronRight className="text-zinc-600 group-hover:text-white" />
            </button>
            <div className="relative">
              <input type="file" ref={fileInputRef} className="hidden" accept=".json" onChange={handleImport} />
              <button onClick={() => fileInputRef.current?.click()} className="w-full flex items-center justify-between p-6 bg-zinc-900/40 light:bg-zinc-50 hover:bg-zinc-800 light:hover:bg-zinc-100 rounded-3xl transition-all group border border-zinc-800 light:border-zinc-200">
                <div className="flex items-center gap-4">
                  <Upload className="text-zinc-500" />
                  <span className="font-bold light:text-zinc-900">{t.restore_ledger}</span>
                </div>
                <ChevronRight className="text-zinc-600" />
              </button>
            </div>
          </div>
        </section>

        {/* SECTION 3: ROLE MANAGEMENT & RESET */}
        <div className="space-y-6">
            <section className="bg-zinc-950 light:bg-white border border-zinc-800 light:border-zinc-200 rounded-[40px] overflow-hidden p-8">
               <div className="flex items-center gap-3 mb-4">
                  <UserCog size={20} className="text-orange-500"/>
                  <h4 className="text-lg font-bold light:text-zinc-900">{lang === 'ar' ? 'إدارة الصلاحيات' : 'Role Management'}</h4>
               </div>
               <p className="text-xs text-zinc-500 mb-6">{lang === 'ar' ? 'صلاحيات المسؤول تتيح الوصول الكامل. الكاشير محدود بالمبيعات والمخزون.' : 'Admin role grants full access. Cashier is limited to Sales & Inventory.'}</p>
               <div className="flex gap-2">
                  <div className="px-4 py-2 bg-zinc-900 light:bg-zinc-100 rounded-xl border border-zinc-800 light:border-zinc-200 text-[10px] font-black uppercase text-zinc-500 flex-1 text-center">Admin (Full)</div>
                  <div className="px-4 py-2 bg-zinc-900 light:bg-zinc-100 rounded-xl border border-zinc-800 light:border-zinc-200 text-[10px] font-black uppercase text-zinc-500 flex-1 text-center">Cashier (POS)</div>
                  <div className="px-4 py-2 bg-zinc-900 light:bg-zinc-100 rounded-xl border border-zinc-800 light:border-zinc-200 text-[10px] font-black uppercase text-zinc-500 flex-1 text-center">Delivery (Orders)</div>
               </div>
            </section>

            <section className="bg-red-950/20 light:bg-red-50 border border-red-900/30 light:border-red-200 rounded-[40px] overflow-hidden p-8 text-center flex flex-col items-center justify-center">
                <ShieldAlert size={32} className="text-red-600 mb-4" />
                <h4 className="text-lg font-black mb-2 uppercase light:text-zinc-900">{t.factory_reset}</h4>
                <p className="text-[10px] text-zinc-500 light:text-zinc-600 mb-6 font-bold uppercase">{lang === 'ar' ? 'تحذير: منطقة خطر' : 'Danger Zone'}</p>
                <button onClick={handleReset} className="w-full py-4 bg-red-600 text-white font-black rounded-2xl transition-all hover:bg-red-700 shadow-lg shadow-red-900/20 text-xs uppercase tracking-widest">{lang === 'ar' ? 'مسح كافة البيانات' : 'Wipe Database'}</button>
            </section>
        </div>
      </div>
    </div>
  );
};

export default SettingsScreen;
