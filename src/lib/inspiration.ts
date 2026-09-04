import { featuredInspirationMocks } from '../../shared/inspirationMock';
import { mockExperts, mockHellomeHomeAgents, type HellomeAgentItem } from '../data/mockData';

export type PublicInspiration = {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
  fileName: string;
    likesCount: number;
  createdAt: string;
  updatedAt?: string;
  featured?: boolean;
  inspireCategory?: string;
  user: {
    id: string;
    name: string;
    avatar: string;
  };
  agent: {
    id: string;
    title: string;
    desc: string;
    coverImage: string;
    category: string;
    authorId: string;
    authorName: string;
  };
  agentAuthor: {
    id: string;
    name: string;
    avatar: string;
    title: string;
  } | null;
};

export function inspirationHash(id: string) {
  return `/inspiration/${encodeURIComponent(id)}`;
}

export function parseInspirationHash(hash: string) {
  const raw = hash.replace(/^#/, '');
  const match = raw.match(/^\/inspiration\/([^/]+)$/);
  if (!match) return null;
  return { id: decodeURIComponent(match[1]) };
}

export function clearInspirationHash() {
  if (typeof window === 'undefined') return;
  if (!parseInspirationHash(window.location.hash)) return;
  const next = `${window.location.pathname}${window.location.search}`;
  window.history.replaceState(null, '', next || '/');
}

export function getMockPublicInspirations(): PublicInspiration[] {
  return featuredInspirationMocks()
    .map((item) => {
      const agent = mockHellomeHomeAgents.find((row) => row.id === item.agentId);
      if (!agent) return null;
      const expert = mockExperts.find((row) => row.id === agent.authorId) || null;
      return {
        id: item.id,
        title: item.title,
        description: item.description,
        imageUrl: item.imageUrl,
        fileName: item.fileName,
        likesCount: item.likesCount,
        createdAt: new Date(Date.now() - item.hoursAgo * 36e5).toISOString(),
        updatedAt: new Date(Date.now() - item.hoursAgo * 36e5).toISOString(),
        featured: item.featured,
        inspireCategory: item.inspireCategory,
        user: {
          id: item.userId,
          name: item.userName,
          avatar: item.userAvatar
        },
        agent: {
          id: agent.id,
          title: agent.title,
          desc: agent.desc,
          coverImage: agent.coverImage,
          category: agent.category,
          authorId: agent.authorId || '',
          authorName: agent.authorName || expert?.name || '作者'
        },
        agentAuthor: expert
          ? {
              id: expert.id,
              name: expert.name,
              avatar: expert.avatar,
              title: expert.title
            }
          : agent.authorId
            ? {
                id: agent.authorId,
                name: agent.authorName || '作者',
                avatar: '',
                title: ''
              }
            : null
      } satisfies PublicInspiration;
    })
    .filter((item): item is PublicInspiration => Boolean(item));
}

export function getMockPublicInspiration(id: string) {
  return getMockPublicInspirations().find((item) => item.id === id) || null;
}

export function showcaseToPublicInspiration(
  item: {
    id: string;
    userId: string;
    userName: string;
    userAvatar: string;
    title: string;
    description?: string;
    imageUrl: string;
    fileName?: string;
    likesCount?: number;
    featured?: boolean;
    inspireCategory?: string;
    createdAt: string;
    updatedAt?: string;
  },
  agent: Pick<
    HellomeAgentItem,
    'id' | 'title' | 'desc' | 'coverImage' | 'category' | 'authorId' | 'authorName'
  >
): PublicInspiration {
  const expert = mockExperts.find((row) => row.id === agent.authorId) || null;
  return {
    id: item.id,
    title: item.title || '未命名成果',
    description: item.description || '',
    imageUrl: item.imageUrl,
    fileName: item.fileName || '',
    likesCount: item.likesCount || 0,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt || item.createdAt,
    featured: item.featured,
    inspireCategory: item.inspireCategory,
    user: {
      id: item.userId,
      name: item.userName,
      avatar: item.userAvatar
    },
    agent: {
      id: agent.id,
      title: agent.title,
      desc: agent.desc,
      coverImage: agent.coverImage,
      category: agent.category,
      authorId: agent.authorId || '',
      authorName: agent.authorName || expert?.name || '作者'
    },
    agentAuthor: expert
      ? {
          id: expert.id,
          name: expert.name,
          avatar: expert.avatar,
          title: expert.title
        }
      : agent.authorId
        ? {
            id: agent.authorId,
            name: agent.authorName || '作者',
            avatar: '',
            title: ''
          }
        : null
  };
}
