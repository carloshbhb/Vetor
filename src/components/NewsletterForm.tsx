// Server component. Sem NEXT_PUBLIC_NEWSLETTER_ACTION, a seção não renderiza.
export default function NewsletterForm() {
  const action = process.env.NEXT_PUBLIC_NEWSLETTER_ACTION;
  if (!action) return null;
  return (
    <section className="home-section" id="newsletter">
      <div className="container">
        <div className="news">
          <div>
            <h2>Receba as melhores ofertas e novos reviews</h2>
            <p>Um e-mail por semana, sem spam. Seu público próprio protege o blog de oscilações do Google.</p>
          </div>
          <form action={action} method="post">
            <label htmlFor="newsletter-email" className="sr-only" style={{ position: 'absolute', left: '-999px' }}>
              Seu melhor e-mail
            </label>
            <input
              id="newsletter-email"
              type="email"
              name="email"
              placeholder="Seu melhor e-mail"
              required
              autoComplete="email"
            />
            <button className="cta" type="submit">
              Quero receber
            </button>
            <small>
              Ao se inscrever, você concorda com a <a href="/privacidade/">Política de Privacidade</a>. Cancele
              quando quiser.
            </small>
          </form>
        </div>
      </div>
    </section>
  );
}
