type AnnouncementBarProps = {
  pill?: string;
  text?: string;
};

export default function AnnouncementBar({ pill = "Novo Review", text = "Confira nossa análise completa" }: AnnouncementBarProps) {
  return (
    <div className="bg-surface2 border-b flex items-center justify-center gap-2.5 py-[9px] px-6 font-heading text-[0.75rem] font-semibold tracking-[0.06em] text-muted" style={{ borderColor: "rgba(245,158,11,0.15)" }}>
      <span
        className="w-1.5 h-1.5 rounded-full shrink-0"
        style={{
          background: "var(--green)",
          boxShadow: "0 0 6px var(--green)",
          animation: "pulse-dot 2s ease-in-out infinite",
        }}
      />
      <span
        className="rounded-full px-2.5 py-0.5 text-[0.68rem] tracking-[0.1em] uppercase"
        style={{ background: "rgba(245,158,11,0.12)", color: "var(--amber)", border: "1px solid rgba(245,158,11,0.25)" }}
      >
        {pill}
      </span>
      <span>{text}</span>
    </div>
  );
}