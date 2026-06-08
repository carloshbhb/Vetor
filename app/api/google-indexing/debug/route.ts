import { NextResponse } from 'next/server';
import { createSign } from 'crypto';

export const dynamic = 'force-dynamic';

export async function GET() {
  const rawKey = process.env.GOOGLE_PRIVATE_KEY;
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;

  if (!rawKey || !email) {
    return NextResponse.json({ error: 'Missing credentials' }, { status: 500 });
  }

  const diagnostics: any = {
    email: email.substring(0, 10) + '...',
    rawKeyLength: rawKey.length,
    rawKeyFirstChars: rawKey.substring(0, 20),
    rawKeyLastChars: rawKey.substring(rawKey.length - 20),
    hasLiteralBackslashN: rawKey.includes('\\n'),
    hasActualNewlines: rawKey.includes('\n'),
    hasBeginMarker: rawKey.includes('-----BEGIN'),
    hasEndMarker: rawKey.includes('-----END'),
  };

  // Try to normalize
  let normalized = rawKey
    .replace(/\\n/g, '\n')
    .replace(/\\r\\n/g, '\n')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .trim();

  diagnostics.normalizedLength = normalized.length;
  diagnostics.normalizedHasNewlines = normalized.includes('\n');

  if (!normalized.includes('-----BEGIN')) {
    normalized = `-----BEGIN PRIVATE KEY-----\n${normalized}\n-----END PRIVATE KEY-----`;
  }

  diagnostics.finalLength = normalized.length;
  diagnostics.finalFirstLine = normalized.split('\n')[0];
  diagnostics.finalLineCount = normalized.split('\n').length;

  // Try to sign something
  try {
    const testSign = createSign('RSA-SHA256');
    testSign.update('test');
    testSign.sign(normalized, 'base64');
    diagnostics.signTest = 'SUCCESS';
  } catch (signError: any) {
    diagnostics.signTest = 'FAILED';
    diagnostics.signError = signError.message;
  }

  // Try to import the key
  try {
    const { createPrivateKey } = await import('crypto');
    const keyObject = createPrivateKey({
      key: normalized,
      format: 'pem',
    });
    diagnostics.keyImport = 'SUCCESS';
    diagnostics.keyType = keyObject.type;
  } catch (importError: any) {
    diagnostics.keyImport = 'FAILED';
    diagnostics.importError = importError.message;
  }

  return NextResponse.json(diagnostics, { status: 200 });
}
