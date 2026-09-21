import React, { useEffect, useRef, useState } from 'react';
import { Paperclip, Plus, Trash2, Upload } from 'lucide-react';
import { CreatorAgentItem } from '../types/creator';
import { api } from '../lib/api';
import {
  isOfficialProject,
  newCustomProjectId,
  newProductAttachmentId,
  normalizeCustomProjects,
  validateCustomProjects,
  type AgentCustomProject,
  type ProductAttachment
} from '../../shared/customProjects';
import { applyOfficialProductDefaults } from '../lib/useOfficialProducts';
import {
  MAX_STANDARD_SERVICES,
  SERVICE_SCOPE_FOOTER,
  standardServiceSummary
} from '../../shared/officialProductCatalog';

type UploadResult = { fileKey: string; url: string; fileName: string; size: string };

function parsePrice(raw: string) {
  const n = Number(raw);
  return Number.isFinite(n) && n >= 0 ? Math.round(n) : 0;
}

async function uploadRaw(path: string, file: File): Promise<UploadResult> {
  const buf = await file.arrayBuffer();
  return api<UploadResult>(path, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/octet-stream',
      'X-File-Name': encodeURIComponent(file.name)
    },
    body: buf
  });
}

export const AgentProductListEditor: React.FC<{
  agent: CreatorAgentItem;
  onSaved: (updated: CreatorAgentItem) => void;
}> = ({ agent, onSaved }) => {
  const [projects, setProjects] = useState<AgentCustomProject[]>(
    normalizeCustomProjects(agent.customProjects || [])
  );
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploadingKey, setUploadingKey] = useState('');
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const pendingUploadId = useRef('');

  const persist = async (nextProjects: AgentCustomProject[]) => {
    const invalidProjects = validateCustomProjects(nextProjects, { previousCount: projects.length });
    if (invalidProjects) throw new Error(invalidProjects);

    setSaving(true);
    setError('');
    try {
      const saved = await api<{
        canFDECustom: boolean;
        customProjects: AgentCustomProject[];
        omittedOfficialProductIds?: string[];
      }>(`/api/me/agents/${agent.id}/custom-projects`, {
        method: 'PUT',
        body: JSON.stringify({ enabled: true, projects: nextProjects })
      });
      setProjects(saved.customProjects);
      onSaved({
        ...agent,
        fdeCustomEnabled: saved.canFDECustom,
        customProjects: saved.customProjects,
        omittedOfficialProductIds: saved.omittedOfficialProductIds || agent.omittedOfficialProductIds,
        updatedAt: '刚刚'
      });
    } finally {
      setSaving(false);
    }
  };

  const saveSafe = async (nextProjects: AgentCustomProject[]) => {
    try {
      await persist(nextProjects);
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存失败');
    }
  };

  useEffect(() => {
    let cancelled = false;
    const saved = normalizeCustomProjects(agent.customProjects || []);
    void applyOfficialProductDefaults(saved, agent.omittedOfficialProductIds || []).then(async (next) => {
      if (cancelled) return;
      setProjects(next);
      const savedOfficial = new Set(saved.map((item) => item.officialProductId).filter(Boolean));
      const needsBring = next.some((item) => item.officialProductId && !savedOfficial.has(item.officialProductId));
      if (!needsBring) return;
      try {
        await persist(next);
      } catch {
        /* mock / 未登录时仍展示后台带过来的默认项 */
      }
    });
    return () => {
      cancelled = true;
    };
  }, [agent.id, agent.customProjects, agent.omittedOfficialProductIds]);

  const canAdd = projects.length < MAX_STANDARD_SERVICES;

  const pickFile = (id: string) => {
    pendingUploadId.current = id;
    fileInputRef.current?.click();
  };

  const onFilePicked = async (file?: File) => {
    const targetId = pendingUploadId.current;
    pendingUploadId.current = '';
    if (!file || !targetId) return;
    setUploadingKey(targetId);
    setError('');
    try {
      const stored = await uploadRaw('/api/me/uploads/attachment', file);
      const attachment: ProductAttachment = {
        id: newProductAttachmentId(),
        fileName: stored.fileName,
        size: stored.size,
        url: stored.url,
        fileKey: stored.fileKey
      };
      const nextProjects = projects.map((item) =>
        item.id === targetId ? { ...item, attachments: [...(item.attachments || []), attachment] } : item
      );
      setProjects(nextProjects);
      await persist(nextProjects);
    } catch (err) {
      setError(err instanceof Error ? err.message : '上传失败');
    } finally {
      setUploadingKey('');
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const addService = async () => {
    if (!canAdd) return;
    const item: AgentCustomProject = {
      id: newCustomProjectId(),
      title: '新标准服务',
      description: SERVICE_SCOPE_FOOTER,
      price: 200,
      active: false,
      sortOrder: projects.length,
      source: 'custom',
      createdAt: new Date().toISOString(),
      attachments: []
    };
    const next = [...projects, item];
    setProjects(next);
    setEditingKey(item.id);
    await saveSafe(next);
  };

  const removeService = async (id: string) => {
    const next = projects.filter((item) => item.id !== id);
    setProjects(next);
    if (editingKey === id) setEditingKey(null);
    await saveSafe(next);
  };

  const setListed = async (id: string, active: boolean) => {
    if (active) setEditingKey((current) => (current === id ? null : current));
    const next = projects.map((item) => (item.id === id ? { ...item, active } : item));
    setProjects(next);
    await saveSafe(next);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold text-slate-900">商品管理</h3>
          <p className="text-[11px] text-slate-500 mt-0.5">
            上架中的服务需先下架才能编辑。最多 {MAX_STANDARD_SERVICES} 项。
          </p>
        </div>
        <button
          type="button"
          disabled={saving || !canAdd}
          onClick={() => void addService()}
          title={canAdd ? '添加标准服务' : `标准服务最多 ${MAX_STANDARD_SERVICES} 项`}
          className="px-3 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold cursor-pointer inline-flex items-center gap-1.5 shrink-0 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Plus size={12} />
          标准服务
        </button>
      </div>

      {error && <p className="text-xs text-rose-600">{error}</p>}

      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        onChange={(e) => void onFilePicked(e.target.files?.[0])}
      />

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs">
        <div className="hidden md:grid grid-cols-12 gap-3 px-4 py-2.5 bg-slate-50 border-b border-slate-100 text-[11px] font-bold text-slate-500">
          <div className="col-span-6">标准项目</div>
          <div className="col-span-2">售价</div>
          <div className="col-span-2">状态</div>
          <div className="col-span-2 text-right">操作</div>
        </div>

        {projects.length === 0 && (
          <p className="px-4 py-10 text-center text-xs text-slate-400">尚未配置标准服务，可添加最多 {MAX_STANDARD_SERVICES} 项</p>
        )}

        {projects.map((project) => {
          const editing = editingKey === project.id && !project.active;
          const official = isOfficialProject(project);
          return (
            <div key={project.id} className="border-b border-slate-100 last:border-0">
              <div className="grid grid-cols-1 md:grid-cols-12 gap-3 px-4 py-3.5 items-center">
                <div className="md:col-span-6 min-w-0">
                  <div className="text-sm font-bold text-slate-900 truncate">{project.title || '未命名项目'}</div>
                  <div className="text-[11px] text-slate-500 truncate mt-0.5">
                    {standardServiceSummary(project.description) || '—'}
                  </div>
                </div>
                <div className="md:col-span-2 text-sm font-bold text-slate-900">¥{project.price}</div>
                <div className="md:col-span-2">
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      project.active ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    {project.active ? '已上架' : '已下架'}
                  </span>
                </div>
                <div className="md:col-span-2 flex items-center justify-start md:justify-end gap-2">
                  {project.active ? (
                    <button
                      type="button"
                      disabled={saving}
                      onClick={() => void setListed(project.id, false)}
                      className="text-[11px] font-bold text-amber-700 cursor-pointer disabled:opacity-50"
                    >
                      下架
                    </button>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => setEditingKey(editing ? null : project.id)}
                        className="text-[11px] font-bold text-blue-700 cursor-pointer"
                      >
                        {editing ? '收起' : '编辑'}
                      </button>
                      <button
                        type="button"
                        disabled={saving}
                        onClick={() => void setListed(project.id, true)}
                        className="text-[11px] font-bold text-emerald-700 cursor-pointer disabled:opacity-50"
                      >
                        上架
                      </button>
                      <button
                        type="button"
                        onClick={() => void removeService(project.id)}
                        className="text-[11px] font-bold text-rose-600 cursor-pointer"
                      >
                        删除
                      </button>
                    </>
                  )}
                </div>
              </div>

              {editing && (
                <div className="px-4 pb-4">
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3">
                    <label className="block text-xs space-y-1">
                      <span className="font-bold text-slate-700">项目名称</span>
                      <input
                        disabled={official}
                        value={project.title}
                        onChange={(e) =>
                          setProjects((prev) =>
                            prev.map((item) => (item.id === project.id ? { ...item, title: e.target.value } : item))
                          )
                        }
                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-bold outline-none disabled:bg-slate-100"
                      />
                    </label>
                    <label className="block text-xs space-y-1">
                      <span className="font-bold text-slate-700">服务说明</span>
                      <textarea
                        disabled={official}
                        rows={official ? 14 : 8}
                        value={project.description}
                        onChange={(e) =>
                          setProjects((prev) =>
                            prev.map((item) =>
                              item.id === project.id ? { ...item, description: e.target.value } : item
                            )
                          )
                        }
                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-xs outline-none resize-none leading-relaxed whitespace-pre-wrap disabled:bg-slate-100"
                      />
                    </label>
                    <div className="flex flex-wrap items-center gap-3 text-xs">
                      <label className="inline-flex items-center gap-1.5">
                        <span className="font-bold text-slate-700">售价</span>
                        <input
                          type="number"
                          min={1}
                          value={project.price}
                          onChange={(e) =>
                            setProjects((prev) =>
                              prev.map((item) =>
                                item.id === project.id ? { ...item, price: parsePrice(e.target.value) } : item
                              )
                            )
                          }
                          className="w-24 px-2 py-1.5 rounded-lg border border-slate-200 text-xs font-bold outline-none"
                        />
                        元
                      </label>
                      {official && project.suggestedPrice ? (
                        <span className="text-[11px] text-slate-400">建议价 ¥{project.suggestedPrice}</span>
                      ) : null}
                    </div>
                    <AttachmentList
                      files={project.attachments || []}
                      uploading={uploadingKey === project.id}
                      onUpload={() => pickFile(project.id)}
                      onRemove={(id) =>
                        setProjects((prev) =>
                          prev.map((item) =>
                            item.id === project.id
                              ? { ...item, attachments: (item.attachments || []).filter((file) => file.id !== id) }
                              : item
                          )
                        )
                      }
                    />
                    <div className="flex justify-end">
                      <button
                        type="button"
                        disabled={saving || Boolean(uploadingKey)}
                        onClick={() => void saveSafe(projects)}
                        className="px-3.5 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-bold cursor-pointer disabled:opacity-50"
                      >
                        {saving ? '保存中…' : '保存此项'}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

function AttachmentList({
  files,
  uploading,
  onUpload,
  onRemove
}: {
  files: Array<{ id: string; fileName: string; size?: string; url?: string }>;
  uploading: boolean;
  onUpload: () => void;
  onRemove: (id: string) => void;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-slate-700 inline-flex items-center gap-1.5">
          <Paperclip size={12} />
          附件
        </span>
        <button
          type="button"
          disabled={uploading}
          onClick={onUpload}
          className="px-2.5 py-1 rounded-lg border border-slate-200 bg-white text-[11px] font-bold text-slate-700 cursor-pointer inline-flex items-center gap-1 disabled:opacity-50"
        >
          <Upload size={12} />
          {uploading ? '上传中…' : '上传附件'}
        </button>
      </div>
      {files.length === 0 && <p className="text-[11px] text-slate-400">尚未上传附件</p>}
      {files.map((file) => (
        <div
          key={file.id}
          className="flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 text-[11px]"
        >
          <a
            href={file.url && !file.url.startsWith('pending://') ? file.url : undefined}
            target="_blank"
            rel="noreferrer"
            className={`truncate ${file.url && !file.url.startsWith('pending://') ? 'text-blue-700' : 'text-slate-600'}`}
          >
            {file.fileName}
            {file.size ? ` · ${file.size}` : ''}
          </a>
          <button
            type="button"
            onClick={() => onRemove(file.id)}
            className="text-slate-400 hover:text-rose-600 cursor-pointer"
            title="移除附件"
          >
            <Trash2 size={12} />
          </button>
        </div>
      ))}
    </div>
  );
}
