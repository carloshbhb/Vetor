import { NextRequest, NextResponse } from "next/server";
import { verifyAdminAuth } from "@/lib/admin-auth";
import {
  getPinterestConnectionInfo,
  getPinterestQueue,
  hasPinterestAppCredentials,
  listPinterestBoards,
  publishDuePinterestPins,
  queuePublishedReviewPins,
  retryFailedPinterestPins,
  setPinterestBoard,
} from "@/lib/pinterest";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(request: NextRequest) {
  const authError = verifyAdminAuth(request);
  if (authError) return authError;

  try {
    const [connection, queue] = await Promise.all([
      getPinterestConnectionInfo(),
      getPinterestQueue(30),
    ]);
    const counts = queue.reduce((result, item) => {
      const status = typeof item.status === "string" ? item.status : "unknown";
      result[status] = (result[status] || 0) + 1;
      return result;
    }, {} as Record<string, number>);

    return NextResponse.json({
      connection,
      queue,
      counts,
      appConfigured: hasPinterestAppCredentials(),
    }, { headers: { "Cache-Control": "private, no-store, max-age=0" } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Não foi possível carregar a integração Pinterest.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const authError = verifyAdminAuth(request);
  if (authError) return authError;

  let body: { action?: unknown; boardId?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Corpo da requisição inválido." }, { status: 400 });
  }

  const action = typeof body.action === "string" ? body.action : "";
  try {
    if (action === "check") {
      if (!hasPinterestAppCredentials()) {
        return NextResponse.json({ error: "Configure PINTEREST_CLIENT_ID e PINTEREST_CLIENT_SECRET no Vercel." }, { status: 409 });
      }
      const boards = await listPinterestBoards();
      return NextResponse.json({ success: true, boards, message: "A API Pinterest respondeu e a credencial foi validada." });
    }

    if (action === "setBoard") {
      const boardId = typeof body.boardId === "string" ? body.boardId : "";
      if (!boardId) return NextResponse.json({ error: "Escolha um quadro." }, { status: 400 });
      const boards = await listPinterestBoards();
      const selected = boards.find((board) => board.id === boardId);
      if (!selected) return NextResponse.json({ error: "O quadro não foi retornado pela conta conectada. Atualize a lista." }, { status: 400 });
      await setPinterestBoard(selected.id, selected.name);
      return NextResponse.json({ success: true, message: "Quadro salvo.", board: { id: selected.id, name: selected.name } });
    }

    if (action === "queue") {
      const connection = await getPinterestConnectionInfo();
      if (!connection.ready) {
        return NextResponse.json({ error: connection.message }, { status: 409 });
      }
      const result = await queuePublishedReviewPins(25);
      return NextResponse.json({ success: true, ...result, message: result.queued ? result.queued + " Pin(s) adicionado(s) à fila." : "Nenhum review/LP novo com imagem HTTPS para adicionar." });
    }

    if (action === "publishDue") {
      const connection = await getPinterestConnectionInfo();
      if (!connection.ready) return NextResponse.json({ error: connection.message }, { status: 409 });
      const result = await publishDuePinterestPins(3);
      return NextResponse.json({ success: true, ...result, message: result.processed ? result.processed + " publicação(ões) processada(s)." : "Não há Pins pendentes com horário de publicação vencido." });
    }

    if (action === "retryFailed") {
      const connection = await getPinterestConnectionInfo();
      if (!connection.ready) return NextResponse.json({ error: connection.message }, { status: 409 });
      const result = await retryFailedPinterestPins();
      return NextResponse.json({ success: true, ...result, message: result.retried + " Pin(s) reagendado(s)." });
    }

    return NextResponse.json({ error: "Ação não reconhecida." }, { status: 400 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "A operação Pinterest falhou.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
