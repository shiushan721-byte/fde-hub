import React, { useMemo, useState } from 'react';
import {
  ArrowLeft,
  Bookmark,
  Bot,
  Box,
  DollarSign,
  Download,
  Layers,
  Package,
  RefreshCw,
  Search,
  ThumbsUp,
  Wrench
} from 'lucide-react';
import { CreatorAgentItem, CustomerAgentInstance, CustomerLeadItem } from '../types/creator';
import { creatorAgentHasBeenUsed, creatorListingBadgeClass, creatorListingLabel } from '../lib/agentLifecycle';
import { pricingLabel } from '../../shared/pricingPlans';
import { normalizeAdapterPackages, adapterPackageIsFree, adapterPackagePriceYuan } from '../../shared/adapterPackages';
import { normalizeCustomProjects } from '../../shared/customProjects';

type ListTab = 'all' | 'owned' | 'delivered';
type OwnedDetailTab = 'profile' | 'versions' | 'products';

function platformSupportLabel(support: CreatorAgentItem['platformSupport']) {
  switch (support) {
    case 'mac':
      return 'macOS';
    case 'windows':
      return 'Windows';
    case 'both':
    default:
      return 'macOS / Windows';
  }
}

function deliveredStatus(status: CustomerAgentInstance['status']): { label: string; className: string } {
  switch (status) {
    case 'draft':
    case 'hermes_validating':
      return { label: '交付中', className: 'bg-blue-50 text-blue-700 border-blue-200' };
    case 'active':
      return { label: '已完成', className: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
    case 'suspended':
      return { label: '售后中', className: 'bg-rose-50 text-rose-700 border-rose-200' };
    default:
      return { label: '交付中', className: 'bg-slate-50 text-slate-600 border-slate-200' };
  }
}

function fallbackCover(src?: string) {
  return src || 'https://images.unsplash.com/photo-1556740758-90de374c12ad?w=600&auto=format&fit=crop&q=80';
}

export const FdeAgentWorkbenchPanel: React.FC<{
  agents: CreatorAgentItem[];
  instances: CustomerAgentInstance[];
  leads?: CustomerLeadItem[];
  initialListTab?: ListTab;
  onUnpublish: (agentId: string) => void;
  onSubmitPublic: (agentId: string) => void;
  onContinuePublish: (agent: CreatorAgentItem) => void;
  onUpdateSkill: (agent: CreatorAgentItem) => void;
  onUpdateInstanceSkill: (instance: CustomerAgentInstance) => void;
  onOpenPricing: (agent: CreatorAgentItem) => void;
  onDelete: (agent: CreatorAgentItem) => void;
  onBlockedDelete: (agent: CreatorAgentItem) => void;
}> = ({
  agents,
  instances,
  leads = [],
  initialListTab = 'all',
  onUnpublish,
  onSubmitPublic,
  onContinuePublish,
  onUpdateSkill,
  onUpdateInstanceSkill,
  onOpenPricing,
  onDelete,
  onBlockedDelete
}) => {
  const [listTab, setListTab] = useState<ListTab>(initialListTab);
  const [query, setQuery] = useState('');
  const [ownedId, setOwnedId] = useState<string | null>(null);
  const [deliveredId, setDeliveredId] = useState<string | null>(null);
  const [ownedTab, setOwnedTab] = useState<OwnedDetailTab>('profile');

  const ownedAgent = agents.find((a) => a.id === ownedId) || null;
  const deliveredInstance = instances.find((i) => i.id === deliveredId) || null;

  const filteredOwned = useMemo(() => {
    const q = query.trim().toLowerCase();
    return agents.filter((agent) => {
      if (!q) return true;
      return [agent.title, agent.desc, agent.category, creatorListingLabel(agent.status)]
        .join(' ')
        .toLowerCase()
        .includes(q);
    });
  }, [agents, query]);

  const filteredDelivered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return instances.filter((inst) => {
      if (!q) return true;
      return [
        inst.title,
        inst.customerName,
        inst.customerCompany,
        inst.baseAgentTitle,
        deliveredStatus(inst.status).label
      ]
        .join(' ')
        .toLowerCase()
        .includes(q);
    });
  }, [instances, query]);

  const showOwned = listTab === 'all' || listTab === 'owned';
  const showDelivered = listTab === 'all' || listTab === 'delivered';

  if (ownedAgent) {
    return (
      <OwnedAgentDetail
        agent={ownedAgent}
        activeTab={ownedTab}
        onTabChange={setOwnedTab}
        onBack={() => {
          setOwnedId(null);
          setOwnedTab('profile');
        }}
        onUnpublish={onUnpublish}
        onSubmitPublic={onSubmitPublic}
        onContinuePublish={onContinuePublish}
        onUpdateSkill={onUpdateSkill}
        onOpenPricing={onOpenPricing}
        onDelete={onDelete}
        onBlockedDelete={onBlockedDelete}
      />
    );
  }

  if (deliveredInstance) {
    const relatedLead = leads.find((lead) => lead.id === deliveredInstance.relatedLeadId);
    return (
      <DeliveredAgentDetail
        instance={deliveredInstance}
        relatedLead={relatedLead}
        onBack={() => setDeliveredId(null)}
        onUpdateSkill={onUpdateInstanceSkill}
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl w-full sm:w-fit">
          {(
            [
              { key: 'all' as const, label: '全部智能体', count: agents.length + instances.length },
              { key: 'owned' as const, label: '我创建的智能体', count: agents.length },
              { key: 'delivered' as const, label: '已交付智能体', count: instances.length }
            ] as const
          ).map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setListTab(tab.key)}
              className={`flex-1 sm:flex-none px-3.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                listTab === tab.key
                  ? 'bg-white text-blue-700 shadow-xs ring-1 ring-slate-200'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {tab.label}
              <span
                className={`ml-1.5 px-1.5 py-0.5 rounded-full text-[10px] ${
                  listTab === tab.key ? 'bg-blue-50 text-blue-700' : 'bg-slate-200 text-slate-600'
                }`}
              >
                {tab.count}
              </span>
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 px-3 h-10 rounded-xl border border-slate-200 bg-white min-w-[220px]">
          <Search size={14} className="text-slate-400 shrink-0" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="搜索名称、客户、状态"
            className="flex-1 bg-transparent outline-none text-xs text-slate-700 placeholder:text-slate-400"
          />
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs">
        <div className="hidden md:grid grid-cols-12 gap-3 px-4 py-2.5 bg-slate-50 border-b border-slate-100 text-[11px] font-bold text-slate-500">
          <div className="col-span-4">智能体</div>
          <div className="col-span-2">类型</div>
          <div className="col-span-2">状态</div>
          <div className="col-span-2">版本 / 客户</div>
          <div className="col-span-2 text-right">操作</div>
        </div>

        {showOwned &&
          filteredOwned.map((agent) => (
            <button
              key={`owned-${agent.id}`}
              type="button"
              onClick={() => setOwnedId(agent.id)}
              className="w-full text-left grid grid-cols-1 md:grid-cols-12 gap-3 px-4 py-3.5 border-b border-slate-100 hover:bg-slate-50/80 transition-colors cursor-pointer"
            >
              <div className="md:col-span-4 flex items-center gap-3 min-w-0">
                <img
                  src={fallbackCover(agent.coverImage)}
                  alt=""
                  className="w-10 h-10 rounded-xl object-cover ring-1 ring-slate-100 shrink-0"
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).src = fallbackCover();
                  }}
                />
                <div className="min-w-0">
                  <div className="text-sm font-bold text-slate-900 truncate">{agent.title}</div>
                  <div className="text-[11px] text-slate-500 truncate mt-0.5">{agent.desc}</div>
                </div>
              </div>
              <div className="md:col-span-2 flex items-center">
                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-100">
                  我创建的
                </span>
              </div>
              <div className="md:col-span-2 flex items-center gap-2 flex-wrap">
                <span
                  className={`inline-flex px-2 py-0.5 rounded-md text-[10px] font-bold border ${creatorListingBadgeClass(agent.status)}`}
                >
                  {creatorListingLabel(agent.status)}
                </span>
                <span className="text-[10px] text-slate-500">{platformSupportLabel(agent.platformSupport)}</span>
              </div>
              <div className="md:col-span-2 flex items-center text-[11px] text-slate-600">
                v{agent.version || '1.0.0'} ·{' '}
                {pricingLabel({
                  isFree: agent.pricingType === 'free' || agent.pricingPlans?.isFree,
                  price: agent.pricingPlans?.price || agent.price,
                  monthlyPrice: agent.pricingPlans?.monthlyPrice
                })}
              </div>
              <div className="md:col-span-2 flex items-center justify-start md:justify-end text-[11px] font-bold text-blue-700">
                管理详情 →
              </div>
            </button>
          ))}

        {showDelivered &&
          filteredDelivered.map((inst) => {
            const status = deliveredStatus(inst.status);
            return (
              <button
                key={`delivered-${inst.id}`}
                type="button"
                onClick={() => setDeliveredId(inst.id)}
                className="w-full text-left grid grid-cols-1 md:grid-cols-12 gap-3 px-4 py-3.5 border-b border-slate-100 last:border-0 hover:bg-slate-50/80 transition-colors cursor-pointer"
              >
                <div className="md:col-span-4 flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center shrink-0">
                    <Bot size={16} />
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-bold text-slate-900 truncate">{inst.title}</div>
                    <div className="text-[11px] text-slate-500 truncate mt-0.5">
                      基于 {inst.baseAgentTitle} · {inst.basedOnStandardVersion}
                    </div>
                  </div>
                </div>
                <div className="md:col-span-2 flex items-center">
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-100">
                    已交付
                  </span>
                </div>
                <div className="md:col-span-2 flex items-center">
                  <span className={`inline-flex px-2 py-0.5 rounded-md text-[10px] font-bold border ${status.className}`}>
                    {status.label}
                  </span>
                </div>
                <div className="md:col-span-2 flex items-center text-[11px] text-slate-600 truncate">
                  {inst.customerName} · {inst.customerCompany}
                </div>
                <div className="md:col-span-2 flex items-center justify-start md:justify-end text-[11px] font-bold text-blue-700">
                  查看交付 →
                </div>
              </button>
            );
          })}

        {((showOwned && filteredOwned.length === 0) || !showOwned) &&
          ((showDelivered && filteredDelivered.length === 0) || !showDelivered) && (
            <p className="px-4 py-12 text-center text-xs text-slate-400">暂无符合条件的智能体</p>
          )}
      </div>
    </div>
  );
};

function OwnedAgentDetail({
  agent,
  activeTab,
  onTabChange,
  onBack,
  onUnpublish,
  onSubmitPublic,
  onContinuePublish,
  onUpdateSkill,
  onOpenPricing,
  onDelete,
  onBlockedDelete
}: {
  agent: CreatorAgentItem;
  activeTab: OwnedDetailTab;
  onTabChange: (tab: OwnedDetailTab) => void;
  onBack: () => void;
  onUnpublish: (agentId: string) => void;
  onSubmitPublic: (agentId: string) => void;
  onContinuePublish: (agent: CreatorAgentItem) => void;
  onUpdateSkill: (agent: CreatorAgentItem) => void;
  onOpenPricing: (agent: CreatorAgentItem) => void;
  onDelete: (agent: CreatorAgentItem) => void;
  onBlockedDelete: (agent: CreatorAgentItem) => void;
}) {
  const adapters = normalizeAdapterPackages(agent.adapterPackages || []);
  const projects = normalizeCustomProjects(agent.customProjects || []);
  const canUpdateSkill = agent.status === 'draft' || agent.status === 'offline';

  return (
    <div className="space-y-4">
      <button
        type="button"
        onClick={onBack}
        className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-blue-700 cursor-pointer"
      >
        <ArrowLeft size={14} />
        返回智能体列表
      </button>

      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs flex flex-col md:flex-row md:items-start justify-between gap-4">
        <div className="flex items-start gap-4 min-w-0">
          <img src={fallbackCover(agent.coverImage)} alt="" className="w-16 h-16 rounded-2xl object-cover ring-1 ring-slate-100" />
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-lg font-extrabold text-slate-900">{agent.title}</h2>
              <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${creatorListingBadgeClass(agent.status)}`}>
                {creatorListingLabel(agent.status)}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              {agent.category || '未分类'} · v{agent.version || '1.0.0'} · {platformSupportLabel(agent.platformSupport)}
            </p>
            <p className="text-xs text-slate-600 mt-2 leading-relaxed">{agent.desc}</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 shrink-0">
          {agent.status === 'published' ? (
            <button
              type="button"
              onClick={() => onUnpublish(agent.id)}
              className="px-3 py-2 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold cursor-pointer"
            >
              下架为私有
            </button>
          ) : agent.status === 'under_review' ? (
            <button
              type="button"
              onClick={() => onUnpublish(agent.id)}
              className="px-3 py-2 rounded-xl bg-amber-50 text-amber-800 text-xs font-bold cursor-pointer"
            >
              撤回为私有
            </button>
          ) : agent.status === 'draft' ? (
            <button
              type="button"
              onClick={() => onContinuePublish(agent)}
              className="px-3 py-2 rounded-xl bg-blue-600 text-white text-xs font-bold cursor-pointer"
            >
              继续发布
            </button>
          ) : (
            <button
              type="button"
              onClick={() => onSubmitPublic(agent.id)}
              className="px-3 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold cursor-pointer"
            >
              申请公开上架
            </button>
          )}
          {creatorAgentHasBeenUsed(agent) ? (
            <button
              type="button"
              onClick={() => onBlockedDelete(agent)}
              className="px-3 py-2 text-xs font-bold text-slate-400 cursor-pointer"
            >
              无法删除
            </button>
          ) : (
            <button
              type="button"
              onClick={() => onDelete(agent)}
              className="px-3 py-2 text-xs font-bold text-rose-600 cursor-pointer"
            >
              删除
            </button>
          )}
        </div>
      </div>

      <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl w-fit">
        {(
          [
            { key: 'profile' as const, label: '基础资料' },
            { key: 'versions' as const, label: '版本管理' },
            { key: 'products' as const, label: '商品管理' }
          ] as const
        ).map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => onTabChange(tab.key)}
            className={`px-4 py-2 rounded-lg text-xs font-bold cursor-pointer ${
              activeTab === tab.key ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'profile' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
            <h3 className="text-sm font-bold text-slate-900">基础资料</h3>
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <InfoCell label="名称" value={agent.title} />
              <InfoCell label="分类" value={agent.category || '未分类'} />
              <InfoCell label="发布状态" value={creatorListingLabel(agent.status)} />
              <InfoCell label="适配平台" value={platformSupportLabel(agent.platformSupport)} />
            </dl>
            <div>
              <div className="text-[11px] font-bold text-slate-400 mb-1">简介</div>
              <p className="text-sm text-slate-700 leading-relaxed">{agent.desc || '暂无简介'}</p>
            </div>
            <div>
              <div className="text-[11px] font-bold text-slate-400 mb-1">AI 检索信息</div>
              <p className="text-sm text-slate-700 leading-relaxed">{agent.recommendDoes || '尚未填写「它可以帮用户做什么」'}</p>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {(agent.recommendTags || []).length === 0 ? (
                  <span className="text-[11px] text-slate-400">暂无能力标签</span>
                ) : (
                  agent.recommendTags!.map((tag) => (
                    <span key={tag} className="px-2 py-0.5 rounded-md bg-slate-50 border border-slate-200 text-[11px] text-slate-600">
                      {tag}
                    </span>
                  ))
                )}
              </div>
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3">
            <h3 className="text-sm font-bold text-slate-900">市场数据</h3>
            <div className="flex items-center justify-between text-xs text-slate-600">
              <span className="inline-flex items-center gap-1"><Bookmark size={13} className="text-amber-500" />收藏</span>
              <span className="font-bold text-slate-900">{(agent.favoritesCount || 0).toLocaleString()}</span>
            </div>
            <div className="flex items-center justify-between text-xs text-slate-600">
              <span className="inline-flex items-center gap-1"><ThumbsUp size={13} className="text-rose-500" />点赞</span>
              <span className="font-bold text-slate-900">{(agent.likesCount || 0).toLocaleString()}</span>
            </div>
            <div className="flex items-center justify-between text-xs text-slate-600">
              <span>付费订单</span>
              <span className="font-bold text-slate-900">{agent.paidOrdersCount || 0}</span>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'versions' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900">版本管理</h3>
              <p className="text-[11px] text-slate-500 mt-0.5">每次上传的版本包、审核状态与发布记录</p>
            </div>
            <button
              type="button"
              disabled={!canUpdateSkill}
              title={canUpdateSkill ? '上传新版本' : '请先下架或撤回为私有后再更新 Skill 包'}
              onClick={() => onUpdateSkill(agent)}
              className="px-3 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed inline-flex items-center gap-1.5"
            >
              <RefreshCw size={12} />
              上传新版本
            </button>
          </div>
          <div className="rounded-xl border border-slate-200 p-4 space-y-2">
            <div className="flex items-center justify-between gap-3">
              <div className="text-sm font-bold text-slate-900">v{agent.version || agent.skillPackage?.version || '1.0.0'}</div>
              <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${creatorListingBadgeClass(agent.status)}`}>
                {creatorListingLabel(agent.status)}
              </span>
            </div>
            <div className="text-[11px] text-slate-500">
              包文件：{agent.skillPackage?.fileName || '尚未上传'}
              {agent.skillPackage?.size ? ` · ${agent.skillPackage.size}` : ''}
            </div>
            <div className="text-[11px] text-slate-500">适配平台：{platformSupportLabel(agent.platformSupport)}</div>
            <div className="text-[11px] text-slate-500">
              最近校验：{agent.skillPackage?.lastValidatedAt || agent.updatedAt || '—'}
            </div>
            {(agent.standardVersionHistory || []).length > 0 && (
              <div className="pt-2 border-t border-slate-100">
                <div className="text-[11px] font-bold text-slate-500 mb-1">发布记录</div>
                <ul className="text-xs text-slate-600 space-y-1">
                  {(agent.standardVersionHistory || []).slice().reverse().map((ver) => (
                    <li key={ver}>
                      {ver}
                      {ver === agent.currentStandardVersion ? ' · 当前线上版本' : ''}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'products' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">商品管理</h3>
              <p className="text-[11px] text-slate-500 mt-0.5">基于该智能体配置的标准化收费项目，不是客户专属交付物</p>
            </div>
            <button
              type="button"
              onClick={() => onOpenPricing(agent)}
              className="px-3 py-2 rounded-xl bg-blue-50 text-blue-700 text-xs font-bold cursor-pointer inline-flex items-center gap-1.5"
            >
              <DollarSign size={12} />
              编辑商品
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <ProductCard
              icon={<Package size={14} />}
              title="智能体使用权"
              hint="用户解锁并使用智能体"
            >
              <div className="text-lg font-extrabold text-slate-900">
                {pricingLabel({
                  isFree: agent.pricingType === 'free' || agent.pricingPlans?.isFree,
                  price: agent.pricingPlans?.price || agent.price,
                  monthlyPrice: agent.pricingPlans?.monthlyPrice
                })}
              </div>
            </ProductCard>
            <ProductCard
              icon={<Download size={14} />}
              title="适配版本下载"
              hint="WorkBuddy、Codex 等平台安装包"
            >
              {adapters.length === 0 ? (
                <p className="text-xs text-slate-400">尚未配置适配包</p>
              ) : (
                <ul className="space-y-1.5 text-xs text-slate-700">
                  {adapters.map((pack) => (
                    <li key={pack.id} className="flex items-center justify-between gap-2">
                      <span className="truncate">{pack.platformName}</span>
                      <span className="font-bold">
                        {adapterPackageIsFree(pack) ? '免费' : `¥${adapterPackagePriceYuan(pack)}`}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </ProductCard>
            <ProductCard
              icon={<Wrench size={14} />}
              title="标准服务项目"
              hint="HTML 部署、流程改造、内部数据对接"
            >
              {projects.length === 0 ? (
                <p className="text-xs text-slate-400">尚未配置标准服务</p>
              ) : (
                <ul className="space-y-1.5 text-xs text-slate-700">
                  {projects.map((item) => (
                    <li key={item.id} className="flex items-center justify-between gap-2">
                      <span className="truncate">{item.title}</span>
                      <span className="font-bold">¥{item.price}</span>
                    </li>
                  ))}
                </ul>
              )}
            </ProductCard>
          </div>
        </div>
      )}
    </div>
  );
}

function DeliveredAgentDetail({
  instance,
  relatedLead,
  onBack,
  onUpdateSkill
}: {
  instance: CustomerAgentInstance;
  relatedLead?: CustomerLeadItem;
  onBack: () => void;
  onUpdateSkill: (instance: CustomerAgentInstance) => void;
}) {
  const status = deliveredStatus(instance.status);
  const records = [
    { at: instance.createdAt, text: `基于 ${instance.baseAgentTitle} ${instance.basedOnStandardVersion} 创建专属版本` },
    instance.customizations.skillModified ? { at: instance.updatedAt, text: `更新 Skill 包至 ${instance.boundSkillVersion}` } : null,
    instance.customizations.pagesModified.length
      ? { at: instance.updatedAt, text: `页面改造：${instance.customizations.pagesModified.join('、')}` }
      : null,
    instance.customizations.flowsModified.length
      ? { at: instance.updatedAt, text: `流程改造：${instance.customizations.flowsModified.join('、')}` }
      : null
  ].filter(Boolean) as Array<{ at: string; text: string }>;

  return (
    <div className="space-y-4">
      <button
        type="button"
        onClick={onBack}
        className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-blue-700 cursor-pointer"
      >
        <ArrowLeft size={14} />
        返回智能体列表
      </button>

      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs flex flex-col md:flex-row md:items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-lg font-extrabold text-slate-900">{instance.title}</h2>
            <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${status.className}`}>{status.label}</span>
            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-100">
              客户专属 · 不可再售
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            当前交付版本 {instance.boundSkillVersion} · 基于 {instance.baseAgentTitle} {instance.basedOnStandardVersion}
          </p>
        </div>
        <button
          type="button"
          onClick={() => onUpdateSkill(instance)}
          className="px-3 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold cursor-pointer inline-flex items-center gap-1.5"
        >
          <RefreshCw size={12} />
          更新交付版本
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3">
          <h3 className="text-sm font-bold text-slate-900 inline-flex items-center gap-1.5">
            <Layers size={14} /> 客户与关联订单
          </h3>
          <InfoCell label="客户" value={`${instance.customerName} · ${instance.customerCompany}`} />
          <InfoCell label="关联咨询" value={relatedLead?.id || instance.relatedLeadId || '—'} />
          <InfoCell label="关联订单" value={relatedLead?.status === 'signed' ? relatedLead.id : instance.relatedLeadId || '—'} />
          <p className="text-[11px] text-slate-400 leading-relaxed pt-2">
            已交付智能体是客户专属版本，不进入商品管理，也不可再次公开售卖。
          </p>
        </div>
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-5 space-y-3">
          <h3 className="text-sm font-bold text-slate-900 inline-flex items-center gap-1.5">
            <Box size={14} /> 交付记录与更新记录
          </h3>
          <ul className="space-y-2">
            {records.map((row, idx) => (
              <li key={`${row.at}-${idx}`} className="flex items-start justify-between gap-3 text-xs border-b border-slate-50 pb-2 last:border-0">
                <span className="text-slate-700 leading-relaxed">{row.text}</span>
                <span className="text-slate-400 shrink-0 tabular-nums">{row.at}</span>
              </li>
            ))}
          </ul>
          {instance.upgradeReminder && (
            <p className="text-[11px] text-amber-800 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2">
              {instance.upgradeReminder.message}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function InfoCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-1">
      <div className="text-[11px] font-bold text-slate-400">{label}</div>
      <div className="text-sm font-semibold text-slate-800 break-all">{value}</div>
    </div>
  );
}

function ProductCard({
  icon,
  title,
  hint,
  children
}: {
  icon: React.ReactNode;
  title: string;
  hint: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3">
      <div>
        <div className="text-sm font-bold text-slate-900 inline-flex items-center gap-1.5">
          {icon}
          {title}
        </div>
        <p className="text-[11px] text-slate-500 mt-0.5">{hint}</p>
      </div>
      {children}
    </div>
  );
}
