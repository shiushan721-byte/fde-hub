import React from 'react';
import {
  Award,
  ShieldCheck,
  Sparkles,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  DollarSign,
  Zap,
  Lock,
  ChevronRight,
  Briefcase,
  UserCheck,
  FileCheck2,
  HelpCircle
} from 'lucide-react';
import { UserIdentityRole } from '../types/creator';
import { isExpertRole } from '../utils/expertIdentity';

interface FDEIntroViewProps {
  userRole: UserIdentityRole;
  onBack: () => void;
  onOpenBecomeCreator: () => void;
  onOpenBecomeFDEModal: () => void;
  onNavigateToCreatorCenter?: () => void;
}

const FAQ_ITEMS: { q: string; a: string }[] = [
  {
    q: '不是程序员，能做 AI 应用专家吗？',
    a: '可以。HelloMe 是零代码智能体平台，你不需要写代码。我们只需要你懂一个行业、熟悉一套业务流程。平台会把底层技术全部封装好，你只需要把你的业务逻辑变成智能体。'
  },
  {
    q: '成为 AI 应用专家能赚多少钱？',
    a: '没有固定上限。你的智能体在平台上被购买使用会产生收入，同时平台会推送企业客户的定制需求给你。目前已入驻的专家，单笔定制交付均价在 5,000–50,000 元之间。'
  },
  {
    q: '一个智能体只能服务一个客户吗？',
    a: '不是。发布的智能体可以作为标准产品被多个客户购买使用。同一套业务逻辑，一次性封装，持续产生收益。'
  },
  {
    q: '平台怎么保证我的收益？',
    a: '平台提供透明的分成机制与结算系统。每次智能体被使用或定制交付完成，收益自动结算到你的平台账户，支持提现。'
  },
  {
    q: '智能体的知识产权归谁？',
    a: '你开发的智能体，知识产权归你所有。平台仅提供发布与交易环境。'
  },
  {
    q: '审核不通过怎么办？',
    a: '运营团队会给出具体的修改建议，完善后重新提交即可。你也可以先加入 FDE 社群，与其他开发者交流经验。'
  }
];

export const FDEIntroView: React.FC<FDEIntroViewProps> = ({
  userRole,
  onBack,
  onOpenBecomeCreator,
  onOpenBecomeFDEModal,
  onNavigateToCreatorCenter
}) => {
  const isExpert = isExpertRole(userRole);

  return (
    <div id="fde-intro-view" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-10">
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 text-xs font-bold text-slate-600 hover:text-blue-600 bg-white hover:bg-slate-50 px-3.5 py-2 rounded-xl border border-slate-200 shadow-2xs transition-colors cursor-pointer"
        >
          <ArrowLeft size={14} />
          <span>返回首页</span>
        </button>

        <div className="flex items-center gap-2 text-xs">
          <span className="text-slate-400">当前身份:</span>
          {!isExpert ? (
            <span className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 font-bold border border-slate-200">
              普通用户
            </span>
          ) : (
            <span className="px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 font-bold border border-blue-200 flex items-center gap-1">
              <Award size={13} />
              <span>AI 应用专家</span>
            </span>
          )}
        </div>
      </div>

      {/* Hero */}
      <div className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 text-white p-8 md:p-12 border border-slate-800 shadow-xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-bl from-amber-500/15 via-blue-500/10 to-transparent rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-3xl space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-400/15 text-amber-300 border border-amber-400/30 text-xs font-bold">
            <Award size={14} className="text-amber-400" />
            <span>AI 应用专家认证</span>
          </div>

          <div className="space-y-3">
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight text-white leading-tight">
              把你的业务经验，
              <br />
              <span className="bg-gradient-to-r from-amber-300 via-amber-200 to-orange-300 bg-clip-text text-transparent">
                变成别人付费的智能体
              </span>
            </h1>
            <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
              完成实名认证、发布经 HelloMe 平台校验的可运行智能体，通过运营审核后，即可成为平台认证的
              AI 应用专家，进入专家库接收咨询与定制商机。
            </p>
          </div>

          <div className="pt-2 flex flex-wrap items-center gap-4">
            {!isExpert ? (
              <button
                onClick={onOpenBecomeCreator}
                className="px-6 py-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-bold text-sm shadow-lg shadow-emerald-500/20 transition-all flex items-center gap-2 cursor-pointer active:scale-95"
              >
                <ShieldCheck size={16} />
                <span>申请成为 AI 应用专家</span>
                <ArrowRight size={15} />
              </button>
            ) : (
              <button
                onClick={onNavigateToCreatorCenter || onOpenBecomeFDEModal}
                className="px-6 py-3 rounded-2xl bg-gradient-to-r from-amber-400 via-amber-500 to-orange-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-extrabold text-sm shadow-lg shadow-amber-500/25 transition-all flex items-center gap-2 cursor-pointer active:scale-95"
              >
                <Briefcase size={16} />
                <span>进入专家中心</span>
                <ArrowRight size={15} />
              </button>
            )}

            <div className="text-xs text-slate-400 flex items-center gap-1.5">
              <CheckCircle2 size={14} className="text-amber-400" />
              <span>实名认证 · 平台校验 · 运营审核</span>
            </div>
          </div>
        </div>
      </div>

      {/* 身份对比 */}
      <div className="space-y-4">
        <div className="flex items-center gap-2.5">
          <div className="w-2.5 h-6 bg-amber-500 rounded-full" />
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
            AI 应用专家与普通开发者的区别
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="p-6 rounded-3xl bg-slate-50 border border-slate-200/80 space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-wider">
              <span>普通开发者 / 个人爱好者</span>
            </div>
            <h3 className="text-base font-bold text-slate-800">停留在功能原型与个人项目</h3>
            <ul className="space-y-2 text-xs text-slate-600 leading-relaxed">
              <li className="flex items-start gap-2">
                <span className="text-slate-400 font-bold">✕</span>
                <span>依赖通用 Prompt 调优，无法处理复杂的垂直业务流与分支判定</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-slate-400 font-bold">✕</span>
                <span>无法接入企业内网 ERP / CRM / 数据库与专有权限控制</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-slate-400 font-bold">✕</span>
                <span>缺乏工程隔离保障，企业对数据安全存疑虑</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-slate-400 font-bold">✕</span>
                <span>做完即弃，缺乏持续经营与商业闭环能力</span>
              </li>
            </ul>
          </div>

          <div className="p-6 rounded-3xl bg-gradient-to-br from-amber-50/70 via-blue-50/40 to-indigo-50/60 border border-amber-200/90 space-y-3 shadow-xs">
            <div className="flex items-center gap-2 text-xs font-extrabold text-amber-700 uppercase tracking-wider">
              <Sparkles size={14} />
              <span>HelloMe 认证 AI 应用专家</span>
            </div>
            <h3 className="text-base font-extrabold text-slate-900">深入业务一线的生产级交付专家</h3>
            <ul className="space-y-2 text-xs text-slate-700 leading-relaxed">
              <li className="flex items-start gap-2">
                <span className="text-emerald-600 font-bold">✓</span>
                <span>
                  <strong>可运行作品门槛：</strong>
                  至少发布 1 个经 Hermes 沙箱校验的智能体，进入专家库与咨询入口
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-emerald-600 font-bold">✓</span>
                <span>
                  <strong>Hermes 沙箱工程安全：</strong>
                  代码、敏感凭证与数据隔离，支持合规审查与私有化部署
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-emerald-600 font-bold">✓</span>
                <span>
                  <strong>商业交付闭环：</strong>
                  接收咨询线索 → 发起定制方案 → 完成交付订单，全流程平台支撑
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-emerald-600 font-bold">✓</span>
                <span>
                  <strong>持续经营收益：</strong>
                  智能体即上架即销售，基于真实运行数据积累口碑与复购
                </span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* 核心能力 */}
      <div className="space-y-4">
        <div className="flex items-center gap-2.5">
          <div className="w-2.5 h-6 bg-indigo-600 rounded-full" />
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
            认证后获得的核心能力
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-2xs space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-blue-100 text-blue-800 flex items-center justify-center">
              <Award size={24} />
            </div>
            <h3 className="text-sm font-bold text-slate-900">专家库收录展示</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              进入 HelloMe AI 应用专家智库公开展示，接受平台内结构化定制咨询。企业客户可通过专家库按行业
              / 能力筛选精准对接。
            </p>
          </div>
          <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-2xs space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-indigo-100 text-indigo-800 flex items-center justify-center">
              <Zap size={24} />
            </div>
            <h3 className="text-sm font-bold text-slate-900">作品持续经营</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              发布通用智能体与客户专属实例，基于真实运行数据积累口碑与线索。一个智能体可服务多个客户，边际成本趋近于零。
            </p>
          </div>
          <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-2xs space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center">
              <DollarSign size={24} />
            </div>
            <h3 className="text-sm font-bold text-slate-900">定制交付商机</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              跟进基于标准智能体的二次改造需求，通过消息提醒与客户闭环协作。均价 5,000–50,000 元 /
              单的定制交付市场等你接单。
            </p>
          </div>
          <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-2xs space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center">
              <Lock size={24} />
            </div>
            <h3 className="text-sm font-bold text-slate-900">实名与安全背书</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              公安人脸实名 + Hermes 沙箱校验，为企业客户提供可信交付主体。认证标识让企业客户放心选你。
            </p>
          </div>
        </div>
      </div>

      {/* 入驻流程 */}
      <div className="space-y-4">
        <div className="flex items-center gap-2.5">
          <div className="w-2.5 h-6 bg-emerald-500 rounded-full" />
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
            入驻流程，两步成为 AI 应用专家
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-2xs space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                <UserCheck size={20} />
              </div>
              <div>
                <div className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">第一步</div>
                <h3 className="text-sm font-bold text-slate-900">实名认证</h3>
              </div>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              完成公安人脸实名认证，建立平台可信身份。
            </p>
          </div>
          <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-2xs space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center">
                <FileCheck2 size={20} />
              </div>
              <div>
                <div className="text-[10px] font-bold text-amber-600 uppercase tracking-wider">第二步</div>
                <h3 className="text-sm font-bold text-slate-900">运营审核</h3>
              </div>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              平台运营团队审核智能体质量与合规性，审核通过后正式入驻专家库。
            </p>
          </div>
        </div>
      </div>

      {/* FAQ */}
      <div className="space-y-4">
        <div className="flex items-center gap-2.5">
          <div className="w-2.5 h-6 bg-violet-500 rounded-full" />
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">常见问题</h2>
        </div>

        <div className="space-y-3">
          {FAQ_ITEMS.map((item) => (
            <details
              key={item.q}
              className="group rounded-2xl border border-slate-200 bg-white open:shadow-2xs"
            >
              <summary className="flex items-center gap-2.5 px-5 py-4 cursor-pointer list-none text-sm font-bold text-slate-900">
                <HelpCircle size={16} className="text-violet-500 shrink-0" />
                <span className="flex-1">{item.q}</span>
                <ChevronRight
                  size={16}
                  className="text-slate-400 shrink-0 transition-transform group-open:rotate-90"
                />
              </summary>
              <div className="px-5 pb-4 pl-12 text-xs text-slate-600 leading-relaxed">{item.a}</div>
            </details>
          ))}
        </div>
      </div>

      {/* Bottom CTA */}
      <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white border border-indigo-900 shadow-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="space-y-2 max-w-xl">
          <h3 className="text-lg sm:text-xl font-extrabold text-white">
            {!isExpert ? '开启您的 AI 应用专家之旅' : '继续经营您的专家主页与作品'}
          </h3>
          <p className="text-xs text-slate-300 leading-relaxed">
            {!isExpert
              ? '完成实名认证，通过运营审核后即可进入专家库。我们提供全程指导支持。'
              : '在专家中心管理智能体、处理咨询线索与定制交付订单。'}
          </p>
        </div>

        <div className="shrink-0 flex items-center gap-3 w-full md:w-auto">
          {!isExpert ? (
            <button
              onClick={onOpenBecomeCreator}
              className="w-full md:w-auto px-7 py-3.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-extrabold text-sm shadow-xl shadow-emerald-500/30 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
            >
              <ShieldCheck size={18} />
              <span>申请成为 AI 应用专家</span>
              <ChevronRight size={18} />
            </button>
          ) : (
            onNavigateToCreatorCenter && (
              <button
                onClick={onNavigateToCreatorCenter}
                className="w-full md:w-auto px-8 py-3.5 rounded-2xl bg-gradient-to-r from-amber-400 via-amber-500 to-orange-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-black text-sm shadow-xl shadow-amber-500/30 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
              >
                <Briefcase size={18} />
                <span>进入专家中心</span>
                <ChevronRight size={18} />
              </button>
            )
          )}
        </div>
      </div>
    </div>
  );
};
