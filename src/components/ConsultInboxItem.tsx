import React from 'react';
import { consultNextAction, type UserNotificationItem } from '../lib/notificationInbox';

interface ConsultInboxItemProps {
  item: UserNotificationItem;
  compact?: boolean;
  onOpen: () => void;
}

export const ConsultInboxItem: React.FC<ConsultInboxItemProps> = ({ item, compact = false, onOpen }) => {
  const action = consultNextAction(item);
  return (
    <div
      className={`w-full text-left hover:bg-slate-50 transition-colors ${
        compact ? 'px-5 py-3.5' : 'px-6 lg:px-10 py-4 border-b border-slate-100'
      }`}
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
              className={`text-[13px] leading-5 ${
                item.unread ? 'text-slate-900 font-semibold' : 'text-slate-500'
              }`}
            >
              {item.title}
            </p>
            <span className="text-[11px] text-slate-400 shrink-0 mt-0.5">{item.time}</span>
          </div>
          {(item.body || item.agentTitle) && (
            <p className="text-[12px] text-slate-400 mt-0.5 line-clamp-2">
              {item.body || item.agentTitle}
            </p>
          )}
          <div className="mt-2 flex items-center gap-2">
            <button
              type="button"
              onClick={onOpen}
              className="px-2.5 py-1 rounded-lg bg-blue-600 text-white text-[11px] font-bold cursor-pointer hover:bg-blue-700"
            >
              {action.label}
            </button>
            <span className="text-[11px] text-slate-400">{action.hint}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
