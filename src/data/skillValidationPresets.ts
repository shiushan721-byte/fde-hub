import {
  SkillPackageManifest,
  SkillFileEntry,
  VerificationCheckItem,
  SandboxExecutionMetrics,
  FixCenterIssue,
  ValidationHistoryRecord
} from '../types/creator';

export interface SkillPackagePreset {
  id: string;
  name: string;
  version: string;
  category: string;
  description: string;
  fileName: string;
  fileSize: string;
  defaultOutcome: 'pass' | 'fail_structure' | 'fail_sandbox';
  manifest: SkillPackageManifest;
  files: SkillFileEntry[];
  checks: VerificationCheckItem[];
  issues?: FixCenterIssue[];
  metrics?: SandboxExecutionMetrics;
  fixedPackage?: {
    version: string;
    files: SkillFileEntry[];
    checks: VerificationCheckItem[];
    metrics: SandboxExecutionMetrics;
  };
}

export const mockSkillPresets: SkillPackagePreset[] = [
  {
    id: 'preset_ecommerce_perfect',
    name: '跨境电商海外多语种爆款文案 Agent',
    version: '1.2.0',
    category: '电商零售',
    description: '自动解析海外竞品痛点，生成符合当地语境的高转化 Listing 标题与详情页',
    fileName: 'crossborder-ecommerce-copywriter-v1.2.0.zip',
    fileSize: '2.4 MB',
    defaultOutcome: 'pass',
    manifest: {
      name: 'crossborder-ecommerce-copywriter',
      version: '1.2.0',
      author: 'Maya Studio (林然)',
      description: '跨境电商海外多语种文案全自动生成器',
      entrypoint: 'nodes/pipeline.py',
      hermesMinVersion: '>=2.3.0',
      permissions: ['network:http_get', 'fs_read:templates'],
      dependencies: [
        { name: 'pydantic', version: '^2.6.0' },
        { name: 'jinja2', version: '^3.1.2' },
        { name: 'tiktoken', version: '^0.6.0' }
      ],
      inputSchema: {
        type: 'object',
        required: ['product_name', 'target_market', 'key_selling_points'],
        properties: {
          product_name: { type: 'string', minLength: 2 },
          target_market: { type: 'string', enum: ['US', 'DE', 'JP', 'UK', 'FR'] },
          key_selling_points: { type: 'array', items: { type: 'string' } }
        }
      },
      outputSchema: {
        type: 'object',
        required: ['listing_title', 'bullet_points', 'search_keywords', 'tokens_used'],
        properties: {
          listing_title: { type: 'string' },
          bullet_points: { type: 'array', items: { type: 'string' } },
          search_keywords: { type: 'array', items: { type: 'string' } },
          tokens_used: { type: 'number' }
        }
      },
      confirmationNodes: ['user_review_keywords_node']
    },
    files: [
      { name: 'SKILL.md', size: '12.4 KB', status: 'valid', note: '元数据与能力声明完整' },
      { name: 'package.json', size: '1.8 KB', status: 'valid', note: '依赖声明与版本锁定' },
      { name: 'hermes.config.yaml', size: '3.2 KB', status: 'valid', note: 'Hermes 运行时配置' },
      { name: 'schemas/input.schema.json', size: '2.1 KB', status: 'valid', note: 'JSON Schema v7 格式规范' },
      { name: 'schemas/output.schema.json', size: '2.5 KB', status: 'valid', note: '结构化返回格式定义' },
      { name: 'nodes/pipeline.py', size: '24.8 KB', status: 'valid', note: '核心流水线调度器' },
      { name: 'nodes/translator.py', size: '18.2 KB', status: 'valid', note: '本地化语境翻译与校准' }
    ],
    checks: [
      // Layer 1: Skill 结构检查
      { id: 'c1_1', name: '必填文件完整性 (SKILL.md / package.json / hermes.config)', category: 'structure', status: 'passed', detail: '7/7 核心描述与入口文件均存在且格式标准', elapsedMs: 42 },
      { id: 'c1_2', name: '语义化版本与权限声明 (SemVer & Permissions)', category: 'structure', status: 'passed', detail: '版本 v1.2.0 符合规范，申请 network:http_get 与 fs_read:templates', elapsedMs: 28 },
      { id: 'c1_3', name: '输入/输出 JSON Schema 语法与类型校验', category: 'structure', status: 'passed', detail: '严格通过 JSON Schema Draft-07 验证，无递归死循环', elapsedMs: 65 },
      { id: 'c1_4', name: '依赖锁定与安全漏洞扫描', category: 'structure', status: 'passed', detail: '已扫描 3 个直接依赖与 18 个传递依赖，0 高危漏洞', elapsedMs: 110 },
      // Layer 2: Hermes 兼容检查
      { id: 'c2_1', name: 'Hermes 核心运行时解析与引擎加载', category: 'hermes_compat', status: 'passed', detail: '成功加载至 Hermes-Core v2.4.1 执行上下文', elapsedMs: 85 },
      { id: 'c2_2', name: 'Skill 动态唤起与调度链连通性', category: 'hermes_compat', status: 'passed', detail: '入口 nodes/pipeline.py 初始化成功，子流程调用无阻断', elapsedMs: 140 },
      { id: 'c2_3', name: '人机协同确认节点识别 (Confirmation Nodes)', category: 'hermes_compat', status: 'passed', detail: '已识别 1 个确认节点: user_review_keywords_node (含超时保护)', elapsedMs: 72 },
      { id: 'c2_4', name: '标准产物交付物 (Artifacts) 生成规范', category: 'hermes_compat', status: 'passed', detail: '产物包含 listing_title 与 bullet_points 结构化数据', elapsedMs: 95 },
      // Layer 3: 沙箱试运行
      { id: 'c3_1', name: '标准测试集全流程隔离沙箱回放 (10/10 样本)', category: 'sandbox', status: 'passed', detail: '10 组典型跨境商品输入测试通过率 100%，无异常崩溃', elapsedMs: 1250 },
      { id: 'c3_2', name: '极限时延与超时熔断测试 (< 15s SLA)', category: 'sandbox', status: 'passed', detail: 'P95 时延 1.84 秒，远优于平台 15 秒强制熔断线', elapsedMs: 380 },
      { id: 'c3_3', name: '真实词元消耗测算与底座推理成本精算', category: 'sandbox', status: 'passed', detail: '单次运行平均词元: 1,850 Tokens，实际推理成本: ￥0.038/次', elapsedMs: 190 }
    ],
    metrics: {
      avgExecutionTokens: 1850,
      avgExecutionCostYuan: 0.038,
      p95LatencySec: 1.84,
      successRatePercent: 100,
      testedSamplesCount: 10,
      hermesVersionTested: 'Hermes-Core v2.4.1 (Stable)',
      compatibilityRange: 'Python 3.10+, Node 20+, ToolUse-v3 引擎'
    }
  },
  {
    id: 'preset_ecommerce_issues',
    name: '电商智能客服与自动退款 Agent (存在缺陷待修复)',
    version: '1.0.0-rc1',
    category: '电商零售',
    description: '自动对接售后工单、识别买家情绪、生成退换货处理建议并触发确认流程',
    fileName: 'ecommerce-customer-service-v1.0.0.zip',
    fileSize: '3.1 MB',
    defaultOutcome: 'fail_structure',
    manifest: {
      name: 'ecommerce-customer-service',
      version: '1.0.0-rc1',
      author: 'Maya Studio (林然)',
      description: '电商客服工作流智能体',
      entrypoint: 'src/index.ts',
      hermesMinVersion: '>=2.2.0',
      permissions: ['network:all'],
      dependencies: [
        { name: 'axios', version: '^1.6.0' }
      ],
      inputSchema: {
        type: 'object',
        required: ['order_id', 'user_complaint'],
        properties: {
          order_id: { type: 'string' },
          user_complaint: { type: 'string' }
        }
      },
      outputSchema: {},
      confirmationNodes: ['confirm_refund_action']
    },
    files: [
      { name: 'SKILL.md', size: '8.2 KB', status: 'valid', note: '基础描述已就绪' },
      { name: 'package.json', size: '1.2 KB', status: 'warning', note: '缺少 external-scraper 关键依赖' },
      { name: 'hermes.config.yaml', size: '2.1 KB', status: 'valid', note: 'Hermes 配置文件' },
      { name: 'schemas/input.schema.json', size: '1.5 KB', status: 'valid', note: '输入参数 Schema 正常' },
      { name: 'schemas/output.schema.json', size: '0 KB', status: 'error', note: '文件为空，缺少输出定义' },
      { name: 'src/index.ts', size: '32.1 KB', status: 'warning', note: '节点调用未处理网络超时' }
    ],
    checks: [
      // Layer 1: Skill 结构检查
      { id: 'c1_1', name: '必填文件完整性 (SKILL.md / package.json / hermes.config)', category: 'structure', status: 'failed', detail: 'schemas/output.schema.json 缺失输出字段类型声明', elapsedMs: 35, errorMsg: 'Output schema is empty or missing required root properties' },
      { id: 'c1_2', name: '语义化版本与权限声明 (SemVer & Permissions)', category: 'structure', status: 'passed', detail: '版本 v1.0.0-rc1，申请 network 权限', elapsedMs: 25 },
      { id: 'c1_3', name: '输入/输出 JSON Schema 语法与类型校验', category: 'structure', status: 'failed', detail: 'outputSchema 未定义标准输出结构 (缺少 status, refund_amount, reply_message)', elapsedMs: 40, errorMsg: 'Schema validation failed: root outputSchema must declare properties' },
      { id: 'c1_4', name: '依赖锁定与安全漏洞扫描', category: 'structure', status: 'warning', detail: '检测到调用 cheerio / requests 但 package.json 未显式声明', elapsedMs: 95 },
      // Layer 2: Hermes 兼容检查
      { id: 'c2_1', name: 'Hermes 核心运行时解析与引擎加载', category: 'hermes_compat', status: 'passed', detail: '加载至 Hermes-Core v2.4.1 上下文', elapsedMs: 65 },
      { id: 'c2_2', name: 'Skill 动态唤起与调度链连通性', category: 'hermes_compat', status: 'failed', detail: '调用外部工单工具 external_tools/order_query 报 ModuleNotFoundError', elapsedMs: 120, errorMsg: 'Hermes unable to invoke dependency: axios-retry missing in bundle' },
      { id: 'c2_3', name: '人机协同确认节点识别 (Confirmation Nodes)', category: 'hermes_compat', status: 'failed', detail: '节点 [confirm_refund_action] 未定义 timeout_fallback 兜底策略，可能造成沙箱无限阻塞', elapsedMs: 80, errorMsg: 'Node confirm_refund_action must implement timeout_fallback (e.g. 300s -> auto_escalate_to_human)' },
      { id: 'c2_4', name: '标准产物交付物 (Artifacts) 生成规范', category: 'hermes_compat', status: 'pending', detail: '因前置节点中断未能完成测试', elapsedMs: 0 },
      // Layer 3: 沙箱试运行
      { id: 'c3_1', name: '标准测试集全流程隔离沙箱回放 (10/10 样本)', category: 'sandbox', status: 'failed', detail: '测试样本 #2 执行异常中断：缺少输出映射', elapsedMs: 450, errorMsg: 'Sandbox runtime crashed at frame 4: Unhandled rejection on undefined output properties' },
      { id: 'c3_2', name: '极限时延与超时熔断测试 (< 15s SLA)', category: 'sandbox', status: 'pending', detail: '前置校验未通过，沙箱熔断测试挂起', elapsedMs: 0 },
      { id: 'c3_3', name: '真实词元消耗测算与底座推理成本精算', category: 'sandbox', status: 'pending', detail: '沙箱未完全跑通，无法生成真实成本指标', elapsedMs: 0 }
    ],
    issues: [
      {
        id: 'iss_1',
        stage: 'structure',
        stageName: 'Skill 结构检查',
        title: '缺少 outputs.schema.json 响应格式规范',
        severity: 'critical',
        location: 'schemas/output.schema.json',
        errorDetail: '智能体输出未声明结构化 JSON Schema，平台无法对执行结果进行类型断言与自动化质检。',
        fixGuide: '在 schemas/output.schema.json 中补充标准返回字段 (reply_message, refund_suggested, confidence_score)。',
        codeSnippet: `// 修复建议补丁：schemas/output.schema.json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "required": ["reply_message", "refund_suggested", "action_taken"],
  "properties": {
    "reply_message": {
      "type": "string",
      "description": "向客户回复的亲和话术"
    },
    "refund_suggested": {
      "type": "boolean",
      "description": "是否建议执行退款"
    },
    "refund_amount": {
      "type": "number",
      "description": "建议退款金额(元)"
    },
    "action_taken": {
      "type": "string",
      "enum": ["auto_replied", "transferred_human", "refund_requested"]
    }
  }
}`,
        runtimeLog: `[Hermes-Validator] ERROR: Failed validating Output Schema against Draft-07 specs.
[Hermes-Validator] Trace: Empty file at /schemas/output.schema.json
[Hermes-Validator] Schema must be a valid JSON Object with 'properties' and 'required' definitions.`,
        minimalReproInput: `{
  "order_id": "ORD-2026-883921",
  "user_complaint": "收到衣服尺寸偏小，而且右侧袖口有明显脱线，想要换大一号或者退款处理。"
}`
      },
      {
        id: 'iss_2',
        stage: 'hermes_compat',
        stageName: 'Hermes 兼容检查',
        title: '缺少必要依赖 axios-retry 导致网络抖动崩溃',
        severity: 'error',
        location: 'package.json:14',
        errorDetail: '运行时调用外部物流 API 时若遇网络抖动将直接异常退出，Hermes 引擎要求对外请求必须具备指数退避重试机制。',
        fixGuide: '在 package.json 的 dependencies 中添加 "axios-retry": "^4.0.0" 并在入口代码中启用。',
        codeSnippet: `// 修复建议补丁：package.json
{
  "dependencies": {
    "axios": "^1.6.0",
    "axios-retry": "^4.0.0"
  }
}`,
        runtimeLog: `[Hermes-Compat-Worker] 2026-08-18T20:14:02Z [WARN] Invoking logistics_query_tool...
[Hermes-Compat-Worker] Error: Cannot find module 'axios-retry'
    at Function.Module._resolveFilename (node:internal/modules/cjs/loader:1144:15)
    at require (node:internal/modules/helpers:177:18)
    at Object.<anonymous> (/workspace/src/tools/logistics.js:3:22)`,
        minimalReproInput: `{
  "order_id": "ORD-TEST-NETWORK-JITTER-01",
  "user_complaint": "帮我查下这个单的顺丰运单到哪了"
}`
      },
      {
        id: 'iss_3',
        stage: 'hermes_compat',
        stageName: 'Hermes 兼容检查',
        title: '人机协同确认节点缺少超时兜底逻辑 (timeout_fallback)',
        severity: 'error',
        location: 'hermes.config.yaml:28',
        errorDetail: '识别到确认节点 [confirm_refund_action]，但未配置用户或客服长时间未确认时的兜底策略，可能导致沙箱与线上运行时无限期挂起。',
        fixGuide: '在 hermes.config.yaml 中为该确认节点增加 timeout: 300s 与 on_timeout: auto_escalate_to_human 配置。',
        codeSnippet: `# 修复建议补丁：hermes.config.yaml
nodes:
  - id: confirm_refund_action
    type: human_confirmation
    prompt: "检测到大额退款申请(>¥200)，请人工客服审核确认"
    timeout_sec: 300
    on_timeout:
      action: "escalate"
      target: "human_supervisor_queue"
      fallback_message: "退款审批超时，已自动转接至资深值班主管。"` ,
        runtimeLog: `[Hermes-Engine] [Check-Warning] Confirmation node 'confirm_refund_action' missing 'timeout_sec' parameter.
[Hermes-Engine] Execution in automated sandbox paused indefinitely awaiting mock approval trigger.
[Hermes-Engine] Status: BLOCKED_ON_HUMAN_NODE_TIMEOUT`,
        minimalReproInput: `{
  "order_id": "ORD-HIGH-VALUE-9912",
  "user_complaint": "申请整单退款 899 元"
}`
      }
    ],
    fixedPackage: {
      version: '1.0.1',
      files: [
        { name: 'SKILL.md', size: '8.4 KB', status: 'valid', note: '已更新能力描述' },
        { name: 'package.json', size: '1.4 KB', status: 'valid', note: '已补充 axios-retry 依赖' },
        { name: 'hermes.config.yaml', size: '2.5 KB', status: 'valid', note: '已配置超时兜底策略' },
        { name: 'schemas/input.schema.json', size: '1.5 KB', status: 'valid', note: '输入 Schema 校验通过' },
        { name: 'schemas/output.schema.json', size: '2.2 KB', status: 'valid', note: '已完整补全输出 JSON Schema' },
        { name: 'src/index.ts', size: '33.2 KB', status: 'valid', note: '已集成重试与超时捕获' }
      ],
      checks: [
        { id: 'c1_1', name: '必填文件完整性 (SKILL.md / package.json / hermes.config)', category: 'structure', status: 'passed', detail: '全部核心描述与输出 Schema 均已补齐', elapsedMs: 38 },
        { id: 'c1_2', name: '语义化版本与权限声明 (SemVer & Permissions)', category: 'structure', status: 'passed', detail: '已升级为 v1.0.1', elapsedMs: 22 },
        { id: 'c1_3', name: '输入/输出 JSON Schema 语法与类型校验', category: 'structure', status: 'passed', detail: 'outputSchema 验证通过 (包含 reply_message, refund_suggested 等规范字段)', elapsedMs: 48 },
        { id: 'c1_4', name: '依赖锁定与安全漏洞扫描', category: 'structure', status: 'passed', detail: '依赖已补充并通过 Hermes 依赖安全性审计', elapsedMs: 82 },
        { id: 'c2_1', name: 'Hermes 核心运行时解析与引擎加载', category: 'hermes_compat', status: 'passed', detail: '加载至 Hermes-Core v2.4.1 上下文', elapsedMs: 70 },
        { id: 'c2_2', name: 'Skill 动态唤起与调度链连通性', category: 'hermes_compat', status: 'passed', detail: '重试策略正常运作，网络调用顺利通过', elapsedMs: 110 },
        { id: 'c2_3', name: '人机协同确认节点识别 (Confirmation Nodes)', category: 'hermes_compat', status: 'passed', detail: '已配置 300s 超时兜底至 human_supervisor_queue', elapsedMs: 65 },
        { id: 'c2_4', name: '标准产物交付物 (Artifacts) 生成规范', category: 'hermes_compat', status: 'passed', detail: '产物结构符合 output.schema 规范', elapsedMs: 80 },
        { id: 'c3_1', name: '标准测试集全流程隔离沙箱回放 (10/10 样本)', category: 'sandbox', status: 'passed', detail: '10 组典型售后对话全数顺利跑通', elapsedMs: 1420 },
        { id: 'c3_2', name: '极限时延与超时熔断测试 (< 15s SLA)', category: 'sandbox', status: 'passed', detail: 'P95 时延 2.15 秒，符合平台要求', elapsedMs: 410 },
        { id: 'c3_3', name: '真实词元消耗测算与底座推理成本精算', category: 'sandbox', status: 'passed', detail: '单次运行平均词元: 2,420 Tokens，实际推理成本: ￥0.052/次', elapsedMs: 230 }
      ],
      metrics: {
        avgExecutionTokens: 2420,
        avgExecutionCostYuan: 0.052,
        p95LatencySec: 2.15,
        successRatePercent: 100,
        testedSamplesCount: 10,
        hermesVersionTested: 'Hermes-Core v2.4.1 (Stable)',
        compatibilityRange: 'Node 20+, Python 3.10+, ToolUse-v3 引擎'
      }
    }
  }
];

export const initialValidationHistory: ValidationHistoryRecord[] = [
  {
    id: 'val_rec_091',
    version: 'v1.1.0',
    packageName: 'crossborder-ecommerce-copywriter-v1.1.0.zip',
    timestamp: '2026-08-16 14:28:10',
    status: 'passed',
    tier1Status: 'passed',
    tier2Status: 'passed',
    tier3Status: 'passed',
    totalChecks: 11,
    passedChecks: 11,
    failedCount: 0,
    metrics: {
      avgExecutionTokens: 1780,
      avgExecutionCostYuan: 0.036,
      p95LatencySec: 1.72,
      successRatePercent: 100,
      testedSamplesCount: 10,
      hermesVersionTested: 'Hermes-Core v2.4.0',
      compatibilityRange: 'Python 3.10+, Node 18+'
    }
  },
  {
    id: 'val_rec_090',
    version: 'v1.0.0-rc1',
    packageName: 'ecommerce-customer-service-v1.0.0.zip',
    timestamp: '2026-08-15 19:40:02',
    status: 'failed',
    tier1Status: 'failed',
    tier2Status: 'failed',
    tier3Status: 'failed',
    totalChecks: 11,
    passedChecks: 6,
    failedCount: 3,
    issuesSummary: [
      'schemas/output.schema.json 缺失定义',
      '缺少 axios-retry 依赖',
      '确认节点缺少超时兜底机制'
    ]
  }
];
