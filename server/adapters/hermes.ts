export type HermesCheckResult = {
  passed: boolean;
  report: {
    structureOk: boolean;
    hermesCompatOk: boolean;
    sandboxOk: boolean;
    score: number;
    issues: string[];
    checkedAt: string;
  };
};

/** 开发环境模拟 Hermes / 沙箱校验；结果由后端生成 */
export async function runHermesValidation(input: {
  skillPayload: unknown;
  title: string;
}): Promise<HermesCheckResult> {
  const payload = (input.skillPayload || {}) as Record<string, unknown>;
  const issues: string[] = [];

  const hasSkill =
    Boolean(payload.skillFileName) ||
    Boolean(payload.skillContent) ||
    Boolean(payload.promptOverrides) ||
    Object.keys(payload).length > 0;

  if (!hasSkill) {
    issues.push('缺少 Skill / 提示词改动内容');
  }
  if (!input.title.trim()) {
    issues.push('专属实例标题为空');
  }

  // 故意失败标记，便于联调驳回路径
  if (payload.forceFail === true) {
    issues.push('模拟校验失败（forceFail）');
  }

  const structureOk = issues.length === 0;
  const hermesCompatOk = structureOk;
  const sandboxOk = structureOk;
  const passed = structureOk && hermesCompatOk && sandboxOk;

  return {
    passed,
    report: {
      structureOk,
      hermesCompatOk,
      sandboxOk,
      score: passed ? 98 : Math.max(40, 90 - issues.length * 15),
      issues,
      checkedAt: new Date().toISOString()
    }
  };
}
