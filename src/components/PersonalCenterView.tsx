import React, { useEffect, useMemo, useState } from 'react';
import {
  BadgeCheck,
  BriefcaseBusiness,
  Clock3,
  Crown,
  Edit3,
  Heart,
  History,
  LayoutGrid,
  MessageSquareMore,
  Plus,
  Search,
  Sparkles,
  Wallet,
  X
} from 'lucide-react';
import { UserIdentityRole } from '../types/creator';
import { isExpertRole } from '../utils/expertIdentity';

type CenterTab = 'used' | 'created' | 'services' | 'income';
type UsedFilter = 'recent' | 'favorites' | 'likes';

const usageAgents = [
  { title: '短视频批量创作', desc: '快速生成脚本、分镜和批量素材', tone: 'from-violet-700 via-indigo-600 to-slate-950', author: 'HelloMe 官方' },
  { title: '公众号文章一键排版', desc: '抓取资讯后生成图文内容与排版', tone: 'from-sky-300 via-blue-500 to-indigo-700', author: 'Devon Lane' },
  { title: '救急文书工坊', desc: '快速生成报告、通知与正式文书', tone: 'from-orange-300 via-rose-400 to-pink-600', author: 'HelloMe 官方' }
];

const createdAgents = [
  { title: '品牌增长 GEO 助手', status: '公开到市场', uses: '1,286 次使用', tone: 'from-amber-300 via-orange-400 to-rose-500' },
  { title: '短视频批量创作', status: '仅自己可用', uses: '268 次使用', tone: 'from-violet-700 via-indigo-600 to-slate-950' },
  { title: '官网工坊', status: '审核中', uses: '等待平台审核', tone: 'from-sky-500 via-blue-600 to-indigo-800' }
];

interface PersonalCenterViewProps {
  userRole: UserIdentityRole;
  onOpenBecomeExpert?: () => void;
  onOpenRecharge?: () => void;
}

export const PersonalCenterView: React.FC<PersonalCenterViewProps> = ({
  userRole,
  onOpenBecomeExpert,
  onOpenRecharge
}) => {
  const isExpert = isExpertRole(userRole);
  const [activeTab, setActiveTab] = useState<CenterTab>('used');
  const [usedFilter, setUsedFilter] = useState<UsedFilter>('recent');
  const [showProfileEditor, setShowProfileEditor] = useState(false);
  const [profile, setProfile] = useState({
    nickname: isExpert ? '林然' : 'Leo',
    intro: isExpert ? '专注企业 AI 应用设计与落地，擅长将业务需求转化为可用的智能体方案。' : '',
    industry: '电商与零售',
    domains: ['营销获客', '工作流自动化', '内容创作']
  });

  useEffect(() => {
    if (!isExpert && (activeTab === 'created' || activeTab === 'income')) {
      setActiveTab('used');
    }
    setProfile((current) => ({
      ...current,
      nickname: isExpert ? (current.nickname === 'Leo' ? '林然' : current.nickname) : 'Leo'
    }));
  }, [activeTab, isExpert]);

  const tabs = useMemo(
    () => [
      { id: 'used' as const, label: '我的使用', icon: History },
      ...(isExpert ? [{ id: 'created' as const, label: '我的创作', icon: Sparkles }] : []),
      { id: 'services' as const, label: '我的定制', icon: BriefcaseBusiness },
      ...(isExpert ? [{ id: 'income' as const, label: '我的收益', icon: Wallet }] : [])
    ],
    [isExpert]
  );

  const selectTab = (tab: CenterTab) => setActiveTab(tab);

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="h-28 bg-[radial-gradient(circle_at_18%_18%,rgba(255,255,255,.30),transparent_28%),linear-gradient(110deg,#172554,#0f766e_56%,#14b8a6)]" />
        <div className="relative px-5 pb-6 sm:px-8">
          <div className="-mt-10 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div className="flex items-end gap-4">
              <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-3xl border-4 border-white bg-slate-900 text-3xl font-black text-white shadow-lg">
                {profile.nickname.slice(0, 1)}
              </div>
              <div className="pb-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-xl font-extrabold text-slate-950">{profile.nickname}</h1>
                  {isExpert && <span className="inline-flex items-center gap-1 text-xs font-bold text-blue-700"><BadgeCheck size={15} /> AI-FDE 专家</span>}
                </div>
                <p className="mt-1 text-sm text-slate-500">{isExpert ? '管理创作、服务与收益，也查看自己的使用记录' : '管理使用记录、定制需求与个人资料'}</p>
              </div>
            </div>
            <button onClick={() => setShowProfileEditor(true)} className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50">
              <Edit3 size={16} /> 编辑资料
            </button>
          </div>

          {isExpert ? (
            <div className="mt-5 flex flex-wrap gap-2 text-xs">
              <span className="rounded-full bg-slate-100 px-3 py-1.5 font-semibold text-slate-700">AI 产品解决方案专家</span>
              <span className="rounded-full bg-slate-100 px-3 py-1.5 font-semibold text-slate-700">{profile.industry}</span>
              {profile.domains.map((domain) => <span key={domain} className="rounded-full bg-teal-50 px-3 py-1.5 font-semibold text-teal-700">{domain}</span>)}
            </div>
          ) : (
            <div className="mt-5 flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3">
              <div><p className="text-sm font-bold text-slate-900">成为 AI-FDE 专家</p><p className="mt-0.5 text-xs text-slate-500">发布智能体、承接定制服务并获得收益</p></div>
              <button onClick={onOpenBecomeExpert} className="rounded-xl bg-slate-950 px-3.5 py-2 text-xs font-bold text-white">申请入驻</button>
            </div>
          )}
        </div>
      </section>

      <div className="mt-7 flex gap-1 overflow-x-auto border-b border-slate-200">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button key={id} onClick={() => selectTab(id)} className={`inline-flex shrink-0 items-center gap-2 border-b-2 px-4 py-3 text-sm font-bold transition ${activeTab === id ? 'border-slate-950 text-slate-950' : 'border-transparent text-slate-400 hover:text-slate-700'}`}>
            <Icon size={16} /> {label}
          </button>
        ))}
      </div>

      {activeTab === 'used' && (
        <section className="pt-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div><h2 className="text-lg font-extrabold text-slate-950">我的使用</h2><p className="mt-1 text-sm text-slate-500">你使用过、收藏或点赞的智能体都在这里。</p></div>
            <div className="flex rounded-xl bg-slate-100 p-1">
              {([['recent', '最近使用'], ['favorites', '收藏'], ['likes', '点赞']] as const).map(([id, label]) => <button key={id} onClick={() => setUsedFilter(id)} className={`rounded-lg px-3 py-1.5 text-xs font-bold ${usedFilter === id ? 'bg-white text-slate-950 shadow-sm' : 'text-slate-500'}`}>{label}</button>)}
            </div>
          </div>
          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {usageAgents.map((agent, index) => <article key={agent.title} className="overflow-hidden rounded-2xl border border-slate-200 bg-white transition hover:-translate-y-0.5 hover:shadow-md">
              <div className={`flex h-28 items-end bg-gradient-to-br ${agent.tone} p-4`}><span className="rounded-lg bg-white/15 px-2 py-1 text-xs font-bold text-white backdrop-blur">{usedFilter === 'recent' ? `${index + 1} 天前使用` : usedFilter === 'favorites' ? '已收藏' : '已点赞'}</span></div>
              <div className="p-4"><h3 className="font-bold text-slate-950">{agent.title}</h3><p className="mt-1 line-clamp-2 text-sm text-slate-500">{agent.desc}</p><div className="mt-4 flex items-center justify-between text-xs text-slate-500"><span>{agent.author}</span><button className="font-bold text-slate-900">继续使用</button></div></div>
            </article>)}
          </div>
        </section>
      )}

      {activeTab === 'created' && isExpert && (
        <section className="pt-6">
          <div className="flex items-center justify-between"><div><h2 className="text-lg font-extrabold text-slate-950">我的创作</h2><p className="mt-1 text-sm text-slate-500">管理已发布、审核中与仅自己可用的智能体。</p></div><button className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-bold text-white"><Plus size={16} /> 创建智能体</button></div>
          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {createdAgents.map((agent) => <article key={agent.title} className="overflow-hidden rounded-2xl border border-slate-200 bg-white"><div className={`h-28 bg-gradient-to-br ${agent.tone}`} /><div className="p-4"><div className="flex items-start justify-between gap-3"><h3 className="font-bold text-slate-950">{agent.title}</h3><span className={`shrink-0 rounded-full px-2 py-1 text-[11px] font-bold ${agent.status === '公开到市场' ? 'bg-emerald-50 text-emerald-700' : agent.status === '审核中' ? 'bg-amber-50 text-amber-700' : 'bg-slate-100 text-slate-600'}`}>{agent.status}</span></div><p className="mt-2 text-sm text-slate-500">{agent.uses}</p><div className="mt-4 flex gap-2"><button className="flex-1 rounded-lg border border-slate-200 py-2 text-xs font-bold text-slate-700">编辑</button><button className="flex-1 rounded-lg bg-slate-950 py-2 text-xs font-bold text-white">管理</button></div></div></article>)}
          </div>
        </section>
      )}

      {activeTab === 'services' && (
        <section className="pt-6"><div className="flex items-center justify-between"><div><h2 className="text-lg font-extrabold text-slate-950">我的定制</h2><p className="mt-1 text-sm text-slate-500">集中查看定制咨询、方案、交付和验收进度。</p></div><button className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-700"><Search size={16} /> 查看全部</button></div>
          <div className="mt-5 grid gap-4 lg:grid-cols-2"><div className="rounded-2xl border border-slate-200 bg-white p-5"><div className="flex items-center justify-between"><span className="text-xs font-bold text-slate-400">CUS-20260902-018</span><span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-700">待确认方案</span></div><h3 className="mt-4 text-base font-bold text-slate-950">品牌内容自动化定制</h3><p className="mt-2 text-sm text-slate-500">基于“公众号文章一键排版”进行二次定制。</p><div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-4"><span className="text-sm text-slate-500">{isExpert ? '等待用户确认方案' : '请确认专家提交的方案'}</span><button className="text-sm font-bold text-slate-950">查看详情</button></div></div><div className="rounded-2xl border border-slate-200 bg-white p-5"><div className="flex items-center justify-between"><span className="text-xs font-bold text-slate-400">CUS-20260831-006</span><span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-700">进行中</span></div><h3 className="mt-4 text-base font-bold text-slate-950">销售线索跟进助手</h3><p className="mt-2 text-sm text-slate-500">专家正在开发并准备交付专属智能体。</p><div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-4"><span className="text-sm text-slate-500">预计 3 天后交付</span><button className="text-sm font-bold text-slate-950">查看详情</button></div></div></div>
        </section>
      )}

      {activeTab === 'income' && isExpert && (
        <section className="pt-6"><div><h2 className="text-lg font-extrabold text-slate-950">我的收益</h2><p className="mt-1 text-sm text-slate-500">订单验收后结算到账，满足条件即可申请提现。</p></div><div className="mt-5 grid gap-4 sm:grid-cols-3"><div className="rounded-2xl bg-slate-950 p-5 text-white"><p className="text-sm text-slate-300">可提现</p><p className="mt-3 text-3xl font-extrabold">¥ 2,580.00</p><button onClick={onOpenRecharge} className="mt-5 rounded-lg bg-white px-3 py-2 text-xs font-bold text-slate-950">申请提现</button></div><div className="rounded-2xl border border-slate-200 bg-white p-5"><p className="text-sm font-semibold text-slate-500">待入账</p><p className="mt-3 text-3xl font-extrabold text-slate-950">¥ 860.00</p><p className="mt-4 text-xs text-slate-500">用户验收后自动结算</p></div><div className="rounded-2xl border border-slate-200 bg-white p-5"><p className="text-sm font-semibold text-slate-500">累计收益</p><p className="mt-3 text-3xl font-extrabold text-slate-950">¥ 12,680.00</p><p className="mt-4 text-xs text-slate-500">含智能体、定制服务和下载收入</p></div></div></section>
      )}

      {showProfileEditor && <ProfileEditor isExpert={isExpert} profile={profile} onClose={() => setShowProfileEditor(false)} onSave={(next) => { setProfile(next); setShowProfileEditor(false); }} />}
    </div>
  );
};

function ProfileEditor({ isExpert, profile, onClose, onSave }: { isExpert: boolean; profile: { nickname: string; intro: string; industry: string; domains: string[] }; onClose: () => void; onSave: (profile: { nickname: string; intro: string; industry: string; domains: string[] }) => void }) {
  const [form, setForm] = useState(profile);
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4"><div className="w-full max-w-xl rounded-3xl bg-white p-6 shadow-2xl"><div className="flex items-center justify-between"><div><h2 className="text-lg font-extrabold text-slate-950">编辑资料</h2><p className="mt-1 text-sm text-slate-500">个人资料与专家资料在同一个入口维护。</p></div><button onClick={onClose} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"><X size={20} /></button></div><div className="mt-6 space-y-5"><label className="block text-sm font-bold text-slate-800">用户昵称<input value={form.nickname} onChange={(e) => setForm({ ...form, nickname: e.target.value })} className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5 outline-none focus:border-slate-500" /></label>{isExpert && <><div className="rounded-xl bg-blue-50 p-4"><div className="flex items-center gap-2 text-sm font-bold text-blue-900"><Crown size={16} /> 专家资料</div><p className="mt-1 text-xs leading-5 text-blue-700">专家头衔由认证审核结果确定，不支持自行修改；如需变更请联系平台客服。</p></div><label className="block text-sm font-bold text-slate-800">专家头衔<input value="AI 产品解决方案专家" disabled className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-slate-500" /></label><label className="block text-sm font-bold text-slate-800">个人简介<textarea value={form.intro} onChange={(e) => setForm({ ...form, intro: e.target.value })} className="mt-2 min-h-24 w-full rounded-xl border border-slate-200 px-3 py-2.5 outline-none focus:border-slate-500" /></label><div><p className="text-sm font-bold text-slate-800">擅长领域 <span className="font-normal text-slate-400">（最多 3 个）</span></p><div className="mt-2 flex flex-wrap gap-2">{form.domains.map((item) => <span key={item} className="rounded-full bg-teal-50 px-3 py-1.5 text-xs font-bold text-teal-700">{item}</span>)}</div></div></>}</div><div className="mt-7 flex justify-end gap-3"><button onClick={onClose} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-700">取消</button><button onClick={() => onSave(form)} className="rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-bold text-white">保存</button></div></div></div>;
}
