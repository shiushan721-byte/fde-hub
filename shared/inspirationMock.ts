/** 发现灵感 / 用户成果推荐的前后台共用 mock。seed 写入 AgentShowcase，前端 API 失败时同源兜底。 */

export type InspirationMockShowcase = {
  id: string;
  agentId: string;
  title: string;
  description: string;
  imageUrl: string;
  fileName: string;
  userId: string;
  userName: string;
  userAvatar: string;
  likesCount: number;
  featured: boolean;
  inspireCategory: '视频' | '图片' | '网页' | '其他';
  hoursAgo: number;
};

const AVATARS = {
  xiaoche:
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80',
  leo: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80',
  chenglu:
    'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&auto=format&fit=crop&q=80',
  ayue: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=100&auto=format&fit=crop&q=80',
  chenxin:
    'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&auto=format&fit=crop&q=80',
  qingtian:
    'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100&auto=format&fit=crop&q=80',
  awei: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&auto=format&fit=crop&q=80',
  zhouzhou:
    'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=100&auto=format&fit=crop&q=80'
};

export const INSPIRATION_MOCK_SHOWCASES: InspirationMockShowcase[] = [
  {
    id: 'ash_insp_hz-canvas_kv',
    agentId: 'hz-canvas',
    title: '新茶饮品牌主视觉三套 KV',
    description:
      '用无限画布把品牌主视觉拆成可标注分镜，圈选素材后直接出图。这次给新茶饮做了三套主 KV，色板和构图都更稳，客户当场定了第二套。',
    imageUrl:
      'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop&q=80',
    fileName: 'tea-brand-kv.jpg',
    userId: 'showcase-user-xiaoche',
    userName: '视觉设计师-小澈',
    userAvatar: AVATARS.xiaoche,
    likesCount: 1280,
    featured: true,
    inspireCategory: '图片',
    hoursAgo: 6
  },
  {
    id: 'ash_insp_hz-canvas_video',
    agentId: 'hz-canvas',
    title: '15 秒产品短视频分镜成片',
    description:
      '先在画布上标出镜头节奏，再导出成片。这条 15 秒产品视频从分镜到成片大约半天，Prompt 结构比手写稳定很多。',
    imageUrl:
      'https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?w=800&auto=format&fit=crop&q=80',
    fileName: 'product-video-storyboard.jpg',
    userId: 'showcase-user-leo',
    userName: '独立创作者-Leo',
    userAvatar: AVATARS.leo,
    likesCount: 864,
    featured: true,
    inspireCategory: '视频',
    hoursAgo: 18
  },
  {
    id: 'ash_insp_geo-helper_article',
    agentId: 'geo-helper',
    title: 'GEO 问答覆盖长文：咖啡器具选购',
    description:
      '按模型检索问题拆了 12 个问答锚点，生成的长文被 Perplexity 和豆包同时引用。品牌词可见度一周内从 18% 提到 41%。',
    imageUrl:
      'https://images.unsplash.com/photo-1557804506-669a67965ba0?w=800&auto=format&fit=crop&q=80',
    fileName: 'geo-coffee-article.jpg',
    userId: 'showcase-user-awei',
    userName: 'SEO老兵-阿威',
    userAvatar: AVATARS.awei,
    likesCount: 532,
    featured: true,
    inspireCategory: '网页',
    hoursAgo: 11
  },
  {
    id: 'ash_insp_geo-helper_weekly',
    agentId: 'geo-helper',
    title: '品牌 AI 可见度监测周报',
    description:
      '把竞品和自家品牌丢进 GEO 助手，自动出关键词覆盖、引用率和缺口清单。这周的周报直接拿去给市场例会讲。',
    imageUrl:
      'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&auto=format&fit=crop&q=80',
    fileName: 'geo-visibility-weekly.jpg',
    userId: 'showcase-user-chenglu',
    userName: '品牌增长-程璐',
    userAvatar: AVATARS.chenglu,
    likesCount: 391,
    featured: true,
    inspireCategory: '网页',
    hoursAgo: 28
  },
  {
    id: 'ash_insp_doc-emergency_board',
    agentId: 'doc-emergency',
    title: '董事会请示一夜出稿',
    description:
      '临时要一份上会请示，按公司语气和往期格式生成，领导和法务只改了两处数字。救急文书比从空白页写快太多。',
    imageUrl:
      'https://images.unsplash.com/photo-1517842645767-c639042777db?w=800&auto=format&fit=crop&q=80',
    fileName: 'board-request-doc.jpg',
    userId: 'showcase-user-chenxin',
    userName: '项目助理-陈欣',
    userAvatar: AVATARS.chenxin,
    likesCount: 276,
    featured: true,
    inspireCategory: '其他',
    hoursAgo: 9
  },
  {
    id: 'ash_insp_news-radar_brief',
    agentId: 'global-news-radar',
    title: '制造业早报：政策 + 行情 + 地图',
    description:
      '把官方信息源和市场行情叠在同一份早报里，管理层通勤路上就能看完。这期重点标了出口管制和原材料波动。',
    imageUrl:
      'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=800&auto=format&fit=crop&q=80',
    fileName: 'industry-morning-brief.jpg',
    userId: 'showcase-user-zhouzhou',
    userName: '情报运营-周舟',
    userAvatar: AVATARS.zhouzhou,
    likesCount: 448,
    featured: true,
    inspireCategory: '网页',
    hoursAgo: 4
  },
  {
    id: 'ash_insp_job-seek_resume',
    agentId: 'job-seek-assistant',
    title: '产品经理简历按 JD 定制改写',
    description:
      '贴了目标公司和 JD 之后，简历按岗位关键词重排，模拟面试题也一起出。两周内拿到了 3 个终面。',
    imageUrl:
      'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=800&auto=format&fit=crop&q=80',
    fileName: 'pm-resume-rewrite.jpg',
    userId: 'showcase-user-ayue',
    userName: '内容主编-阿月',
    userAvatar: AVATARS.ayue,
    likesCount: 615,
    featured: true,
    inspireCategory: '其他',
    hoursAgo: 33
  },
  {
    id: 'ash_insp_pdf-tools_tender',
    agentId: 'pdf-tools',
    title: '投标文件 40 页合并归档',
    description:
      '商务标、技术标和资质扫描件一次性合并、抽页、旋转后导出。标书截止前两小时整理完，没有再手动拖页。',
    imageUrl:
      'https://images.unsplash.com/photo-1586281380349-632531db7ed4?w=800&auto=format&fit=crop&q=80',
    fileName: 'tender-merged.pdf',
    userId: 'showcase-user-chenxin',
    userName: '项目助理-陈欣',
    userAvatar: AVATARS.chenxin,
    likesCount: 188,
    featured: true,
    inspireCategory: '其他',
    hoursAgo: 40
  },
  {
    id: 'ash_insp_img-compress_sku',
    agentId: 'img-compress',
    title: '电商主图 200 张批量压缩',
    description:
      '大促前把 200 张主图压到 300KB 以内还保持画质。详情页打开速度快了一截，投放素材也不用重新导出。',
    imageUrl:
      'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800&auto=format&fit=crop&q=80',
    fileName: 'sku-images-compressed.jpg',
    userId: 'showcase-user-qingtian',
    userName: '晴天工作室',
    userAvatar: AVATARS.qingtian,
    likesCount: 742,
    featured: true,
    inspireCategory: '图片',
    hoursAgo: 14
  },
  {
    id: 'ash_insp_cs_replies',
    agentId: 'ecommerce-ai-cs',
    title: '退换货话术知识卡上线',
    description:
      '把高频售后意图整理成知识卡，接入千牛后重复工单少了一半。这组卡片是运营和客服一起用智能体打磨的。',
    imageUrl:
      'https://images.unsplash.com/photo-1556740758-90de374c12ad?w=800&auto=format&fit=crop&q=80',
    fileName: 'aftersale-knowledge-cards.jpg',
    userId: 'showcase-user-chenglu',
    userName: '品牌增长-程璐',
    userAvatar: AVATARS.chenglu,
    likesCount: 509,
    featured: true,
    inspireCategory: '图片',
    hoursAgo: 22
  }
];

export function featuredInspirationMocks() {
  return INSPIRATION_MOCK_SHOWCASES.filter((item) => item.featured);
}
