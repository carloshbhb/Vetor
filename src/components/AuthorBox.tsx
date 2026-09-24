import Link from 'next/link';

interface AuthorBoxProps {
  name: string;
  bio: string;
  slug?: string;
  role?: string;
  date?: string;
  readTime?: string;
}

export default function AuthorBox({
  name,
  bio,
  slug,
  role,
  date,
  readTime,
}: AuthorBoxProps) {
  let formattedDate: string | null = null;
  if (date) {
    const d = new Date(date);
    if (!Number.isNaN(d.getTime())) {
      formattedDate = d.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
      });
    }
  }

  return (
    <div
      style={{
        background: 'var(--surface)',
        border: '1.5px solid var(--border)',
        borderRadius: '16px',
        padding: '24px',
        display: 'flex',
        gap: '20px',
        alignItems: 'flex-start',
      }}
    >
      <div
        style={{
          width: '64px',
          height: '64px',
          borderRadius: '50%',
          background: 'var(--surface2)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '28px',
          color: 'var(--blue)',
          flexShrink: 0,
        }}
      >
        {name.charAt(0).toUpperCase()}
      </div>
      <div>
        {slug ? (
          <Link
            href={`/author/${slug}`}
            style={{
              fontWeight: 'bold',
              color: 'var(--ink)',
              textDecoration: 'none',
              display: 'inline-block',
              marginBottom: '4px',
            }}
          >
            {name}
          </Link>
        ) : (
          <p style={{ fontWeight: 'bold', marginBottom: '4px' }}>{name}</p>
        )}
        {role && (
          <p
            style={{
              color: 'var(--blue)',
              fontSize: '12px',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
              marginBottom: '6px',
            }}
          >
            {role}
          </p>
        )}
        <p style={{ color: 'var(--muted)', fontSize: '14px', marginBottom: '8px' }}>
          {bio}
        </p>
        <div style={{ display: 'flex', gap: '16px', fontSize: '13px', color: 'var(--muted)' }}>
          {formattedDate && <span>{formattedDate}</span>}
          {readTime && <span>{readTime}</span>}
        </div>
      </div>
    </div>
  );
}
