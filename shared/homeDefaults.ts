export type HomeBannerSlot = 'main' | 'experience' | 'creator';

export interface HomeBannerItem {
  id: string;
  slot: HomeBannerSlot;
  eyebrow: string;
  title: string;
  subtitle: string;
  ctaLabel: string;
  ctaTarget: string;
  sortOrder: number;
  visible: boolean;
}

export const defaultHomeBanners: HomeBannerItem[] = [
  {
    id: 'banner-main',
    slot: 'main',
    eyebrow: '官方市场',
    title: '全球首创的应用智能体交易平台',
    subtitle: '汇聚顶尖创作者与应用智能体，点击智能体直接进入作者主页探索更多方案',
    ctaLabel: '探索热门智能体',
    ctaTarget: 'home-catalogue-bar',
    sortOrder: 1,
    visible: true
  },
  {
    id: 'banner-experience',
    slot: 'experience',
    eyebrow: '创作者聚合',
    title: '发现优秀创作者与热门智能体作品',
    subtitle: '点击智能体卡片即可进入创作者专属主页，查看全部代表作品与案例。',
    ctaLabel: '浏览作品',
    ctaTarget: 'home-catalogue-bar',
    sortOrder: 2,
    visible: true
  },
  {
    id: 'banner-creator',
    slot: 'creator',
    eyebrow: '创作者商业化',
    title: '打造 AI 智能体，打造个人专属创作者主页',
    subtitle: '发布可运行作品，建立专家主页，承接企业定制与咨询。',
    ctaLabel: '进入 AI 专家中心',
    ctaTarget: 'creator-center',
    sortOrder: 3,
    visible: true
  }
];

export const defaultHomeCategories = ['全部', '内容营销', '创作工具', '办公协同', '图片视频'];
