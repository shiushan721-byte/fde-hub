import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  Save,
  Play,
  RotateCcw,
  Sparkles,
  Bot,
  Brain,
  BookOpen,
  Wrench,
  DollarSign,
  Sliders,
  Plus,
  Trash2,
  Upload,
  FileText,
  CheckCircle2,
  Zap,
  Send,
  Loader2,
  Layers,
  Database,
  Globe,
  Code,
  Shield,
  FileCode,
  ArrowRight,
  TrendingUp,
  Settings2,
  Check,
  Boxes,
  Lock,
  Unlock,
  AlertTriangle,
  RotateCw,
  Cpu,
  Eye,
  Info
} from 'lucide-react';
import {
  CreatorAgentItem,
  AgentKnowledgeItem,
  AgentToolConfigItem,
  AgentModelConfig
} from '../types/creator';

interface AgentConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  agent: CreatorAgentItem | null;
  onSaveAgentConfig: (updatedAgent: CreatorAgentItem) => void;
  onOpenReplaceSkill?: (agent: CreatorAgentItem) => void;
}

type ConfigTab = 'skill' | 'prompt' | 'knowledge' | 'tools' | 'pricing' | 'model';

export const AgentConfigModal: React.FC<AgentConfigModalProps> = ({
  isOpen,
  onClose,
  agent,
  onSaveAgentConfig,
  onOpenReplaceSkill
}) => {
  if (!isOpen || !agent) return null;

  const [activeTab, setActiveTab] = useState<ConfigTab>('skill');
  const [saveSuccessToast, setSaveSuccessToast] = useState(false);

  // 0. Lifecycle & Status State
  const [agentStatus, setAgentStatus] = useState<'published' | 'offline' | 'draft' | 'under_review'>(
    agent.status || 'published'
  );
  const [statusChangeNotice, setStatusChangeNotice] = useState<string | null>(null);

  // 1. Basic & Pricing Form State
  const [title, setTitle] = useState(agent.title);
  const [desc, setDesc] = useState(agent.desc);
  const [category, setCategory] = useState(agent.category);
  const [pricingType, setPricingType] = useState<'free' | 'paid'>(
    agent.pricingType === 'free' || agent.pricingPlans?.isFree ? 'free' : 'paid'
  );
  const [monthlyPrice, setMonthlyPrice] = useState(
    String(agent.pricingPlans?.monthlyPrice || agent.price || 29)
  );
  const [annualPrice, setAnnualPrice] = useState(
    String(agent.pricingPlans?.annualPrice || (agent.price ? agent.price * 9 : 268))
  );
  const [buyoutPrice, setBuyoutPrice] = useState(
    String(agent.pricingPlans?.buyoutPrice || (agent.price ? agent.price * 15 : 499))
  );
  const [fdeCustomEnabled, setFdeCustomEnabled] = useState(agent.fdeCustomEnabled ?? true);

  // 2. Prompt & SOP Workflow State
  const [systemPrompt, setSystemPrompt] = useState(
    agent.systemPrompt ||
      `你是由资深领域专家打造的【${agent.title}】专属 AI 智能体。\n\n【核心任务】\n1. 严格基于挂载的业务知识库与标准化 SOP 规则回答客户问题。\n2. 保持专业、精炼、结构化的商业化表达风格。\n3. 在遇到需要复杂数据分析或企业系统联动时，主动调用关联工具插件。`
  );
  const [welcomeMessage, setWelcomeMessage] = useState(
    agent.welcomeMessage ||
      `您好！我是【${agent.title}】。已加载核心业务规则与专属知识库，请问有什么可以协助您的？`
  );
  const [sopSteps, setSopSteps] = useState<string[]>(
    agent.sopSteps && agent.sopSteps.length > 0
      ? agent.sopSteps
      : [
          '步骤 1：意图对齐与业务需求结构化解析',
          '步骤 2：专属知识库向量检索与命中度验证',
          '步骤 3：工具插件调度或数据模型分析计算',
          '步骤 4：生成结构化交付成果并提示企业 FDE 二开支持'
        ]
  );
  const [newSopInput, setNewSopInput] = useState('');
  const [starterPrompts, setStarterPrompts] = useState<string[]>(
    agent.starterPrompts && agent.starterPrompts.length > 0
      ? agent.starterPrompts
      : [
          '请帮我快速梳理当前业务的标准执行 SOP 流程',
          '如何将该智能体无缝接入我们现有的 ERP/CRM 业务系统？',
          '请基于内置知识库输出一份行业分析与执行方案'
        ]
  );
  const [newStarterInput, setNewStarterInput] = useState('');

  // 3. Knowledge Base State
  const [knowledgeBases, setKnowledgeBases] = useState<AgentKnowledgeItem[]>(
    agent.knowledgeBases && agent.knowledgeBases.length > 0
      ? agent.knowledgeBases
      : [
          {
            id: 'kb_1',
            name: `${agent.title} 核心业务标准 SOP 与问答知识库.pdf`,
            size: '2.4 MB',
            status: 'ready',
            docCount: 142,
            type: 'pdf',
            uploadedAt: '2026-08-10'
          },
          {
            id: 'kb_2',
            name: '行业专业术语库与结构化规则表.md',
            size: '560 KB',
            status: 'ready',
            docCount: 68,
            type: 'md',
            uploadedAt: '2026-08-12'
          }
        ]
  );
  const [similarityThreshold, setSimilarityThreshold] = useState(
    agent.ragConfig?.similarityThreshold ?? 0.78
  );
  const [topK, setTopK] = useState(agent.ragConfig?.topK ?? 5);
  const [rerankEnabled, setRerankEnabled] = useState(agent.ragConfig?.rerankEnabled ?? true);
  const [isUploadingKb, setIsUploadingKb] = useState(false);

  // 4. Tools & Plugins State
  const [tools, setTools] = useState<AgentToolConfigItem[]>(
    agent.tools && agent.tools.length > 0
      ? agent.tools
      : [
          {
            id: 'tool_search',
            name: '联网实时搜索 (Web Search)',
            description: '实时检索全网最新资讯、行业动态与公开报告',
            category: '通用检索',
            enabled: true
          },
          {
            id: 'tool_code_runner',
            name: 'Python 数据分析沙箱',
            description: '动态执行 Python 脚本，生成数据图表与统计分析报表',
            category: '计算分析',
            enabled: true
          },
          {
            id: 'tool_erp_connector',
            name: '企业 ERP/CRM 只读查询网关',
            description: '安全通过标准 REST API 查询企业内部订单与库存状态',
            category: '业务系统',
            enabled: false
          },
          {
            id: 'tool_im_notify',
            name: '飞书 / 企微 / 钉钉 机器人推送',
            description: '将执行结果或待审批工单秒级推送至企业协作群聊',
            category: '消息通知',
            enabled: true
          }
        ]
  );

  // 5. Model & Parameters State
  const [modelConfig, setModelConfig] = useState<AgentModelConfig>(
    agent.modelConfig || {
      modelName: 'gemini-2.5-pro',
      temperature: 0.7,
      maxTokens: 4096,
      contextRounds: 10
    }
  );

  // 6. Live Sandbox Playground State
  const [testMessages, setTestMessages] = useState<
    Array<{
      role: 'user' | 'assistant';
      content: string;
      reasoning?: string;
      citations?: string[];
      toolCalls?: string[];
      tokensUsed?: number;
    }>
  >([
    {
      role: 'assistant',
      content: welcomeMessage
    }
  ]);
  const [testInput, setTestInput] = useState('');
  const [isTesting, setIsTesting] = useState(false);
  const testChatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    testChatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [testMessages, isTesting]);

  const handleToggleStatus = (target: 'published' | 'offline') => {
    setAgentStatus(target);
    setStatusChangeNotice(
      target === 'offline'
        ? '智能体已切换为【已下架维护】状态，此时可安全替换或升级 Skill 源码包。'
        : '智能体已切换为【正常上架】状态，向全网用户开放。'
    );
    setTimeout(() => setStatusChangeNotice(null), 3000);
  };

  const handleAddSopStep = () => {
    if (!newSopInput.trim()) return;
    setSopSteps([...sopSteps, newSopInput.trim()]);
    setNewSopInput('');
  };

  const handleRemoveSopStep = (index: number) => {
    setSopSteps(sopSteps.filter((_, i) => i !== index));
  };

  const handleAddStarterPrompt = () => {
    if (!newStarterInput.trim()) return;
    setStarterPrompts([...starterPrompts, newStarterInput.trim()]);
    setNewStarterInput('');
  };

  const handleRemoveStarterPrompt = (index: number) => {
    setStarterPrompts(starterPrompts.filter((_, i) => i !== index));
  };

  const handleToggleTool = (toolId: string) => {
    setTools(
      tools.map((t) => (t.id === toolId ? { ...t, enabled: !t.enabled } : t))
    );
  };

  const handleUploadKbMock = () => {
    setIsUploadingKb(true);
    setTimeout(() => {
      const newDoc: AgentKnowledgeItem = {
        id: `kb_${Date.now()}`,
        name: `新上传企业业务资料_${knowledgeBases.length + 1}.docx`,
        size: '1.8 MB',
        status: 'ready',
        docCount: 35,
        type: 'docx',
        uploadedAt: new Date().toISOString().split('T')[0]
      };
      setKnowledgeBases([...knowledgeBases, newDoc]);
      setIsUploadingKb(false);
    }, 800);
  };

  const handleRemoveKb = (kbId: string) => {
    setKnowledgeBases(knowledgeBases.filter((k) => k.id !== kbId));
  };

  // Live Debugging Sandbox Execution
  const handleSendTestMessage = (promptText?: string) => {
    const textToSend = promptText || testInput.trim();
    if (!textToSend || isTesting) return;

    const userMsg = { role: 'user' as const, content: textToSend };
    setTestMessages((prev) => [...prev, userMsg]);
    setTestInput('');
    setIsTesting(true);

    setTimeout(() => {
      const isSearchNeeded =
        textToSend.includes('最新') ||
        textToSend.includes('数据') ||
        textToSend.includes('分析') ||
        textToSend.includes('报告');
      const isToolUsed = isSearchNeeded && tools.some((t) => t.enabled);

      const botReply = {
        role: 'assistant' as const,
        content: `【SOP 步骤执行完成】已调用底层 Skill 引擎完成分析：\n\n1. **意图对齐**：针对您提出的「${textToSend}」，已结构化提取核心参数；\n2. **知识检索**：命中知识库《${knowledgeBases[0]?.name || '标准业务库'}》中相关条款；\n3. **执行结果**：建议按标准流程在后台完成流转，如需定制内部系统对接，可直接发起企业级 FDE 咨询。`,
        reasoning: `执行模型：${modelConfig.modelName} | Top-K: ${topK} | 相似度阈值: ${similarityThreshold} | Hermes 沙箱运行正常`,
        citations: knowledgeBases.length > 0 ? [knowledgeBases[0].name] : undefined,
        toolCalls: isToolUsed ? ['Web Search', 'Python Sandbox'] : undefined,
        tokensUsed: Math.floor(Math.random() * 800) + 950
      };

      setTestMessages((prev) => [...prev, botReply]);
      setIsTesting(false);
    }, 1200);
  };

  const handleResetChat = () => {
    setTestMessages([
      {
        role: 'assistant',
        content: welcomeMessage
      }
    ]);
  };

  // Save All Configuration Items
  const handleSaveConfig = () => {
    const updatedAgent: CreatorAgentItem = {
      ...agent,
      title,
      desc,
      category,
      status: agentStatus,
      pricingType,
      price: pricingType === 'free' ? 0 : Number(monthlyPrice || 29),
      pricingPlans: {
        isFree: pricingType === 'free',
        monthlyPrice: pricingType === 'free' ? 0 : Number(monthlyPrice || 29),
        annualPrice: pricingType === 'free' ? 0 : Number(annualPrice || 268),
        buyoutPrice: pricingType === 'free' ? 0 : Number(buyoutPrice || 499),
        preferredPlan: agent.pricingPlans?.preferredPlan || 'annual'
      },
      fdeCustomEnabled,
      systemPrompt,
      welcomeMessage,
      sopSteps,
      starterPrompts,
      knowledgeBases,
      ragConfig: {
        similarityThreshold,
        topK,
        rerankEnabled
      },
      tools,
      modelConfig,
      updatedAt: '刚刚'
    };

    onSaveAgentConfig(updatedAgent);
    setSaveSuccessToast(true);
    setTimeout(() => {
      setSaveSuccessToast(false);
      onClose();
    }, 1000);
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-hidden animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="w-full max-w-6xl h-[92vh] max-h-[860px] bg-white rounded-3xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* HEADER BAR (LIGHT THEME) */}
        <div className="px-6 py-4 bg-slate-50/80 border-b border-slate-200 flex items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center text-white shadow-md shadow-blue-500/20 shrink-0">
              <Bot size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base font-black text-slate-900 leading-none">
                  {title}
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-mono font-semibold bg-slate-200 text-slate-700">
                  v{agent.version || '1.2.0'}
                </span>

                {/* Live Status Badge */}
                {agentStatus === 'published' ? (
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    正常上架中
                  </span>
                ) : (
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-600 border border-slate-300 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                    已下架维护中
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-1">
                管理 Skill 底层绑定、上下架生命周期、Prompt 人设、SOP 流程、专属知识库与商业定价
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {/* Quick Online / Offline Toggle Button */}
            {agentStatus === 'published' ? (
              <button
                type="button"
                onClick={() => handleToggleStatus('offline')}
                className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
                title="下架后该智能体对普通用户不可见，处于维护状态，可安全替换 Skill 包"
              >
                <Lock size={13} />
                <span>下架维护</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => handleToggleStatus('published')}
                className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
                title="重新上架并向全网用户开放"
              >
                <Unlock size={13} />
                <span>立即上架</span>
              </button>
            )}

            {saveSuccessToast && (
              <span className="text-xs text-emerald-600 font-bold flex items-center gap-1 animate-in fade-in">
                <CheckCircle2 size={15} />
                <span>配置已保存！</span>
              </span>
            )}

            <button
              type="button"
              onClick={handleSaveConfig}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 active:scale-98 text-white text-xs font-bold rounded-xl shadow-md shadow-blue-500/20 flex items-center gap-1.5 cursor-pointer transition-all"
            >
              <Save size={14} />
              <span>保存配置</span>
            </button>

            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Status notice toast */}
        {statusChangeNotice && (
          <div className="px-6 py-2 bg-blue-50 border-b border-blue-100 text-blue-900 text-xs font-medium flex items-center justify-between animate-in slide-in-from-top-1">
            <span className="flex items-center gap-2">
              <Info size={14} className="text-blue-600" />
              <span>{statusChangeNotice}</span>
            </span>
            <button
              type="button"
              onClick={() => setStatusChangeNotice(null)}
              className="text-blue-500 hover:text-blue-800 text-xs"
            >
              ✕
            </button>
          </div>
        )}

        {/* MAIN BODY: 2-COLUMN (LEFT CONFIGURATION TABS + RIGHT PLAYGROUND) */}
        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden bg-white">
          {/* LEFT: Configuration Workbench (60%) */}
          <div className="flex-1 flex flex-col border-r border-slate-200 overflow-hidden bg-white">
            {/* Sub-tabs Navigation */}
            <div className="px-6 border-b border-slate-200 bg-slate-50/70 flex items-center gap-2 overflow-x-auto shrink-0">
              <button
                type="button"
                onClick={() => setActiveTab('skill')}
                className={`py-3 px-3 text-xs font-bold flex items-center gap-1.5 border-b-2 transition-colors cursor-pointer whitespace-nowrap ${
                  activeTab === 'skill'
                    ? 'border-blue-600 text-blue-600 bg-white'
                    : 'border-transparent text-slate-600 hover:text-slate-900'
                }`}
              >
                <Boxes size={15} />
                <span>0. Skill 架构与上下架</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('prompt')}
                className={`py-3 px-3 text-xs font-bold flex items-center gap-1.5 border-b-2 transition-colors cursor-pointer whitespace-nowrap ${
                  activeTab === 'prompt'
                    ? 'border-blue-600 text-blue-600 bg-white'
                    : 'border-transparent text-slate-600 hover:text-slate-900'
                }`}
              >
                <Brain size={15} />
                <span>1. 人设与 SOP 编排</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('knowledge')}
                className={`py-3 px-3 text-xs font-bold flex items-center gap-1.5 border-b-2 transition-colors cursor-pointer whitespace-nowrap ${
                  activeTab === 'knowledge'
                    ? 'border-blue-600 text-blue-600 bg-white'
                    : 'border-transparent text-slate-600 hover:text-slate-900'
                }`}
              >
                <BookOpen size={15} />
                <span>2. 专属知识库 (RAG)</span>
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-200 text-slate-700">
                  {knowledgeBases.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('tools')}
                className={`py-3 px-3 text-xs font-bold flex items-center gap-1.5 border-b-2 transition-colors cursor-pointer whitespace-nowrap ${
                  activeTab === 'tools'
                    ? 'border-blue-600 text-blue-600 bg-white'
                    : 'border-transparent text-slate-600 hover:text-slate-900'
                }`}
              >
                <Wrench size={15} />
                <span>3. 工具与 API 插件</span>
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-blue-100 text-blue-700">
                  {tools.filter((t) => t.enabled).length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('pricing')}
                className={`py-3 px-3 text-xs font-bold flex items-center gap-1.5 border-b-2 transition-colors cursor-pointer whitespace-nowrap ${
                  activeTab === 'pricing'
                    ? 'border-blue-600 text-blue-600 bg-white'
                    : 'border-transparent text-slate-600 hover:text-slate-900'
                }`}
              >
                <DollarSign size={15} />
                <span>4. 商业定价与分润</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('model')}
                className={`py-3 px-3 text-xs font-bold flex items-center gap-1.5 border-b-2 transition-colors cursor-pointer whitespace-nowrap ${
                  activeTab === 'model'
                    ? 'border-blue-600 text-blue-600 bg-white'
                    : 'border-transparent text-slate-600 hover:text-slate-900'
                }`}
              >
                <Sliders size={15} />
                <span>5. 模型底座与参数</span>
              </button>
            </div>

            {/* TAB FORM CONTENT */}
            <div className="flex-1 p-6 overflow-y-auto space-y-6 bg-white">

              {/* ==================== TAB 0: SKILL ARCHITECTURE & STATUS ==================== */}
              {activeTab === 'skill' && (
                <div className="space-y-6 animate-in fade-in">
                  {/* Basic Metadata Edit */}
                  <div className="space-y-4">
                    <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                      <FileText size={15} className="text-blue-600" />
                      <span>智能体展示信息修改</span>
                    </h3>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                      <div className="sm:col-span-2 space-y-1.5">
                        <label className="text-xs font-bold text-slate-800">智能体名称</label>
                        <input
                          type="text"
                          value={title}
                          onChange={(e) => setTitle(e.target.value)}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 outline-none focus:bg-white focus:border-blue-500 transition-all font-semibold"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-800">行业分类</label>
                        <select
                          value={category}
                          onChange={(e) => setCategory(e.target.value)}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 outline-none focus:bg-white focus:border-blue-500 transition-all"
                        >
                          <option value="电商零售">电商零售</option>
                          <option value="内容营销">内容营销</option>
                          <option value="办公协同">办公协同</option>
                          <option value="智能制造">智能制造</option>
                          <option value="金融投研">金融投研</option>
                        </select>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-800">功能简述</label>
                      <textarea
                        rows={2}
                        value={desc}
                        onChange={(e) => setDesc(e.target.value)}
                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 outline-none resize-none focus:bg-white focus:border-blue-500 transition-all"
                      />
                    </div>
                  </div>

                  {/* Bound Skill Package Details Card */}
                  <div className="p-4.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-slate-800 flex items-center gap-1.5">
                        <Boxes size={16} className="text-indigo-600" />
                        <span>当前绑定的底层 Skill 包</span>
                      </span>
                      <span className="px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-[10px] font-bold">
                        3 层校验已通过 (沙箱已签名)
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
                      <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-2xs space-y-0.5">
                        <div className="text-[10px] text-slate-400">源码包名称</div>
                        <div className="text-xs font-bold text-slate-900 font-mono truncate">
                          {agent.skillPackage?.fileName || `${title.replace(/\s+/g, '_')}-skill.zip`}
                        </div>
                      </div>

                      <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-2xs space-y-0.5">
                        <div className="text-[10px] text-slate-400">当前版本 (SemVer)</div>
                        <div className="text-xs font-bold text-blue-700 font-mono">
                          v{agent.version || '1.2.0'}
                        </div>
                      </div>

                      <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-2xs space-y-0.5">
                        <div className="text-[10px] text-slate-400">单次沙箱预估词元</div>
                        <div className="text-xs font-bold text-amber-600 font-mono">
                          ~1,850 Tokens
                        </div>
                      </div>

                      <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-2xs space-y-0.5">
                        <div className="text-[10px] text-slate-400">单次底座推理成本</div>
                        <div className="text-xs font-bold text-emerald-700 font-mono">
                          ￥0.038 / 次
                        </div>
                      </div>
                    </div>

                    <div className="p-2.5 bg-white rounded-xl border border-slate-200 text-[11px] text-slate-600 flex items-center justify-between">
                      <span className="flex items-center gap-1.5 font-mono">
                        <Cpu size={13} className="text-indigo-600" />
                        <span>运行时兼容: Hermes-Core v2.4.1 (Python 3.10+, ToolUse-v3)</span>
                      </span>
                      <span className="text-slate-400 text-[10px]">最近校验通过: 刚刚</span>
                    </div>
                  </div>

                  {/* SKILL REPLACEMENT GATING SECTION */}
                  <div className="space-y-3">
                    <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                      <RotateCw size={15} className="text-indigo-600" />
                      <span>Skill 源码包替换与升级规则 (下架才能替换)</span>
                    </h3>

                    {agentStatus === 'published' ? (
                      /* LOCKED STATE: When Published */
                      <div className="p-4 bg-amber-50/80 border border-amber-200 rounded-2xl space-y-3">
                        <div className="flex items-start gap-3">
                          <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                            <Lock size={16} />
                          </div>
                          <div className="space-y-1">
                            <div className="text-xs font-bold text-amber-950">
                              ⚠️ 智能体处于【正常上架运行】状态，已锁定 Skill 替换通道
                            </div>
                            <p className="text-[11px] text-amber-800 leading-relaxed">
                              为了保障全网已订阅用户调用的高可用与数据一致性，平台强制要求：<strong>必须先将智能体下架</strong>，才允许替换底层 Skill 包并重新触发 3 层沙箱验证。
                            </p>
                          </div>
                        </div>

                        <div className="pt-1 flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              handleToggleStatus('offline');
                              if (onOpenReplaceSkill) {
                                onOpenReplaceSkill({ ...agent, status: 'offline' });
                              }
                            }}
                            className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl shadow-sm flex items-center gap-1.5 cursor-pointer transition-all active:scale-95"
                          >
                            <Unlock size={14} />
                            <span>一键下架并开始替换 Skill</span>
                          </button>
                        </div>
                      </div>
                    ) : (
                      /* UNLOCKED STATE: When Offline */
                      <div className="p-4 bg-emerald-50/80 border border-emerald-200 rounded-2xl space-y-3">
                        <div className="flex items-start gap-3">
                          <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                            <Unlock size={16} />
                          </div>
                          <div className="space-y-1">
                            <div className="text-xs font-bold text-emerald-950">
                              ✅ 智能体处于【已下架维护】状态，可安全替换 Skill 包
                            </div>
                            <p className="text-[11px] text-emerald-800 leading-relaxed">
                              您可以上传全新的 Skill 压缩包，系统将自动重新执行 <strong>3 层自动化校验</strong>（Layer 1: 结构检查 → Layer 2: Hermes 兼容 → Layer 3: 隔离沙箱回放），全部跑通后可一键重新上架。
                            </p>
                          </div>
                        </div>

                        <div className="pt-1 flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              if (onOpenReplaceSkill) {
                                onOpenReplaceSkill({ ...agent, status: 'offline' });
                              }
                            }}
                            className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-md shadow-emerald-600/20 flex items-center gap-2 cursor-pointer transition-all active:scale-95"
                          >
                            <Upload size={14} />
                            <span>上传新 Skill 包并执行 3 层校验流水线</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ==================== TAB 1: PROMPT & SOP WORKFLOW ==================== */}
              {activeTab === 'prompt' && (
                <div className="space-y-5 animate-in fade-in">
                  <div>
                    <label className="block text-xs font-bold text-slate-800 mb-1.5 flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <Sparkles size={14} className="text-blue-600" />
                        <span>系统人设与专家角色设定 (System Prompt)</span>
                      </span>
                      <span className="text-[11px] text-slate-400 font-normal">
                        {systemPrompt.length} 字
                      </span>
                    </label>
                    <textarea
                      rows={6}
                      value={systemPrompt}
                      onChange={(e) => setSystemPrompt(e.target.value)}
                      placeholder="定义智能体的身份、专业边界、回答语调与输出规范..."
                      className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs leading-relaxed text-slate-900 outline-none focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 font-mono resize-y"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-800 mb-1.5">
                      智能体欢迎语 (Welcome Message)
                    </label>
                    <input
                      type="text"
                      value={welcomeMessage}
                      onChange={(e) => setWelcomeMessage(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 outline-none focus:bg-white focus:border-blue-500 transition-all font-medium"
                    />
                  </div>

                  {/* SOP Workflow Steps */}
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                        <Layers size={14} className="text-indigo-600" />
                        <span>业务执行 SOP 推理链编排</span>
                      </label>
                      <span className="text-[11px] text-slate-400">
                        智能体将按以下步骤逐步拆解任务
                      </span>
                    </div>

                    <div className="space-y-2">
                      {sopSteps.map((step, idx) => (
                        <div
                          key={idx}
                          className="flex items-center gap-2 p-2.5 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-800"
                        >
                          <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 font-black text-[10px] flex items-center justify-center shrink-0">
                            {idx + 1}
                          </span>
                          <span className="flex-1 font-medium">{step}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveSopStep(idx)}
                            className="text-slate-400 hover:text-rose-600 p-1 cursor-pointer"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      ))}

                      <div className="flex items-center gap-2 pt-1">
                        <input
                          type="text"
                          value={newSopInput}
                          onChange={(e) => setNewSopInput(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && handleAddSopStep()}
                          placeholder="添加新 SOP 步骤，例如：步骤 5：数据归档至企业云端"
                          className="flex-1 px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs outline-none focus:border-blue-500"
                        />
                        <button
                          type="button"
                          onClick={handleAddSopStep}
                          className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl flex items-center gap-1 cursor-pointer"
                        >
                          <Plus size={13} />
                          <span>添加</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Starter Prompts */}
                  <div className="space-y-2.5 pt-2">
                    <label className="block text-xs font-bold text-slate-800">
                      预设快捷引导提问 (Starter Prompts)
                    </label>
                    <div className="space-y-1.5">
                      {starterPrompts.map((prompt, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between px-3 py-2 bg-blue-50/40 border border-blue-100 rounded-xl text-xs text-blue-900"
                        >
                          <span>💬 {prompt}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveStarterPrompt(idx)}
                            className="text-blue-400 hover:text-rose-600 cursor-pointer"
                          >
                            <X size={13} />
                          </button>
                        </div>
                      ))}

                      <div className="flex items-center gap-2 pt-1">
                        <input
                          type="text"
                          value={newStarterInput}
                          onChange={(e) => setNewStarterInput(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && handleAddStarterPrompt()}
                          placeholder="添加预设引导词，方便用户一键开启高质量对话..."
                          className="flex-1 px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs outline-none focus:border-blue-500"
                        />
                        <button
                          type="button"
                          onClick={handleAddStarterPrompt}
                          className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl flex items-center gap-1 cursor-pointer"
                        >
                          <Plus size={13} />
                          <span>添加</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ==================== TAB 2: KNOWLEDGE BASE (RAG) ==================== */}
              {activeTab === 'knowledge' && (
                <div className="space-y-5 animate-in fade-in">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-xs font-bold text-slate-900">
                        挂载专属知识库与检索配置 (RAG Pipeline)
                      </h3>
                      <p className="text-[11px] text-slate-500">
                        上传企业私域资料或行业标准，智能体将自动完成分块与向量化索引
                      </p>
                    </div>

                    <button
                      type="button"
                      disabled={isUploadingKb}
                      onClick={handleUploadKbMock}
                      className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-sm cursor-pointer disabled:opacity-50"
                    >
                      {isUploadingKb ? (
                        <Loader2 size={13} className="animate-spin" />
                      ) : (
                        <Upload size={13} />
                      )}
                      <span>上传知识文档</span>
                    </button>
                  </div>

                  {/* Document List */}
                  <div className="space-y-2">
                    {knowledgeBases.map((kb) => (
                      <div
                        key={kb.id}
                        className="p-3 rounded-2xl border border-slate-200 bg-slate-50/60 flex items-center justify-between gap-3 text-xs"
                      >
                        <div className="flex items-center gap-2.5 truncate">
                          <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
                            <FileText size={16} />
                          </div>
                          <div className="truncate">
                            <div className="font-bold text-slate-900 truncate">{kb.name}</div>
                            <div className="text-[10px] text-slate-400 flex items-center gap-2 mt-0.5">
                              <span>{kb.size}</span>
                              <span>•</span>
                              <span>{kb.docCount} 个分块</span>
                              <span>•</span>
                              <span>{kb.uploadedAt}</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 text-[10px] font-bold border border-emerald-200">
                            已向量化
                          </span>
                          <button
                            type="button"
                            onClick={() => handleRemoveKb(kb.id)}
                            className="p-1 text-slate-400 hover:text-rose-600 cursor-pointer"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* RAG Parameters */}
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3 text-xs">
                    <h4 className="font-bold text-slate-800">向量检索高级参数</h4>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <div className="flex justify-between">
                          <span className="text-slate-600">相似度阈值 (Similarity Threshold)</span>
                          <span className="font-bold font-mono text-blue-600">{similarityThreshold}</span>
                        </div>
                        <input
                          type="range"
                          min="0.5"
                          max="0.95"
                          step="0.01"
                          value={similarityThreshold}
                          onChange={(e) => setSimilarityThreshold(Number(e.target.value))}
                          className="w-full accent-blue-600"
                        />
                        <span className="text-[10px] text-slate-400">
                          低于该分数的知识片段将被过滤，避免幻觉
                        </span>
                      </div>

                      <div className="space-y-1">
                        <div className="flex justify-between">
                          <span className="text-slate-600">召回 Top-K 数量</span>
                          <span className="font-bold font-mono text-blue-600">{topK} 篇</span>
                        </div>
                        <input
                          type="range"
                          min="1"
                          max="15"
                          step="1"
                          value={topK}
                          onChange={(e) => setTopK(Number(e.target.value))}
                          className="w-full accent-blue-600"
                        />
                        <span className="text-[10px] text-slate-400">
                          单次推理注入的最相关知识片段数量
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <div>
                        <span className="text-xs font-bold text-slate-800">
                          启用二阶段重排 (BGE Rerank)
                        </span>
                        <p className="text-[10px] text-slate-400">
                          利用精排模型对初筛知识片段重新打分，提升复杂问题回答精准度
                        </p>
                      </div>
                      <input
                        type="checkbox"
                        checked={rerankEnabled}
                        onChange={(e) => setRerankEnabled(e.target.checked)}
                        className="w-4 h-4 accent-blue-600 cursor-pointer rounded"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* ==================== TAB 3: TOOLS & APIS ==================== */}
              {activeTab === 'tools' && (
                <div className="space-y-5 animate-in fade-in">
                  <div>
                    <h3 className="text-xs font-bold text-slate-900">
                      工具插件与外部系统集成 (Function Calling)
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      赋予智能体调用外部系统、运行代码与执行自动化动作的能力
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    {tools.map((tool) => (
                      <div
                        key={tool.id}
                        onClick={() => handleToggleTool(tool.id)}
                        className={`p-4 rounded-2xl border transition-all cursor-pointer space-y-2 relative ${
                          tool.enabled
                            ? 'bg-blue-50/40 border-blue-400 ring-2 ring-blue-500/15 shadow-xs'
                            : 'bg-slate-50/70 border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 rounded-md bg-white border border-slate-200 text-[10px] font-bold text-slate-700">
                              {tool.category}
                            </span>
                            <h4 className="text-xs font-bold text-slate-900">{tool.name}</h4>
                          </div>
                          <div
                            className={`w-5 h-5 rounded-full flex items-center justify-center text-white ${
                              tool.enabled ? 'bg-blue-600' : 'bg-slate-300'
                            }`}
                          >
                            <Check size={12} />
                          </div>
                        </div>

                        <p className="text-[11px] text-slate-500 leading-relaxed">
                          {tool.description}
                        </p>
                      </div>
                    ))}
                  </div>

                  <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl border border-blue-200 text-xs text-blue-900 flex items-center justify-between">
                    <div>
                      <span className="font-bold">支持自定义 OpenAPI / Webhook 扩展</span>
                      <p className="text-[11px] text-blue-700 mt-0.5">
                        企业客户可授权接入专属私有数据库与内部 API 接口
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => alert('已打开 OpenAPI 自定义插件注册面板')}
                      className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-xs cursor-pointer"
                    >
                      注册新插件
                    </button>
                  </div>
                </div>
              )}

              {/* ==================== TAB 4: PRICING & MONETIZATION ==================== */}
              {activeTab === 'pricing' && (
                <div className="space-y-5 animate-in fade-in">
                  <div>
                    <h3 className="text-xs font-bold text-slate-900">
                      智能体商业定价与创作者分润机制
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      创作者享有 70% 软件授权销售净额，并持续享受用户 Token 自充 15%~20% 流水返点
                    </p>
                  </div>

                  {/* Mode switch */}
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-800">计费模式</span>
                      <div className="flex items-center gap-1 bg-slate-200 p-0.5 rounded-lg text-xs">
                        <button
                          type="button"
                          onClick={() => setPricingType('paid')}
                          className={`px-3 py-1 rounded-md font-bold transition-all cursor-pointer ${
                            pricingType === 'paid'
                              ? 'bg-blue-600 text-white shadow-xs'
                              : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          商业收费
                        </button>
                        <button
                          type="button"
                          onClick={() => setPricingType('free')}
                          className={`px-3 py-1 rounded-md font-bold transition-all cursor-pointer ${
                            pricingType === 'free'
                              ? 'bg-blue-600 text-white shadow-xs'
                              : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          免费开源
                        </button>
                      </div>
                    </div>

                    {pricingType === 'paid' ? (
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                        {/* 1. 按月付费 */}
                        <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-1 shadow-2xs">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-bold text-slate-800">按月付费</span>
                            <span className="text-[10px] text-slate-400">元/月</span>
                          </div>
                          <input
                            type="number"
                            value={monthlyPrice}
                            onChange={(e) => setMonthlyPrice(e.target.value)}
                            className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-900 outline-none"
                          />
                          <div className="text-[10px] text-emerald-600 font-medium">
                            创作者实得 ￥{(Number(monthlyPrice || 0) * 0.7).toFixed(1)}/月
                          </div>
                        </div>

                        {/* 2. 按年付费 */}
                        <div className="p-3 bg-blue-50/40 rounded-xl border border-blue-200 space-y-1 shadow-2xs">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-bold text-blue-900">按年付费</span>
                            <span className="text-[10px] text-blue-600 font-semibold">推荐75折</span>
                          </div>
                          <input
                            type="number"
                            value={annualPrice}
                            onChange={(e) => setAnnualPrice(e.target.value)}
                            className="w-full px-2.5 py-1.5 bg-white border border-blue-200 rounded-lg text-xs font-bold text-slate-900 outline-none"
                          />
                          <div className="text-[10px] text-blue-600 font-medium">
                            创作者实得 ￥{(Number(annualPrice || 0) * 0.7).toFixed(1)}/年
                          </div>
                        </div>

                        {/* 3. 终身买断制 */}
                        <div className="p-3 bg-amber-50/40 rounded-xl border border-amber-200 space-y-1 shadow-2xs">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-bold text-amber-900">终身买断制</span>
                            <span className="text-[10px] text-amber-700 font-semibold">永久授权</span>
                          </div>
                          <input
                            type="number"
                            value={buyoutPrice}
                            onChange={(e) => setBuyoutPrice(e.target.value)}
                            className="w-full px-2.5 py-1.5 bg-white border border-amber-200 rounded-lg text-xs font-bold text-slate-900 outline-none"
                          />
                          <div className="text-[10px] text-amber-700 font-medium">
                            创作者实得 ￥{(Number(buyoutPrice || 0) * 0.7).toFixed(1)}/单
                          </div>
                        </div>
                      </div>
                    ) : (
                      <p className="text-[11px] text-slate-500 pt-1">
                        智能体免费开放给用户；用户调用消耗 Token 时依然需自充，您依然享有 <strong>15%~20% 算力返点</strong>。
                      </p>
                    )}
                  </div>

                  {/* Enterprise Customization Toggle */}
                  <div className="p-3.5 bg-indigo-50/70 rounded-xl border border-indigo-200 flex items-center justify-between">
                    <div className="space-y-0.5">
                      <div className="font-bold text-xs text-indigo-950 flex items-center gap-1.5">
                        <Shield size={15} className="text-indigo-600" />
                        <span>开启企业级 FDE 深度定制商机承接</span>
                      </div>
                      <div className="text-[11px] text-slate-600">
                        允许企业用户向您发起定制咨询，平台 100% 资金托管，服务订单创作者享 85%~90% 分润
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={fdeCustomEnabled}
                        onChange={(e) => setFdeCustomEnabled(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
                    </label>
                  </div>
                </div>
              )}

              {/* ==================== TAB 5: MODEL & PARAMETERS ==================== */}
              {activeTab === 'model' && (
                <div className="space-y-5 animate-in fade-in">
                  <div>
                    <h3 className="text-xs font-bold text-slate-900">
                      底座大模型与推理参数配置
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      根据智能体的业务复杂度平衡推理深度、生成创造力与词元消耗
                    </p>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-800">底座大模型选择</label>
                      <select
                        value={modelConfig.modelName}
                        onChange={(e) =>
                          setModelConfig({ ...modelConfig, modelName: e.target.value })
                        }
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 outline-none focus:border-blue-500 font-mono"
                      >
                        <option value="gemini-2.5-pro">Gemini 2.5 Pro (超长上下文 · 复杂推理首选)</option>
                        <option value="gemini-2.5-flash">Gemini 2.5 Flash (极速响应 · 高性价比)</option>
                        <option value="claude-3-5-sonnet">Claude 3.5 Sonnet (代码生成与长文本严谨)</option>
                        <option value="deepseek-r1">DeepSeek-R1 (深度思维链与数学逻辑推理)</option>
                      </select>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                      <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
                        <div className="flex justify-between text-xs">
                          <span className="font-bold text-slate-700">随机性 (Temperature)</span>
                          <span className="font-mono text-blue-600 font-bold">
                            {modelConfig.temperature}
                          </span>
                        </div>
                        <input
                          type="range"
                          min="0.0"
                          max="1.5"
                          step="0.05"
                          value={modelConfig.temperature}
                          onChange={(e) =>
                            setModelConfig({ ...modelConfig, temperature: Number(e.target.value) })
                          }
                          className="w-full accent-blue-600"
                        />
                        <span className="text-[10px] text-slate-400">
                          越低越严谨确定，越高越发散创意
                        </span>
                      </div>

                      <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
                        <div className="flex justify-between text-xs">
                          <span className="font-bold text-slate-700">最大单次输出 (Max Tokens)</span>
                          <span className="font-mono text-blue-600 font-bold">
                            {modelConfig.maxTokens}
                          </span>
                        </div>
                        <input
                          type="range"
                          min="1024"
                          max="8192"
                          step="512"
                          value={modelConfig.maxTokens}
                          onChange={(e) =>
                            setModelConfig({ ...modelConfig, maxTokens: Number(e.target.value) })
                          }
                          className="w-full accent-blue-600"
                        />
                        <span className="text-[10px] text-slate-400">控制单次生成文本的最大长度</span>
                      </div>

                      <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
                        <div className="flex justify-between text-xs">
                          <span className="font-bold text-slate-700">上下文携带轮数</span>
                          <span className="font-mono text-blue-600 font-bold">
                            {modelConfig.contextRounds} 轮
                          </span>
                        </div>
                        <input
                          type="range"
                          min="2"
                          max="30"
                          step="2"
                          value={modelConfig.contextRounds}
                          onChange={(e) =>
                            setModelConfig({
                              ...modelConfig,
                              contextRounds: Number(e.target.value)
                            })
                          }
                          className="w-full accent-blue-600"
                        />
                        <span className="text-[10px] text-slate-400">保留的历史问答记忆轮次</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* RIGHT: Live Sandbox Playground (40%) */}
          <div className="w-full lg:w-[420px] bg-slate-50/50 flex flex-col overflow-hidden shrink-0">
            <div className="px-4 py-3 border-b border-slate-200 bg-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-xs font-bold text-slate-800">实时调优与沙箱联调测试</span>
              </div>
              <button
                type="button"
                onClick={handleResetChat}
                className="text-[11px] text-slate-500 hover:text-slate-900 flex items-center gap-1 cursor-pointer"
              >
                <RotateCcw size={12} />
                <span>清空会话</span>
              </button>
            </div>

            {/* Chat message list */}
            <div className="flex-1 p-4 overflow-y-auto space-y-3 text-xs">
              {testMessages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`flex flex-col ${
                    msg.role === 'user' ? 'items-end' : 'items-start'
                  }`}
                >
                  <div
                    className={`max-w-[90%] p-3 rounded-2xl ${
                      msg.role === 'user'
                        ? 'bg-blue-600 text-white rounded-tr-xs shadow-xs'
                        : 'bg-white border border-slate-200 text-slate-800 rounded-tl-xs shadow-2xs space-y-2'
                    }`}
                  >
                    <div className="whitespace-pre-wrap leading-relaxed">{msg.content}</div>

                    {msg.citations && msg.citations.length > 0 && (
                      <div className="text-[10px] text-slate-500 bg-slate-50 p-1.5 rounded-lg border border-slate-200 flex items-center gap-1">
                        <BookOpen size={11} className="text-blue-600" />
                        <span>引用知识库: {msg.citations[0]}</span>
                      </div>
                    )}

                    {msg.toolCalls && msg.toolCalls.length > 0 && (
                      <div className="text-[10px] text-indigo-700 bg-indigo-50 p-1.5 rounded-lg border border-indigo-200 flex items-center gap-1">
                        <Wrench size={11} />
                        <span>调度工具: {msg.toolCalls.join(', ')}</span>
                      </div>
                    )}

                    {msg.reasoning && (
                      <div className="text-[10px] text-slate-400 font-mono pt-1 border-t border-slate-100 flex items-center justify-between">
                        <span>{msg.reasoning}</span>
                        {msg.tokensUsed && <span>~{msg.tokensUsed} tokens</span>}
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {isTesting && (
                <div className="flex items-center gap-2 text-slate-400 text-xs p-2">
                  <Loader2 size={14} className="animate-spin text-blue-600" />
                  <span>智能体正在执行 SOP 推理链与沙箱联调...</span>
                </div>
              )}
              <div ref={testChatEndRef} />
            </div>

            {/* Quick Starters */}
            {starterPrompts.length > 0 && (
              <div className="px-3 py-2 bg-slate-100/60 border-t border-slate-200 flex items-center gap-1.5 overflow-x-auto text-[11px] shrink-0">
                <span className="text-slate-400 shrink-0 text-[10px]">快捷问:</span>
                {starterPrompts.map((p, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => handleSendTestMessage(p)}
                    className="px-2.5 py-1 bg-white hover:bg-blue-50 hover:text-blue-600 border border-slate-200 text-slate-700 rounded-lg shrink-0 transition-colors cursor-pointer"
                  >
                    {p}
                  </button>
                ))}
              </div>
            )}

            {/* Input Bar */}
            <div className="p-3 bg-white border-t border-slate-200 shrink-0">
              <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl p-1.5 focus-within:bg-white focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/10">
                <input
                  type="text"
                  value={testInput}
                  onChange={(e) => setTestInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSendTestMessage()}
                  placeholder="输入测试指令，实时检验 Prompt 与工具调度..."
                  className="flex-1 px-2.5 py-1.5 bg-transparent text-xs text-slate-900 outline-none"
                />
                <button
                  type="button"
                  disabled={!testInput.trim() || isTesting}
                  onClick={() => handleSendTestMessage()}
                  className="p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors cursor-pointer disabled:opacity-40"
                >
                  <Send size={13} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
