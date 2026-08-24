export type RealNameStatus = 'unverified' | 'verifying' | 'verified' | 'failed' | 'expired';

export interface StartRealNameInput {
  userId: string;
  realName: string;
  idCardNumber: string;
}

export interface RealNameResult {
  status: RealNameStatus;
  providerRef: string;
  realNameMasked: string;
  idCardMasked: string;
  failReason?: string;
}

function maskName(name: string) {
  if (!name) return '';
  if (name.length <= 1) return '*';
  return name[0] + '*'.repeat(Math.max(1, name.length - 1));
}

function maskIdCard(id: string) {
  if (id.length < 8) return '********';
  return `${id.slice(0, 6)}********${id.slice(-4)}`;
}

/** 开发环境模拟适配器：结果由后端生成，前端不能自行声明 verified */
export const mockRealNameAdapter = {
  async start(input: StartRealNameInput): Promise<RealNameResult> {
    const valid =
      Boolean(input.realName.trim()) &&
      /^\d{17}[\dXx]$/.test(input.idCardNumber.replace(/\s/g, ''));

    if (!valid) {
      return {
        status: 'failed',
        providerRef: `mock_fail_${Date.now()}`,
        realNameMasked: maskName(input.realName),
        idCardMasked: maskIdCard(input.idCardNumber),
        failReason: '姓名或身份证号格式不正确'
      };
    }

    return {
      status: 'verified',
      providerRef: `mock_ok_${Date.now()}`,
      realNameMasked: maskName(input.realName),
      idCardMasked: maskIdCard(input.idCardNumber)
    };
  }
};
