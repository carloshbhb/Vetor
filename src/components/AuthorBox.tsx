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
    <div className="author">
      <div
        aria-hidden="true"
        style={{
          width: '64px',
          height: '64px',
          borderRadius: '50%',
          flex: 'none',
          background: '#dfe5eb',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '28px',
          fontWeight: 800,
          color: '#556170',
        }}
      >
        {name.charAt(0).toUpperCase()}
      </div>
      <div>
        <strong>
          {slug ? <Link href={`/author/${slug}`}>{name}</Link> : name}
        </strong>
        <p>
          {role ? `${role}. ` : ''}
          {bio} <Link href="/como-avaliamos/">Como avaliamos</Link> ·{' '}
          <Link href="/afiliados/">Política de afiliados</Link>
        </p>
        {(formattedDate || readTime) && (
          <p>
            {[formattedDate, readTime].filter(Boolean).join(' · ')}
          </p>
        )}
      </div>
    </div>
  );
}
