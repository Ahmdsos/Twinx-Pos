
import React, { useRef } from 'react';
import { AppData, LogEntry } from '../types';
import { 
  Download, 
  Upload, 
  DollarSign, 
  Database, 
  RefreshCcw, 
  Clock, 
  ChevronRight, 
  ShieldAlert,
  Coins
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
    if (confirm(lang === 'ar' ? 'خطر: سيتم مسح كافة البيانات نهائياً!' : 'DANGER: All data will be wiped permanently!')) {
      // Corrected resetData to include drivers property
      const resetData: AppData = { 
        products: [], sales: [], expenses: [], returns: [], drafts: [],
        partners: [], wholesaleTransactions: [], drivers: [], logs: [], initialCash: 0, draftExpiryMinutes: 120, currency: 'EGP'
      };
      setData(resetData);
      storageService.saveData(resetData);
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
        <h3 className="text-3xl font-black tracking-tighter uppercase text-zinc-100 mb-2">{t.sys_admin}</h3>
        <p className="text-sm text-zinc-500 font-medium">{lang === 'ar' ? 'إدارة قواعد البيانات المحلية وتكوين منطق البيع' : 'Manage local database and configure logic'}</p>
      </header>

      <section className="bg-zinc-900/40 border border-zinc-800 rounded-[40px] overflow-hidden backdrop-blur-md">
        <div className="p-8 border-b border-zinc-800 bg-black/20 flex items-center gap-3">
          <div className="p-2 bg-red-600 rounded-xl"><DollarSign size={20} className="text-white" /></div>
          <h4 className="text-xl font-bold">{lang === 'ar' ? 'المعايير التشغيلية والعملة' : 'Operational Parameters & Currency'}</h4>
        </div>
        <div className="p-10 grid grid-cols-1 md:grid-cols-2 gap-12">
          <div className="space-y-4 text-start">
             <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">{t.select_currency}</label>
             <div className="grid grid-cols-2 gap-2">
                {currencies.map(curr => (
                  <button 
                    key={curr.code}
                    onClick={() => updateData({ currency: curr.code })}
                    className={`px-4 py-3 rounded-xl border text-[10px] font-black uppercase tracking-widest transition-all ${data.currency === curr.code ? 'bg-red-600 border-red-500 text-white' : 'bg-zinc-800 border-zinc-700 text-zinc-500 hover:text-zinc-300'}`}
                  >
                    {curr.label} ({curr.code})
                  </button>
                ))}
             </div>
          </div>
          <div className="space-y-4">
             <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">{t.opening_cash}</label>
             <div className="relative">
                <span className="absolute left-6 top-1/2 -translate-y-1/2 text-zinc-600 font-black">{data.currency}</span>
                <input type="number" value={data.initialCash} onChange={(e) => updateData({ initialCash: parseFloat(e.target.value) || 0 })} className="w-full bg-black border border-zinc-800 rounded-2xl py-5 px-6 pl-16 focus:outline-none focus:border-red-500 text-3xl font-black text-red-500" />
             </div>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        <section className="bg-zinc-900/40 border border-zinc-800 rounded-[40px] overflow-hidden">
          <div className="p-8 border-b border-zinc-800 bg-black/20 flex justify-between items-center">
            <h4 className="text-xl font-bold">{lang === 'ar' ? 'النسخ الاحتياطي' : 'Data Backup'}</h4>
            <span className="text-[10px] font-black uppercase text-zinc-500">{t.last_backup}: {data.lastBackupTimestamp ? new Date(data.lastBackupTimestamp).toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-US') : '---'}</span>
          </div>
          <div className="p-8 space-y-4">
            <button onClick={handleExport} className="w-full flex items-center justify-between p-6 bg-zinc-800/40 hover:bg-red-600 rounded-3xl transition-all group">
              <div className="flex items-center gap-4">
                <Download className="text-red-500 group-hover:text-white" />
                <span className="font-bold">{t.generate_backup}</span>
              </div>
              <ChevronRight className="text-zinc-600 group-hover:text-white" />
            </button>
            <div className="relative">
              <input type="file" ref={fileInputRef} className="hidden" accept=".json" onChange={handleImport} />
              <button onClick={() => fileInputRef.current?.click()} className="w-full flex items-center justify-between p-6 bg-zinc-800/40 hover:bg-zinc-800 rounded-3xl transition-all group">
                <div className="flex items-center gap-4">
                  <Upload className="text-blue-500" />
                  <span className="font-bold">{t.restore_ledger}</span>
                </div>
                <ChevronRight className="text-zinc-600" />
              </button>
            </div>
          </div>
        </section>

        <section className="bg-zinc-900/40 border border-red-900/20 rounded-[40px] overflow-hidden p-12 text-center flex flex-col items-center justify-center">
            <ShieldAlert size={48} className="text-red-600 mb-6" />
            <h4 className="text-xl font-black mb-4 uppercase">{t.factory_reset}</h4>
            <p className="text-xs text-zinc-500 mb-8">{lang === 'ar' ? 'سيتم حذف كل شيء نهائياً من هذا الجهاز.' : 'All local data will be permanently deleted.'}</p>
            <button onClick={handleReset} className="w-full py-6 bg-red-600/10 border border-red-600/50 text-red-600 hover:bg-red-600 hover:text-white font-black rounded-3xl transition-all">{lang === 'ar' ? 'تأكيد الحذف النهائي' : 'Confirm Wipe'}</button>
        </section>
      </div>
    </div>
  );
};

export default SettingsScreen;