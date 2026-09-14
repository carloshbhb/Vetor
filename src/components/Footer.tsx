import Link from "next/link";

export default function Footer() {
  return (
    <footer className="bg-ink text-white/50 py-10 px-8 text-center">
      <div className="max-w-[760px] mx-auto">
        <span className="font-display text-[1.4rem] text-white tracking-[0.08em] mb-3 block">
          vetor.blog
        </span>
        <p className="text-[0.75rem] leading-[1.8] font-light mb-2">
          Esta página contém links de afiliados. Caso você compre através deles, recebemos uma pequena comissão sem custo adicional para você. Isso nos ajuda a manter o site e continuar publicando reviews independentes.
        </p>
        <p className="text-[0.75rem] leading-[1.8] font-light mb-2">
          Os preços exibidos são indicativos e podem variar. Sempre confirme o valor final antes de concluir a compra.
        </p>
        <p className="text-[0.75rem] leading-[1.8] font-light mt-4">
          <Link href="#" className="text-white/40 hover:text-white/70 transition-colors">Política de privacidade</Link>
          {" · "}
          <Link href="#" className="text-white/40 hover:text-white/70 transition-colors">Sobre o vetor.blog</Link>
          {" · "}
          <Link href="#" className="text-white/40 hover:text-white/70 transition-colors">Metodologia de review</Link>
          {" · "}
          <Link href="#" className="text-white/40 hover:text-white/70 transition-colors">Contato</Link>
        </p>
        <p className="text-[0.75rem] leading-[1.8] font-light mt-3">© 2026 vetor.blog. Todos os direitos reservados.</p>
      </div>
    </footer>
  );
}
