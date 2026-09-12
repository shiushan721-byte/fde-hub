import React, { useState } from 'react';
import { X } from 'lucide-react';
import { CustomerLeadItem } from '../types/creator';
import {
  INBOX_TABS,
  type InboxChannel,
  type UserNotificationItem
} from '../lib/notificationInbox';
import { useInboxNotifications } from '../lib/useInboxNotifications';
import { type NotificationNavigationTarget } from '../lib/notificationNavigation';
import { ConsultInboxItem } from './ConsultInboxItem';

export type { UserNotificationItem };

interface ConsultationMessagesDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  leads: CustomerLeadItem[];
  onNavigate?: (target: NotificationNavigationTarget) => void;
  onUnreadChange?: () => void;
  onOpenAllMessages?: (tab: InboxChannel) => void;
}

export const ConsultationMessagesDrawer: React.FC<ConsultationMessagesDrawerProps> = ({
  isOpen,
  onClose,
  leads,
  onNavigate,
  onUnreadChange,
  onOpenAllMessages
}) => {
  const [activeTab, setActiveTab] = useState<InboxChannel>('activity');
  const { notifications, unreadByChannel, markRead } = useInboxNotifications(isOpen, leads);

  const visible = notifications.filter((item) => item.channel === activeTab);
  const tabUnread = unreadByChannel[activeTab];

  const handleItemClick = async (item: UserNotificationItem) => {
    if (item.unread) {
      await markRead([item.id]);
      onUnreadChange?.();
    }
    if (item.navigationTarget && onNavigate) {
      onNavigate(item.navigationTarget);
      onClose();
    }
  };

  const markTabRead = async () => {
    const ids = visible.filter((item) => item.unread).map((item) => item.id);
    if (!ids.length) return;
    await markRead(ids);
    onUnreadChange?.();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-slate-950/40" onClick={onClose} />
      <div className="relative w-full max-w-[420px] h-full bg-white shadow-2xl flex flex-col border-l border-slate-200">
        <div className="px-5 pt-4 pb-0 shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-end gap-5">
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
            <button
              type="button"
              onClick={onClose}
              className="mb-3 p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
            >
              <X size={16} />
            </button>
          </div>
          <div className="border-b border-slate-200" />
        </div>

        {visible.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center px-8 text-slate-400">
            <p className="text-sm font-medium text-slate-600">
              暂无{INBOX_TABS.find((t) => t.key === activeTab)?.label}
            </p>
            <p className="text-xs mt-1">
              {activeTab === 'consult' ? '有待处理的咨询时会显示在这里' : '有新消息时会显示在这里'}
            </p>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto py-1">
            {visible.map((item) =>
              activeTab === 'consult' ? (
                <ConsultInboxItem
                  key={item.id}
                  item={item}
                  compact
                  onOpen={() => void handleItemClick(item)}
                />
              ) : (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => void handleItemClick(item)}
                  className="w-full text-left px-5 py-3.5 cursor-pointer hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-start gap-2.5">
                    <span
                      className={`mt-1.5 w-1.5 h-1.5 rounded-full shrink-0 ${
                        item.unread ? 'bg-rose-500' : 'bg-slate-200'
                      }`}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-3">
                        <p
                          className={`text-[13px] leading-5 line-clamp-2 ${
                            item.unread ? 'text-slate-900 font-semibold' : 'text-slate-400'
                          }`}
                        >
                          {item.title}
                        </p>
                        <span className="text-[11px] text-slate-400 shrink-0 mt-0.5">{item.time}</span>
                      </div>
                    </div>
                  </div>
                </button>
              )
            )}
          </div>
        )}

        <div className="px-5 py-3.5 border-t border-slate-200 flex items-center justify-between shrink-0">
          <button
            type="button"
            onClick={() => void markTabRead()}
            disabled={tabUnread === 0}
            className="text-[13px] text-slate-500 hover:text-slate-800 font-medium cursor-pointer disabled:text-slate-300 disabled:cursor-default"
          >
            全部已读
          </button>
          <button
            type="button"
            onClick={() => onOpenAllMessages?.(activeTab)}
            className="text-[13px] text-slate-500 hover:text-slate-800 font-medium cursor-pointer"
          >
            全部消息 &gt;
          </button>
        </div>
      </div>
    </div>
  );
};
