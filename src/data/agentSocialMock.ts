import { INSPIRATION_MOCK_SHOWCASES } from '../../shared/inspirationMock';

export type MockShowcaseItem = {
  id: string;
  userId: string;
  userName: string;
  userAvatar: string;
  title: string;
  description?: string;
  imageUrl: string;
  featured: boolean;
  hidden: boolean;
  createdAt: string;
};

export type MockCommentItem = {
  id: string;
  userName: string;
  userAvatar: string;
  isAuthor: boolean;
  content: string;
  createdAt: string;
  replies?: Array<{
    id: string;
    userName: string;
    userAvatar: string;
    isAuthor: boolean;
    content: string;
    createdAt: string;
  }>;
};

const AVATARS = [
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=100&auto=format&fit=crop&q=80'
];

const SHOWCASE_POOL = [
  {
    title: '品牌主视觉分镜稿',
    imageUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop&q=80',
    userName: '视觉设计师-小澈',
    featured: true
  },
  {
    title: '产品短视频分镜成片',
    imageUrl: 'https://images.unsplash.com/photo-1558591710-4b4a1ae0f04d?w=800&auto=format&fit=crop&q=80',
    userName: '独立创作者-Leo',
    featured: true
  },
  {
    title: '活动主KV延展',
    imageUrl: 'https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?w=800&auto=format&fit=crop&q=80',
    userName: '品牌增长-程璐',
    featured: false
  },
  {
    title: '素材标注后的合成稿',
    imageUrl: 'https://images.unsplash.com/photo-1545239351-1141bd82e8a6?w=800&auto=format&fit=crop&q=80',
    userName: '项目助理-陈欣',
    featured: false
  },
  {
    title: '包装系列视觉提案',
    imageUrl: 'https://images.unsplash.com/photo-1561070791-2526d30994b5?w=800&auto=format&fit=crop&q=80',
    userName: '晴天工作室',
    featured: false
  },
  {
    title: '社媒封面组图',
    imageUrl: 'https://images.unsplash.com/photo-1558655146-d09347e92766?w=800&auto=format&fit=crop&q=80',
    userName: '内容主编-阿月',
    featured: false
  }
];

const COMMENT_POOL: Array<{ userName: string; content: string; hoursAgo: number }> = [
  {
    userName: '视觉设计师-小澈',
    content: '上手很快，业务场景贴合度很高，已经推荐给同事了。无限画布圈选素材就能出图，效率翻倍。',
    hoursAgo: 2
  },
  {
    userName: '独立创作者-Leo',
    content: '标注和结构化 Prompt 很顺手，做短视频分镜几乎不用二次改。',
    hoursAgo: 8
  },
  {
    userName: '品牌增长-程璐',
    content: '配合作者二次定制后打通了我们的资产库，交付速度比预期快。',
    hoursAgo: 20
  },
  {
    userName: '项目助理-陈欣',
    content: '临时救急非常管用，格式和语气都到位，收藏了。',
    hoursAgo: 30
  },
  {
    userName: 'SEO老兵-阿威',
    content: '希望后续能再多一些行业模板，现在已经能覆盖日常 80% 的需求。',
    hoursAgo: 48
  }
];

function hoursAgo(hours: number) {
  return new Date(Date.now() - hours * 3600_000).toISOString();
}

export function getMockShowcases(agentId: string): MockShowcaseItem[] {
  const fromInspiration = INSPIRATION_MOCK_SHOWCASES.filter((item) => item.agentId === agentId).map(
    (item) => ({
      id: item.id,
      userId: item.userId,
      userName: item.userName,
      userAvatar: item.userAvatar,
      title: item.title,
      description: item.description,
      imageUrl: item.imageUrl,
      featured: item.featured,
      hidden: false,
      createdAt: hoursAgo(item.hoursAgo)
    })
  );
  const usedTitles = new Set(fromInspiration.map((item) => item.title));
  const fillers = SHOWCASE_POOL.filter((item) => !usedTitles.has(item.title)).map((item, index) => ({
    id: `mock_ash_${agentId}_${index + 1}`,
    userId: `mock-showcase-user-${index + 1}`,
    userName: item.userName,
    userAvatar: AVATARS[index % AVATARS.length],
    title: item.title,
    imageUrl: item.imageUrl,
    featured: false,
    hidden: false,
    createdAt: hoursAgo(index + 8)
  }));
  return [...fromInspiration, ...fillers];
}

export function getMockComments(agentId: string, authorName = '作者'): MockCommentItem[] {
  const [first, ...rest] = COMMENT_POOL;
  return [
    {
      id: `mock_cmt_${agentId}_1`,
      userName: first.userName,
      userAvatar: AVATARS[0],
      isAuthor: false,
      content: first.content,
      createdAt: hoursAgo(first.hoursAgo),
      replies: [
        {
          id: `mock_cmt_${agentId}_reply`,
          userName: authorName,
          userAvatar: AVATARS[3],
          isAuthor: true,
          content: '感谢反馈！有定制或对接需求可以直接咨询我，会持续优化。',
          createdAt: hoursAgo(1)
        }
      ]
    },
    ...rest.map((item, index) => ({
      id: `mock_cmt_${agentId}_${index + 2}`,
      userName: item.userName,
      userAvatar: AVATARS[(index + 1) % AVATARS.length],
      isAuthor: false,
      content: item.content,
      createdAt: hoursAgo(item.hoursAgo)
    }))
  ];
}

export function getMockShowcaseComments(
  showcaseId: string,
  authorName = '作者',
  authorAvatar = AVATARS[0]
): MockCommentItem[] {
  return [
    {
      id: `mock_cmt_insp_${showcaseId}_1`,
      userName: '品牌增长-程璐',
      userAvatar: AVATARS[2],
      isAuthor: false,
      content: '这套成果的说明很清楚，构图和色板都能直接拿去对稿。',
      createdAt: hoursAgo(4),
      replies: [
        {
          id: `mock_cmt_insp_${showcaseId}_reply`,
          userName: authorName,
          userAvatar: authorAvatar,
          isAuthor: true,
          content: '谢谢！同一套智能体还能再导出物料尺寸，有问题直接评论我就好。',
          createdAt: hoursAgo(2)
        }
      ]
    },
    {
      id: `mock_cmt_insp_${showcaseId}_2`,
      userName: '独立创作者-Leo',
      userAvatar: AVATARS[1],
      isAuthor: false,
      content: '看完介绍就知道怎么复用了，已经去用同款智能体试了一版。',
      createdAt: hoursAgo(14)
    }
  ];
}
