import Link from "next/link";

export default function Footer() {
  return (
    <footer className="bg-[#050709] border-t border-border pt-12 pb-8 px-6 md:px-12">
      <div className="max-w-[1200px] mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 mb-10">
          <div>
            <Link href="/" className="font-display text-1.5rem tracking-wider text-text block mb-2.5">
              vetor.blog
            </Link>
            <p className="text-[0.8rem] text-muted leading-[1.7] font-light">
              Reviews honestos, testados de verdade — sem patrocínio escondido.
            </p>
          </div>
          <div>
            <div className="font-heading text-[0.7rem] font-bold tracking-wider uppercase text-muted mb-3.5">
              Categorias
            </div>
            <ul className="flex flex-col gap-2">
              <li><Link href="/reviews?category=celulares" className="text-[0.82rem] text-muted font-light hover:text-amber transition-colors">Celulares</Link></li>
              <li><Link href="/reviews?category=notebooks" className="text-[0.82rem] text-muted font-light hover:text-amber transition-colors">Notebooks</Link></li>
              <li><Link href="/reviews?category=audio" className="text-[0.82rem] text-muted font-light hover:text-amber transition-colors">Áudio</Link></li>
              <li><Link href="/reviews?category=wearables" className="text-[0.82rem] text-muted font-light hover:text-amber transition-colors">Wearables</Link></li>
              <li><Link href="/comparativos" className="text-[0.82rem] text-muted font-light hover:text-amber transition-colors">Comparativos</Link></li>
            </ul>
          </div>
          <div>
            <div className="font-heading text-[0.7rem] font-bold tracking-wider uppercase text-muted mb-3.5">
              Sobre
            </div>
            <ul className="flex flex-col gap-2">
              <li><Link href="#" className="text-[0.82rem] text-muted font-light hover:text-amber transition-colors">Sobre nós</Link></li>
              <li><Link href="#" className="text-[0.82rem] text-muted font-light hover:text-amber transition-colors">Metodologia</Link></li>
              <li><Link href="#" className="text-[0.82rem] text-muted font-light hover:text-amber transition-colors">Política de Afiliados</Link></li>
              <li><Link href="#" className="text-[0.82rem] text-muted font-light hover:text-amber transition-colors">Privacidade</Link></li>
            </ul>
          </div>
        </div>
        <div className="max-w-[1200px] mx-auto pt-6 border-t border-border flex flex-wrap items-center justify-between gap-3 text-[0.72rem] text-muted font-light">
          <span>© 2026 vetor.blog. Todos os direitos reservados.</span>
          <span>Alguns links são de afiliados — sem custo extra para você.</span>
        </div>
      </div>
    </footer>
  );
}