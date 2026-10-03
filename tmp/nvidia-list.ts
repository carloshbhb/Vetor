import { config } from 'dotenv';

config({ path: '.env.local' });

async function main() {
  const key = process.env.NVIDIA_API_KEY;
  if (!key) {
    console.log('NVIDIA_API_KEY ausente');
    return;
  }
  const res = await fetch('https://integrate.api.nvidia.com/v1/models', {
    headers: { Authorization: `Bearer ${key}` },
  });
  console.log('status', res.status);
  if (!res.ok) {
    console.log((await res.text()).slice(0, 500));
    return;
  }
  const data = (await res.json()) as { data: Array<{ id: string; owned_by?: string }> };
  console.log('modelos:', data.data.length);
  for (const m of data.data) console.log('-', m.id, m.owned_by ? `(${m.owned_by})` : '');
}

main().catch((e) => console.log('ERRO', String(e).slice(0, 300)));
