import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Send } from 'lucide-react';
import { api, ApiError } from '../lib/api';
import { ensureMarketplaceSession } from '../lib/marketplaceAuth';
import {
  formatDmTime,
  useDmInbox,
  type DmMessage,
  type DmThread
} from '../lib/useDmInbox';

const MAX_BODY = 500;

function initials(name: string) {
  const text = name.trim();
  return text ? text.slice(0, 1) : '对';
}

function PeerAvatar({ name, avatar, size = 40 }: { name: string; avatar: string; size?: number }) {
  if (avatar) {
    return (
      <img
        src={avatar}
        alt=""
        referrerPolicy="no-referrer"
        className="rounded-full object-cover shrink-0 bg-slate-100"
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <span
      className="rounded-full bg-slate-200 text-slate-600 font-bold inline-flex items-center justify-center shrink-0"
      style={{ width: size, height: size, fontSize: size * 0.38 }}
    >
      {initials(name)}
    </span>
  );
}

export const DirectMessagePanel: React.FC<{
  variant?: 'page' | 'drawer';
  initialExpertId?: string | null;
  initialThreadId?: string | null;
  onUnreadChange?: () => void;
  onOpenInPage?: (opts: { threadId?: string; expertId?: string }) => void;
}> = ({
  variant = 'page',
  initialExpertId = null,
  initialThreadId = null,
  onUnreadChange,
  onOpenInPage
}) => {
  const enabled = variant === 'page' || variant === 'drawer';
  const { threads, unread, loading, refresh, setThreads } = useDmInbox(enabled);
  const [activeId, setActiveId] = useState<string | null>(initialThreadId);
  const [messages, setMessages] = useState<DmMessage[]>([]);
  const [activeThread, setActiveThread] = useState<DmThread | null>(null);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [opening, setOpening] = useState(false);
  const [error, setError] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);
  const openedExpertRef = useRef<string | null>(null);

  const selected = useMemo(
    () => threads.find((t) => t.id === activeId) || activeThread,
    [threads, activeId, activeThread]
  );

  useEffect(() => {
    if (initialThreadId) setActiveId(initialThreadId);
  }, [initialThreadId]);

  useEffect(() => {
    if (!initialExpertId || openedExpertRef.current === initialExpertId) return;
    openedExpertRef.current = initialExpertId;
    let cancelled = false;
    setOpening(true);
    void (async () => {
      try {
        await ensureMarketplaceSession();
        const thread = await api<DmThread>('/api/dm/threads', {
          method: 'POST',
          body: JSON.stringify({ expertId: initialExpertId })
        });
        if (cancelled) return;
        setThreads((prev) => {
          const rest = prev.filter((item) => item.id !== thread.id);
          return [thread, ...rest];
        });
        setActiveId(thread.id);
        setActiveThread(thread);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof ApiError ? err.message : '无法发起私信');
        }
      } finally {
        if (!cancelled) setOpening(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [initialExpertId, setThreads]);

  useEffect(() => {
    if (!activeId || variant === 'drawer') return;
    let cancelled = false;
    void (async () => {
      try {
        await ensureMarketplaceSession();
        const data = await api<{ thread: DmThread; messages: DmMessage[] }>(
          `/api/dm/threads/${activeId}/messages`
        );
        if (cancelled) return;
        setMessages(data.messages);
        setActiveThread(data.thread);
        setThreads((prev) => prev.map((item) => (item.id === data.thread.id ? data.thread : item)));
        onUnreadChange?.();
        void refresh();
      } catch (err) {
        if (!cancelled) setError(err instanceof ApiError ? err.message : '加载消息失败');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [activeId, variant]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, activeId]);

  const handleSelect = (thread: DmThread) => {
    setError('');
    if (variant === 'drawer' && onOpenInPage) {
      onOpenInPage({ threadId: thread.id, expertId: thread.expertId });
      return;
    }
    setActiveId(thread.id);
    setActiveThread(thread);
  };

  const send = async () => {
    if (!activeId || sending) return;
    const body = draft.trim();
    if (!body) return;
    setSending(true);
    setError('');
    try {
      await ensureMarketplaceSession();
      const data = await api<{ thread: DmThread; message: DmMessage }>(
        `/api/dm/threads/${activeId}/messages`,
        { method: 'POST', body: JSON.stringify({ body }) }
      );
      setDraft('');
      setMessages((prev) => [...prev, data.message]);
      setActiveThread(data.thread);
      setThreads((prev) => {
        const rest = prev.filter((item) => item.id !== data.thread.id);
        return [data.thread, ...rest];
      });
      onUnreadChange?.();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : '发送失败');
    } finally {
      setSending(false);
    }
  };

  const markAllRead = async () => {
    const unreadThreads = threads.filter((t) => t.unread > 0);
    if (!unreadThreads.length) return;
    await Promise.all(
      unreadThreads.map((t) =>
        api(`/api/dm/threads/${t.id}/read`, { method: 'POST', body: '{}' }).catch(() => null)
      )
    );
    await refresh();
    onUnreadChange?.();
  };

  const list = (
    <div className={`${variant === 'page' ? 'w-[280px] border-r border-slate-200' : 'w-full'} flex flex-col min-h-0`}>
      {variant === 'page' && (
        <div className="px-4 py-3 border-b border-slate-100 shrink-0">
          <p className="text-[13px] font-bold text-slate-900">会话</p>
          <p className="text-[11px] text-slate-400 mt-0.5">与创作者一对一沟通</p>
        </div>
      )}
      <div className="flex-1 overflow-y-auto">
        {loading && threads.length === 0 ? (
          <p className="px-5 py-10 text-center text-xs text-slate-400">加载中…</p>
        ) : threads.length === 0 ? (
          <div className="px-6 py-12 text-center text-slate-400">
            <p className="text-sm font-medium text-slate-600">暂无私信</p>
            <p className="text-xs mt-1 leading-5">可在创作者主页、智能体详情或工作台发消息</p>
          </div>
        ) : (
          threads.map((thread) => {
            const active = thread.id === activeId;
            return (
              <button
                key={thread.id}
                type="button"
                onClick={() => handleSelect(thread)}
                className={`w-full text-left px-4 py-3 flex items-start gap-3 cursor-pointer transition-colors ${
                  active ? 'bg-slate-50' : 'hover:bg-slate-50'
                }`}
              >
                <span className="relative shrink-0">
                  <PeerAvatar name={thread.peer.name} avatar={thread.peer.avatar} size={40} />
                  {thread.unread > 0 && (
                    <span className="absolute -top-1 -right-1 min-w-4 h-4 px-1 rounded-full bg-rose-500 text-white text-[10px] leading-4 text-center font-bold">
                      {thread.unread > 99 ? '99+' : thread.unread}
                    </span>
                  )}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center justify-between gap-2">
                    <span className="text-[13px] font-semibold text-slate-900 truncate">{thread.peer.name}</span>
                    <span className="text-[11px] text-slate-400 shrink-0">
                      {formatDmTime(thread.lastMessageAt || thread.createdAt)}
                    </span>
                  </span>
                  <span
                    className={`mt-0.5 block text-[12px] truncate ${
                      thread.unread > 0 ? 'text-slate-700 font-medium' : 'text-slate-400'
                    }`}
                  >
                    {thread.lastPreview || '暂无消息'}
                  </span>
                </span>
              </button>
            );
          })
        )}
      </div>
    </div>
  );

  if (variant === 'drawer') {
    return (
      <div className="flex-1 min-h-0 flex flex-col">
        {list}
        <div className="px-5 py-3.5 border-t border-slate-200 flex items-center justify-between shrink-0">
          <button
            type="button"
            onClick={() => void markAllRead()}
            disabled={unread === 0}
            className="text-[13px] text-slate-500 hover:text-slate-800 font-medium cursor-pointer disabled:text-slate-300 disabled:cursor-default"
          >
            全部已读
          </button>
          <button
            type="button"
            onClick={() => onOpenInPage?.({ threadId: activeId || undefined })}
            className="text-[13px] text-slate-500 hover:text-slate-800 font-medium cursor-pointer"
          >
            全部消息 &gt;
          </button>
        </div>
      </div>
    );
  }

  const remaining = MAX_BODY - draft.length;
  const blocked = Boolean(selected && !selected.canSend);

  return (
    <div className="flex-1 min-h-0 flex bg-white">
      {list}
      <div className="flex-1 min-w-0 flex flex-col">
        {!selected ? (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-400 px-8">
            <p className="text-sm font-medium text-slate-600">{opening ? '正在打开会话…' : '选择一个对话'}</p>
            <p className="text-xs mt-1">从左侧列表进入，或在创作者主页点「发私信」</p>
            {error ? <p className="text-xs text-rose-500 mt-3">{error}</p> : null}
          </div>
        ) : (
          <>
            <div className="h-14 px-5 border-b border-slate-200 flex items-center gap-3 shrink-0">
              <PeerAvatar name={selected.peer.name} avatar={selected.peer.avatar} size={32} />
              <div className="min-w-0">
                <p className="text-[14px] font-bold text-slate-900 truncate">{selected.peer.name}</p>
                <p className="text-[11px] text-slate-400">
                  {selected.peer.isCreator ? '创作者' : '用户'} · 私信
                </p>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3 bg-slate-50/70">
              {messages.length === 0 ? (
                <p className="text-center text-xs text-slate-400 pt-10">还没有消息，打个招呼吧</p>
              ) : (
                messages.map((item) => (
                  <div key={item.id} className={`flex ${item.mine ? 'justify-end' : 'justify-start'}`}>
                    <div
                      className={`max-w-[72%] rounded-2xl px-3.5 py-2 text-[13px] leading-5 whitespace-pre-wrap break-words ${
                        item.mine
                          ? 'bg-blue-600 text-white rounded-br-md'
                          : 'bg-white text-slate-800 border border-slate-200 rounded-bl-md'
                      }`}
                    >
                      {item.body}
                    </div>
                  </div>
                ))
              )}
              <div ref={bottomRef} />
            </div>
            <div className="px-5 py-3 border-t border-slate-200 bg-white shrink-0">
              {blocked ? (
                <p className="text-[12px] text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2 mb-2">
                  对方回复前最多发送 1 条消息
                </p>
              ) : null}
              {error ? <p className="text-[12px] text-rose-500 mb-2">{error}</p> : null}
              <div className="flex items-end gap-2">
                <textarea
                  value={draft}
                  maxLength={MAX_BODY}
                  disabled={blocked || sending}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      void send();
                    }
                  }}
                  placeholder={blocked ? '等待对方回复后可继续发送' : '输入消息，Enter 发送'}
                  rows={2}
                  className="flex-1 resize-none rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-[13px] text-slate-800 placeholder:text-slate-400 outline-none focus:border-slate-400 focus:bg-white disabled:text-slate-400"
                />
                <button
                  type="button"
                  disabled={blocked || sending || !draft.trim()}
                  onClick={() => void send()}
                  className="h-9 px-3.5 rounded-xl bg-slate-900 text-white text-[13px] font-semibold inline-flex items-center gap-1.5 cursor-pointer hover:bg-slate-800 disabled:opacity-40 disabled:cursor-default"
                >
                  <Send size={13} />
                  发送
                </button>
              </div>
              {remaining <= 100 ? (
                <p className="text-[11px] text-slate-400 mt-1.5 text-right">还可输入 {remaining} 字</p>
              ) : null}
            </div>
          </>
        )}
      </div>
    </div>
  );
};
