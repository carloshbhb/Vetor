import { NextResponse } from 'next/server';
import { getPinterestConfig, savePinterestConfig, getPinterestBoards } from '@/lib/pinterest';
import { createClient } from '@supabase/supabase-js';

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

    // Try to validate token by fetching boards, but don't fail if board not found
    let boardName = 'Board personalizado';
    try {
      const boards = await getPinterestBoards(accessToken);
      const board = boards.find(b => b.id === boardId);
      if (board) {
        boardName = board.name;
      }
    } catch (e) {
      console.log('[Pinterest] Could not validate board, proceeding anyway:', e);
    }

    // Save config even if board validation fails
    await savePinterestConfig({
      accessToken,
      boardId,
      boardName,
    });

    return NextResponse.json({
      success: true,
      boardName,
    });
  } catch (error) {
    console.error('Failed to save Pinterest config:', error);
    return NextResponse.json(
      { error: 'Erro ao salvar configuração: ' + String(error) },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    await supabase.from('pinterest_config').delete().eq('id', 'default');

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: 'Erro ao limpar configuração: ' + String(error) },
      { status: 500 }
    );
  }
}
