import React from 'react';
import { Wallet, ArrowUpRight, ArrowDownLeft, ShieldCheck, CreditCard, Clock, FileText } from 'lucide-react';

interface AccountViewProps {
  onOpenRecharge: () => void;
}

export const AccountView: React.FC<AccountViewProps> = ({ onOpenRecharge }) => {
  return (
    <div id="account-view" className="space-y-8 pb-16">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-2xl font-black text-slate-900 font-display">账户总览</h1>
          <p className="text-xs text-slate-500 mt-1">
            实时查看您的平台算力额度、项目托管资金与发票明细
          </p>
        </div>
        <button
          onClick={onOpenRecharge}
          className="px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer"
        >
          + 快速充值
        </button>
      </div>

      {/* Balance Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white p-6 rounded-3xl space-y-4 shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-medium">可用余额 (现金/抵扣券)</span>
            <Wallet size={18} className="text-amber-400" />
          </div>
          <div className="text-3xl font-extrabold font-display">￥ 12,450.00</div>
          <div className="text-xs text-emerald-400 flex items-center gap-1">
            <span>● 包含赠送的 ￥500 FDE 项目代金券</span>
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-slate-200 space-y-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500 font-medium">FDE 交付平台托管资金</span>
            <ShieldCheck size={18} className="text-blue-600" />
          </div>
          <div className="text-3xl font-extrabold text-slate-900 font-display">￥ 28,800.00</div>
          <div className="text-xs text-slate-500">
            在「电商全渠道售后智能体」项目中托管，待验收放款
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-slate-200 space-y-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500 font-medium">智能体 API 调用月度消耗</span>
            <Clock size={18} className="text-slate-400" />
          </div>
          <div className="text-3xl font-extrabold text-slate-900 font-display">￥ 348.60</div>
          <div className="text-xs text-slate-500">
            本月累计调用 42,800 次，平均延迟 380ms
          </div>
        </div>
      </div>

      {/* Transaction Records */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 space-y-4 shadow-2xs">
        <h3 className="font-bold text-slate-900 text-base">最近资金与托管记录</h3>
        <div className="divide-y divide-slate-100">
          {[
            { title: 'FDE 定制项目一阶段托管放款 (架构与接口)', type: 'out', amount: '-￥8,640.00', date: '2026-08-16 14:20', expert: '林然 (认证FDE)' },
            { title: '账户网银充值', type: 'in', amount: '+￥30,000.00', date: '2026-08-15 09:12', expert: '企业对公转账' },
            { title: 'Hz Canvas 无限画布 API 算力扣费', type: 'out', amount: '-￥12.50', date: '2026-08-14 18:30', expert: '平台自动计费' }
          ].map((tx, i) => (
            <div key={i} className="py-3.5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${tx.type === 'in' ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-600'}`}>
                  {tx.type === 'in' ? <ArrowDownLeft size={16} /> : <ArrowUpRight size={16} />}
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-900">{tx.title}</div>
                  <div className="text-[11px] text-slate-400">{tx.date} · {tx.expert}</div>
                </div>
              </div>
              <div className={`text-xs font-bold font-display ${tx.type === 'in' ? 'text-emerald-600' : 'text-slate-900'}`}>
                {tx.amount}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
