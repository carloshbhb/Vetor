import Link from "next/link";

type BreadcrumbItem = {
  label: string;
  href?: string;
};

type BreadcrumbsProps = {
  items: BreadcrumbItem[];
};

export default function Breadcrumbs({ items }: BreadcrumbsProps) {
  return (
    <nav className="max-w-[1200px] mx-auto px-6 md:px-12 pt-4 pb-0 flex items-center gap-2 text-[0.75rem] text-muted font-heading font-semibold" style={{ letterSpacing: "0.03em" }}>
      {items.map((item, i) => (
        <span key={i} className="flex items-center gap-2">
          {i > 0 && <span style={{ color: "rgba(255,255,255,0.2)" }}>›</span>}
          {item.href ? (
            <Link href={item.href} className="text-muted hover:text-amber transition-colors">
              {item.label}
            </Link>
          ) : (
            <span>{item.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}