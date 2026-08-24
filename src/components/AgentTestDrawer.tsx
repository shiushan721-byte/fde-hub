import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  Send,
  Sparkles,
  Bot,
  User,
  ArrowRight,
  RefreshCw,
  Copy,
  Check,
  Building2,
  ExternalLink,
  MessageSquareCode,
  ShieldCheck,
  Flame
} from 'lucide-react';
import { AgentSolution, FDEExpert } from '../types';
import { FDEBadge } from './FDEBadge';

interface AgentTestDrawerProps {
  agent: AgentSolution | null;
  isOpen: boolean;
  onClose: () => void;
  onConsultFDE: (agent: AgentSolution, initialPrompt?: string) => void;
  onViewAuthorProfile: (authorId: string) => void;
}

export const AgentTestDrawer: React.FC<AgentTestDrawerProps> = ({
  agent,
  isOpen,
  onClose,
  onConsultFDE,
  onViewAuthorProfile
}) => {
  const [messages, setMessages] = useState<Array<{ role: 'user' | 'assistant'; content: string }>>([]);
  const [inputVal, setInputVal] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Sync initial conversation when agent changes or drawer opens
  useEffect(() => {
    if (agent && isOpen) {
      setMessages([...agent.demoConversation]);
    }
  }, [agent, isOpen]);

  // Auto scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isLoading, isOpen]);

  if (!isOpen || !agent) return null;

  // Handle sample prompt click
  const handleSamplePromptClick = (prompt: string) => {
    handleSendMessage(prompt);
  };

  // Generate smart industry response
  const generateAgentResponse = (userQuestion: string, agentCategory: string): string => {
    const q = userQuestion.toLowerCase();

    if (agent.id.includes('ecommerce') || agentCategory.includes('电商')) {
      if (q.includes('退') || q.includes('换货') || q.includes('运费险')) {
        return `📦 **【售后退换货自愈服务链路】**\n\n已为您核实该商品支持【7天无理由退换货 + 赠送运费险】。\n\n1. **退货地址与寄件方式**：系统已为您匹配【菜鸟裹裹免费上门取件】。\n2. **退款时效**：快递员揽收扫描后，系统将自动发起【极速退款】，款项预计 2 小时内原路退回您的支付账户。\n3. **特别提醒**：请确保商品吊牌未剪、防伪扣完好且无下水洗涤记录。\n\n*提示：如需打通聚水潭/万里牛 ERP 自动同步售后拦截状态，可咨询 FDE 林然进行二次定制。*`;
      }
      if (q.includes('发货') || q.includes('改地址') || q.includes('物流')) {
        return `🚚 **【订单物流与智能拦截状态】**\n\n为您查询到订单最新状态：\n- **当前节点**：浙江杭州智能分拣中心已揽收，预计明天下午送达。\n- **收货地址变更**：已通过 Webhook 向仓储 WMS 发起地址校验，当前状态允许直接修改！\n\n如有急需可为您加急顺丰空运派送。还需要为您查询其他订单吗？`;
      }
      return `您好！我是【${agent.title}】。\n\n已为您匹配最佳售后与导购策略：针对您的咨询「${userQuestion}」，系统已自动提取商品规格、库存现状及大促满减规则。\n\n✨ **智能建议**：目前店铺支持跨店满 300 减 50，叠加店铺首单礼券还可再减 15 元。若需要更精准的尺码建议，您可以提供身高/体重数据哦！`;
    }

    if (agent.id.includes('manufacturing') || agentCategory.includes('制造')) {
      return `⚙️ **【工业机床与产线设备故障排查报告】**\n\n依据车间标准《SOP-M204 维护规程》与知识库图谱：\n\n1. **首要排查源**：针对现象「${userQuestion}」，重点检查液压比例阀阀芯磨损及伺服电机编码器回零偏差。\n2. **安全停机警示**：排查前请严格执行 LOTO (挂牌上锁) 流程，泄放高压蓄能器残余压力至 0 MPa。\n3. **推荐备件型号**：Rexroth 4WRPEH6-C3B / 轴承密封套件 SKF-6208。\n\n*提示：支持私有化部署在厂区工控内网，实现 PLC 实时故障秒级告警。*`;
    }

    if (agent.id.includes('video') || agentCategory.includes('内容')) {
      return `🎬 **【黄金3秒短视频爆款策划分镜表】**\n\n🔥 **3秒 Hook 悬念开头**：\n- **画面**：急速快切特写，对比夸张前后效果。\n- **文案**：“同行绝对不会告诉你的内幕：为什么普通人做「${userQuestion.slice(0, 12)}...」总是踩坑？”\n\n📈 **核心价值与反直觉转折 (4s-25s)**：\n- 抛出 3 个具象化痛点，展示实测对比，用第一视角解决信任危机。\n\n🎯 **高转化行动号召 CTA (26s-30s)**：\n- “左下角置顶链接前 50 名立减 30 元，手慢无！”`;
    }

    if (agent.id.includes('financial') || agentCategory.includes('金融')) {
      return `📊 **【结构化财务分析与穿透评级】**\n\n针对「${userQuestion}」的关键财务维度解析：\n\n1. **收入与毛利异动**：核心业务毛利率维持在 42.8%，经营性现金流净额/净利润比值为 1.15，盈利质量稳健。\n2. **潜在风险红旗**：存货周转天数环比拉长 14 天，需关注下半年跌价准备计提压力。\n3. **估值对标建议**：目前 PE(TTM) 处于历史分位 28%，具备估值安全垫。`;
    }

    if (agent.id.includes('contract') || agentCategory.includes('企业服务')) {
      return `⚖️ **【合同法务智能审查合规意见】**\n\n针对「${userQuestion}」的法律条款风险审查：\n\n🔴 **高危风险提示**：本项表述存在违约责任单向不对等与免除主要合同义务缺陷。\n✍️ **推荐修改条款**：“双方因履行本协议发生争议的，应友好协商；协商不成的，任何一方均有权向合同签订地有管辖权的人民法院提起诉讼。”\n\n*提示：支持嵌入泛微/飞书/钉钉 OA 审批流，实现全自动合同风险逐句审查。*`;
    }

    return `您好！针对您的问题「${userQuestion}」，【${agent.title}】已完成上下文多维检索并输出专业策略。\n\n建议结合当前业务场景进一步配置输入参数。如需与您的内部业务数据库（MySQL / 飞书表格 / 自研 API）深度集成，欢迎直接咨询作者 FDE 进行专属二次开发！`;
  };

  const handleSendMessage = async (customText?: string) => {
    const textToSend = customText || inputVal.trim();
    if (!textToSend || isLoading) return;

    const newMessages = [...messages, { role: 'user' as const, content: textToSend }];
    setMessages(newMessages);
    if (!customText) setInputVal('');
    setIsLoading(true);

    try {
      // Small simulated delay for realistic feel
      setTimeout(() => {
        const response = generateAgentResponse(textToSend, agent.category);
        setMessages((prev) => [...prev, { role: 'assistant', content: response }]);
        setIsLoading(false);
      }, 700);
    } catch (e) {
      setIsLoading(false);
    }
  };

  const handleCopy = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const handleResetChat = () => {
    setMessages([...agent.demoConversation]);
  };

  return (
    <div
      id="agent-test-drawer-overlay"
      className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex justify-end transition-opacity duration-300 animate-in fade-in"
      onClick={onClose}
    >
      <div
        id="agent-test-drawer-panel"
        className="w-full max-w-2xl bg-white h-full shadow-2xl flex flex-col justify-between overflow-hidden relative animate-in slide-in-from-right duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drawer Header */}
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/80 flex items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl overflow-hidden ring-1 ring-slate-200 shrink-0">
              <img
                src={agent.coverImage}
                alt={agent.title}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
              />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-bold text-slate-900 text-base line-clamp-1">{agent.title}</h2>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  运行中
                </span>
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <button
                  id="btn-drawer-author-link"
                  onClick={() => onViewAuthorProfile(agent.authorId)}
                  className="text-xs text-slate-600 hover:text-blue-600 flex items-center gap-1.5 font-medium cursor-pointer"
                >
                  <img
                    src={agent.authorAvatar}
                    alt={agent.authorName}
                    referrerPolicy="no-referrer"
                    className="w-4 h-4 rounded-full"
                  />
                  <span>By {agent.authorName}</span>
                  <FDEBadge type={agent.authorVerifyType} label={agent.authorVerifyLabel} size="sm" />
                </button>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              id="btn-reset-chat"
              onClick={handleResetChat}
              className="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-200/60 rounded-xl transition-colors cursor-pointer"
              title="重置对话"
            >
              <RefreshCw size={16} />
            </button>
            <button
              id="btn-close-drawer"
              onClick={onClose}
              className="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-200/60 rounded-xl transition-colors cursor-pointer"
              title="关闭窗口"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Sample Prompt Chips */}
        <div className="px-6 py-2.5 bg-slate-100/70 border-b border-slate-200/80 flex items-center gap-2 overflow-x-auto text-xs no-scrollbar shrink-0">
          <span className="text-slate-500 font-medium whitespace-nowrap flex items-center gap-1">
            <Sparkles size={13} className="text-amber-500" />
            推荐提问:
          </span>
          {agent.samplePrompts.map((prompt, idx) => (
            <button
              key={idx}
              id={`sample-prompt-${idx}`}
              onClick={() => handleSamplePromptClick(prompt.replace(/^[“”"']|[“”"']$/g, ''))}
              className="px-2.5 py-1 rounded-lg bg-white hover:bg-blue-50 text-slate-700 hover:text-blue-700 border border-slate-200 hover:border-blue-300 whitespace-nowrap transition-colors cursor-pointer shadow-2xs"
            >
              {prompt}
            </button>
          ))}
        </div>

        {/* Chat Stream Body */}
        <div className="flex-1 p-6 overflow-y-auto space-y-4 bg-slate-50/40">
          {/* Top Intro Notice */}
          <div className="p-3.5 bg-blue-50/70 rounded-xl border border-blue-200/60 text-xs text-blue-900 flex items-start gap-2.5">
            <Bot size={18} className="text-blue-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-semibold text-blue-950">当前为「标准演示环境」</p>
              <p className="text-blue-800 leading-relaxed">
                您可以在此直接交互测试智能体的意图识别、专业问答与逻辑推理。若需要接入您企业的业务数据库、ERP/CRM 系统或私有化部署，请点击底部「一键咨询 FDE 进行二次开发」。
              </p>
            </div>
          </div>

          {messages.map((msg, idx) => (
            <div
              key={idx}
              className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {msg.role === 'assistant' && (
                <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-xs mt-1">
                  <Bot size={16} />
                </div>
              )}

              <div
                className={`group/bubble relative max-w-[85%] rounded-2xl p-4 text-sm leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-blue-600 text-white shadow-xs rounded-tr-xs'
                    : 'bg-white text-slate-800 border border-slate-200/90 shadow-2xs rounded-tl-xs'
                }`}
              >
                <div className="whitespace-pre-wrap font-normal">{msg.content}</div>

                {/* Copy button on hover */}
                {msg.role === 'assistant' && (
                  <button
                    onClick={() => handleCopy(msg.content, idx)}
                    className="absolute top-2 right-2 p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-500 opacity-0 group-hover/bubble:opacity-100 transition-opacity cursor-pointer"
                    title="复制回答"
                  >
                    {copiedIndex === idx ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
                  </button>
                )}
              </div>

              {msg.role === 'user' && (
                <div className="w-8 h-8 rounded-xl bg-slate-800 text-white flex items-center justify-center shrink-0 shadow-xs mt-1">
                  <User size={16} />
                </div>
              )}
            </div>
          ))}

          {isLoading && (
            <div className="flex gap-3 justify-start">
              <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                <Bot size={16} />
              </div>
              <div className="bg-white border border-slate-200 rounded-2xl rounded-tl-xs p-4 text-sm shadow-2xs flex items-center gap-2 text-slate-500">
                <span className="w-2 h-2 rounded-full bg-blue-600 animate-bounce" />
                <span className="w-2 h-2 rounded-full bg-blue-600 animate-bounce [animation-delay:0.2s]" />
                <span className="w-2 h-2 rounded-full bg-blue-600 animate-bounce [animation-delay:0.4s]" />
                <span className="text-xs ml-1">智能体正在思考并组织回答...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Bottom Conversion Bar (CRITICAL REQUIREMENT) */}
        <div className="px-6 py-3.5 bg-gradient-to-r from-amber-500/10 via-blue-500/10 to-indigo-500/10 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2 text-xs text-slate-800">
            <span className="p-1 rounded-md bg-amber-500 text-white">
              <Flame size={14} />
            </span>
            <span>
              <strong className="font-semibold text-slate-900">需要接入你的业务系统？</strong> 支持 ERP/CRM 打通、私有模型微调与长期维护
            </span>
          </div>

          <button
            id="btn-drawer-consult-fde"
            onClick={() => onConsultFDE(agent, messages[messages.length - 1]?.content)}
            className="w-full sm:w-auto px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 rounded-xl shadow-sm flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap"
          >
            <span>咨询该 FDE 二次开发</span>
            <ArrowRight size={14} />
          </button>
        </div>

        {/* Chat Input Field */}
        <div className="p-4 bg-white border-t border-slate-200 shrink-0">
          <div className="relative flex items-center">
            <input
              id="drawer-chat-input"
              type="text"
              value={inputVal}
              onChange={(e) => setInputVal(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
              placeholder="输入测试问题（例如：怎么处理售后退换货 / 报警排查步骤）..."
              className="w-full pl-4 pr-24 py-3 bg-slate-100 hover:bg-slate-50 focus:bg-white text-sm text-slate-900 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all"
            />
            <button
              id="btn-drawer-send-message"
              onClick={() => handleSendMessage()}
              disabled={!inputVal.trim() || isLoading}
              className={`absolute right-2 px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1 transition-all ${
                inputVal.trim() && !isLoading
                  ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-xs cursor-pointer'
                  : 'bg-slate-200 text-slate-400 cursor-not-allowed'
              }`}
            >
              <Send size={13} />
              <span>发送</span>
            </button>
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-400 mt-2 px-1">
            <span>按 Enter 发送测试消息 · 支持多轮业务对话测试</span>
            <span>响应延迟 ~240ms</span>
          </div>
        </div>
      </div>
    </div>
  );
};
