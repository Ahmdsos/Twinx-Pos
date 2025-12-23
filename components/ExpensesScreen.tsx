
import React, { useState } from 'react';
import { AppData, Expense, LogEntry } from '../types';
import { Plus, Trash2, Receipt, Search, Save, X, DollarSign, User, Briefcase } from 'lucide-react';
import { translations, Language } from '../translations';
import { TwinXOps } from '../services/operations';

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

  // UI State for expense type toggling
  const [expenseType, setExpenseType] = useState<'general' | 'salary'>('general');

  const [formData, setFormData] = useState<Omit<Expense, 'id'>>({
    description: '',
    amount: 0,
    timestamp: Date.now(),
    employeeId: undefined
  });

  const handleSave = () => {
    if (!formData.description || formData.amount <= 0) return;
    
    // If Salary type, description is auto-generated but ensure we have employeeId
    if (expenseType === 'salary' && !formData.employeeId) return;

    const newExpense: Expense = { 
        ...formData, 
        id: crypto.randomUUID(), 
        timestamp: Date.now() 
    };

    updateData(TwinXOps.processExpense(data, newExpense));
    setIsAdding(false);
    setFormData({ description: '', amount: 0, timestamp: Date.now() });
    setExpenseType('general');
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
          <div className="p-2 bg-red-600 rounded-lg shadow-lg shadow-red-900/20">
             <Receipt size={24} className="text-white" />
          </div>
          <div>
            <h3 className="text-2xl font-bold text-zinc-100 light:text-zinc-900">{t.business_expenses}</h3>
            <p className="text-xs text-zinc-500 uppercase tracking-widest font-semibold">{t.total}: {data.currency} {totalExpenses.toLocaleString()}</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="relative">
            <Search size={18} className={`absolute ${lang === 'ar' ? 'right-3' : 'left-3'} top-1/2 -translate-y-1/2 text-zinc-500`} />
            <input type="text" placeholder={t.search} className={`bg-zinc-900 light:bg-white border border-zinc-800 light:border-zinc-200 rounded-xl py-2.5 ${lang === 'ar' ? 'pr-10 pl-4' : 'pl-10 pr-4'} focus:outline-none focus:border-red-500 w-64 text-sm light:text-zinc-900`} value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
          </div>
          <button onClick={() => setIsAdding(true)} className="bg-red-600 hover:bg-red-700 text-white px-5 py-2.5 rounded-xl flex items-center gap-2 font-black transition-all shadow-lg shadow-red-900/20 text-sm uppercase">
            <Plus size={20} /> {t.log_expense}
          </button>
        </div>
      </div>

      <div className="flex-1 bg-zinc-900/50 light:bg-white border border-zinc-800 light:border-zinc-200 rounded-[32px] overflow-hidden flex flex-col backdrop-blur-sm light:shadow-sm">
        <div className="overflow-x-auto scrollbar-thin">
          <table className="w-full text-start">
            <thead>
              <tr className="bg-black/40 light:bg-zinc-100 text-[10px] uppercase font-black tracking-widest text-zinc-500 border-b border-zinc-800 light:border-zinc-200">
                <th className="px-8 py-5">{lang === 'ar' ? 'التاريخ' : 'Date'}</th>
                <th className="px-8 py-5">{t.description}</th>
                <th className="px-8 py-5">{t.amount}</th>
                <th className="px-8 py-5 text-end">{t.actions}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/50 light:divide-zinc-200">
              {filtered.map(exp => (
                <tr key={exp.id} className="hover:bg-zinc-800/30 light:hover:bg-zinc-50 transition-colors group">
                  <td className="px-8 py-4 text-xs text-zinc-500 font-mono">{new Date(exp.timestamp).toLocaleDateString()}</td>
                  <td className="px-8 py-4 font-bold text-zinc-100 light:text-zinc-900 flex items-center gap-2">
                     {exp.employeeId ? <User size={14} className="text-blue-500"/> : <Briefcase size={14} className="text-zinc-500"/>}
                     {exp.description}
                  </td>
                  <td className="px-8 py-4 text-red-500 font-black">-{data.currency} {exp.amount.toLocaleString()}</td>
                  <td className="px-8 py-4 text-end">
                    <button onClick={() => handleDelete(exp.id)} className="p-2 opacity-0 group-hover:opacity-100 hover:bg-red-900/30 text-zinc-400 hover:text-red-500 rounded-lg transition-all"><Trash2 size={16} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {isAdding && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-zinc-900 light:bg-white border border-zinc-800 light:border-zinc-200 w-full max-w-lg rounded-[40px] overflow-hidden shadow-2xl">
            <div className="p-8 border-b border-zinc-800 light:border-zinc-200 flex justify-between items-center bg-black/20">
              <h4 className="text-2xl font-black uppercase tracking-tighter light:text-zinc-900">{t.log_expense}</h4>
              <button onClick={() => setIsAdding(false)} className="p-3 text-zinc-500 hover:text-white transition-colors"><X size={24}/></button>
            </div>
            
            <div className="p-10 space-y-8">
              {/* Category Selector */}
              <div>
                 <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 block mb-3">{lang === 'ar' ? 'تصنيف المصروف' : 'Expense Category'}</label>
                 <div className="grid grid-cols-2 gap-4">
                    <button 
                        onClick={() => { setExpenseType('general'); setFormData({amount: 0, description: '', timestamp: Date.now()}); }}
                        className={`py-4 rounded-2xl font-black text-xs uppercase tracking-widest border transition-all ${expenseType === 'general' ? 'bg-zinc-100 text-zinc-900 border-white' : 'bg-zinc-800 border-zinc-700 text-zinc-500'}`}
                    >
                        {lang === 'ar' ? 'عام' : 'General'}
                    </button>
                    <button 
                        onClick={() => setExpenseType('salary')}
                        className={`py-4 rounded-2xl font-black text-xs uppercase tracking-widest border transition-all ${expenseType === 'salary' ? 'bg-blue-600 text-white border-blue-500' : 'bg-zinc-800 border-zinc-700 text-zinc-500'}`}
                    >
                        {lang === 'ar' ? 'رواتب' : 'Salary Payment'}
                    </button>
                 </div>
              </div>

              {expenseType === 'general' ? (
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 block mb-2">{t.description}</label>
                    <input type="text" autoFocus className="w-full bg-black light:bg-zinc-100 border border-zinc-800 light:border-zinc-200 rounded-2xl px-6 py-4 focus:outline-none focus:border-red-500 text-zinc-100 light:text-zinc-900 font-bold" value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} />
                  </div>
              ) : (
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 block mb-2">{lang === 'ar' ? 'اختر الموظف' : 'Select Employee'}</label>
                    <select 
                        className="w-full bg-black light:bg-zinc-100 border border-zinc-800 light:border-zinc-200 rounded-2xl px-6 py-4 focus:outline-none focus:border-blue-500 text-zinc-100 light:text-zinc-900 font-bold"
                        onChange={(e) => {
                            const empId = e.target.value;
                            const emp = data.employees.find(x => x.id === empId);
                            if (emp) {
                                setFormData({
                                    ...formData, 
                                    employeeId: empId, 
                                    description: `Salary Payment: ${emp.name}`,
                                    amount: emp.baseSalary // Smart Auto-fill
                                });
                            }
                        }}
                    >
                        <option value="">-- Select Staff Member --</option>
                        {data.employees.map(e => (
                            <option key={e.id} value={e.id}>{e.name} ({e.role})</option>
                        ))}
                    </select>
                  </div>
              )}

              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 block mb-2">{t.amount}</label>
                <div className="relative">
                    <span className="absolute left-6 top-1/2 -translate-y-1/2 text-zinc-500 font-black">{data.currency}</span>
                    <input type="number" className="w-full bg-black light:bg-zinc-100 border border-zinc-800 light:border-zinc-200 rounded-2xl px-16 py-4 focus:outline-none focus:border-red-500 text-red-500 font-black text-2xl" value={formData.amount} onChange={e => setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })} />
                </div>
              </div>
            </div>

            <div className="p-8 bg-black/40 border-t border-zinc-800 flex gap-4">
              <button onClick={() => setIsAdding(false)} className="flex-1 py-4 bg-zinc-800 text-zinc-400 font-black uppercase text-xs rounded-2xl tracking-widest">{t.discard}</button>
              <button onClick={handleSave} className="flex-1 py-4 bg-red-600 text-white font-black uppercase text-xs rounded-2xl shadow-xl flex items-center justify-center gap-2 tracking-widest"><Save size={18} /> {t.record}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExpensesScreen;
