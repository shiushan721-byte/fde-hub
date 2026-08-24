import React, { useState } from 'react';
import {
  X,
  Sliders,
  Sparkles,
  Zap,
  Bot,
  Briefcase,
  Wallet,
  ShieldCheck,
  TrendingUp,
  CheckCircle2,
  Lock,
  ArrowRight,
  Calculator,
  Layers,
  Coins,
  RefreshCw,
  Award,
  ChevronRight,
  Info,
  User,
  UserCheck,
  UserPlus,
  Star,
  Crown,
  AlertTriangle
} from 'lucide-react';
import { CreatorTierLevel, AI_EXPERT_DISCLAIMER } from '../types/creator';
import {
  creatorDatasetsByTier,
  mockCreatorTierTiers,
  normalUserMockDataset
} from '../data/creatorMockData';

interface CreatorDebugPanelModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentTier?: CreatorTierLevel;
  userRole?: 'normal' | 'creator' | 'fde' | 'expert';
  onSelectTier?: (tier: CreatorTierLevel) => void;
  onSelectUserRole?: (role: 'normal' | 'creator' | 'fde' | 'expert', tier?: CreatorTierLevel) => void;
  onNavigateSubTab?: (subTab: string) => void;
  onOpenBecomeCreator?: () => void;
  onOpenBecomeFDE?: () => void;
}

export const CreatorDebugPanelModal: React.FC<CreatorDebugPanelModalProps> = ({
  isOpen,
  onClose,
  currentTier = 3,
  userRole = 'fde',
  onSelectTier,
  onSelectUserRole,
  onNavigateSubTab,
  onOpenBecomeCreator,
  onOpenBecomeFDE
}) => {
  const [activeDebugTab, setActiveDebugTab] = useState<'switcher' | 'comparison' | 'calculator'>('switcher');

  // Interactive Calculator State
  const [calcTokensMillions, setCalcTokensMillions] = useState<number>(50); // 50M tokens
  const [excludedTestTokens, setExcludedTestTokens] = useState<number>(5); // 5M test/anomaly tokens
  const [expertLevelSelected, setExpertLevelSelected] = useState<1 | 2 | 3>(2);

  if (!isOpen) return null;

  const handleSelectIdentity = (role: 'normal' | 'creator' | 'fde' | 'expert', tier: CreatorTierLevel) => {
    if (onSelectUserRole) {
      onSelectUserRole(role === 'normal' ? 'normal' : role === 'fde' ? 'fde' : role === 'creator' ? 'creator' : 'expert', tier);
    } else if (onSelectTier) {
      onSelectTier(tier);
    }
  };

  // Revenue calculation helper
  // Baseline: 1M tokens ≈ ￥10 retail value
  const grossTokens = calcTokensMillions;
  const validTokens = Math.max(0, grossTokens - excludedTestTokens);
  const validGrossRevenue = validTokens * 10;

  const rebateRateByLevel = {
    1: 0.10, // 10%
    2: 0.15, // 15%
    3: 0.20  // 20%
  };

  const levelRebate = validGrossRevenue * rebateRateByLevel[expertLevelSelected];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-5xl max-h-[94vh] flex flex-col overflow-hidden">
        {/* Modal Header */}
        <div className="p-5 sm:p-6 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center text-blue-300">
              <Sliders size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold tracking-tight text-white">
                  两类主体与三级 AI 专家认证 · 调试控制台
                </h2>
                <span className="px-2 py-0.5 rounded-full bg-blue-500/30 text-blue-200 text-[10px] font-mono border border-blue-400/30">
                  DEV PANEL
                </span>
              </div>
              <p className="text-xs text-slate-300">
                仅开发环境可用：本地切换「普通用户 / AI 专家」视图，不会写入认证数据库
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

        {/* Debug Navigation Tabs */}
        <div className="px-6 py-2.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between gap-3 overflow-x-auto">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveDebugTab('switcher')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeDebugTab === 'switcher'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <Layers size={14} />
              <span>身份与等级快速切换</span>
            </button>

            <button
              onClick={() => setActiveDebugTab('comparison')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeDebugTab === 'comparison'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <TrendingUp size={14} />
              <span>两类主体与三级认证权益对比</span>
            </button>

            <button
              onClick={() => setActiveDebugTab('calculator')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeDebugTab === 'calculator'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <Calculator size={14} />
              <span>有效词元消耗分成测算器</span>
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {/* TAB 1: Switcher */}
          {activeDebugTab === 'switcher' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {/* 1. 普通用户 */}
                <div
                  onClick={() => handleSelectIdentity('normal', 1)}
                  className={`p-5 rounded-3xl border-2 transition-all cursor-pointer flex flex-col justify-between ${
                    userRole === 'normal'
                      ? 'border-blue-600 bg-blue-50/50 shadow-md ring-2 ring-blue-500/20'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div className="w-10 h-10 rounded-2xl bg-slate-100 text-slate-700 flex items-center justify-center font-bold">
                        <User size={20} />
                      </div>
                      {userRole === 'normal' && (
                        <span className="px-2 py-0.5 rounded-full bg-blue-600 text-white text-[10px] font-bold">
                          当前身份
                        </span>
                      )}
                    </div>
                    <div>
                      <h3 className="font-bold text-sm text-slate-900">普通用户</h3>
                      <p className="text-[11px] text-slate-500 mt-0.5">无需实名认证</p>
                    </div>
                    <ul className="text-[11px] text-slate-600 space-y-1.5 pt-2 border-t border-slate-100">
                      <li className="flex items-center gap-1.5">✓ 浏览与免费使用智能体</li>
                      <li className="flex items-center gap-1.5">✓ 收藏智能体、关注专家、点赞与评价</li>
                      <li className="flex items-center gap-1.5">✓ 平台表单向专家咨询</li>
                      <li className="flex items-center gap-1.5 text-slate-400">✕ 无专家主页与收益分成</li>
                    </ul>
                  </div>
                  <button className="mt-4 w-full py-2 bg-slate-100 text-slate-800 rounded-xl text-xs font-bold hover:bg-slate-200">
                    切换为普通用户
                  </button>
                </div>

                {/* 2. 一级 AI 专家 */}
                <div
                  onClick={() => handleSelectIdentity('expert', 1)}
                  className={`p-5 rounded-3xl border-2 transition-all cursor-pointer flex flex-col justify-between ${
                    userRole !== 'normal' && currentTier === 1
                      ? 'border-blue-600 bg-blue-50/50 shadow-md ring-2 ring-blue-500/20'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div className="w-10 h-10 rounded-2xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
                        <Award size={20} />
                      </div>
                      <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 text-[10px] font-bold">
                        10% 返点
                      </span>
                    </div>
                    <div>
                      <h3 className="font-bold text-sm text-slate-900">一级 AI 专家</h3>
                      <p className="text-[11px] text-blue-700 font-medium mt-0.5">真人实名 · 作品首发</p>
                    </div>
                    <ul className="text-[11px] text-slate-600 space-y-1.5 pt-2 border-t border-slate-100">
                      <li className="flex items-center gap-1.5">✓ 公安实名与人脸识别</li>
                      <li className="flex items-center gap-1.5">✓ Hermes 结构校验作品</li>
                      <li className="flex items-center gap-1.5">✓ 专家库收录与咨询接收</li>
                      <li className="flex items-center gap-1.5 font-bold text-blue-700">✓ 10% 词元消耗分成</li>
                    </ul>
                  </div>
                  <button className="mt-4 w-full py-2 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 shadow-xs">
                    切换为一级专家
                  </button>
                </div>

                {/* 3. 二级 AI 专家 */}
                <div
                  onClick={() => handleSelectIdentity('expert', 2)}
                  className={`p-5 rounded-3xl border-2 transition-all cursor-pointer flex flex-col justify-between ${
                    userRole !== 'normal' && currentTier === 2
                      ? 'border-indigo-600 bg-indigo-50/50 shadow-md ring-2 ring-indigo-500/20'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div className="w-10 h-10 rounded-2xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold">
                        <Star size={20} />
                      </div>
                      <span className="px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800 text-[10px] font-bold">
                        15% 返点
                      </span>
                    </div>
                    <div>
                      <h3 className="font-bold text-sm text-slate-900">二级 AI 专家</h3>
                      <p className="text-[11px] text-indigo-700 font-medium mt-0.5">稳定运行 · 良好反馈</p>
                    </div>
                    <ul className="text-[11px] text-slate-600 space-y-1.5 pt-2 border-t border-slate-100">
                      <li className="flex items-center gap-1.5">✓ ≥3 个可运行智能体</li>
                      <li className="flex items-center gap-1.5">✓ 90天调用 ≥2,000次</li>
                      <li className="flex items-center gap-1.5">✓ Hermes 成功率 ≥98%</li>
                      <li className="flex items-center gap-1.5 font-bold text-indigo-700">✓ 15% 词元消耗分成</li>
                    </ul>
                  </div>
                  <button className="mt-4 w-full py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700 shadow-xs">
                    切换为二级专家
                  </button>
                </div>

                {/* 4. 三级 AI 专家 */}
                <div
                  onClick={() => handleSelectIdentity('expert', 3)}
                  className={`p-5 rounded-3xl border-2 transition-all cursor-pointer flex flex-col justify-between ${
                    userRole !== 'normal' && currentTier === 3
                      ? 'border-amber-600 bg-amber-50/50 shadow-md ring-2 ring-amber-500/20'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold">
                        <Crown size={20} />
                      </div>
                      <span className="px-2 py-0.5 rounded-full bg-amber-200 text-amber-900 text-[10px] font-bold">
                        20% 返点
                      </span>
                    </div>
                    <div>
                      <h3 className="font-bold text-sm text-slate-900">三级 AI 专家</h3>
                      <p className="text-[11px] text-amber-800 font-medium mt-0.5">头部优质 · 平台复核</p>
                    </div>
                    <ul className="text-[11px] text-slate-600 space-y-1.5 pt-2 border-t border-slate-100">
                      <li className="flex items-center gap-1.5">✓ 累计调用 ≥10,000次</li>
                      <li className="flex items-center gap-1.5">✓ 评分 ≥4.9 / 极低报错</li>
                      <li className="flex items-center gap-1.5">✓ 平台人工深度复核</li>
                      <li className="flex items-center gap-1.5 font-bold text-amber-800">✓ 20% 顶级返点金标</li>
                    </ul>
                  </div>
                  <button className="mt-4 w-full py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-xl text-xs font-bold shadow-xs">
                    切换为三级专家
                  </button>
                </div>
              </div>

              {/* Real-time Current State Banner */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <UserCheck size={18} className="text-emerald-600" />
                  <div className="text-xs text-slate-700">
                    <span>当前激活身份：</span>
                    <span className="font-bold text-slate-900 ml-1">
                      {userRole === 'normal'
                        ? '普通用户 (无实名/免费使用)'
                        : currentTier === 1
                        ? '一级 AI 专家 (10% 算力返点)'
                        : currentTier === 2
                        ? '二级 AI 专家 (15% 算力返点)'
                        : '三级 AI 专家 (20% 算力返点)'}
                    </span>
                  </div>
                </div>
                <span className="text-[11px] text-slate-500">
                  动态评估周期：二级/三级按季度核算
                </span>
              </div>
            </div>
          )}

          {/* TAB 2: Comparison */}
          {activeDebugTab === 'comparison' && (
            <div className="space-y-4">
              <div className="border border-slate-200 rounded-2xl overflow-hidden text-xs">
                <table className="w-full text-left">
                  <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                    <tr>
                      <th className="p-3">权益与规则维度</th>
                      <th className="p-3">普通用户</th>
                      <th className="p-3">一级 AI 专家</th>
                      <th className="p-3">二级 AI 专家</th>
                      <th className="p-3">三级 AI 专家</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    <tr>
                      <td className="p-3 font-bold text-slate-900">实名认证要求</td>
                      <td className="p-3 text-slate-500">无需实名</td>
                      <td className="p-3 text-emerald-600 font-medium">公安实名+人脸识别</td>
                      <td className="p-3 text-emerald-600 font-medium">公安实名+人脸识别</td>
                      <td className="p-3 text-emerald-600 font-medium">公安实名+人脸识别</td>
                    </tr>
                    <tr>
                      <td className="p-3 font-bold text-slate-900">智能体发布条件</td>
                      <td className="p-3 text-slate-400">不可发布</td>
                      <td className="p-3 text-slate-700">≥1个作品 (Hermes通过)</td>
                      <td className="p-3 text-slate-700">≥3个作品 (Hermes稳定)</td>
                      <td className="p-3 text-slate-700">头部优质作品集</td>
                    </tr>
                    <tr>
                      <td className="p-3 font-bold text-slate-900">词元消耗返点比例</td>
                      <td className="p-3 text-slate-400">0%</td>
                      <td className="p-3 font-bold text-blue-600">10%</td>
                      <td className="p-3 font-bold text-indigo-600">15%</td>
                      <td className="p-3 font-bold text-amber-600">20%</td>
                    </tr>
                    <tr>
                      <td className="p-3 font-bold text-slate-900">等级有效周期与评估</td>
                      <td className="p-3 text-slate-500">永久</td>
                      <td className="p-3 text-slate-700">长期有效 (满足基本条件)</td>
                      <td className="p-3 text-indigo-700 font-medium">月度 / 季度动态评估</td>
                      <td className="p-3 text-amber-800 font-medium">季度评估 + 平台人工复核</td>
                    </tr>
                    <tr>
                      <td className="p-3 font-bold text-slate-900">专属标识与曝光</td>
                      <td className="p-3 text-slate-400">普通用户标</td>
                      <td className="p-3 text-blue-700">一级实名专家标</td>
                      <td className="p-3 text-indigo-700">二级推荐蓝紫标</td>
                      <td className="p-3 text-amber-700 font-bold">三级头部金标重点推荐</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-600 space-y-1">
                <div className="font-bold text-slate-800 flex items-center gap-1.5">
                  <Info size={14} className="text-slate-500" />
                  <span>平台免责声明</span>
                </div>
                <p className="text-[11.5px] leading-relaxed">
                  {AI_EXPERT_DISCLAIMER}
                </p>
              </div>
            </div>
          )}

          {/* TAB 3: Calculator */}
          {activeDebugTab === 'calculator' && (
            <div className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Input Controls */}
                <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200 space-y-4 text-xs">
                  <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                    <Calculator size={16} className="text-blue-600" />
                    <span>词元消耗与风控排除参数</span>
                  </h4>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between font-bold text-slate-700">
                      <span>智能体累计调用产生词元 (百万 tokens):</span>
                      <span className="text-blue-600 font-mono text-sm">{calcTokensMillions} M</span>
                    </div>
                    <input
                      type="range"
                      min={1}
                      max={200}
                      value={calcTokensMillions}
                      onChange={(e) => setCalcTokensMillions(Number(e.target.value))}
                      className="w-full accent-blue-600"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between font-bold text-amber-800">
                      <span>风控排除/测试赠送/失败退回 (百万 tokens):</span>
                      <span className="text-rose-600 font-mono text-sm">-{excludedTestTokens} M</span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={Math.min(calcTokensMillions, 50)}
                      value={excludedTestTokens}
                      onChange={(e) => setExcludedTestTokens(Number(e.target.value))}
                      className="w-full accent-rose-600"
                    />
                  </div>

                  <div className="space-y-1.5 pt-2">
                    <span className="font-bold text-slate-700 block">选择测算专家认证等级:</span>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { lvl: 1, label: '一级专家 (10%)' },
                        { lvl: 2, label: '二级专家 (15%)' },
                        { lvl: 3, label: '三级专家 (20%)' }
                      ].map((item) => (
                        <button
                          key={item.lvl}
                          type="button"
                          onClick={() => setExpertLevelSelected(item.lvl as 1 | 2 | 3)}
                          className={`p-2 rounded-xl font-bold transition-all cursor-pointer ${
                            expertLevelSelected === item.lvl
                              ? 'bg-blue-600 text-white shadow-xs'
                              : 'bg-white border border-slate-200 text-slate-700'
                          }`}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Calculation Output Card */}
                <div className="p-5 bg-gradient-to-br from-slate-900 to-indigo-950 text-white rounded-2xl border border-indigo-900/60 flex flex-col justify-between space-y-4">
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-indigo-200 font-semibold">测算结果 (月度净收益)</span>
                      <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold border border-emerald-400/30">
                        有效消耗计提
                      </span>
                    </div>

                    <div className="mt-4">
                      <div className="text-3xl font-black text-amber-400">
                        ￥{levelRebate.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                      <p className="text-[11px] text-slate-300 mt-1">
                        有效结算词元：{validTokens} M tokens (官方基准价 ￥10/M)
                      </p>
                    </div>
                  </div>

                  <div className="p-3 bg-white/10 rounded-xl space-y-1.5 text-xs text-slate-200 border border-white/10">
                    <div className="flex items-center justify-between">
                      <span>毛调用产生额：</span>
                      <span>￥{(grossTokens * 10).toLocaleString()}</span>
                    </div>
                    <div className="flex items-center justify-between text-rose-300">
                      <span>风控与测试剔除额：</span>
                      <span>-￥{(excludedTestTokens * 10).toLocaleString()}</span>
                    </div>
                    <div className="flex items-center justify-between pt-1 border-t border-white/10 font-bold text-amber-300">
                      <span>适用返点比例：</span>
                      <span>{(rebateRateByLevel[expertLevelSelected] * 100).toFixed(0)}%</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
