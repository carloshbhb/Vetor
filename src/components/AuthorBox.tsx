interface AuthorBoxProps {
  name: string;
  bio: string;
  date: string;
  readTime?: string;
}

export default function AuthorBox({
  name,
  bio,
  date,
  readTime,
}: AuthorBoxProps) {
  const formattedDate = new Date(date).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });

  return (
    <div
      style={{
        background: 'var(--surface)',
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
        <p style={{ fontWeight: 'bold', marginBottom: '4px' }}>{name}</p>
        <p style={{ color: 'var(--muted)', fontSize: '14px', marginBottom: '8px' }}>
          {bio}
        </p>
        <div style={{ display: 'flex', gap: '16px', fontSize: '13px', color: 'var(--muted)' }}>
          <span>{formattedDate}</span>
          {readTime && <span>{readTime}</span>}
        </div>
      </div>
    </div>
  );
}
