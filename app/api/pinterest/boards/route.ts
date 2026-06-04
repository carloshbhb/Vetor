import { NextResponse } from 'next/server';
import { getPinterestConfig, getPinterestBoards } from '@/lib/pinterest';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const config = await getPinterestConfig();
    
    if (!config) {
      return NextResponse.json(
        { error: 'Pinterest não configurado' },
        { status: 400 }
      );
    }

    const boards = await getPinterestBoards(config.accessToken);

    return NextResponse.json({ boards });
  } catch (error) {
    console.error('Failed to fetch Pinterest boards:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar boards' },
      { status: 500 }
    );
  }
}
