export default function ReviewCardSkeleton() {
  return (
    <div className="bg-white rounded-2xl border border-border overflow-hidden shadow-sm animate-pulse">
      <div className="aspect-[4/3] bg-bg2" />
      <div className="p-5">
        <div className="h-3 bg-bg2 rounded w-20 mb-3" />
        <div className="h-5 bg-bg2 rounded w-3/4 mb-2" />
        <div className="h-4 bg-bg2 rounded w-full mb-1" />
        <div className="h-4 bg-bg2 rounded w-2/3 mb-4" />
        <div className="flex items-center justify-between border-t border-border pt-4">
          <div className="h-4 bg-bg2 rounded w-20" />
          <div className="h-5 bg-bg2 rounded w-16" />
        </div>
      </div>
    </div>
  );
}
