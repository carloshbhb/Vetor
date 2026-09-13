interface BreadcrumbItem {
  label: string;
  href: string;
}

export default function Breadcrumbs({ items }: { items: BreadcrumbItem[] }) {
  const allItems = [{ label: 'Home', href: '/' }, ...items];

  return (
    <nav aria-label="Breadcrumb" style={{ padding: '16px 0' }}>
      <ol
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          listStyle: 'none',
          gap: '8px',
          alignItems: 'center',
        }}
      >
        {allItems.map((item, index) => {
          const isLast = index === allItems.length - 1;
          return (
            <li
              key={item.href}
              style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
            >
              {!isLast ? (
                <>
                  <a
                    href={item.href}
                    style={{ color: 'var(--blue)', fontSize: '14px' }}
                  >
                    {item.label}
                  </a>
                  <span style={{ color: 'var(--muted)', fontSize: '14px' }}>
                    /
                  </span>
                </>
              ) : (
                <span
                  style={{ color: 'var(--muted)', fontSize: '14px' }}
                  aria-current="page"
                >
                  {item.label}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
