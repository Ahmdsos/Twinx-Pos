
import React, { useState, useMemo } from 'react';
import { AppData, Employee, Attendance, SalaryTransaction, LogEntry, Sale } from '../types';
import { translations, Language } from '../translations';
import { 
  Users, 
  Search, 
  Trash2, 
  X, 
  Phone, 
  DollarSign, 
  Calendar, 
  Clock, 
  CheckCircle2, 
  UserPlus,
  ArrowUpRight,
  ShieldCheck,
  Coffee,
  LogOut,
  ChevronRight,
  TrendingUp,
  History,
  Info
} from 'lucide-react';
import { TwinXOps } from '../services/operations';

interface EmployeesScreenProps {
  data: AppData;
  updateData: (newData: Partial<AppData>) => void;
  addLog: (log: Omit<LogEntry, 'id' | 'timestamp'>) => void;
  lang: Language;
}

const EmployeesScreen: React.FC<EmployeesScreenProps> = ({ data, updateData, addLog, lang }) => {
  const t = translations[lang];
  const [activeTab, setActiveTab] = useState<'staff' | 'attendance' | 'payroll'>('staff');
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState<Employee | null>(null);
  const [showPayrollModal, setShowPayrollModal] = useState(false);
  
  // Filters for Modal
  const [historyMonth, setHistoryMonth] = useState(new Date().getMonth());
  const [historyYear, setHistoryYear] = useState(new Date().getFullYear());

  const [employeeForm, setEmployeeForm] = useState<Omit<Employee, 'id' | 'joinDate' | 'isActive'>>({
    name: '',
    phone: '',
    role: 'cashier',
    baseSalary: 0
  });

  const [payrollForm, setPayrollForm] = useState<Omit<SalaryTransaction, 'id' | 'timestamp'>>({
    employeeId: '',
    amount: 0,
    type: 'salary',
    notes: ''
  });

  const today = new Date().toISOString().split('T')[0];

  const filteredEmployees = useMemo(() => {
    return (data.employees || []).filter(e => 
      e.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      e.phone.includes(searchTerm)
    );
  }, [data.employees, searchTerm]);

  const handleAttendanceAction = (id: string, action: 'check_in' | 'check_out' | 'break_start' | 'break_end') => {
    try {
      const updatedData = TwinXOps.recordAttendanceAction(data, id, action);
      updateData(updatedData);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const calculatePerformance = (empId: string) => {
    const sales = data.sales.filter(s => s.driverId === empId || s.id.includes(empId)); // Simplified attribution
    const total = sales.reduce((acc, s) => acc + s.total, 0);
    return { count: sales.length, total };
  };

  return (
    <div className="p-8 h-full flex flex-col gap-6 text-start bg-zinc-950 light:bg-zinc-50 overflow-hidden">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-red-600 rounded-lg shadow-lg shadow-red-900/20">
            <Users size={24} className="text-white" />
          </div>
          <div>
            <h3 className="text-2xl font-black tracking-tight text-zinc-100 light:text-zinc-900">{t.hr}</h3>
            <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-black">{lang === 'ar' ? 'إدارة الطاقم والتشغيل' : 'Staff & Operations Management'}</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <Search size={18} className={`absolute ${lang === 'ar' ? 'right-3' : 'left-3'} top-1/2 -translate-y-1/2 text-zinc-500`} />
            <input
              type="text"
              placeholder={t.search}
              className="bg-zinc-900 light:bg-white border border-zinc-800 light:border-zinc-200 rounded-xl py-2.5 px-10 focus:outline-none focus:border-red-500 w-64 text-sm light:text-zinc-900"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="flex bg-zinc-900 light:bg-zinc-200 border border-zinc-800 light:border-zinc-300 rounded-xl p-1">
            <button onClick={() => setActiveTab('staff')} className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'staff' ? 'bg-red-600 text-white shadow-lg' : 'text-zinc-500 hover:text-zinc-300'}`}>{t.staff_list}</button>
            <button onClick={() => setActiveTab('attendance')} className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'attendance' ? 'bg-red-600 text-white shadow-lg' : 'text-zinc-500 hover:text-zinc-300'}`}>{lang === 'ar' ? 'لوحة الحضور' : 'Attendance'}</button>
            <button onClick={() => setActiveTab('payroll')} className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'payroll' ? 'bg-red-600 text-white shadow-lg' : 'text-zinc-500 hover:text-zinc-300'}`}>{t.payroll}</button>
          </div>

          <button onClick={() => setShowAddModal(true)} className="bg-zinc-100 light:bg-zinc-900 text-black light:text-white px-5 py-2.5 rounded-xl flex items-center gap-2 font-black transition-all shadow-xl text-sm uppercase">
            <UserPlus size={20} /> {t.add_employee}
          </button>
        </div>
      </header>

      {/* STAFF LIST TAB */}
      {activeTab === 'staff' && (
        <div className="flex-1 bg-zinc-900/30 light:bg-white border border-zinc-800 light:border-zinc-200 rounded-[32px] overflow-hidden flex flex-col backdrop-blur-sm shadow-xl">
          <div className="overflow-x-auto scrollbar-thin">
            <table className="w-full text-start">
              <thead>
                <tr className="bg-black/40 light:bg-zinc-50 text-[10px] uppercase font-black tracking-widest text-zinc-500 border-b border-zinc-800 light:border-zinc-200">
                  <th className="px-8 py-5 text-start">{t.employee_name}</th>
                  <th className="px-8 py-5 text-start">{t.role}</th>
                  <th className="px-8 py-5 text-start">{t.phone_number}</th>
                  <th className="px-8 py-5 text-start">{t.base_salary}</th>
                  <th className="px-8 py-5 text-end">{t.actions}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/50 light:divide-zinc-200">
                {filteredEmployees.map(emp => (
                  <tr key={emp.id} onClick={() => setSelectedStaff(emp)} className="hover:bg-zinc-800/30 light:hover:bg-zinc-50 transition-colors cursor-pointer group">
                    <td className="px-8 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-zinc-800 light:bg-zinc-100 flex items-center justify-center font-black text-xs text-zinc-400">{emp.name.charAt(0)}</div>
                        <span className="font-bold text-zinc-100 light:text-zinc-900">{emp.name}</span>
                      </div>
                    </td>
                    <td className="px-8 py-4">
                       <span className="bg-zinc-950 light:bg-zinc-100 px-2 py-1 rounded border border-zinc-800 light:border-zinc-200 text-[10px] font-black uppercase text-zinc-500">{emp.role}</span>
                    </td>
                    <td className="px-8 py-4 text-xs text-zinc-500 font-mono">{emp.phone}</td>
                    <td className="px-8 py-4 font-black text-red-500">{data.currency} {emp.baseSalary.toLocaleString()}</td>
                    <td className="px-8 py-4 text-end">
                      <button onClick={(e) => { e.stopPropagation(); updateData({ employees: data.employees.filter(ex => ex.id !== emp.id) }); }} className="p-2 text-zinc-700 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"><Trash2 size={16}/></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ATTENDANCE BOARD TAB */}
      {activeTab === 'attendance' && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 overflow-y-auto pr-2 scrollbar-thin">
          {data.employees.map(emp => {
            const session = data.attendance.find(a => a.employeeId === emp.id && a.date === today);
            return (
              <div key={emp.id} className="bg-zinc-900 light:bg-white border border-zinc-800 light:border-zinc-200 p-6 rounded-[32px] flex flex-col gap-6 shadow-xl">
                <div className="flex items-center gap-4">
                   <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-xl font-black ${session?.status === 'present' ? 'bg-green-500/10 text-green-500' : session?.status === 'on_break' ? 'bg-orange-500/10 text-orange-500' : 'bg-zinc-800 text-zinc-600'}`}>
                      {emp.name.charAt(0)}
                   </div>
                   <div className="min-w-0">
                      <p className="font-black text-zinc-100 light:text-zinc-900 truncate uppercase">{emp.name}</p>
                      <p className="text-[10px] font-black uppercase text-zinc-500">{emp.role}</p>
                   </div>
                </div>

                <div className="space-y-3">
                   {session ? (
                     <div className="flex flex-col gap-2">
                        <div className="flex justify-between text-[9px] font-black uppercase text-zinc-500 px-1">
                           <span>{lang === 'ar' ? 'بدأ العمل' : 'Start'}</span>
                           <span className="text-zinc-100 light:text-zinc-900 font-mono">{new Date(session.checkIn).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</span>
                        </div>
                        {session.status === 'present' && (
                          <div className="flex gap-2">
                            <button onClick={() => handleAttendanceAction(emp.id, 'break_start')} className="flex-1 py-3 bg-orange-600/10 border border-orange-500/30 text-orange-500 rounded-2xl font-black text-[10px] uppercase flex items-center justify-center gap-2 hover:bg-orange-600 hover:text-white transition-all"><Coffee size={14}/> {lang === 'ar' ? 'بدأ استراحة' : 'Start Break'}</button>
                            <button onClick={() => handleAttendanceAction(emp.id, 'check_out')} className="flex-1 py-3 bg-red-600/10 border border-red-500/30 text-red-500 rounded-2xl font-black text-[10px] uppercase flex items-center justify-center gap-2 hover:bg-red-600 hover:text-white transition-all"><LogOut size={14}/> {t.hr_check_out}</button>
                          </div>
                        )}
                        {session.status === 'on_break' && (
                          <button onClick={() => handleAttendanceAction(emp.id, 'break_end')} className="w-full py-3 bg-green-600 text-white rounded-2xl font-black text-[10px] uppercase flex items-center justify-center gap-2 animate-pulse"><Coffee size={14}/> {lang === 'ar' ? 'إنهاء الاستراحة' : 'End Break'}</button>
                        )}
                        {session.status === 'completed' && (
                          <div className="py-3 bg-zinc-800 light:bg-zinc-100 rounded-2xl text-center text-xs font-black text-zinc-500 flex items-center justify-center gap-2">
                             <CheckCircle2 size={14}/> {lang === 'ar' ? 'اكتمل اليوم' : 'Day Completed'}
                          </div>
                        )}
                     </div>
                   ) : (
                     <button onClick={() => handleAttendanceAction(emp.id, 'check_in')} className="w-full py-4 bg-green-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 shadow-xl shadow-green-900/20 hover:scale-[1.02] transition-transform">
                        <CheckCircle2 size={18}/> {t.hr_check_in}
                     </button>
                   )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* PAYROLL TAB */}
      {activeTab === 'payroll' && (
        <div className="flex-1 flex flex-col gap-6 overflow-hidden">
          <div className="flex justify-end shrink-0">
             <button onClick={() => setShowPayrollModal(true)} className="bg-green-600 text-white px-6 py-3 rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl flex items-center gap-2"><DollarSign size={18}/> {t.pay_salary}</button>
          </div>
          <div className="flex-1 bg-zinc-900/30 light:bg-white border border-zinc-800 light:border-zinc-200 rounded-[32px] overflow-hidden flex flex-col shadow-xl">
             <div className="p-4 bg-black/40 light:bg-zinc-100 border-b border-zinc-800 light:border-zinc-200 text-[10px] uppercase font-black tracking-widest text-zinc-500 px-6">{t.salary_history}</div>
             <div className="overflow-y-auto flex-1 scrollbar-thin">
                <table className="w-full text-start">
                   <thead>
                      <tr className="text-[10px] font-black uppercase tracking-widest text-zinc-600 border-b border-zinc-800/50 light:border-zinc-200">
                         <th className="px-8 py-5">Date</th>
                         <th className="px-8 py-5">Staff</th>
                         <th className="px-8 py-5">Type</th>
                         <th className="px-8 py-5">Amount</th>
                      </tr>
                   </thead>
                   <tbody className="divide-y divide-zinc-800/50 light:divide-zinc-200">
                      {data.salaryTransactions.sort((a,b) => b.timestamp - a.timestamp).map(st => (
                        <tr key={st.id}>
                           <td className="px-8 py-4 text-xs text-zinc-500 font-mono">{new Date(st.timestamp).toLocaleString()}</td>
                           <td className="px-8 py-4 font-bold text-zinc-100 light:text-zinc-900">{data.employees.find(e => e.id === st.employeeId)?.name}</td>
                           <td className="px-8 py-4"><span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${st.type === 'salary' ? 'bg-blue-600/10 text-blue-500' : 'bg-orange-500/10 text-orange-500'}`}>{st.type}</span></td>
                           <td className="px-8 py-4 font-black text-red-500">{data.currency} {st.amount.toLocaleString()}</td>
                        </tr>
                      ))}
                   </tbody>
                </table>
             </div>
          </div>
        </div>
      )}

      {/* STAFF DETAILS MODAL */}
      {selectedStaff && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/95 backdrop-blur-xl p-4 animate-in fade-in duration-300">
           <div className="bg-zinc-900 light:bg-white border border-zinc-800 light:border-zinc-200 w-full max-w-5xl rounded-[40px] overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
              <div className="p-8 border-b border-zinc-800 light:border-zinc-200 flex justify-between items-center bg-black/20 shrink-0">
                 <div className="flex items-center gap-6">
                    <div className="w-16 h-16 rounded-2xl bg-red-600 text-white flex items-center justify-center text-2xl font-black">{selectedStaff.name.charAt(0)}</div>
                    <div>
                       <h4 className="text-3xl font-black tracking-tighter uppercase">{selectedStaff.name}</h4>
                       <p className="text-[10px] text-zinc-500 uppercase font-black tracking-widest">{selectedStaff.role} • {selectedStaff.phone}</p>
                    </div>
                 </div>
                 <button onClick={() => setSelectedStaff(null)} className="p-3 bg-zinc-800 rounded-full text-zinc-500 hover:text-white transition-colors"><X size={24}/></button>
              </div>

              <div className="p-8 grid grid-cols-1 lg:grid-cols-3 gap-8 overflow-hidden">
                 <div className="lg:col-span-1 space-y-6">
                    <div className="p-6 bg-zinc-950 light:bg-zinc-50 rounded-3xl border border-zinc-800 light:border-zinc-200 space-y-6">
                       <div className="flex items-center gap-3 text-red-500 font-black uppercase text-[10px] tracking-widest"><TrendingUp size={16}/> {lang === 'ar' ? 'الأداء العام' : 'Performance'}</div>
                       <div className="grid grid-cols-2 gap-4">
                          <div>
                             <p className="text-[9px] text-zinc-500 uppercase font-black mb-1">{lang === 'ar' ? 'مبيعات الكاشير' : 'Attributed Sales'}</p>
                             <p className="text-xl font-black text-zinc-100 light:text-zinc-900">{data.currency} {calculatePerformance(selectedStaff.id).total.toLocaleString()}</p>
                          </div>
                          <div className="text-end">
                             <p className="text-[9px] text-zinc-500 uppercase font-black mb-1">{lang === 'ar' ? 'عدد العمليات' : 'Trans Count'}</p>
                             <p className="text-xl font-black text-zinc-100 light:text-zinc-900">{calculatePerformance(selectedStaff.id).count}</p>
                          </div>
                       </div>
                    </div>

                    <div className="p-6 bg-zinc-950 light:bg-zinc-50 rounded-3xl border border-zinc-800 light:border-zinc-200 space-y-4">
                       <div className="flex items-center gap-3 text-blue-500 font-black uppercase text-[10px] tracking-widest"><Calendar size={16}/> {lang === 'ar' ? 'تاريخ الحضور' : 'Attendance Filters'}</div>
                       <div className="grid grid-cols-2 gap-3">
                          <select className="bg-black light:bg-white border border-zinc-800 light:border-zinc-200 rounded-xl px-4 py-2 text-xs font-bold" value={historyMonth} onChange={e => setHistoryMonth(parseInt(e.target.value))}>
                             {Array.from({length:12}).map((_,i) => <option key={i} value={i}>{new Date(0, i).toLocaleString('default', {month:'long'})}</option>)}
                          </select>
                          <select className="bg-black light:bg-white border border-zinc-800 light:border-zinc-200 rounded-xl px-4 py-2 text-xs font-bold" value={historyYear} onChange={e => setHistoryYear(parseInt(e.target.value))}>
                             <option value={2024}>2024</option>
                             <option value={2025}>2025</option>
                          </select>
                       </div>
                    </div>
                 </div>

                 <div className="lg:col-span-2 bg-zinc-950 light:bg-white border border-zinc-800 light:border-zinc-200 rounded-[32px] overflow-hidden flex flex-col">
                    <div className="p-4 bg-black/40 light:bg-zinc-50 border-b border-zinc-800 light:border-zinc-200 text-[10px] uppercase font-black tracking-widest text-zinc-500 flex items-center gap-2"><History size={14}/> {lang === 'ar' ? 'سجل الحضور' : 'Log History'}</div>
                    <div className="flex-1 overflow-y-auto scrollbar-thin divide-y divide-zinc-800/50 light:divide-zinc-100">
                       {data.attendance
                         .filter(a => a.employeeId === selectedStaff.id && new Date(a.date).getMonth() === historyMonth && new Date(a.date).getFullYear() === historyYear)
                         .sort((a,b) => b.checkIn - a.checkIn)
                         .map(log => (
                           <div key={log.id} className="p-6 flex items-center justify-between hover:bg-zinc-900 transition-colors">
                              <div className="flex items-center gap-6">
                                 <div className="text-start">
                                    <p className="font-bold text-zinc-100 light:text-zinc-900">{new Date(log.checkIn).toLocaleDateString()}</p>
                                    <p className="text-[10px] text-zinc-500 uppercase font-black">{lang === 'ar' ? 'دخول: ' : 'IN: '} {new Date(log.checkIn).toLocaleTimeString()}</p>
                                 </div>
                                 <div className="flex items-center gap-2">
                                    {log.breaks.map((b, i) => (
                                      <div key={i} className="px-2 py-1 bg-orange-600/10 border border-orange-500/20 text-[8px] font-black text-orange-500 rounded uppercase">Break {i+1}</div>
                                    ))}
                                 </div>
                              </div>
                              <div className="text-end">
                                 <p className="text-[10px] font-black uppercase text-zinc-600">{lang === 'ar' ? 'خروج' : 'OUT'}</p>
                                 <p className="font-mono text-zinc-100 light:text-zinc-900">{log.checkOut ? new Date(log.checkOut).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}) : '---'}</p>
                              </div>
                           </div>
                         ))}
                       {data.attendance.filter(a => a.employeeId === selectedStaff.id).length === 0 && (
                         <div className="p-20 text-center opacity-20 grayscale flex flex-col items-center">
                            <Info size={40} className="mb-2" />
                            <p className="text-xs font-black uppercase tracking-widest">{lang === 'ar' ? 'لا توجد سجلات لهذه الفترة' : 'No records found'}</p>
                         </div>
                       )}
                    </div>
                 </div>
              </div>
           </div>
        </div>
      )}

      {/* MODALS: ADD EMPLOYEE & PAYROLL (Keeping simple for Turn limit) */}
      {showAddModal && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/90 p-4 animate-in fade-in">
           <div className="bg-zinc-900 light:bg-white border border-zinc-800 light:border-zinc-200 w-full max-w-md rounded-[40px] overflow-hidden shadow-2xl animate-in zoom-in-95">
              <div className="p-8 border-b border-zinc-800 light:border-zinc-200 flex justify-between items-center bg-black/20">
                <h4 className="text-2xl font-black uppercase tracking-tighter light:text-zinc-900">{t.add_employee}</h4>
                <button onClick={() => setShowAddModal(false)} className="p-3 text-zinc-500"><X size={24}/></button>
              </div>
              <div className="p-10 space-y-6">
                <div>
                  <label className="text-[10px] font-black uppercase text-zinc-500 block mb-2">{t.employee_name}</label>
                  <input type="text" className="w-full bg-black light:bg-zinc-100 border border-zinc-800 light:border-zinc-200 rounded-2xl px-6 py-4 focus:border-red-500 text-zinc-100 light:text-zinc-900 font-bold" value={employeeForm.name} onChange={e => setEmployeeForm({...employeeForm, name: e.target.value})} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-black uppercase text-zinc-500 block mb-2">{t.role}</label>
                    <select className="w-full bg-black light:bg-zinc-100 border border-zinc-800 light:border-zinc-200 rounded-2xl px-6 py-4 text-zinc-100 light:text-zinc-900 font-bold" value={employeeForm.role} onChange={e => setEmployeeForm({...employeeForm, role: e.target.value as any})}>
                      <option value="cashier">Cashier</option>
                      <option value="delivery">Delivery</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase text-zinc-500 block mb-2">{t.base_salary}</label>
                    <input type="number" className="w-full bg-black light:bg-zinc-100 border border-zinc-800 light:border-zinc-200 rounded-2xl px-6 py-4 text-red-500 font-black" value={employeeForm.baseSalary} onChange={e => setEmployeeForm({...employeeForm, baseSalary: parseFloat(e.target.value) || 0})} />
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase text-zinc-500 block mb-2">{t.phone_number}</label>
                  <input type="text" className="w-full bg-black light:bg-zinc-100 border border-zinc-800 light:border-zinc-200 rounded-2xl px-6 py-4 focus:border-red-500 text-zinc-100 light:text-zinc-900 font-mono" value={employeeForm.phone} onChange={e => setEmployeeForm({...employeeForm, phone: e.target.value})} />
                </div>
              </div>
              <div className="p-8 bg-black/40 border-t border-zinc-800 flex gap-4">
                <button onClick={() => setShowAddModal(false)} className="flex-1 py-4 bg-zinc-800 text-zinc-400 font-black uppercase text-xs rounded-2xl">{t.discard}</button>
                <button onClick={() => { 
                   const newEmp: Employee = { ...employeeForm, id: crypto.randomUUID(), joinDate: new Date().toISOString(), isActive: true };
                   updateData(TwinXOps.addEmployee(data, newEmp));
                   setShowAddModal(false);
                }} className="flex-1 py-4 bg-red-600 text-white font-black uppercase text-xs rounded-2xl shadow-xl">{t.save_ledger}</button>
              </div>
           </div>
        </div>
      )}

      {showPayrollModal && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/90 p-4 animate-in fade-in">
           <div className="bg-zinc-900 light:bg-white border border-zinc-800 light:border-zinc-200 w-full max-w-md rounded-[40px] overflow-hidden shadow-2xl animate-in zoom-in-95">
              <div className="p-8 border-b border-zinc-800 light:border-zinc-200 flex justify-between items-center bg-black/20">
                <h4 className="text-2xl font-black uppercase tracking-tighter light:text-zinc-900">{t.pay_salary}</h4>
                <button onClick={() => setShowPayrollModal(false)} className="p-3 text-zinc-500"><X size={24}/></button>
              </div>
              <div className="p-10 space-y-6">
                <div>
                  <label className="text-[10px] font-black uppercase text-zinc-500 block mb-2">{lang === 'ar' ? 'الموظف' : 'Staff'}</label>
                  <select className="w-full bg-black light:bg-zinc-100 border border-zinc-800 light:border-zinc-200 rounded-2xl px-6 py-4 text-zinc-100 light:text-zinc-900 font-bold" value={payrollForm.employeeId} onChange={e => setPayrollForm({...payrollForm, employeeId: e.target.value})}>
                    <option value="">---</option>
                    {data.employees.map(e => <option key={e.id} value={e.id}>{e.name} ({e.role})</option>)}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-black uppercase text-zinc-500 block mb-2">{lang === 'ar' ? 'النوع' : 'Type'}</label>
                    <select className="w-full bg-black light:bg-zinc-100 border border-zinc-800 light:border-zinc-200 rounded-2xl px-6 py-4 text-zinc-100 light:text-zinc-900 font-bold" value={payrollForm.type} onChange={e => setPayrollForm({...payrollForm, type: e.target.value as any})}>
                      <option value="salary">Salary</option>
                      <option value="advance">Advance</option>
                      <option value="bonus">Bonus</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase text-zinc-500 block mb-2">{t.amount}</label>
                    <input type="number" className="w-full bg-black light:bg-zinc-100 border border-zinc-800 light:border-zinc-200 rounded-2xl px-6 py-4 text-green-500 font-black text-xl" value={payrollForm.amount} onChange={e => setPayrollForm({...payrollForm, amount: parseFloat(e.target.value) || 0})} />
                  </div>
                </div>
              </div>
              <div className="p-8 bg-black/40 border-t border-zinc-800 flex gap-4">
                <button onClick={() => setShowPayrollModal(false)} className="flex-1 py-4 bg-zinc-800 text-zinc-400 font-black uppercase text-xs rounded-2xl">{t.discard}</button>
                <button onClick={() => {
                   const tx: SalaryTransaction = { ...payrollForm, id: crypto.randomUUID(), timestamp: Date.now() };
                   updateData(TwinXOps.processSalaryTransaction(data, tx));
                   setShowPayrollModal(false);
                }} className="flex-1 py-4 bg-green-600 text-white font-black uppercase text-xs rounded-2xl shadow-xl">{t.authorize_payment}</button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default EmployeesScreen;
