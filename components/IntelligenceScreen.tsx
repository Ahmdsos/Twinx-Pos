
import React, { useState, useEffect, useMemo } from 'react';
import { AppData } from '../types';
import { GoogleGenAI } from '@google/genai';
import { Language } from '../translations';
import { 
  Zap, 
  AlertTriangle, 
  TrendingUp, 
  Target, 
  Loader2, 
  ShieldAlert, 
  ArrowRightCircle,
  History,
  ShoppingCart,
  Timer
} from 'lucide-react';

interface IntelligenceScreenProps {
  data: AppData;
  lang: Language;
}

const IntelligenceScreen: React.FC<IntelligenceScreenProps> = ({ data, lang }) => {
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const businessMetrics = useMemo(() => {
    if (data.sales.length < 1 && data.wholesaleTransactions.length < 1) return "INSUFFICIENT_HISTORY";
    if (data.products.length === 0) return "NO_PRODUCTS";

    const totalSales = data.sales.reduce((acc, s) => acc + s.total, 0);
    const totalWholesale = data.wholesaleTransactions.filter(t => t.type === 'sale').reduce((acc, t) => acc + t.total, 0);
    const totalExpenses = data.expenses.reduce((acc, e) => acc + e.amount, 0);
    const totalPurchases = data.wholesaleTransactions.filter(t => t.type === 'purchase').reduce((acc, t) => acc + t.total, 0);
    
    const liquidity = data.initialCash + totalSales + totalWholesale - totalExpenses - totalPurchases;
    
    const productStats = data.products.map(p => {
      const retailSold = data.sales.reduce((acc, s) => {
        const item = s.items.find(i => i.id === p.id);
        return acc + (item?.quantity || 0);
      }, 0);
      const wholesaleSold = data.wholesaleTransactions.filter(t => t.type === 'sale').reduce((acc, t) => {
        const item = t.items.find(i => i.productId === p.id);
        return acc + (item?.quantity || 0);
      }, 0);

      const totalSold = retailSold + wholesaleSold;
      const velocity = totalSold / 30;
      const daysRemaining = velocity > 0 ? p.stock / velocity : Infinity;

      return { name: p.name, stock: p.stock, velocity, daysRemaining };
    });

    const risks = productStats.filter(p => p.daysRemaining < 10).sort((a, b) => a.daysRemaining - b.daysRemaining);

    return { liquidity, risks, totalItems: data.products.length };
  }, [data]);

  const runDecisionEngine = async () => {
    if (typeof businessMetrics === 'string') {
      setAnalysis(businessMetrics);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const context = `
        البيانات الحالية:
        - السيولة النقدية: $${businessMetrics.liquidity}
        - عدد المنتجات: ${businessMetrics.totalItems}
        - مخاطر النفاذ: ${businessMetrics.risks.slice(0, 3).map(p => `${p.name} (ينتهي خلال ${Math.round(p.daysRemaining)} أيام)`).join(', ') || 'لا يوجد'}
      `;

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `حلل احتياطيات المخزون والتدفق النقدي بناءً على البيانات التالية:\n\n${context}`,
        config: {
          systemInstruction: `أنت المحلل الذكي لنظام TwinX POS. هدفك تقديم نصائح تجارية حادة ومباشرة لزيادة الأرباح وتقليل المخاطر.
          يجب أن يكون ردك باللغة العربية الفصحى البسيطة.
          
          تنسيق المخرجات (3 نقاط فقط):
          1. مخاطر العمل: (ركز على المنتجات التي ستنفذ أو نقص السيولة)
          2. فرصة ربح: (ركز على تحريك المخزون الراكد أو إعادة الطلب في الوقت المثالي)
          3. إجراء عاجل: (تعليمات واضحة مثل "اطلب [عدد] من [منتج]" أو "خفض سعر [منتج]")
          
          قواعد:
          - لا تزد عن 20 كلمة لكل نقطة.
          - كن مهنياً ومباشراً جداً.`,
        },
      });

      setAnalysis(response.text || "FAILED_TO_ANALYZE");
    } catch (err) {
      console.error(err);
      setError("محرك التحليل غير متصل حالياً.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    runDecisionEngine();
  }, [data]);

  const parseDecisions = (text: string | null) => {
    if (!text || ['INSUFFICIENT_HISTORY', 'NO_PRODUCTS', 'FAILED_TO_ANALYZE'].includes(text)) return null;
    const lines = text.split('\n').filter(l => l.trim().length > 0);
    return {
      risk: lines[0]?.replace(/^\d\.\s*/, '') || "جاري تحليل المخاطر...",
      opportunity: lines[1]?.replace(/^\d\.\s*/, '') || "جاري البحث عن فرص...",
      action: lines[2]?.replace(/^\d\.\s*/, '') || "جاري إعداد التوصيات..."
    };
  };

  const decisions = parseDecisions(analysis);

  return (
    <div className="p-8 max-w-4xl mx-auto h-full flex flex-col gap-10 text-start bg-zinc-950 light:bg-zinc-50">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="bg-red-600 p-3 rounded-2xl shadow-xl shadow-red-900/30">
            <Zap size={28} className="text-white" />
          </div>
          <div>
            <h3 className="text-3xl font-black tracking-tighter text-zinc-100 light:text-zinc-900 uppercase">ذكاء الأعمال</h3>
            <p className="text-[10px] text-zinc-500 light:text-zinc-600 font-bold uppercase tracking-[0.4em]">Supply Intelligence v2.5</p>
          </div>
        </div>
      </div>

      {analysis === "INSUFFICIENT_HISTORY" ? (
        <div className="flex-1 flex flex-col items-center justify-center space-y-6 bg-zinc-900/20 light:bg-white border border-zinc-800 light:border-zinc-200 border-dashed rounded-[40px] text-center p-12">
          <History size={64} className="text-zinc-800 light:text-zinc-300" />
          <p className="text-zinc-500 light:text-zinc-600 font-bold font-black">نحتاج لعملية بيع واحدة على الأقل لبدء التحليل.</p>
        </div>
      ) : loading ? (
        <div className="flex-1 flex flex-col items-center justify-center space-y-6">
          <Loader2 size={48} className="text-red-600 animate-spin" />
          <p className="text-zinc-500 light:text-zinc-900 font-black uppercase tracking-widest text-xs animate-pulse">جاري فحص الدفاتر المحاسبية...</p>
        </div>
      ) : decisions && (
        <div className="grid gap-6 animate-in fade-in slide-in-from-bottom-8 duration-700">
          <div className="bg-zinc-900/80 light:bg-white border border-red-500/20 light:border-red-500/40 p-8 rounded-[32px] light:shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <AlertTriangle size={18} className="text-red-600" />
              <h4 className="text-xs font-black uppercase text-red-600">مخاطر العمل</h4>
            </div>
            <p className="text-xl font-bold text-zinc-200 light:text-zinc-900">{decisions.risk}</p>
          </div>
          <div className="bg-zinc-900/80 light:bg-white border border-zinc-800 light:border-zinc-200 p-8 rounded-[32px] light:shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <TrendingUp size={18} className="text-green-500" />
              <h4 className="text-xs font-black uppercase text-zinc-500 light:text-zinc-900">فرصة ربح</h4>
            </div>
            <p className="text-xl font-bold text-zinc-200 light:text-zinc-900">{decisions.opportunity}</p>
          </div>
          <div className="bg-red-600 p-10 rounded-[32px] shadow-2xl shadow-red-900/40">
            <div className="flex items-center gap-3 mb-4">
              <Zap size={18} className="text-white" />
              <h4 className="text-xs font-black uppercase text-red-100">إجراء عاجل</h4>
            </div>
            <p className="text-2xl font-black text-white">{decisions.action}</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default IntelligenceScreen;
