import React from 'react';
import { Eye, Heart, MapPin } from 'lucide-react';
import type { PublicInspiration } from '../lib/inspiration';

function formatCount(n: number) {
  if (n >= 10000) return `${(n / 10000).toFixed(1)}w`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
}

export const InspirationFeed: React.FC<{
  items: PublicInspiration[];
  loading?: boolean;
  onOpen: (item: PublicInspiration) => void;
}> = ({ items, loading, onOpen }) => {
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
        <button
          key={item.id}
          type="button"
          onClick={() => onOpen(item)}
          className="group text-left bg-white rounded-2xl overflow-hidden border border-slate-200/80 hover:border-slate-300 hover:shadow-md transition-all cursor-pointer"
        >
          <div className="relative aspect-[3/4] bg-slate-100 overflow-hidden">
            <img
              src={item.imageUrl}
              alt={item.title}
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-300"
            />
            <span className="absolute top-2 left-2 px-1.5 py-0.5 rounded-md bg-black/55 text-white text-[10px] font-bold">
              {item.agent.category || '成果'}
            </span>
            <div className="absolute inset-x-0 bottom-0 p-2.5 bg-gradient-to-t from-black/70 via-black/25 to-transparent">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 min-w-0">
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
                <span className="inline-flex items-center gap-2 text-[10px] text-white/90 shrink-0">
                  <span className="inline-flex items-center gap-0.5">
                    <Eye size={11} />
                    {formatCount(Math.max(item.likesCount * 8, 12))}
                  </span>
                  <span className="inline-flex items-center gap-0.5">
                    <Heart size={11} />
                    {formatCount(item.likesCount)}
                  </span>
                </span>
              </div>
            </div>
          </div>
          <div className="px-2.5 py-2 space-y-1">
            <p className="text-[13px] font-semibold text-slate-900 line-clamp-2 leading-snug">
              {item.title}
            </p>
            <p className="flex items-center gap-1 text-[11px] text-slate-400 truncate">
              <MapPin size={11} className="shrink-0 text-amber-500" />
              <span className="truncate">{item.agent.title}</span>
            </p>
          </div>
        </button>
      ))}
    </div>
  );
};
