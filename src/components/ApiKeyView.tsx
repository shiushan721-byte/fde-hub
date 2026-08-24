import React, { useState } from 'react';
import { Key, Copy, Check, Plus, Trash2, ShieldCheck, Terminal, AlertCircle } from 'lucide-react';

export const ApiKeyView: React.FC = () => {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [keys, setKeys] = useState([
    { id: 'key_live_9481a8', name: '生产环境 ERP 网关调用', secret: 'hm_live_89f0293817349182374981', created: '2026-08-01', lastUsed: '10分钟前', status: '活跃' },
    { id: 'key_test_0284fb', name: '测试沙盒 / 本地调试', secret: 'hm_test_0981237498127394817293', created: '2026-08-10', lastUsed: '2小时前', status: '活跃' }
  ]);

  const handleCopy = (id: string, secret: string) => {
    navigator.clipboard.writeText(secret);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div id="apikey-view" className="space-y-8 pb-16">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-2xl font-black text-slate-900 font-display">API Key 管理</h1>
          <p className="text-xs text-slate-500 mt-1">
            生成和管理调用 Hellome 应用智能体与 FDE 交付私有网关的访问密钥
          </p>
        </div>
        <button
          onClick={() => {
            const newKey = {
              id: `key_${Date.now()}`,
              name: '新生成 API 密钥',
              secret: `hm_live_${Math.random().toString(36).substring(2, 15)}`,
              created: '刚刚',
              lastUsed: '从未',
              status: '活跃'
            };
            setKeys([newKey, ...keys]);
          }}
          className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-xs flex items-center gap-1.5 cursor-pointer"
        >
          <Plus size={14} />
          <span>创建新密钥</span>
        </button>
      </div>

      {/* Keys list */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 space-y-4 shadow-2xs">
        <h3 className="font-bold text-slate-900 text-base">我的应用接入密钥</h3>
        <div className="space-y-3">
          {keys.map((k) => (
            <div
              key={k.id}
              className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-900">{k.name}</span>
                  <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                    {k.status}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs font-mono text-slate-600 bg-white px-2.5 py-1 rounded-lg border border-slate-200">
                  <Key size={12} className="text-slate-400" />
                  <span>{k.secret.substring(0, 10)}****************</span>
                </div>
                <div className="text-[11px] text-slate-400">
                  创建时间：{k.created} · 最近调用：{k.lastUsed}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleCopy(k.id, k.secret)}
                  className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 text-xs font-semibold text-slate-700 flex items-center gap-1 cursor-pointer"
                >
                  {copiedId === k.id ? (
                    <>
                      <Check size={13} className="text-emerald-600" />
                      <span className="text-emerald-600">已复制</span>
                    </>
                  ) : (
                    <>
                      <Copy size={13} />
                      <span>复制密钥</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Code Snippet Quickstart */}
      <div className="bg-slate-900 text-slate-100 rounded-3xl p-6 space-y-3 border border-slate-800">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-300">
          <Terminal size={14} className="text-emerald-400" />
          <span>快速调用示例 (Node / Python / cURL)</span>
        </div>
        <pre className="text-xs font-mono bg-slate-950 p-4 rounded-2xl text-emerald-300 overflow-x-auto border border-slate-800">
{`curl -X POST https://api.hellome.art/v1/agents/hz-canvas/invoke \\
  -H "Authorization: Bearer hm_live_..." \\
  -H "Content-Type: application/json" \\
  -d '{"prompt": "生成工业排障知识库拓扑图", "session_id": "sess_891"}'`}
        </pre>
      </div>
    </div>
  );
};
