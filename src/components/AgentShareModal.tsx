import React, { useRef, useState } from 'react';
import { Copy, Download, Fingerprint, X } from 'lucide-react';
import { HellomeAgentItem } from '../data/mockData';
import { qrCodeImageUrl } from '../lib/agentShare';

interface AgentShareModalProps {
  agent: HellomeAgentItem;
  shareUrl: string;
  creatorName: string;
  creatorAvatar: string;
  onClose: () => void;
  onCopied: () => void;
  onToast?: (message: string) => void;
}

export const AgentShareModal: React.FC<AgentShareModalProps> = ({
  agent,
  shareUrl,
  creatorName,
  creatorAvatar,
  onClose,
  onCopied,
  onToast
}) => {
  const posterRef = useRef<HTMLDivElement>(null);
  const [saving, setSaving] = useState(false);
  const nowLabel = new Date().toLocaleString('zh-CN', {
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      onCopied();
    } catch {
      onToast?.('复制失败，请手动复制链接');
    }
  };

  const saveImage = async () => {
    const node = posterRef.current;
    if (!node) return;
    setSaving(true);
    try {
      const { toPng } = await import('html-to-image');
      const dataUrl = await toPng(node, {
        cacheBust: true,
        pixelRatio: 2,
        backgroundColor: '#2b7fff'
      });
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = `${agent.title || 'agent'}-share.png`;
      a.click();
      onToast?.('图片已保存');
    } catch {
      onToast?.('保存失败，可直接截图分享');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-slate-950/55 backdrop-blur-sm"
      onClick={onClose}
    >
      <div className="w-full max-w-[380px] space-y-3" onClick={(e) => e.stopPropagation()}>
        <div
          ref={posterRef}
          className="relative rounded-[28px] overflow-hidden shadow-2xl bg-[#2b7fff] px-4 pt-6 pb-4"
        >
          <div className="pointer-events-none absolute -top-8 right-[-24px] w-36 h-36 rounded-full bg-white/10" />
          <div className="pointer-events-none absolute top-10 right-8 w-20 h-20 rounded-full bg-sky-200/25" />

          <div className="relative px-2 pb-5">
            <h2 className="text-white text-[22px] font-black leading-snug tracking-tight">
              {agent.title}
            </h2>
            <p className="text-white/80 text-[12px] mt-1.5">来自 {creatorName}</p>
          </div>

          <div className="relative bg-white rounded-[22px] p-4 space-y-3.5 shadow-sm overflow-hidden">
            <div className="flex items-center gap-2.5">
              <img
                src={creatorAvatar}
                alt=""
                crossOrigin="anonymous"
                referrerPolicy="no-referrer"
                className="w-9 h-9 rounded-full object-cover bg-slate-100"
              />
              <div className="min-w-0">
                <div className="text-[13px] font-bold text-slate-900 truncate">{creatorName}</div>
                <div className="text-[11px] text-slate-400">{nowLabel}</div>
              </div>
            </div>

            <p className="text-[13px] text-slate-600 leading-relaxed line-clamp-4">{agent.desc}</p>

            <div className="rounded-xl overflow-hidden bg-slate-100">
              <img
                src={agent.coverImage}
                alt={agent.title}
                crossOrigin="anonymous"
                referrerPolicy="no-referrer"
                className="w-full aspect-[16/9] object-cover"
              />
            </div>

            <div className="relative flex items-end justify-between gap-3 pt-1 min-h-[92px]">
              <Fingerprint
                size={88}
                className="pointer-events-none absolute -left-3 bottom-[-10px] text-blue-100"
                strokeWidth={1.15}
              />
              <div className="relative z-[1] flex items-center gap-1.5 pb-1 text-[#2b7fff]">
                <Fingerprint size={22} strokeWidth={2.1} />
                <span className="text-[13px] font-semibold">查看更多</span>
              </div>
              <img
                src={qrCodeImageUrl(shareUrl, 176)}
                alt="分享二维码"
                crossOrigin="anonymous"
                className="relative z-[1] w-[84px] h-[84px] rounded-full bg-white p-1.5 ring-1 ring-slate-200 object-cover"
              />
            </div>
          </div>

          <div className="text-center text-white/85 text-[11px] mt-3.5 leading-relaxed">
            <div>Hellome 提供技术支持</div>
            <div className="text-white/70">hellome.art</div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-3 flex items-center gap-2 shadow-xl">
          <button
            type="button"
            onClick={() => void copyLink()}
            className="flex-1 h-10 rounded-xl bg-slate-900 text-white text-xs font-bold cursor-pointer inline-flex items-center justify-center gap-1.5"
          >
            <Copy size={14} />
            复制链接
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={() => void saveImage()}
            className="flex-1 h-10 rounded-xl border border-slate-200 text-slate-800 text-xs font-bold cursor-pointer inline-flex items-center justify-center gap-1.5 disabled:opacity-60"
          >
            <Download size={14} />
            {saving ? '生成中…' : '保存图片'}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="h-10 w-10 rounded-xl border border-slate-200 text-slate-500 cursor-pointer inline-flex items-center justify-center"
            aria-label="关闭"
          >
            <X size={16} />
          </button>
        </div>
      </div>
    </div>
  );
};
