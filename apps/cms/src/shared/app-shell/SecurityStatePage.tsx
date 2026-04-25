interface SecurityStatePageProps {
  title: string;
  description: string;
  actionHref: string;
  actionLabel: string;
}

export default function SecurityStatePage({ title, description, actionHref, actionLabel }: SecurityStatePageProps) {
  return (
    <div className="min-h-screen bg-[#f5f9fa] flex items-center justify-center px-6">
      <div className="max-w-xl w-full bg-white rounded-[20px] shadow-sm border border-[#eef3f5] p-8 text-center">
        <h1 className="font-['Medula_One:Regular',sans-serif] text-[32px] tracking-[2px] uppercase text-[#273a41] mb-4">
          {title}
        </h1>
        <p className="font-['Abhaya_Libre:Regular',sans-serif] text-[16px] text-[#38484e] mb-6">
          {description}
        </p>
        <a
          href={actionHref}
          className="inline-flex items-center justify-center bg-[#00b3e8] text-white px-6 py-3 rounded-[12px] font-['Abhaya_Libre:Bold',sans-serif]"
        >
          {actionLabel}
        </a>
      </div>
    </div>
  );
}
