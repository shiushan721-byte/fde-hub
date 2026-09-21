export const SERVICE_SCOPE_FOOTER = '实际服务范围、交付周期和价格，以双方确认的方案为准。';

/** 每个智能体标准服务总数上限（含后台带入的默认项） */
export const MAX_STANDARD_SERVICES = 5;

export const RETIRED_OFFICIAL_PRODUCT_IDS = ['oprod_flow_ui', 'oprod_knowledge', 'oprod_training'];

export function formatStandardServiceDescription(input: {
  summary: string;
  includes: string[];
  deliverables: string;
  excludes: string;
}) {
  return [
    '服务说明',
    input.summary.trim(),
    '',
    '服务包含',
    ...input.includes.map((item) => `- ${item.trim()}`),
    '',
    '交付内容',
    input.deliverables.trim(),
    '',
    '不包含',
    input.excludes.trim(),
    '',
    SERVICE_SCOPE_FOOTER
  ].join('\n');
}

export function standardServiceSummary(description: string) {
  const lines = description.split('\n').map((line) => line.trim());
  const idx = lines.findIndex((line) => line === '服务说明');
  if (idx >= 0) {
    const next = lines.slice(idx + 1).find((line) => line && line !== '服务包含');
    if (next) return next;
  }
  return lines.find((line) => line) || '';
}

export const DEFAULT_OFFICIAL_PRODUCTS: Array<{
  id: string;
  title: string;
  description: string;
  suggestedPrice: number;
}> = [
  {
    id: 'oprod_install',
    title: '智能体下载与安装',
    suggestedPrice: 200,
    description: formatStandardServiceDescription({
      summary: '获取智能体安装包，并安装到指定平台后即可使用。',
      includes: ['提供对应平台的智能体安装包', '提供安装与使用指引', '协助完成一次安装验证'],
      deliverables: '智能体安装包、安装说明、使用指引。',
      excludes: '第三方平台账号开通、平台会员费用及后续功能定制。'
    })
  },
  {
    id: 'oprod_web_deploy',
    title: '网页部署服务',
    suggestedPrice: 200,
    description: formatStandardServiceDescription({
      summary: '将智能体生成的网页内容部署上线，获得可访问的网页链接。',
      includes: ['部署一套网页内容', '配置基础访问链接', '完成一次上线验证'],
      deliverables: '可访问网页链接及部署说明。',
      excludes: '域名购买、服务器费用、复杂后台开发及长期运维。'
    })
  },
  {
    id: 'oprod_flow_custom',
    title: '流程定制服务',
    suggestedPrice: 200,
    description: formatStandardServiceDescription({
      summary: '根据您的业务需求，调整智能体的处理流程、回复方式或输出内容。',
      includes: ['梳理一个业务使用流程', '调整智能体的处理步骤和配置', '完成基础测试与交付说明'],
      deliverables: '定制后的智能体版本、使用说明。',
      excludes: '全新智能体从零开发、复杂系统开发及额外数据接口对接。'
    })
  },
  {
    id: 'oprod_data_connect',
    title: '数据对接服务',
    suggestedPrice: 200,
    description: formatStandardServiceDescription({
      summary: '将智能体与您的表格、知识库或业务系统连接，实现数据自动读取或同步。',
      includes: ['对接一个数据来源或目标系统', '配置基础字段映射', '完成一次数据联调测试'],
      deliverables: '已配置的数据连接、对接说明。',
      excludes: '第三方系统开发、无开放接口的平台对接、复杂数据清洗与长期维护。'
    })
  }
];
