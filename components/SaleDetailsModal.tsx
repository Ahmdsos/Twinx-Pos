
import React, { useState } from 'react';
import { Sale, CartItem, Customer } from '../types';
import { translations, Language } from '../translations';
import { X, Printer, Trash2, Save, ShoppingBag, Clock, User, Phone, MapPin, Truck, Layout, Hash, DollarSign, AlertCircle } from 'lucide-react';
import JsBarcode from 'jsbarcode';

interface SaleDetailsModalProps {
  sale: Sale;
  lang: Language;
  currency: string;
  customers?: Customer[]; // Optional prop to lookup customer stats
  onClose: () => void;
  onUpdate: (updatedSale: Sale) => void;
  onDelete: (id: string) => void;
}

// Added currency prop to match App.tsx usage and support multi-currency display
const SaleDetailsModal: React.FC<SaleDetailsModalProps> = ({ sale, lang, currency, customers = [], onClose, onUpdate, onDelete }) => {
  const t = translations[lang];
  const [editedSale, setEditedSale] = useState<Sale>({ ...sale });

  const linkedCustomer = customers.find(c => c.id === editedSale.customerId);

  const getStatusText = (status?: string) => {
    switch(status) {
      case 'delivered': return lang === 'ar' ? 'تم التوصيل' : 'Delivered';
      case 'cancelled': return lang === 'ar' ? 'ملغي' : 'Cancelled';
      case 'pending': return lang === 'ar' ? 'قيد التوصيل' : 'Out for Delivery';
      default: return lang === 'ar' ? 'مكتمل' : 'Completed';
    }
  };

  const getStatusColor = (status?: string) => {
    switch(status) {
      case 'delivered': return 'bg-green-500/10 text-green-500';
      case 'cancelled': return 'bg-red-500/10 text-red-500';
      case 'pending': return 'bg-orange-500/10 text-orange-500';
      default: return 'bg-blue-500/10 text-blue-500';
    }
  };

  const printInvoice = () => {
    const printArea = document.getElementById('print-area');
    if (!printArea) return;

    const date = new Date(editedSale.timestamp);
    const dateStr = date.toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-US');
    const timeStr = date.toLocaleTimeString(lang === 'ar' ? 'ar-EG' : 'en-US');

    printArea.innerHTML = `
      <div dir="${lang === 'ar' ? 'rtl' : 'ltr'}" style="width: 58mm; padding: 2mm; font-family: 'Courier New', Courier, monospace; color: black; background: white; font-size: 9pt;">
        <div style="text-align: center; font-weight: bold; font-size: 14pt; margin-bottom: 2mm;">TWINX POS</div>
        <div style="text-align: center; font-size: 8pt; margin-bottom: 4mm;">${lang === 'ar' ? 'نظام مبيعات محلي' : 'OFFLINE RETAIL SYSTEM'}</div>
        ${editedSale.status === 'cancelled' ? `<div style="text-align: center; font-weight: bold; font-size: 12pt; border: 2px solid black; margin-bottom: 2mm;">CANCELLED / ملغاة</div>` : ''}
        <div style="border-top: 1px dashed black; padding-top: 2mm; margin-bottom: 2mm;">
          <div>${lang === 'ar' ? 'رقم الفاتورة' : 'INV'}: ${editedSale.id.split('-')[0].toUpperCase()}</div>
          <div>${lang === 'ar' ? 'التاريخ' : 'DATE'}: ${dateStr}</div>
          <div>${lang === 'ar' ? 'الوقت' : 'TIME'}: ${timeStr}</div>
          <div>${lang === 'ar' ? 'القناة' : 'CHANNEL'}: ${t[editedSale.saleChannel as keyof typeof t].toUpperCase()}</div>
        </div>
        ${editedSale.isDelivery ? `
        <div style="border-top: 1px dashed black; padding: 2mm 0; margin-bottom: 2mm; font-size: 8pt;">
          <div>${lang === 'ar' ? 'العميل' : 'TO'}: ${editedSale.deliveryDetails?.customerName.toUpperCase()}</div>
        </div>
        ` : ''}
        <div style="border-top: 1px dashed black; padding: 2mm 0; margin-bottom: 2mm;">
          <table style="width: 100%; font-size: 8pt;">
            ${editedSale.items.map(item => `
                <tr><td colspan="2" style="font-weight: bold;">${item.name.toUpperCase()}</td></tr>
                <tr style="text-align: ${lang === 'ar' ? 'right' : 'left'};">
                  <td>${item.quantity} x ${currency} ${item.price.toFixed(2)}</td>
                  <td style="text-align: ${lang === 'ar' ? 'left' : 'right'}; font-weight: bold;">${currency} ${(item.price * item.quantity).toFixed(2)}</td>
                </tr>
            `).join('')}
          </table>
        </div>
        <div style="border-top: 1px dashed black; padding-top: 2mm;">
          <div style="display: flex; justify-content: space-between; font-weight: bold; font-size: 12pt;">
            <span>${t.total}:</span>
            <span>${currency} ${editedSale.total.toFixed(2)}</span>
          </div>
        </div>
      </div>
    `;
    window.print();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-xl p-4 animate-in fade-in duration-300">
      <div className="bg-zinc-900 border border-zinc-800 w-full max-w-4xl rounded-[40px] overflow-hidden shadow-2xl flex flex-col max-h-[90vh] relative">
        
        {/* WATERMARK FOR CANCELLED */}
        {editedSale.status === 'cancelled' && (
           <div className="absolute inset-0 z-50 pointer-events-none flex items-center justify-center opacity-30 rotate-[-15deg]">
              <h1 className="text-[150px] font-black text-red-500 border-8 border-red-500 px-10 rounded-[40px]">CANCELLED</h1>
           </div>
        )}

        <div className="p-8 border-b border-zinc-800 flex justify-between items-center bg-black/20 shrink-0">
          <div className="text-start">
            <h4 className="text-2xl font-black tracking-tighter uppercase">{t.view_invoice}</h4>
            <p className="text-[10px] text-zinc-500 font-black uppercase tracking-[0.3em]">ID: {editedSale.id.toUpperCase()}</p>
          </div>
          <div className="flex items-center gap-4">
            <button onClick={printInvoice} className="p-3 bg-zinc-800 hover:bg-zinc-700 rounded-full text-zinc-100 transition-all"><Printer size={20}/></button>
            <button onClick={onClose} className="p-3 hover:bg-zinc-800 rounded-full transition-colors text-zinc-500 hover:text-white"><X size={24}/></button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-10 grid grid-cols-1 lg:grid-cols-2 gap-12">
          <div className="space-y-8 text-start">
            <section className="space-y-4">
              <div className="flex items-center gap-3 text-red-500 font-black uppercase tracking-widest text-xs">
                <ShoppingBag size={18} /> {lang === 'ar' ? 'قائمة المشتريات' : 'Item List'}
              </div>
              <div className="space-y-3">
                {editedSale.items.map((item, idx) => (
                  <div key={idx} className="flex justify-between items-center bg-zinc-950 p-4 rounded-2xl border border-zinc-800">
                    <div>
                      <p className="font-bold text-zinc-100">{item.name}</p>
                      <p className="text-xs text-zinc-500">{currency} {item.price} × {item.quantity}</p>
                      {item.returnedQuantity && item.returnedQuantity > 0 ? (
                        <p className="text-[10px] font-black text-orange-500 uppercase mt-1">Returned: {item.returnedQuantity}</p>
                      ) : null}
                    </div>
                    <p className="font-black text-red-500">{currency} {(item.price * item.quantity).toLocaleString()}</p>
                  </div>
                ))}
              </div>
            </section>

            <section className="bg-zinc-950 p-6 rounded-[32px] border border-zinc-800 space-y-4">
              <div className="flex justify-between text-xs font-black uppercase tracking-widest text-zinc-500">
                <span>{t.subtotal}</span>
                <span>{currency} {editedSale.subtotal.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-xs font-black uppercase tracking-widest text-orange-500">
                <span>{t.total_discount}</span>
                <span>-{currency} {editedSale.totalDiscount.toLocaleString()}</span>
              </div>
              {editedSale.isDelivery && (
                <div className="flex justify-between text-xs font-black uppercase tracking-widest text-zinc-500">
                  <span>{t.delivery_fee}</span>
                  <span>{currency} {(editedSale.deliveryFee || 0).toLocaleString()}</span>
                </div>
              )}
              <div className="pt-4 border-t border-zinc-800 flex justify-between items-end">
                <span className="text-xs font-black uppercase tracking-widest text-zinc-400">{t.total}</span>
                <span className="text-4xl font-black text-zinc-100">{currency} {editedSale.total.toLocaleString()}</span>
              </div>
            </section>
          </div>

          <div className="space-y-8 text-start">
            <section className="space-y-4">
              <div className="flex items-center gap-3 text-zinc-500 font-black uppercase tracking-widest text-xs">
                <Clock size={18} /> {lang === 'ar' ? 'معلومات العملية' : 'Transaction Info'}
              </div>
              <div className="grid gap-3">
                 <div className="flex items-center justify-between p-4 bg-zinc-800/30 rounded-2xl border border-zinc-800">
                   <span className="text-xs text-zinc-500">{t.time}</span>
                   <span className="text-xs font-bold">{new Date(editedSale.timestamp).toLocaleString(lang === 'ar' ? 'ar-EG' : 'en-US')}</span>
                 </div>
                 <div className="flex items-center justify-between p-4 bg-zinc-800/30 rounded-2xl border border-zinc-800">
                   <span className="text-xs text-zinc-500">{t.sale_channel}</span>
                   <span className="text-xs font-bold uppercase text-red-500">{t[editedSale.saleChannel as keyof typeof t]}</span>
                 </div>
                 <div className="flex items-center justify-between p-4 bg-zinc-800/30 rounded-2xl border border-zinc-800">
                   <span className="text-xs text-zinc-500">{lang === 'ar' ? 'حالة التوصيل' : 'Delivery Status'}</span>
                   <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${getStatusColor(editedSale.status)}`}>
                     {getStatusText(editedSale.status)}
                   </span>
                 </div>
              </div>
            </section>

            {(editedSale.customerId || editedSale.isDelivery) && (
              <section className="space-y-4 animate-in fade-in duration-500">
                <div className="flex items-center gap-3 text-blue-500 font-black uppercase tracking-widest text-xs">
                  <User size={18} /> {t.customer_details}
                </div>
                <div className="bg-zinc-800/20 p-6 rounded-[32px] border border-zinc-800 space-y-4">
                  <div className="flex items-center gap-4">
                    <User size={16} className="text-zinc-600" />
                    <span className="text-sm font-bold text-zinc-100">{linkedCustomer?.name || editedSale.deliveryDetails?.customerName}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <Phone size={16} className="text-zinc-600" />
                    <span className="text-sm font-bold text-zinc-400 font-mono">{linkedCustomer?.phone || editedSale.deliveryDetails?.customerPhone}</span>
                  </div>
                  { (linkedCustomer?.address || editedSale.deliveryDetails?.deliveryAddress) && (
                    <div className="flex items-start gap-4">
                      <MapPin size={16} className="text-zinc-600 mt-1" />
                      <span className="text-sm font-bold text-zinc-400">{linkedCustomer?.address || editedSale.deliveryDetails?.deliveryAddress}</span>
                    </div>
                  )}
                  
                  {linkedCustomer && (
                    <div className="pt-4 border-t border-zinc-800/50 flex gap-4">
                       <div className="flex-1">
                          <p className="text-[8px] font-black uppercase text-zinc-500 mb-1">{t.total_purchases}</p>
                          <p className="text-xs font-black text-blue-500 flex items-center gap-1"><DollarSign size={12}/> {linkedCustomer.totalPurchases.toLocaleString()}</p>
                       </div>
                       <div className="flex-1">
                          <p className="text-[8px] font-black uppercase text-zinc-500 mb-1">{t.invoice_count}</p>
                          <p className="text-xs font-black text-zinc-300 flex items-center gap-1"><Hash size={12}/> {linkedCustomer.invoiceCount}</p>
                       </div>
                    </div>
                  )}
                </div>
              </section>
            )}
          </div>
        </div>

        <div className="p-8 bg-black/40 border-t border-zinc-800 flex gap-4 shrink-0">
          <button onClick={() => onDelete(editedSale.id)} className="flex items-center justify-center gap-2 px-8 py-4 bg-zinc-800/50 hover:bg-red-950 text-red-500 font-black uppercase tracking-widest text-xs rounded-2xl transition-all"><Trash2 size={18} /> {lang === 'ar' ? 'حذف' : 'Delete'}</button>
          <div className="flex-1"></div>
          {editedSale.status !== 'cancelled' && (
             <button onClick={() => onUpdate(editedSale)} className="flex items-center justify-center gap-2 px-12 py-4 bg-zinc-100 hover:bg-white text-black font-black uppercase tracking-widest text-xs rounded-2xl shadow-xl transition-all"><Save size={18} /> {lang === 'ar' ? 'حفظ التعديلات' : 'Save Changes'}</button>
          )}
        </div>
      </div>
    </div>
  );
};

export default SaleDetailsModal;
