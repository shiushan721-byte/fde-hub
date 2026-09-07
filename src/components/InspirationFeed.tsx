import React, { useState } from 'react';
import { Heart, MapPin } from 'lucide-react';
import { togglePublicInspirationLike, type PublicInspiration } from '../lib/inspiration';

function formatCount(n: number) {
  if (n >= 10000) return `${(n / 10000).toFixed(1)}w`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
}

export const InspirationFeed: React.FC<{
  items: PublicInspiration[];
  loading?: boolean;
  onOpen: (item: PublicInspiration) => void;
  onLikeChange?: (id: string, next: { liked: boolean; likesCount: number }) => void;
  onToast?: (message: string) => void;
}> = ({ items, loading, onOpen, onLikeChange, onToast }) => {
  const [busyId, setBusyId] = useState('');

  const toggleLike = async (item: PublicInspiration, event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    if (busyId === item.id) return;
    setBusyId(item.id);
    const liked = Boolean(item.liked);
    const optimistic = {
      liked: !liked,
      likesCount: Math.max(0, item.likesCount + (liked ? -1 : 1))
    };
    onLikeChange?.(item.id, optimistic);
    try {
      const next = await togglePublicInspirationLike(item.id);
      onLikeChange?.(item.id, next);
    } catch (err) {
      onLikeChange?.(item.id, { liked, likesCount: item.likesCount });
      onToast?.(err instanceof Error ? err.message : '点赞失败，请先登录后重试');
    } finally {
      setBusyId('');
    }
  };

  if (loading) {
    return <p className="text-sm text-slate-400 px-1">灵感加载中…</p>;
  }
  if (items.length === 0) {
    return (
      <p className="text-sm text-slate-400 text-center py-16">
        暂无运营推荐的成果。作者精选或后台推荐后会出现在这里。
      </p>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
      {items.map((item) => (
        <article
          key={item.id}
          className="group text-left bg-white rounded-2xl overflow-hidden border border-slate-200/80 hover:border-slate-300 hover:shadow-md transition-all"
        >
          <div className="relative aspect-[3/4] bg-slate-100 overflow-hidden">
            <button
              type="button"
              onClick={() => onOpen(item)}
              className="block w-full h-full cursor-pointer"
            >
              <img
                src={item.imageUrl}
                alt={item.title}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-300"
              />
              <div className="absolute inset-x-0 bottom-0 p-2.5 bg-gradient-to-t from-black/70 via-black/25 to-transparent">
                <div className="flex items-center gap-1.5 min-w-0 pr-16">
                  {item.user.avatar ? (
                    <img
                      src={item.user.avatar}
                      alt=""
                      className="w-5 h-5 rounded-full object-cover border border-white/40"
                    />
                  ) : (
                    <span className="w-5 h-5 rounded-full bg-white/30" />
                  )}
                  <span className="text-[11px] text-white/95 truncate">{item.user.name}</span>
                </div>
              </div>
            </button>
            <button
              type="button"
              disabled={busyId === item.id}
              onClick={(event) => void toggleLike(item, event)}
              className={`absolute bottom-2.5 right-2.5 z-10 inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-bold cursor-pointer disabled:opacity-60 ${
                item.liked ? 'text-rose-200' : 'text-white/95 hover:text-rose-200'
              }`}
            >
              <Heart size={12} className={item.liked ? 'fill-rose-400 text-rose-400' : ''} />
              {item.likesCount > 0 ? formatCount(item.likesCount) : '点赞'}
            </button>
          </div>
          <button
            type="button"
            onClick={() => onOpen(item)}
            className="w-full px-2.5 py-2 space-y-1 text-left cursor-pointer"
          >
            <p className="text-[13px] font-semibold text-slate-900 line-clamp-2 leading-snug">
              {item.title}
            </p>
            <p className="flex items-center gap-1 text-[11px] text-slate-400 truncate">
              <MapPin size={11} className="shrink-0 text-amber-500" />
              <span className="truncate">{item.agent.title}</span>
            </p>
          </button>
        </article>
      ))}
    </div>
  );
};
