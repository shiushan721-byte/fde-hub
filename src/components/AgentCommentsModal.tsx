import React, { useState } from 'react';
import {
  X,
  MessageSquare,
  Heart,
  Send,
  User,
  Sparkles,
  ThumbsUp,
  Star,
  ShieldCheck
} from 'lucide-react';
import { HellomeAgentItem } from '../data/mockData';

export interface AgentCommentItem {
  id: string;
  agentId: string;
  userName: string;
  userAvatar: string;
  userRole?: string;
  content: string;
  rating: number;
  likes: number;
  timeAgo: string;
  isVerifiedBuyer?: boolean;
}

interface AgentCommentsModalProps {
  agent: HellomeAgentItem | null;
  isOpen: boolean;
  onClose: () => void;
  onOpenAuthorProfile?: (authorId: string) => void;
  onOpenAgentIntro?: (agent: HellomeAgentItem) => void;
  onAddComment?: (agentId: string, commentText: string, rating: number) => void;
}

const defaultCommentsMap: Record<string, AgentCommentItem[]> = {
  'hz-canvas': [
    {
      id: 'c-1',
      agentId: 'hz-canvas',
      userName: '视觉设计师-小澈',
      userAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80',
      userRole: '广告设计总监',
      content: '这个无限画布对分镜脚本设计太友好了！直接在画布上圈选素材就能调用生图与生视频，效率翻倍！',
      rating: 5,
      likes: 42,
      timeAgo: '10分钟前',
      isVerifiedBuyer: true
    },
    {
      id: 'c-2',
      agentId: 'hz-canvas',
      userName: '独立创作者-Leo',
      userAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80',
      userRole: 'AIGC 剪辑师',
      content: '标注功能非常顺手，Prompt 结构化解析做得很到位，强烈推荐给做自媒体视频的小伙伴。',
      rating: 5,
      likes: 18,
      timeAgo: '2小时前'
    },
    {
      id: 'c-3',
      agentId: 'hz-canvas',
      userName: '晴天工作室',
      userAvatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&auto=format&fit=crop&q=80',
      userRole: '游戏原画师',
      content: '配合作者苏晴老师的二次定制服务，帮我们把原画资产库直接打通了，非常给力。',
      rating: 5,
      likes: 9,
      timeAgo: '1天前',
      isVerifiedBuyer: true
    }
  ],
  'geo-helper': [
    {
      id: 'c-4',
      agentId: 'geo-helper',
      userName: '品牌增长-程璐',
      userAvatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=100&auto=format&fit=crop&q=80',
      userRole: '跨境电商运营经理',
      content: '在 ChatGPT 和 Perplexity 里的品牌可见度检测特别准！根据它生成的 GEO 文章权重提升很明显。',
      rating: 5,
      likes: 56,
      timeAgo: '20分钟前',
      isVerifiedBuyer: true
    },
    {
      id: 'c-5',
      agentId: 'geo-helper',
      userName: 'SEO老兵-阿威',
      userAvatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&auto=format&fit=crop&q=80',
      userRole: '数字营销顾问',
      content: '新一代搜索引擎优化的利器，抓取 AI 回答核心语义比传统爬虫更具参考价值。',
      rating: 5,
      likes: 27,
      timeAgo: '3小时前'
    }
  ],
  'doc-emergency': [
    {
      id: 'c-6',
      agentId: 'doc-emergency',
      userName: '政企公文助手-王科',
      userAvatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&auto=format&fit=crop&q=80',
      userRole: '国企行政专员',
      content: '救命神器！晚上临时要交一份格式严谨的汇报请示，输入几个要点 30 秒就排版好了，格式极其标准规范。',
      rating: 5,
      likes: 88,
      timeAgo: '5分钟前',
      isVerifiedBuyer: true
    },
    {
      id: 'c-7',
      agentId: 'doc-emergency',
      userName: '项目助理-陈欣',
      userAvatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=100&auto=format&fit=crop&q=80',
      userRole: '商务策划',
      content: '用词非常地道，起承转合自然，没有一般 AI 的机翻味，收藏了！',
      rating: 5,
      likes: 34,
      timeAgo: '1小时前'
    }
  ]
};

export const AgentCommentsModal: React.FC<AgentCommentsModalProps> = ({
  agent,
  isOpen,
  onClose,
  onOpenAuthorProfile,
  onOpenAgentIntro,
  onAddComment
}) => {
  if (!isOpen || !agent) return null;

  const [inputVal, setInputVal] = useState('');
  const [selectedRating, setSelectedRating] = useState(5);
  const [likedCommentIds, setLikedCommentIds] = useState<string[]>([]);
  const [localComments, setLocalComments] = useState<AgentCommentItem[]>(
    defaultCommentsMap[agent.id] || [
      {
        id: `c-gen-1-${agent.id}`,
        agentId: agent.id,
        userName: '体验用户_8921',
        userAvatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=80',
        userRole: '认证企业用户',
        content: `「${agent.title}」整体交互体验非常顺畅，响应速度极快，解决了我们在日常流程中的高频重复操作！`,
        rating: 5,
        likes: 12,
        timeAgo: '15分钟前',
        isVerifiedBuyer: true
      },
      {
        id: `c-gen-2-${agent.id}`,
        agentId: agent.id,
        userName: '业务数字化专员',
        userAvatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=100&auto=format&fit=crop&q=80',
        userRole: '流程架构师',
        content: `Prompt 调优和场景适配做得很扎实，如果能通过作者进行企业内网私有化定制接入就更完美了。`,
        rating: 5,
        likes: 6,
        timeAgo: '1小时前'
      }
    ]
  );

  const handleToggleLikeComment = (commentId: string) => {
    setLikedCommentIds((prev) =>
      prev.includes(commentId) ? prev.filter((id) => id !== commentId) : [...prev, commentId]
    );
  };

  const handleSendComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputVal.trim()) return;

    const newComment: AgentCommentItem = {
      id: `c-user-${Date.now()}`,
      agentId: agent.id,
      userName: '我 (当前用户)',
      userAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80',
      userRole: 'AI 开发者/创作者',
      content: inputVal.trim(),
      rating: selectedRating,
      likes: 1,
      timeAgo: '刚刚',
      isVerifiedBuyer: true
    };

    setLocalComments([newComment, ...localComments]);
    if (onAddComment) {
      onAddComment(agent.id, inputVal.trim(), selectedRating);
    }
    setInputVal('');
  };

  return (
    <div
      id="agent-comments-drawer-overlay"
      className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex justify-end transition-opacity duration-300 animate-in fade-in"
      onClick={onClose}
    >
      <div
        id="agent-comments-panel"
        className="w-full max-w-xl bg-white h-full shadow-2xl flex flex-col justify-between overflow-hidden relative animate-in slide-in-from-right duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drawer Header */}
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/90 flex items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl overflow-hidden ring-1 ring-slate-200 shrink-0">
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
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-700">
                  {localComments.length} 条评论
                </span>
              </div>
              <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-500">
                <span>作者:</span>
                <button
                  onClick={() => {
                    onClose();
                    if (onOpenAuthorProfile) onOpenAuthorProfile(agent.authorId || 'fde-linran');
                  }}
                  className="font-semibold text-blue-600 hover:underline cursor-pointer flex items-center gap-1"
                >
                  <User size={11} />
                  <span>{agent.authorName || '官方认证'}</span>
                </button>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onOpenAgentIntro && (
              <button
                onClick={() => {
                  onClose();
                  onOpenAgentIntro(agent);
                }}
                className="px-3 py-1.5 rounded-xl bg-blue-50 text-blue-700 hover:bg-blue-100 text-xs font-semibold transition-colors cursor-pointer"
              >
                查看介绍
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-200/60 rounded-xl transition-colors cursor-pointer"
              title="关闭评论"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Rating Summary Bar */}
        <div className="px-6 py-3 bg-amber-50/70 border-b border-amber-100 flex items-center justify-between text-xs shrink-0">
          <div className="flex items-center gap-2 text-amber-900 font-medium">
            <div className="flex items-center text-amber-500">
              {[...Array(5)].map((_, i) => (
                <Star key={i} size={13} className="fill-amber-400 text-amber-400" />
              ))}
            </div>
            <span className="font-bold text-slate-900 text-sm">4.9 / 5.0</span>
            <span className="text-amber-700">(98% 用户好评满意度)</span>
          </div>
          <span className="text-slate-500 text-[11px]">实名订单评价体系</span>
        </div>

        {/* Comments List */}
        <div className="flex-1 p-6 overflow-y-auto space-y-4 bg-slate-50/50">
          {localComments.map((cmt) => {
            const isLiked = likedCommentIds.includes(cmt.id);
            return (
              <div
                key={cmt.id}
                className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-2xs space-y-2.5 hover:border-slate-300 transition-all"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2.5">
                    <img
                      src={cmt.userAvatar}
                      alt={cmt.userName}
                      referrerPolicy="no-referrer"
                      className="w-8 h-8 rounded-full object-cover ring-1 ring-slate-200"
                    />
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-slate-900 text-xs">{cmt.userName}</span>
                      </div>
                      {cmt.userRole && (
                        <p className="text-[11px] text-slate-400">{cmt.userRole}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-0.5 text-amber-400">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        size={11}
                        className={star <= Math.round(cmt.rating || 5) ? 'fill-amber-400 text-amber-400' : 'text-slate-200'}
                      />
                    ))}
                  </div>
                </div>

                <p className="text-xs text-slate-700 leading-relaxed pl-10.5">
                  {cmt.content}
                </p>

                <div className="flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-100 pl-10.5">
                  <span>{cmt.timeAgo}</span>
                  <button
                    onClick={() => handleToggleLikeComment(cmt.id)}
                    className={`flex items-center gap-1 transition-colors cursor-pointer px-2 py-1 rounded-lg ${
                      isLiked
                        ? 'text-rose-600 bg-rose-50 font-semibold'
                        : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800'
                    }`}
                  >
                    <ThumbsUp size={12} className={isLiked ? 'fill-rose-500 text-rose-500' : ''} />
                    <span>{cmt.likes + (isLiked ? 1 : 0)} 赞</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Comment Post Input Box */}
        <form onSubmit={handleSendComment} className="p-4 bg-white border-t border-slate-200 shrink-0 space-y-3">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-semibold text-slate-700">发表您的使用心得：</span>
            <div className="flex items-center gap-1 text-xs">
              <span className="text-slate-400 text-[11px]">评分:</span>
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setSelectedRating(star)}
                  className="cursor-pointer transition-transform hover:scale-110"
                >
                  <Star
                    size={14}
                    className={
                      star <= selectedRating
                        ? 'fill-amber-400 text-amber-400'
                        : 'text-slate-300'
                    }
                  />
                </button>
              ))}
            </div>
          </div>

          <div className="relative flex items-center">
            <input
              type="text"
              value={inputVal}
              onChange={(e) => setInputVal(e.target.value)}
              placeholder={`对「${agent.title}」留下您的点评或提问...`}
              className="w-full pl-4 pr-24 py-3 bg-slate-100 hover:bg-slate-50 focus:bg-white text-xs sm:text-sm text-slate-900 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all"
            />
            <button
              type="submit"
              disabled={!inputVal.trim()}
              className={`absolute right-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all ${
                inputVal.trim()
                  ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-xs cursor-pointer'
                  : 'bg-slate-200 text-slate-400 cursor-not-allowed'
              }`}
            >
              <Send size={12} />
              <span>发布</span>
            </button>
          </div>
          <p className="text-[11px] text-slate-400 text-center">
            支持客观评价与技术交流 · 友好社区准则
          </p>
        </form>
      </div>
    </div>
  );
};
