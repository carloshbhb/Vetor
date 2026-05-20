interface LogoProps {
  inverse?: boolean;
}

export default function Logo({ inverse }: LogoProps) {
  return (
    <div className="flex items-center gap-2.5 group cursor-pointer">
      <svg width="28" height="28" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <rect width="36" height="36" rx="9" fill={inverse ? "#fff" : "#1428A0"} />
        <polygon points="8,10 14.5,10 18,22 21.5,10 28,10 19.5,27 16.5,27" fill={inverse ? "#1428A0" : "#4285F4"} />
      </svg>
      <div className="font-syne font-extrabold text-lg tracking-tight flex items-baseline">
        <span className={`transition-colors ${inverse ? 'text-white group-hover:text-blue-200' : 'text-[#1428A0] group-hover:text-[#2563eb]'}`}>vetor</span>
        <span className={inverse ? 'text-blue-300' : 'text-[#2563eb]'}>.blog</span>
      </div>
    </div>
  );
}
