import React, { useState, useMemo } from 'react';
import { AppData, Employee, Attendance, SalaryTransaction, LogEntry } from '../types';
import { translations, Language } from '../translations';
import { 
  Users, 
  Plus, 
  Search, 
  Trash2, 
  X, 
  Save, 
  Phone, 
  DollarSign, 
  Calendar, 
  Clock, 
  CheckCircle2, 
  History, 
  Briefcase, 
  UserPlus,
  ArrowUpRight,
  ShieldCheck
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
  const [showEmployeeModal, setShowEmployeeModal] = useState(false);
  const [showPayrollModal, setShowPayrollModal] = useState(false);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('');
  
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

  const filteredEmployees = useMemo(() => {
    return (data.employees || []).filter(e => 
      e.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      e.phone.includes(searchTerm)
    );
  }, [data.employees, searchTerm]);

  const handleAddEmployee = () => {
    if (!employeeForm.name || !employeeForm.phone) return;
    
    const newEmployee: Employee = {
      ...employeeForm,
      id: crypto.randomUUID(),
      joinDate: Date.now(),
      isActive: true
    };

    const updatedData = TwinXOps.addEmployee(data, newEmployee);
    updateData(updatedData);
    setShowEmployeeModal(false);
    setEmployeeForm({ name: '', phone: '', role: 'cashier', baseSalary: 0 });
  };

  const handleRecordAttendance = (empId: string, status: Attendance['status']) => {
    const newAttendance: Attendance = {
      id: crypto.randomUUID(),
      employeeId: empId,
      timestamp: Date.now(),
      status
    };

    const updatedData = TwinXOps.recordAttendance(data, newAttendance);
    updateData(updatedData);
  };

  const handleProcessPayroll = () => {
    if (!payrollForm.employeeId || payrollForm.amount <= 0) return;

    const transaction: SalaryTransaction = {
      ...payrollForm,
      id: crypto.randomUUID(),
      timestamp: Date.now()
    };

    try {
      const updatedData = TwinXOps.processSalaryTransaction(data, transaction);
      updateData(updatedData);
      setShowPayrollModal(false);
      setPayrollForm({ employeeId: '', amount: 0, type: 'salary', notes: '' });
    } catch (err) {
      alert(err instanceof Error ? err.message : "Payroll processing failed");
    }
  };

  const today = new Date().setHours(0, 0, 0, 0);
  const todayAttendance = useMemo(() => {
    return (data.attendance || []).filter(a => new Date(a.timestamp).setHours(0, 0, 0, 0) === today);
  }, [data.attendance, today]);

  return (
    <div className="p-8 h-full flex flex-col gap-6 text-start bg-zinc-950 light:bg-zinc-50">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-red-600 rounded-lg shadow-lg shadow-red-900/20">
            <Users size={24} className="text-white" />
          </div>
          <div>
            <h3 className="text-2xl font-bold tracking-tight text-zinc-100 light:text-zinc-900">{t.hr}</h3>
            <p className="text-[10px] text-zinc-500 light:text-zinc-400 uppercase tracking-widest font-black">{lang === 'ar' ? 'إدارة الموارد البشرية والرواتب' : 'HR & Payroll Management'}</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <Search size={18} className={`absolute ${lang === 'ar' ? 'right-3' : 'left-3'} top-1/2 -translate-y-1/2 text-zinc-500`} />
            <input
              type="text"
              placeholder={t.search}
              className={`bg-zinc-900 light:bg-white border border-zinc-800 light:border-zinc-200 rounded-xl py-2.5 ${lang === 'ar' ? 'pr-10 pl-4' : 'pl-10 pr-4'} focus:outline-none focus:border-red-500 w-full sm:w-64 text-sm light:text-zinc-900`}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="flex bg-zinc-900 light:bg-zinc-200 border border-zinc-800 light:border-zinc-300 rounded-xl p-1">
            <button onClick={() => setActiveTab('staff')} className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'staff' ? 'bg-red-600 text-white shadow-lg' : 'text-zinc-500 hover:text-zinc-300'}`}>{t.staff_list}</button>
            <button onClick={() => setActiveTab('attendance')} className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'attendance' ? 'bg-red-600 text-white shadow-lg' : 'text-zinc-500 hover:text-zinc-300'}`}>{t.attendance}</button>
            <button onClick={() => setActiveTab('payroll')} className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'payroll' ? 'bg-red-600 text-white shadow-lg' : 'text-zinc-500 hover:text-zinc-300'}`}>{t.payroll}</button>
          </div>

          <button onClick={() => setShowEmployeeModal(true)} className="bg-zinc-100 light:bg-zinc-900 text-black light:text-white px-5 py-2.5 rounded-xl flex items-center gap-2 font-black transition-all shadow-xl text-sm uppercase">
            <UserPlus size={20} /> {t.add_employee}
          </button>
        </div>
      </header>

      {activeTab === 'staff' && (
        <div className="flex-1 bg-zinc-900/30 light:bg-white border border-zinc-800 light:border-zinc-200 rounded-[32px] overflow-hidden flex flex-col backdrop-blur-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-start">
              <thead>
                <tr className="bg-black/40 light:bg-zinc-50 text-[10px] uppercase font-black tracking-widest text-zinc-500 border-b border-zinc-800 light:border-zinc-200">
                  <th className="px-8 py-5">{t.employee_name}</th>
                  <th className="px-8 py-5">{t.role}</th>
                  <th className="px-8 py-5">{t.phone_number}</th>
                  <th className="px-8 py-5">{t.base_salary}</th>
                  <th className="px-8 py-5 text-end">{t.actions}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/50 light:divide-zinc-200">
                {filteredEmployees.map(emp => (
                  <tr key={emp.id} className="hover:bg-zinc-800/30 light:hover:bg-zinc-50 transition-colors">
                    <td className="px-8 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-zinc-800 light:bg-zinc-100 flex items-center justify-center font-bold text-xs">{emp.name.charAt(0)}</div>
                        <span className="font-bold text-zinc-100 light:text-zinc-900">{emp.name}</span>
                      </div>
                    </td>
                    <td className="px-8 py-4 text-xs font-black uppercase text-zinc-500">
                      <span className="bg-zinc-950 light:bg-zinc-100 px-2 py-1 rounded border border-zinc-800 light:border-zinc-200">{emp.role}</span>
                    </td>
                    <td className="px-8 py-4 text-xs text-zinc-400 font-mono">{emp.phone}</td>
                    <td className="px-8 py-4 font-black text-red-500">{data.currency} {emp.baseSalary.toLocaleString()}</td>
                    <td className="px-8 py-4 text-end">
                      <button onClick={() => updateData({ employees: data.employees.filter(e => e.id !== emp.id) })} className="p-2 text-zinc-600 hover:text-red-500 transition-colors"><Trash2 size={16}/></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'attendance' && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {data.employees.map(emp => {
            const statusToday = todayAttendance.find(a => a.employeeId === emp.id)?.status;
            return (
              <div key={emp.id} className="bg-zinc-900/40 light:bg-white border border-zinc-800 light:border-zinc-200 p-6 rounded-[32px] flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-xl ${statusToday ? 'bg-green-500/10 text-green-500' : 'bg-zinc-800 text-zinc-600'}`}>{emp.name.charAt(0)}</div>
                  <div>
                    <p className="font-black text-zinc-100 light:text-zinc-900 uppercase">{emp.name}</p>
                    <p className="text-[10px] font-black uppercase text-zinc-500">{emp.role}</p>
                    {statusToday && (
                      <span className="text-[9px] font-black text-green-500 bg-green-500/10 px-2 py-0.5 rounded border border-green-500/20 uppercase tracking-widest mt-1 inline-block">
                        {t[statusToday as keyof typeof t] || statusToday}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  {!statusToday ? (
                    <>
                      <button onClick={() => handleRecordAttendance(emp.id, 'present')} className="p-3 bg-green-600/10 text-green-500 border border-green-500/20 rounded-xl hover:bg-green-600 hover:text-white transition-all"><CheckCircle2 size={20}/></button>
                      <button onClick={() => handleRecordAttendance(emp.id, 'late')} className="p-3 bg-orange-600/10 text-orange-500 border border-orange-500/20 rounded-xl hover:bg-orange-600 hover:text-white transition-all"><Clock size={20}/></button>
                      <button onClick={() => handleRecordAttendance(emp.id, 'absent')} className="p-3 bg-red-600/10 text-red-500 border border-red-500/20 rounded-xl hover:bg-red-600 hover:text-white transition-all"><X size={20}/></button>
                    </>
                  ) : (
                    <div className="p-3 text-zinc-600"><CheckCircle2 size={20}/></div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {activeTab === 'payroll' && (
        <div className="flex-1 flex flex-col gap-6 overflow-hidden">
          <div className="flex justify-end shrink-0">
            <button onClick={() => setShowPayrollModal(true)} className="bg-green-600 text-white px-6 py-3 rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl flex items-center gap-2">
              <DollarSign size={18}/> {t.pay_salary}
            </button>
          </div>
          <div className="flex-1 bg-zinc-900/30 light:bg-white border border-zinc-800 light:border-zinc-200 rounded-[32px] overflow-hidden flex flex-col">
            <div className="p-4 bg-black/40 light:bg-zinc-100 border-b border-zinc-800 light:border-zinc-200 text-[10px] uppercase font-black tracking-widest text-zinc-500 px-6">
              {t.salary_history}
            </div>
            <div className="overflow-y-auto flex-1 scrollbar-thin">
              <table className="w-full text-start">
                <thead>
                  <tr className="bg-black/20 light:bg-zinc-50 text-[10px] uppercase font-black tracking-widest text-zinc-600 border-b border-zinc-800 light:border-zinc-200">
                    <th className="px-8 py-5 text-start">{t.time}</th>
                    <th className="px-8 py-5 text-start">{t.employee_name}</th>
                    <th className="px-8 py-5 text-start">{lang === 'ar' ? 'النوع' : 'Type'}</th>
                    <th className="px-8 py-5 text-start">{t.amount}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/50 light:divide-zinc-200">
                  {(data.salaryTransactions || []).sort((a,b) => b.timestamp - a.timestamp).map(st => {
                    const emp = data.employees.find(e => e.id === st.employeeId);
                    return (
                      <tr key={st.id}>
                        <td className="px-8 py-4 text-xs font-mono text-zinc-500">{new Date(st.timestamp).toLocaleString()}</td>
                        <td className="px-8 py-4 font-bold text-zinc-100 light:text-zinc-900">{emp?.name || 'Unknown'}</td>
                        <td className="px-8 py-4">
                          <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${st.type === 'salary' ? 'bg-blue-500/10 text-blue-500' : 'bg-orange-500/10 text-orange-500'}`}>
                            {t[`pay_${st.type}` as keyof typeof t] || st.type}
                          </span>
                        </td>
                        <td className="px-8 py-4 font-black text-red-500">{data.currency} {st.amount.toLocaleString()}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Employee Add Modal */}
      {showEmployeeModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-md p-4 animate-in fade-in">
          <div className="bg-zinc-900 light:bg-white border border-zinc-800 light:border-zinc-200 w-full max-w-md rounded-[40px] overflow-hidden shadow-2xl animate-in zoom-in-95">
            <div className="p-8 border-b border-zinc-800 light:border-zinc-200 flex justify-between items-center bg-black/20 light:bg-zinc-50">
              <h4 className="text-2xl font-black tracking-tighter uppercase light:text-zinc-900">{t.add_employee}</h4>
              <button onClick={() => setShowEmployeeModal(false)} className="p-3 hover:bg-zinc-800 light:hover:bg-zinc-100 rounded-full transition-colors text-zinc-500"><X size={24}/></button>
            </div>
            <div className="p-10 space-y-6">
              <div>
                <label className="text-[10px] font-black uppercase text-zinc-500 block mb-2">{t.employee_name}</label>
                <input type="text" className="w-full bg-black light:bg-zinc-100 border border-zinc-800 light:border-zinc-200 rounded-2xl px-6 py-4 focus:border-red-500 text-zinc-100 light:text-zinc-900 font-bold" value={employeeForm.name} onChange={e => setEmployeeForm({...employeeForm, name: e.target.value})} />
              </div>
              <div>
                <label className="text-[10px] font-black uppercase text-zinc-500 block mb-2">{t.phone_number}</label>
                <input type="text" className="w-full bg-black light:bg-zinc-100 border border-zinc-800 light:border-zinc-200 rounded-2xl px-6 py-4 focus:border-red-500 text-zinc-100 light:text-zinc-900 font-mono" value={employeeForm.phone} onChange={e => setEmployeeForm({...employeeForm, phone: e.target.value})} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black uppercase text-zinc-500 block mb-2">{t.role}</label>
                  <select className="w-full bg-black light:bg-zinc-100 border border-zinc-800 light:border-zinc-200 rounded-2xl px-6 py-4 text-zinc-100 light:text-zinc-900 font-bold" value={employeeForm.role} onChange={e => setEmployeeForm({...employeeForm, role: e.target.value as any})}>
                    <option value="cashier">{lang === 'ar' ? 'كاشير' : 'Cashier'}</option>
                    <option value="delivery">{lang === 'ar' ? 'دليفري' : 'Delivery'}</option>
                    <option value="admin">{lang === 'ar' ? 'مدير' : 'Admin'}</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase text-zinc-500 block mb-2">{t.base_salary}</label>
                  <input type="number" className="w-full bg-black light:bg-zinc-100 border border-zinc-800 light:border-zinc-200 rounded-2xl px-6 py-4 text-red-500 font-black" value={employeeForm.baseSalary} onChange={e => setEmployeeForm({...employeeForm, baseSalary: parseFloat(e.target.value) || 0})} />
                </div>
              </div>
            </div>
            <div className="p-8 bg-black/40 light:bg-zinc-50 border-t border-zinc-800 light:border-zinc-200 flex gap-4">
              <button onClick={() => setShowEmployeeModal(false)} className="flex-1 py-4 bg-zinc-800 light:bg-zinc-200 text-zinc-400 font-black uppercase text-xs rounded-2xl">{t.discard}</button>
              <button onClick={handleAddEmployee} className="flex-1 py-4 bg-red-600 text-white font-black uppercase text-xs rounded-2xl shadow-xl shadow-red-900/30">{t.save_ledger}</button>
            </div>
          </div>
        </div>
      )}

      {/* Payroll Modal */}
      {showPayrollModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-md p-4 animate-in fade-in">
          <div className="bg-zinc-900 light:bg-white border border-zinc-800 light:border-zinc-200 w-full max-w-md rounded-[40px] overflow-hidden shadow-2xl animate-in zoom-in-95">
            <div className="p-8 border-b border-zinc-800 light:border-zinc-200 flex justify-between items-center bg-black/20 light:bg-zinc-50">
              <h4 className="text-2xl font-black tracking-tighter uppercase light:text-zinc-900">{t.pay_salary}</h4>
              <button onClick={() => setShowPayrollModal(false)} className="p-3 hover:bg-zinc-800 light:hover:bg-zinc-100 rounded-full transition-colors text-zinc-500"><X size={24}/></button>
            </div>
            <div className="p-10 space-y-6">
              <div>
                <label className="text-[10px] font-black uppercase text-zinc-500 block mb-2">{lang === 'ar' ? 'اختر الموظف' : 'Select Employee'}</label>
                <select className="w-full bg-black light:bg-zinc-100 border border-zinc-800 light:border-zinc-200 rounded-2xl px-6 py-4 text-zinc-100 light:text-zinc-900 font-bold" value={payrollForm.employeeId} onChange={e => setPayrollForm({...payrollForm, employeeId: e.target.value})}>
                  <option value="">---</option>
                  {data.employees.map(e => <option key={e.id} value={e.id}>{e.name} ({e.role})</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black uppercase text-zinc-500 block mb-2">{lang === 'ar' ? 'نوع الدفع' : 'Pay Type'}</label>
                  <select className="w-full bg-black light:bg-zinc-100 border border-zinc-800 light:border-zinc-200 rounded-2xl px-6 py-4 text-zinc-100 light:text-zinc-900 font-bold" value={payrollForm.type} onChange={e => setPayrollForm({...payrollForm, type: e.target.value as any})}>
                    <option value="salary">{t.pay_salary}</option>
                    <option value="advance">{t.pay_advance}</option>
                    <option value="bonus">{t.pay_bonus}</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase text-zinc-500 block mb-2">{t.amount}</label>
                  <input type="number" className="w-full bg-black light:bg-zinc-100 border border-zinc-800 light:border-zinc-200 rounded-2xl px-6 py-4 text-red-500 font-black text-xl" value={payrollForm.amount} onChange={e => setPayrollForm({...payrollForm, amount: parseFloat(e.target.value) || 0})} />
                </div>
              </div>
              <div>
                <label className="text-[10px] font-black uppercase text-zinc-500 block mb-2">{lang === 'ar' ? 'ملاحظات' : 'Notes'}</label>
                <input type="text" className="w-full bg-black light:bg-zinc-100 border border-zinc-800 light:border-zinc-200 rounded-2xl px-6 py-4 text-zinc-100 light:text-zinc-900" value={payrollForm.notes} onChange={e => setPayrollForm({...payrollForm, notes: e.target.value})} />
              </div>
            </div>
            <div className="p-8 bg-black/40 light:bg-zinc-50 border-t border-zinc-800 light:border-zinc-200 flex gap-4">
              <button onClick={() => setShowPayrollModal(false)} className="flex-1 py-4 bg-zinc-800 light:bg-zinc-200 text-zinc-400 font-black uppercase text-xs rounded-2xl">{t.discard}</button>
              <button onClick={handleProcessPayroll} className="flex-1 py-4 bg-green-600 text-white font-black uppercase text-xs rounded-2xl shadow-xl shadow-green-900/30">{t.authorize_payment}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmployeesScreen;