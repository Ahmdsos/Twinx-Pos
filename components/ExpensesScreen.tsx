
import React, { useState } from 'react';
import { AppData, Expense, LogEntry } from '../types';
import { Plus, Trash2, Receipt, Search, Save, X, DollarSign } from 'lucide-react';
import { translations, Language } from '../translations';

interface ExpensesScreenProps {
  data: AppData;
  updateData: (newData: Partial<AppData>) => void;
  addLog: (log: Omit<LogEntry, 'id' | 'timestamp'>) => void;
  lang: Language;
}

const ExpensesScreen: React.FC<ExpensesScreenProps> = ({ data, updateData, addLog, lang }) => {
  const [isAdding, setIsAdding] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const t = translations[lang];

  const [formData, setFormData] = useState<Omit<Expense, 'id'>>({
    description: '',
    amount: 0,
    timestamp: Date.now(),
  });

  const handleSave = () => {
    if (!formData.description || formData.amount <= 0) return;
    const newExpense: Expense = { ...formData, id: crypto.randomUUID(), timestamp: Date.now() };
    updateData({ expenses: [...data.expenses, newExpense] });
    addLog({ action: 'EXPENSE_LOGGED', category: 'expense', details: `Recorded $${formData.amount}` });
    setIsAdding(false);
    setFormData({ description: '', amount: 0, timestamp: Date.now() });
  };

  const handleDelete = (id: string) => {
    if (confirm(t.delete_confirm)) {
      updateData({ expenses: data.expenses.filter(e => e.id !== id) });
    }
  };

  const filtered = data.expenses.filter(e => e.description.toLowerCase().includes(searchTerm.toLowerCase())).sort((a, b) => b.timestamp - a.timestamp);
  const totalExpenses = data.expenses.reduce((acc, e) => acc + e.amount, 0);

  return (
    <div className="p-8 h-full flex flex-col gap-6 text-start">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Receipt className="text-red-600" size={28} />
          <div>
            <h3 className="text-2xl font-bold">{t.business_expenses}</h3>
            <p className="text-xs text-zinc-500 uppercase tracking-widest font-semibold">{t.total}: ${totalExpenses.toLocaleString()}</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="relative">
            <Search size={18} className={`absolute ${lang === 'ar' ? 'right-3' : 'left-3'} top-1/2 -translate-y-1/2 text-zinc-500`} />
            <input type="text" placeholder={t.search} className={`bg-zinc-900 border border-zinc-800 rounded-lg py-2 ${lang === 'ar' ? 'pr-10 pl-4' : 'pl-10 pr-4'} focus:outline-none focus:border-red-500 w-64`} value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
          </div>
          <button onClick={() => setIsAdding(true)} className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 font-semibold transition-all shadow-lg shadow-red-900/20">
            <Plus size={20} /> {t.log_expense}
          </button>
        </div>
      </div>

      <div className="flex-1 bg-zinc-900/50 border border-zinc-800 rounded-2xl overflow-hidden flex flex-col backdrop-blur-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-start">
            <thead>
              <tr className="bg-black/40 text-[10px] uppercase font-bold tracking-widest text-zinc-500 border-b border-zinc-800">
                <th className="px-6 py-4">{lang === 'ar' ? 'التاريخ' : 'Date'}</th>
                <th className="px-6 py-4">{t.description}</th>
                <th className="px-6 py-4">{t.amount}</th>
                <th className="px-6 py-4">{t.actions}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/50">
              {filtered.map(exp => (
                <tr key={exp.id} className="hover:bg-zinc-800/30 transition-colors group">
                  <td className="px-6 py-4 text-sm text-zinc-500">{new Date(exp.timestamp).toLocaleDateString()}</td>
                  <td className="px-6 py-4 font-semibold text-zinc-100">{exp.description}</td>
                  <td className="px-6 py-4 text-red-500 font-bold">-${exp.amount.toLocaleString()}</td>
                  <td className="px-6 py-4">
                    <button onClick={() => handleDelete(exp.id)} className="p-2 opacity-0 group-hover:opacity-100 hover:bg-red-900/30 rounded-lg text-zinc-400 hover:text-red-500 transition-all"><Trash2 size={16} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {isAdding && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-zinc-900 border border-zinc-800 w-full max-w-md rounded-3xl overflow-hidden shadow-2xl">
            <div className="p-6 border-b border-zinc-800 flex justify-between items-center bg-black/20">
              <h4 className="text-xl font-bold">{t.log_expense}</h4>
              <button onClick={() => setIsAdding(false)} className="p-2 hover:bg-zinc-800 rounded-full transition-colors"><X size={20}/></button>
            </div>
            <div className="p-8 space-y-6">
              <div>
                <label className="text-xs font-bold uppercase tracking-widest text-zinc-500 block mb-1">{t.description}</label>
                <input type="text" className="w-full bg-black border border-zinc-800 rounded-xl px-4 py-3 focus:outline-none focus:border-red-500" value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} />
              </div>
              <div>
                <label className="text-xs font-bold uppercase tracking-widest text-zinc-500 block mb-1">{t.amount}</label>
                <input type="number" className="w-full bg-black border border-zinc-800 rounded-xl px-4 py-3 focus:outline-none focus:border-red-500 text-red-500 font-black" value={formData.amount} onChange={e => setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })} />
              </div>
            </div>
            <div className="p-6 bg-black/40 border-t border-zinc-800 flex gap-4">
              <button onClick={() => setIsAdding(false)} className="flex-1 py-3 bg-zinc-800 text-zinc-300 font-bold rounded-xl">{t.discard}</button>
              <button onClick={handleSave} className="flex-1 py-3 bg-red-600 text-white font-bold rounded-xl shadow-lg flex items-center justify-center gap-2"><Save size={18} /> {t.record}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExpensesScreen;
