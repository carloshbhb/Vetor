import { NextRequest, NextResponse } from 'next/server';
import { createVideoJob, getVideoById } from '@/lib/video-orchestrator';

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;
const TELEGRAM_WEBHOOK_SECRET = process.env.TELEGRAM_WEBHOOK_SECRET;

const URL_REGEX = /https?:\/\/(www\.)?(amazon\.(com\.br|com)|shopee\.(com\.br|com)|mercadolivre\.com\.br|mercadolibre\.)[^\s]+/gi;

async function sendTelegramMessage(chatId: string, text: string, parseMode = 'HTML') {
  if (!TELEGRAM_BOT_TOKEN) return;
  
  await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: parseMode }),
  });
}

async function sendTelegramPhoto(chatId: string, photoUrl: string, caption: string) {
  if (!TELEGRAM_BOT_TOKEN) return;
  
  await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendPhoto`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, photo: photoUrl, caption, parse_mode: 'HTML' }),
  });
}

export async function POST(request: NextRequest) {
  try {
    const secret = request.headers.get('x-telegram-bot-api-secret-token');
    if (TELEGRAM_WEBHOOK_SECRET && secret !== TELEGRAM_WEBHOOK_SECRET) {
      return NextResponse.json({ error: 'Invalid secret' }, { status: 401 });
    }

    const update = await request.json();
    const message = update.message || update.edited_message;
    
    if (!message || !message.text) {
      return NextResponse.json({ ok: true });
    }

    const chatId = message.chat.id.toString();
    const text = message.text.trim();
    const userId = message.from?.id.toString();

    if (TELEGRAM_CHAT_ID && chatId !== TELEGRAM_CHAT_ID) {
      await sendTelegramMessage(chatId, '❌ Bot não autorizado para este chat.');
      return NextResponse.json({ ok: true });
    }

    if (text === '/start' || text === '/help') {
      await sendTelegramMessage(chatId, 
        '🤖 <b>Vetor Blog Video Bot</b>\n\n' +
        'Envie um link de produto da <b>Amazon</b>, <b>Shopee</b> ou <b>Mercado Livre</b> ' +
        'e eu criarei um vídeo de review automático para o YouTube!\n\n' +
        '<b>Comandos:</b>\n' +
        '• /start - Mostra esta ajuda\n' +
        '• /status <ID> - Verifica status do vídeo\n' +
        '• /queue - Lista vídeos na fila\n\n' +
        'Exemplo: <code>https://amazon.com.br/dp/B0XXXXX</code>'
      );
      return NextResponse.json({ ok: true });
    }

    if (text.startsWith('/status ')) {
      const videoId = text.replace('/status ', '').trim();
      const video = await getVideoById(videoId);
      
      if (!video) {
        await sendTelegramMessage(chatId, '❌ Vídeo não encontrado.');
        return NextResponse.json({ ok: true });
      }

      const statusEmoji = {
        pending: '⏳',
        processing: '🔄',
        completed: '✅',
        failed: '❌',
      }[video.status] || '❓';

      await sendTelegramMessage(chatId,
        `${statusEmoji} <b>Status do Vídeo</b>\n\n` +
        `<b>ID:</b> <code>${video.id}</code>\n` +
        `<b>Produto:</b> ${video.product_title}\n` +
        `<b>Categoria:</b> ${video.product_category}\n` +
        `<b>Preço:</b> ${video.product_price}\n` +
        `<b>Status:</b> ${video.status}\n` +
        (video.youtube_url ? `<b>YouTube:</b> ${video.youtube_url}\n` : '') +
        (video.error_message ? `<b>Erro:</b> ${video.error_message}\n` : '') +
        `<b>Criado em:</b> ${new Date(video.created_at).toLocaleString('pt-BR')}`
      );
      return NextResponse.json({ ok: true });
    }

    if (text === '/queue') {
      const { getPendingVideos } = await import('@/lib/video-orchestrator');
      const videos = await getPendingVideos(10);
      
      if (videos.length === 0) {
        await sendTelegramMessage(chatId, '📭 Fila vazia - nenhum vídeo pendente.');
        return NextResponse.json({ ok: true });
      }

      let msg = '📋 <b>Fila de Vídeos Pendentes</b>\n\n';
      videos.forEach((v, i) => {
        msg += `${i + 1}. <b>${v.product_title}</b>\n`;
        msg += `   ID: <code>${v.id}</code> | ${v.product_category} | ${v.product_price}\n`;
        msg += `   Agendado: ${new Date(v.scheduled_at!).toLocaleString('pt-BR')}\n\n`;
      });
      
      await sendTelegramMessage(chatId, msg);
      return NextResponse.json({ ok: true });
    }

    const urls = text.match(URL_REGEX);
    if (urls && urls.length > 0) {
      for (const url of urls.slice(0, 3)) {
        try {
          await sendTelegramMessage(chatId, `🔍 Analisando link: ${url}`);
          
          const video = await createVideoJob({ productUrl: url });
          
          await sendTelegramPhoto(chatId, video.product_image_url,
            `✅ <b>Vídeo agendado!</b>\n\n` +
            `<b>Produto:</b> ${video.product_title}\n` +
            `<b>Categoria:</b> ${video.product_category}\n` +
            `<b>Preço:</b> ${video.product_price}\n` +
            `<b>ID:</b> <code>${video.id}</code>\n\n` +
            `O vídeo será processado em breve. Use <code>/status ${video.id}</code> para acompanhar.`
          );
        } catch (error) {
          console.error('Error creating video job:', error);
          await sendTelegramMessage(chatId, `❌ Erro ao processar ${url}: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
        }
      }
      return NextResponse.json({ ok: true });
    }

    await sendTelegramMessage(chatId, 
      '🤔 Não entendi. Envie um link de produto da Amazon, Shopee ou Mercado Livre, ' +
      'ou use /help para ver os comandos.'
    );

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Telegram webhook error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Telegram not configured' }, { status: 500 });
  }

  const webhookUrl = `${process.env.NEXT_PUBLIC_SITE_URL}/api/telegram/webhook`;
  
  const response = await fetch(
    `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/setWebhook?url=${encodeURIComponent(webhookUrl)}&secret_token=${TELEGRAM_WEBHOOK_SECRET}`
  );
  
  const data = await response.json();
  return NextResponse.json(data);
}