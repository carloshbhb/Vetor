type VideoPanelProps = {
  youtubeId: string;
  title: string;
  durationLabel?: string;
};

export function VideoPanel({ youtubeId, title, durationLabel }: VideoPanelProps) {
  return (
    <figure className="border border-line rounded-flat overflow-hidden bg-ink-raised">
      <figcaption className="flex items-center justify-between px-4 py-2 text-xs text-paper/70 border-b border-line/20">
        <span>Registro em vídeo do teste</span>
        {durationLabel && <span className="tabular-nums">{durationLabel}</span>}
      </figcaption>
      <div className="relative aspect-video">
        <iframe
          className="absolute inset-0 w-full h-full"
          src={`https://www.youtube-nocookie.com/embed/${youtubeId}`}
          title={title}
          loading="lazy"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>
    </figure>
  );
}