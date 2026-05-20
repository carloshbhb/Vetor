import ReviewForm from '@/components/admin/ReviewForm';

export default function NovoReviewPage() {
  return (
    <div className="p-8 flex-1 max-w-4xl">
      <div className="mb-8">
        <h1 className="font-bebas text-5xl tracking-wide text-text mb-1">Novo Review</h1>
        <p className="text-text-muted text-sm">
          Preencha manualmente ou use a IA para gerar o conteúdo automaticamente.
        </p>
      </div>
      <ReviewForm />
    </div>
  );
}
