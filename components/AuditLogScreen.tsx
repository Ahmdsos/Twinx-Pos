
import React, { useState, useMemo } from 'react';
import { AppData, LogEntry } from '../types';
import { ShieldCheck, Search, Clock, Tag, Hash, Info } from 'lucide-react';
import { translations, Language } from '../translations';

interface AuditLogScreenProps {
  data: AppData;
  lang: Language;
}

const AuditLogScreen: React.FC<AuditLogScreenProps> = ({ data, lang }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const t = translations[lang];

  const filteredLogs = useMemo(() => {
    return (data.logs || [])
      .filter(log => {
        const matchesSearch = log.details.toLowerCase().includes(searchTerm.toLowerCase()) || 
                             log.action.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesCategory = categoryFilter === 'all' || log.category === categoryFilter;
        return matchesSearch && matchesCategory;
      })
      .sort((a, b) => b.timestamp - a.timestamp);
  }, [data.logs, searchTerm, categoryFilter]);

  const categories = ['all', 'sale', 'inventory', 'expense', 'return', 'system', 'cash'];

  const getCategoryColor = (cat: string) => {
    switch (cat) {
      case 'sale': return 'text-green-500 bg-green-500/10 border-green-500/20';
      case 'inventory': return 'text-blue-500 bg-blue-500/10 border-blue-500/20';
      case 'expense': return 'text-red-500 bg-red-500/10 border-red-500/20';
      case 'return': return 'text-orange-500 bg-orange-500/10 border-orange-500/20';
      case 'system': return 'text-purple-500 bg-purple-500/10 border-purple-500/20';
      case 'cash': return 'text-yellow-500 bg-yellow-500/10 border-yellow-500/20';
      default: return 'text-zinc-500 bg-zinc-500/10 border-zinc-500/20';
    }
  };

  return (
    <div className="p-8 h-full flex flex-col gap-6 text-start">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-zinc-800 border border-zinc-700 rounded-lg">
            <ShieldCheck size={24} className="text-zinc-100" />
          </div>
          <div>
            <h3 className="text-2xl font-bold tracking-tight text-zinc-100">{t.audit_log}</h3>
            <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-black">{lang === 'ar' ? 'سجل الحركات المحلي غير القابل للتعديل' : 'Immutable Local Operation History'}</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <Search size={18} className={`absolute ${lang === 'ar' ? 'right-3' : 'left-3'} top-1/2 -translate-y-1/2 text-zinc-500`} />
            <input
              type="text"
              placeholder={t.search}
              className={`bg-zinc-900 border border-zinc-800 rounded-xl py-2.5 ${lang === 'ar' ? 'pr-10 pl-4' : 'pl-10 pr-4'} focus:outline-none focus:border-red-500 w-full sm:w-64 text-sm`}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="flex bg-zinc-900 border border-zinc-800 rounded-xl p-1 gap-1">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setCategoryFilter(cat)}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                  categoryFilter === cat ? 'bg-zinc-800 text-zinc-100' : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                {cat === 'all' ? (lang === 'ar' ? 'الكل' : 'All') : cat}
              </button>
            ))}
          </div>
        </div>
      </header>

      <div className="flex-1 bg-zinc-900/30 border border-zinc-800 rounded-[32px] overflow-hidden flex flex-col backdrop-blur-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-start">
            <thead>
              <tr className="bg-black/40 text-[10px] uppercase font-black tracking-widest text-zinc-500 border-b border-zinc-800">
                <th className="px-8 py-5"><div className="flex items-center gap-2"><Clock size={12}/> {t.timestamp}</div></th>
                <th className="px-8 py-5"><div className="flex items-center gap-2"><Tag size={12}/> {t.category}</div></th>
                <th className="px-8 py-5"><div className="flex items-center gap-2"><Hash size={12}/> {t.action}</div></th>
                <th className="px-8 py-5"><div className="flex items-center gap-2"><Info size={12}/> {t.details}</div></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/50">
              {filteredLogs.map(log => (
                <tr key={log.id} className="hover:bg-zinc-800/30 transition-colors font-mono">
                  <td className="px-8 py-4 text-[11px] text-zinc-500">
                    {new Date(log.timestamp).toLocaleString(lang === 'ar' ? 'ar-EG' : 'en-US')}
                  </td>
                  <td className="px-8 py-4">
                    <span className={`px-2 py-0.5 rounded-md border text-[9px] font-black uppercase ${getCategoryColor(log.category)}`}>
                      {log.category}
                    </span>
                  </td>
                  <td className="px-8 py-4 text-[11px] font-bold text-zinc-300 uppercase">{log.action}</td>
                  <td className="px-8 py-4 text-[11px] text-zinc-400 truncate max-w-xs">{log.details}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AuditLogScreen;
