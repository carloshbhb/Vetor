// ─────────────────────────────────────────────────────────────────────────────
// Vetor Blog — Google Indexing API Integration
// ─────────────────────────────────────────────────────────────────────────────
// Docs: https://developers.google.com/search/apis/indexing-api/v3/quickstart
//
// Requer variáveis de ambiente:
//   - GOOGLE_SERVICE_ACCOUNT_EMAIL: Email da conta de serviço
//   - GOOGLE_PRIVATE_KEY: Chave privada da conta de serviço
//   - NEXT_PUBLIC_SITE_URL: URL do site

import { GoogleAuth, JWT } from 'google-auth-library';

const _raw = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.vetor.blog';
const SITE_URL = _raw.startsWith('http') ? _raw : `https://${_raw}`;
const GOOGLE_API_URL = 'https://indexing.googleapis.com/v3/urlNotifications:publish';

interface IndexingResponse {
  success: boolean;
  urlNotificationMetadata?: {
    url: string;
    latestUpdate?: {
      notifyTime: string;
      type: string;
    };
  };
  error?: string;
}

/**
 * Obtém cliente autenticado usando conta de serviço do Google
 */
async function getAuthenticatedClient() {
  let credentials: { client_email: string; private_key: string } | null = null;

  // Tentar ler das variáveis de ambiente
  if (process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL && process.env.GOOGLE_PRIVATE_KEY) {
    // Normalizar a chave privada
    let privateKey = process.env.GOOGLE_PRIVATE_KEY;
    
    // Substituir escaped newlines por newlines reais e limpar
    privateKey = privateKey
      .replace(/\\n/g, '\n')
      .replace(/\\r\\n/g, '\n')
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      .replace(/\n{3,}/g, '\n\n') // Max 2 consecutive newlines
      .trim();
    
    // Garantir que a chave começa e termina corretamente
    if (!privateKey.includes('-----BEGIN PRIVATE KEY-----')) {
      // Tentar adicionar o header PEM se ausente
      privateKey = `-----BEGIN PRIVATE KEY-----\n${privateKey}\n-----END PRIVATE KEY-----`;
    }
    
    credentials = {
      client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      private_key: privateKey,
    };
  } else {
    // Tentar ler do arquivo JSON
    try {
      const fs = await import('fs');
      const path = await import('path');
      const keyPath = path.join(process.cwd(), 'credentials', 'google-key.json');
      if (fs.existsSync(keyPath)) {
        credentials = JSON.parse(fs.readFileSync(keyPath, 'utf-8'));
      }
    } catch {
      // Ignorar erro na leitura do arquivo
    }
  }

  if (!credentials) {
    throw new Error('Google credentials not found. Configure GOOGLE_SERVICE_ACCOUNT_EMAIL and GOOGLE_PRIVATE_KEY or place google-key.json in credentials/');
  }

  try {
    const auth = new GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/indexing'],
    });
    return auth.getClient();
  } catch (authError: any) {
    // Fallback: usar JWT client diretamente
    console.warn('GoogleAuth failed, trying JWT fallback:', authError?.message);
    const jwtClient = new JWT({
      email: credentials.client_email,
      key: credentials.private_key,
      scopes: ['https://www.googleapis.com/auth/indexing'],
    });
    return jwtClient;
  }
}
}

/**
 * Envia URL para indexação/ atualização no Google
 */
export async function publishToGoogleIndexing(url: string, type: 'URL_UPDATED' | 'URL_DELETED' = 'URL_UPDATED'): Promise<IndexingResponse> {
  try {
    const client = await getAuthenticatedClient();

    const response = await client.request({
      url: GOOGLE_API_URL,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      data: {
        url: url,
        type: type,
      },
    });

    return { success: true, urlNotificationMetadata: response.data as any };
  } catch (error: any) {
    // Log mais detalhado do erro
    console.error('Google Indexing API error details:', {
      message: error?.message,
      code: error?.code,
      status: error?.status,
      errors: error?.errors,
    });
    
    // Extrair mensagem de erro mais específica
    let errorMessage = error?.message || String(error);
    if (error?.response?.data?.error) {
      errorMessage = error.response.data.error.message || JSON.stringify(error.response.data.error);
    }
    
    return { success: false, error: errorMessage };
  }
}

/**
 * Indexa todas as páginas importantes do site
 */
export async function indexAllPages(): Promise<{ indexed: number; errors: number }> {
  const { getPublishedReviews } = await import('./db');
  const reviews = await getPublishedReviews();

  let indexed = 0;
  let errors = 0;

  // Indexar homepage
  const homeResult = await publishToGoogleIndexing(SITE_URL);
  if (homeResult.success) indexed++;
  else errors++;

  // Indexar research page
  const researchResult = await publishToGoogleIndexing(`${SITE_URL}/research`);
  if (researchResult.success) indexed++;
  else errors++;

  // Indexar reviews
  for (const review of reviews) {
    const url = `${SITE_URL}/review/${review.slug}`;
    const result = await publishToGoogleIndexing(url);
    if (result.success) indexed++;
    else errors++;

    // Rate limit: 200 requests por dia (conta de serviço)
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  return { indexed, errors };
}

/**
 * Indexa um novo review quando publicado
 */
export async function indexNewReview(slug: string): Promise<IndexingResponse> {
  const url = `${SITE_URL}/review/${slug}`;
  return publishToGoogleIndexing(url, 'URL_UPDATED');
}
