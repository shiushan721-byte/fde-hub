import React, { useEffect, useMemo, useState } from 'react';
import { X, Bell, Bot, CheckCircle2, MessageCircle, Sparkles, ShieldAlert } from 'lucide-react';
import { CustomerLeadItem } from '../types/creator';
import { api } from '../lib/api';
import { ensureMarketplaceSession } from '../lib/marketplaceAuth';

export interface UserNotificationItem {
  id: string;
  title: string;
  body: string;
  time: string;
  agentTitle?: string;
  unread?: boolean;
  kind: 'submitted' | 'creator_reply' | 'status' | 'ops_review';
}

export const mockUserNotifications: UserNotificationItem[] = [
  {
    id: 'ntf_reply_geo',
    kind: 'creator_reply',
    title: '创作者已回复你的定制需求',
    body: 'Maya：专属 GEO 看板本周可出初版，先按你们的美妆品类词包跑一轮。',
    time: '12 分钟前',
    agentTitle: 'GEO 助手',
    unread: true
  },
  {
    id: 'ntf_status_cs',
    kind: 'status',
    title: '定制需求已受理',
    body: '林然已开始评估聚水潭 ERP 与钉钉售后群对接，预计本周给出联调清单。',
    time: '1 小时前',
    agentTitle: '电商全渠道客服自愈智能体',
    unread: true
  },
  {
    id: 'ntf_saved_qa',
    kind: 'submitted',
    title: '定制需求已保存',
    body: '「制造行业设备维修与故障诊断智能体」已提交。有进展时会在此提醒，无需留言跟进。',
    time: '昨天',
    agentTitle: '制造行业设备维修与故障诊断智能体',
    unread: false
  }
];

interface ConsultationMessagesDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  leads: CustomerLeadItem[];
}

const kindIcon = (kind: UserNotificationItem['kind']) => {
  if (kind === 'creator_reply') return <MessageCircle size={14} className="text-blue-600" />;
  if (kind === 'ops_review') return <ShieldAlert size={14} className="text-violet-600" />;
  if (kind === 'status') return <Sparkles size={14} className="text-amber-600" />;
  return <CheckCircle2 size={14} className="text-emerald-600" />;
};

function formatRelativeTime(iso: string) {
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return iso;
  const diff = Date.now() - t;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return '刚刚';
  if (mins < 60) return `${mins} 分钟前`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} 小时前`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} 天前`;
  return new Date(iso).toLocaleString('zh-CN');
}

function mapApiTypeToKind(type: string): UserNotificationItem['kind'] {
  if (type.includes('comment_report')) return 'submitted';
  if (
    type.includes('review') ||
    type.includes('delivery_ready') ||
    type.includes('agent_review') ||
    type.includes('rejected') ||
    type.includes('approved') ||
    type.includes('offline')
  ) {
    return 'ops_review';
  }
  if (type.includes('reply')) return 'creator_reply';
  if (type.includes('status') || type.includes('accepted')) return 'status';
  return 'submitted';
}

export const ConsultationMessagesDrawer: React.FC<ConsultationMessagesDrawerProps> = ({
  isOpen,
  onClose,
  leads
}) => {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [apiNotifications, setApiNotifications] = useState<UserNotificationItem[]>([]);

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    (async () => {
      try {
        await ensureMarketplaceSession();
        const items = await api<
          Array<{
            id: string;
            type: string;
            title: string;
            body: string;
            read: boolean;
            createdAt: string;
            payload?: { agentTitle?: string; reason?: string };
          }>
        >('/api/me/notifications');
        if (cancelled) return;
        setApiNotifications(
          items.map((n) => ({
            id: n.id,
            kind: mapApiTypeToKind(n.type),
            title: n.title,
            body: n.body,
            time: formatRelativeTime(n.createdAt),
            agentTitle:
              typeof n.payload?.agentTitle === 'string' ? n.payload.agentTitle : undefined,
            unread: !n.read
          }))
        );
        const hasUnread = items.some((n) => !n.read);
        if (hasUnread) {
          await api('/api/me/notifications/read-all', { method: 'POST', body: '{}' });
        }
      } catch {
        if (!cancelled) setApiNotifications([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isOpen]);

  const notifications = useMemo(() => {
    const fromLeads: UserNotificationItem[] = leads.flatMap((lead) => {
      const items: UserNotificationItem[] = [
        {
          id: `${lead.id}_submitted`,
          kind: 'submitted',
          title: '定制需求已保存',
          body: lead.agentId
            ? `「${lead.agentTitle}」已提交给创作者。有进展时会在此提醒你。`
            : '已向专家提交咨询需求。有进展时会在此提醒你。',
          time: lead.lastActivity,
          agentTitle: lead.agentTitle,
          unread: true
        }
      ];
      (lead.messages || [])
        .filter((msg) => msg.sender === 'creator')
        .forEach((msg) => {
          items.push({
            id: msg.id,
            kind: 'creator_reply',
            title: `${msg.senderName} 回复了你的定制需求`,
            body: msg.text,
            time: msg.time,
            agentTitle: lead.agentTitle,
            unread: true
          });
        });
      return items;
    });
    const apiIds = new Set(apiNotifications.map((n) => n.id));
    const mocks = mockUserNotifications.filter((n) => !apiIds.has(n.id));
    return [...apiNotifications, ...fromLeads, ...mocks];
  }, [leads, apiNotifications]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-slate-950/40" onClick={onClose} />
      <div className="relative w-full max-w-lg h-full bg-white shadow-2xl flex flex-col border-l border-slate-200">
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between shrink-0">
          <div className="flex items-start gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <Bell size={16} />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">消息提醒</h2>
              <p className="text-[11px] text-slate-500 mt-0.5">含平台智能体审核、下架与驳回通知</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {notifications.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center px-8 text-slate-400">
            <Bell size={36} className="mb-3 text-slate-300" />
            <p className="text-sm font-medium text-slate-600">暂无消息提醒</p>
            <p className="text-xs mt-1">保存定制需求或智能体审核有结果时，会显示在这里</p>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto">
            {notifications.map((item) => {
              const expanded = expandedId === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setExpandedId(expanded ? null : item.id)}
                  className={`w-full text-left px-5 py-4 border-b border-slate-100 cursor-pointer transition-colors ${
                    item.unread ? 'bg-blue-50/40' : 'bg-white hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center shrink-0 mt-0.5">
                      {kindIcon(item.kind)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-3">
                        <p className="text-xs font-bold text-slate-900">{item.title}</p>
                        <span className="text-[10px] text-slate-400 shrink-0">{item.time}</span>
                      </div>
                      {item.agentTitle && (
                        <p className="text-[10px] text-blue-600 font-semibold mt-0.5 flex items-center gap-1">
                          <Bot size={11} />
                          {item.agentTitle}
                        </p>
                      )}
                      <p
                        className={`text-[11px] text-slate-600 mt-1 leading-relaxed whitespace-pre-line ${
                          expanded ? '' : 'line-clamp-2'
                        }`}
                      >
                        {item.body}
                      </p>
                    </div>
                    {item.unread && (
                      <span className="w-2 h-2 rounded-full bg-blue-600 shrink-0 mt-1.5" />
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
