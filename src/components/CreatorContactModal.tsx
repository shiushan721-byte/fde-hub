import React from 'react';
import { X } from 'lucide-react';
import { qrCodeImageUrl } from '../lib/agentShare';
import { creatorContactPhone, creatorContactQrValue } from '../../shared/creatorContact';

export const CreatorContactModal: React.FC<{
  expert: {
    id?: string;
    name?: string;
    socialLinks?: { phone?: string; wechat?: string };
  };
  onClose: () => void;
}> = ({ expert, onClose }) => {
  const phone = creatorContactPhone(expert);
  const qrUrl = qrCodeImageUrl(creatorContactQrValue(expert), 280);

  return (
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center p-5 bg-slate-900/45"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-[340px] rounded-[28px] bg-white px-8 pt-8 pb-7 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label="联系方式"
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute top-5 right-5 w-8 h-8 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-50 cursor-pointer inline-flex items-center justify-center"
          aria-label="关闭"
        >
          <X size={18} />
        </button>
        <h2 className="text-center text-[18px] font-bold text-slate-900">联系方式</h2>
        <div className="mt-6 flex justify-center">
          <div className="relative w-[220px] h-[220px]">
            <img src={qrUrl} alt="创作者联系二维码" className="w-full h-full object-contain" />
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-12 h-12 rounded-md bg-black text-white flex flex-col items-center justify-center shadow-sm">
                <span className="text-[15px] font-black leading-none tracking-tight">H</span>
                <span className="text-[6px] font-semibold tracking-wide mt-0.5">Hellome</span>
              </div>
            </div>
          </div>
        </div>
        <p className="mt-5 text-center text-[13px] text-slate-400">手机号：{phone}</p>
      </div>
    </div>
  );
};
