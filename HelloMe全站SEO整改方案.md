# HelloMe 全站 SEO 整改方案

> 文档版本：V1.0  
> 适用站点：https://www.hellome.art/  
> 制定时间：2026 年 9 月  
> 使用对象：产品、设计、前端、后端、测试、运维与内容运营  
> 重要约束：首页现有标题保持不变

---

## 1. 建设目标

将 HelloMe 从主要依赖客户端 JavaScript 渲染的单页应用，升级为具备完整搜索引擎抓取、理解、收录与分享能力的内容型智能体平台。

改造后需要实现：

1. 首页、智能体、专家、作品等公开内容拥有独立 URL。
2. 每个公开页面由服务端直接输出标题、正文和主要链接。
3. 每个页面拥有独立 Title、Description、Canonical、Open Graph 和结构化数据。
4. 搜索引擎能够理解首页、智能体、专家、作品和解决方案之间的关系。
5. 工作台、账户、订单、支付和管理后台等私有页面不参与收录。
6. 资料不完整、重复、审核中或内容价值不足的页面不得进入 Sitemap。
7. 百度、必应等搜索引擎可以通过 Sitemap 发现新增和更新内容。
8. 通过站内链接将搜索访问引导至智能体使用、运行器安装和专家咨询。

---

## 2. 当前线上问题

### 2.1 公开页面源码没有主体内容

目前大部分页面的初始 HTML 主要为：

```html
<div id="root"></div>
```

实际内容需要浏览器执行 JavaScript 后才能出现。

整改要求：

- 首页、智能体、专家、作品和内容页面必须使用 SSR、SSG 或 ISR。
- 禁用 JavaScript 后，仍能看到页面 H1、介绍、主要正文和公开链接。
- 交互功能可以在客户端加载，但公开正文不能完全依赖客户端接口请求。

### 2.2 不同页面共用首页 SEO 信息

目前抽查到的 `/agents`、智能体详情、专家主页和作品详情，服务端返回的 Title、Description、Canonical 和首页相同。

这会导致搜索引擎无法区分页面主题，并可能将详情页全部视为首页重复页面。

### 2.3 首页存在重复地址

以下地址目前都可以返回首页：

```text
https://www.hellome.art/
https://www.hellome.art/welcome
```

整改后以根路径作为唯一首页：

```text
/welcome → HTTP 301 → /
```

### 2.4 Sitemap 无效

当前 `/sitemap.xml` 返回首页 HTML，而不是 XML 站点地图。

必须改为有效的 Sitemap Index，并按照页面类型拆分子 Sitemap。

### 2.5 无效地址可能返回 HTTP 200

错误 URL 不得返回首页和 200。

- 内容不存在：404
- 永久删除：404 或 410
- URL 永久迁移：301
- 私有内容：登录校验或 401/403，并设置 NOINDEX

---

## 3. SEO 状态定义

| 状态 | 含义 |
|---|---|
| INDEX | 允许抓取和收录 |
| CONDITIONAL | 达到内容质量门槛后才允许收录 |
| NOINDEX | 页面可访问，但禁止收录 |
| BLOCK | 通过 robots.txt 限制抓取 |
| 301 | 永久跳转到规范 URL |
| 404/410 | 内容不存在或永久删除 |

---

## 4. 全站页面与收录策略

| 页面 | 规范 URL | 状态 | 说明 |
|---|---|---:|---|
| 平台首页 | `/` | INDEX | 唯一首页 |
| 旧首页 | `/welcome` | 301 | 跳转到 `/` |
| 智能体列表 | `/agents` | INDEX | 公开智能体聚合页 |
| 智能体详情 | `/agents/{agentSlug}` | CONDITIONAL | 达到内容门槛后收录 |
| 旧智能体地址 | `/agent/{agentSlug}` | 301 | 统一到复数路径 |
| 专家列表 | `/experts` | INDEX | 公开专家聚合页 |
| 专家主页 | `/experts/{expertSlug}` | CONDITIONAL | 资料完整后收录 |
| 作品列表 | `/works` | INDEX | 公开精选作品聚合页 |
| 作品详情 | `/agents/{agentSlug}/works/{workId}` | CONDITIONAL | 精选且内容完整后收录 |
| FDE 介绍 | `/fde` | INDEX | 专家招募与模式介绍 |
| 价格页 | `/pricing` | INDEX | 统一说明不同收费类型 |
| 本地运行器 | `/connect-hermes` | 待定 | 公开介绍可 INDEX；连接流程 NOINDEX |
| 场景解决方案 | `/solutions/{slug}` | INDEX | 自然搜索重点页面 |
| 内容中心 | `/articles` | INDEX | 原创内容聚合页 |
| 文章详情 | `/articles/{slug}` | CONDITIONAL | 原创且达到质量标准后收录 |
| 登录 | `/login` | NOINDEX | 不进入 Sitemap |
| 通知 | `/notifications` | NOINDEX | 用户私有页面 |
| 支付 | `/pay` | NOINDEX | 交易页面 |
| 设置 | `/settings/*` | NOINDEX | 用户私有页面 |
| 工作台 | `/app/*` | NOINDEX＋BLOCK | 应用功能区 |
| 管理后台 | `/admin/*` | NOINDEX＋BLOCK | 后台管理区 |
| 不存在页面 | 任意无效 URL | 404 | 不得返回首页 200 |

---

## 5. 全站通用 SEO 标准

### 5.1 Title

- 每个页面只能有一个 `<title>`。
- 首页标题保持不变。
- 其他页面使用独立标题，核心主题靠前，HelloMe 放在结尾。
- 不通过罗列大量关键词制造差异。

通用格式：

```text
{页面主题}｜{核心功能或分类}｜HelloMe
```

### 5.2 Meta Description

- 每个页面必须有独立 Description。
- 建议控制在 70～120 个中文字符。
- 说明页面内容、目标用户、核心功能和使用价值。
- 不复制首页 Description，不堆砌竞品和无关品牌名。

### 5.3 Canonical

每个公开页面只能有一个 Canonical：

```html
<link rel="canonical" href="https://www.hellome.art/规范路径" />
```

Canonical 不得包含：

- UTM 参数
- 分享 Token
- 登录状态参数
- 来源参数
- 排序参数
- 临时筛选参数

### 5.4 Robots Meta

公开页面：

```html
<meta name="robots" content="index,follow,max-image-preview:large" />
```

资料不完整但允许访问：

```html
<meta name="robots" content="noindex,follow" />
```

私有页面：

```html
<meta name="robots" content="noindex,nofollow" />
```

### 5.5 标题层级

- 每个页面只能有一个 H1。
- 一级模块使用 H2。
- 模块内子标题使用 H3。
- 页面 Logo 和导航文字不得重复使用 H1。

### 5.6 Open Graph

公开页面必须配置：

```html
<meta property="og:type" content="website" />
<meta property="og:site_name" content="HelloMe" />
<meta property="og:locale" content="zh_CN" />
<meta property="og:title" content="页面标题" />
<meta property="og:description" content="页面描述" />
<meta property="og:url" content="规范 URL" />
<meta property="og:image" content="分享图片 URL" />
```

分享图标准：

```text
尺寸：1200 × 630
格式：JPG 或 WebP
内容：页面主体＋页面标题＋HelloMe 品牌标识
```

---

## 6. 首页整改

### 6.1 URL

```text
规范地址：https://www.hellome.art/
旧地址：https://www.hellome.art/welcome
处理方式：/welcome 301 跳转到 /
```

### 6.2 Title

首页标题按照业务要求保持不变：

```text
HelloMe-国内交互应用智能体平台创新引领者｜Hello, Me. 懂世界，更懂 Me。
```

### 6.3 Description

```text
HelloMe 是国内交互应用智能体平台，为个人和企业提供即选即用的 AI 智能体，覆盖内容创作、销售获客、办公自动化和数据分析等场景，支持本地安全运行及 AI 专家定制服务。
```

### 6.4 H1

```text
发现适合你的交互应用智能体
```

品牌口号作为普通副标题：

```text
Hello, Me. 懂世界，更懂 Me。
```

### 6.5 服务端输出内容

首页初始 HTML 至少包含：

1. 平台定位。
2. 智能体核心分类。
3. 热门智能体名称、简介与详情链接。
4. 推荐专家名称与主页链接。
5. 精选作品名称与详情链接。
6. FDE 入驻入口。
7. 本地运行器介绍入口。
8. 价格与服务说明入口。

### 6.6 结构化数据

首页使用：

- `Organization`
- `WebSite`

首页不建议输出缺少明确价格的 `SoftwareApplication > Offer`。具体产品信息应放在智能体详情页。

---

## 7. 智能体列表页整改

### URL

```text
/agents
```

### Title

```text
AI 智能体市场｜内容创作、办公与业务自动化｜HelloMe
```

### Description

```text
浏览 HelloMe 交互应用智能体，覆盖图片视频创作、办公自动化、销售获客、数据分析和企业服务等场景，支持直接使用、本地运行及专家定制。
```

### H1

```text
AI 智能体市场
```

### 服务端内容

每张智能体卡片在 HTML 中输出：

- 名称
- 简介
- 分类
- 作者
- 封面
- 详情页链接
- 运行方式
- 是否支持专家定制

### 筛选与排序

以下参数页不单独收录：

```text
/agents?category=content
/agents?sort=hot
/agents?keyword=视频
```

处理方式：

```html
<meta name="robots" content="noindex,follow" />
<link rel="canonical" href="https://www.hellome.art/agents" />
```

分页必须提供普通 HTML 链接，不得只依赖无限滚动。

---

## 8. 智能体详情页整改

### 8.1 URL 统一

```text
保留：/agents/{agentSlug}
跳转：/agent/{agentSlug} → 301 → /agents/{agentSlug}
```

### 8.2 Title 模板

```text
{智能体名称}｜{核心功能} AI 智能体｜HelloMe
```

示例：

```text
Hz Canvas 无限画布｜本地 AI 图片视频创作工具｜HelloMe
快速混剪视频工具｜AI 短视频自动制作智能体｜HelloMe
GEO 助手｜AI 可见度检测与内容优化工具｜HelloMe
```

### 8.3 Description 模板

```text
{智能体名称}是一款用于{核心场景}的 AI 智能体，支持{能力1}、{能力2}和{能力3}。查看使用方式、运行要求、真实案例及专家定制服务。
```

### 8.4 页面结构

```text
H1：智能体名称
一句话介绍
适用场景
核心能力
输入内容
输出成果
使用流程
运行方式
支持系统
当前版本
更新时间
价格与使用权限
用户作品
常见问题
所属专家
专家定制服务
相关推荐
```

### 8.5 收录门槛

智能体满足以下条件后才允许 INDEX：

- 名称完整
- 独立介绍不少于 100 字
- 至少 3 条核心能力
- 有有效封面
- 有明确使用说明
- 有明确作者或平台主体
- 有真实更新时间
- 处于公开可用状态

未达到标准时使用：

```html
<meta name="robots" content="noindex,follow" />
```

### 8.6 结构化数据

使用：

- `SoftwareApplication`
- `BreadcrumbList`

只有存在真实价格时才输出 `Offer`。

免费产品：

```json
{
  "@type": "Offer",
  "price": "0",
  "priceCurrency": "CNY",
  "availability": "https://schema.org/InStock"
}
```

付费产品：

```json
{
  "@type": "Offer",
  "price": "39",
  "priceCurrency": "CNY",
  "availability": "https://schema.org/InStock"
}
```

### 8.7 状态处理

| 产品状态 | SEO 处理 |
|---|---|
| 临时暂停 | 保留页面并说明状态 |
| 下架且有替代产品 | 301 到替代产品 |
| 永久删除 | 404 或 410 |
| 审核中 | NOINDEX |
| 私有智能体 | NOINDEX＋权限校验 |
| 带分享 Token | NOINDEX，Canonical 不包含 Token |

---

## 9. 专家列表页整改

### URL

```text
/experts
```

### Title

```text
AI 专家库｜智能体开发与企业 AI 定制服务｜HelloMe
```

### Description

```text
发现 HelloMe 认证 AI 专家，查看专家擅长领域、已发布智能体、真实项目案例和可提供的定制服务，联系适合你的 AI 解决方案专家。
```

### H1

```text
HelloMe AI 专家库
```

### 服务端字段

- 专家名称
- 头像
- 职业头衔
- 擅长领域
- 简短介绍
- 已发布智能体数量
- 专家主页链接

筛选参数页统一设置 `noindex,follow`，Canonical 指向 `/experts`。

---

## 10. 专家主页整改

### URL

第一期可以继续使用：

```text
/experts/{expertId}
```

长期建议使用稳定、可读的专家 Slug：

```text
/experts/hellome-official
/experts/jason-jia
```

### Title 模板

```text
{专家名称}｜{专业方向} AI 专家｜HelloMe
```

### Description 模板

```text
{专家名称}专注于{擅长领域}，提供{服务1}、{服务2}等 AI 智能体解决方案。查看其智能体产品、项目案例和定制服务。
```

### 页面结构

```text
H1：专家名称
专家头衔
认证状态
个人介绍
擅长领域
专业技能
已发布智能体
真实案例
用户评价
专家定制服务
交付方式
咨询入口
更新时间
```

### 服务主体说明

```text
以下定制服务由 {专家名称} 独立提供。
具体内容、价格及交付方式以双方最终确认为准。
HelloMe 提供信息展示、沟通及平台服务。
```

### 收录门槛

满足以下条件后才允许 INDEX：

- 有真实头像
- 有独立职业头衔
- 介绍不少于 80 字
- 至少一个明确擅长领域
- 至少一个公开智能体或真实案例
- 不是默认“新入驻 FDE 专家”占位内容

不符合条件的专家页设置 `noindex,follow`。

### 结构化数据

使用：

- `ProfilePage`
- `Person`
- `BreadcrumbList`

不得输出无法验证的评分、成交量、客户数量、资质和荣誉。

---

## 11. 作品列表页整改

### URL

```text
/works
```

### Title

```text
AI 创作作品与智能体案例｜HelloMe
```

### Description

```text
浏览用户使用 HelloMe 智能体创作的图片、视频、网页和办公成果，查看创作说明并找到对应智能体进行体验和复刻。
```

### H1

```text
AI 智能体创作作品
```

### 服务端字段

- 作品标题
- 作品简介
- 封面
- 作者
- 作品类型
- 对应智能体
- 创作日期
- 详情链接

筛选、排序和搜索参数页面统一设置 `noindex,follow`。

---

## 12. 作品详情页整改

### URL

第一期可以保留：

```text
/agents/{agentSlug}/works/{workId}
```

未来作品需要脱离智能体独立传播时，可以迁移为：

```text
/works/{workId}
```

迁移后旧地址做 301。

### Title 模板

```text
{作品名称}｜使用{智能体名称}创作的 AI 案例｜HelloMe
```

### Description 模板

```text
{作品简介}。本作品由{作者名称}使用{智能体名称}完成，查看创作过程、成果内容及同款智能体。
```

### 页面结构

```text
H1：作品名称
作品简介
作品图片或视频
作品作者
使用的智能体
创作需求
创作过程
输入内容
输出成果
创作日期
使用同款智能体
相关作品
```

### 收录门槛

- 作品公开
- 标题完整
- 描述不少于 50 字
- 图片或视频有效
- 已关联公开智能体
- 无违规内容
- 不是重复上传
- 原则上经过平台精选

普通用户上传的作品默认 NOINDEX，运营精选后再开放 INDEX。

### 结构化数据

- 图片作品：`ImageObject`
- 视频作品：`VideoObject`
- 综合成果：`CreativeWork`
- 完整案例文章：`Article`
- 页面层级：`BreadcrumbList`

---

## 13. FDE 介绍页整改

### URL

```text
/fde
```

### Title

```text
成为 HelloMe AI 专家｜发布智能体与提供定制服务
```

### Description

```text
申请成为 HelloMe FDE 专家，发布自己的 AI 智能体、展示真实案例、提供专业定制服务并获得服务收益。
```

### H1

```text
成为 HelloMe FDE 专家
```

### 页面内容

- FDE 是什么
- 适合哪些人
- 可以发布什么
- 智能体审核要求
- 专家主页能力
- 定制服务模式
- 收费与平台服务规则
- 收益结算
- 入驻流程
- 申请条件
- 常见问题
- 申请入口

常见问题必须在页面真实显示后，才可以使用 `FAQPage` 结构化数据。

---

## 14. Hermes 本地运行器页面

### 方案 A：公开产品介绍页

如果 `/connect-hermes` 用于公开介绍和下载，应允许收录，并从 robots.txt 中解除屏蔽。

Title：

```text
下载 HelloMe 本地运行器｜安全运行 AI 智能体
```

Description：

```text
下载安装 HelloMe 本地运行器，让智能体安全运行在你的电脑上，调用本地文件、模型和工具，提升运行效率并保护数据隐私。
```

页面内容：

- 为什么需要安装
- 本地运行的价值
- Windows 与 macOS 支持
- 系统要求
- 安装步骤
- 当前版本
- 更新日期
- 官方下载入口
- 安全说明
- 常见问题

### 方案 B：仅作为连接流程

如果 `/connect-hermes` 只是登录后的设备连接流程，则设置：

```html
<meta name="robots" content="noindex,nofollow" />
```

同时新增公开介绍页：

```text
/hermes
```

---

## 15. 价格页整改

### URL

```text
/pricing
```

### Title

```text
HelloMe 价格与服务说明｜智能体、模型与专家定制
```

### Description

```text
查看 HelloMe 智能体、模型 API、Token 充值和专家定制服务的计费方式，了解不同服务的收费主体、使用范围及退款规则。
```

### 页面内容

1. 智能体购买价格
2. Skill 或适配包下载价格
3. 模型 API 与 Token 消耗
4. FDE 专家定制服务
5. 平台服务费
6. 退款与售后
7. 发票说明
8. 企业服务

必须明确：

```text
专家定制服务由对应专家提供，服务内容与最终报价以双方确认结果为准。
```

---

## 16. 场景解决方案页

这是后续自然搜索获客的重点页面。

### URL

```text
/solutions/{slug}
```

### 第一批建议主题

```text
/solutions/ai-video-creation
/solutions/wechat-content-publishing
/solutions/feishu-document-automation
/solutions/local-ai-workbench
/solutions/ecommerce-image-generation
/solutions/ai-ppt-generation
/solutions/company-report-generation
/solutions/ai-writing-assistant
/solutions/geo-content-optimization
/solutions/pdf-processing
```

### 页面结构

```text
H1：用户问题或解决方案
业务痛点
传统处理方式
HelloMe 解决方案
推荐智能体
使用流程
真实案例
适用人群
预期产出
本地运行与数据安全
常见问题
开始使用
咨询专家
```

每个解决方案必须包含真实信息，禁止仅替换标题和关键词批量生成。

---

## 17. 内容中心

建议新增：

```text
/articles
/articles/{slug}
```

内容方向：

- 智能体使用教程
- 本地 AI 使用指南
- 真实案例复盘
- 行业 AI 解决方案
- FDE 专家经验
- 产品更新
- 数据安全说明
- 安装和故障排查

文章必须包含：

- 作者
- 发布时间
- 更新时间
- 正文
- 目录
- 关联智能体
- 关联专家
- 相关文章
- `Article` 结构化数据

禁止发布：

- 纯 AI 拼接文章
- 与平台业务无关的热点
- 关键词堆砌页面
- 大量高度相似内容
- 无来源、无法验证的数据

---

## 18. 私有页面处理

以下页面不得参与搜索引擎收录：

```text
/login
/notifications
/pay
/settings/*
/app/*
/admin/*
```

页面 Head：

```html
<meta name="robots" content="noindex,nofollow" />
```

同时保证：

- 不进入 Sitemap
- 不使用首页 Canonical
- 未登录内容不输出到公开 HTML
- 不通过公开导航形成大量爬虫入口

---

## 19. robots.txt

建议配置：

```text
User-agent: *
Allow: /

Disallow: /api/
Disallow: /app/
Disallow: /admin/
Disallow: /settings/
Disallow: /notifications
Disallow: /pay
Disallow: /login

Sitemap: https://www.hellome.art/sitemap.xml
```

注意：

- 如果 `/connect-hermes` 是公开介绍和下载页，不得屏蔽。
- 已经被索引的页面应先返回 `noindex`，确认移除后再考虑 robots 屏蔽。
- 是否允许 GPTBot 等 AI 爬虫属于内容授权策略，不等同于传统 SEO 设置。

---

## 20. Sitemap

### 主 Sitemap

```text
https://www.hellome.art/sitemap.xml
```

建议输出 Sitemap Index：

```xml
<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <sitemap>
    <loc>https://www.hellome.art/sitemaps/pages.xml</loc>
  </sitemap>
  <sitemap>
    <loc>https://www.hellome.art/sitemaps/agents.xml</loc>
  </sitemap>
  <sitemap>
    <loc>https://www.hellome.art/sitemaps/experts.xml</loc>
  </sitemap>
  <sitemap>
    <loc>https://www.hellome.art/sitemaps/works.xml</loc>
  </sitemap>
  <sitemap>
    <loc>https://www.hellome.art/sitemaps/articles.xml</loc>
  </sitemap>
</sitemapindex>
```

### Sitemap 准入条件

只能加入：

- 返回 HTTP 200
- 允许 INDEX
- 有唯一 Canonical
- 已公开
- 内容达到质量门槛

不得加入：

- 登录、支付、工作台和后台页面
- 分享 Token 页面
- 筛选和站内搜索结果页
- 空白专家主页
- 审核中智能体
- 未精选普通作品
- 301 页面
- 404/410 页面

`lastmod` 必须来自真实内容更新时间，不能每天统一刷新。

---

## 21. URL 与跳转规则

```text
/welcome
301 → /

/agent/{slug}
301 → /agents/{slug}

/agents/{slug}?share={token}
Canonical → /agents/{slug}

/agents/{slug}?utm_source=xxx
Canonical → /agents/{slug}

/experts/{id}?from=home
Canonical → /experts/{id}
```

统一域名：

```text
http://hellome.art/*
301 → https://www.hellome.art/*

https://hellome.art/*
301 → https://www.hellome.art/*
```

---

## 22. 404 与下架内容

404 页面必须返回：

```http
HTTP/1.1 404 Not Found
```

页面提供：

- 页面不存在或已经下架
- 返回首页
- 浏览智能体
- 查看热门作品

内容处理规则：

| 情况 | 处理方式 |
|---|---|
| 地址错误 | 404 |
| 永久删除 | 404 或 410 |
| 有明确替代产品 | 301 到替代产品 |
| 临时下架 | 保留页面并说明状态 |
| 审核中 | NOINDEX |

---

## 23. 图片 SEO

所有公开图片要求：

- 提供有效 Alt
- 使用稳定 URL
- 不依赖登录或临时签名
- 明确输出 width 和 height
- 优先使用 WebP 或 AVIF
- 首屏主图不使用延迟加载
- 非首屏图片可以懒加载
- 分享图使用 1200×630
- 不在 Alt 中堆砌关键词

示例：

```html
<img
  src="https://..."
  alt="使用 Hz Canvas 创作的国潮齐天大圣宣传海报"
  width="1536"
  height="1024"
/>
```

---

## 24. SSR 技术方案

推荐架构：

```text
公开内容页面：SSR / SSG / ISR
应用工作台：保留现有 React SPA
数据来源：统一后端 API
域名、账户与登录状态：保持现有体系
```

SSR 覆盖范围：

```text
/
/agents
/agents/{slug}
/experts
/experts/{slug}
/works
/agents/{slug}/works/{id}
/fde
/pricing
/solutions/{slug}
/articles
/articles/{slug}
```

服务端必须直接输出：

- Title
- Description
- Canonical
- Robots
- Open Graph
- JSON-LD
- H1
- 页面主要介绍
- 页面主要内容
- 站内链接

页面加载后可以由 React 接管交互，但不得先输出一套与页面无关的首页内容。

---

## 25. 性能要求

| 指标 | 目标 |
|---|---:|
| Lighthouse SEO | ≥95 |
| Lighthouse Performance | ≥80 |
| LCP | ≤2.5 秒 |
| CLS | ≤0.1 |
| INP | ≤200 毫秒 |
| 首页 HTML 响应 | ≤800 毫秒 |
| 公开页面可用率 | ≥99.9% |

重点优化：

- 首屏不加载完整工作台代码
- 按路由拆分 JavaScript
- 图片压缩与尺寸适配
- 静态资源 CDN
- SSR 页面缓存
- 字体加载优化
- 减少第三方脚本阻塞
- 避免大面积首屏骨架屏

---

## 26. 百度搜索接入

上线后执行：

1. 验证 `www.hellome.art`。
2. 提交主 Sitemap。
3. 配置普通收录或主动推送。
4. 新内容发布后主动提交 URL。
5. 监控抓取异常。
6. 监控死链和软 404。
7. 提交永久删除地址。
8. 查看索引量和搜索词变化。
9. 监控品牌词及业务词点击情况。
10. 不批量提交低质量专家和作品页面。

---

## 27. 数据监控

每个公开页面记录：

- 自然搜索访问量
- 搜索引擎来源
- 页面曝光与点击
- 智能体使用点击
- 运行器下载点击
- 注册转化
- 专家咨询点击
- 作品到智能体的跳转
- 页面收录状态
- 页面关键词表现

用户转化漏斗：

```text
搜索结果曝光
→ 进入公开页面
→ 查看产品或案例
→ 点击使用智能体
→ 安装本地运行器
→ 成功运行
```

专家服务漏斗：

```text
搜索结果曝光
→ 进入专家或智能体页面
→ 查看专家服务
→ 发起咨询
→ 专家响应
→ 确认方案
→ 支付
```

---

## 28. 实施阶段

### 第一阶段：基础修复

- `/welcome` 301 到 `/`
- 修复首页 Canonical
- 修复 `/sitemap.xml`
- 建立真实 404
- 私有页面设置 NOINDEX
- 建立公开页面 SSR 框架
- 接入百度搜索资源平台

### 第二阶段：核心公开页面

- `/agents` SSR
- 前 10 个核心智能体详情 SSR
- `/experts` SSR
- 前 5 个资料完整专家主页 SSR
- 精选作品详情 SSR
- 页面级 Meta 和 JSON-LD
- 建立智能体、专家和作品之间的内链

### 第三阶段：内容获客

- 上线 `/works`
- 上线 `/solutions/{slug}`
- 上线 `/articles/{slug}`
- 发布真实业务案例
- 发布专家原创内容
- 进行知乎、B站、小红书、公众号和抖音分发

### 第四阶段：规模化治理

- 增加专家和智能体 SEO 字段后台
- 建立页面自动质量检测
- 自动控制 INDEX/NOINDEX
- 自动进入或退出 Sitemap
- 建立收录和流量监控
- 定期清理低质量页面

---

## 29. 验收清单

### 页面级验收

- [ ] 返回正确 HTTP 状态码
- [ ] 禁用 JavaScript 后仍有主要正文
- [ ] 只有一个 Title
- [ ] 只有一个 Description
- [ ] 只有一个 Canonical
- [ ] 只有一个 H1
- [ ] Title 与页面内容一致
- [ ] Description 与页面内容一致
- [ ] Open Graph 完整
- [ ] 分享图片可访问
- [ ] JSON-LD 可正常解析
- [ ] 图片具有有效 Alt
- [ ] 页面显示更新时间
- [ ] 页面拥有至少一个站内入口
- [ ] 页面提供相关内容链接
- [ ] 移动端显示正常

### 全站验收

- [ ] `/welcome` 301 到 `/`
- [ ] HTTP 统一跳转 HTTPS
- [ ] 非 www 统一跳转 www
- [ ] sitemap.xml 返回标准 XML
- [ ] robots.txt 配置正确
- [ ] Sitemap 不包含 NOINDEX 页面
- [ ] Sitemap 不包含 301 页面
- [ ] Sitemap 不包含 404 页面
- [ ] 私有页面不参与收录
- [ ] 搜索和筛选结果页不参与收录
- [ ] 无效地址返回 404
- [ ] 页面不存在重复 Canonical
- [ ] 智能体和专家可以相互跳转
- [ ] 作品可以跳转到对应智能体
- [ ] Lighthouse SEO 不低于 95

---

## 30. 最终交付物

研发完成后应提供：

1. 全站 URL 清单
2. 页面收录状态表
3. Title 与 Description 模板
4. SSR 页面实现
5. JSON-LD 模板
6. robots.txt
7. Sitemap Index
8. 分类型 Sitemap
9. 301 跳转配置
10. 404 页面
11. 百度搜索资源平台配置
12. 页面质量检测规则
13. SEO 上线验收报告
14. 自然搜索与转化数据看板

---

## 31. 最终原则

首页标题固定保留：

```text
HelloMe-国内交互应用智能体平台创新引领者｜Hello, Me. 懂世界，更懂 Me。
```

其他公开页面遵循：

```text
一个公开主题
→ 一个独立 URL
→ 一套独立正文
→ 一组独立 SEO 信息
→ 一个明确的用户转化目标
```

不要把页面数量增加视为 SEO 成果。最终判断标准是：

```text
搜索引擎能够抓取
→ 能够正确理解页面
→ 页面具有独立价值
→ 获得有效收录和排名
→ 带来智能体使用、注册或专家咨询
```

专家主页、智能体详情和作品详情可以使用统一模板，不需要为每个页面单独开发视觉结构。但页面正文、产品能力、案例、图片、作者、关键词和结构化数据必须真实，并具有实质差异。
