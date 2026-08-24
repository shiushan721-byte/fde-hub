import React, { useEffect, useState } from 'react';
import {
  LayoutDashboard,
  Home,
  Bot,
  Users,
  MessageSquare,
  ScrollText,
  LogOut,
  Shield,
  Eye,
  EyeOff,
  Check,
  Loader2,
  UserPlus,
  X
} from 'lucide-react';
import { api, ApiError } from '../lib/api';

type AdminPage =
  | 'overview'
  | 'home'
  | 'agents'
  | 'experts'
  | 'applications'
  | 'deliveries'
  | 'disputes'
  | 'leads'
  | 'users'
  | 'logs';

type AdminUser = { id: string; email: string; name: string; role: string };

function isAdminRole(role: string) {
  return role === 'super_admin' || role === 'operator';
}

const nav: { key: AdminPage; label: string; icon: React.ElementType; superOnly?: boolean }[] = [
  { key: 'overview', label: '概览', icon: LayoutDashboard },
  { key: 'home', label: '首页配置', icon: Home },
  { key: 'agents', label: '智能体', icon: Bot },
  { key: 'experts', label: '专家', icon: Users },
  { key: 'applications', label: '专家申请', icon: UserPlus },
  { key: 'deliveries', label: '交付审核', icon: Check },
  { key: 'disputes', label: '争议处理', icon: MessageSquare },
  { key: 'leads', label: '咨询线索', icon: MessageSquare },
  { key: 'users', label: '管理员', icon: Shield, superOnly: true },
  { key: 'logs', label: '操作日志', icon: ScrollText }
];

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
  active: '有效',
  frozen: '已冻结',
  pending_ops_review: '待运营审核',
  ops_rejected: '运营已驳回',
  published_to_customer: '已推送客户',
  validation_failed: '校验失败'
};

export const AdminApp: React.FC<{ onExit: () => void }> = ({ onExit }) => {
  const [me, setMe] = useState<AdminUser | null>(null);
  const [checking, setChecking] = useState(true);
  const [page, setPage] = useState<AdminPage>('overview');
  const [nonAdminHint, setNonAdminHint] = useState('');

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

  const visibleNav = nav.filter((item) => !item.superOnly || me.role === 'super_admin');

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 flex">
      <aside className="w-56 bg-slate-950 text-slate-100 flex flex-col shrink-0">
        <div className="px-4 py-5 border-b border-white/10">
          <div className="text-xs font-black tracking-wide">Hellome 后台</div>
          <div className="text-[11px] text-slate-400 mt-1">{me.name} · {me.role === 'super_admin' ? '超级管理员' : '运营'}</div>
        </div>
        <nav className="flex-1 p-2 space-y-1">
          {visibleNav.map((item) => {
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
        {page === 'overview' && <OverviewPage />}
        {page === 'home' && <HomePage />}
        {page === 'agents' && <AgentsPage />}
        {page === 'experts' && <ExpertsPage />}
        {page === 'applications' && <ApplicationsPage />}
        {page === 'deliveries' && <DeliveriesPage />}
        {page === 'disputes' && <DisputesPage />}
        {page === 'leads' && <LeadsPage />}
        {page === 'users' && me.role === 'super_admin' && <UsersPage />}
        {page === 'logs' && <LogsPage />}
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

const OverviewPage = () => {
  const { data, error, loading } = useAdminQuery<{
    metrics: Record<string, number>;
    recentLeads: Array<{ id: string; clientName: string; agentTitle: string; status: string }>;
    recentLogs: Array<{ id: string; action: string; targetType: string; createdAt: string; actor?: { name: string } }>;
    recentApplications?: Array<{ id: string; applicantName: string; type: string; targetLevel: number; status: string }>;
  }>('/api/admin/dashboard');
  const [jobBusy, setJobBusy] = useState(false);
  const [jobResult, setJobResult] = useState('');

  if (loading) return <p className="text-sm text-slate-500">加载中…</p>;
  if (error) return <p className="text-sm text-rose-600">{error}</p>;
  if (!data) return null;

  const cards = [
    ['已发布智能体', data.metrics.publishedAgents],
    ['已下架', data.metrics.offlineAgents],
    ['待审专家申请', data.metrics.pendingApplications],
    ['公开专家', data.metrics.listedExperts],
    ['新线索', data.metrics.newLeads],
    ['后台账号', data.metrics.users]
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-black">运营概览</h1>
          <p className="text-xs text-slate-500 mt-1">定制订单定时任务默认每 5 分钟执行</p>
        </div>
        <button
          type="button"
          disabled={jobBusy}
          className="px-3 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold cursor-pointer disabled:opacity-60"
          onClick={async () => {
            setJobBusy(true);
            setJobResult('');
            try {
              const result = await api<{
                unpaidClosed: number;
                remindersSent: number;
                autoAccepted: number;
                settled: number;
              }>('/api/admin/jobs/custom-orders/run', { method: 'POST', body: '{}' });
              setJobResult(
                `超时关闭 ${result.unpaidClosed} · 提醒 ${result.remindersSent} · 自动验收 ${result.autoAccepted} · 结算 ${result.settled}`
              );
            } catch (err) {
              setJobResult(err instanceof Error ? err.message : '执行失败');
            } finally {
              setJobBusy(false);
            }
          }}
        >
          {jobBusy ? '执行中…' : '立即跑订单定时任务'}
        </button>
      </div>
      {jobResult && (
        <p className="text-xs text-slate-600 bg-white border border-slate-200 rounded-xl px-3 py-2">{jobResult}</p>
      )}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        {cards.map(([label, value]) => (
          <div key={String(label)} className="bg-white rounded-2xl border border-slate-200 p-4">
            <div className="text-xs text-slate-500">{label}</div>
            <div className="text-2xl font-black mt-1">{value}</div>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200 p-4">
          <h2 className="text-sm font-bold mb-3">待审专家申请</h2>
          <div className="space-y-2 text-xs">
            {(data.recentApplications || []).length === 0 && <p className="text-slate-400">暂无待审申请</p>}
            {(data.recentApplications || []).map((app) => (
              <div key={app.id} className="flex justify-between gap-2">
                <span>{app.applicantName} · {statusLabel[app.type] || app.type}</span>
                <span className="text-slate-500">申请{app.targetLevel}级</span>
              </div>
            ))}
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-4">
          <h2 className="text-sm font-bold mb-3">最新线索</h2>
          <div className="space-y-2 text-xs">
            {data.recentLeads.length === 0 && <p className="text-slate-400">暂无线索</p>}
            {data.recentLeads.map((lead) => (
              <div key={lead.id} className="flex justify-between gap-2">
                <span>{lead.clientName} · {lead.agentTitle}</span>
                <span className="text-slate-500">{statusLabel[lead.status] || lead.status}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

const HomePage = () => {
  const { data, error, loading, reload } = useAdminQuery<{
    banners: Array<{ id: string; slot: string; eyebrow: string; title: string; subtitle: string; ctaLabel: string; visible: boolean }>;
    categories: Array<{ id: string; name: string; visible: boolean; sortOrder: number }>;
    settings: Array<{ key: string; value: string }>;
  }>('/api/admin/home');

  if (loading) return <p className="text-sm text-slate-500">加载中…</p>;
  if (error) return <p className="text-sm text-rose-600">{error}</p>;
  if (!data) return null;

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-black">首页配置</h1>
      <p className="text-xs text-slate-500">修改后，前台切到「后台数据」即可看到结果，无需重新部署。</p>

      <section className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3">
        <h2 className="text-sm font-bold">文案设置</h2>
        {data.settings.filter((s) => s.key.startsWith('home.')).map((s) => (
          <label key={s.key} className="block text-xs space-y-1">
            <span className="font-bold text-slate-600">{s.key}</span>
            <input
              defaultValue={s.value}
              className="w-full px-3 py-2 rounded-xl border border-slate-200"
              onBlur={async (e) => {
                if (e.target.value === s.value) return;
                await api(`/api/admin/settings/${encodeURIComponent(s.key)}`, {
                  method: 'PATCH',
                  body: JSON.stringify({ value: e.target.value })
                });
                reload();
              }}
            />
          </label>
        ))}
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-bold">Banner</h2>
        {data.banners.map((banner) => (
          <div key={banner.id} className="bg-white rounded-2xl border border-slate-200 p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold">{banner.slot}</span>
              <button
                type="button"
                className="text-xs font-bold flex items-center gap-1 cursor-pointer"
                onClick={async () => {
                  await api(`/api/admin/home/banners/${banner.id}`, {
                    method: 'PATCH',
                    body: JSON.stringify({ visible: !banner.visible })
                  });
                  reload();
                }}
              >
                {banner.visible ? <Eye size={13} /> : <EyeOff size={13} />}
                {banner.visible ? '显示中' : '已隐藏'}
              </button>
            </div>
            <input
              defaultValue={banner.title}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm font-bold"
              onBlur={async (e) => {
                if (e.target.value === banner.title) return;
                await api(`/api/admin/home/banners/${banner.id}`, {
                  method: 'PATCH',
                  body: JSON.stringify({ title: e.target.value })
                });
                reload();
              }}
            />
            <textarea
              defaultValue={banner.subtitle}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs min-h-16"
              onBlur={async (e) => {
                if (e.target.value === banner.subtitle) return;
                await api(`/api/admin/home/banners/${banner.id}`, {
                  method: 'PATCH',
                  body: JSON.stringify({ subtitle: e.target.value })
                });
                reload();
              }}
            />
          </div>
        ))}
      </section>

      <section className="bg-white rounded-2xl border border-slate-200 p-4 space-y-2">
        <h2 className="text-sm font-bold">分类</h2>
        {data.categories.map((cat) => (
          <div key={cat.id} className="flex items-center justify-between text-xs">
            <span>{cat.name}</span>
            <button
              type="button"
              className="font-bold cursor-pointer"
              onClick={async () => {
                await api(`/api/admin/home/categories/${cat.id}`, {
                  method: 'PATCH',
                  body: JSON.stringify({ visible: !cat.visible })
                });
                reload();
              }}
            >
              {cat.visible ? '显示' : '隐藏'}
            </button>
          </div>
        ))}
      </section>
    </div>
  );
};

const AgentsPage = () => {
  const [q, setQ] = useState('');
  const [publishTarget, setPublishTarget] = useState<{
    id: string;
    title: string;
    category: string;
  } | null>(null);
  const [publishCategory, setPublishCategory] = useState('');
  const [publishing, setPublishing] = useState(false);
  const { data, error, loading, reload } = useAdminQuery<Array<{
    id: string;
    kind: string;
    title: string;
    category: string;
    authorName: string | null;
    status: string;
    showOnHome: boolean;
    featured: boolean;
  }>>(`/api/admin/agents${q ? `?q=${encodeURIComponent(q)}` : ''}`, q);
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

  const openPublishModal = (agent: { id: string; title: string; category: string }) => {
    setPublishTarget(agent);
    setPublishCategory(
      agent.category && industryOptions.includes(agent.category)
        ? agent.category
        : industryOptions[0] || ''
    );
  };

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

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-xl font-black">智能体</h1>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="搜索标题 / 作者 / 分类"
          className="px-3 py-2 rounded-xl border border-slate-200 text-xs w-64 bg-white"
        />
      </div>
      {loading && <p className="text-sm text-slate-500">加载中…</p>}
      {error && <p className="text-sm text-rose-600">{error}</p>}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <table className="w-full text-xs">
          <thead className="bg-slate-50 text-slate-500">
            <tr>
              <th className="text-left p-3">标题</th>
              <th className="text-left p-3">类型</th>
              <th className="text-left p-3">分类</th>
              <th className="text-left p-3">状态</th>
              <th className="text-left p-3">首页</th>
              <th className="text-right p-3">操作</th>
            </tr>
          </thead>
          <tbody>
            {(data || []).map((agent) => (
              <tr key={agent.id} className="border-t border-slate-100">
                <td className="p-3">
                  <div className="font-bold">{agent.title}</div>
                  <div className="text-slate-400">{agent.authorName}</div>
                </td>
                <td className="p-3">{agent.kind === 'catalog' ? '市场卡片' : '专家作品'}</td>
                <td className="p-3">{agent.category}</td>
                <td className="p-3">{statusLabel[agent.status] || agent.status}</td>
                <td className="p-3">{agent.showOnHome ? '是' : '否'}</td>
                <td className="p-3 text-right space-x-2">
                  {agent.status === 'published' ? (
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
                  ) : (
                    <button
                      type="button"
                      className="font-bold text-emerald-700 cursor-pointer"
                      onClick={() => openPublishModal(agent)}
                    >
                      审核通过
                    </button>
                  )}
                  {agent.kind === 'catalog' && (
                    <button
                      type="button"
                      className="font-bold text-slate-700 cursor-pointer"
                      onClick={async () => {
                        await api(`/api/admin/agents/${agent.id}`, {
                          method: 'PATCH',
                          body: JSON.stringify({ showOnHome: !agent.showOnHome })
                        });
                        reload();
                      }}
                    >
                      {agent.showOnHome ? '移出首页' : '上首页'}
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

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
                「{publishTarget.title}」通过前须选择行业分类，用于首页与市场归类。
              </p>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-800">行业分类</label>
              <select
                value={publishCategory}
                onChange={(e) => setPublishCategory(e.target.value)}
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:bg-white focus:border-blue-500"
              >
                <option value="">请选择行业分类</option>
                {industryOptions.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                disabled={publishing}
                onClick={() => setPublishTarget(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold cursor-pointer"
              >
                取消
              </button>
              <button
                type="button"
                disabled={publishing || !publishCategory}
                onClick={confirmPublish}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold cursor-pointer"
              >
                {publishing ? '发布中…' : '确认通过并发布'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const ApplicationsPage = () => {
  const [filter, setFilter] = useState('pending');
  const { data, error, loading, reload } = useAdminQuery<Array<{
    id: string;
    type: string;
    currentLevel: number;
    targetLevel: number;
    status: string;
    applicantName: string;
    contactPhone: string;
    expertTitle: string;
    bio: string;
    domainTags: string[];
    agentTitle?: string;
    caseDescription?: string;
    rejectReason: string;
    supplementRequest?: string;
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

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-black">专家申请审核</h1>
          <p className="text-xs text-slate-500 mt-1">
            目标等级已取消；审核通过即成为 AI 专家
          </p>
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
                  {app.expertTitle}
                  {app.user?.email ? ` · ${app.user.email}` : ''}
                </div>
              </div>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                {statusLabel[app.status] || app.status}
              </span>
            </div>
            {app.bio && <p className="text-xs text-slate-600">{app.bio}</p>}
            {app.supplementRequest && (
              <p className="text-[11px] text-amber-700 bg-amber-50 rounded-xl p-2">
                补充要求：{app.supplementRequest}
              </p>
            )}
            <div className="flex flex-wrap gap-1">
              {(app.domainTags || []).map((tag) => (
                <span key={tag} className="text-[10px] px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-100">
                  {tag}
                </span>
              ))}
            </div>
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
                  onClick={() => runAction(app.id, 'approve', {})}
                >
                  <Check size={12} />
                    通过
                </button>
                <button
                  type="button"
                  className="px-3 py-1.5 rounded-xl bg-amber-50 text-amber-800 border border-amber-200 text-xs font-bold cursor-pointer"
                  onClick={async () => {
                    const message = window.prompt('请填写需补充的资料说明');
                    if (!message) return;
                    await runAction(app.id, 'request-supplement', { message });
                  }}
                >
                  要求补充
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
    </div>
  );
};

const DisputesPage = () => {
  const { data, error, loading, reload } = useAdminQuery<
    Array<{
      id: string;
      orderNo: string;
      title: string;
      status: string;
      priceCents: number;
      disputeStatus: string;
      disputeReason: string;
      disputeOpenedAt?: string;
      buyer?: { name: string; email: string };
      creator?: { name: string; email: string };
    }>
  >('/api/admin/disputes');

  const resolve = async (
    orderId: string,
    resolution: 'continue_delivery' | 'partial_refund' | 'full_refund' | 'confirm_complete'
  ) => {
    let refundYuan: number | undefined;
    if (resolution === 'partial_refund') {
      const raw = window.prompt('部分退款金额（元）');
      if (!raw) return;
      refundYuan = Number(raw);
      if (!Number.isFinite(refundYuan) || refundYuan <= 0) {
        alert('请输入有效退款金额');
        return;
      }
    }
    const note = window.prompt('判定说明（可选）') || undefined;
    try {
      await api(`/api/admin/custom-orders/${orderId}/resolve-dispute`, {
        method: 'POST',
        body: JSON.stringify({ resolution, note, refundYuan })
      });
      reload();
    } catch (err) {
      alert(err instanceof Error ? err.message : '判定失败');
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-black">争议处理</h1>
        <p className="text-xs text-slate-500 mt-1">
          判定结果：继续交付 / 部分退款 / 全额退款 / 确认完成。争议期间资金冻结，不可自动结算。
        </p>
      </div>
      {loading && <p className="text-sm text-slate-500">加载中…</p>}
      {error && <p className="text-sm text-rose-600">{error}</p>}
      <div className="space-y-3">
        {(data || []).map((order) => (
          <div key={order.id} className="bg-white rounded-2xl border border-rose-200 p-4 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-sm font-bold">{order.title}</div>
                <div className="text-xs text-slate-500 mt-0.5">
                  {order.orderNo} · ¥{(order.priceCents / 100).toFixed(2)}
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5">
                  买家 {order.buyer?.name || '—'} · 创作者 {order.creator?.name || '—'}
                </div>
              </div>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-rose-50 text-rose-700">
                {order.disputeStatus || order.status}
              </span>
            </div>
            <p className="text-xs text-slate-700 bg-rose-50/60 border border-rose-100 rounded-xl p-3">
              {order.disputeReason || '未填写原因'}
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className="px-3 py-1.5 rounded-xl bg-indigo-600 text-white text-xs font-bold cursor-pointer"
                onClick={() => resolve(order.id, 'continue_delivery')}
              >
                继续修改
              </button>
              <button
                type="button"
                className="px-3 py-1.5 rounded-xl bg-amber-600 text-white text-xs font-bold cursor-pointer"
                onClick={() => resolve(order.id, 'partial_refund')}
              >
                部分退款
              </button>
              <button
                type="button"
                className="px-3 py-1.5 rounded-xl bg-rose-600 text-white text-xs font-bold cursor-pointer"
                onClick={() => resolve(order.id, 'full_refund')}
              >
                全额退款
              </button>
              <button
                type="button"
                className="px-3 py-1.5 rounded-xl bg-emerald-600 text-white text-xs font-bold cursor-pointer"
                onClick={() => resolve(order.id, 'confirm_complete')}
              >
                确认完成
              </button>
            </div>
          </div>
        ))}
        {data?.length === 0 && <p className="text-sm text-slate-400">暂无待处理争议。</p>}
      </div>
    </div>
  );
};

const DeliveriesPage = () => {
  const [filter, setFilter] = useState('pending_ops_review');
  const { data, error, loading, reload } = useAdminQuery<Array<{
    id: string;
    version: string;
    status: string;
    changelog: string;
    hermesPassed: boolean;
    hermesReport: { issues?: string[]; score?: number };
    completedItems: string[];
    submittedAt?: string;
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

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-black">交付版本审核</h1>
          <p className="text-xs text-slate-500 mt-1">
            审核的是客户专属实例的具体交付版本；通过后才会推送给下单用户
          </p>
        </div>
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
        {(data || []).map((item) => (
          <div key={item.id} className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-sm font-bold">
                  {item.instance.title}
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
            <p className="text-xs text-slate-600 whitespace-pre-wrap">{item.changelog}</p>
            <div className="text-[11px] text-slate-500 bg-slate-50 rounded-xl p-2">
              Hermes {item.hermesPassed ? '通过' : '未通过'}
              {item.hermesReport?.score != null ? ` · 评分 ${item.hermesReport.score}` : ''}
              {(item.hermesReport?.issues || []).length > 0
                ? ` · ${item.hermesReport.issues!.join('；')}`
                : ''}
            </div>
            {item.status === 'pending_ops_review' && (
              <div className="flex items-center gap-2">
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
                  onClick={async () => {
                    const reason = window.prompt('请填写驳回原因');
                    if (!reason) return;
                    await api(`/api/admin/delivery-versions/${item.id}/reject`, {
                      method: 'POST',
                      body: JSON.stringify({ reason })
                    });
                    reload();
                  }}
                >
                  驳回
                </button>
              </div>
            )}
            {item.submittedAt && (
              <div className="text-[10px] text-slate-400">{new Date(item.submittedAt).toLocaleString()}</div>
            )}
          </div>
        ))}
        {data?.length === 0 && <p className="text-sm text-slate-400">当前筛选下没有交付版本。</p>}
      </div>
    </div>
  );
};

const ExpertsPage = () => {
  const { data, error, loading, reload } = useAdminQuery<Array<{
    id: string;
    name: string;
    title: string;
    expertLevel: number;
    listed: boolean;
    featured: boolean;
    paused: boolean;
    status: string;
    certification: null | {
      id: string;
      level: number;
      status: string;
      freezeReason?: string;
    };
  }>>('/api/admin/experts');

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-black">专家管理</h1>
        <p className="text-xs text-slate-500 mt-1">认证只读；后台只允许冻结 / 解冻与推荐</p>
      </div>
      {loading && <p className="text-sm text-slate-500">加载中…</p>}
      {error && <p className="text-sm text-rose-600">{error}</p>}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <table className="w-full text-xs">
          <thead className="bg-slate-50 text-slate-500">
            <tr>
              <th className="text-left p-3">专家</th>
              <th className="text-left p-3">认证状态</th>
              <th className="text-left p-3">专家库</th>
              <th className="text-right p-3">操作</th>
            </tr>
          </thead>
          <tbody>
            {(data || []).map((expert) => {
              const cert = expert.certification;
              const frozen = cert?.status === 'frozen';
              return (
                <tr key={expert.id} className="border-t border-slate-100">
                  <td className="p-3">
                    <div className="font-bold">{expert.name}</div>
                    <div className="text-slate-400">{expert.title}</div>
                  </td>
                  <td className="p-3">
                    {cert ? (
                      <span className={frozen ? 'text-rose-600 font-bold' : 'text-emerald-700 font-bold'}>
                        {statusLabel[cert.status] || cert.status}
                      </span>
                    ) : (
                      <span className="text-slate-400">无认证记录</span>
                    )}
                  </td>
                  <td className="p-3">{expert.listed && !expert.paused && !frozen ? '是' : '否'}</td>
                  <td className="p-3 text-right space-x-2">
                    {cert && !frozen && (
                      <button
                        type="button"
                        className="font-bold text-rose-600 cursor-pointer"
                        onClick={async () => {
                          const reason = window.prompt('请填写冻结原因（必填）');
                          if (!reason) return;
                          await api(`/api/admin/expert-certifications/${cert.id}/freeze`, {
                            method: 'POST',
                            body: JSON.stringify({ reason })
                          });
                          reload();
                        }}
                      >
                        冻结
                      </button>
                    )}
                    {cert && frozen && (
                      <button
                        type="button"
                        className="font-bold text-emerald-700 cursor-pointer"
                        onClick={async () => {
                          const reason = window.prompt('请填写解冻原因', '复核通过，恢复认证');
                          if (!reason) return;
                          await api(`/api/admin/expert-certifications/${cert.id}/unfreeze`, {
                            method: 'POST',
                            body: JSON.stringify({ reason })
                          });
                          reload();
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
      </div>
    </div>
  );
};

const LeadsPage = () => {
  const { data, error, loading, reload } = useAdminQuery<Array<{
    id: string;
    clientName: string;
    clientCompany: string;
    agentTitle: string;
    status: string;
    createdAt: string;
    summary: string;
    messages: Array<{ id: string; senderName: string; text: string }>;
  }>>('/api/admin/leads');

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-black">咨询线索</h1>
      {loading && <p className="text-sm text-slate-500">加载中…</p>}
      {error && <p className="text-sm text-rose-600">{error}</p>}
      <div className="space-y-3">
        {(data || []).map((lead) => (
          <div key={lead.id} className="bg-white rounded-2xl border border-slate-200 p-4 space-y-2">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-sm font-bold">{lead.clientName} · {lead.clientCompany}</div>
                <div className="text-xs text-slate-500">
                  {lead.agentTitle} · 咨询于 {new Date(lead.createdAt).toLocaleString('zh-CN')}
                </div>
              </div>
              <select
                value={lead.status}
                className="border border-slate-200 rounded-lg px-2 py-1 text-xs"
                onChange={async (e) => {
                  await api(`/api/admin/leads/${lead.id}`, {
                    method: 'PATCH',
                    body: JSON.stringify({ status: e.target.value })
                  });
                  reload();
                }}
              >
                {['new', 'contacted', 'quoted', 'signed', 'closed'].map((s) => (
                  <option key={s} value={s}>{statusLabel[s]}</option>
                ))}
              </select>
            </div>
            {lead.summary && <p className="text-xs text-slate-600">{lead.summary}</p>}
            {lead.messages[0] && (
              <p className="text-[11px] text-slate-500 bg-slate-50 rounded-xl p-2">
                {lead.messages[0].senderName}: {lead.messages[0].text}
              </p>
            )}
          </div>
        ))}
        {data?.length === 0 && <p className="text-sm text-slate-400">暂无线索。前台提交咨询后会出现在这里。</p>}
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

const LogsPage = () => {
  const { data, error, loading } = useAdminQuery<Array<{
    id: string;
    action: string;
    targetType: string;
    targetId: string;
    createdAt: string;
    actor?: { name: string };
  }>>('/api/admin/audit-logs');

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-black">操作日志</h1>
      {loading && <p className="text-sm text-slate-500">加载中…</p>}
      {error && <p className="text-sm text-rose-600">{error}</p>}
      <div className="bg-white rounded-2xl border border-slate-200 divide-y divide-slate-100 text-xs">
        {(data || []).map((log) => (
          <div key={log.id} className="p-3 flex justify-between gap-3">
            <span>
              <Check size={12} className="inline mr-1 text-emerald-600" />
              {log.actor?.name || '系统'} {log.action} {log.targetType}/{log.targetId}
            </span>
            <span className="text-slate-400 shrink-0">{new Date(log.createdAt).toLocaleString()}</span>
          </div>
        ))}
      </div>
    </div>
  );
};
