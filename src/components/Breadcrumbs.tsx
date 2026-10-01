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
    <nav className="breadcrumbs" aria-label="Breadcrumb">
      <ol style={{ display: "flex", flexWrap: "wrap", gap: 6, listStyle: "none", margin: 0, padding: 0 }}>
        {items.map((item, i) => (
          <li key={i} style={{ display: "flex", gap: 6, alignItems: "center" }}>
            {i > 0 && <span aria-hidden="true">›</span>}
            {item.href ? <Link href={item.href}>{item.label}</Link> : <span>{item.label}</span>}
          </li>
        ))}
      </ol>
    </nav>
  );
}
