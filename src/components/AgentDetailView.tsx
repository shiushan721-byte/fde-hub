import React, { useEffect, useRef, useState } from 'react';
import {
  ChevronLeft,
  Zap,
  ArrowRight,
  CheckCircle2,
  XCircle,
  MoreHorizontal,
  Download
} from 'lucide-react';
import { HellomeAgentItem } from '../data/mockData';
import { mockExperts } from '../data/mockData';
import { getStandardVersionForAgent } from '../data/agentInstanceMockData';
import { api } from '../lib/api';
import { ensureMarketplaceSession } from '../lib/marketplaceAuth';
import { useCatalog } from '../lib/catalog';
import {
  AgentShareLinkPayload,
  buildAgentShareUrl,
  parseAgentShareHash
} from '../lib/agentShare';
import { AgentShareModal } from './AgentShareModal';
import { adapterDisplayName, buildAdapterSkillPrompt } from '../../shared/adapterPackages';
import { pricingFromAgent, pricingLabel } from '../../shared/pricingPlans';
import { PaymentCheckoutDrawer } from './PaymentCheckoutDrawer';
import { AgentShowcaseSection } from './AgentShowcaseSection';
import { CommentThread, type ThreadComment } from './CommentThread';
import { showcaseToPublicInspiration, type PublicInspiration } from '../lib/inspiration';
import { yuanAmount } from '../lib/customOrderLabels';
import { getMockComments } from '../data/agentSocialMock';

interface AgentDetailViewProps {
  agent: HellomeAgentItem;
  onBack: () => void;
  onOpenAuthorProfile: (authorId: string) => void;
  onConsultAuthor?: (agent: HellomeAgentItem, initialPrompt?: string) => void;
  onCustomizeFromAgent?: (agent: HellomeAgentItem) => void;
  onUseAgent?: (agent: HellomeAgentItem) => void;
  isFavorite?: boolean;
  onToggleFavorite?: (agentId: string) => void;
  isLiked?: boolean;
  onToggleLike?: (agentId: string) => void;
  onToast?: (message: string) => void;
  enableAuthorShowcaseTools?: boolean;
  onOpenInspiration?: (item: PublicInspiration) => void;
}

type CatalogLicense = {
  id: string;
  plan: string;
  priceCents: number;
  status: string;
  paidAt?: string | null;
  expiresAt?: string | null;
  active: boolean;
};

type CheckoutOrder = {
  id: string;
  priceCents: number;
};

type PublicComment = ThreadComment;

export const AgentDetailView: React.FC<AgentDetailViewProps> = ({
  agent,
  onBack,
  onOpenAuthorProfile,
  onConsultAuthor,
  onCustomizeFromAgent,
  onUseAgent,
  onToast,
  enableAuthorShowcaseTools = false,
  onOpenInspiration
}) => {
  const [followed, setFollowed] = useState(false);
  const [commentDraft, setCommentDraft] = useState('');
  const [comments, setComments] = useState<PublicComment[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(true);
  const [commentBusy, setCommentBusy] = useState(false);
  const [reportBusy, setReportBusy] = useState(false);
  const [socialTab, setSocialTab] = useState<'showcase' | 'comments'>('showcase');
  const [showcaseCount, setShowcaseCount] = useState(0);
  const [sharePosterOpen, setSharePosterOpen] = useState(false);
  const [shareUrl, setShareUrl] = useState('');
  const [shareBusy, setShareBusy] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [copiedPackId, setCopiedPackId] = useState('');
  const moreMenuRef = useRef<HTMLDivElement>(null);
  const [license, setLicense] = useState<CatalogLicense | null>(null);
  const [checkout, setCheckout] = useState<CheckoutOrder | null>(null);
  const [buyBusy, setBuyBusy] = useState(false);
  const catalog = useCatalog();

  const authorExpert =
    catalog.experts.find((e) => e.id === agent.authorId) ||
    mockExperts.find((e) => e.id === agent.authorId) ||
    catalog.experts[0] ||
    mockExperts[0];
  const standardVersion = getStandardVersionForAgent(agent.id);
  const shareQuery = parseAgentShareHash(typeof window === 'undefined' ? '' : window.location.hash);
  const currentShareToken = shareQuery?.id === agent.id ? shareQuery.share : '';
  const adapterPackages = agent.adapterPackages || [];
  const pricing = pricingFromAgent(agent);
  const priceText = pricingLabel(pricing);
  const saleYuan = pricing.price;
  const owned = Boolean(license?.active);

  const copyAdapterPrompt = async (pack: (typeof adapterPackages)[number]) => {
    const text = buildAdapterSkillPrompt({
      agentTitle: agent.title,
      agentDesc: agent.desc,
      platformName: pack.platformName,
      zipUrl: pack.url
    });
    try {
      await navigator.clipboard.writeText(text);
      setCopiedPackId(pack.id);
      onToast?.('提示词已复制，发给该 AI 即可安装 skills');
      window.setTimeout(() => {
        setCopiedPackId((current) => (current === pack.id ? '' : current));
      }, 2000);
    } catch {
      onToast?.('复制失败，请手动复制');
    }
  };

  const startCheckout = async () => {
    if (pricing.isFree || owned) {
      onUseAgent?.(agent);
      return;
    }
    setBuyBusy(true);
    try {
      await ensureMarketplaceSession();
      const order = await api<{ id: string; priceCents: number }>(
        `/api/me/agents/${agent.id}/checkout`,
        {
          method: 'POST',
          body: JSON.stringify({ channel: 'wechat' })
        }
      );
      setCheckout({ id: order.id, priceCents: order.priceCents });
    } catch (err) {
      onToast?.(err instanceof Error ? err.message : '无法发起支付');
    } finally {
      setBuyBusy(false);
    }
  };

  useEffect(() => {
    const onPointer = (event: MouseEvent) => {
      if (moreMenuRef.current && !moreMenuRef.current.contains(event.target as Node)) {
        setMoreOpen(false);
      }
    };
    document.addEventListener('mousedown', onPointer);
    return () => document.removeEventListener('mousedown', onPointer);
  }, []);

  useEffect(() => {
    setShareUrl('');
    setCheckout(null);
    let cancelled = false;
    (async () => {
      try {
        await ensureMarketplaceSession();
        const item = await api<CatalogLicense | null>(`/api/me/agents/${agent.id}/license`);
        if (!cancelled) setLicense(item);
      } catch {
        if (!cancelled) setLicense(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [agent.id]);

  const resolveShareUrl = async () => {
    if (shareUrl) return shareUrl;
    try {
      const res = await api<AgentShareLinkPayload>(`/api/public/agents/${agent.id}/share-link`, {
        method: 'POST',
        body: currentShareToken ? JSON.stringify({ share: currentShareToken }) : JSON.stringify({})
      });
      const url = buildAgentShareUrl(res.path);
      setShareUrl(url);
      return url;
    } catch {
      const fallback = buildAgentShareUrl(
        currentShareToken
          ? `/#/agent/${encodeURIComponent(agent.id)}?share=${encodeURIComponent(currentShareToken)}`
          : `/#/agent/${encodeURIComponent(agent.id)}`
      );
      setShareUrl(fallback);
      return fallback;
    }
  };

  const openSharePoster = async () => {
    setShareBusy(true);
    try {
      await resolveShareUrl();
      setSharePosterOpen(true);
    } finally {
      setShareBusy(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    setCommentsLoading(true);
    const qs = currentShareToken ? `?share=${encodeURIComponent(currentShareToken)}` : '';
    void api<{ comments: PublicComment[] }>(`/api/public/agents/${agent.id}/comments${qs}`)
      .then((res) => {
        if (cancelled) return;
        const next = res.comments || [];
        setComments(next.length > 0 ? next : getMockComments(agent.id, agent.authorName));
      })
      .catch(() => {
        if (!cancelled) setComments(getMockComments(agent.id, agent.authorName));
      })
      .finally(() => {
        if (!cancelled) setCommentsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [agent.id, currentShareToken]);

  const submitComment = async () => {
    const content = commentDraft.trim();
    if (!content) return;
    setCommentBusy(true);
    try {
      await ensureMarketplaceSession();
      const created = await api<PublicComment>(`/api/public/agents/${agent.id}/comments`, {
        method: 'POST',
        body: JSON.stringify({ content })
      });
      setComments((prev) => [created, ...prev]);
      setCommentDraft('');
    } catch (err) {
      onToast?.(err instanceof Error ? err.message : '评论失败，请先登录后重试');
    } finally {
      setCommentBusy(false);
    }
  };

  const submitReport = async (input: {
    comment: PublicComment;
    reason: 'spam' | 'abuse' | 'illegal' | 'false_info' | 'other';
    detail: string;
  }) => {
    setReportBusy(true);
    try {
      await ensureMarketplaceSession();
      await api(`/api/public/agents/${agent.id}/comments/${input.comment.id}/report`, {
        method: 'POST',
        body: JSON.stringify({ reason: input.reason, detail: input.detail })
      });
      onToast?.('举报已提交，处理进展将发送至站内信');
    } catch (err) {
      onToast?.(err instanceof Error ? err.message : '举报失败，请先登录后重试');
      throw err;
    } finally {
      setReportBusy(false);
    }
  };

  const permissionRows: Array<{ label: string; allowed: boolean }> = [
    { label: '生成内容可用权', allowed: true },
    { label: '商业使用', allowed: true },
    { label: '基于此智能体定制', allowed: agent.canFDECustom !== false },
    { label: '平台内分享与收藏', allowed: true },
    { label: '二次分发源码', allowed: false }
  ];

  return (
    <div id="agent-detail-view" className="min-h-full bg-white">
      <div className="max-w-6xl mx-auto px-5 sm:px-8 lg:px-10 py-4 sm:py-5">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-0.5 text-[13px] text-slate-500 hover:text-slate-900 cursor-pointer mb-4"
        >
          <ChevronLeft size={16} strokeWidth={2} />
          <span>返回</span>
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_268px] gap-8 lg:gap-10 items-start">
          <div className="min-w-0 space-y-5">
            <header className="space-y-1.5">
              <h1 className="text-[26px] sm:text-[30px] font-bold text-slate-900 tracking-tight leading-snug">
                {agent.title}
              </h1>
              <p className="text-[13px] text-slate-400 flex items-center gap-2 flex-wrap">
                <span>{agent.category}</span>
                <span className="text-slate-300">·</span>
                <span className={pricing.isFree ? 'text-emerald-600 font-semibold' : 'text-slate-800 font-semibold'}>
                  {priceText}
                </span>
              </p>
            </header>

            <div className="rounded-2xl overflow-hidden bg-slate-100 ring-1 ring-slate-200/80">
              <div className="aspect-[16/9] w-full">
                <img
                  src={agent.coverImage}
                  alt={agent.title}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
              </div>
            </div>

            <p className="text-[14px] text-slate-600 leading-[1.75] whitespace-pre-wrap">
              {agent.desc}
            </p>

            <section className="pt-2 border-t border-slate-100 space-y-4">
              <div className="flex items-end justify-between gap-3 border-b border-slate-100">
                <div className="flex items-center gap-5">
                  {(
                    [
                      { id: 'showcase' as const, label: '成果展示', count: showcaseCount },
                      { id: 'comments' as const, label: '评论', count: comments.length }
                    ] as const
                  ).map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setSocialTab(tab.id)}
                      className={`pb-2.5 text-[14px] font-semibold cursor-pointer border-b-2 -mb-px ${
                        socialTab === tab.id
                          ? 'text-slate-900 border-slate-900'
                          : 'text-slate-400 border-transparent hover:text-slate-600'
                      }`}
                    >
                      {tab.label}
                      <span className="ml-1.5 font-medium text-slate-400">{tab.count}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className={socialTab === 'showcase' ? '' : 'hidden'}>
                <AgentShowcaseSection
                  agentId={agent.id}
                  authorId={agent.authorId}
                  enableAuthorTools={enableAuthorShowcaseTools}
                  onToast={onToast}
                  embedded
                  onCountChange={setShowcaseCount}
                  onOpenDetail={(item) => {
                    onOpenInspiration?.(showcaseToPublicInspiration(item, agent));
                  }}
                />
              </div>

              <div className={socialTab === 'comments' ? 'space-y-4' : 'hidden space-y-4'}>
                <CommentThread
                  comments={comments}
                  loading={commentsLoading}
                  draft={commentDraft}
                  onDraftChange={setCommentDraft}
                  onSubmit={() => void submitComment()}
                  submitBusy={commentBusy}
                  avatar={authorExpert.avatar}
                  onSubmitReport={submitReport}
                  reportBusy={reportBusy}
                />
              </div>
            </section>
          </div>

          <aside className="lg:sticky lg:top-20 space-y-0 text-[13px]">
            <div className="flex items-start gap-3 pb-4">
              <button
                type="button"
                onClick={() => onOpenAuthorProfile(agent.authorId || authorExpert.id)}
                className="shrink-0 cursor-pointer"
              >
                <img
                  src={authorExpert.avatar}
                  alt={authorExpert.name}
                  referrerPolicy="no-referrer"
                  className="w-12 h-12 rounded-full object-cover border border-slate-200"
                />
              </button>
              <div className="flex-1 min-w-0 pt-0.5">
                <button
                  type="button"
                  onClick={() => onOpenAuthorProfile(agent.authorId || authorExpert.id)}
                  className="text-left cursor-pointer group w-full"
                >
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="text-[14px] font-semibold text-slate-900 truncate group-hover:text-blue-600">
                      {agent.authorName || authorExpert.name}
                    </span>
                  </div>
                  <div className="mt-1 flex items-center gap-3 text-[12px] text-slate-400">
                    <span>动态 {authorExpert.ordersCount || 0}</span>
                    <span>粉丝 {Math.max(12, Math.round((authorExpert.ordersCount || 1) * 3))}</span>
                  </div>
                </button>
              </div>
              <button
                type="button"
                onClick={() => setFollowed((v) => !v)}
                className={`shrink-0 mt-1 px-3 h-7 rounded-md text-[12px] font-semibold cursor-pointer transition-colors ${
                  followed
                    ? 'bg-slate-100 text-slate-500'
                    : 'bg-slate-900 text-white hover:bg-slate-800'
                }`}
              >
                {followed ? '已关注' : '关注'}
              </button>
            </div>

            <div className="grid grid-cols-4 gap-1 py-3 border-y border-slate-100 text-center">
              {[
                { label: '投喂', value: agent.usageCount || '0' },
                { label: '评论', value: comments.length || agent.commentsCount },
                { label: '收藏', value: agent.favoritesCount }
              ].map((item) => (
                <div key={item.label}>
                  <div className="text-[15px] font-semibold text-slate-900 tabular-nums leading-none">
                    {item.value}
                  </div>
                  <div className="text-[11px] text-slate-400 mt-1.5">{item.label}</div>
                </div>
              ))}
              <button
                type="button"
                disabled={shareBusy}
                onClick={() => void openSharePoster()}
                className="w-full cursor-pointer rounded-lg py-0.5 hover:bg-slate-50 disabled:opacity-60"
              >
                <div className="text-[15px] font-semibold text-slate-900 tabular-nums leading-none">
                  {agent.sharesCount || '0'}
                </div>
                <div className="text-[11px] text-blue-600 mt-1.5 font-medium">分享</div>
              </button>
            </div>

            <div className="py-4 border-b border-slate-100">
              {pricing.isFree ? (
                <div>
                  <div className="text-[22px] font-bold text-emerald-600 leading-none">免费</div>
                  <p className="text-[12px] text-slate-400 mt-2">可直接体验，调用消耗按词元计费</p>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="text-[22px] font-bold text-slate-900 leading-none">
                    ￥{saleYuan}
                    <span className="text-[13px] font-medium text-slate-400"> 一次性</span>
                  </div>
                  <p className="text-[12px] text-slate-400">购买后可长期使用，不按月或年续费</p>
                  {owned ? (
                    <p className="text-[11px] text-emerald-700">已购买，可长期使用</p>
                  ) : (
                    <button
                      type="button"
                      disabled={buyBusy || saleYuan < 1}
                      onClick={() => void startCheckout()}
                      className="w-full h-10 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-[13px] font-semibold cursor-pointer disabled:opacity-60"
                    >
                      {buyBusy ? '正在创建订单…' : `立即购买 ${yuanAmount(saleYuan * 100)}`}
                    </button>
                  )}
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 py-4">
              {onUseAgent && (pricing.isFree || owned) && (
                <button
                  type="button"
                  onClick={() => onUseAgent(agent)}
                  className="flex-1 h-10 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-[13px] font-semibold cursor-pointer flex items-center justify-center gap-1.5 active:scale-[0.98] transition-transform"
                >
                  <Zap size={14} className="fill-white" />
                  <span>立即体验</span>
                </button>
              )}
              {agent.canFDECustom !== false && (onCustomizeFromAgent || onConsultAuthor) && (
                <button
                  type="button"
                  id="btn-customize-from-agent"
                  onClick={() => {
                    if (onCustomizeFromAgent) onCustomizeFromAgent(agent);
                    else onConsultAuthor?.(agent);
                  }}
                  className="flex-1 h-10 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-800 text-[12px] font-semibold cursor-pointer flex items-center justify-center gap-1 active:scale-[0.98] transition-transform px-2"
                >
                  <span className="leading-tight text-center">基于此智能体定制</span>
                  <ArrowRight size={13} className="shrink-0 text-slate-400" />
                </button>
              )}
            </div>

            <div className="relative pb-2" ref={moreMenuRef}>
              <button
                type="button"
                onClick={() => setMoreOpen((open) => !open)}
                className="w-full h-9 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-[12px] font-semibold cursor-pointer inline-flex items-center justify-center gap-1.5"
              >
                <MoreHorizontal size={14} />
                更多操作
              </button>
              {moreOpen && (
                <div className="absolute left-0 right-0 top-full mt-1.5 z-20 rounded-xl border border-slate-200 bg-white shadow-lg overflow-hidden">
                  <div className="px-3 py-2 text-[11px] font-bold text-slate-500 bg-slate-50 border-b border-slate-100">
                    下载适配版本
                  </div>
                  {adapterPackages.length === 0 ? (
                    <p className="px-3 py-3 text-[12px] text-slate-400">暂无外部工具分发包</p>
                  ) : (
                    adapterPackages.map((pack) => (
                      <div
                        key={pack.id}
                        className="px-3 py-2.5 border-t border-slate-100 first:border-t-0 space-y-2"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[12px] text-slate-800 truncate">
                            {adapterDisplayName(pack.platformName)}
                          </span>
                          <a
                            href={pack.url}
                            download={pack.fileName}
                            className="shrink-0 h-7 px-2.5 rounded-lg bg-slate-900 text-white text-[11px] font-bold inline-flex items-center gap-1 no-underline"
                          >
                            <Download size={12} />
                            下载 ZIP
                          </a>
                        </div>
                        <p className="text-[10px] leading-relaxed text-slate-400">
                          将提示词发送给该AI安装该 skills
                        </p>
                        <button
                          type="button"
                          onClick={() => void copyAdapterPrompt(pack)}
                          className="rounded-full p-[1.5px] cursor-pointer bg-gradient-to-r from-cyan-400 via-fuchsia-400 to-rose-400 shadow-[0_8px_18px_-6px_rgba(34,211,238,0.55),0_8px_18px_-6px_rgba(251,113,133,0.42)] hover:brightness-[1.03] active:scale-[0.98] transition"
                        >
                          <span className="flex h-7 min-w-[92px] items-center justify-center rounded-full bg-white px-3.5 text-[11px] font-semibold text-slate-900">
                            {copiedPackId === pack.id ? '已复制' : '复制 prompt'}
                          </span>
                        </button>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>

            <dl className="space-y-2.5 py-3 border-t border-slate-100">
              <div className="flex justify-between gap-3">
                <dt className="text-slate-400">最近更新</dt>
                <dd className="text-slate-700 tabular-nums">2024/06/20</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-slate-400">首次发布</dt>
                <dd className="text-slate-700 tabular-nums">2024/06/20</dd>
              </div>
            </dl>

            <div className="py-3 border-t border-slate-100 space-y-2.5">
              <h4 className="text-[12px] font-semibold text-slate-900 mb-1">基本信息</h4>
              <dl className="space-y-2.5">
                <div className="flex justify-between gap-3">
                  <dt className="text-slate-400 shrink-0">开发人员</dt>
                  <dd className="text-slate-700 text-right truncate">
                    {agent.authorName || authorExpert.name}
                  </dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-slate-400 shrink-0">分类</dt>
                  <dd className="text-slate-700 text-right">{agent.category}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-slate-400 shrink-0">版本</dt>
                  <dd className="text-slate-700 text-right tabular-nums">{standardVersion}</dd>
                </div>
              </dl>
            </div>

            <div className="py-3 border-t border-slate-100 space-y-2.5">
              <h4 className="text-[12px] font-semibold text-slate-900 mb-1">许可范围</h4>
              <ul className="space-y-2">
                {permissionRows.map((row) => (
                  <li key={row.label} className="flex items-center gap-2 text-slate-600">
                    {row.allowed ? (
                      <CheckCircle2 size={14} className="text-emerald-500 shrink-0" />
                    ) : (
                      <XCircle size={14} className="text-slate-300 shrink-0" />
                    )}
                    <span className={row.allowed ? '' : 'text-slate-400'}>{row.label}</span>
                  </li>
                ))}
              </ul>
            </div>
          </aside>
        </div>
      </div>

      {checkout && (
        <PaymentCheckoutDrawer
          orderId={checkout.id}
          title={agent.title}
          amountCents={checkout.priceCents}
          heading="购买智能体"
          amountLabel="应付金额"
          successTitle="购买成功"
          successHint="支付成功后按购买时价格开通，可长期使用；后续改价不影响已购使用权。"
          escrowNote="演示环境：扫码不会真实扣款。支付成功后按购买时价格开通，已购用户不受后续改价影响。"
          payUrl={`/api/me/purchases/${checkout.id}/pay`}
          confirmUrl={`/api/me/purchases/${checkout.id}/confirm`}
          onClose={() => setCheckout(null)}
          onPaid={() => {
            setLicense({
              id: checkout.id,
              plan: 'one_time',
              priceCents: checkout.priceCents,
              status: 'paid',
              active: true
            });
            setCheckout(null);
            onToast?.('支付成功，已开通使用权');
          }}
        />
      )}
      {sharePosterOpen && shareUrl && (
        <AgentShareModal
          agent={agent}
          shareUrl={shareUrl}
          creatorName={agent.authorName || authorExpert.name}
          creatorAvatar={authorExpert.avatar}
          onClose={() => setSharePosterOpen(false)}
          onCopied={() => onToast?.('链接已复制，发给别人即可打开')}
          onToast={onToast}
        />
      )}
    </div>
  );
};

/** @deprecated 使用 AgentDetailView 页内打开 */
export const AgentDetailModal = AgentDetailView;
