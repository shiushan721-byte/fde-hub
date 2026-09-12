import React, { useEffect, useMemo, useState } from 'react';
import { Calendar, ChevronRight, Search } from 'lucide-react';
import { CustomerLeadItem } from '../types/creator';
import {
  INBOX_TABS,
  type InboxChannel,
  type InboxReadFilter,
  type UserNotificationItem
} from '../lib/notificationInbox';
import { useInboxNotifications } from '../lib/useInboxNotifications';
import type { NotificationNavigationTarget } from '../lib/notificationNavigation';
import { ConsultInboxItem } from './ConsultInboxItem';

interface MessagesInboxViewProps {
  leads: CustomerLeadItem[];
  initialTab?: InboxChannel;
  onNavigate?: (target: NotificationNavigationTarget) => void;
  onUnreadChange?: () => void;
}

const READ_FILTERS: Array<{ key: InboxReadFilter; label: string }> = [
  { key: 'all', label: '全部' },
  { key: 'unread', label: '未读' },
  { key: 'read', label: '已读' }
];

function sameDay(iso: string | undefined, ymd: string) {
  if (!iso || !ymd) return false;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso.slice(0, 10) === ymd;
  const local = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  return local === ymd;
}

export const MessagesInboxView: React.FC<MessagesInboxViewProps> = ({
  leads,
  initialTab = 'activity',
  onNavigate,
  onUnreadChange
}) => {
  const [activeTab, setActiveTab] = useState<InboxChannel>(initialTab);
  const [readFilter, setReadFilter] = useState<InboxReadFilter>('all');
  const [query, setQuery] = useState('');
  const [date, setDate] = useState('');
  const { notifications, unreadByChannel, markRead } = useInboxNotifications(true, leads);

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return notifications.filter((item) => {
      if (item.channel !== activeTab) return false;
      if (readFilter === 'unread' && !item.unread) return false;
      if (readFilter === 'read' && item.unread) return false;
      if (date && !sameDay(item.createdAt, date)) return false;
      if (q) {
        const hay = `${item.title} ${item.body} ${item.agentTitle || ''}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [notifications, activeTab, readFilter, query, date]);

  const handleItemClick = async (item: UserNotificationItem) => {
    if (item.unread) {
      await markRead([item.id]);
      onUnreadChange?.();
    }
    if (item.navigationTarget && onNavigate) onNavigate(item.navigationTarget);
  };

  return (
    <div className="min-h-full bg-white">
      <div className="px-6 lg:px-10 pt-5">
        <div className="flex items-end gap-6">
          {INBOX_TABS.map((tab) => {
            const unread = unreadByChannel[tab.key];
            const active = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={`relative pb-3 text-[15px] font-bold cursor-pointer transition-colors ${
                  active ? 'text-slate-900' : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                <span className="inline-flex items-center gap-1.5">
                  {tab.label}
                  {unread > 0 && (
                    <span className="min-w-4 h-4 px-1 rounded-full bg-rose-500 text-white text-[10px] leading-4 text-center font-bold">
                      {unread > 99 ? '99+' : unread}
                    </span>
                  )}
                </span>
                {active && (
                  <span className="absolute left-0 right-0 -bottom-px h-0.5 bg-slate-900 rounded-full" />
                )}
              </button>
            );
          })}
        </div>
        <div className="border-b border-slate-200" />
      </div>

      <div className="px-6 lg:px-10 py-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          {READ_FILTERS.map((item) => {
            const active = readFilter === item.key;
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => setReadFilter(item.key)}
                className={`h-7 px-3 rounded-full text-xs font-semibold cursor-pointer transition-colors ${
                  active
                    ? 'bg-slate-800 text-white'
                    : 'bg-white text-slate-500 border border-slate-200 hover:text-slate-700'
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </div>
        <div className="flex items-center gap-2">
          <label className="relative flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-400 hover:text-slate-600 cursor-pointer">
            <Calendar size={14} />
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="absolute inset-0 opacity-0 cursor-pointer"
              title="按日期筛选"
            />
          </label>
          <div className="relative w-56">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="搜索消息"
              className="h-8 w-full rounded-lg border border-slate-200 bg-white pl-8 pr-3 text-xs text-slate-700 placeholder:text-slate-400 outline-none focus:border-slate-400"
            />
          </div>
        </div>
      </div>

      {visible.length === 0 ? (
        <div className="px-6 lg:px-10 py-24 text-center text-slate-400">
          <p className="text-sm font-medium text-slate-600">暂无{INBOX_TABS.find((t) => t.key === activeTab)?.label}</p>
          <p className="text-xs mt-1">
            {activeTab === 'consult' ? '有待处理的咨询时会显示在这里' : '换个筛选条件试试，或等待新消息'}
          </p>
        </div>
      ) : (
        <div className="pb-10">
          {visible.map((item) =>
            activeTab === 'consult' ? (
              <ConsultInboxItem
                key={item.id}
                item={item}
                onOpen={() => void handleItemClick(item)}
              />
            ) : (
              <button
                key={item.id}
                type="button"
                onClick={() => void handleItemClick(item)}
                className="w-full text-left px-6 lg:px-10 py-3.5 cursor-pointer hover:bg-slate-50 transition-colors border-b border-slate-100"
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                      item.unread ? 'bg-rose-500' : 'bg-slate-200'
                    }`}
                  />
                  <p
                    className={`min-w-0 flex-1 truncate text-[13px] ${
                      item.unread ? 'text-slate-900 font-semibold' : 'text-slate-400'
                    }`}
                  >
                    {item.title}
                  </p>
                  <span className="text-[11px] text-slate-400 shrink-0">{item.time}</span>
                  <ChevronRight size={14} className="text-slate-300 shrink-0" />
                </div>
              </button>
            )
          )}
        </div>
      )}
    </div>
  );
};
