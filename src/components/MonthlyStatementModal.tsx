import React from 'react';
import {
  X,
  FileSpreadsheet,
  Download,
  Calendar,
  CheckCircle2,
  TrendingUp,
  Building,
  Zap,
  Bot,
  Briefcase,
  Printer
} from 'lucide-react';
import { MonthlySettlementStatement, CreatorWalletDetail } from '../types/creator';

interface MonthlyStatementModalProps {
  isOpen: boolean;
  onClose: () => void;
  statements: MonthlySettlementStatement[];
  walletData: CreatorWalletDetail;
}

export function MonthlyStatementModal({
  isOpen,
  onClose,
  statements,
  walletData
}: MonthlyStatementModalProps) {
  if (!isOpen) return null;

  const [selectedMonth, setSelectedMonth] = React.useState<string>(
    statements[0]?.month || '2026-08'
  );

  const activeStatement =
    statements.find((s) => s.month === selectedMonth) || statements[0];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="bg-white w-full max-w-3xl rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-5 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 flex items-center justify-center">
              <FileSpreadsheet size={20} />
            </div>
            <div>
              <h3 className="font-bold text-sm text-white">创作者月度收益对账单 · 纳税与清算汇总</h3>
              <p className="text-[11px] text-slate-400">
                每月 5 日自动生成上月结算账单，支持查看明细、导出财务 Excel/PDF 与完税证明
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* Month Selector Tabs */}
        <div className="bg-slate-50 px-6 py-3 border-b border-slate-200 flex items-center gap-2 overflow-x-auto">
          <span className="text-xs text-slate-500 font-bold shrink-0 flex items-center gap-1">
            <Calendar size={13} />
            账单周期：
          </span>
          {statements.map((stmt) => (
            <button
              key={stmt.month}
              onClick={() => setSelectedMonth(stmt.month)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                selectedMonth === stmt.month
                  ? 'bg-blue-600 text-white shadow-2xs'
                  : 'bg-white text-slate-700 hover:bg-slate-200/80 border border-slate-200'
              }`}
            >
              {stmt.periodLabel}
            </button>
          ))}
        </div>

        {/* Modal Content */}
        {activeStatement && (
          <div className="p-6 overflow-y-auto space-y-6 text-xs text-slate-700">
            {/* Top Overview Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
                <span className="text-[11px] text-slate-500">当期业务总流水</span>
                <div className="text-lg font-black text-slate-900">
                  ￥{activeStatement.grossRevenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </div>
                <div className="text-[10px] text-slate-400">含词元/付费版/二开</div>
              </div>

              <div className="p-4 rounded-2xl bg-blue-50/50 border border-blue-200 space-y-1">
                <span className="text-[11px] text-blue-700">平台技术服务费</span>
                <div className="text-lg font-black text-blue-900">
                  ￥{activeStatement.platformFeeDeducted.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </div>
                <div className="text-[10px] text-blue-600">云服务与基础设施扣减</div>
              </div>

              <div className="p-4 rounded-2xl bg-amber-50/50 border border-amber-200 space-y-1">
                <span className="text-[11px] text-amber-700">代扣代缴个税</span>
                <div className="text-lg font-black text-amber-900">
                  ￥{activeStatement.individualTaxWithheld.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </div>
                <div className="text-[10px] text-amber-600">合规报税并出具完税单</div>
              </div>

              <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200 space-y-1">
                <span className="text-[11px] text-emerald-800 font-bold">实际结算入账净所得</span>
                <div className="text-xl font-black text-emerald-700">
                  ￥{activeStatement.netIncome.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </div>
                <div className="text-[10px] text-emerald-700 flex items-center gap-1 font-semibold">
                  <CheckCircle2 size={11} />
                  <span>已清算并划拨钱包</span>
                </div>
              </div>
            </div>

            {/* Income Streams Table */}
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs">
              <div className="p-4 bg-slate-50 border-b border-slate-200 font-bold text-slate-800 text-xs flex items-center justify-between">
                <span>{activeStatement.periodLabel} 收益构成项明细</span>
                <span className="text-[11px] font-mono text-slate-500 font-normal">
                  账单号: {activeStatement.statementNo}
                </span>
              </div>

              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50/80 border-b border-slate-100 text-slate-500">
                  <tr>
                    <th className="py-2.5 px-4">收益来源通道</th>
                    <th className="py-2.5 px-4">业务类型</th>
                    <th className="py-2.5 px-4">创作者分成率</th>
                    <th className="py-2.5 px-4 text-right">结算金额 (元)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  <tr>
                    <td className="py-3 px-4 flex items-center gap-2">
                      <Zap size={14} className="text-amber-500 shrink-0" />
                      <span className="font-bold text-slate-900">智能体词元推理调用返点</span>
                    </td>
                    <td className="py-3 px-4 text-slate-600">API 算力消耗量返现</td>
                    <td className="py-3 px-4 text-slate-600 font-medium">10% ~ 20% (基于等级)</td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-amber-700">
                      ￥{activeStatement.tokenRebateIncome.toFixed(2)}
                    </td>
                  </tr>

                  <tr>
                    <td className="py-3 px-4 flex items-center gap-2">
                      <Bot size={14} className="text-sky-500 shrink-0" />
                      <span className="font-bold text-slate-900">标准智能体与知识库售卖</span>
                    </td>
                    <td className="py-3 px-4 text-slate-600">个人/团队订阅与买断</td>
                    <td className="py-3 px-4 text-slate-600 font-medium">70%</td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-sky-700">
                      ￥{activeStatement.agentSalesIncome.toFixed(2)}
                    </td>
                  </tr>

                  <tr>
                    <td className="py-3 px-4 flex items-center gap-2">
                      <Briefcase size={14} className="text-blue-500 shrink-0" />
                      <span className="font-bold text-slate-900">企业 FDE 二开与私有化交付</span>
                    </td>
                    <td className="py-3 px-4 text-slate-600">定制工程实施与阶段验收</td>
                    <td className="py-3 px-4 text-slate-600 font-medium">90% (平台仅扣10%)</td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-blue-700">
                      ￥{activeStatement.fdeServiceIncome.toFixed(2)}
                    </td>
                  </tr>
                </tbody>
                <tfoot className="bg-slate-50 font-bold border-t border-slate-200">
                  <tr>
                    <td className="py-3 px-4" colSpan={3}>
                      合计当月创作者税后实发净收入
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-emerald-700 text-sm">
                      ￥{activeStatement.netIncome.toFixed(2)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Tax & Banking Information */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                <div className="font-bold text-slate-900 flex items-center gap-1.5">
                  <Building size={14} className="text-slate-600" />
                  <span>汇算结算账户信息</span>
                </div>
                <div className="space-y-1 text-[11px] text-slate-600">
                  <div>结算银行：{walletData.bankAccount.bankName}</div>
                  <div>开户姓名：{walletData.bankAccount.accountHolder} (实名核验一致)</div>
                  <div>银行账号：{walletData.bankAccount.accountTail}</div>
                  <div>企业支付宝：{walletData.bankAccount.alipayAccount}</div>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                <div className="font-bold text-slate-900 flex items-center gap-1.5">
                  <CheckCircle2 size={14} className="text-emerald-600" />
                  <span>税务合规凭据</span>
                </div>
                <div className="space-y-1 text-[11px] text-slate-600">
                  <div>代扣单位：北京心动智能网络科技有限公司</div>
                  <div>纳税类型：生产经营所得 / 劳务报酬个人所得税</div>
                  <div>完税凭证：已同步至国家税务总局全国统一平台</div>
                  <div className="text-blue-600 hover:underline cursor-pointer">
                    点击下载电子税票回执.pdf →
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Footer Actions */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3">
          <div className="text-slate-500 text-xs">
            结算状态：
            <span className="font-bold text-emerald-700">
              {activeStatement.settledStatus === 'settled'
                ? `已于 ${activeStatement.settledDate} 完成汇总结算`
                : '结算中'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                alert(`正在打包下载 [${activeStatement.statementNo}] 收益对账单 (含 Excel 明细与盖章 PDF)...`);
              }}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
            >
              <Download size={13} />
              <span>导出月度对账单 (Excel / PDF)</span>
            </button>

            <button
              onClick={onClose}
              className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
            >
              关闭
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
