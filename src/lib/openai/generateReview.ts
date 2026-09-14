import OpenAI from "openai";
import { z } from "zod";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const ReviewOutputSchema = z.object({
  verdict: z.string().max(180),
  score: z.number().min(0).max(10),
  body_markdown: z.string(),
  video_script: z.string(),
});

export type GeneratedReview = z.infer<typeof ReviewOutputSchema>;

type GenerateReviewInput = {
  productName: string;
  category: string;
  specs: Record<string, string | number>;
  sourceNotes: string;
};

export async function generateReview(
  input: GenerateReviewInput
): Promise<GeneratedReview> {
  const response = await openai.chat.completions.create({
    model: "gpt-4.1",
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content:
          "Você escreve reviews de produto objetivos e verificáveis, em " +
          "português do Brasil. Nunca invente números que não estejam nas " +
          "notas de origem. Responda apenas com JSON no formato: " +
          "{ verdict, score, body_markdown, video_script }.",
      },
      {
        role: "user",
        content: `Produto: ${input.productName} (${input.category})
Especificações: ${JSON.stringify(input.specs)}
Notas de origem: ${input.sourceNotes}`,
      },
    ],
  });

  const raw = response.choices[0]?.message?.content;
  if (!raw) throw new Error("OpenAI não retornou conteúdo.");

  const parsed = ReviewOutputSchema.safeParse(JSON.parse(raw));
  if (!parsed.success) {
    throw new Error(`Saída fora do schema esperado: ${parsed.error.message}`);
  }
  return parsed.data;
}