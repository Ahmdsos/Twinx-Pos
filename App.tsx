
import React, { useState, useEffect, useCallback } from 'react';
import { 
  LayoutDashboard, 
  ShoppingCart, 
  Package, 
  Settings as SettingsIcon,
  Zap,
  Receipt,
  RotateCcw,
  BarChart3,
  ShieldCheck,
  Users,
  Languages,
  Sun,
  Moon,
  Truck,
  Contact
} from 'lucide-react';
import { AppData, ViewType, DraftInvoice, LogEntry, Sale } from './types';
import { storageService } from './services/storage';
import { translations, Language } from './translations';
import Dashboard from './components/Dashboard';
import SalesScreen from './components/SalesScreen';
import InventoryScreen from './components/InventoryScreen';
import SettingsScreen from './components/SettingsScreen';
import IntelligenceScreen from './components/IntelligenceScreen';
import ExpensesScreen from './components/ExpensesScreen';
import ReturnsScreen from './components/ReturnsScreen';
import ReportsScreen from './components/ReportsScreen';
import AuditLogScreen from './components/AuditLogScreen';
import WholesaleScreen from './components/WholesaleScreen';
import DeliveryScreen from './components/DeliveryScreen';
import CustomersScreen from './components/CustomersScreen';
import SaleDetailsModal from './components/SaleDetailsModal';

const App: React.FC = () => {
  const [view, setView] = useState<ViewType>('dashboard');
  const [lang, setLang] = useState<Language>(() => {
    return (localStorage.getItem('twinx_lang') as Language) || 'ar';
  });
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    return (localStorage.getItem('twinx_theme') as 'light' | 'dark') || 'dark';
  });
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [data, setData] = useState<AppData>({
    products: [],
    sales: [],
    expenses: [],
    returns: [],
    drafts: [],
    logs: [],
    partners: [],
    wholesaleTransactions: [],
    drivers: [],
    customers: [],
    initialCash: 0,
    draftExpiryMinutes: 120,
    currency: 'EGP',
  });

  const t = translations[lang];

  useEffect(() => {
    localStorage.setItem('twinx_lang', lang);
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = lang;
  }, [lang]);

  useEffect(() => {
    localStorage.setItem('twinx_theme', theme);
    if (theme === 'light') {
      document.documentElement.classList.add('light');
    } else {
      document.documentElement.classList.remove('light');
    }
  }, [theme]);

  useEffect(() => {
    const loadedData = storageService.loadData();
    const now = Date.now();
    const expiryMs = (loadedData.draftExpiryMinutes || 120) * 60 * 1000;
    const activeDrafts = (loadedData.drafts || []).filter(
      (d: DraftInvoice) => now - d.timestamp < expiryMs
    );

    const cleanedData = {
      ...loadedData,
      returns: loadedData.returns || [],
      drafts: activeDrafts,
      logs: loadedData.logs || [],
      partners: loadedData.partners || [],
      wholesaleTransactions: loadedData.wholesaleTransactions || [],
      drivers: loadedData.drivers || [],
      customers: loadedData.customers || [],
      currency: loadedData.currency || 'EGP'
    };

    setData(cleanedData);
    if (activeDrafts.length !== (loadedData.drafts || []).length) {
      storageService.saveData(cleanedData);
    }
  }, []);

  const updateData = useCallback((newData: Partial<AppData>) => {
    setData(prev => {
      const updated = { ...prev, ...newData };
      storageService.saveData(updated);
      return updated;
    });
  }, []);

  const addLog = useCallback((log: Omit<LogEntry, 'id' | 'timestamp'>) => {
    const newLog: LogEntry = {
      ...log,
      id: crypto.randomUUID(),
      timestamp: Date.now()
    };
    setData(prev => {
      const updated = { 
        ...prev, 
        logs: [newLog, ...(prev.logs || [])].slice(0, 5000)
      };
      storageService.saveData(updated);
      return updated;
    });
  }, []);

  const totalRetailSales = data.sales.reduce((acc, sale) => acc + sale.total, 0);
  const totalExpenses = data.expenses.reduce((acc, exp) => acc + exp.amount, 0);
  const totalRefunds = data.returns?.reduce((acc, ret) => acc + ret.totalRefund, 0) || 0;
  
  const totalWholesaleReceived = (data.wholesaleTransactions || [])
    .filter(t => t.type === 'sale')
    .reduce((acc, t) => acc + t.paidAmount, 0);
  
  const totalWholesalePaidOut = (data.wholesaleTransactions || [])
    .filter(t => t.type === 'purchase')
    .reduce((acc, t) => acc + t.paidAmount, 0);

  const cashBalance = data.initialCash + totalRetailSales + totalWholesaleReceived - totalExpenses - totalRefunds - totalWholesalePaidOut;

  const renderView = () => {
    switch (view) {
      case 'dashboard':
        return <Dashboard data={data} lang={lang} setView={setView} onSelectSale={setSelectedSale} cashBalance={cashBalance} />;
      case 'sales':
        return <SalesScreen data={data} updateData={updateData} addLog={addLog} lang={lang} />;
      case 'inventory':
        return <InventoryScreen data={data} updateData={updateData} addLog={addLog} lang={lang} />;
      case 'expenses':
        return <ExpensesScreen data={data} updateData={updateData} addLog={addLog} lang={lang} />;
      case 'returns':
        return <ReturnsScreen data={data} updateData={updateData} addLog={addLog} lang={lang} />;
      case 'reports':
        return <ReportsScreen data={data} lang={lang} onSelectSale={setSelectedSale} />;
      case 'intelligence':
        return <IntelligenceScreen data={data} lang={lang} />;
      case 'logs':
        return <AuditLogScreen data={data} lang={lang} />;
      case 'wholesale':
        return <WholesaleScreen data={data} updateData={updateData} addLog={addLog} lang={lang} />;
      case 'delivery':
        return <DeliveryScreen data={data} updateData={updateData} addLog={addLog} lang={lang} onSelectSale={setSelectedSale} />;
      case 'customers':
        return <CustomersScreen data={data} updateData={updateData} addLog={addLog} lang={lang} onSelectSale={setSelectedSale} />;
      case 'settings':
        return <SettingsScreen data={data} updateData={updateData} setData={setData} addLog={addLog} lang={lang} />;
      default:
        return <Dashboard data={data} lang={lang} setView={setView} onSelectSale={setSelectedSale} cashBalance={cashBalance} />;
    }
  };

  const navItems = [
    { id: 'dashboard', label: t.dashboard, icon: <LayoutDashboard size={20} /> },
    { id: 'sales', label: t.sales, icon: <ShoppingCart size={20} /> },
    { id: 'wholesale', label: t.wholesale, icon: <Users size={20} /> },
    { id: 'customers', label: t.customers, icon: <Contact size={20} /> },
    { id: 'delivery', label: t.delivery, icon: <Truck size={20} /> },
    { id: 'inventory', label: t.inventory, icon: <Package size={20} /> },
    { id: 'reports', label: t.reports, icon: <BarChart3 size={20} /> },
    { id: 'returns', label: t.returns, icon: <RotateCcw size={20} /> },
    { id: 'expenses', label: t.expenses, icon: <Receipt size={20} /> },
    { id: 'intelligence', label: t.intelligence, icon: <Zap size={20} /> },
    { id: 'logs', label: t.logs, icon: <ShieldCheck size={20} /> },
    { id: 'settings', label: t.settings, icon: <SettingsIcon size={20} /> },
  ] as const;

  return (
    <div className={`flex h-screen bg-zinc-950 light:bg-zinc-50 text-zinc-100 light:text-zinc-900 overflow-hidden transition-all duration-500 ${lang === 'ar' ? 'font-sans' : 'font-sans'}`}>
      <aside className="w-64 border-zinc-800 light:border-zinc-200 bg-black light:bg-white flex flex-col border-e shrink-0 transition-all duration-500">
        <div className="p-6 border-b border-zinc-800 light:border-zinc-200">
          <h1 className="text-2xl font-bold tracking-tighter flex items-center gap-2">
            <span className="bg-red-600 text-white px-2 py-0.5 rounded shadow-lg shadow-red-900/20">T</span>
            <span className="light:text-zinc-900 uppercase">TWIN<span className="text-red-600">X</span></span>
          </h1>
          <p className="text-[9px] text-zinc-500 mt-1 uppercase tracking-widest font-black opacity-60">Professional Retail Suite</p>
        </div>

        <nav className="flex-1 p-4 space-y-1 overflow-y-auto scrollbar-none">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setView(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 ${
                view === item.id 
                ? 'bg-red-600 text-white shadow-xl shadow-red-900/20 scale-[1.02]' 
                : 'text-zinc-400 light:text-zinc-500 hover:bg-zinc-900 light:hover:bg-zinc-100 hover:text-zinc-100 light:hover:text-zinc-900'
              }`}
            >
              <div className={view === item.id ? 'text-white' : 'text-zinc-50 group-hover:text-red-500'}>
                {item.icon}
              </div>
              <span className="font-black text-xs uppercase tracking-widest">{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-zinc-800 light:border-zinc-200 space-y-2">
          <button 
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="w-full flex items-center justify-between px-4 py-3 rounded-xl bg-zinc-900/50 light:bg-zinc-100 border border-zinc-800 light:border-zinc-200 hover:bg-zinc-800 light:hover:bg-zinc-200 transition-all group overflow-hidden relative"
          >
            <div className="flex items-center gap-3 z-10">
              {theme === 'dark' ? <Sun size={18} className="text-yellow-500 animate-in zoom-in-50" /> : <Moon size={18} className="text-blue-600 animate-in zoom-in-50" />}
              <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500 light:text-zinc-600">{t.theme}</span>
            </div>
            <span className="text-[10px] font-black text-red-500 z-10">{theme === 'dark' ? t.light_mode : t.dark_mode}</span>
          </button>

          <button 
            onClick={() => setLang(lang === 'ar' ? 'en' : 'ar')}
            className="w-full flex items-center justify-between px-4 py-3 rounded-xl bg-zinc-900/50 light:bg-zinc-100 border border-zinc-800 light:border-zinc-200 hover:bg-zinc-800 light:hover:bg-zinc-200 transition-all group"
          >
            <div className="flex items-center gap-3">
              <Languages size={18} className="text-zinc-500 group-hover:text-red-500 transition-colors" />
              <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500 light:text-zinc-600">{t.language}</span>
            </div>
            <span className="text-[10px] font-black text-red-500">{lang === 'ar' ? t.switch_to_en : t.switch_to_ar}</span>
          </button>

          <div className="bg-zinc-900/50 light:bg-zinc-100 rounded-xl p-4 border border-zinc-800/50 light:border-zinc-200/50">
            <div className="flex items-center justify-between text-[9px] text-zinc-600 light:text-zinc-400 mb-2 uppercase tracking-widest font-black">
              <span>{t.local_only}</span>
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 shadow-sm shadow-green-900/50"></span>
            </div>
            <p className="text-[8px] text-zinc-700 light:text-zinc-300 uppercase font-black">TwinX Engine v1.5.2-stable</p>
          </div>
        </div>
      </aside>

      <main className="flex-1 flex flex-col overflow-hidden relative">
        <header className="h-16 border-b border-zinc-800 light:border-zinc-200 flex items-center justify-between px-8 bg-zinc-950 light:bg-white z-10 shrink-0 transition-all duration-500">
          <div className="flex items-center gap-4">
            <h2 className="text-lg font-black uppercase tracking-widest text-zinc-500 light:text-zinc-900">{t[view as keyof typeof t] || view}</h2>
          </div>
          <div className="flex items-center gap-6">
            <div className={`${lang === 'ar' ? 'text-left' : 'text-right'}`}>
              <p className="text-[10px] text-zinc-500 light:text-zinc-400 uppercase tracking-widest leading-none font-black mb-1">{t.net_cash}</p>
              <p className={`text-xl font-black tracking-tighter ${cashBalance >= 0 ? 'text-red-500' : 'text-orange-500'}`}>
                {data.currency} {cashBalance.toLocaleString()}
              </p>
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-auto bg-zinc-950 light:bg-zinc-50 transition-all duration-500">
          {renderView()}
        </div>
      </main>

      {selectedSale && (
        <SaleDetailsModal 
          sale={selectedSale} 
          lang={lang} 
          currency={data.currency || 'EGP'}
          customers={data.customers}
          onClose={() => setSelectedSale(null)} 
          onUpdate={(updatedSale) => {
            const updatedSales = data.sales.map(s => s.id === updatedSale.id ? updatedSale : s);
            updateData({ sales: updatedSales });
            addLog({ action: 'SALE_EDITED', category: 'sale', details: `Edited invoice ${updatedSale.id.split('-')[0]}` });
            setSelectedSale(null);
          }}
          onDelete={(id) => {
            if (confirm(lang === 'ar' ? 'هل أنت متأكد من حذف هذه الفاتورة؟ لن يتم استرجاع المخزون تلقائياً.' : 'Delete invoice? Stock will not be automatically restored.')) {
              updateData({ sales: data.sales.filter(s => s.id !== id) });
              addLog({ action: 'SALE_DELETED', category: 'sale', details: `Deleted invoice ${id.split('-')[0]}` });
              setSelectedSale(null);
            }
          }}
        />
      )}
    </div>
  );
};

export default App;
