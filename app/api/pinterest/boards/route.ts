import { NextRequest, NextResponse } from 'next/server';
import { getPinterestConfig, getPinterestBoards } from '@/lib/pinterest';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    let accessToken: string | null = null;

    const authHeader = req.headers.get('authorization');
    if (authHeader?.startsWith('Bearer ')) {
      accessToken = authHeader.slice(7);
    }

    if (!accessToken) {
      const config = await getPinterestConfig();
      if (config) {
        accessToken = config.accessToken;
      }
    }
    
    if (!accessToken) {
      return NextResponse.json(
        { error: 'Pinterest não configurado' },
        { status: 400 }
      );
    }

    const boards = await getPinterestBoards(accessToken);

    return NextResponse.json({ boards });
  } catch (error) {
    console.error('Failed to fetch Pinterest boards:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar boards' },
      { status: 500 }
    );
  }
}
