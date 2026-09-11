import Link from 'next/link';
import Image from 'next/image';

interface ReviewCardProps {
  slug: string;
  product: string;
  metaTitle: string;
  lead: string;
  category: string;
  imageUrl?: string;
  priceNew?: string;
  overallScore: number;
}

export default function ReviewCard({ slug, product, metaTitle, lead, category, imageUrl, priceNew, overallScore }: ReviewCardProps) {
  return (
    <Link href={`/review/${slug}`} className="group bg-white rounded-2xl border border-border overflow-hidden shadow-sm hover:shadow-lg transition-all hover:-translate-y-1 flex flex-col">
      <div className="aspect-[4/3] bg-bg2 relative border-b border-border p-6 flex items-center justify-center">
        <span className="absolute top-3 right-3 bg-white px-2.5 py-1 rounded-lg text-xs font-syne font-bold text-blue shadow-sm">
          ★ {overallScore.toFixed(1)}
        </span>
        {imageUrl && (
          <Image src={imageUrl} alt={product} fill className="object-contain p-6" />
        )}
      </div>
      <div className="p-5 flex flex-col flex-1">
        <p className="text-xs font-bold text-text-muted uppercase tracking-widest mb-2">{category}</p>
        <h2 className="font-syne font-bold text-lg text-text leading-tight mb-2 group-hover:text-blue transition-colors">
          {metaTitle}
        </h2>
        <p className="text-sm text-text-2 line-clamp-2 mb-4 flex-1">
          {lead}
        </p>
        <div className="flex items-center justify-between border-t border-border pt-4">
          <span className="text-sm font-medium text-text-muted">Ler Review</span>
          <span className="font-bebas text-xl text-text tracking-wide">{priceNew}</span>
        </div>
      </div>
    </Link>
  );
}
