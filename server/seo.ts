import fs from 'node:fs/promises';
import path from 'node:path';
import type { Request, Response } from 'express';
import { prisma } from './lib/prisma';
import { parseJson } from './lib/json';
import { getPublicInspiration, listPublicInspirations } from './services/agentShowcases';

const DEFAULT_SITE_URL = 'https://www.hellome.art';
const SITE_NAME = 'HelloMe';
const HOME_TITLE = 'HelloMe-国内交互应用智能体平台创新引领者｜Hello, Me. 懂世界，更懂 Me。';
const HOME_DESCRIPTION =
  'HelloMe 是面向个人与企业的交互应用智能体平台，汇集 AI 专家、智能体与真实应用案例，支持本地安全运行、体验和专家定制。';

type SeoDocument = {
  title: string;
  description: string;
  canonicalPath: string;
  image?: string;
  type?: 'website' | 'article' | 'profile';
  robots?: string;
  jsonLd: Record<string, unknown> | Array<Record<string, unknown>>;
  body: string;
};

function siteUrl() {
  return (process.env.SITE_URL || DEFAULT_SITE_URL).replace(/\/$/, '');
}

function escapeHtml(value: unknown) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function truncate(value: string, max = 155) {
  const normalized = value.replace(/\s+/g, ' ').trim();
  return normalized.length > max ? `${normalized.slice(0, max - 1)}…` : normalized;
}

function absoluteUrl(value: string | undefined, base = siteUrl()) {
  if (!value) return `${base}/`;
  if (/^https?:\/\//i.test(value)) return value;
  return `${base}${value.startsWith('/') ? value : `/${value}`}`;
}

function safeJson(value: unknown) {
  return JSON.stringify(value).replace(/</g, '\\u003c');
}

function breadcrumb(items: Array<{ name: string; path: string }>) {
  return {
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: absoluteUrl(item.path)
    }))
  };
}

function pageShell(title: string, intro: string, content = '') {
  return `<main id="seo-content"><header><a href="/">${SITE_NAME}</a><h1>${escapeHtml(
    title
  )}</h1><p>${escapeHtml(intro)}</p></header>${content}</main>`;
}

async function homeDocument(): Promise<SeoDocument> {
  const [agents, experts] = await Promise.all([
    prisma.agent.findMany({
      where: { status: 'published', creatorDeletedAt: null, showOnHome: true },
      orderBy: [{ featured: 'desc' }, { sortOrder: 'asc' }],
      take: 24,
      select: { id: true, title: true, desc: true, category: true }
    }),
    prisma.expert.findMany({
      where: { listed: true, status: 'active', paused: false },
      orderBy: [{ featured: 'desc' }, { sortOrder: 'asc' }],
      take: 18,
      select: { id: true, name: true, title: true, bio: true }
    })
  ]);
  const agentLinks = agents
    .map(
      (item) =>
        `<article><h2><a href="/agent/${encodeURIComponent(item.id)}">${escapeHtml(
          item.title
        )}</a></h2><p>${escapeHtml(item.desc)}</p><small>${escapeHtml(item.category)}</small></article>`
    )
    .join('');
  const expertLinks = experts
    .map(
      (item) =>
        `<article><h2><a href="/expert/${encodeURIComponent(item.id)}">${escapeHtml(
          item.name
        )}</a></h2><p>${escapeHtml(item.title || item.bio)}</p></article>`
    )
    .join('');
  return {
    title: HOME_TITLE,
    description: HOME_DESCRIPTION,
    canonicalPath: '/',
    type: 'website',
    jsonLd: [
      {
        '@context': 'https://schema.org',
        '@type': 'Organization',
        name: SITE_NAME,
        url: absoluteUrl('/'),
        description: HOME_DESCRIPTION
      },
      {
        '@context': 'https://schema.org',
        '@type': 'WebSite',
        name: SITE_NAME,
        url: absoluteUrl('/'),
        description: HOME_DESCRIPTION,
        inLanguage: 'zh-CN'
      }
    ],
    body: pageShell(
      '发现适合你的 AI 智能体与专家',
      HOME_DESCRIPTION,
      `<section><h2>热门智能体</h2>${agentLinks}</section><section><h2>AI 专家</h2>${expertLinks}</section>`
    )
  };
}

async function agentsIndexDocument(): Promise<SeoDocument> {
  const agents = await prisma.agent.findMany({
    where: { status: 'published', creatorDeletedAt: null },
    orderBy: [{ featured: 'desc' }, { updatedAt: 'desc' }],
    select: { id: true, title: true, desc: true, category: true }
  });
  const content = agents
    .map(
      (item) =>
        `<article><h2><a href="/agent/${encodeURIComponent(item.id)}">${escapeHtml(
          item.title
        )}</a></h2><p>${escapeHtml(item.desc)}</p><small>${escapeHtml(item.category)}</small></article>`
    )
    .join('');
  const description = '浏览 HelloMe 已公开的交互应用智能体，按业务场景发现可直接使用或联系专家定制的 AI 工具。';
  return {
    title: `AI 智能体市场｜${SITE_NAME}`,
    description,
    canonicalPath: '/agents',
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      name: 'AI 智能体市场',
      description,
      url: absoluteUrl('/agents')
    },
    body: pageShell('AI 智能体市场', description, `<section>${content}</section>`)
  };
}

async function agentDocument(id: string): Promise<SeoDocument | null> {
  const agent = await prisma.agent.findFirst({
    where: { id, status: 'published', creatorDeletedAt: null }
  });
  if (!agent) return null;
  const payload = parseJson<Record<string, unknown>>(agent.solutionPayload, {});
  const description = truncate(
    String(payload.description || payload.subtitle || agent.desc || `${agent.title} 智能体介绍与使用方式`)
  );
  const capabilities = Array.isArray(payload.capabilities)
    ? payload.capabilities.filter((item): item is string => typeof item === 'string')
    : [];
  const author = agent.authorId
    ? await prisma.expert.findFirst({
        where: { id: agent.authorId, listed: true, status: 'active', paused: false },
        select: { id: true, name: true }
      })
    : null;
  const pathName = `/agent/${encodeURIComponent(agent.id)}`;
  const featureList = capabilities.length
    ? `<section><h2>核心能力</h2><ul>${capabilities
        .map((item) => `<li>${escapeHtml(item)}</li>`)
        .join('')}</ul></section>`
    : '';
  const authorLink = author
    ? `<p>由 <a href="/expert/${encodeURIComponent(author.id)}">${escapeHtml(author.name)}</a> 提供</p>`
    : '';
  return {
    title: `${agent.title}｜${agent.category || 'AI 智能体'}｜${SITE_NAME}`,
    description,
    canonicalPath: pathName,
    image: agent.coverImage,
    jsonLd: [
      {
        '@context': 'https://schema.org',
        '@type': 'SoftwareApplication',
        name: agent.title,
        description,
        image: absoluteUrl(agent.coverImage),
        url: absoluteUrl(pathName),
        applicationCategory: agent.category || 'AIApplication',
        operatingSystem: 'Windows, macOS',
        ...(typeof agent.price === 'number'
          ? {
              offers: {
                '@type': 'Offer',
                priceCurrency: 'CNY',
                price: agent.price,
                availability: 'https://schema.org/InStock'
              }
            }
          : {}),
        ...(author ? { author: { '@type': 'Person', name: author.name, url: absoluteUrl(`/expert/${author.id}`) } } : {})
      },
      {
        '@context': 'https://schema.org',
        ...breadcrumb([
          { name: '首页', path: '/' },
          { name: '智能体', path: '/agents' },
          { name: agent.title, path: pathName }
        ])
      }
    ],
    body: pageShell(agent.title, description, `${authorLink}${featureList}`)
  };
}

async function expertsIndexDocument(): Promise<SeoDocument> {
  const experts = await prisma.expert.findMany({
    where: { listed: true, status: 'active', paused: false },
    orderBy: [{ featured: 'desc' }, { sortOrder: 'asc' }],
    select: { id: true, name: true, title: true, bio: true, domainTags: true }
  });
  const content = experts
    .map((item) => {
      const tags = parseJson<string[]>(item.domainTags, []).join('、');
      return `<article><h2><a href="/expert/${encodeURIComponent(item.id)}">${escapeHtml(
        item.name
      )}</a></h2><p>${escapeHtml(item.title || item.bio)}</p><small>${escapeHtml(tags)}</small></article>`;
    })
    .join('');
  const description = '发现 HelloMe 认证 AI 专家，查看其擅长领域、智能体产品、项目案例和可提供的定制服务。';
  return {
    title: `AI 专家库｜${SITE_NAME}`,
    description,
    canonicalPath: '/experts',
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      name: 'AI 专家库',
      description,
      url: absoluteUrl('/experts')
    },
    body: pageShell('AI 专家库', description, `<section>${content}</section>`)
  };
}

async function expertDocument(id: string): Promise<SeoDocument | null> {
  const expert = await prisma.expert.findFirst({
    where: { id, listed: true, status: 'active', paused: false }
  });
  if (!expert) return null;
  const agents = await prisma.agent.findMany({
    where: { authorId: expert.id, status: 'published', creatorDeletedAt: null },
    orderBy: { sortOrder: 'asc' },
    select: { id: true, title: true, desc: true }
  });
  const tags = parseJson<string[]>(expert.domainTags, []);
  const skills = parseJson<string[]>(expert.skills, []);
  const description = truncate(
    expert.bio || `${expert.name}，${expert.title || 'AI 专家'}，擅长${tags.join('、') || 'AI 智能体应用与定制'}。`
  );
  const pathName = `/expert/${encodeURIComponent(expert.id)}`;
  const agentLinks = agents
    .map(
      (item) =>
        `<article><h2><a href="/agent/${encodeURIComponent(item.id)}">${escapeHtml(
          item.title
        )}</a></h2><p>${escapeHtml(item.desc)}</p></article>`
    )
    .join('');
  return {
    title: `${expert.name}｜${expert.title || 'AI 专家'}｜${SITE_NAME}`,
    description,
    canonicalPath: pathName,
    image: expert.avatar,
    type: 'profile',
    jsonLd: [
      {
        '@context': 'https://schema.org',
        '@type': 'ProfilePage',
        name: `${expert.name}的 AI 专家主页`,
        description,
        url: absoluteUrl(pathName),
        mainEntity: {
          '@type': 'Person',
          name: expert.name,
          image: absoluteUrl(expert.avatar),
          jobTitle: expert.title || 'AI 专家',
          description,
          knowsAbout: [...tags, ...skills]
        }
      },
      {
        '@context': 'https://schema.org',
        ...breadcrumb([
          { name: '首页', path: '/' },
          { name: 'AI 专家', path: '/experts' },
          { name: expert.name, path: pathName }
        ])
      }
    ],
    body: pageShell(
      expert.name,
      description,
      `<p>${escapeHtml(expert.title)}</p><p>擅长领域：${escapeHtml(tags.join('、'))}</p><section><h2>公开智能体</h2>${agentLinks}</section>`
    )
  };
}

async function inspirationsIndexDocument(): Promise<SeoDocument> {
  const items = await listPublicInspirations();
  const content = items
    .map(
      (item) =>
        `<article><h2><a href="/inspiration/${encodeURIComponent(item.id)}">${escapeHtml(
          item.title
        )}</a></h2><p>${escapeHtml(item.description)}</p><small>使用 ${escapeHtml(
          item.agent.title
        )} 创作</small></article>`
    )
    .join('');
  const description = '浏览由 HelloMe 智能体创作的图片、视频、网页及其他真实成果案例，发现灵感并找到对应智能体。';
  return {
    title: `AI 创作案例与灵感｜${SITE_NAME}`,
    description,
    canonicalPath: '/inspirations',
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      name: 'AI 创作案例与灵感',
      description,
      url: absoluteUrl('/inspirations')
    },
    body: pageShell('AI 创作案例与灵感', description, `<section>${content}</section>`)
  };
}

async function inspirationDocument(id: string): Promise<SeoDocument | null> {
  const item = await getPublicInspiration(id);
  if (!item || !item.featured) return null;
  const description = truncate(
    item.description || `${item.title}，使用 ${item.agent.title} 智能体创作的公开案例。`
  );
  const pathName = `/inspiration/${encodeURIComponent(item.id)}`;
  return {
    title: `${item.title}｜AI 创作案例｜${SITE_NAME}`,
    description,
    canonicalPath: pathName,
    image: item.imageUrl,
    type: 'article',
    jsonLd: [
      {
        '@context': 'https://schema.org',
        '@type': 'CreativeWork',
        name: item.title,
        description,
        image: absoluteUrl(item.imageUrl),
        url: absoluteUrl(pathName),
        dateCreated: item.createdAt,
        dateModified: item.updatedAt || item.createdAt,
        creator: { '@type': 'Person', name: item.user.name },
        isBasedOn: {
          '@type': 'SoftwareApplication',
          name: item.agent.title,
          url: absoluteUrl(`/agent/${item.agent.id}`)
        }
      },
      {
        '@context': 'https://schema.org',
        ...breadcrumb([
          { name: '首页', path: '/' },
          { name: '创作灵感', path: '/inspirations' },
          { name: item.title, path: pathName }
        ])
      }
    ],
    body: pageShell(
      item.title,
      description,
      `<img src="${escapeHtml(absoluteUrl(item.imageUrl))}" alt="${escapeHtml(
        item.title
      )}"/><p>使用 <a href="/agent/${encodeURIComponent(item.agent.id)}">${escapeHtml(
        item.agent.title
      )}</a> 创作</p>`
    )
  };
}

function injectSeo(template: string, document: SeoDocument) {
  const canonical = absoluteUrl(document.canonicalPath);
  const image = document.image ? absoluteUrl(document.image) : '';
  const meta = [
    `<title>${escapeHtml(document.title)}</title>`,
    `<meta name="description" content="${escapeHtml(document.description)}" />`,
    `<meta name="robots" content="${escapeHtml(document.robots || 'index,follow,max-image-preview:large')}" />`,
    `<link rel="canonical" href="${escapeHtml(canonical)}" />`,
    `<meta property="og:site_name" content="${SITE_NAME}" />`,
    `<meta property="og:title" content="${escapeHtml(document.title)}" />`,
    `<meta property="og:description" content="${escapeHtml(document.description)}" />`,
    `<meta property="og:type" content="${document.type || 'website'}" />`,
    `<meta property="og:url" content="${escapeHtml(canonical)}" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="twitter:title" content="${escapeHtml(document.title)}" />`,
    `<meta name="twitter:description" content="${escapeHtml(document.description)}" />`,
    ...(image
      ? [
          `<meta property="og:image" content="${escapeHtml(image)}" />`,
          `<meta name="twitter:image" content="${escapeHtml(image)}" />`
        ]
      : []),
    ...(process.env.BAIDU_SITE_VERIFICATION
      ? [
          `<meta name="baidu-site-verification" content="${escapeHtml(
            process.env.BAIDU_SITE_VERIFICATION
          )}" />`
        ]
      : []),
    `<script type="application/ld+json" id="seo-jsonld">${safeJson(document.jsonLd)}</script>`
  ].join('\n    ');
  return template
    .replace(/<title>[\s\S]*?<\/title>/i, '')
    .replace(/<meta\s+name=["']description["'][^>]*>/i, '')
    .replace(/<meta\s+name=["']robots["'][^>]*>/i, '')
    .replace(/<link\s+rel=["']canonical["'][^>]*>/i, '')
    .replace(/<meta\s+property=["']og:[^>]*>/gi, '')
    .replace(/<meta\s+name=["']twitter:[^>]*>/gi, '')
    .replace('</head>', `    ${meta}\n  </head>`)
    .replace('<div id="root"></div>', `<div id="root">${document.body}</div>`);
}

async function readTemplate() {
  const distTemplate = path.resolve(process.cwd(), 'dist/index.html');
  try {
    return await fs.readFile(distTemplate, 'utf8');
  } catch {
    return await fs.readFile(path.resolve(process.cwd(), 'index.html'), 'utf8');
  }
}

export async function handleSeoPage(req: Request, res: Response) {
  let document: SeoDocument | null = null;
  if (req.path === '/') document = await homeDocument();
  else if (req.path === '/agents') document = await agentsIndexDocument();
  else if (req.path === '/experts') document = await expertsIndexDocument();
  else if (req.path === '/inspirations') document = await inspirationsIndexDocument();
  else if (req.params.agentId) document = await agentDocument(req.params.agentId);
  else if (req.params.expertId) document = await expertDocument(req.params.expertId);
  else if (req.params.inspirationId) document = await inspirationDocument(req.params.inspirationId);

  if (!document) {
    return res.status(404).send('页面不存在');
  }
  const template = await readTemplate();
  res.set('Cache-Control', 'public, max-age=0, s-maxage=300, stale-while-revalidate=600');
  return res.status(200).type('html').send(injectSeo(template, document));
}

export async function handleSitemap(_req: Request, res: Response) {
  const [agents, experts, inspirations] = await Promise.all([
    prisma.agent.findMany({
      where: { status: 'published', creatorDeletedAt: null },
      select: { id: true, updatedAt: true }
    }),
    prisma.expert.findMany({
      where: { listed: true, status: 'active', paused: false },
      select: { id: true, updatedAt: true }
    }),
    prisma.agentShowcase.findMany({
      where: {
        featured: true,
        status: 'visible',
        agent: { status: 'published', creatorDeletedAt: null }
      },
      select: { id: true, updatedAt: true }
    })
  ]);
  const urls = [
    { path: '/', lastmod: new Date() },
    { path: '/agents', lastmod: new Date() },
    { path: '/experts', lastmod: new Date() },
    { path: '/inspirations', lastmod: new Date() },
    ...agents.map((item) => ({ path: `/agent/${encodeURIComponent(item.id)}`, lastmod: item.updatedAt })),
    ...experts.map((item) => ({ path: `/expert/${encodeURIComponent(item.id)}`, lastmod: item.updatedAt })),
    ...inspirations.map((item) => ({
      path: `/inspiration/${encodeURIComponent(item.id)}`,
      lastmod: item.updatedAt
    }))
  ];
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls
    .map(
      (item) =>
        `  <url><loc>${escapeHtml(absoluteUrl(item.path))}</loc><lastmod>${item.lastmod
          .toISOString()
          .slice(0, 10)}</lastmod></url>`
    )
    .join('\n')}\n</urlset>`;
  res.set('Cache-Control', 'public, max-age=0, s-maxage=900');
  return res.type('application/xml').send(xml);
}

export function handleRobots(_req: Request, res: Response) {
  const body = [
    'User-agent: *',
    'Allow: /',
    'Disallow: /api/',
    'Disallow: /admin',
    'Disallow: /workspace',
    'Disallow: /creator-center',
    'Disallow: /orders',
    'Disallow: /account',
    '',
    `Sitemap: ${absoluteUrl('/sitemap.xml')}`
  ].join('\n');
  return res.type('text/plain').send(body);
}
