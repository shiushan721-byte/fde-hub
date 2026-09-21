import { useCallback, useEffect, useState } from 'react';
import { api } from './api';
import { ensureMarketplaceSession } from './marketplaceAuth';
import { formatInboxTime } from './notificationInbox';

export type DmPeer = {
  id: string;
  expertId: string;
  name: string;
  avatar: string;
  isCreator: boolean;
};

export type DmThread = {
  id: string;
  expertId: string;
  peer: DmPeer;
  lastPreview: string;
  lastMessageAt: string | null;
  unread: number;
  canSend: boolean;
  waitingReply: boolean;
  createdAt: string;
};

export type DmMessage = {
  id: string;
  senderId: string;
  mine: boolean;
  body: string;
  createdAt: string;
};

export function formatDmTime(iso?: string | null) {
  if (!iso) return '';
  return formatInboxTime(iso);
}

export function useDmInbox(enabled: boolean) {
  const [threads, setThreads] = useState<DmThread[]>([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    try {
      await ensureMarketplaceSession();
      const [items, unreadRes] = await Promise.all([
        api<DmThread[]>('/api/dm/threads'),
        api<{ count: number }>('/api/dm/unread')
      ]);
      setThreads(items);
      setUnread(unreadRes.count || 0);
    } catch {
      setThreads([]);
      setUnread(0);
    }
  }, []);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    setLoading(true);
    void refresh().finally(() => {
      if (!cancelled) setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [enabled, refresh]);

  return { threads, unread, loading, refresh, setThreads };
}
