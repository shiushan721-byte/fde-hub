import React from 'react';
import {
  X,
  FileText,
  CheckCircle2,
  Clock,
  ShieldCheck,
  Zap,
  Bot,
  Briefcase,
  ArrowUpRight,
  ArrowDownLeft,
  Copy,
  Printer,
  Share2,
  Building2,
  Cpu,
  Layers,
  Sparkles
} from 'lucide-react';
import { FinancialTransactionItem } from '../types/creator';

interface TransactionDetailModalProps {
  transaction: FinancialTransactionItem | null;
  isOpen: boolean;
  onClose: () => void;
}

export function TransactionDetailModal({
  transaction,
  isOpen,
  onClose
}: TransactionDetailModalProps) {
  if (!isOpen || !transaction) return null;

  const [isCopied, setIsCopied] = React.useState(false);

  const handleCopyProof = (text: string) => {
    navigator.clipboard.writeText(text);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const getTypeIcon = (type: FinancialTransactionItem['type']) => {
    switch (type) {
      case 'token_rebate':
        return <Zap size={18} className="text-amber-500" />;
      case 'agent_sale':
        return <Bot size={18} className="text-sky-500" />;
      case 'fde_service':
        return <Briefcase size={18} className="text-blue-500" />;
      case 'withdrawal':
        return <ArrowUpRight size={18} className="text-purple-500" />;
      default:
        return <FileText size={18} className="text-slate-500" />;
    }
  };

  const isIncome = transaction.netAmount >= 0 && transaction.type !== 'withdrawal';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="bg-white w-full max-w-xl rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with official voucher banner */}
        <div className="px-6 py-5 bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white flex items-center justify-between relative overflow-hidden">
          <div className="absolute right-0 top-0 translate-x-4 -translate-y-4 w-32 h-32 bg-indigo-500/10 rounded-full blur-xl pointer-events-none" />
          
          <div className="flex items-center gap-3 relative z-10">
            <div className="w-10 h-10 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20">
              {getTypeIcon(transaction.type)}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-sm text-white">电子结算凭证 · 财务明细单</h3>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 text-[10px] font-mono">
                  {transaction.status === 'settled' || transaction.status === 'completed'
                    ? '已记账结算'
                    : transaction.status === 'in_escrow'
                    ? '托管待验收'
                    : '处理中'}
                </span>
              </div>
              <p className="text-[11px] text-slate-300 font-mono mt-0.5">
                凭证号: {transaction.orderNo}
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

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 text-xs text-slate-700">
          {/* Main Net Amount Display */}
          <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center justify-between relative overflow-hidden">
            <div className="space-y-1">
              <span className="text-[11px] text-slate-500 font-medium">
                {isIncome ? '本次实际结算入账净额' : '本次实际出账金额'}
              </span>
              <div
                className={`text-3xl font-black tracking-tight ${
                  isIncome ? 'text-emerald-600' : 'text-slate-900'
                }`}
              >
                {isIncome ? '+' : '-'}￥
                {Math.abs(transaction.netAmount).toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2
                })}
              </div>
              <div className="text-[10px] text-slate-400 flex items-center gap-1.5 pt-0.5">
                <Clock size={11} />
                <span>记账完成时间：{transaction.date}</span>
              </div>
            </div>

            {/* Official seal watermark */}
            <div className="w-24 h-24 rounded-full border-2 border-dashed border-red-500/40 text-red-600/70 flex flex-col items-center justify-center transform -rotate-12 select-none pointer-events-none p-1 shrink-0 text-center">
              <span className="text-[9px] font-bold tracking-tighter">HELLOME AI</span>
              <span className="text-[8px] font-black border-y border-red-400/40 py-0.5 my-0.5">
                财务结算专用章
              </span>
              <span className="text-[7px] font-mono opacity-80">VERIFIED</span>
            </div>
          </div>

          {/* Mathematical Settlement Formula Breakdown */}
          <div className="space-y-2.5">
            <h4 className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
              <FileText size={14} className="text-blue-600" />
              <span>收益分成与结算测算核验</span>
            </h4>

            <div className="bg-white rounded-2xl border border-slate-200 divide-y divide-slate-100 overflow-hidden">
              <div className="p-3 flex items-center justify-between">
                <span className="text-slate-500">交易项目 / 事项</span>
                <span className="font-bold text-slate-900">{transaction.title}</span>
              </div>

              <div className="p-3 flex items-center justify-between">
                <span className="text-slate-500">关联标的 / 实体</span>
                <span className="font-medium text-blue-700">{transaction.relatedEntity}</span>
              </div>

              {transaction.clientName && (
                <div className="p-3 flex items-center justify-between">
                  <span className="text-slate-500">交易对手方 / 客户</span>
                  <span className="font-medium text-slate-900">{transaction.clientName}</span>
                </div>
              )}

              <div className="p-3 flex items-center justify-between bg-slate-50/50">
                <span className="text-slate-600">原始交易总流水 (Gross)</span>
                <span className="font-mono font-bold text-slate-900">
                  ￥{transaction.grossAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
              </div>

              {transaction.splitRatio > 0 && (
                <div className="p-3 flex items-center justify-between">
                  <span className="text-slate-500">创作者权益分成比例</span>
                  <span className="font-bold text-emerald-700">
                    {(transaction.splitRatio * 100).toFixed(0)}%
                  </span>
                </div>
              )}

              {transaction.platformFee > 0 && (
                <div className="p-3 flex items-center justify-between">
                  <span className="text-slate-500">平台技术与基础设施服务费</span>
                  <span className="font-mono text-slate-700">
                    -￥{transaction.platformFee.toFixed(2)}
                  </span>
                </div>
              )}

              {transaction.taxAmount > 0 && (
                <div className="p-3 flex items-center justify-between">
                  <span className="text-slate-500">依法代扣代缴个人所得税 (已完税)</span>
                  <span className="font-mono text-amber-700">
                    -￥{transaction.taxAmount.toFixed(2)}
                  </span>
                </div>
              )}

              <div className="p-3 flex items-center justify-between bg-emerald-50/40 font-bold">
                <span className="text-emerald-950">实际入账净所得 (Net)</span>
                <span className="font-mono text-emerald-700 text-sm">
                  ￥{transaction.netAmount.toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          {/* Type-Specific Detailed Context */}
          {transaction.tokenDetails && (
            <div className="p-4 rounded-2xl bg-amber-50/50 border border-amber-200/80 space-y-2.5">
              <div className="flex items-center justify-between text-amber-900 font-bold">
                <div className="flex items-center gap-1.5">
                  <Zap size={14} className="text-amber-600" />
                  <span>用户词元算力充值与返点明细</span>
                </div>
                <span className="text-[10px] font-normal px-2 py-0.5 bg-amber-100 text-amber-800 rounded-md">
                  充值即时返佣 (非按调用次数)
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-[11px] text-amber-950 pt-1">
                <div>
                  <span className="text-amber-700/80">充值流水单号：</span>
                  <span className="font-mono font-semibold">{transaction.tokenDetails.rechargeOrderNo}</span>
                </div>
                <div>
                  <span className="text-amber-700/80">充值算力包：</span>
                  <span className="font-semibold">{transaction.tokenDetails.rechargePackage}</span>
                </div>
                <div>
                  <span className="text-amber-700/80">包含词元额度：</span>
                  <span className="font-mono font-bold">
                    {transaction.tokenDetails.rechargeTokens.toLocaleString()} 词元
                  </span>
                </div>
                <div>
                  <span className="text-amber-700/80">客户充值实付：</span>
                  <span className="font-mono font-bold text-slate-900">
                    ￥{transaction.tokenDetails.rechargeAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div>
                  <span className="text-amber-700/80">创作者返点率：</span>
                  <span className="font-bold text-emerald-700">
                    {(transaction.tokenDetails.rebateRate * 100).toFixed(0)}% (即时入账)
                  </span>
                </div>
                <div>
                  <span className="text-amber-700/80">充值客户对象：</span>
                  <span className="font-medium truncate">{transaction.tokenDetails.rechargeUser}</span>
                </div>
              </div>
              <div className="text-[10px] text-amber-700/80 pt-1 border-t border-amber-200/60 flex items-center gap-1">
                <span>💡 词元返点基于终端用户/企业购买算力包的充值金额实时返佣，充值即结算。</span>
              </div>
            </div>
          )}

          {transaction.fdeDetails && (
            <div className="p-4 rounded-2xl bg-blue-50/50 border border-blue-200/80 space-y-2">
              <div className="flex items-center gap-1.5 text-blue-900 font-bold">
                <Building2 size={14} className="text-blue-600" />
                <span>企业 FDE 阶段履约与交付验收核验</span>
              </div>
              <div className="space-y-1.5 text-[11px] text-blue-950 pt-1">
                <div className="flex justify-between">
                  <span className="text-blue-700/80">企业项目订单号：</span>
                  <span className="font-mono font-bold">{transaction.fdeDetails.projectNo}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-blue-700/80">交付里程碑阶段：</span>
                  <span className="font-semibold">
                    {transaction.fdeDetails.milestoneName} (占比{' '}
                    {(transaction.fdeDetails.milestoneRatio * 100).toFixed(0)}%)
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-blue-700/80">客户验收签收单：</span>
                  <span className="text-emerald-700 font-medium">
                    ✓ {transaction.fdeDetails.acceptanceProof}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Payment Gateway & Security Ledger Hash */}
          <div className="p-4 rounded-2xl bg-slate-900 text-slate-300 space-y-3 font-mono text-[11px]">
            <div className="flex items-center justify-between text-slate-400">
              <div className="flex items-center gap-1.5 font-sans font-bold text-white">
                <ShieldCheck size={14} className="text-emerald-400" />
                <span>资金清算通道与存证哈希</span>
              </div>
              <span className="text-[10px] text-emerald-400">平台合规存管</span>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-slate-400 font-sans">清算通道：</span>
                <span className="text-slate-200">{transaction.paymentChannel}</span>
              </div>

              <div className="flex items-start justify-between gap-2 pt-1 border-t border-slate-800">
                <span className="text-slate-400 font-sans shrink-0">存证交易哈希：</span>
                <div className="flex items-center gap-1.5 text-[10px] text-slate-300 break-all text-right">
                  <span className="font-mono text-emerald-300">{transaction.proofHash}</span>
                  <button
                    onClick={() => handleCopyProof(transaction.proofHash)}
                    className="p-1 rounded-md hover:bg-slate-800 text-slate-400 hover:text-white shrink-0 cursor-pointer"
                    title="复制哈希"
                  >
                    {isCopied ? (
                      <CheckCircle2 size={12} className="text-emerald-400" />
                    ) : (
                      <Copy size={12} />
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3">
          <button
            onClick={() => {
              alert(`正在导出电子对账单 [${transaction.orderNo}].pdf... 包含完整税号与交易流水`);
            }}
            className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
          >
            <Printer size={13} />
            <span>下载/打印结算凭单</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={() => handleCopyProof(transaction.orderNo)}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              {isCopied ? <CheckCircle2 size={13} className="text-emerald-600" /> : <Copy size={13} />}
              <span>{isCopied ? '已复制单号' : '复制单号'}</span>
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
