import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { AlertCircle, AlertTriangle, CheckCircle2, Inbox, Loader2 } from 'lucide-react';

interface AdminPageHeaderProps {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}

const ADMIN_CARD_SURFACE = 'bg-white border border-[#e4edf1] rounded-[16px] shadow-[0_8px_24px_rgba(20,51,63,0.05)]';
const ADMIN_TEXT_TITLE = 'text-[#223740]';
const ADMIN_TEXT_BODY = 'text-[#5f727a]';
const ADMIN_TEXT_META = 'text-[#839198]';
const ADMIN_FIELD_SURFACE = 'rounded-[12px] border border-[#d8e4e8] bg-white px-3 py-2 text-[14px] text-[#273a41] shadow-[0_1px_2px_rgba(20,51,63,0.04)] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00b3e8]/30 focus-visible:border-[#00b3e8]';

export const ADMIN_INPUT_CLASS = ADMIN_FIELD_SURFACE;
export const ADMIN_TEXTAREA_CLASS = `${ADMIN_FIELD_SURFACE} min-h-[88px]`;
export const ADMIN_FIELD_LABEL_CLASS = "font-['Abhaya_Libre:Bold',sans-serif] text-[13px] text-[#344850]";
export const ADMIN_HELPER_TEXT_CLASS = "font-['Abhaya_Libre:Regular',sans-serif] text-[12px] text-[#74868d]";
export const ADMIN_SECTION_SUBCARD = 'rounded-[14px] border border-[#e7eff3] bg-[#fbfdfe] p-4 md:p-5';

export function AdminPageHeader({ title, subtitle, actions }: AdminPageHeaderProps) {
  return (
    <div className="flex flex-col gap-4 border-b border-[#e9f0f3] pb-5 md:flex-row md:items-end md:justify-between">
      <div className="space-y-1">
        <h2 className={`font-['ABeeZee:Regular',sans-serif] text-[29px] leading-tight ${ADMIN_TEXT_TITLE}`}>{title}</h2>
        {subtitle ? <p className={`max-w-3xl font-['Abhaya_Libre:Regular',sans-serif] text-[15px] leading-relaxed ${ADMIN_TEXT_BODY}`}>{subtitle}</p> : null}
      </div>
      {actions ? <div className="flex items-center gap-3">{actions}</div> : null}
    </div>
  );
}

export function AdminActionBar({ children }: { children: ReactNode }) {
  return <div className={`${ADMIN_CARD_SURFACE} flex flex-wrap items-center gap-3 p-4 md:p-5`}>{children}</div>;
}

type AdminButtonIntent = 'primary' | 'secondary' | 'danger' | 'workflow';
type AdminButtonSize = 'sm' | 'md';

interface AdminButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  intent?: AdminButtonIntent;
  size?: AdminButtonSize;
}

export function AdminButton({ intent = 'secondary', size = 'md', className = '', type = 'button', ...props }: AdminButtonProps) {
  const intentClass =
    intent === 'primary'
      ? 'bg-[#00b3e8] text-white border border-[#00b3e8] hover:bg-[#009dcd] hover:border-[#009dcd]'
      : intent === 'danger'
        ? 'border border-red-200 text-red-700 bg-red-50 hover:bg-red-100'
        : intent === 'workflow'
          ? 'border border-amber-200 text-amber-700 bg-amber-50 hover:bg-amber-100'
          : 'border border-[#d1dfe5] text-[#273a41] bg-white hover:bg-[#f4f8fa]';
  const sizeClass = size === 'sm' ? 'px-3 py-2 text-[13px]' : 'px-4 py-2 text-[14px]';
  const baseClass = `inline-flex items-center justify-center gap-2 rounded-[10px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00b3e8]/40 disabled:opacity-60 disabled:cursor-not-allowed ${intentClass} ${sizeClass}`;

  return <button type={type} className={`${baseClass} ${className}`.trim()} {...props} />;
}

export function AdminActionCluster({ children, danger = false }: { children: ReactNode; danger?: boolean }) {
  return <div className={`flex flex-wrap items-center gap-2 ${danger ? 'border-l border-red-200 pl-3' : ''}`}>{children}</div>;
}

export function AdminStickyFormActions({ children }: { children: ReactNode }) {
  return (
    <div className="sticky bottom-4 z-20 rounded-[14px] border border-[#d6e2e8] bg-white/95 px-4 py-3 shadow-[0_8px_24px_rgba(20,51,63,0.08)] backdrop-blur">
      <div className="flex flex-wrap items-center justify-between gap-3">{children}</div>
    </div>
  );
}

export function AdminPanel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className={`${ADMIN_CARD_SURFACE} space-y-4 p-5 md:p-6`}>
      <h3 className={`font-['Abhaya_Libre:Bold',sans-serif] text-[21px] leading-tight ${ADMIN_TEXT_TITLE}`}>{title}</h3>
      {children}
    </section>
  );
}

export function AdminLoadingState({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 rounded-[14px] border border-[#d8e6ec] bg-[#f7fbfd] p-6 text-[#5f727a]">
      <Loader2 className="animate-spin" size={18} />
      <span className="font-['Abhaya_Libre:Regular',sans-serif] text-[15px]">{label}</span>
    </div>
  );
}

export function AdminEmptyState({ label }: { label: string }) {
  return (
    <div className="rounded-[14px] border border-dashed border-[#d5e1e7] bg-[#f8fcfe] p-8 text-center">
      <Inbox className={`mx-auto mb-3 ${ADMIN_TEXT_META}`} size={24} />
      <p className={`font-['Abhaya_Libre:Regular',sans-serif] text-[15px] ${ADMIN_TEXT_BODY}`}>{label}</p>
    </div>
  );
}

export function AdminErrorState({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2 rounded-[14px] border border-red-200 bg-red-50 px-4 py-3 text-red-800">
      <AlertCircle size={18} />
      <p className="font-['Abhaya_Libre:Regular',sans-serif] text-[14px]">{label}</p>
    </div>
  );
}

export function AdminSuccessFeedback({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2 rounded-[14px] border border-emerald-200 bg-emerald-50 px-4 py-3 text-emerald-800">
      <CheckCircle2 size={18} />
      <p className="font-['Abhaya_Libre:Regular',sans-serif] text-[14px]">{label}</p>
    </div>
  );
}

export function AdminWarningState({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2 rounded-[14px] border border-amber-200 bg-amber-50 px-4 py-3 text-amber-800">
      <AlertTriangle size={18} />
      <p className="font-['Abhaya_Libre:Regular',sans-serif] text-[14px]">{label}</p>
    </div>
  );
}
