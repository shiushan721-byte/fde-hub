import React, { useEffect, useRef, useState } from 'react';
import { Plus, X } from 'lucide-react';
import { CreatorAgentItem } from '../types/creator';
import { api } from '../lib/api';
import {
  AGENT_DESC_MAX,
  AGENT_GALLERY_MAX,
  AGENT_GALLERY_MAX_BYTES,
  AGENT_TITLE_MAX,
  normalizeGalleryImages
} from '../../shared/agentGallery';

const PLATFORM_OPTIONS: Array<{ value: NonNullable<CreatorAgentItem['platformSupport']>; label: string }> = [
  { value: 'mac', label: 'macOS' },
  { value: 'windows', label: 'Windows' },
  { value: 'both', label: 'macOS 和 Windows' }
];

async function uploadImage(file: File) {
  const buf = await file.arrayBuffer();
  return api<{ url: string; fileName: string }>('/api/me/uploads/image', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/octet-stream',
      'X-File-Name': encodeURIComponent(file.name)
    },
    body: buf
  });
}

function RequiredLabel({ children }: { children: string }) {
  return (
    <label className="block text-sm font-semibold text-slate-800">
      <span className="text-rose-500 mr-0.5">*</span>
      {children}
    </label>
  );
}

export const AgentProfileEditor: React.FC<{
  agent: CreatorAgentItem;
  onSaved: (updated: CreatorAgentItem) => void;
}> = ({ agent, onSaved }) => {
  const [title, setTitle] = useState(agent.title.slice(0, AGENT_TITLE_MAX));
  const [desc, setDesc] = useState(agent.desc.slice(0, AGENT_DESC_MAX));
  const [images, setImages] = useState<string[]>(normalizeGalleryImages(agent.galleryImages, agent.coverImage));
  const [platformSupport, setPlatformSupport] = useState<NonNullable<CreatorAgentItem['platformSupport']>>(
    agent.platformSupport || 'both'
  );
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const fileRef = useRef<HTMLInputElement | null>(null);
  const dragFrom = useRef<number | null>(null);

  useEffect(() => {
    setTitle(agent.title.slice(0, AGENT_TITLE_MAX));
    setDesc(agent.desc.slice(0, AGENT_DESC_MAX));
    setImages(normalizeGalleryImages(agent.galleryImages, agent.coverImage));
    setPlatformSupport(agent.platformSupport || 'both');
    setError('');
  }, [agent.id, agent.title, agent.desc, agent.coverImage, agent.galleryImages, agent.platformSupport]);

  const onPickImages = async (files: FileList | null) => {
    if (!files?.length) return;
    const room = AGENT_GALLERY_MAX - images.length;
    if (room <= 0) return;
    setUploading(true);
    setError('');
    try {
      const nextUrls: string[] = [];
      for (const file of Array.from(files).slice(0, room)) {
        if (!/\.(png|jpe?g|webp|gif)$/i.test(file.name)) {
          throw new Error('请上传 png / jpg / webp / gif 图片');
        }
        if (file.size > AGENT_GALLERY_MAX_BYTES) {
          throw new Error('单张不超过 10MB');
        }
        const stored = await uploadImage(file);
        nextUrls.push(stored.url);
      }
      setImages((prev) => [...prev, ...nextUrls].slice(0, AGENT_GALLERY_MAX));
    } catch (err) {
      setError(err instanceof Error ? err.message : '图片上传失败');
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const moveImage = (from: number, to: number) => {
    if (from === to || from < 0 || to < 0 || from >= images.length || to >= images.length) return;
    setImages((prev) => {
      const next = [...prev];
      const [item] = next.splice(from, 1);
      next.splice(to, 0, item);
      return next;
    });
  };

  const save = async () => {
    const nextTitle = title.trim();
    const nextDesc = desc.trim();
    if (!images.length) {
      setError('请上传展示图片');
      return;
    }
    if (!nextTitle) {
      setError('请填写智能体名称');
      return;
    }
    if (!nextDesc) {
      setError('请填写智能体描述');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const saved = await api<CreatorAgentItem>(`/api/me/agents/${agent.id}/profile`, {
        method: 'PATCH',
        body: JSON.stringify({
          title: nextTitle,
          desc: nextDesc,
          galleryImages: images,
          platformSupport
        })
      });
      onSaved({ ...agent, ...saved });
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存失败');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      <input
        ref={fileRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif"
        multiple
        className="hidden"
        onChange={(e) => void onPickImages(e.target.files)}
      />

      <div className="space-y-2">
        <RequiredLabel>智能体展示图片</RequiredLabel>
        <div className="flex flex-wrap gap-3">
          {images.map((url, index) => (
            <div
              key={`${url}-${index}`}
              draggable
              onDragStart={() => {
                dragFrom.current = index;
              }}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                if (dragFrom.current == null) return;
                moveImage(dragFrom.current, index);
                dragFrom.current = null;
              }}
              className="relative w-28 h-20 rounded-2xl overflow-hidden bg-slate-100 border border-slate-200 cursor-grab active:cursor-grabbing group"
            >
              <img src={url} alt="" className="w-full h-full object-cover" />
              {index === 0 && (
                <span className="absolute left-1.5 bottom-1.5 px-1.5 py-0.5 rounded-md bg-black/55 text-white text-[10px] font-bold">
                  封面
                </span>
              )}
              <button
                type="button"
                onClick={() => setImages((prev) => prev.filter((_, i) => i !== index))}
                className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/55 text-white hidden group-hover:flex items-center justify-center cursor-pointer"
                title="移除"
              >
                <X size={12} />
              </button>
            </div>
          ))}
          {images.length < AGENT_GALLERY_MAX && (
            <button
              type="button"
              disabled={uploading}
              onClick={() => fileRef.current?.click()}
              className="w-28 h-20 rounded-2xl bg-slate-100 text-slate-400 text-xs font-medium cursor-pointer disabled:opacity-60 inline-flex flex-col items-center justify-center gap-1"
            >
              <Plus size={16} />
              {uploading ? '上传中…' : '上传图片'}
            </button>
          )}
        </div>
        <p className="text-xs text-slate-400">第一张默认为封面，可拖拽排序。最多 6 张，建议 16:9，单张不超过 10MB。</p>
      </div>

      <div className="space-y-2">
        <RequiredLabel>智能体名称</RequiredLabel>
        <div className="relative">
          <input
            value={title}
            maxLength={AGENT_TITLE_MAX}
            onChange={(e) => setTitle(e.target.value.slice(0, AGENT_TITLE_MAX))}
            placeholder="请输入智能体名称"
            className="w-full h-11 px-4 pr-14 rounded-2xl border border-slate-200 bg-white text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:border-blue-400"
          />
          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-slate-400 tabular-nums">
            {title.length}/{AGENT_TITLE_MAX}
          </span>
        </div>
      </div>

      <div className="space-y-2">
        <RequiredLabel>智能体描述</RequiredLabel>
        <div className="relative">
          <textarea
            value={desc}
            maxLength={AGENT_DESC_MAX}
            rows={4}
            onChange={(e) => setDesc(e.target.value.slice(0, AGENT_DESC_MAX))}
            placeholder="例如：自动解析海外竞品痛点，生成符合当地语境的高转化 Listing 标题与详情页"
            className="w-full min-h-[108px] px-4 pt-3 pb-8 rounded-2xl border border-slate-200 bg-white text-sm text-slate-900 placeholder:text-slate-400 outline-none resize-none focus:border-blue-400 leading-relaxed"
          />
          <span className="absolute right-4 bottom-3 text-xs text-slate-400 tabular-nums">
            {desc.length}/{AGENT_DESC_MAX}
          </span>
        </div>
      </div>

      <div className="space-y-2">
        <RequiredLabel>适配系统</RequiredLabel>
        <div className="flex flex-wrap gap-2">
          {PLATFORM_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setPlatformSupport(option.value)}
              className={`h-9 px-4 rounded-full text-sm border cursor-pointer ${
                platformSupport === option.value
                  ? 'bg-slate-900 text-white border-slate-900'
                  : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {error && <p className="text-xs text-rose-600">{error}</p>}

      <div className="flex justify-end">
        <button
          type="button"
          disabled={saving || uploading}
          onClick={() => void save()}
          className="px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-bold cursor-pointer disabled:opacity-50"
        >
          {saving ? '保存中…' : '保存资料'}
        </button>
      </div>
    </div>
  );
};
