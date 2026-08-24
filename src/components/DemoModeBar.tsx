import React from 'react';
import { Database, LayoutDashboard, RefreshCw } from 'lucide-react';
import { useCatalog } from '../lib/catalog';

interface DemoModeBarProps {
  onOpenAdmin: () => void;
}

export const DemoModeBar: React.FC<DemoModeBarProps> = ({ onOpenAdmin }) => {
  const { source, setSource, loading, error, refresh } = useCatalog();

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[70] flex items-center gap-2 px-2 py-1.5 bg-slate-950/95 text-white rounded-2xl shadow-2xl border border-white/10 backdrop-blur-md">
      <span className="text-[10px] font-bold text-slate-400 pl-2 hidden sm:inline">演示数据</span>
      <div className="flex p-0.5 bg-white/10 rounded-xl">
        <button
          type="button"
          onClick={() => setSource('mock')}
          className={`px-2.5 py-1 rounded-lg text-[11px] font-bold cursor-pointer ${
            source === 'mock' ? 'bg-white text-slate-950' : 'text-slate-300 hover:text-white'
          }`}
        >
          本地 Mock
        </button>
        <button
          type="button"
          onClick={() => setSource('api')}
          className={`px-2.5 py-1 rounded-lg text-[11px] font-bold cursor-pointer ${
            source === 'api' ? 'bg-emerald-400 text-slate-950' : 'text-slate-300 hover:text-white'
          }`}
        >
          后台数据
        </button>
      </div>
      {source === 'api' && (
        <button
          type="button"
          onClick={refresh}
          className="p-1.5 rounded-lg hover:bg-white/10 cursor-pointer"
          title="刷新后台数据"
        >
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
        </button>
      )}
      {error && source === 'api' && (
        <span className="text-[10px] text-amber-300 max-w-[180px] truncate" title={error}>
          {error}
        </span>
      )}
      <button
        type="button"
        onClick={onOpenAdmin}
        className="px-2.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-[11px] font-bold flex items-center gap-1 cursor-pointer"
      >
        {source === 'api' ? <Database size={12} /> : <LayoutDashboard size={12} />}
        管理后台
      </button>
    </div>
  );
};
