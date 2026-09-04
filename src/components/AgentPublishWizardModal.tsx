import React, { useState, useEffect, useRef } from 'react';
import {
  UploadCloud,
  FileCode,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ScanSearch,
  Play,
  RotateCw,
  Sparkles,
  Layers,
  Cpu,
  ShieldCheck,
  DollarSign,
  Zap,
  Info,
  Copy,
  Check,
  Terminal,
  Clock,
  ArrowRight,
  ArrowLeft,
  ChevronDown,
  ChevronRight,
  FileText,
  AlertCircle,
  Sliders,
  History,
  Send,
  Boxes,
  Lock,
  ExternalLink,
  Gift,
  CheckCheck,
  Download,
  Plus,
  Trash2
} from 'lucide-react';
import {
  SkillPackageManifest,
  SkillFileEntry,
  VerificationCheckItem,
  SandboxExecutionMetrics,
  FixCenterIssue,
  ValidationHistoryRecord,
  AgentPublishConfig,
  CreatorAgentItem
} from '../types/creator';
import type { AgentAdapterPackage } from '../../shared/adapterPackages';
import { adapterDisplayName } from '../../shared/adapterPackages';
import {
  mockSkillPresets,
  SkillPackagePreset,
  initialValidationHistory
} from '../data/skillValidationPresets';
import { AGENT_LIFECYCLE_NOTICE, AGENT_PRICE_CHANGE_NOTICE } from '../lib/agentLifecycle';
import { AgentPricingFields } from './AgentPricingFields';
import { normalizePricingPlans, validatePaidPlans } from '../../shared/pricingPlans';

interface AgentPublishWizardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccessPublish: (agentData: any) => void | Promise<void>;
  tokenRebateRate?: number; // 如 20%
  agentToUpdate?: CreatorAgentItem | null;
  mode?: 'create' | 'replace_skill' | 'custom_delivery';
  skillReplaceHint?: string;
}

type WizardStep = 'upload' | 'verifying' | 'fix_center' | 'audit_launch';
type HostPrecheckStatus = 'idle' | 'running' | 'passed' | 'failed';
type ScaffoldLang = 'python' | 'node';

function crc32(data: Uint8Array) {
  let crc = 0xffffffff;
  for (let i = 0; i < data.length; i++) {
    crc ^= data[i];
    for (let j = 0; j < 8; j++) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function zipBytes(n: number, size: 2 | 4) {
  const b = new Uint8Array(size);
  const v = new DataView(b.buffer);
  if (size === 2) v.setUint16(0, n, true);
  else v.setUint32(0, n, true);
  return b;
}

function concatBytes(parts: Uint8Array[]) {
  const out = new Uint8Array(parts.reduce((sum, p) => sum + p.length, 0));
  let offset = 0;
  for (const part of parts) {
    out.set(part, offset);
    offset += part.length;
  }
  return out;
}

function createZipBlob(files: { path: string; content: string }[]) {
  const encoder = new TextEncoder();
  const locals: Uint8Array[] = [];
  const centrals: Uint8Array[] = [];
  let offset = 0;
  for (const file of files) {
    const name = encoder.encode(file.path);
    const data = encoder.encode(file.content);
    const crc = crc32(data);
    const local = concatBytes([
      zipBytes(0x04034b50, 4),
      zipBytes(20, 2),
      zipBytes(0, 2),
      zipBytes(0, 2),
      zipBytes(0, 2),
      zipBytes(0, 2),
      zipBytes(crc, 4),
      zipBytes(data.length, 4),
      zipBytes(data.length, 4),
      zipBytes(name.length, 2),
      zipBytes(0, 2),
      name,
      data
    ]);
    const central = concatBytes([
      zipBytes(0x02014b50, 4),
      zipBytes(20, 2),
      zipBytes(20, 2),
      zipBytes(0, 2),
      zipBytes(0, 2),
      zipBytes(0, 2),
      zipBytes(0, 2),
      zipBytes(crc, 4),
      zipBytes(data.length, 4),
      zipBytes(data.length, 4),
      zipBytes(name.length, 2),
      zipBytes(0, 2),
      zipBytes(0, 2),
      zipBytes(0, 2),
      zipBytes(0, 2),
      zipBytes(0, 4),
      zipBytes(offset, 4),
      name
    ]);
    locals.push(local);
    centrals.push(central);
    offset += local.length;
  }
  const centralDir = concatBytes(centrals);
  const end = concatBytes([
    zipBytes(0x06054b50, 4),
    zipBytes(0, 2),
    zipBytes(0, 2),
    zipBytes(files.length, 2),
    zipBytes(files.length, 2),
    zipBytes(centralDir.length, 4),
    zipBytes(offset, 4),
    zipBytes(0, 2)
  ]);
  return new Blob([concatBytes([...locals, centralDir, end])], { type: 'application/zip' });
}

function scaffoldFiles(lang: ScaffoldLang): { path: string; content: string }[] {
  const isPython = lang === 'python';
  const entry = isPython ? 'entrypoint.py' : 'entrypoint.js';
  return [
    {
      path: 'README.md',
      content: `# Hellome Skill 脚手架（${isPython ? 'Python' : 'Node.js'}）

1. 按 SKILL.md 填写能力说明与输入输出契约
2. 在 ${entry} 实现入口逻辑
3. 打包为 zip 后回到发布向导上传并检测
`
    },
    {
      path: 'SKILL.md',
      content: `# Skill Name

## 适用场景
描述该 Skill 解决的问题。

## 输入参数
- query: string（必填）

## 输出结果
- answer: string

## 权限与依赖
- 无外部密钥

## 验收标准
给定样例输入可稳定产出结构化结果。
`
    },
    {
      path: 'manifest.json',
      content: JSON.stringify(
        {
          name: isPython ? 'hellome-python-skill' : 'hellome-node-skill',
          version: '1.0.0',
          runtime: isPython ? 'python3.10' : 'node20',
          entrypoint: entry,
          hermesMinVersion: '>=2.3.0'
        },
        null,
        2
      )
    },
    {
      path: 'hermes.config.yaml',
      content: `runtime: ${isPython ? 'python' : 'node'}
entrypoint: ${entry}
timeout_sec: 15
`
    },
    {
      path: 'schemas/input.schema.json',
      content: JSON.stringify(
        {
          type: 'object',
          required: ['query'],
          properties: { query: { type: 'string', minLength: 1 } }
        },
        null,
        2
      )
    },
    {
      path: 'schemas/output.schema.json',
      content: JSON.stringify(
        {
          type: 'object',
          required: ['answer'],
          properties: { answer: { type: 'string' } }
        },
        null,
        2
      )
    },
    isPython
      ? {
          path: 'entrypoint.py',
          content: `def main(input):\n    return {"answer": f"echo: {input.get('query', '')}"}\n`
        }
      : {
          path: 'entrypoint.js',
          content: `export async function main(input) {\n  return { answer: \`echo: \${input?.query || ''}\` };\n}\n`
        }
  ];
}

const HOST_PRECHECK_FAILURES = [
  { code: 'HOST_8_9_DUAL_OS', detail: '双端真机未由 FDE 判定' },
  { code: 'HOST_7_7_TOKEN', detail: '词元 L1-L4 未由 FDE 判定' },
  { code: 'HOST_2_2_INSTALL_TREE', detail: '不写安装目录未由 FDE 判定' },
  { code: 'HOST_8_8_PRESENCE', detail: 'presence 关页停服未由 FDE 判定' },
  { code: 'HOST_8_2_1_OPEN_BROWSER', detail: '上架 open_browser 未由 FDE 判定' },
  { code: 'HOST_8_9_NO_SINGLE_OS', detail: '启动指令双端未由 FDE 判定' }
];

export const AgentPublishWizardModal: React.FC<AgentPublishWizardModalProps> = ({
  isOpen,
  onClose,
  onSuccessPublish,
  tokenRebateRate = 20,
  agentToUpdate = null,
  mode = 'create',
  skillReplaceHint
}) => {
  const skillOnlyMode = mode === 'replace_skill' || mode === 'custom_delivery';
  // Skill Package Upload
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadedFileName, setUploadedFileName] = useState<string>(
    agentToUpdate?.skillPackage?.fileName || ''
  );
  const [uploadedFileSize, setUploadedFileSize] = useState<string>(
    agentToUpdate?.skillPackage?.size || ''
  );
  const [isDragOver, setIsDragOver] = useState(false);
  const [selectedPresetId, setSelectedPresetId] = useState<string>('preset_ecommerce_perfect');
  const [skillPackageMode, setSkillPackageMode] = useState<'has_package' | 'no_package'>('has_package');
  const [scaffoldLang, setScaffoldLang] = useState<ScaffoldLang | null>(null);
  const [scaffoldDownloaded, setScaffoldDownloaded] = useState(false);

  // Basic Info Form State
  const [agentTitle, setAgentTitle] = useState(agentToUpdate?.title || '跨境电商海外多语种爆款文案 Agent');
  const [agentDesc, setAgentDesc] = useState(
    agentToUpdate?.desc || '自动解析海外竞品痛点，生成符合当地语境的高转化 Listing 标题与详情页'
  );
  const [agentVersion, setAgentVersion] = useState(agentToUpdate?.version || '1.2.0');
  const [platformSupport, setPlatformSupport] = useState<'mac' | 'windows' | 'both'>(
    agentToUpdate?.platformSupport || 'both'
  );
  const [adapterPackages, setAdapterPackages] = useState<AgentAdapterPackage[]>(
    agentToUpdate?.adapterPackages || []
  );
  const [adapterModalOpen, setAdapterModalOpen] = useState(false);
  const [adapterPlatformName, setAdapterPlatformName] = useState('');
  const [adapterZipFile, setAdapterZipFile] = useState<File | null>(null);
  const [adapterSaving, setAdapterSaving] = useState(false);
  const adapterZipInputRef = useRef<HTMLInputElement>(null);

  const platformSupportOptions: Array<{ value: 'mac' | 'windows' | 'both'; label: string }> = [
    { value: 'mac', label: '适配 macOS' },
    { value: 'windows', label: '适配 Windows' },
    { value: 'both', label: '适配macOS和Windows' }
  ];

  // Wizard Navigation
  const [currentStep, setCurrentStep] = useState<WizardStep>('upload');

  // Verification Pipeline States
  const [verifyingStage, setVerifyingStage] = useState<'tier1' | 'tier2' | 'tier3' | 'completed'>('tier1');
  const [isVerifyingRunning, setIsVerifyingRunning] = useState(false);
  const [progressPercent, setProgressPercent] = useState(0);
  const [activeCheckItems, setActiveCheckItems] = useState<VerificationCheckItem[]>([]);
  const [currentMetrics, setCurrentMetrics] = useState<SandboxExecutionMetrics | null>(null);
  const [currentIssues, setCurrentIssues] = useState<FixCenterIssue[]>([]);
  const [filesList, setFilesList] = useState<SkillFileEntry[]>([]);
  const [manifest, setManifest] = useState<SkillPackageManifest | null>(null);

  // Fix Center State
  const [copiedSnippetId, setCopiedSnippetId] = useState<string | null>(null);
  const [expandedIssueId, setExpandedIssueId] = useState<string | null>(null);
  const [hasAppliedFixPatch, setHasAppliedFixPatch] = useState(false);
  const [validationHistory, setValidationHistory] = useState<ValidationHistoryRecord[]>(initialValidationHistory);

  // Pricing & Launch State
  const [pricingModel, setPricingModel] = useState<'paid' | 'free'>(
    agentToUpdate?.pricingType === 'free' || agentToUpdate?.pricingPlans?.isFree ? 'free' : 'paid'
  );
  const [price, setPrice] = useState<number>(
    agentToUpdate?.pricingPlans?.price ||
      agentToUpdate?.pricingPlans?.monthlyPrice ||
      agentToUpdate?.price ||
      39
  );
  const [enableEnterpriseCustomization, setEnableEnterpriseCustomization] = useState(
    agentToUpdate?.fdeCustomEnabled ?? true
  );
  const [isSubmittingAudit, setIsSubmittingAudit] = useState(false);
  const [isAuditPassed, setIsAuditPassed] = useState(false);
  const [lifecycleAck, setLifecycleAck] = useState(false);
  const [showSkillDocModal, setShowSkillDocModal] = useState(false);
  const [hostPrecheck, setHostPrecheck] = useState<HostPrecheckStatus>('idle');
  const [hostDebugOutcome, setHostDebugOutcome] = useState<'passed' | 'failed'>('passed');

  // Initialize selected package data
  useEffect(() => {
    if (isOpen) {
      setSkillPackageMode('has_package');
      setScaffoldLang(null);
      setScaffoldDownloaded(false);
      setHostPrecheck('idle');
      setHostDebugOutcome('passed');
      setLifecycleAck(false);
      setIsAuditPassed(false);
    }
  }, [isOpen]);

  useEffect(() => {
    if (agentToUpdate) {
      setAgentTitle(agentToUpdate.title);
      setAgentDesc(agentToUpdate.desc);
      if (agentToUpdate.platformSupport) {
        setPlatformSupport(agentToUpdate.platformSupport);
      }
      if (agentToUpdate.skillPackage?.fileName) {
        setUploadedFileName(agentToUpdate.skillPackage.fileName);
        setUploadedFileSize(agentToUpdate.skillPackage.size);
      }
      setAdapterPackages(agentToUpdate.adapterPackages || []);
      setPricingModel(
        agentToUpdate.pricingType === 'free' || agentToUpdate.pricingPlans?.isFree ? 'free' : 'paid'
      );
      setPrice(
        agentToUpdate.pricingPlans?.price ||
          agentToUpdate.pricingPlans?.monthlyPrice ||
          agentToUpdate.price ||
          39
      );
    }
    const preset = mockSkillPresets.find((p) => p.id === selectedPresetId) || mockSkillPresets[0];
    if (!agentToUpdate && !agentTitle) {
      setAgentTitle(preset.name);
      setAgentDesc(preset.description);
      setAgentVersion(preset.version);
    }
    setFilesList(preset.files);
    setManifest(preset.manifest);
    setActiveCheckItems(preset.checks);
    setCurrentIssues(preset.issues || []);
    setCurrentMetrics(preset.metrics || null);
  }, [selectedPresetId, agentToUpdate]);

  const handleFileUpload = (file: File) => {
    const sizeInMb = (file.size / (1024 * 1024)).toFixed(1);
    setUploadedFileName(file.name);
    setUploadedFileSize(`${sizeInMb} MB`);
    setHostPrecheck('idle');
    const cleanName = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
    if (cleanName && cleanName.length > 2 && (!agentTitle || agentTitle === '跨境电商海外多语种爆款文案 Agent')) {
      setAgentTitle(cleanName);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileUpload(e.target.files[0]);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  const persistAdapterPackages = async (next: AgentAdapterPackage[]) => {
    setAdapterPackages(next);
    if (!agentToUpdate?.id) return;
    try {
      await fetch(`/api/me/agents/${encodeURIComponent(agentToUpdate.id)}/adapter-packages`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ packages: next })
      });
    } catch {
      /* keep local list */
    }
  };

  const handleAddAdapterPackage = async () => {
    const name = adapterPlatformName.trim();
    if (!name) {
      alert('请填写适配平台名称');
      return;
    }
    if (!adapterZipFile) {
      alert('请上传 ZIP 安装包');
      return;
    }
    if (!/\.(zip|tar\.gz|tgz)$/i.test(adapterZipFile.name)) {
      alert('仅支持 .zip / .tar.gz');
      return;
    }
    setAdapterSaving(true);
    try {
      const buf = await adapterZipFile.arrayBuffer();
      const res = await fetch('/api/me/uploads', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/octet-stream',
          'X-File-Name': encodeURIComponent(adapterZipFile.name)
        },
        body: buf
      });
      const json = (await res.json().catch(() => null)) as {
        ok?: boolean;
        data?: { fileKey: string; url: string; fileName: string; size: string };
      } | null;
      const pack: AgentAdapterPackage =
        res.ok && json?.ok && json.data
          ? {
              id: `adp_${Date.now()}`,
              platformName: name,
              fileName: json.data.fileName,
              size: json.data.size,
              url: json.data.url,
              fileKey: json.data.fileKey
            }
          : {
              id: `adp_${Date.now()}`,
              platformName: name,
              fileName: adapterZipFile.name,
              size: `${Math.max(1, adapterZipFile.size / 1024).toFixed(1)} KB`,
              url: URL.createObjectURL(adapterZipFile)
            };
      await persistAdapterPackages([...adapterPackages, pack]);
      setAdapterModalOpen(false);
      setAdapterPlatformName('');
      setAdapterZipFile(null);
    } finally {
      setAdapterSaving(false);
    }
  };

  if (!isOpen) return null;

  const showUploadArea =
    skillOnlyMode || skillPackageMode === 'has_package' || scaffoldDownloaded;

  const handleStartHostPrecheck = () => {
    if (!uploadedFileName || hostPrecheck === 'running') return;
    setHostPrecheck('running');
    window.setTimeout(() => {
      setHostPrecheck(hostDebugOutcome);
    }, 800);
  };

  // Handler: Start Verification Pipeline
  const handleStartVerification = () => {
    setCurrentStep('verifying');
    setIsVerifyingRunning(true);
    setProgressPercent(10);
    setVerifyingStage('tier1');

    const preset = mockSkillPresets.find((p) => p.id === selectedPresetId);
    const isErrorScenario = preset?.defaultOutcome === 'fail_structure' && !hasAppliedFixPatch;

    // Reset check items to running/pending
    const initialChecks = (isErrorScenario ? preset!.checks : (preset?.fixedPackage?.checks || preset?.checks || [])).map((c, idx) => ({
      ...c,
      status: idx < 2 ? ('running' as const) : ('pending' as const)
    }));
    setActiveCheckItems(initialChecks);

    // Simulated multi-stage verification timer
    setTimeout(() => {
      setProgressPercent(35);
      setVerifyingStage('tier1');
    }, 600);

    setTimeout(() => {
      setProgressPercent(65);
      setVerifyingStage('tier2');
      setActiveCheckItems((prev) =>
        prev.map((c) => (c.category === 'structure' ? { ...c, status: isErrorScenario && c.errorMsg ? 'failed' : 'passed' } : c))
      );
    }, 1300);

    setTimeout(() => {
      setProgressPercent(90);
      setVerifyingStage('tier3');
      setActiveCheckItems((prev) =>
        prev.map((c) => (c.category === 'hermes_compat' ? { ...c, status: isErrorScenario && c.errorMsg ? 'failed' : 'passed' } : c))
      );
    }, 2100);

    setTimeout(() => {
      setProgressPercent(100);
      setIsVerifyingRunning(false);
      setVerifyingStage('completed');

      if (isErrorScenario) {
        // Validation FAILED -> Route to Fix Center
        const failedChecks = preset!.checks;
        setActiveCheckItems(failedChecks);
        setCurrentIssues(preset!.issues || []);
        setExpandedIssueId(preset!.issues?.[0]?.id || null);

        // Record history snapshot
        const newRecord: ValidationHistoryRecord = {
          id: `val_${Date.now()}`,
          version: `v${agentVersion}`,
          packageName: preset!.fileName,
          timestamp: new Date().toLocaleString(),
          status: 'failed',
          tier1Status: 'failed',
          tier2Status: 'failed',
          tier3Status: 'failed',
          totalChecks: failedChecks.length,
          passedChecks: failedChecks.filter((c) => c.status === 'passed').length,
          failedCount: failedChecks.filter((c) => c.status === 'failed').length,
          issuesSummary: preset!.issues?.map((i) => i.title)
        };
        setValidationHistory((prev) => [newRecord, ...prev]);

        setCurrentStep('fix_center');
      } else {
        // Validation PASSED -> Unlock Audit & Launch
        const passedChecks = preset?.fixedPackage?.checks || preset?.checks || [];
        setActiveCheckItems(passedChecks.map((c) => ({ ...c, status: 'passed' })));
        const passedMetrics = preset?.fixedPackage?.metrics || preset?.metrics || {
          avgExecutionTokens: 1850,
          avgExecutionCostYuan: 0.038,
          p95LatencySec: 1.84,
          successRatePercent: 100,
          testedSamplesCount: 10,
          hermesVersionTested: 'Hermes-Core v2.4.1 (Stable)',
          compatibilityRange: 'Python 3.10+, Node 20+, ToolUse-v3 引擎'
        };
        setCurrentMetrics(passedMetrics);

        // Record history snapshot
        const newRecord: ValidationHistoryRecord = {
          id: `val_${Date.now()}`,
          version: `v${agentVersion}`,
          packageName: preset ? (hasAppliedFixPatch ? `${preset.fileName.replace('.zip', '')}-fixed-v${preset.fixedPackage?.version || '1.0.1'}.zip` : preset.fileName) : uploadedFileName,
          timestamp: new Date().toLocaleString(),
          status: 'passed',
          tier1Status: 'passed',
          tier2Status: 'passed',
          tier3Status: 'passed',
          totalChecks: passedChecks.length,
          passedChecks: passedChecks.length,
          failedCount: 0,
          metrics: passedMetrics
        };
        setValidationHistory((prev) => [newRecord, ...prev]);

        setCurrentStep('audit_launch');
      }
    }, 2900);
  };

  // Handler: Apply one-click fix patch in Fix Center
  const handleApplyFixAndReverify = () => {
    setHasAppliedFixPatch(true);
    const preset = mockSkillPresets.find((p) => p.id === selectedPresetId);
    if (preset?.fixedPackage) {
      setAgentVersion(preset.fixedPackage.version);
      setFilesList(preset.fixedPackage.files);
    }
    // Re-verify immediately
    handleStartVerification();
  };

  // Handler: Copy code snippet
  const handleCopySnippet = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSnippetId(id);
    setTimeout(() => setCopiedSnippetId(null), 2000);
  };

  const buildAgentPayload = (status: CreatorAgentItem['status']) => ({
    id: agentToUpdate ? agentToUpdate.id : `agent_${Date.now()}`,
    title: agentTitle,
    desc: agentDesc,
    category: agentToUpdate?.category || '',
    coverImage:
      agentToUpdate?.coverImage ||
      'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=400&q=80',
    pricingType: pricingModel === 'free' ? 'free' : 'paid',
    price: pricingModel === 'free' ? 0 : Number(price),
    pricingPlans: {
      price: Number(price),
      isFree: pricingModel === 'free'
    },
    tokenRebateEnabled: true,
    fdeCustomEnabled: enableEnterpriseCustomization,
    metrics: currentMetrics,
    version: agentVersion,
    rating: agentToUpdate?.rating || 5.0,
    totalSales: agentToUpdate?.paidOrdersCount || 0,
    totalRevenue: agentToUpdate?.totalRevenue || 0,
    tokenRebateEarned: 0,
    skillPackage: {
      fileName: uploadedFileName,
      size: uploadedFileSize
    },
    status,
    platformSupport,
    adapterPackages,
    updatedAt: '刚刚'
  });

  const handleSaveDraft = () => {
    if (!agentTitle.trim()) {
      alert('请先填写智能体名称');
      return;
    }
    onSuccessPublish(buildAgentPayload('draft'));
    onClose();
  };

  // Handler: Submit Audit & Launch
  const handleSubmitAudit = async () => {
    if (mode === 'create' && !lifecycleAck) {
      alert('请先确认智能体使用后不可删除的说明');
      return;
    }
    if (mode !== 'custom_delivery') {
      const plans = normalizePricingPlans({
        isFree: pricingModel === 'free',
        price
      });
      const invalid = validatePaidPlans(plans);
      if (invalid) {
        alert(invalid);
        return;
      }
    }
    setIsSubmittingAudit(true);
    if (mode === 'custom_delivery') {
      try {
        await Promise.resolve(onSuccessPublish(buildAgentPayload('published')));
        onClose();
      } catch (err) {
        alert(err instanceof Error ? err.message : '提交平台审核失败');
      } finally {
        setIsSubmittingAudit(false);
      }
      return;
    }
    setTimeout(() => {
      setIsSubmittingAudit(false);
      setIsAuditPassed(true);
      setTimeout(() => {
        onSuccessPublish(buildAgentPayload('published'));
        onClose();
      }, 1200);
    }, 1500);
  };

  const handleDownloadStandardSkillDoc = () => {
    const content = `# Hellome 标准版 Skill 开发文档

## 1. 概述
标准版 Skill 包是平台可校验、可沙箱试运行的最小交付单元。上传前请按本文档整理目录与元数据。

## 2. 目录结构（建议）
\`\`\`
your-skill-v1.0.0/
├── SKILL.md              # 必填：技能说明与契约
├── manifest.json         # 必填：入口、版本、依赖
├── entrypoint.py         # 或 entrypoint.js：运行入口
├── inputs/               # 输入 Schema 示例
├── outputs/              # 输出 Schema 示例
└── fixtures/             # 沙箱回放样例（可选）
\`\`\`

## 3. SKILL.md 必填章节
- 名称 / 版本 / 适用场景
- 输入参数（字段、类型、必填）
- 输出结果（字段、类型、失败码）
- 权限与外部依赖（API / 文件 / 网络）
- 验收标准与样例对话

## 4. 校验与试运行
平台将执行结构检查、兼容性检查与隔离沙箱试运行。请确保：
1. 包内可被无交互执行；
2. 样例输入可在沙箱稳定跑通；
3. 不依赖本机未声明的私有密钥。

## 5. 版本与更新
- 使用 SemVer（如 1.2.0）
- 已上架智能体需先下架，再替换 Skill 包

---
文档版本：v1.0 · Hellome FDE Hub
`;
    const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'Hellome-标准版Skill开发文档.md';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const handleDownloadScaffold = (lang: ScaffoldLang) => {
    const blob = createZipBlob(scaffoldFiles(lang));
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = lang === 'python' ? 'hellome-python-skill-scaffold.zip' : 'hellome-node-skill-scaffold.zip';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    setScaffoldDownloaded(true);
  };

  // Cost calculation based on sandbox metrics
  const unitTokens = currentMetrics?.avgExecutionTokens || 1850;
  const unitCostYuan = currentMetrics?.avgExecutionCostYuan || 0.038;

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="w-full max-w-4xl bg-white text-slate-900 rounded-3xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden my-auto animate-in zoom-in-95 duration-150 max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* TOP HEADER & WIZARD STEPPER (WHITE / LIGHT THEMED) */}
        <div className="p-5 sm:px-8 border-b border-slate-200 bg-slate-50/80 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
                <Boxes size={20} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base sm:text-lg font-bold text-slate-900">
                    {mode === 'custom_delivery'
                      ? '上传 Skill 交付'
                      : mode === 'replace_skill'
                        ? '替换 Skill 源码包'
                        : '发布智能体'}
                  </h2>
                  {skillOnlyMode ? (
                    <span className="px-2.5 py-0.5 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-[11px] font-semibold">
                      {mode === 'custom_delivery' ? '定制交付校验' : 'Skill 升级更新'}
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setShowSkillDocModal(true)}
                      className="px-2.5 py-0.5 rounded-full bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-700 text-[11px] font-semibold cursor-pointer transition-colors"
                    >
                      请先阅读标准版skill文档
                    </button>
                  )}
                </div>
                {skillOnlyMode && (
                  <p className="text-xs text-slate-500 mt-0.5">
                    {skillReplaceHint ||
                      (mode === 'custom_delivery'
                        ? '上传 Skill 包并通过校验后，将提交平台审核'
                        : `当前智能体处于已下架状态，正在为【${agentToUpdate?.title || agentTitle}】更新 Skill 包`)}
                  </p>
                )}
              </div>
            </div>

            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-slate-200/80 hover:bg-slate-300 text-slate-600 hover:text-slate-900 flex items-center justify-center transition-colors cursor-pointer text-xs font-bold"
            >
              ✕
            </button>
          </div>
        </div>

        {/* MAIN BODY CONTENT (WHITE / LIGHT THEMED) */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-8 space-y-6 bg-white">

          {/* ======================= STEP 1: UPLOAD & BASIC INFO ======================= */}
          {currentStep === 'upload' && (
            <div className="space-y-6">
              <div className="space-y-4">
                <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <FileText size={15} className="text-blue-600" />
                  <span>智能体基础展示信息</span>
                </h3>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-800">智能体名称</label>
                  <input
                    type="text"
                    value={agentTitle}
                    onChange={(e) => setAgentTitle(e.target.value)}
                    placeholder="例如：跨境电商海外社媒自动生成 Agent"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 outline-none focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-800">功能描述与核心解决痛点</label>
                  <textarea
                    rows={2}
                    value={agentDesc}
                    onChange={(e) => setAgentDesc(e.target.value)}
                    placeholder="简述该智能体解决的核心业务瓶颈与自动化输出产物..."
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 outline-none resize-none focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-800">客户端平台适配</label>
                  <div className="flex flex-wrap gap-2">
                    {platformSupportOptions.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => setPlatformSupport(option.value)}
                        className={`px-3.5 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                          platformSupport === option.value
                            ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                            : 'bg-slate-50 text-slate-600 border-slate-200 hover:border-blue-300 hover:text-blue-700'
                        }`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Skill Package Upload Area */}
              <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200 space-y-3.5">
                {mode !== 'replace_skill' && mode !== 'custom_delivery' && (
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setSkillPackageMode('has_package');
                        setScaffoldLang(null);
                        setScaffoldDownloaded(false);
                      }}
                      className={`px-3.5 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                        skillPackageMode === 'has_package'
                          ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                          : 'bg-white text-slate-600 border-slate-200 hover:border-blue-300 hover:text-blue-700'
                      }`}
                    >
                      我已有 skill 包
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setSkillPackageMode('no_package');
                        setScaffoldLang(null);
                        setScaffoldDownloaded(false);
                        setUploadedFileName('');
                        setHostPrecheck('idle');
                      }}
                      className={`px-3.5 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                        skillPackageMode === 'no_package'
                          ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                          : 'bg-white text-slate-600 border-slate-200 hover:border-blue-300 hover:text-blue-700'
                      }`}
                    >
                      我没有 skill 包
                    </button>
                  </div>
                )}

                {showUploadArea ? (
                  <>
                {skillPackageMode === 'no_package' && scaffoldLang && (
                  <p className="text-[11px] text-slate-500">
                    已选择 {scaffoldLang === 'python' ? 'Python' : 'Node.js'} 脚手架。开发完成后打包 zip 上传即可。
                    <button
                      type="button"
                      onClick={() => handleDownloadScaffold(scaffoldLang)}
                      className="ml-2 text-blue-600 font-bold cursor-pointer"
                    >
                      再次下载
                    </button>
                  </p>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 flex items-center gap-2">
                    <Sparkles size={15} className="text-blue-600" />
                    <span>上传 Skill 技能压缩包 (.zip / .tar.gz)</span>
                  </span>
                </div>

                <input
                  type="file"
                  ref={fileInputRef}
                  accept=".zip,.tar.gz,.tar"
                  className="hidden"
                  onChange={handleFileChange}
                />

                {uploadedFileName ? (
                  <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-100 text-slate-800 text-xs font-mono border border-slate-200 min-w-0">
                        <FileCode size={14} className="text-blue-600 shrink-0" />
                        <span className="font-semibold truncate">{uploadedFileName}</span>
                        {uploadedFileSize && <span className="text-slate-500 shrink-0">({uploadedFileSize})</span>}
                      </div>
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="text-[11px] font-bold text-blue-600 cursor-pointer shrink-0"
                      >
                        重新上传
                      </button>
                    </div>
                    <button
                      type="button"
                      disabled={hostPrecheck === 'running'}
                      onClick={handleStartHostPrecheck}
                      className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold cursor-pointer disabled:opacity-60 flex items-center justify-center gap-2"
                    >
                      {hostPrecheck === 'running' ? (
                        <>
                          <RotateCw size={16} className="animate-spin" />
                          检测中…
                        </>
                      ) : (
                        <>
                          <ScanSearch size={16} />
                          开始检测
                        </>
                      )}
                    </button>
                  </div>
                ) : (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDragOver(true);
                  }}
                  onDragLeave={() => setIsDragOver(false)}
                  onDrop={handleDrop}
                  className={`border-2 border-dashed rounded-2xl p-7 text-center transition-all cursor-pointer group ${
                    isDragOver
                      ? 'border-blue-500 bg-blue-50/60 scale-[0.99]'
                      : 'border-slate-300 hover:border-blue-500 bg-white hover:bg-slate-50/50'
                  }`}
                >
                  <UploadCloud
                    size={36}
                    className={`mx-auto transition-colors mb-2 ${
                      isDragOver ? 'text-blue-600 scale-110' : 'text-slate-400 group-hover:text-blue-600'
                    }`}
                  />
                  <div className="text-xs font-bold text-slate-800">
                    点击上传或将 Skill 压缩包拖拽至此处
                  </div>
                  <div className="text-[11px] text-slate-500 mt-1">
                    支持 .zip, .tar.gz 格式 (将自动识别 SKILL.md、entrypoint 与依赖清单)
                  </div>
                </div>
                )}
                  </>
                ) : (
                  <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-4">
                    <div>
                      <p className="text-xs font-bold text-slate-800">选择运行语言</p>
                      <p className="text-[11px] text-slate-500 mt-1">
                        下载对应脚手架后，按目录开发并打包 zip，再回到这里上传检测。
                      </p>
                    </div>
                    <div className="grid grid-cols-2 gap-2.5">
                      {([
                        { id: 'python' as const, title: 'Python', desc: 'entrypoint.py' },
                        { id: 'node' as const, title: 'Node.js', desc: 'entrypoint.js' }
                      ]).map((lang) => (
                        <button
                          key={lang.id}
                          type="button"
                          onClick={() => {
                            setScaffoldLang(lang.id);
                            setScaffoldDownloaded(false);
                          }}
                          className={`p-4 rounded-2xl border text-left cursor-pointer transition-all ${
                            scaffoldLang === lang.id
                              ? 'border-blue-600 bg-blue-50 shadow-xs'
                              : 'border-slate-200 bg-slate-50 hover:border-blue-300'
                          }`}
                        >
                          <div className="text-sm font-bold text-slate-900">{lang.title}</div>
                          <div className="text-[11px] text-slate-500 mt-1 font-mono">{lang.desc}</div>
                        </button>
                      ))}
                    </div>
                    {scaffoldLang && (
                      <button
                        type="button"
                        onClick={() => handleDownloadScaffold(scaffoldLang)}
                        className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold cursor-pointer flex items-center justify-center gap-2"
                      >
                        <Download size={16} />
                        下载{scaffoldLang === 'python' ? ' Python' : ' Node.js'} 脚手架
                      </button>
                    )}
                  </div>
                )}
              </div>

              {showUploadArea && (
              <>
              {uploadedFileName && (hostPrecheck === 'passed' || hostPrecheck === 'failed') && (
              <div className="space-y-3">
                <div
                  className={`rounded-2xl border ${
                    hostPrecheck === 'passed'
                      ? 'bg-emerald-50 border-emerald-200 p-8 sm:p-10 text-center'
                      : 'bg-rose-50 border-rose-200 p-5 sm:p-6 text-center'
                  }`}
                >
                  <div
                    className={`font-black tracking-tight ${
                      hostPrecheck === 'passed'
                        ? 'text-3xl sm:text-4xl text-emerald-700'
                        : 'text-2xl sm:text-3xl text-rose-700'
                    }`}
                  >
                    {hostPrecheck === 'passed' ? '检测通过' : '检测不通过'}
                  </div>
                  {hostPrecheck === 'failed' && (
                    <div className="mt-4 rounded-xl bg-slate-950 text-left px-4 py-3 space-y-2">
                      {HOST_PRECHECK_FAILURES.map((item) => (
                        <div key={item.code} className="text-xs sm:text-[13px] leading-relaxed">
                          <span className="text-rose-400 font-bold">未过</span>
                          <span className="text-white/50"> · </span>
                          <span className="font-mono text-white underline underline-offset-2 decoration-white/40">
                            {item.code}
                          </span>
                          <span className="text-white/50"> · </span>
                          <span className="text-white">{item.detail}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  {hostPrecheck === 'passed' && (
                    <button
                      type="button"
                      onClick={handleStartVerification}
                      className="mt-5 px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-md shadow-blue-600/20 inline-flex items-center gap-2 cursor-pointer"
                    >
                      <Play size={14} fill="currentColor" />
                      去测试
                    </button>
                  )}
                </div>

                {process.env.NODE_ENV === 'development' && (
                  <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-3 space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold tracking-wide text-slate-500 uppercase">
                        调试面板
                      </span>
                      <span className="px-1.5 py-0.5 rounded bg-slate-800 text-white text-[9px] font-mono">
                        DEV
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setHostDebugOutcome('passed');
                          setHostPrecheck('passed');
                        }}
                        className={`px-3 py-1.5 rounded-lg text-[11px] font-bold cursor-pointer border ${
                          hostPrecheck === 'passed'
                            ? 'bg-emerald-600 text-white border-emerald-600'
                            : 'bg-white text-slate-600 border-slate-200 hover:border-emerald-300'
                        }`}
                      >
                        检测通过
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setHostDebugOutcome('failed');
                          setHostPrecheck('failed');
                        }}
                        className={`px-3 py-1.5 rounded-lg text-[11px] font-bold cursor-pointer border ${
                          hostPrecheck === 'failed'
                            ? 'bg-rose-600 text-white border-rose-600'
                            : 'bg-white text-slate-600 border-slate-200 hover:border-rose-300'
                        }`}
                      >
                        检测不通过
                      </button>
                    </div>
                  </div>
                )}
              </div>
              )}

              <div className="space-y-3">
                <div>
                  <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    外部工具适配版本
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-1">
                    站内仍用 Hermes 运行。这里上传的 ZIP 面向 WorkBuddy、Codex 等外部工具，平台名可自定义。
                  </p>
                </div>
                {adapterPackages.length > 0 && (
                  <div className="space-y-2">
                    {adapterPackages.map((pack) => (
                      <div
                        key={pack.id}
                        className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2"
                      >
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-slate-800 truncate">
                            {adapterDisplayName(pack.platformName)}
                          </div>
                          <div className="text-[11px] text-slate-500 truncate">
                            {pack.fileName}
                            {pack.size ? ` · ${pack.size}` : ''}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() =>
                            void persistAdapterPackages(adapterPackages.filter((item) => item.id !== pack.id))
                          }
                          className="shrink-0 p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer"
                          title="移除"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setAdapterPlatformName('');
                    setAdapterZipFile(null);
                    setAdapterModalOpen(true);
                  }}
                  className="w-full h-10 rounded-xl border border-dashed border-slate-300 text-slate-700 text-xs font-bold hover:border-blue-400 hover:text-blue-700 hover:bg-blue-50/50 cursor-pointer inline-flex items-center justify-center gap-1.5"
                >
                  <Plus size={14} />
                  添加适配版本
                </button>
              </div>

              {/* Action Bar */}
              <div className="flex items-center gap-2.5 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all cursor-pointer"
                >
                  取消
                </button>
                {mode !== 'custom_delivery' && (
                  <button
                    type="button"
                    onClick={handleSaveDraft}
                    className="px-5 py-2.5 rounded-xl bg-white hover:bg-slate-50 text-slate-800 text-xs font-bold transition-all border border-slate-200 cursor-pointer"
                  >
                    保存
                  </button>
                )}
              </div>
              </>
              )}

              {skillPackageMode === 'no_package' && !skillOnlyMode && !scaffoldDownloaded && (
                <div className="flex items-center justify-end pt-4 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all cursor-pointer"
                  >
                    关闭
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ======================= STEP 2: 3-TIER VERIFICATION PIPELINE ======================= */}
          {currentStep === 'verifying' && (
            <div className="space-y-6">
              {/* Progress & Live Engine Status */}
              <div className="p-4.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center animate-spin">
                      <RotateCw size={15} />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-900">正在执行三层自动化流水线校验...</div>
                      <div className="text-[11px] text-slate-500">
                        当前阶段: {verifyingStage === 'tier1' ? 'Layer 1: Skill 结构检查' : verifyingStage === 'tier2' ? 'Layer 2: Hermes 兼容检查' : 'Layer 3: 隔离沙箱回放试运行'}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-lg font-black text-blue-600 font-mono">{progressPercent}%</span>
                  </div>
                </div>

                <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-blue-600 h-full transition-all duration-300"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              </div>

              {/* 3 Tier Verification Cards (Light Theme) */}
              <div className="space-y-3.5">
                {/* Tier 1: Structure */}
                <div className="p-4 bg-slate-50/70 rounded-2xl border border-slate-200 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-6 h-6 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs">
                        1
                      </div>
                      <div>
                        <span className="text-xs font-bold text-slate-900">Skill 结构检查 (Structure Schema Check)</span>
                        <div className="text-[11px] text-slate-500">必填文件、版本号、输入输出 Schema、依赖声明、权限声明</div>
                      </div>
                    </div>
                    {verifyingStage === 'tier1' && isVerifyingRunning ? (
                      <span className="text-[11px] text-blue-600 font-mono font-bold animate-pulse">Running...</span>
                    ) : (
                      <span className="text-[11px] text-slate-400 font-mono">4 项检查</span>
                    )}
                  </div>

                  <div className="space-y-1.5 pt-1">
                    {activeCheckItems
                      .filter((c) => c.category === 'structure')
                      .map((item) => (
                        <div
                          key={item.id}
                          className="p-3 rounded-xl bg-white border border-slate-200 flex items-start justify-between gap-3 text-xs shadow-2xs"
                        >
                          <div className="flex items-start gap-2.5">
                            {item.status === 'passed' ? (
                              <CheckCircle2 size={16} className="text-emerald-600 shrink-0 mt-0.5" />
                            ) : item.status === 'failed' ? (
                              <XCircle size={16} className="text-rose-600 shrink-0 mt-0.5" />
                            ) : item.status === 'warning' ? (
                              <AlertTriangle size={16} className="text-amber-600 shrink-0 mt-0.5" />
                            ) : item.status === 'running' ? (
                              <RotateCw size={15} className="text-blue-600 animate-spin shrink-0 mt-0.5" />
                            ) : (
                              <div className="w-4 h-4 rounded-full border-2 border-slate-300 shrink-0 mt-0.5" />
                            )}
                            <div>
                              <div className="font-bold text-slate-900">{item.name}</div>
                              <div className="text-[11px] text-slate-500 mt-0.5">{item.detail}</div>
                              {item.errorMsg && (
                                <div className="text-[11px] text-rose-700 font-mono bg-rose-50 border border-rose-200 px-2.5 py-1 rounded-md mt-1.5 font-medium">
                                  {item.errorMsg}
                                </div>
                              )}
                            </div>
                          </div>
                          {item.elapsedMs ? (
                            <span className="text-[10px] text-slate-400 font-mono shrink-0 font-medium">{item.elapsedMs}ms</span>
                          ) : null}
                        </div>
                      ))}
                  </div>
                </div>

                {/* Tier 2: Hermes Compatibility */}
                <div className="p-4 bg-slate-50/70 rounded-2xl border border-slate-200 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-6 h-6 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xs">
                        2
                      </div>
                      <div>
                        <span className="text-xs font-bold text-slate-900">Hermes 兼容检查 (Hermes Engine Compatibility)</span>
                        <div className="text-[11px] text-slate-500">运行时解析、动态唤起、确认节点识别、交付物生成规范</div>
                      </div>
                    </div>
                    {verifyingStage === 'tier2' && isVerifyingRunning ? (
                      <span className="text-[11px] text-indigo-600 font-mono font-bold animate-pulse">Running...</span>
                    ) : (
                      <span className="text-[11px] text-slate-400 font-mono">4 项检查</span>
                    )}
                  </div>

                  <div className="space-y-1.5 pt-1">
                    {activeCheckItems
                      .filter((c) => c.category === 'hermes_compat')
                      .map((item) => (
                        <div
                          key={item.id}
                          className="p-3 rounded-xl bg-white border border-slate-200 flex items-start justify-between gap-3 text-xs shadow-2xs"
                        >
                          <div className="flex items-start gap-2.5">
                            {item.status === 'passed' ? (
                              <CheckCircle2 size={16} className="text-emerald-600 shrink-0 mt-0.5" />
                            ) : item.status === 'failed' ? (
                              <XCircle size={16} className="text-rose-600 shrink-0 mt-0.5" />
                            ) : item.status === 'warning' ? (
                              <AlertTriangle size={16} className="text-amber-600 shrink-0 mt-0.5" />
                            ) : item.status === 'running' ? (
                              <RotateCw size={15} className="text-indigo-600 animate-spin shrink-0 mt-0.5" />
                            ) : (
                              <div className="w-4 h-4 rounded-full border-2 border-slate-300 shrink-0 mt-0.5" />
                            )}
                            <div>
                              <div className="font-bold text-slate-900">{item.name}</div>
                              <div className="text-[11px] text-slate-500 mt-0.5">{item.detail}</div>
                              {item.errorMsg && (
                                <div className="text-[11px] text-rose-700 font-mono bg-rose-50 border border-rose-200 px-2.5 py-1 rounded-md mt-1.5 font-medium">
                                  {item.errorMsg}
                                </div>
                              )}
                            </div>
                          </div>
                          {item.elapsedMs ? (
                            <span className="text-[10px] text-slate-400 font-mono shrink-0 font-medium">{item.elapsedMs}ms</span>
                          ) : null}
                        </div>
                      ))}
                  </div>
                </div>

                {/* Tier 3: Isolated Sandbox Run */}
                <div className="p-4 bg-slate-50/70 rounded-2xl border border-slate-200 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-6 h-6 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center font-bold text-xs">
                        3
                      </div>
                      <div>
                        <span className="text-xs font-bold text-slate-900">沙箱试运行 (Hermes Isolated Sandbox Execution)</span>
                        <div className="text-[11px] text-slate-500">标准测试集跑通、超时熔断压力测试、真实词元消耗精算</div>
                      </div>
                    </div>
                    {verifyingStage === 'tier3' && isVerifyingRunning ? (
                      <span className="text-[11px] text-purple-600 font-mono font-bold animate-pulse">Running...</span>
                    ) : (
                      <span className="text-[11px] text-slate-400 font-mono">3 项检查</span>
                    )}
                  </div>

                  <div className="space-y-1.5 pt-1">
                    {activeCheckItems
                      .filter((c) => c.category === 'sandbox')
                      .map((item) => (
                        <div
                          key={item.id}
                          className="p-3 rounded-xl bg-white border border-slate-200 flex items-start justify-between gap-3 text-xs shadow-2xs"
                        >
                          <div className="flex items-start gap-2.5">
                            {item.status === 'passed' ? (
                              <CheckCircle2 size={16} className="text-emerald-600 shrink-0 mt-0.5" />
                            ) : item.status === 'failed' ? (
                              <XCircle size={16} className="text-rose-600 shrink-0 mt-0.5" />
                            ) : item.status === 'warning' ? (
                              <AlertTriangle size={16} className="text-amber-600 shrink-0 mt-0.5" />
                            ) : item.status === 'running' ? (
                              <RotateCw size={15} className="text-purple-600 animate-spin shrink-0 mt-0.5" />
                            ) : (
                              <div className="w-4 h-4 rounded-full border-2 border-slate-300 shrink-0 mt-0.5" />
                            )}
                            <div>
                              <div className="font-bold text-slate-900">{item.name}</div>
                              <div className="text-[11px] text-slate-500 mt-0.5">{item.detail}</div>
                              {item.errorMsg && (
                                <div className="text-[11px] text-rose-700 font-mono bg-rose-50 border border-rose-200 px-2.5 py-1 rounded-md mt-1.5 font-medium">
                                  {item.errorMsg}
                                </div>
                              )}
                            </div>
                          </div>
                          {item.elapsedMs ? (
                            <span className="text-[10px] text-slate-400 font-mono shrink-0 font-medium">{item.elapsedMs}ms</span>
                          ) : null}
                        </div>
                      ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ======================= STEP 2.5: FIX CENTER (WHITE / LIGHT THEMED) ======================= */}
          {currentStep === 'fix_center' && (
            <div className="space-y-6">
              {/* Failure Alert Banner */}
              <div className="p-4.5 bg-rose-50 border border-rose-200 rounded-2xl flex items-start gap-3.5">
                <div className="w-9 h-9 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0 mt-0.5">
                  <AlertCircle size={20} />
                </div>
                <div className="space-y-1 flex-1">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-bold text-rose-900">自动化三层校验未通过，已拦截进入定价与发布</h4>
                    <span className="px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-800 text-[11px] font-mono font-bold border border-rose-200">
                      发现 {currentIssues.length} 个阻塞项
                    </span>
                  </div>
                  <p className="text-xs text-rose-700 leading-relaxed">
                    为保障平台智能体“格式对了且真实能跑起来”，请根据下方失败原因、复现输入与修复补丁完成修正后重新校验。
                  </p>
                </div>
              </div>

              {/* Fix Issues List */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <AlertTriangle size={15} className="text-amber-600" />
                    <span>具体失败项定位与可复制修改建议</span>
                  </span>
                  <span className="text-[11px] text-slate-500">点击展开代码补丁与运行日志</span>
                </div>

                {currentIssues.map((issue) => {
                  const isExpanded = expandedIssueId === issue.id;

                  return (
                    <div
                      key={issue.id}
                      className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-2xs transition-all"
                    >
                      <div
                        onClick={() => setExpandedIssueId(isExpanded ? null : issue.id)}
                        className="p-4 flex items-center justify-between cursor-pointer hover:bg-slate-50/80 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-2.5 h-2.5 rounded-full bg-rose-500 shrink-0" />
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-xs text-slate-900">{issue.title}</span>
                              <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[10px] font-mono font-semibold">
                                {issue.stageName}
                              </span>
                              <span className="px-2 py-0.5 rounded-md bg-rose-50 text-rose-700 text-[10px] font-mono border border-rose-200 font-semibold">
                                {issue.location}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-500 mt-1">{issue.errorDetail}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="text-xs text-blue-600 font-bold hidden sm:inline">
                            {isExpanded ? '收起详情' : '查看修复补丁'}
                          </span>
                          <ChevronDown
                            size={16}
                            className={`text-slate-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                          />
                        </div>
                      </div>

                      {/* Expanded Section: Fix Code, Terminal Log & Minimal Repro */}
                      {isExpanded && (
                        <div className="p-4.5 border-t border-slate-100 bg-slate-50/80 space-y-4 text-xs animate-in slide-in-from-top-2 duration-150">
                          {/* Fix Guide */}
                          <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl space-y-1">
                            <div className="font-bold text-blue-900 flex items-center gap-1.5">
                              <Info size={14} className="text-blue-600" />
                              <span>修改指导</span>
                            </div>
                            <p className="text-[11px] text-blue-800 leading-relaxed">{issue.fixGuide}</p>
                          </div>

                          {/* Code Patch Snippet */}
                          <div className="space-y-1.5">
                            <div className="flex items-center justify-between text-[11px]">
                              <span className="font-bold text-slate-800 flex items-center gap-1.5 font-mono">
                                <FileCode size={14} className="text-emerald-600" />
                                <span>推荐修改代码补丁 ({issue.location})</span>
                              </span>
                              <button
                                type="button"
                                onClick={() => handleCopySnippet(issue.id, issue.codeSnippet)}
                                className="px-3 py-1 rounded-lg bg-white hover:bg-slate-100 text-slate-700 font-mono text-[11px] font-semibold flex items-center gap-1 cursor-pointer transition-colors border border-slate-200 shadow-2xs"
                              >
                                {copiedSnippetId === issue.id ? (
                                  <>
                                    <Check size={12} className="text-emerald-600" />
                                    <span className="text-emerald-700">已复制补丁</span>
                                  </>
                                ) : (
                                  <>
                                    <Copy size={12} />
                                    <span>一键复制补丁</span>
                                  </>
                                )}
                              </button>
                            </div>
                            <pre className="p-3.5 bg-slate-900 rounded-xl border border-slate-800 text-[11px] font-mono text-emerald-400 overflow-x-auto leading-relaxed shadow-inner">
                              {issue.codeSnippet}
                            </pre>
                          </div>

                          {/* 2-Column: Minimal Repro Input & Runtime Log */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                            {/* Minimal Repro Input */}
                            <div className="space-y-1.5">
                              <div className="text-[11px] font-bold text-slate-700 flex items-center gap-1">
                                <Boxes size={13} className="text-amber-600" />
                                <span>最小复现输入 (Minimal Repro Input)</span>
                              </div>
                              <pre className="p-3 bg-white rounded-xl border border-slate-200 text-[10px] font-mono text-amber-900 overflow-x-auto max-h-36 shadow-2xs">
                                {issue.minimalReproInput}
                              </pre>
                            </div>

                            {/* Runtime Error Log */}
                            <div className="space-y-1.5">
                              <div className="text-[11px] font-bold text-slate-700 flex items-center gap-1">
                                <Terminal size={13} className="text-rose-600" />
                                <span>Hermes 运行时报错终端日志</span>
                              </div>
                              <pre className="p-3 bg-slate-900 rounded-xl border border-slate-800 text-[10px] font-mono text-rose-300 overflow-x-auto max-h-36 leading-tight shadow-inner">
                                {issue.runtimeLog}
                              </pre>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Historical Validation Versions Snapshot */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-800 flex items-center gap-1.5">
                    <History size={15} className="text-slate-500" />
                    <span>历史校验快照与版本记录 ({validationHistory.length})</span>
                  </span>
                  <span className="text-[11px] text-slate-500">每次校验结果与状态留存</span>
                </div>

                <div className="space-y-1.5">
                  {validationHistory.map((rec) => (
                    <div
                      key={rec.id}
                      className="p-2.5 rounded-xl bg-white border border-slate-200 flex items-center justify-between text-xs shadow-2xs"
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className={`w-2 h-2 rounded-full ${
                            rec.status === 'passed' ? 'bg-emerald-500' : 'bg-rose-500'
                          }`}
                        />
                        <span className="font-bold text-slate-900 font-mono">{rec.version}</span>
                        <span className="text-slate-500 font-mono text-[11px]">{rec.packageName}</span>
                      </div>
                      <div className="flex items-center gap-3 text-[11px] text-slate-500">
                        <span>
                          通过 {rec.passedChecks}/{rec.totalChecks} 项
                        </span>
                        <span className="font-mono">{rec.timestamp}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Action Bar */}
              <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setCurrentStep('upload')}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <ArrowLeft size={14} />
                  <span>重新上传补丁包</span>
                </button>

                <button
                  type="button"
                  onClick={handleApplyFixAndReverify}
                  className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-md shadow-emerald-600/20 flex items-center gap-2 cursor-pointer active:scale-95"
                >
                  <CheckCheck size={14} />
                  <span>一键应用修复补丁并重新校验 (v1.0.1)</span>
                </button>
              </div>
            </div>
          )}

          {/* ======================= STEP 3: AUDIT & LAUNCH (WHITE / LIGHT THEMED) ======================= */}
          {currentStep === 'audit_launch' && (
            <div className="space-y-6">
              {/* Passed Metrics Highlight Banner */}
              <div className="p-4.5 bg-gradient-to-r from-emerald-50/80 via-white to-slate-50 border border-emerald-200 rounded-2xl space-y-3.5 shadow-2xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                      <CheckCircle2 size={20} />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-emerald-950">三层自动化校验与沙箱试运行已全数通过</h4>
                      <p className="text-xs text-slate-500 mt-0.5">
                        基于真实隔离沙箱回放，已精准测算出实际底座消耗与时延指标
                      </p>
                    </div>
                  </div>
                  <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold border border-emerald-200">
                    全项校验通过 · {mode === 'custom_delivery' ? '可提交平台审核' : '可直接发布'}
                  </span>
                </div>

                {/* 4 Real Metric Pillars */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
                  <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-2xs space-y-0.5">
                    <div className="text-[10px] text-slate-500 flex items-center justify-between font-medium">
                      <span>单次预估词元</span>
                      <Zap size={12} className="text-amber-500" />
                    </div>
                    <div className="text-base font-black text-amber-600 font-mono">
                      {unitTokens.toLocaleString()} <span className="text-[10px] text-slate-400 font-normal">Tokens</span>
                    </div>
                  </div>

                  <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-2xs space-y-0.5">
                    <div className="text-[10px] text-slate-500 flex items-center justify-between font-medium">
                      <span>单次推理底座成本</span>
                      <DollarSign size={12} className="text-emerald-600" />
                    </div>
                    <div className="text-base font-black text-emerald-700 font-mono">
                      ￥{unitCostYuan.toFixed(3)} <span className="text-[10px] text-slate-400 font-normal">/ 次</span>
                    </div>
                  </div>

                  <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-2xs space-y-0.5">
                    <div className="text-[10px] text-slate-500 flex items-center justify-between font-medium">
                      <span>P95 响应时延</span>
                      <Clock size={12} className="text-blue-600" />
                    </div>
                    <div className="text-base font-black text-blue-700 font-mono">
                      {currentMetrics?.p95LatencySec || 1.84} <span className="text-[10px] text-slate-400 font-normal">秒</span>
                    </div>
                  </div>

                  <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-2xs space-y-0.5">
                    <div className="text-[10px] text-slate-500 flex items-center justify-between font-medium">
                      <span>标准测试集通过率</span>
                      <ShieldCheck size={12} className="text-purple-600" />
                    </div>
                    <div className="text-base font-black text-purple-700 font-mono">
                      100% <span className="text-[10px] text-slate-400 font-normal">({currentMetrics?.testedSamplesCount || 10}/10)</span>
                    </div>
                  </div>
                </div>

                {/* Hermes Engine & Compatibility Info */}
                <div className="p-2.5 bg-slate-100/80 rounded-xl border border-slate-200 flex items-center justify-between text-[11px] text-slate-600">
                  <span className="flex items-center gap-1.5 font-mono font-medium">
                    <Cpu size={13} className="text-indigo-600" />
                    <span>执行引擎: {currentMetrics?.hermesVersionTested || 'Hermes-Core v2.4.1 (Stable)'}</span>
                  </span>
                  <span className="text-slate-500 font-mono">
                    兼容环境: {currentMetrics?.compatibilityRange || 'Python 3.10+, Node 20+, ToolUse-v3'}
                  </span>
                </div>
              </div>

              {mode === 'custom_delivery' ? (
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                <span className="font-bold text-xs text-slate-800 flex items-center gap-1.5">
                  <ShieldCheck size={15} className="text-blue-600" />
                  提交平台审核
                </span>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Skill 包已通过结构检查、Hermes 兼容与沙箱试运行。确认后将进入「平台审核中」，运营通过后才会推送给客户验收。
                </p>
              </div>
              ) : (
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-slate-800 flex items-center gap-1.5">
                    <Sparkles size={15} className="text-blue-600" />
                    <span>上架定价与收益政策</span>
                  </span>
                  <span className="px-2.5 py-0.5 rounded-md bg-emerald-100 text-emerald-800 font-bold text-[11px]">
                    {pricingModel === 'free' ? '全网免费开放' : '商业收费 · 可随时改价'}
                  </span>
                </div>

                <AgentPricingFields
                  pricingModel={pricingModel}
                  price={price}
                  onPricingModelChange={setPricingModel}
                  onPriceChange={setPrice}
                  tokenRebateRate={tokenRebateRate}
                />

                <p className="text-[11px] text-slate-500 leading-relaxed">
                  用户调用消耗底座算力时，您享有全自动 <strong>{tokenRebateRate}% 词元分成返点</strong>。{' '}
                  {AGENT_PRICE_CHANGE_NOTICE}
                </p>

                {/* Enterprise FDE Customization Toggle */}
                <div className="p-3.5 bg-indigo-50/70 rounded-xl border border-indigo-200 flex items-center justify-between">
                  <div className="space-y-0.5">
                    <div className="font-bold text-xs text-indigo-950 flex items-center gap-1.5">
                      <ShieldCheck size={15} className="text-indigo-600" />
                      <span>开启企业级 FDE 深度二次开发商机承接</span>
                    </div>
                    <div className="text-[11px] text-slate-600">
                      允许企业用户直接向您发起定制咨询，平台 100% 资金托管，服务订单您享 85%~90% 高额收益。
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={enableEnterpriseCustomization}
                      onChange={(e) => setEnableEnterpriseCustomization(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
                  </label>
                </div>
              </div>
              )}

              {mode === 'create' && (
                <label className="flex items-start gap-2.5 p-3.5 rounded-xl border border-amber-200 bg-amber-50/80 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={lifecycleAck}
                    onChange={(e) => setLifecycleAck(e.target.checked)}
                    className="mt-0.5 w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                  />
                  <span className="text-xs text-slate-700 leading-relaxed">
                    {AGENT_LIFECYCLE_NOTICE}
                  </span>
                </label>
              )}

              {/* Action Bar */}
              <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setCurrentStep('upload')}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
                >
                  <ArrowLeft size={14} />
                  <span>返回重新配置 Skill</span>
                </button>

                <button
                  type="button"
                  onClick={handleSubmitAudit}
                  disabled={isSubmittingAudit || (mode === 'create' && !lifecycleAck)}
                  className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-md shadow-blue-600/20 flex items-center gap-2 cursor-pointer active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmittingAudit ? (
                    <>
                      <RotateCw size={14} className="animate-spin" />
                      <span>
                        {mode === 'custom_delivery'
                          ? '正在提交平台审核…'
                          : '正在向平台安全中心提交审核与签名...'}
                      </span>
                    </>
                  ) : (
                    <>
                      <Send size={14} />
                      <span>
                        {mode === 'custom_delivery' ? '确认提交平台审核' : '提交发布审核并正式上架'}
                      </span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {showSkillDocModal && (
        <div
          className="fixed inset-0 z-[60] bg-slate-950/50 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setShowSkillDocModal(false)}
        >
          <div
            className="w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
              <div className="flex items-center gap-2">
                <FileText size={16} className="text-blue-600" />
                <h3 className="text-sm font-bold text-slate-900">标准版 Skill 开发文档</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowSkillDocModal(false)}
                className="w-7 h-7 rounded-full bg-slate-200/80 hover:bg-slate-300 text-slate-600 flex items-center justify-center text-xs font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-5 space-y-4 max-h-[60vh] overflow-y-auto">
              <p className="text-xs text-slate-600 leading-relaxed">
                上传前请先阅读标准版 Skill 规范。文档说明了包结构、
                <code className="px-1 py-0.5 rounded bg-slate-100 text-[11px] font-mono">SKILL.md</code>
                必填章节、输入输出契约，以及沙箱试运行的基本要求。
              </p>

              <div className="space-y-2.5">
                {[
                  {
                    title: '目录与入口',
                    desc: '需包含 SKILL.md、manifest、entrypoint，以及可选的 inputs/outputs 样例。'
                  },
                  {
                    title: '契约与验收',
                    desc: '明确输入字段、输出结果、失败码与依赖权限，便于平台自动校验。'
                  },
                  {
                    title: '沙箱可运行',
                    desc: '包内逻辑应可无交互执行；样例输入需能在隔离环境稳定跑通。'
                  }
                ].map((item) => (
                  <div
                    key={item.title}
                    className="p-3 rounded-2xl bg-slate-50 border border-slate-100 space-y-1"
                  >
                    <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <CheckCircle2 size={13} className="text-emerald-600" />
                      {item.title}
                    </div>
                    <p className="text-[11px] text-slate-500 leading-relaxed pl-5">{item.desc}</p>
                  </div>
                ))}
              </div>

              <div className="p-3 rounded-2xl bg-blue-50 border border-blue-100 text-[11px] text-blue-800 leading-relaxed">
                建议先下载完整文档本地查阅，再按模板打包上传；已上架智能体需先下架后再替换 Skill 包。
              </div>
            </div>

            <div className="px-5 py-4 border-t border-slate-100 flex items-center justify-end gap-2 bg-white">
              <button
                type="button"
                onClick={() => setShowSkillDocModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold cursor-pointer"
              >
                关闭
              </button>
              <button
                type="button"
                onClick={handleDownloadStandardSkillDoc}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold cursor-pointer flex items-center gap-1.5 shadow-sm"
              >
                <Download size={13} />
                <span>下载文档</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {adapterModalOpen && (
        <div
          className="fixed inset-0 z-[70] bg-slate-950/50 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => !adapterSaving && setAdapterModalOpen(false)}
        >
          <div
            className="w-full max-w-md bg-white rounded-2xl border border-slate-200 shadow-2xl p-5 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div>
              <h3 className="text-sm font-black text-slate-900">添加适配版本</h3>
              <p className="text-xs text-slate-500 mt-1">
                填写外部工具名称并上传对应 ZIP。以后新增平台无需改前端。
              </p>
            </div>
            <label className="block space-y-1">
              <span className="text-[11px] font-bold text-slate-700">适配平台名称</span>
              <input
                type="text"
                value={adapterPlatformName}
                onChange={(e) => setAdapterPlatformName(e.target.value)}
                placeholder="如 WorkBuddy、Codex"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                autoFocus
              />
            </label>
            <div className="space-y-1">
              <span className="text-[11px] font-bold text-slate-700">ZIP 安装包</span>
              <input
                ref={adapterZipInputRef}
                type="file"
                accept=".zip,.tar.gz,.tgz"
                className="hidden"
                onChange={(e) => setAdapterZipFile(e.target.files?.[0] || null)}
              />
              <button
                type="button"
                onClick={() => adapterZipInputRef.current?.click()}
                className="w-full rounded-xl border border-dashed border-slate-300 bg-slate-50 px-3 py-4 text-center cursor-pointer hover:border-blue-400"
              >
                {adapterZipFile ? (
                  <span className="text-xs font-bold text-slate-800">{adapterZipFile.name}</span>
                ) : (
                  <span className="text-xs text-slate-500">点击选择 .zip / .tar.gz</span>
                )}
              </button>
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                disabled={adapterSaving}
                onClick={() => setAdapterModalOpen(false)}
                className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-bold cursor-pointer"
              >
                取消
              </button>
              <button
                type="button"
                disabled={adapterSaving}
                onClick={() => void handleAddAdapterPackage()}
                className="px-3 py-1.5 rounded-xl bg-slate-900 text-white text-xs font-bold cursor-pointer disabled:opacity-60"
              >
                {adapterSaving ? '上传中…' : '确认添加'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
