import { NextResponse } from 'next/server';
import { getPinterestConfig, savePinterestConfig, getPinterestBoards } from '@/lib/pinterest';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const config = await getPinterestConfig();
    
    if (!config) {
      return NextResponse.json({ configured: false });
    }

    // Check if token is expired
    const isExpired = config.expiresAt && new Date(config.expiresAt) < new Date();

    return NextResponse.json({
      configured: true,
      boardId: config.boardId,
      boardName: config.boardName,
      isExpired,
    });
  } catch (error) {
    console.error('Failed to get Pinterest config:', error);
    return NextResponse.json({ configured: false, error: String(error) });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { accessToken, boardId } = body;

    if (!accessToken || !boardId) {
      return NextResponse.json(
        { error: 'Access token e Board ID são obrigatórios' },
        { status: 400 }
      );
    }

    // Validate token by fetching boards
    const boards = await getPinterestBoards(accessToken);
    const board = boards.find(b => b.id === boardId);

    if (!board) {
      return NextResponse.json(
        { error: 'Board não encontrado ou sem permissão' },
        { status: 400 }
      );
    }

    // Save config
    await savePinterestConfig({
      accessToken,
      boardId,
      boardName: board.name,
    });

    return NextResponse.json({
      success: true,
      boardName: board.name,
    });
  } catch (error) {
    console.error('Failed to save Pinterest config:', error);
    return NextResponse.json(
      { error: 'Erro ao salvar configuração' },
      { status: 500 }
    );
  }
}
