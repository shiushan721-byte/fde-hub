import { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from './api';
import { ensureMarketplaceSession } from './marketplaceAuth';
import {
  mapApiNotification,
  mergeInboxItems,
  unreadByChannel,
  type InboxApiRow,
  type UserNotificationItem
} from './notificationInbox';
import type { CustomerLeadItem } from '../types/creator';

export function useInboxNotifications(enabled: boolean, leads: CustomerLeadItem[]) {
  const [apiNotifications, setApiNotifications] = useState<UserNotificationItem[]>([]);
  const [localReadIds, setLocalReadIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    try {
      await ensureMarketplaceSession();
      const items = await api<InboxApiRow[]>('/api/me/notifications');
      setApiNotifications(items.map(mapApiNotification));
    } catch {
      setApiNotifications([]);
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

  const notifications = useMemo(
    () => mergeInboxItems(apiNotifications, leads, localReadIds),
    [apiNotifications, leads, localReadIds]
  );

  const markRead = useCallback(
    async (ids: string[]) => {
      if (!ids.length) return;
      setLocalReadIds((prev) => {
        const next = new Set(prev);
        ids.forEach((id) => next.add(id));
        return next;
      });
      const apiIds = new Set(apiNotifications.map((n) => n.id));
      await Promise.all(
        ids
          .filter((id) => apiIds.has(id))
          .map((id) =>
            api(`/api/me/notifications/${id}/read`, { method: 'POST', body: '{}' }).catch(() => null)
          )
      );
    },
    [apiNotifications]
  );

  return {
    notifications,
    unreadByChannel: unreadByChannel(notifications),
    loading,
    refresh,
    markRead
  };
}
