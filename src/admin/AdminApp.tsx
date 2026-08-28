import React, { useEffect, useMemo, useState } from 'react';
import {
  Bot,
  Users,
  LogOut,
  Shield,
  Check,
  Loader2,
  X,
  Download,
  ChevronDown,
  Banknote,
  Landmark
} from 'lucide-react';
import { api, ApiError } from '../lib/api';
import {
  CUSTOM_SERVICE_FILTERS,
  creatorOrderStage,
  type CustomServiceFilterKey
} from '../lib/customOrderLabels';
import {
  DeliveryProposalModal,
  DeliveryProposalReviewPanel,
  hasViewableProposal
} from '../components/DeliveryProposalReviewPanel';
import type { DeliveryProposal } from '../types/deliveryProposal';
import { getCaseStudyImages } from '../types';
import {
  ExpertAccountsPage,
  EscrowsPage,
  FinanceBalancesPage,
  FinanceLedgerPage,
  FinanceRulesPage,
  SettlementsPage,
  WithdrawalsPage
} from './FinancePages';
import { ExpertTagsPage } from './ExpertTagsPage';

type AdminCaseItem = {
  id?: string;
  title?: string;
  clientIndustry?: string;
  clientName?: string;
  solution?: string;
  challenge?: string;
  coverImage?: string;
  images?: string[];
  roiMetrics?: Array<{ label: string; value: string }>;
  tags?: string[];
};

type ExpertTagRow = {
  id: string;
  name: string;
  status: string;
  sortOrder?: number;
  expertCount?: number;
};

type AdminPage =
  | 'agents'
  | 'custom-agents'
  | 'deliveries'
  | 'experts'
  | 'applications'
  | 'expert-tags'
  | 'leads'
  | 'users'
  | 'expert-accounts'
  | 'settlements'
  | 'withdrawals'
  | 'escrows'
  | 'finance-rules'
  | 'finance-balances'
  | 'finance-ledger';

type AdminUser = { id: string; email: string; name: string; role: string };

function isAdminRole(role: string) {
  return role === 'super_admin' || role === 'operator';
}

type NavLeaf = { key: AdminPage; label: string };
type NavEntry =
  | { type: 'link'; key: AdminPage; label: string; icon: React.ElementType; superOnly?: boolean }
  | {
      type: 'group';
      id: string;
      label: string;
      icon: React.ElementType;
      children: NavLeaf[];
    };

const nav: NavEntry[] = [
  {
    type: 'group',
    id: 'agent-mgmt',
    label: '智能体管理',
    icon: Bot,
    children: [
      { key: 'agents', label: '通用智能体' },
      { key: 'custom-agents', label: '定制智能体' },
      { key: 'deliveries', label: '智能体审核' },
      { key: 'leads', label: '咨询线索' }
    ]
  },
  {
    type: 'group',
    id: 'expert-mgmt',
    label: '专家库管理',
    icon: Users,
    children: [
      { key: 'experts', label: '专家管理' },
      { key: 'expert-tags', label: '专家标签管理' },
      { key: 'applications', label: '专家审核' }
    ]
  },
  {
    type: 'group',
    id: 'fund-mgmt',
    label: '资金管理',
    icon: Banknote,
    children: [
      { key: 'expert-accounts', label: '专家账户余额' },
      { key: 'settlements', label: '订单结算' },
      { key: 'finance-rules', label: '费率与结算规则' }
    ]
  },
  {
    type: 'group',
    id: 'finance-mgmt',
    label: '财务管理',
    icon: Landmark,
    children: [
      { key: 'finance-balances', label: '余额管理' },
      { key: 'finance-ledger', label: '账户变动明细' },
      { key: 'withdrawals', label: '提现管理' },
      { key: 'escrows', label: '资金托管' }
    ]
  },
  { type: 'link', key: 'users', label: '管理员', icon: Shield, superOnly: true }
];

const GROUP_PAGE_KEYS: Record<string, AdminPage[]> = {
  'agent-mgmt': ['agents', 'custom-agents', 'deliveries', 'leads'],
  'expert-mgmt': ['experts', 'expert-tags', 'applications'],
  'fund-mgmt': ['expert-accounts', 'settlements', 'finance-rules'],
  'finance-mgmt': ['finance-balances', 'finance-ledger', 'withdrawals', 'escrows']
};

const statusLabel: Record<string, string> = {
  draft: '草稿',
  in_review: '审核中',
  published: '已发布',
  offline: '已下架',
  new: '新线索',
  contacted: '已联系',
  quoted: '已报价',
  signed: '已签约',
  closed: '已关闭',
  pending: '待审核',
  under_review: '审核中',
  supplement_required: '待补充',
  approved: '已通过',
  rejected: '已驳回',
  withdrawn: '已撤回',
  onboarding: '入驻申请',
  upgrade: '晋升申请',
  active: '已生效',
  frozen: '已冻结',
  revision: '修改中',
  pending_ops_review: '待运营审核',
  ops_rejected: '运营已驳回',
  published_to_customer: '已推送客户',
  validation_failed: '校验失败'
};

export const AdminApp: React.FC<{ onExit: () => void }> = ({ onExit }) => {
  const [me, setMe] = useState<AdminUser | null>(null);
  const [checking, setChecking] = useState(true);
  const [page, setPage] = useState<AdminPage>('agents');
  const [agentsAuthorFilter, setAgentsAuthorFilter] = useState<{
    authorId: string;
    label: string;
  } | null>(null);
  const [nonAdminHint, setNonAdminHint] = useState('');
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({
    'agent-mgmt': true,
    'expert-mgmt': true,
    'fund-mgmt': true,
    'finance-mgmt': true
  });

  const loadMe = async () => {
    try {
      const user = await api<AdminUser>('/api/auth/me');
      if (isAdminRole(user.role)) {
        setMe(user);
        setNonAdminHint('');
      } else {
        setMe(null);
        setNonAdminHint(`当前登录的是前台账号「${user.name}」（${user.email}），无后台权限。请使用管理员账号登录。`);
      }
    } catch {
      setMe(null);
      setNonAdminHint('');
    } finally {
      setChecking(false);
    }
  };

  useEffect(() => {
    loadMe();
  }, []);

  useEffect(() => {
    for (const [groupId, keys] of Object.entries(GROUP_PAGE_KEYS)) {
      if (keys.includes(page)) {
        setOpenGroups((prev) => ({ ...prev, [groupId]: true }));
      }
    }
  }, [page]);

  if (checking) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center text-slate-500">
        <Loader2 className="animate-spin" size={20} />
      </div>
    );
  }

  if (!me) {
    return (
      <AdminLogin
        hint={nonAdminHint}
        onSuccess={(user) => {
          setMe(user);
          setNonAdminHint('');
        }}
        onBack={onExit}
      />
    );
  }

  const visibleNav = nav.filter((item) => {
    if (item.type === 'link' && item.superOnly) return me.role === 'super_admin';
    return true;
  });

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 flex">
      <aside className="w-56 bg-slate-950 text-slate-100 flex flex-col shrink-0">
        <div className="px-4 py-5 border-b border-white/10">
          <div className="text-xs font-black tracking-wide">Hellome 后台</div>
          <div className="text-[11px] text-slate-400 mt-1">{me.name} · {me.role === 'super_admin' ? '超级管理员' : '运营'}</div>
        </div>
        <nav className="flex-1 p-2 space-y-1">
          {visibleNav.map((item) => {
            if (item.type === 'group') {
              const groupActive = item.children.some((c) => c.key === page);
              const open = openGroups[item.id] ?? groupActive;
              const Icon = item.icon;
              return (
                <div key={item.id} className="space-y-0.5">
                  <button
                    type="button"
                    onClick={() =>
                      setOpenGroups((prev) => ({
                        ...prev,
                        [item.id]: !(prev[item.id] ?? true)
                      }))
                    }
                    className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold cursor-pointer ${
                      groupActive ? 'bg-white/15 text-white' : 'text-slate-300 hover:bg-white/10'
                    }`}
                  >
                    <Icon size={14} />
                    <span className="flex-1 text-left">{item.label}</span>
                    <ChevronDown
                      size={13}
                      className={`opacity-70 transition-transform ${open ? 'rotate-0' : '-rotate-90'}`}
                    />
                  </button>
                  {open &&
                    item.children.map((child) => {
                      const active = page === child.key;
                      return (
                        <button
                          key={child.key}
                          type="button"
                          onClick={() => {
                            if (child.key === 'agents') setAgentsAuthorFilter(null);
                            setPage(child.key);
                          }}
                          className={`w-full flex items-center gap-2 pl-9 pr-3 py-1.5 rounded-xl text-[11px] font-bold cursor-pointer ${
                            active
                              ? 'bg-white text-slate-950'
                              : 'text-slate-400 hover:bg-white/10 hover:text-slate-200'
                          }`}
                        >
                          {child.label}
                        </button>
                      );
                    })}
                </div>
              );
            }

            const Icon = item.icon;
            const active = page === item.key;
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => setPage(item.key)}
                className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold cursor-pointer ${
                  active ? 'bg-white text-slate-950' : 'text-slate-300 hover:bg-white/10'
                }`}
              >
                <Icon size={14} />
                {item.label}
              </button>
            );
          })}
        </nav>
        <div className="p-3 border-t border-white/10 space-y-2">
          <button
            type="button"
            onClick={onExit}
            className="w-full px-3 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-xs font-bold cursor-pointer"
          >
            返回前台演示
          </button>
          <button
            type="button"
            onClick={async () => {
              await api('/api/auth/logout', { method: 'POST' }).catch(() => undefined);
              setMe(null);
            }}
            className="w-full px-3 py-2 rounded-xl text-slate-400 hover:text-white text-xs font-bold flex items-center justify-center gap-1 cursor-pointer"
          >
            <LogOut size={13} />
            退出登录
          </button>
        </div>
      </aside>

      <main className="flex-1 min-w-0 p-6 overflow-auto">
        {page === 'agents' && (
          <AgentsPage
            authorFilter={agentsAuthorFilter}
            onClearAuthorFilter={() => setAgentsAuthorFilter(null)}
          />
        )}
        {page === 'custom-agents' && <CustomAgentsPage />}
        {page === 'deliveries' && <AgentReviewPage />}
        {page === 'experts' && (
          <ExpertsPage
            onOpenPublishedAgents={(authorId, label) => {
              setAgentsAuthorFilter({ authorId, label });
              setPage('agents');
            }}
          />
        )}
        {page === 'expert-tags' && <ExpertTagsPage />}
        {page === 'applications' && <ApplicationsPage />}
        {page === 'leads' && <LeadsPage />}
        {page === 'expert-accounts' && <ExpertAccountsPage />}
        {page === 'settlements' && <SettlementsPage />}
        {page === 'withdrawals' && <WithdrawalsPage />}
        {page === 'escrows' && <EscrowsPage />}
        {page === 'finance-rules' && <FinanceRulesPage />}
        {page === 'finance-balances' && <FinanceBalancesPage />}
        {page === 'finance-ledger' && <FinanceLedgerPage />}
        {page === 'users' && me.role === 'super_admin' && <UsersPage />}
      </main>
    </div>
  );
};

const AdminLogin: React.FC<{
  onSuccess: (user: AdminUser) => void;
  onBack: () => void;
  hint?: string;
}> = ({ onSuccess, onBack, hint }) => {
  const [email, setEmail] = useState('admin@hellome.art');
  const [password, setPassword] = useState('hellome-admin');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  return (
    <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-6">
      <form
        className="w-full max-w-sm bg-white text-slate-900 rounded-3xl p-6 space-y-4"
        onSubmit={async (e) => {
          e.preventDefault();
          setLoading(true);
          setError('');
          try {
            const user = await api<AdminUser>('/api/auth/login', {
              method: 'POST',
              body: JSON.stringify({ email, password })
            });
            if (!isAdminRole(user.role)) {
              setError('该账号不是管理员，无法进入后台');
              await api('/api/auth/logout', { method: 'POST' }).catch(() => undefined);
              return;
            }
            onSuccess(user);
          } catch (err) {
            setError(err instanceof ApiError ? err.message : '登录失败，请先运行 npm run dev:api');
          } finally {
            setLoading(false);
          }
        }}
      >
        <div>
          <h1 className="text-lg font-black">Hellome 管理后台</h1>
          <p className="text-xs text-slate-500 mt-1">配置前台展示内容、上下架与专家认证</p>
        </div>
        {hint && (
          <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 leading-relaxed">
            {hint}
          </p>
        )}
        <label className="block text-xs font-bold space-y-1">
          <span>邮箱</span>
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm"
          />
        </label>
        <label className="block text-xs font-bold space-y-1">
          <span>密码</span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm"
          />
        </label>
        {error && <p className="text-xs text-rose-600">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="w-full py-2.5 rounded-xl bg-slate-950 text-white text-sm font-bold cursor-pointer disabled:opacity-60"
        >
          {loading ? '登录中…' : '进入后台'}
        </button>
        <p className="text-[11px] text-slate-500 leading-relaxed">
          超级管理员 admin@hellome.art / hellome-admin
          <br />
          运营 ops@hellome.art / hellome-ops
        </p>
        <button type="button" onClick={onBack} className="text-xs text-slate-500 underline cursor-pointer">
          返回前台
        </button>
      </form>
    </div>
  );
};

function useAdminQuery<T>(path: string, extraKey = '') {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      setData(await api<T>(path));
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [path, extraKey]);

  return { data, error, loading, reload: load, setData };
}

type CustomAgentRow = {
  id: string;
  title: string;
  requirement?: string;
  desc?: string;
  status: string;
  version?: string;
  currentVersion: string;
  baseAgentTitle: string;
  baseAgentVersion: string;
  authorName?: string | null;
  createdAt: string;
  customer?: { name: string; email: string };
  order?: {
    id: string;
    orderNo: string;
    status: string;
    title: string;
    baseAgentTitle?: string;
    baseAgentVersion?: string;
    proposalVersion?: number;
    proposalSubmittedAt?: string;
    deliveryProposal?: DeliveryProposal | Record<string, unknown>;
    creator?: { name: string; email: string };
  } | null;
  latestDelivery?: { version: string; status: string; publishedAt?: string } | null;
};

const CustomAgentsPage = () => {
  const [q, setQ] = useState('');
  const [status, setStatus] = useState<CustomServiceFilterKey | ''>('');
  const [detailItem, setDetailItem] = useState<CustomAgentRow | null>(null);
  const [proposalItem, setProposalItem] = useState<CustomAgentRow | null>(null);
  const { data, error, loading, reload } = useAdminQuery<CustomAgentRow[]>(
    `/api/admin/private-instances?${new URLSearchParams({
      ...(status ? { status } : {}),
      ...(q.trim() ? { q: q.trim() } : {})
    }).toString()}`,
    `${status}|${q}`
  );

  const total = data?.length || 0;

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-black">定制智能体</h1>
          <p className="text-xs text-slate-500 mt-1">客户专属实例（由定制订单交付产生，不对市场公开）</p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as CustomServiceFilterKey | '')}
            className="px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white"
          >
            <option value="">全部状态</option>
            {CUSTOM_SERVICE_FILTERS.filter((f) => f.key !== 'all').map((f) => (
              <option key={f.key} value={f.key}>
                {f.label}
              </option>
            ))}
          </select>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="搜索 ID / 名称 / 订单号 / 用户"
            className="px-3 py-2 rounded-xl border border-slate-200 text-xs w-64 bg-white"
          />
          <button
            type="button"
            onClick={reload}
            className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold cursor-pointer"
          >
            刷新
          </button>
        </div>
      </div>
      {loading && <p className="text-sm text-slate-500">加载中…</p>}
      {error && <p className="text-sm text-rose-600">{error}</p>}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <table className="w-full text-xs">
          <thead className="bg-slate-50 text-slate-500">
            <tr>
              <th className="text-left p-3 w-14">序号</th>
              <th className="text-left p-3">智能体 ID</th>
              <th className="text-left p-3 whitespace-nowrap">版本号</th>
              <th className="text-left p-3">智能体名称</th>
              <th className="text-left p-3 whitespace-nowrap">订单编号</th>
              <th className="text-left p-3 whitespace-nowrap">专属用户</th>
              <th className="text-left p-3">状态</th>
              <th className="text-left p-3 whitespace-nowrap">创建时间</th>
              <th className="text-right p-3">操作</th>
            </tr>
          </thead>
          <tbody>
            {(data || []).map((item, index) => {
              const version =
                item.version ||
                item.currentVersion ||
                item.latestDelivery?.version ||
                'v1.0.0';
              const orderStage = creatorOrderStage(item.order?.status);
              const isConsulting =
                orderStage.stageKey === 'consulting' ||
                ['consulting', 'pending_quote'].includes(item.order?.status || '');
              const canViewProposal =
                !!item.order &&
                !isConsulting &&
                hasViewableProposal(item.order.deliveryProposal as DeliveryProposal);
              return (
                <tr key={item.id} className="border-t border-slate-100 align-top">
                  <td className="p-3 text-slate-500 tabular-nums">{total - index}</td>
                  <td className="p-3">
                    <code className="text-[11px] font-mono text-slate-700 break-all">{item.id}</code>
                  </td>
                  <td className="p-3 whitespace-nowrap">
                    <span className="font-mono text-slate-700">{version}</span>
                  </td>
                  <td className="p-3">
                    <div className="font-bold text-slate-900">{item.title}</div>
                    <div className="text-slate-400 mt-0.5">
                      {item.authorName || item.order?.creator?.name || '—'}
                    </div>
                  </td>
                  <td className="p-3 whitespace-nowrap">
                    <code className="text-[11px] font-mono text-slate-700">
                      {item.order?.orderNo || '—'}
                    </code>
                  </td>
                  <td className="p-3 whitespace-nowrap">
                    <div className="text-slate-900">{item.customer?.name || '—'}</div>
                    {item.customer?.email && (
                      <div className="text-slate-400 mt-0.5">{item.customer.email}</div>
                    )}
                  </td>
                  <td className="p-3 whitespace-nowrap">{orderStage.stageLabel}</td>
                  <td className="p-3 text-slate-500 whitespace-nowrap">
                    {item.createdAt ? new Date(item.createdAt).toLocaleString('zh-CN') : '—'}
                  </td>
                  <td className="p-3 text-right whitespace-nowrap">
                    <div className="inline-flex flex-col items-end gap-1.5">
                      <button
                        type="button"
                        onClick={() => setDetailItem(item)}
                        className="text-[11px] text-blue-600 font-bold cursor-pointer"
                      >
                        查看需求
                      </button>
                      {canViewProposal ? (
                        <button
                          type="button"
                          onClick={() => setProposalItem(item)}
                          className="text-[11px] text-violet-600 font-bold cursor-pointer"
                        >
                          查看方案
                        </button>
                      ) : (
                        <span className="text-[11px] text-slate-400">
                          {isConsulting ? '等待交付方案' : '暂无方案'}
                        </span>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {data?.length === 0 && (
          <p className="p-6 text-sm text-slate-400 text-center">暂无定制智能体实例</p>
        )}
      </div>

      {detailItem && (
        <div
          className="fixed inset-0 z-50 bg-black/40 flex justify-end animate-in fade-in duration-200"
          onClick={() => setDetailItem(null)}
        >
          <div
            className="w-full max-w-3xl h-full bg-white border-l border-slate-200 shadow-2xl overflow-hidden flex flex-col animate-in slide-in-from-right duration-300"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-labelledby="admin-custom-requirement-title"
          >
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between shrink-0">
              <div className="min-w-0">
                <h3 id="admin-custom-requirement-title" className="text-base font-bold text-slate-900">
                  定制需求详情
                </h3>
                <p className="text-xs text-slate-400 mt-0.5 truncate">
                  {detailItem.order?.orderNo || detailItem.title}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setDetailItem(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
                aria-label="关闭"
              >
                <X size={18} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-x-6 gap-y-3">
                <div>
                  <div className="text-slate-400">编号</div>
                  <div className="font-mono text-slate-800 mt-0.5">
                    {detailItem.order?.orderNo || '—'}
                  </div>
                </div>
                <div>
                  <div className="text-slate-400">阶段</div>
                  <div className="font-semibold text-slate-800 mt-0.5">
                    {creatorOrderStage(detailItem.order?.status).stageLabel}
                  </div>
                </div>
                <div>
                  <div className="text-slate-400">基础智能体</div>
                  <div className="font-semibold text-slate-800 mt-0.5">
                    {detailItem.order?.baseAgentTitle || detailItem.baseAgentTitle || '—'}
                    {detailItem.order?.baseAgentVersion || detailItem.baseAgentVersion
                      ? ` · ${detailItem.order?.baseAgentVersion || detailItem.baseAgentVersion}`
                      : ''}
                  </div>
                </div>
                <div>
                  <div className="text-slate-400">专家</div>
                  <div className="font-semibold text-slate-800 mt-0.5">
                    {detailItem.order?.creator?.name || detailItem.authorName || '—'}
                  </div>
                </div>
                <div>
                  <div className="text-slate-400">专属用户</div>
                  <div className="font-semibold text-slate-800 mt-0.5">
                    {detailItem.customer?.name || '—'}
                  </div>
                </div>
                <div>
                  <div className="text-slate-400">专属智能体</div>
                  <div className="font-semibold text-slate-800 mt-0.5">{detailItem.title}</div>
                </div>
              </div>
              <div>
                <div className="text-slate-400 mb-1.5">需求描述</div>
                <p className="text-sm text-slate-800 leading-relaxed whitespace-pre-wrap bg-slate-50 rounded-xl p-4 border border-slate-100">
                  {detailItem.requirement ||
                    detailItem.desc ||
                    detailItem.order?.title ||
                    '暂无需求描述'}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {proposalItem?.order &&
        hasViewableProposal(proposalItem.order.deliveryProposal as DeliveryProposal) && (
          <DeliveryProposalModal
            isOpen
            variant="drawer"
            onClose={() => setProposalItem(null)}
            title={`定制交付方案 · ${proposalItem.order.orderNo}`}
          >
            <DeliveryProposalReviewPanel
              proposal={proposalItem.order.deliveryProposal as DeliveryProposal}
              proposalVersion={proposalItem.order.proposalVersion}
              proposalSubmittedAt={proposalItem.order.proposalSubmittedAt}
              readOnly
              statusHint={creatorOrderStage(proposalItem.order.status).stageLabel}
            />
          </DeliveryProposalModal>
        )}
    </div>
  );
};

const AgentsPage = ({
  authorFilter,
  onClearAuthorFilter
}: {
  authorFilter?: { authorId: string; label: string } | null;
  onClearAuthorFilter?: () => void;
}) => {
  const [q, setQ] = useState('');
  const [commentsTarget, setCommentsTarget] = useState<{ id: string; title: string } | null>(null);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [commentsError, setCommentsError] = useState('');
  const [commentsPayload, setCommentsPayload] = useState<{
    total: number;
    comments: Array<{
      id: string;
      userName: string;
      userAvatar: string;
      isAuthor: boolean;
      content: string;
      createdAt: string;
      replies: Array<{
        id: string;
        userName: string;
        userAvatar: string;
        isAuthor: boolean;
        content: string;
        createdAt: string;
      }>;
    }>;
  } | null>(null);
  const [engagementTarget, setEngagementTarget] = useState<{
    id: string;
    title: string;
    metric: 'likes' | 'favorites' | 'shares';
    label: string;
    actual: number;
    manual: number;
  } | null>(null);
  const [engagementManualInput, setEngagementManualInput] = useState('0');
  const [engagementSaving, setEngagementSaving] = useState(false);
  const [detailTarget, setDetailTarget] = useState<{
    title: string;
    desc: string;
    coverImage?: string | null;
  } | null>(null);

  const query = new URLSearchParams({
    ...(q.trim() ? { q: q.trim() } : {}),
    ...(authorFilter?.authorId ? { authorId: authorFilter.authorId } : {})
  }).toString();
  const { data, error, loading, reload } = useAdminQuery<Array<{
    id: string;
    kind: string;
    title: string;
    desc: string;
    category: string;
    authorName: string | null;
    authorExpertNo?: string | null;
    status: string;
    version?: string;
    coverImage?: string | null;
    commentsCount?: number | string;
    likesCount?: string | number;
    likesActual?: number;
    likesManual?: number;
    favoritesCount?: string | number;
    favoritesActual?: number;
    favoritesManual?: number;
    sharesCount?: string | number;
    sharesActual?: number;
    sharesManual?: number;
    showOnHome: boolean;
    featured: boolean;
    createdAt: string;
  }>>(`/api/admin/agents${query ? `?${query}` : ''}`, `${q}|${authorFilter?.authorId || ''}`);

  const total = data?.length || 0;

  const openComments = async (agent: { id: string; title: string }) => {
    setCommentsTarget(agent);
    setCommentsLoading(true);
    setCommentsError('');
    setCommentsPayload(null);
    try {
      const result = await api<{
        total: number;
        comments: typeof commentsPayload extends null ? never : NonNullable<typeof commentsPayload>['comments'];
      }>(`/api/admin/agents/${agent.id}/comments`);
      setCommentsPayload({
        total: result.total,
        comments: result.comments
      });
    } catch (err) {
      setCommentsError(err instanceof Error ? err.message : '加载评论失败');
    } finally {
      setCommentsLoading(false);
    }
  };

  const deleteComment = async (commentId: string) => {
    if (!commentsTarget) return;
    if (!window.confirm('确认删除该评论？若为父评论，其作者回复也会一并删除。')) return;
    try {
      await api(`/api/admin/agents/${commentsTarget.id}/comments/${commentId}`, {
        method: 'DELETE'
      });
      await openComments(commentsTarget);
      reload();
    } catch (err) {
      alert(err instanceof Error ? err.message : '删除失败');
    }
  };

  const openEngagement = (
    agent: {
      id: string;
      title: string;
      likesActual?: number;
      likesManual?: number;
      likesCount?: string | number;
      favoritesActual?: number;
      favoritesManual?: number;
      favoritesCount?: string | number;
      sharesActual?: number;
      sharesManual?: number;
      sharesCount?: string | number;
    },
    metric: 'likes' | 'favorites' | 'shares'
  ) => {
    const label = metric === 'likes' ? '点赞' : metric === 'favorites' ? '收藏' : '分享';
    const manual =
      metric === 'likes'
        ? Number(agent.likesManual) || 0
        : metric === 'favorites'
          ? Number(agent.favoritesManual) || 0
          : Number(agent.sharesManual) || 0;
    const total =
      metric === 'likes'
        ? Number(agent.likesCount) || 0
        : metric === 'favorites'
          ? Number(agent.favoritesCount) || 0
          : Number(agent.sharesCount) || 0;
    const actualFromApi =
      metric === 'likes'
        ? agent.likesActual
        : metric === 'favorites'
          ? agent.favoritesActual
          : agent.sharesActual;
    const actual =
      actualFromApi !== undefined && actualFromApi !== null
        ? Number(actualFromApi) || 0
        : Math.max(0, total - manual);
    setEngagementTarget({
      id: agent.id,
      title: agent.title,
      metric,
      label,
      actual,
      manual
    });
    setEngagementManualInput(String(manual));
  };

  const saveEngagementManual = async () => {
    if (!engagementTarget) return;
    const manual = Math.max(0, Math.floor(Number(engagementManualInput) || 0));
    setEngagementSaving(true);
    try {
      await api(`/api/admin/agents/${engagementTarget.id}/engagement-manual`, {
        method: 'PATCH',
        body: JSON.stringify({ metric: engagementTarget.metric, manual })
      });
      setEngagementTarget(null);
      reload();
    } catch (err) {
      alert(err instanceof Error ? err.message : '保存失败');
    } finally {
      setEngagementSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-xl font-black">通用智能体</h1>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="搜索 ID / 标题 / 作者 / 分类"
          className="px-3 py-2 rounded-xl border border-slate-200 text-xs w-64 bg-white"
        />
      </div>
      {authorFilter && (
        <div className="flex items-center gap-2 text-xs">
          <span className="px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 border border-blue-100 font-bold">
            筛选作者：{authorFilter.label}
          </span>
          <button
            type="button"
            onClick={onClearAuthorFilter}
            className="text-slate-500 font-bold cursor-pointer hover:text-slate-800"
          >
            清除筛选
          </button>
        </div>
      )}
      {loading && <p className="text-sm text-slate-500">加载中…</p>}
      {error && <p className="text-sm text-rose-600">{error}</p>}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <table className="w-full text-xs">
          <thead className="bg-slate-50 text-slate-500">
            <tr>
              <th className="text-left p-3 w-14">序号</th>
              <th className="text-left p-3">智能体 ID</th>
              <th className="text-left p-3">智能体名称</th>
              <th className="text-left p-3">分类</th>
              <th className="text-left p-3">状态</th>
              <th className="text-left p-3 whitespace-nowrap">互动</th>
              <th className="text-left p-3 whitespace-nowrap">创建时间</th>
              <th className="text-right p-3">操作</th>
            </tr>
          </thead>
          <tbody>
            {(data || []).map((agent, index) => (
              <tr key={agent.id} className="border-t border-slate-100 align-top">
                <td className="p-3 text-slate-500 tabular-nums">{total - index}</td>
                <td className="p-3">
                  <code className="text-[11px] font-mono text-slate-700 break-all">{agent.id}</code>
                  <div className="text-[11px] font-mono text-slate-500 mt-1">
                    {agent.version || 'v1.0.0'}
                  </div>
                </td>
                <td className="p-3">
                  <div className="font-bold text-slate-900">{agent.title}</div>
                  <div className="text-slate-400 mt-0.5">{agent.authorName || '—'}</div>
                  {agent.authorExpertNo && (
                    <div className="text-[11px] font-mono text-slate-500 mt-0.5">
                      {agent.authorExpertNo}
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() =>
                      setDetailTarget({
                        title: agent.title,
                        desc: agent.desc || '',
                        coverImage: agent.coverImage
                      })
                    }
                    className="mt-1.5 text-[11px] font-bold text-blue-600 hover:text-blue-700 cursor-pointer"
                  >
                    智能体详情
                  </button>
                </td>
                <td className="p-3 whitespace-nowrap">{agent.category || '—'}</td>
                <td className="p-3 whitespace-nowrap">{statusLabel[agent.status] || agent.status}</td>
                <td className="p-3 whitespace-nowrap">
                  <div className="space-y-1 text-[11px] text-slate-600">
                    <button
                      type="button"
                      onClick={() => void openComments({ id: agent.id, title: agent.title })}
                      className="flex items-center gap-1.5 font-bold text-blue-600 hover:text-blue-700 cursor-pointer tabular-nums"
                      title="查看评论"
                    >
                      <span className="text-slate-400 font-medium w-7">评论</span>
                      <span>{Number(agent.commentsCount) || 0}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => openEngagement(agent, 'likes')}
                      className="flex items-center gap-1.5 tabular-nums cursor-pointer hover:text-blue-700"
                      title="调整点赞手动数量"
                    >
                      <span className="text-slate-400 w-7">点赞</span>
                      <span className="font-semibold text-slate-800">{agent.likesCount ?? 0}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => openEngagement(agent, 'favorites')}
                      className="flex items-center gap-1.5 tabular-nums cursor-pointer hover:text-blue-700"
                      title="调整收藏手动数量"
                    >
                      <span className="text-slate-400 w-7">收藏</span>
                      <span className="font-semibold text-slate-800">{agent.favoritesCount ?? 0}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => openEngagement(agent, 'shares')}
                      className="flex items-center gap-1.5 tabular-nums cursor-pointer hover:text-blue-700"
                      title="调整分享手动数量"
                    >
                      <span className="text-slate-400 w-7">分享</span>
                      <span className="font-semibold text-slate-800">{agent.sharesCount ?? 0}</span>
                    </button>
                  </div>
                </td>
                <td className="p-3 text-slate-500 whitespace-nowrap">
                  {agent.createdAt ? new Date(agent.createdAt).toLocaleString('zh-CN') : '—'}
                </td>
                <td className="p-3 text-right space-x-2 whitespace-nowrap">
                  {agent.status === 'offline' ? (
                    <span className="text-slate-400">已下架</span>
                  ) : agent.status === 'in_review' ? (
                    <button
                      type="button"
                      disabled
                      className="font-bold text-slate-300 cursor-not-allowed"
                      title="审核中不可下架"
                    >
                      下架
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="font-bold text-rose-600 cursor-pointer"
                      onClick={async () => {
                        await api(`/api/admin/agents/${agent.id}/offline`, { method: 'POST' });
                        reload();
                      }}
                    >
                      下架
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {data?.length === 0 && (
          <p className="p-6 text-sm text-slate-400 text-center">暂无通用智能体</p>
        )}
      </div>

      {commentsTarget && (
        <div
          className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
          onClick={() => setCommentsTarget(null)}
        >
          <div
            className="bg-white w-full max-w-2xl max-h-[80vh] rounded-2xl border border-slate-200 shadow-2xl overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 py-4 border-b border-slate-100 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="text-sm font-black text-slate-900 truncate">
                  评论 · {commentsTarget.title}
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  共 {commentsPayload?.total ?? '—'} 条
                </p>
              </div>
              <button
                type="button"
                onClick={() => setCommentsTarget(null)}
                className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {commentsLoading && <p className="text-sm text-slate-500">加载中…</p>}
              {commentsError && <p className="text-sm text-rose-600">{commentsError}</p>}
              {!commentsLoading && !commentsError && commentsPayload?.comments.length === 0 && (
                <p className="text-sm text-slate-400 text-center py-8">暂无评论</p>
              )}
              {(commentsPayload?.comments || []).map((c) => (
                <div key={c.id} className="space-y-2">
                  <div className="rounded-xl border border-slate-200 p-3 space-y-2">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2 min-w-0">
                        <img
                          src={c.userAvatar || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=80'}
                          alt=""
                          className="w-8 h-8 rounded-full object-cover border border-slate-200"
                        />
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-slate-900 truncate">
                            {c.userName}
                            {c.isAuthor && (
                              <span className="ml-1.5 text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-100 px-1.5 py-0.5 rounded">
                                作者
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-slate-400">
                            {new Date(c.createdAt).toLocaleString('zh-CN')}
                          </div>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => void deleteComment(c.id)}
                        className="text-[11px] font-bold text-rose-600 hover:text-rose-700 cursor-pointer shrink-0"
                      >
                        删除
                      </button>
                    </div>
                    <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-wrap">
                      {c.content}
                    </p>
                  </div>
                  {(c.replies || []).map((r) => (
                    <div
                      key={r.id}
                      className="ml-6 rounded-xl border border-slate-100 bg-slate-50 p-3 space-y-2"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-2 min-w-0">
                          <img
                            src={r.userAvatar || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=80'}
                            alt=""
                            className="w-7 h-7 rounded-full object-cover border border-slate-200"
                          />
                          <div className="min-w-0">
                            <div className="text-xs font-bold text-slate-900 truncate">
                              {r.userName}
                              {r.isAuthor && (
                                <span className="ml-1.5 text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-100 px-1.5 py-0.5 rounded">
                                  作者回复
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] text-slate-400">
                              {new Date(r.createdAt).toLocaleString('zh-CN')}
                            </div>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => void deleteComment(r.id)}
                          className="text-[11px] font-bold text-rose-600 hover:text-rose-700 cursor-pointer shrink-0"
                        >
                          删除
                        </button>
                      </div>
                      <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-wrap">
                        {r.content}
                      </p>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {detailTarget && (
        <div
          className="fixed inset-0 z-50 bg-black/40 flex justify-end animate-in fade-in duration-200"
          onClick={() => setDetailTarget(null)}
        >
          <div
            className="w-full max-w-3xl h-full bg-white border-l border-slate-200 shadow-2xl overflow-hidden flex flex-col animate-in slide-in-from-right duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-4 border-b border-slate-100 flex items-start justify-between gap-3 shrink-0">
              <div className="min-w-0">
                <h3 className="text-base font-black text-slate-900 truncate">智能体详情</h3>
                <p className="text-xs text-slate-400 mt-0.5 truncate">{detailTarget.title}</p>
              </div>
              <button
                type="button"
                onClick={() => setDetailTarget(null)}
                className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-5">
              {detailTarget.coverImage ? (
                <div className="rounded-xl overflow-hidden bg-slate-100 ring-1 ring-slate-200/80">
                  <img
                    src={detailTarget.coverImage}
                    alt={detailTarget.title}
                    referrerPolicy="no-referrer"
                    className="w-full aspect-[16/9] object-cover"
                  />
                </div>
              ) : (
                <div className="rounded-xl bg-slate-100 aspect-[16/9] flex items-center justify-center text-xs text-slate-400">
                  暂无封面
                </div>
              )}
              <div className="space-y-2">
                <h4 className="text-base font-black text-slate-900 leading-snug">
                  {detailTarget.title}
                </h4>
                <p className="text-sm text-slate-600 whitespace-pre-wrap leading-relaxed">
                  {detailTarget.desc?.trim() || '暂无简介'}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {engagementTarget && (
        <div
          className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
          onClick={() => setEngagementTarget(null)}
        >
          <div
            className="bg-white w-full max-w-md rounded-2xl border border-slate-200 shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 py-4 border-b border-slate-100 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="text-sm font-black text-slate-900 truncate">
                  {engagementTarget.label} · {engagementTarget.title}
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  前台展示 = 实际数量 + 手动添加
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEngagementTarget(null)}
                className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div className="flex items-center justify-between gap-3 text-sm">
                <span className="text-slate-500">实际数量</span>
                <span className="font-semibold tabular-nums text-slate-900">
                  {engagementTarget.actual}
                </span>
              </div>
              <label className="block space-y-1.5">
                <span className="text-sm text-slate-500">手动添加数量</span>
                <input
                  type="number"
                  min={0}
                  step={1}
                  value={engagementManualInput}
                  onChange={(e) => setEngagementManualInput(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm tabular-nums"
                />
              </label>
              <div className="flex items-center justify-between gap-3 text-sm rounded-xl bg-slate-50 border border-slate-100 px-3 py-2.5">
                <span className="text-slate-500">前台总数量</span>
                <span className="font-black tabular-nums text-slate-900">
                  {engagementTarget.actual +
                    Math.max(0, Math.floor(Number(engagementManualInput) || 0))}
                </span>
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setEngagementTarget(null)}
                  className="px-3 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  取消
                </button>
                <button
                  type="button"
                  disabled={engagementSaving}
                  onClick={() => void saveEngagementManual()}
                  className="px-3 py-2 rounded-xl text-xs font-bold bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-60 cursor-pointer"
                >
                  {engagementSaving ? '保存中…' : '保存'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const ApplicationsPage = () => {
  const [filter, setFilter] = useState('pending');
  const [previewImage, setPreviewImage] = useState<{ url: string; label: string } | null>(null);
  const [approveModal, setApproveModal] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [approveTags, setApproveTags] = useState<string[]>([]);
  const [approveBusy, setApproveBusy] = useState(false);
  const { data: tagCatalog } = useAdminQuery<ExpertTagRow[]>('/api/admin/expert-tags');
  const activeTagOptions = useMemo(
    () => (tagCatalog || []).filter((t) => t.status === 'active'),
    [tagCatalog]
  );
  const { data, error, loading, reload } = useAdminQuery<Array<{
    id: string;
    type: string;
    currentLevel: number;
    targetLevel: number;
    status: string;
    applicantName: string;
    contactPhone: string;
    expertTitle: string;
    expertNo?: string | null;
    expertId?: string | null;
    bio: string;
    domainTags: string[];
    agentTitle?: string;
    caseDescription?: string;
    rejectReason: string;
    supplementRequest?: string;
    realName?: string;
    idCardMasked?: string;
    idCardFrontUrl?: string;
    idCardBackUrl?: string;
    createdAt: string;
    user?: { name: string; email: string };
  }>>(`/api/admin/expert-applications${filter ? `?status=${filter}` : ''}`, filter);

  const runAction = async (id: string, action: string, body?: Record<string, unknown>) => {
    await api(`/api/admin/expert-applications/${id}/${action}`, {
      method: 'POST',
      body: JSON.stringify(body || {})
    });
    reload();
  };

  const openApproveModal = (app: { id: string; applicantName: string }) => {
    setApproveModal({
      id: app.id,
      name: app.applicantName
    });
    setApproveTags([]);
  };

  const confirmApprove = async () => {
    if (!approveModal) return;
    if (approveTags.length === 0) {
      alert('请至少选择一个已上架的专家标签');
      return;
    }
    setApproveBusy(true);
    try {
      await runAction(approveModal.id, 'approve', { domainTags: approveTags });
      setApproveModal(null);
      setApproveTags([]);
    } catch (err) {
      alert(err instanceof Error ? err.message : '审批失败');
    } finally {
      setApproveBusy(false);
    }
  };

  const toggleApproveTag = (name: string) => {
    setApproveTags((prev) =>
      prev.includes(name) ? prev.filter((t) => t !== name) : [...prev, name]
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-black">专家审核</h1>
        </div>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white"
        >
          <option value="pending">待审核</option>
          <option value="under_review">审核中</option>
          <option value="supplement_required">待补充</option>
          <option value="approved">已通过</option>
          <option value="rejected">已驳回</option>
          <option value="withdrawn">已撤回</option>
          <option value="">全部</option>
        </select>
      </div>
      {loading && <p className="text-sm text-slate-500">加载中…</p>}
      {error && <p className="text-sm text-rose-600">{error}</p>}
      <div className="space-y-3">
        {(data || []).map((app) => (
          <div key={app.id} className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-sm font-bold">
                  {app.applicantName}
                  <span className="ml-2 text-xs font-semibold text-slate-500">
                    {statusLabel[app.type] || app.type}
                  </span>
                </div>
                <div className="text-xs text-slate-500 mt-0.5">
                  {app.user?.email || app.contactPhone || '—'}
                </div>
                {app.status === 'approved' && app.expertNo && (
                  <div className="text-[11px] font-mono text-emerald-700 mt-1">
                    专家编号 {app.expertNo}
                  </div>
                )}
              </div>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                {statusLabel[app.status] || app.status}
              </span>
            </div>
            {app.expertTitle && (
              <p className="text-xs text-slate-600">
                <span className="text-slate-400">申请头衔 · </span>
                {app.expertTitle}
              </p>
            )}
            {(app.realName || app.idCardMasked) && (
              <div className="text-xs text-slate-600 space-y-0.5">
                {app.realName && (
                  <p>
                    <span className="text-slate-400">真实姓名：</span>
                    {app.realName}
                  </p>
                )}
                {app.idCardMasked && (
                  <p>
                    <span className="text-slate-400">身份证号：</span>
                    <span className="font-mono">{app.idCardMasked}</span>
                  </p>
                )}
              </div>
            )}
            {(app.idCardFrontUrl || app.idCardBackUrl) && (
              <div className="space-y-1.5">
                <p className="text-[11px] text-slate-400">身份证照片</p>
                <div className="flex flex-wrap gap-3">
                  {app.idCardFrontUrl && (
                    <button
                      type="button"
                      onClick={() => setPreviewImage({ url: app.idCardFrontUrl!, label: '身份证正面' })}
                      className="group text-left cursor-pointer"
                    >
                      <div className="w-44 aspect-[1.58/1] rounded-xl border border-slate-200 overflow-hidden bg-slate-50 shadow-2xs">
                        <img
                          src={app.idCardFrontUrl}
                          alt="身份证正面"
                          className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform"
                        />
                      </div>
                      <div className="mt-1 text-[11px] text-slate-500">正面（人像面）· 点击放大</div>
                    </button>
                  )}
                  {app.idCardBackUrl && (
                    <button
                      type="button"
                      onClick={() => setPreviewImage({ url: app.idCardBackUrl!, label: '身份证反面' })}
                      className="group text-left cursor-pointer"
                    >
                      <div className="w-44 aspect-[1.58/1] rounded-xl border border-slate-200 overflow-hidden bg-slate-50 shadow-2xs">
                        <img
                          src={app.idCardBackUrl}
                          alt="身份证反面"
                          className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform"
                        />
                      </div>
                      <div className="mt-1 text-[11px] text-slate-500">反面（国徽面）· 点击放大</div>
                    </button>
                  )}
                </div>
              </div>
            )}
            {app.bio && <p className="text-xs text-slate-600">{app.bio}</p>}
            {app.supplementRequest && (
              <p className="text-[11px] text-amber-700 bg-amber-50 rounded-xl p-2">
                补充要求：{app.supplementRequest}
              </p>
            )}
            {app.status === 'rejected' && app.rejectReason && (
              <p className="text-xs text-rose-600">驳回原因：{app.rejectReason}</p>
            )}
            {['pending', 'under_review'].includes(app.status) && (
              <div className="flex flex-wrap items-center gap-2 pt-1">
                {app.status === 'pending' && (
                  <button
                    type="button"
                    className="px-3 py-1.5 rounded-xl bg-slate-800 text-white text-xs font-bold cursor-pointer"
                    onClick={() => runAction(app.id, 'start-review')}
                  >
                    开始审核
                  </button>
                )}
                <button
                  type="button"
                  className="px-3 py-1.5 rounded-xl bg-emerald-600 text-white text-xs font-bold cursor-pointer flex items-center gap-1"
                  onClick={() =>
                    openApproveModal({
                      id: app.id,
                      applicantName: app.applicantName
                    })
                  }
                >
                  <Check size={12} />
                    通过
                </button>
                <button
                  type="button"
                  className="px-3 py-1.5 rounded-xl bg-rose-50 text-rose-700 border border-rose-200 text-xs font-bold cursor-pointer flex items-center gap-1"
                  onClick={async () => {
                    const reason = window.prompt('请填写驳回原因');
                    if (!reason) return;
                    await runAction(app.id, 'reject', { reason });
                  }}
                >
                  <X size={12} />
                  驳回
                </button>
              </div>
            )}
            <div className="text-[10px] text-slate-400">{new Date(app.createdAt).toLocaleString()}</div>
          </div>
        ))}
        {data?.length === 0 && <p className="text-sm text-slate-400">当前筛选下没有申请。</p>}
      </div>
      {previewImage && (
        <div
          className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-6"
          onClick={() => setPreviewImage(null)}
        >
          <div
            className="bg-white rounded-2xl border border-slate-200 p-4 max-w-3xl w-full space-y-3 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-sm font-bold text-slate-900">{previewImage.label}</h3>
              <button
                type="button"
                onClick={() => setPreviewImage(null)}
                className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>
            <img
              src={previewImage.url}
              alt={previewImage.label}
              className="w-full rounded-xl border border-slate-100 bg-slate-50"
            />
          </div>
        </div>
      )}
      {approveModal && (
        <div
          className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4"
          onClick={() => setApproveModal(null)}
        >
          <div
            className="bg-white rounded-2xl border border-slate-200 p-5 w-full max-w-lg space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-sm font-black">审核通过 · 选择专家标签</h3>
            <p className="text-xs text-slate-500">申请人：{approveModal.name}</p>
            <div className="flex flex-wrap gap-2">
              {activeTagOptions.map((tag) => {
                const on = approveTags.includes(tag.name);
                return (
                  <button
                    key={tag.id}
                    type="button"
                    onClick={() => toggleApproveTag(tag.name)}
                    className={`px-2.5 py-1 rounded-full text-[11px] font-bold border cursor-pointer ${
                      on
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-white text-slate-600 border-slate-200'
                    }`}
                  >
                    {tag.name}
                  </button>
                );
              })}
            </div>
            {activeTagOptions.length === 0 && (
              <p className="text-xs text-rose-600">暂无已上架标签，请先在专家标签管理中创建。</p>
            )}
            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => setApproveModal(null)}
                className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold cursor-pointer"
              >
                取消
              </button>
              <button
                type="button"
                disabled={approveBusy || approveTags.length === 0}
                onClick={() => void confirmApprove()}
                className="px-3 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold cursor-pointer disabled:opacity-60"
              >
                {approveBusy ? '提交中…' : '确认通过'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const AgentReviewPage = () => {
  const [tab, setTab] = useState<'universal' | 'delivery'>('delivery');
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-black">智能体审核</h1>
      </div>
      <div className="flex gap-1 bg-white p-1 rounded-xl border border-slate-200 w-fit">
        <button
          type="button"
          onClick={() => setTab('universal')}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-bold cursor-pointer ${
            tab === 'universal' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-50'
          }`}
        >
          通用智能体审核
        </button>
        <button
          type="button"
          onClick={() => setTab('delivery')}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-bold cursor-pointer ${
            tab === 'delivery' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-50'
          }`}
        >
          交付智能体审核
        </button>
      </div>
      {tab === 'universal' ? <UniversalAgentsReviewPanel /> : <DeliveriesPage />}
    </div>
  );
};

function downloadSkillPackage(fileName: string, payload: Record<string, unknown>) {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName.endsWith('.zip') || fileName.endsWith('.json')
    ? fileName.replace(/\.zip$/i, '.json')
    : `${fileName || 'skill-package'}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

const UniversalAgentsReviewPanel = () => {
  const [filter, setFilter] = useState('in_review');
  const [publishTarget, setPublishTarget] = useState<{
    id: string;
    title: string;
    category: string;
  } | null>(null);
  const [publishCategory, setPublishCategory] = useState('');
  const [publishing, setPublishing] = useState(false);
  const [rejectTarget, setRejectTarget] = useState<{ id: string; title: string } | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [rejecting, setRejecting] = useState(false);
  const { data, error, loading, reload } = useAdminQuery<Array<{
    id: string;
    title: string;
    desc: string;
    category: string;
    authorName: string | null;
    authorId: string | null;
    authorExpertNo?: string | null;
    status: string;
    solutionPayload?: string;
  }>>(`/api/admin/agents?status=${filter}`, filter);
  const { data: homeData } = useAdminQuery<{
    categories: Array<{ id: string; name: string; visible: boolean; sortOrder: number }>;
  }>('/api/admin/home');

  const industryOptions = Array.from(
    new Set([
      ...(homeData?.categories || [])
        .map((c) => c.name)
        .filter((name) => name && name !== '全部'),
      '内容营销',
      '创作工具',
      '办公协同',
      '图片视频',
      '电商零售',
      '智能制造',
      '金融投研'
    ])
  );

  const confirmPublish = async () => {
    if (!publishTarget) return;
    if (!publishCategory.trim()) {
      alert('请选择行业分类');
      return;
    }
    setPublishing(true);
    try {
      await api(`/api/admin/agents/${publishTarget.id}/publish`, {
        method: 'POST',
        body: JSON.stringify({ category: publishCategory.trim() })
      });
      setPublishTarget(null);
      reload();
    } catch (e) {
      alert(e instanceof Error ? e.message : '发布失败');
    } finally {
      setPublishing(false);
    }
  };

  const confirmReject = async () => {
    if (!rejectTarget) return;
    if (!rejectReason.trim()) {
      alert('请填写驳回理由');
      return;
    }
    setRejecting(true);
    try {
      await api(`/api/admin/agents/${rejectTarget.id}/reject`, {
        method: 'POST',
        body: JSON.stringify({ reason: rejectReason.trim() })
      });
      setRejectTarget(null);
      setRejectReason('');
      reload();
    } catch (e) {
      alert(e instanceof Error ? e.message : '驳回失败');
    } finally {
      setRejecting(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-end gap-3">
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white"
        >
          <option value="in_review">待审核</option>
          <option value="published">已通过</option>
          <option value="offline">已下架/驳回</option>
          <option value="">全部</option>
        </select>
      </div>
      {loading && <p className="text-sm text-slate-500">加载中…</p>}
      {error && <p className="text-sm text-rose-600">{error}</p>}
      {(data || []).map((agent) => {
        let skillMeta: Record<string, unknown> = {};
        try {
          skillMeta = agent.solutionPayload ? JSON.parse(agent.solutionPayload) : {};
        } catch {
          skillMeta = {};
        }
        const skillFile =
          typeof skillMeta.skillFileName === 'string'
            ? skillMeta.skillFileName
            : `${agent.title || 'agent'}-skill.json`;
        return (
          <div key={agent.id} className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-sm font-bold">{agent.title}</div>
                <div className="text-[11px] text-slate-400 mt-0.5">
                  作者 {agent.authorName || '—'}
                  {agent.authorExpertNo ? (
                    <span className="font-mono text-slate-500"> · {agent.authorExpertNo}</span>
                  ) : null}
                  {' · '}
                  {agent.category || '未分类'}
                </div>
              </div>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                {statusLabel[agent.status] || agent.status}
              </span>
            </div>
            <p className="text-xs text-slate-600 whitespace-pre-wrap">
              {agent.desc || '暂无智能体介绍'}
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-slate-200 text-slate-700 text-xs font-bold cursor-pointer"
                onClick={() =>
                  downloadSkillPackage(skillFile, {
                    agentId: agent.id,
                    title: agent.title,
                    desc: agent.desc,
                    ...skillMeta
                  })
                }
              >
                <Download size={12} />
                下载 Skill 包
              </button>
              {agent.status === 'in_review' && (
                <>
                  <button
                    type="button"
                    className="px-3 py-1.5 rounded-xl bg-emerald-600 text-white text-xs font-bold cursor-pointer"
                    onClick={() => {
                      setPublishTarget({
                        id: agent.id,
                        title: agent.title,
                        category: agent.category
                      });
                      setPublishCategory(
                        agent.category && industryOptions.includes(agent.category)
                          ? agent.category
                          : industryOptions[0] || ''
                      );
                    }}
                  >
                    审核通过
                  </button>
                  <button
                    type="button"
                    className="px-3 py-1.5 rounded-xl bg-rose-50 text-rose-700 border border-rose-200 text-xs font-bold cursor-pointer"
                    onClick={() => {
                      setRejectTarget({ id: agent.id, title: agent.title });
                      setRejectReason('');
                    }}
                  >
                    驳回
                  </button>
                </>
              )}
            </div>
          </div>
        );
      })}
      {data?.length === 0 && <p className="text-sm text-slate-400">当前筛选下没有通用智能体。</p>}

      {publishTarget && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/50 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => !publishing && setPublishTarget(null)}
        >
          <div
            className="w-full max-w-md bg-white rounded-2xl border border-slate-200 shadow-2xl p-5 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div>
              <h2 className="text-sm font-black text-slate-900">审核通过并发布</h2>
              <p className="text-xs text-slate-500 mt-1">
                「{publishTarget.title}」通过前须选择行业分类。
              </p>
            </div>
            <select
              value={publishCategory}
              onChange={(e) => setPublishCategory(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white"
            >
              {industryOptions.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                disabled={publishing}
                onClick={() => setPublishTarget(null)}
                className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-bold cursor-pointer"
              >
                取消
              </button>
              <button
                type="button"
                disabled={publishing}
                onClick={confirmPublish}
                className="px-3 py-1.5 rounded-xl bg-emerald-600 text-white text-xs font-bold cursor-pointer"
              >
                {publishing ? '提交中…' : '确认通过'}
              </button>
            </div>
          </div>
        </div>
      )}

      {rejectTarget && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/50 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => !rejecting && setRejectTarget(null)}
        >
          <div
            className="w-full max-w-md bg-white rounded-2xl border border-slate-200 shadow-2xl p-5 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div>
              <h2 className="text-sm font-black text-slate-900">驳回通用智能体</h2>
              <p className="text-xs text-slate-500 mt-1">
                「{rejectTarget.title}」驳回理由将通过消息提醒通知创作者。
              </p>
            </div>
            <textarea
              rows={4}
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="请填写驳回理由（必填）"
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs resize-none focus:outline-none focus:ring-2 focus:ring-rose-500/30"
              autoFocus
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                disabled={rejecting}
                onClick={() => {
                  setRejectTarget(null);
                  setRejectReason('');
                }}
                className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-bold cursor-pointer"
              >
                取消
              </button>
              <button
                type="button"
                disabled={rejecting}
                onClick={confirmReject}
                className="px-3 py-1.5 rounded-xl bg-rose-600 text-white text-xs font-bold cursor-pointer disabled:opacity-60"
              >
                {rejecting ? '提交中…' : '确认驳回'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const DeliveriesPage = () => {
  const [filter, setFilter] = useState('pending_ops_review');
  const [rejectTarget, setRejectTarget] = useState<{
    id: string;
    title: string;
    version: string;
  } | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [rejecting, setRejecting] = useState(false);
  const { data, error, loading, reload } = useAdminQuery<Array<{
    id: string;
    version: string;
    status: string;
    changelog: string;
    hermesPassed: boolean;
    hermesReport: { issues?: string[]; score?: number };
    completedItems: string[];
    skillPayload: {
      skillFileName?: string;
      agentTitle?: string;
      agentDesc?: string;
      [key: string]: unknown;
    };
    submittedAt?: string;
    rejectReason?: string;
    order: {
      id: string;
      orderNo: string;
      title: string;
      baseAgentTitle: string;
      baseAgentVersion: string;
      customizationSpec: Record<string, unknown>;
      buyer?: { name: string; email: string };
      creator?: { name: string; email: string };
    };
    instance: { id: string; title: string };
  }>>(`/api/admin/delivery-versions?status=${filter}`, filter);

  const confirmReject = async () => {
    if (!rejectTarget) return;
    if (!rejectReason.trim()) {
      alert('请填写驳回理由');
      return;
    }
    setRejecting(true);
    try {
      await api(`/api/admin/delivery-versions/${rejectTarget.id}/reject`, {
        method: 'POST',
        body: JSON.stringify({ reason: rejectReason.trim() })
      });
      setRejectTarget(null);
      setRejectReason('');
      reload();
    } catch (e) {
      alert(e instanceof Error ? e.message : '驳回失败');
    } finally {
      setRejecting(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-slate-500">
          审核客户专属实例的交付版本；通过后才会推送给下单用户
        </p>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white"
        >
          <option value="pending_ops_review">待审核</option>
          <option value="ops_rejected">已驳回</option>
          <option value="published_to_customer">已推送</option>
          <option value="validation_failed">校验失败</option>
          <option value="">全部</option>
        </select>
      </div>
      {loading && <p className="text-sm text-slate-500">加载中…</p>}
      {error && <p className="text-sm text-rose-600">{error}</p>}
      <div className="space-y-3">
        {(data || []).map((item) => {
          const agentDesc =
            (typeof item.skillPayload?.agentDesc === 'string' && item.skillPayload.agentDesc.trim()) ||
            '暂无智能体介绍';
          const skillFile = item.skillPayload?.skillFileName || `${item.version || 'skill'}.zip`;
          const agentTitle = item.skillPayload?.agentTitle || item.instance.title;
          return (
          <div key={item.id} className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-sm font-bold">
                  {agentTitle}
                  <span className="ml-2 text-xs font-mono text-slate-500">{item.version}</span>
                </div>
                <div className="text-xs text-slate-500 mt-0.5">
                  {item.order.orderNo} · 基于 {item.order.baseAgentTitle} {item.order.baseAgentVersion}
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5">
                  客户 {item.order.buyer?.name || '—'} · 创作者 {item.order.creator?.name || '—'}
                </div>
              </div>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                {statusLabel[item.status] || item.status}
              </span>
            </div>
            <p className="text-xs text-slate-600 whitespace-pre-wrap">{agentDesc}</p>
            {item.rejectReason && (
              <p className="text-xs text-rose-600">驳回理由：{item.rejectReason}</p>
            )}
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-slate-200 text-slate-700 text-xs font-bold cursor-pointer"
                onClick={() =>
                  downloadSkillPackage(skillFile, {
                    deliveryId: item.id,
                    version: item.version,
                    ...(item.skillPayload || {})
                  })
                }
              >
                <Download size={12} />
                下载 Skill 包
              </button>
              {item.status === 'pending_ops_review' && (
                <>
                  <button
                    type="button"
                    className="px-3 py-1.5 rounded-xl bg-emerald-600 text-white text-xs font-bold cursor-pointer"
                    onClick={async () => {
                      await api(`/api/admin/delivery-versions/${item.id}/approve`, {
                        method: 'POST',
                        body: '{}'
                      });
                      reload();
                    }}
                  >
                    审核通过并推送客户
                  </button>
                  <button
                    type="button"
                    className="px-3 py-1.5 rounded-xl bg-rose-50 text-rose-700 border border-rose-200 text-xs font-bold cursor-pointer"
                    onClick={() => {
                      setRejectTarget({
                        id: item.id,
                        title: agentTitle,
                        version: item.version
                      });
                      setRejectReason('');
                    }}
                  >
                    驳回
                  </button>
                </>
              )}
            </div>
            {item.submittedAt && (
              <div className="text-[10px] text-slate-400">{new Date(item.submittedAt).toLocaleString()}</div>
            )}
          </div>
          );
        })}
        {data?.length === 0 && <p className="text-sm text-slate-400">当前筛选下没有交付版本。</p>}
      </div>

      {rejectTarget && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/50 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => !rejecting && setRejectTarget(null)}
        >
          <div
            className="w-full max-w-md bg-white rounded-2xl border border-slate-200 shadow-2xl p-5 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div>
              <h2 className="text-sm font-black text-slate-900">驳回交付智能体</h2>
              <p className="text-xs text-slate-500 mt-1">
                「{rejectTarget.title}」{rejectTarget.version} 驳回理由将通过消息提醒通知创作者与客户。
              </p>
            </div>
            <textarea
              rows={4}
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="请填写驳回理由（必填）"
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs resize-none focus:outline-none focus:ring-2 focus:ring-rose-500/30"
              autoFocus
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                disabled={rejecting}
                onClick={() => {
                  setRejectTarget(null);
                  setRejectReason('');
                }}
                className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-bold cursor-pointer"
              >
                取消
              </button>
              <button
                type="button"
                disabled={rejecting}
                onClick={confirmReject}
                className="px-3 py-1.5 rounded-xl bg-rose-600 text-white text-xs font-bold cursor-pointer disabled:opacity-60"
              >
                {rejecting ? '提交中…' : '确认驳回'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const ExpertProfileBlock = ({
  heading,
  name,
  title,
  bio,
  domainTags,
  highlight
}: {
  heading?: string;
  name: string;
  title?: string;
  bio: string;
  domainTags: string[];
  highlight?: boolean;
}) => (
  <div
    className={`space-y-3 rounded-xl border p-4 ${
      highlight ? 'border-amber-200 bg-amber-50/50' : 'border-slate-200 bg-white'
    }`}
  >
    {heading && (
      <div
        className={`text-[11px] font-bold ${
          highlight ? 'text-amber-700' : 'text-slate-500'
        }`}
      >
        {heading}
      </div>
    )}
    <div className="space-y-1">
      <div className="text-[11px] text-slate-400">专家名称</div>
      <div className="text-sm font-bold text-slate-900">{name || '—'}</div>
    </div>
    <div className="space-y-1">
      <div className="text-[11px] text-slate-400">专家头衔</div>
      <div className="text-xs text-slate-700">{title?.trim() || '—'}</div>
    </div>
    <div className="space-y-1">
      <div className="text-[11px] text-slate-400">专家简介</div>
      <p className="text-xs text-slate-700 whitespace-pre-wrap leading-relaxed">
        {bio?.trim() || '暂无简介'}
      </p>
    </div>
    <div className="space-y-1.5">
      <div className="text-[11px] text-slate-400">专家标签</div>
      <div className="flex flex-wrap gap-1">
        {domainTags.length > 0 ? (
          domainTags.map((tag) => (
            <span
              key={tag}
              className="text-[10px] px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-100"
            >
              {tag}
            </span>
          ))
        ) : (
          <span className="text-slate-400 text-xs">—</span>
        )}
      </div>
    </div>
  </div>
);

const ExpertsPage = ({
  onOpenPublishedAgents
}: {
  onOpenPublishedAgents?: (authorId: string, label: string) => void;
}) => {
  const [actionTarget, setActionTarget] = useState<{
    certId: string;
    name: string;
    mode: 'freeze' | 'unfreeze';
  } | null>(null);
  const [actionReason, setActionReason] = useState('');
  const [actionBusy, setActionBusy] = useState(false);
  const [previewImage, setPreviewImage] = useState<{ url: string; label: string } | null>(null);
  const [phoneQuery, setPhoneQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [detailTarget, setDetailTarget] = useState<{
    name: string;
    title: string;
    bio: string;
    domainTags: string[];
    cases: AdminCaseItem[];
    realName?: string;
    idCardMasked?: string;
    idCardFrontUrl?: string;
    idCardBackUrl?: string;
    alipayBound?: boolean;
    alipayAccount?: string;
    phone?: string;
  } | null>(null);
  const { data, error, loading, reload } = useAdminQuery<Array<{
    id: string;
    expertNo?: string;
    name: string;
    title: string;
    bio?: string;
    domainTags?: string[];
    expertLevel: number;
    listed: boolean;
    featured: boolean;
    paused: boolean;
    status: string;
    phone?: string;
    publishedAgentsCount?: number;
    followersCount?: number;
    appliedAt?: string;
    cases?: AdminCaseItem[];
    realName?: string;
    idCardMasked?: string;
    idCardFrontUrl?: string;
    idCardBackUrl?: string;
    alipayBound?: boolean;
    alipayAccount?: string;
    certification: null | {
      id: string;
      level: number;
      status: string;
      freezeReason?: string;
    };
  }>>('/api/admin/experts');

  const rows = useMemo(() => {
    const list = data || [];
    const phoneQ = phoneQuery.trim();
    return list.filter((expert) => {
      if (phoneQ && !(expert.phone || '').includes(phoneQ)) return false;
      if (statusFilter) {
        const certStatus = expert.certification?.status || '';
        if (statusFilter === 'none') {
          if (expert.certification) return false;
        } else if (certStatus !== statusFilter) {
          return false;
        }
      }
      return true;
    });
  }, [data, phoneQuery, statusFilter]);

  const total = rows.length;

  const confirmAction = async () => {
    if (!actionTarget) return;
    if (!actionReason.trim()) {
      alert(actionTarget.mode === 'freeze' ? '请填写冻结原因' : '请填写解冻原因');
      return;
    }
    setActionBusy(true);
    try {
      const path =
        actionTarget.mode === 'freeze'
          ? `/api/admin/expert-certifications/${actionTarget.certId}/freeze`
          : `/api/admin/expert-certifications/${actionTarget.certId}/unfreeze`;
      await api(path, {
        method: 'POST',
        body: JSON.stringify({ reason: actionReason.trim() })
      });
      setActionTarget(null);
      setActionReason('');
      reload();
    } catch (e) {
      alert(e instanceof Error ? e.message : '操作失败');
    } finally {
      setActionBusy(false);
    }
  };

  const inputClass = 'px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white min-w-0';

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-black">专家管理</h1>
      <div className="flex flex-wrap items-end gap-2">
        <label className="space-y-1">
          <span className="block text-[11px] text-slate-500">手机号</span>
          <input
            type="text"
            value={phoneQuery}
            onChange={(e) => setPhoneQuery(e.target.value)}
            placeholder="专家手机号"
            className={`${inputClass} w-40`}
          />
        </label>
        <label className="space-y-1">
          <span className="block text-[11px] text-slate-500">认证状态</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className={inputClass}
          >
            <option value="">全部</option>
            <option value="active">已生效</option>
            <option value="frozen">已冻结</option>
            <option value="none">无认证记录</option>
          </select>
        </label>
      </div>
      {loading && <p className="text-sm text-slate-500">加载中…</p>}
      {error && <p className="text-sm text-rose-600">{error}</p>}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <table className="w-full text-xs">
          <thead className="bg-slate-50 text-slate-500">
            <tr>
              <th className="text-left p-3 w-14">序号</th>
              <th className="text-left p-3">专家</th>
              <th className="text-left p-3 whitespace-nowrap">手机号</th>
              <th className="text-left p-3 whitespace-nowrap">专家详情</th>
              <th className="text-left p-3">认证状态</th>
              <th className="text-left p-3 whitespace-nowrap">已上架智能体</th>
              <th className="text-left p-3 whitespace-nowrap">关注人数</th>
              <th className="text-left p-3 whitespace-nowrap">申请时间</th>
              <th className="text-right p-3">操作</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((expert, index) => {
              const cert = expert.certification;
              const frozen = cert?.status === 'frozen';
              const publishedCount = expert.publishedAgentsCount || 0;
              return (
                <tr key={expert.id} className="border-t border-slate-100 align-top">
                  <td className="p-3 text-slate-500 tabular-nums">{total - index}</td>
                  <td className="p-3">
                    <div className="font-bold text-slate-900">{expert.name}</div>
                    {expert.expertNo && (
                      <div className="text-[11px] font-mono text-slate-500 mt-0.5">{expert.expertNo}</div>
                    )}
                  </td>
                  <td className="p-3 font-mono text-slate-700 whitespace-nowrap">
                    {expert.phone || '—'}
                  </td>
                  <td className="p-3 whitespace-nowrap">
                    <button
                      type="button"
                      onClick={() =>
                        setDetailTarget({
                          name: expert.name,
                          title: expert.title || '',
                          bio: expert.bio || '',
                          domainTags: expert.domainTags || [],
                          cases: expert.cases || [],
                          realName: expert.realName || '',
                          idCardMasked: expert.idCardMasked || '',
                          idCardFrontUrl: expert.idCardFrontUrl || '',
                          idCardBackUrl: expert.idCardBackUrl || '',
                          alipayBound: expert.alipayBound || false,
                          alipayAccount: expert.alipayAccount || '',
                          phone: expert.phone || ''
                        })
                      }
                      className="font-bold cursor-pointer text-blue-600 hover:text-blue-700"
                    >
                      查看详情
                    </button>
                  </td>
                  <td className="p-3 whitespace-nowrap">
                    {cert ? (
                      <div>
                        <span
                          className={
                            frozen
                              ? 'text-rose-600 font-bold'
                              : cert.status === 'active'
                                ? 'text-emerald-700 font-bold'
                                : 'text-slate-600 font-bold'
                          }
                        >
                          {statusLabel[cert.status] || cert.status}
                        </span>
                        {frozen && cert.freezeReason && (
                          <div className="text-[10px] text-rose-500 mt-0.5 max-w-[160px] whitespace-normal">
                            {cert.freezeReason}
                          </div>
                        )}
                      </div>
                    ) : (
                      <span className="text-slate-400">无认证记录</span>
                    )}
                  </td>
                  <td className="p-3 whitespace-nowrap">
                    {publishedCount > 0 ? (
                      <button
                        type="button"
                        className="font-bold text-blue-600 cursor-pointer hover:underline tabular-nums"
                        onClick={() =>
                          onOpenPublishedAgents?.(
                            expert.id,
                            `${expert.name}${expert.expertNo ? ` · ${expert.expertNo}` : ''}`
                          )
                        }
                      >
                        {publishedCount}
                      </button>
                    ) : (
                      <span className="text-slate-400 tabular-nums">0</span>
                    )}
                  </td>
                  <td className="p-3 whitespace-nowrap tabular-nums text-slate-700">
                    {expert.followersCount ?? 0}
                  </td>
                  <td className="p-3 text-slate-500 whitespace-nowrap">
                    {expert.appliedAt
                      ? new Date(expert.appliedAt).toLocaleString('zh-CN')
                      : '—'}
                  </td>
                  <td className="p-3 text-right space-x-2 whitespace-nowrap">
                    {cert && !frozen && (
                      <button
                        type="button"
                        className="font-bold text-rose-600 cursor-pointer"
                        onClick={() => {
                          setActionTarget({
                            certId: cert.id,
                            name: expert.name,
                            mode: 'freeze'
                          });
                          setActionReason('');
                        }}
                      >
                        冻结
                      </button>
                    )}
                    {cert && frozen && (
                      <button
                        type="button"
                        className="font-bold text-emerald-700 cursor-pointer"
                        onClick={() => {
                          setActionTarget({
                            certId: cert.id,
                            name: expert.name,
                            mode: 'unfreeze'
                          });
                          setActionReason('复核通过，恢复认证');
                        }}
                      >
                        解冻
                      </button>
                    )}
                    <button
                      type="button"
                      className="font-bold cursor-pointer text-slate-600"
                      onClick={async () => {
                        await api(`/api/admin/experts/${expert.id}`, {
                          method: 'PATCH',
                          body: JSON.stringify({ featured: !expert.featured })
                        });
                        reload();
                      }}
                    >
                      {expert.featured ? '取消推荐' : '设为推荐'}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {!loading && rows.length === 0 && (
          <p className="p-6 text-sm text-slate-400 text-center">暂无匹配的专家</p>
        )}
      </div>

      {detailTarget && (
        <div
          className="fixed inset-0 z-50 bg-black/40 flex justify-end animate-in fade-in duration-200"
          onClick={() => setDetailTarget(null)}
        >
          <div
            className="w-full max-w-3xl h-full bg-white border-l border-slate-200 shadow-2xl overflow-hidden flex flex-col animate-in slide-in-from-right duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-4 border-b border-slate-100 flex items-start justify-between gap-3 shrink-0">
              <div className="min-w-0">
                <h3 className="text-base font-black text-slate-900 truncate">专家详情</h3>
                <p className="text-xs text-slate-400 mt-0.5 truncate">{detailTarget.name}</p>
              </div>
              <button
                type="button"
                onClick={() => setDetailTarget(null)}
                className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-5">
              {(detailTarget.realName ||
                detailTarget.idCardMasked ||
                detailTarget.idCardFrontUrl ||
                detailTarget.idCardBackUrl) && (
                <div className="space-y-3 rounded-xl border border-slate-200 p-4">
                  {(detailTarget.realName || detailTarget.idCardMasked) && (
                    <div className="text-xs text-slate-600 space-y-0.5">
                      {detailTarget.realName && (
                        <p>
                          <span className="text-slate-400">真实姓名：</span>
                          {detailTarget.realName}
                        </p>
                      )}
                      {detailTarget.idCardMasked && (
                        <p>
                          <span className="text-slate-400">身份证号：</span>
                          <span className="font-mono">{detailTarget.idCardMasked}</span>
                        </p>
                      )}
                    </div>
                  )}
                  {(detailTarget.idCardFrontUrl || detailTarget.idCardBackUrl) && (
                    <div className="space-y-1.5">
                      <p className="text-[11px] text-slate-400">身份证照片</p>
                      <div className="flex flex-wrap gap-3">
                        {detailTarget.idCardFrontUrl && (
                          <button
                            type="button"
                            onClick={() =>
                              setPreviewImage({
                                url: detailTarget.idCardFrontUrl!,
                                label: '身份证正面'
                              })
                            }
                            className="group text-left cursor-pointer"
                          >
                            <div className="w-44 aspect-[1.58/1] rounded-xl border border-slate-200 overflow-hidden bg-slate-50 shadow-2xs">
                              <img
                                src={detailTarget.idCardFrontUrl}
                                alt="身份证正面"
                                className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform"
                              />
                            </div>
                            <div className="mt-1 text-[11px] text-slate-500">
                              正面（人像面）· 点击放大
                            </div>
                          </button>
                        )}
                        {detailTarget.idCardBackUrl && (
                          <button
                            type="button"
                            onClick={() =>
                              setPreviewImage({
                                url: detailTarget.idCardBackUrl!,
                                label: '身份证反面'
                              })
                            }
                            className="group text-left cursor-pointer"
                          >
                            <div className="w-44 aspect-[1.58/1] rounded-xl border border-slate-200 overflow-hidden bg-slate-50 shadow-2xs">
                              <img
                                src={detailTarget.idCardBackUrl}
                                alt="身份证反面"
                                className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform"
                              />
                            </div>
                            <div className="mt-1 text-[11px] text-slate-500">
                              反面（国徽面）· 点击放大
                            </div>
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="rounded-xl border border-slate-200 p-4 text-xs space-y-1">
                <div className="text-[11px] font-bold text-slate-500">联系与收款</div>
                <p className="text-slate-700">
                  <span className="text-slate-400">手机号：</span>
                  <span className="font-mono">{detailTarget.phone || '—'}</span>
                </p>
                <p className="text-slate-700">
                  <span className="text-slate-400">支付宝：</span>
                  {detailTarget.alipayBound && detailTarget.alipayAccount
                    ? detailTarget.alipayAccount
                    : '未绑定'}
                </p>
              </div>

              <ExpertProfileBlock
                name={detailTarget.name}
                title={detailTarget.title}
                bio={detailTarget.bio}
                domainTags={detailTarget.domainTags}
              />

              <div className="space-y-3">
                <div className="text-[11px] font-bold text-slate-500">
                  落地案例 ({detailTarget.cases.length})
                </div>
                {detailTarget.cases.length === 0 && (
                  <p className="text-xs text-slate-400 text-center py-6 rounded-xl border border-dashed border-slate-200">
                    暂无上传案例
                  </p>
                )}
                {detailTarget.cases.map((c, idx) => {
                  const imgs = getCaseStudyImages(c);
                  return (
                    <div
                      key={c.id || `case-${idx}`}
                      className="rounded-xl border border-slate-200 p-4 space-y-3 bg-slate-50/60"
                    >
                      {imgs.length > 0 && (
                        <div className="flex gap-1.5 overflow-x-auto pb-0.5">
                          {imgs.map((url, imgIdx) => (
                            <button
                              key={`${c.id || idx}-img-${imgIdx}`}
                              type="button"
                              onClick={() =>
                                setPreviewImage({
                                  url,
                                  label: `${c.title || '案例'} · 图 ${imgIdx + 1}`
                                })
                              }
                              className="w-28 aspect-[16/10] rounded-lg overflow-hidden border border-slate-200 bg-slate-100 shrink-0 cursor-pointer"
                            >
                              <img
                                src={url}
                                alt={`${c.title || '案例'} ${imgIdx + 1}`}
                                referrerPolicy="no-referrer"
                                className="w-full h-full object-cover"
                              />
                            </button>
                          ))}
                        </div>
                      )}
                      <div className="space-y-1.5">
                        <div className="flex flex-wrap items-center gap-2">
                          {c.clientIndustry && (
                            <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-800 text-[10px] font-bold">
                              {c.clientIndustry}
                            </span>
                          )}
                          <div className="text-sm font-bold text-slate-900">
                            {c.title || '未命名案例'}
                          </div>
                        </div>
                        {c.clientName && (
                          <div className="text-[11px] text-slate-500">服务对象：{c.clientName}</div>
                        )}
                        {c.solution && (
                          <p className="text-xs text-slate-700 leading-relaxed">
                            <span className="text-blue-800 font-semibold">方案：</span>
                            {c.solution}
                          </p>
                        )}
                        {(c.roiMetrics || []).length > 0 && (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-1">
                            {c.roiMetrics!.slice(0, 4).map((m, mIdx) => (
                              <div
                                key={mIdx}
                                className="rounded-lg border border-emerald-100 bg-white px-2.5 py-2"
                              >
                                <div className="text-sm font-extrabold text-emerald-700">
                                  {m.value || '—'}
                                </div>
                                <div className="text-[10px] text-slate-500 mt-0.5">
                                  {m.label || '说明'}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {previewImage && (
        <div
          className="fixed inset-0 z-[60] bg-black/60 flex items-center justify-center p-6"
          onClick={() => setPreviewImage(null)}
        >
          <div
            className="bg-white rounded-2xl border border-slate-200 p-4 max-w-3xl w-full space-y-3 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-sm font-bold text-slate-900">{previewImage.label}</h3>
              <button
                type="button"
                onClick={() => setPreviewImage(null)}
                className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>
            <img
              src={previewImage.url}
              alt={previewImage.label}
              className="w-full rounded-xl border border-slate-100 bg-slate-50"
            />
          </div>
        </div>
      )}

      {actionTarget && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/50 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => !actionBusy && setActionTarget(null)}
        >
          <div
            className="w-full max-w-md bg-white rounded-2xl border border-slate-200 shadow-2xl p-5 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div>
              <h2 className="text-sm font-black text-slate-900">
                {actionTarget.mode === 'freeze' ? '冻结专家' : '解冻专家'}
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                {actionTarget.mode === 'freeze'
                  ? `冻结「${actionTarget.name}」后，其认证状态变为已冻结，须填写原因。`
                  : `解冻「${actionTarget.name}」将恢复认证，请确认原因。`}
              </p>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-800">
                {actionTarget.mode === 'freeze' ? '冻结原因' : '解冻原因'}
              </label>
              <textarea
                value={actionReason}
                onChange={(e) => setActionReason(e.target.value)}
                rows={4}
                placeholder={
                  actionTarget.mode === 'freeze'
                    ? '请填写冻结原因（必填）'
                    : '请填写解冻原因'
                }
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:bg-white focus:border-blue-500 resize-none"
              />
            </div>
            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                disabled={actionBusy}
                onClick={() => setActionTarget(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold cursor-pointer"
              >
                取消
              </button>
              <button
                type="button"
                disabled={actionBusy || !actionReason.trim()}
                onClick={confirmAction}
                className={`px-4 py-2 rounded-xl text-white text-xs font-bold cursor-pointer disabled:opacity-50 ${
                  actionTarget.mode === 'freeze'
                    ? 'bg-rose-600 hover:bg-rose-700'
                    : 'bg-emerald-600 hover:bg-emerald-700'
                }`}
              >
                {actionBusy
                  ? '提交中…'
                  : actionTarget.mode === 'freeze'
                    ? '确认冻结'
                    : '确认解冻'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const LeadsPage = () => {
  const [filter, setFilter] = useState<'open' | 'converted' | 'closed' | ''>('');
  const { data, error, loading, reload } = useAdminQuery<
    Array<{
      id: string;
      createdAt: string;
      clientName: string;
      clientCompany: string;
      contactPhone: string;
      user?: { id: string; name: string; email: string } | null;
      expertName: string | null;
      expertTitle: string | null;
      agentId: string;
      agentTitle: string;
      requirement: string;
      funnelStatus: 'open' | 'converted' | 'closed';
      order?: {
        id: string;
        orderNo: string;
        status: string;
        title: string;
        hasInstance: boolean;
      } | null;
    }>
  >(`/api/admin/leads${filter ? `?status=${filter}` : ''}`, filter);

  const total = data?.length || 0;
  const funnelLabel: Record<string, string> = {
    open: '咨询中',
    converted: '已转化',
    closed: '已关闭'
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-black">咨询线索</h1>
          <p className="text-xs text-slate-500 mt-1">
            记录谁在什么时间向哪位 AI 专家咨询了哪个智能体，以及咨询内容
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as typeof filter)}
            className="px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white"
          >
            <option value="">全部状态</option>
            <option value="open">咨询中</option>
            <option value="converted">已转化</option>
            <option value="closed">已关闭</option>
          </select>
          <button
            type="button"
            onClick={reload}
            className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold cursor-pointer"
          >
            刷新
          </button>
        </div>
      </div>
      {loading && <p className="text-sm text-slate-500">加载中…</p>}
      {error && <p className="text-sm text-rose-600">{error}</p>}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <table className="w-full text-xs">
          <thead className="bg-slate-50 text-slate-500">
            <tr>
              <th className="text-left p-3 w-14">序号</th>
              <th className="text-left p-3 whitespace-nowrap">咨询时间</th>
              <th className="text-left p-3">咨询人</th>
              <th className="text-left p-3">AI 专家</th>
              <th className="text-left p-3">咨询智能体</th>
              <th className="text-left p-3 min-w-[220px]">咨询内容</th>
              <th className="text-left p-3 whitespace-nowrap">订单编号</th>
              <th className="text-left p-3">状态</th>
            </tr>
          </thead>
          <tbody>
            {(data || []).map((lead, index) => {
              const agentTitle = (lead.agentTitle || '').trim();
              const agentId = (lead.agentId || '').trim();
              const isDirectExpertConsult =
                !agentId ||
                !agentTitle ||
                agentTitle === '直接向专家咨询' ||
                agentTitle === '未指定智能体';
              const showOrderNo =
                lead.funnelStatus === 'converted' && Boolean(lead.order?.orderNo);
              return (
                <tr key={lead.id} className="border-t border-slate-100 align-top">
                  <td className="p-3 text-slate-500 tabular-nums">{total - index}</td>
                  <td className="p-3 text-slate-500 whitespace-nowrap">
                    {lead.createdAt ? new Date(lead.createdAt).toLocaleString('zh-CN') : '—'}
                  </td>
                  <td className="p-3">
                    <div className="font-bold text-slate-900">
                      {lead.user?.name || lead.clientName || '—'}
                    </div>
                    <div className="text-slate-400 mt-0.5">
                      {lead.user?.email || lead.clientCompany || lead.contactPhone || '—'}
                    </div>
                  </td>
                  <td className="p-3">
                    <div className="font-bold text-slate-900">{lead.expertName || '—'}</div>
                    {lead.expertTitle && (
                      <div className="text-slate-400 mt-0.5">{lead.expertTitle}</div>
                    )}
                  </td>
                  <td className="p-3">
                    {isDirectExpertConsult ? (
                      <span className="text-slate-400">—</span>
                    ) : (
                      <>
                        <div className="font-bold text-slate-900">{agentTitle}</div>
                        {agentId && (
                          <code className="text-[11px] font-mono text-slate-500 break-all">
                            {agentId}
                          </code>
                        )}
                      </>
                    )}
                  </td>
                  <td className="p-3 max-w-sm">
                    <p className="text-slate-600 whitespace-pre-wrap leading-relaxed">
                      {lead.requirement || '暂无咨询内容'}
                    </p>
                  </td>
                  <td className="p-3 whitespace-nowrap">
                    {showOrderNo ? (
                      <code className="text-[11px] font-mono text-slate-700">
                        {lead.order!.orderNo}
                      </code>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </td>
                  <td className="p-3 whitespace-nowrap">
                    <span
                      className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold ring-1 ring-inset ${
                        lead.funnelStatus === 'converted'
                          ? 'bg-emerald-50 text-emerald-700 ring-emerald-200'
                          : lead.funnelStatus === 'closed'
                            ? 'bg-slate-50 text-slate-600 ring-slate-200'
                            : 'bg-amber-50 text-amber-700 ring-amber-200'
                      }`}
                    >
                      {funnelLabel[lead.funnelStatus] || lead.funnelStatus}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {data?.length === 0 && (
          <p className="p-6 text-sm text-slate-400 text-center">
            暂无线索。前台向专家发起咨询后会出现在这里。
          </p>
        )}
      </div>
    </div>
  );
};

const UsersPage = () => {
  const { data, error, loading } = useAdminQuery<Array<{ id: string; email: string; name: string; role: string }>>(
    '/api/admin/users'
  );
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-black">管理员账号</h1>
      {loading && <p className="text-sm text-slate-500">加载中…</p>}
      {error && <p className="text-sm text-rose-600">{error}</p>}
      <div className="bg-white rounded-2xl border border-slate-200 divide-y divide-slate-100">
        {(data || []).map((user) => (
          <div key={user.id} className="p-4 flex justify-between text-sm">
            <div>
              <div className="font-bold">{user.name}</div>
              <div className="text-xs text-slate-500">{user.email}</div>
            </div>
            <span className="text-xs font-bold">{user.role === 'super_admin' ? '超级管理员' : '运营'}</span>
          </div>
        ))}
      </div>
    </div>
  );
};
