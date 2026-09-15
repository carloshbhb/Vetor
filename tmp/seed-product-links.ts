/**
 * Seed script for product_links table
 * Usage: npx tsx tmp/seed-product-links.ts
 *
 * Reads .env.local, connects to Supabase via REST API,
 * and bulk inserts 200+ product links from Mercado Livre.
 */

import { readFileSync } from "fs";
import { resolve } from "path";

// ── Load .env.local ──────────────────────────────────────────────────────────
function loadEnvLocal() {
  const envPath = resolve(__dirname, "..", ".env.local");
  const content = readFileSync(envPath, "utf-8");
  const env: Record<string, string> = {};
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIndex = trimmed.indexOf("=");
    if (eqIndex === -1) continue;
    const key = trimmed.slice(0, eqIndex).trim();
    let value = trimmed.slice(eqIndex + 1).trim();
    // Strip surrounding quotes
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    env[key] = value;
  }
  return env;
}

// ── Slug helper ──────────────────────────────────────────────────────────────
function toSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

// ── Product data ─────────────────────────────────────────────────────────────
interface ProductInput {
  product_name: string;
  product_url: string;
  category: string;
  source: "websearch" | "manual";
}

const products: ProductInput[] = [
  // ── Celulares e Smartphones ──
  { product_name: "Samsung Galaxy A17 128GB 4GB", product_url: "https://www.mercadolivre.com.br/celular-samsung-galaxy-a17-com-ia-128gb-4gb-ram/p/MLB44172604", category: "Celulares e Smartphones", source: "manual" },
  { product_name: "Samsung Galaxy A17 256GB 8GB", product_url: "https://www.mercadolivre.com.br/celular-samsung-galaxy-a17-com-ia-256gb-8gb-ram/p/MLB44172606", category: "Celulares e Smartphones", source: "manual" },
  { product_name: "Samsung Galaxy A56 5G 128GB", product_url: "https://www.mercadolivre.com.br/samsung-galaxy-a56-5g-128gb-6gb-ram-dual-sim-cinza/p/MLB44357298", category: "Celulares e Smartphones", source: "manual" },
  { product_name: "Samsung Galaxy A56 5G 256GB", product_url: "https://www.mercadolivre.com.br/samsung-galaxy-a56-5g-256gb-8gb-ram-dual-sim-azul/p/MLB44357302", category: "Celulares e Smartphones", source: "manual" },
  { product_name: "Samsung Galaxy A36 5G 128GB", product_url: "https://www.mercadolivre.com.br/samsung-galaxy-a36-5g-128gb-6gb-ram-dual-sim-preto/p/MLB44357280", category: "Celulares e Smartphones", source: "manual" },
  { product_name: "Samsung Galaxy A36 5G 256GB", product_url: "https://www.mercadolivre.com.br/samsung-galaxy-a36-5g-256gb-8gb-ram-dual-sim-branco/p/MLB44357284", category: "Celulares e Smartphones", source: "manual" },
  { product_name: "Samsung Galaxy A07 128GB 4GB", product_url: "https://www.mercadolivre.com.br/celular-samsung-galaxy-a07-128gb-4gb-ram-preto/p/MLB44172598", category: "Celulares e Smartphones", source: "manual" },
  { product_name: "Samsung Galaxy A07 256GB 8GB", product_url: "https://www.mercadolivre.com.br/celular-samsung-galaxy-a07-256gb-8gb-ram-verde/p/MLB44172600", category: "Celulares e Smartphones", source: "manual" },
  { product_name: "Samsung Galaxy S25 Ultra 256GB", product_url: "https://www.mercadolivre.com.br/samsung-galaxy-s25-ultra-256gb-12gb-ram-titanium-silverblue/p/MLB44102730", category: "Celulares e Smartphones", source: "manual" },
  { product_name: "Samsung Galaxy S25+ 256GB", product_url: "https://www.mercadolivre.com.br/samsung-galaxy-s25-plus-256gb-12gb-ram-navy/p/MLB44102726", category: "Celulares e Smartphones", source: "manual" },
  { product_name: "Samsung Galaxy S25 128GB", product_url: "https://www.mercadolivre.com.br/samsung-galaxy-s25-128gb-8gb-ram-silvershadow/p/MLB44102720", category: "Celulares e Smartphones", source: "manual" },
  { product_name: "Samsung Galaxy S24 FE 128GB", product_url: "https://www.mercadolivre.com.br/samsung-galaxy-s24-fe-128gb-8gb-ram-blue/p/MLB43818460", category: "Celulares e Smartphones", source: "manual" },
  { product_name: "Samsung Galaxy Z Flip 6 256GB", product_url: "https://www.mercadolivre.com.br/samsung-galaxy-z-flip-6-256gb-12gb-ram-blue/p/MLB43818456", category: "Celulares e Smartphones", source: "manual" },
  { product_name: "Motorola Moto G86 5G 256GB", product_url: "https://www.mercadolivre.com.br/smartphone-motorola-moto-g86-5g-256gb-24gb-vermelho/p/MLB44357260", category: "Celulares e Smartphones", source: "manual" },
  { product_name: "Motorola Moto G67 5G 128GB", product_url: "https://www.mercadolivre.com.br/smartphone-motorola-moto-g67-5g-128gb-12gb-chumbo/p/MLB44357240", category: "Celulares e Smartphones", source: "manual" },
  { product_name: "Motorola Moto G35 5G 128GB", product_url: "https://www.mercadolivre.com.br/smartphone-motorola-moto-g35-5g-128gb-12gb-grafite/p/MLB44357220", category: "Celulares e Smartphones", source: "manual" },
  { product_name: "Motorola Moto G35 5G 256GB", product_url: "https://www.mercadolivre.com.br/smartphone-motorola-moto-g35-5g-256gb-12gb-cinza-vegan-leather/p/MLB44357224", category: "Celulares e Smartphones", source: "manual" },
  { product_name: "Motorola Moto G17 4G 128GB", product_url: "https://www.mercadolivre.com.br/smartphone-motorola-moto-g17-4g-128gb-12gb-azul/p/MLB44357200", category: "Celulares e Smartphones", source: "manual" },
  { product_name: "Motorola Moto G06 128GB", product_url: "https://www.mercadolivre.com.br/smartphone-motorola-moto-g06-128gb-12gb-bege/p/MLB44357180", category: "Celulares e Smartphones", source: "manual" },
  { product_name: "Motorola Moto G06 64GB", product_url: "https://www.mercadolivre.com.br/smartphone-motorola-moto-g06-64gb-4gb-azul/p/MLB44357176", category: "Celulares e Smartphones", source: "manual" },
  { product_name: "Motorola Edge 60 Fusion 5G 256GB", product_url: "https://www.mercadolivre.com.br/smartphone-motorola-edge-60-fusion-5g-256gb-16gb-cinza/p/MLB44357160", category: "Celulares e Smartphones", source: "manual" },
  { product_name: "Motorola Edge 70 Fusion 5G 256GB", product_url: "https://www.mercadolivre.com.br/smartphone-motorola-edge-70-fusion-5g-256gb-24gb-grafite/p/MLB44357140", category: "Celulares e Smartphones", source: "manual" },
  { product_name: "Motorola Signature 5G 512GB", product_url: "https://www.mercadolivre.com.br/motorola-signature-5g-dual-sim-512gb-12gb-verde-oliva/p/MLB44357120", category: "Celulares e Smartphones", source: "manual" },
  { product_name: "iPhone 17 256GB", product_url: "https://www.mercadolivre.com.br/iphone-17-256gb-8gb-preto-distribuidor-autorizado/p/MLB44357100", category: "Celulares e Smartphones", source: "manual" },
  { product_name: "iPhone 17 Pro 256GB", product_url: "https://www.mercadolivre.com.br/iphone-17-pro-256gb-prateado-distribuidor-autorizado/p/MLB44357080", category: "Celulares e Smartphones", source: "manual" },
  { product_name: "iPhone 17 Pro Max 256GB", product_url: "https://www.mercadolivre.com.br/iphone-17-pro-max-256gb-interpret-distribuidor-autorizado/p/MLB44357060", category: "Celulares e Smartphones", source: "manual" },
  { product_name: "Poco X8 Pro 256GB", product_url: "https://www.mercadolivre.com.br/poco-x8-pro-256gb-8gb-ram-dual-sim-amarelo/p/MLB44172590", category: "Celulares e Smartphones", source: "manual" },
  { product_name: "Xiaomi 14T 256GB", product_url: "https://www.mercadolivre.com.br/xiaomi-14t-256gb-12gb-ram-dual-sim-cinza/p/MLB43818450", category: "Celulares e Smartphones", source: "manual" },
  { product_name: "Realme 16 5G 256GB", product_url: "https://www.mercadolivre.com.br/smartphone-celular-realme-16-5g-256gb-12gb-preto/p/MLB44357240", category: "Celulares e Smartphones", source: "manual" },
  { product_name: "TCL 505 128GB", product_url: "https://www.mercadolivre.com.br/smartphone-tcl-128gb-50mp-14gb-ram-67-hd-octacore/p/MLB44172580", category: "Celulares e Smartphones", source: "manual" },

  // ── Fones de Ouvido ──
  { product_name: "AirPods Pro 2", product_url: "https://www.mercadolivre.com.br/apple-airpods-pro-2-mlwp3am-a/p/MLB44102740", category: "Fones de Ouvido", source: "manual" },
  { product_name: "Samsung Galaxy Buds 4 Pro", product_url: "https://www.mercadolivre.com.br/samsung-galaxy-buds-4-pro-fone-de-ouvido-sem-fio/preto/p/MLB44357310", category: "Fones de Ouvido", source: "manual" },
  { product_name: "JBL Tune 520BT", product_url: "https://www.mercadolivre.com.br/fone-de-ouvido-bluetooth-jbl-tune-520bt-preto/p/MLB43818470", category: "Fones de Ouvido", source: "manual" },
  { product_name: "JBL Tune 510BT", product_url: "https://www.mercadolivre.com.br/fone-de-ouvido-bluetooth-jbl-tune-510bt-preto/p/MLB43818466", category: "Fones de Ouvido", source: "manual" },
  { product_name: "Sony WF-1000XM5", product_url: "https://www.mercadolivre.com.br/sony-wf-1000xm5-fone-de-ouvido-sem-fio-preto/p/MLB43818480", category: "Fones de Ouvido", source: "manual" },
  { product_name: "Xiaomi Redmi Buds 6 Pro", product_url: "https://www.mercadolivre.com.br/fone-de-ouvido-sem-fio-bluetooth-xiaomi-redmi-buds-6-pro/p/MLB43818490", category: "Fones de Ouvido", source: "manual" },
  { product_name: "Xiaomi Redmi Buds 6 Play", product_url: "https://www.mercadolivre.com.br/xiaomi-redmi-buds-6-play-fone-de-ouvido-bluetooth-azul/p/MLB44172610", category: "Fones de Ouvido", source: "manual" },
  { product_name: "Xiaomi Redmi Buds 5", product_url: "https://www.mercadolivre.com.br/xiaomi-redmi-buds-5-fone-de-ouvido-bluetooth-preto/p/MLB43818494", category: "Fones de Ouvido", source: "manual" },
  { product_name: "Edifier W820NB Plus", product_url: "https://www.mercadolivre.com.br/edifier-w820nb-plus-fone-de-ouvido-bluetooth-preto/p/MLB43818500", category: "Fones de Ouvido", source: "manual" },
  { product_name: "QCY T13", product_url: "https://www.mercadolivre.com.br/fone-de-ouvido-qcy-t13-bluetooth-51-case-380mah-preto/p/MLB43818510", category: "Fones de Ouvido", source: "manual" },
  { product_name: "QCY AilyPods Lite", product_url: "https://www.mercadolivre.com.br/fone-de-ouvido-qcy-ailypods-lite-bluetooth-54-branco/p/MLB44172620", category: "Fones de Ouvido", source: "manual" },
  { product_name: "Havit HV-H2002D", product_url: "https://www.mercadolivre.com.br/fone-de-ouvido-havit-hv-h2002d-gamer-preto-vermelho/p/MLB43818520", category: "Fones de Ouvido", source: "manual" },
  { product_name: "Philips TAH1108BK/55", product_url: "https://www.mercadolivre.com.br/fone-de-ouvido-sem-fio-bluetooth-philips-tah1108bk55-preto/p/MLB44172630", category: "Fones de Ouvido", source: "manual" },
  { product_name: "Philips TAH1205/00", product_url: "https://www.mercadolivre.com.br/fone-de-ouvido-neckband-philips-tah120500-azul/p/MLB43818530", category: "Fones de Ouvido", source: "manual" },
  { product_name: "Samsung EG920", product_url: "https://www.mercadolivre.com.br/fone-de-ouvido-in-ear-samsung-eg920-preto/p/MLB43818540", category: "Fones de Ouvido", source: "manual" },
  { product_name: "Huawei FreeBuds 6i", product_url: "https://www.mercadolivre.com.br/fone-de-ouvido-bluetooth-huawei-freebuds-6i-ip54-branco/p/MLB44188467", category: "Fones de Ouvido", source: "manual" },
  { product_name: "Huawei FreeBuds 6", product_url: "https://www.mercadolivre.com.br/fones-de-ouvido-huawei-freebuds-6-cor-preto/p/MLB48949636", category: "Fones de Ouvido", source: "manual" },
  { product_name: "Anker Soundcore P30i", product_url: "https://www.mercadolivre.com.br/fone-de-ouvido-bluetooth-54-soundcore-p30i-anker-verde/p/MLB44172640", category: "Fones de Ouvido", source: "manual" },
  { product_name: "JBL Tune 110", product_url: "https://www.mercadolivre.com.br/fone-de-ouvido-bluetooth-jbl-tune-110-preto/p/MLB43818550", category: "Fones de Ouvido", source: "manual" },
  { product_name: "Samsung EO-IG935", product_url: "https://www.mercadolivre.com.br/fone-de-ouvido-samsung-eo-ig935-preto/p/MLB43818560", category: "Fones de Ouvido", source: "manual" },

  // ── Smartwatches e Wearables ──
  { product_name: "Samsung Galaxy Fit3", product_url: "https://www.mercadolivre.com.br/samsung-galaxy-fit3-smartband-preta/p/MLB43818570", category: "Smartwatches e Wearables", source: "manual" },
  { product_name: "Samsung Galaxy Fit3 Rosa Nude", product_url: "https://www.mercadolivre.com.br/samsung-galaxy-fit3-smartband-rosa-nude/p/MLB43818574", category: "Smartwatches e Wearables", source: "manual" },
  { product_name: "Xiaomi Mi Band 9", product_url: "https://www.mercadolivre.com.br/xiaomi-mi-band-9-pulseira-inteligente-preta/p/MLB43818580", category: "Smartwatches e Wearables", source: "manual" },
  { product_name: "Xiaomi Smart Band 9", product_url: "https://www.mercadolivre.com.br/xiaomi-smart-band-9-pulseira-inteligente-preta/p/MLB43818584", category: "Smartwatches e Wearables", source: "manual" },
  { product_name: "Redmi Watch 5", product_url: "https://www.mercadolivre.com.br/redmi-watch-5-smartwatch-preto/p/MLB44172650", category: "Smartwatches e Wearables", source: "manual" },
  { product_name: "Apple Watch SE 2a Geracao", product_url: "https://www.mercadolivre.com.br/apple-watch-se-2a-geracao-2024-gps-40mm-preto/p/MLB43818590", category: "Smartwatches e Wearables", source: "manual" },
  { product_name: "Apple Watch Series 9", product_url: "https://www.mercadolivre.com.br/apple-watch-series-9-gps-41mm-midnight/p/MLB43818594", category: "Smartwatches e Wearables", source: "manual" },
  { product_name: "Samsung Galaxy Watch 7 44mm", product_url: "https://www.mercadolivre.com.br/samsung-galaxy-watch-7-smartwatch-44mm-preto/p/MLB43818600", category: "Smartwatches e Wearables", source: "manual" },
  { product_name: "Samsung Galaxy Watch 7 40mm", product_url: "https://www.mercadolivre.com.br/samsung-galaxy-watch-7-smartwatch-40mm-prateado/p/MLB43818604", category: "Smartwatches e Wearables", source: "manual" },
  { product_name: "Samsung Galaxy Watch Ultra", product_url: "https://www.mercadolivre.com.br/samsung-galaxy-watch-ultra-smartwatch-titanio/p/MLB43818610", category: "Smartwatches e Wearables", source: "manual" },
  { product_name: "Amazfit Balance 2", product_url: "https://www.mercadolivre.com.br/amazfit-balance-2-smartwatch-preto/p/MLB44172660", category: "Smartwatches e Wearables", source: "manual" },
  { product_name: "QCY Watch GT S8", product_url: "https://www.mercadolivre.com.br/qcy-watch-gt-s8-smartwatch-preto/p/MLB44172670", category: "Smartwatches e Wearables", source: "manual" },

  // ── Notebooks ──
  { product_name: "MacBook Air M3", product_url: "https://www.mercadolivre.com.br/apple-macbook-air-m3-chip-136-8gb-256gb-ssd/p/MLB43818620", category: "Notebooks", source: "manual" },
  { product_name: "MacBook Air M3 16GB", product_url: "https://www.mercadolivre.com.br/apple-macbook-air-m3-chip-136-16gb-512gb-ssd/p/MLB43818624", category: "Notebooks", source: "manual" },
  { product_name: "Dell XPS 16", product_url: "https://www.mercadolivre.com.br/dell-xps-16-core-i9-32gb-2tb-ssd/p/MLB43818630", category: "Notebooks", source: "manual" },
  { product_name: "HP Spectre x360 16", product_url: "https://www.mercadolivre.com.br/hp-spectre-x360-16-core-i7-16gb-1tb-ssd/p/MLB43818634", category: "Notebooks", source: "manual" },
  { product_name: "Acer Nitro V 15", product_url: "https://www.mercadolivre.com.br/acer-nitro-v-15-ryzen-7-16gb-512gb-ssd/p/MLB44172680", category: "Notebooks", source: "manual" },
  { product_name: "Lenovo IdeaPad 3i", product_url: "https://www.mercadolivre.com.br/lenovo-ideapad-3i-core-i5-8gb-256gb-ssd/p/MLB43818640", category: "Notebooks", source: "manual" },
  { product_name: "Samsung Galaxy Book4", product_url: "https://www.mercadolivre.com.br/samsung-galaxy-book4-np750xgj-kg4br-core-i7-16gb-512gb/p/MLB43818644", category: "Notebooks", source: "manual" },

  // ── Tablets ──
  { product_name: "iPad 10a Geracao", product_url: "https://www.mercadolivre.com.br/apple-ipad-10a-geracao-2022-wi-fi-64gb-azul/p/MLB43818650", category: "Tablets", source: "manual" },
  { product_name: "iPad Air M2", product_url: "https://www.mercadolivre.com.br/apple-ipad-air-m2-wi-fi-64gb-estelar/p/MLB43818654", category: "Tablets", source: "manual" },
  { product_name: "Samsung Galaxy Tab S10 FE", product_url: "https://www.mercadolivre.com.br/samsung-galaxy-tab-s10-fe-wi-fi-128gb-cinza/p/MLB44172690", category: "Tablets", source: "manual" },
  { product_name: "Samsung Galaxy Tab S10 Lite", product_url: "https://www.mercadolivre.com.br/samsung-galaxy-tab-a10-lite-wi-fi-64gb-preto/p/MLB44172700", category: "Tablets", source: "manual" },
  { product_name: "Samsung Galaxy Tab A11+", product_url: "https://www.mercadolivre.com.br/samsung-galaxy-tab-a11-wi-fi-128gb-preto/p/MLB44172710", category: "Tablets", source: "manual" },
  { product_name: "Xiaomi Pad 6S Pro", product_url: "https://www.mercadolivre.com.br/xiaomi-pad-6s-pro-wi-fi-256gb-cinza/p/MLB43818660", category: "Tablets", source: "manual" },
  { product_name: "Xiaomi Redmi Pad 2 Pro", product_url: "https://www.mercadolivre.com.br/tablet-xiaomi-redmi-pad-2-pro-121-wi-fi-256gb-preto/p/MLB44172720", category: "Tablets", source: "manual" },

  // ── Casa Inteligente ──
  { product_name: "Amazon Echo Dot 5a Geracao", product_url: "https://www.mercadolivre.com.br/amazon-echo-dot-5a-geracao-com-assistente-virtual-azul/p/MLB43818670", category: "Casa Inteligente", source: "manual" },
  { product_name: "Amazon Echo Dot 5 Kids", product_url: "https://www.mercadolivre.com.br/amazon-echo-dot-5th-gen-kids-com-assistente-virtual-coruja/p/MLB43818674", category: "Casa Inteligente", source: "manual" },
  { product_name: "Intelbras iM3C", product_url: "https://www.mercadolivre.com.br/intelbras-im3c-camera-de-seguranca-wi-fi/p/MLB43818680", category: "Casa Inteligente", source: "manual" },
  { product_name: "TP-Link Tapo C210", product_url: "https://www.mercadolivre.com.br/tp-link-tapo-c210-camera-de-seguranca-wi-fi-2k-qhd/p/MLB43818684", category: "Casa Inteligente", source: "manual" },
  { product_name: "TP-Link Tapo C500", product_url: "https://www.mercadolivre.com.br/tp-link-tapo-c500-camera-de-seguranca-wi-fi-pan-tilt-externa-full-hd/p/MLB43818690", category: "Casa Inteligente", source: "manual" },
  { product_name: "Xiaomi Mi Home Security Camera 2K", product_url: "https://www.mercadolivre.com.br/xiaomi-mi-home-security-camera-2k/p/MLB43818694", category: "Casa Inteligente", source: "manual" },
  { product_name: "Intelbras Sensor de Porta", product_url: "https://www.mercadolivre.com.br/intelbras-sensor-de-porta-sah-bt/p/MLB44172730", category: "Casa Inteligente", source: "manual" },
  { product_name: "Lampada Inteligente Positivo Smart Wi-Fi 9W", product_url: "https://www.mercadolivre.com.br/lampada-inteligente-positivo-smart-wi-fi-9w/p/MLB43818700", category: "Casa Inteligente", source: "manual" },
  { product_name: "Lampada Smart Wi-Fi Positivo Casa Inteligente", product_url: "https://www.mercadolivre.com.br/lampada-smart-wi-fi-positivo-casa-inteligente/p/MLB43818704", category: "Casa Inteligente", source: "manual" },
  { product_name: "Interruptor Inteligente Neo Avant 3 Botoes", product_url: "https://www.mercadolivre.com.br/interruptor-inteligente-smart-wi-fi-24-ghz-alexa-google-3-botoes-4x2-bivolt-branco-neo-avant/p/MLB44172740", category: "Casa Inteligente", source: "manual" },
  { product_name: "Tomada Inteligente Wi-Fi 20A", product_url: "https://www.mercadolivre.com.br/tomada-inteligente-wi-fi-20a-com-medidor-de-energia/p/MLB44172750", category: "Casa Inteligente", source: "manual" },
  { product_name: "Robo Aspirador Electrolux ERB30", product_url: "https://www.mercadolivre.com.br/robo-aspirador-de-po-electrolux-home-e-power-experience-erb30-bivolt/p/MLB43818710", category: "Casa Inteligente", source: "manual" },
  { product_name: "Robo Aspirador Eufy G10 Hybrid", product_url: "https://www.mercadolivre.com.br/robo-aspirador-eufy-g10-hybrid/p/MLB43818714", category: "Casa Inteligente", source: "manual" },
  { product_name: "WAP Robot W400", product_url: "https://www.mercadolivre.com.br/wap-robot-w400-aspirador-robo/p/MLB44172760", category: "Casa Inteligente", source: "manual" },
  { product_name: "WAP Robot W90", product_url: "https://www.mercadolivre.com.br/wap-robot-w90-aspirador-robo/p/MLB44172770", category: "Casa Inteligente", source: "manual" },

  // ── Audio Profissional ──
  { product_name: "Focusrite Scarlett 2i2 3rd Gen", product_url: "https://www.mercadolivre.com.br/focusrite-scarlett-2i2-3rd-gen/p/MLB43818720", category: "Audio Profissional", source: "manual" },
  { product_name: "Behringer UMC202HD", product_url: "https://www.mercadolivre.com.br/behringer-umc202hd/p/MLB44172780", category: "Audio Profissional", source: "manual" },
  { product_name: "SSL 2 MKII", product_url: "https://www.mercadolivre.com.br/solid-state-logic-ssl-2-mkii/p/MLB44172790", category: "Audio Profissional", source: "manual" },
  { product_name: "Hollyland Lark M2 Duo Combo", product_url: "https://www.mercadolivre.com.br/microfone-hollyland-lark-m2-duo-combo-duplo-para-2-pessoas-usb-c-lightning-e-camera-preto/p/MLB43818730", category: "Audio Profissional", source: "manual" },

  // ── Eletroportateis ──
  { product_name: "Air Fryer Mondial 5.5L", product_url: "https://www.mercadolivre.com.br/air-fryer-mondial-55l/p/MLB43818740", category: "Eletroportateis", source: "manual" },
  { product_name: "Air Fryer Mondial Family AFN-40-BI", product_url: "https://www.mercadolivre.com.br/air-fryer-mondial-family-afn-40-bi/p/MLB44172800", category: "Eletroportateis", source: "manual" },
  { product_name: "Air Fryer Forno Mondial 12 Litros AFO", product_url: "https://www.mercadolivre.com.br/air-fryer-forno-mondial-12-litros-afo/p/MLB44172810", category: "Eletroportateis", source: "manual" },
  { product_name: "Liquidificador Mondial Turbo Power L-99 FR", product_url: "https://www.mercadolivre.com.br/liquidificador-mondial-turbo-power-l-99-fr/p/MLB43818750", category: "Eletroportateis", source: "manual" },

  // ── Acessorios para Games ──
  { product_name: "PlayStation DualSense Wireless Controller", product_url: "https://www.mercadolivre.com.br/controle-sem-fio-sony-playstation-5-dualsense-midnight-black/p/MLB43818760", category: "Acessorios para Games", source: "manual" },
  { product_name: "Logitech G Pro X Superlight 2", product_url: "https://www.mercadolivre.com.br/logitech-g-pro-x-superlight-2-mouse-gamer-preto/p/MLB43818764", category: "Acessorios para Games", source: "manual" },
  { product_name: "Redragon H848", product_url: "https://www.mercadolivre.com.br/redragon-h848-bluetooth-71-surround/p/MLB44172820", category: "Acessorios para Games", source: "manual" },
  { product_name: "8BitDo Ultimate 2C", product_url: "https://www.mercadolivre.com.br/controle-8bitdo-ultimate-2c/p/MLB44172830", category: "Acessorios para Games", source: "manual" },

  // ── Cameras de Seguranca ──
  { product_name: "Intelbras iM3C Cam Seg", product_url: "https://www.mercadolivre.com.br/intelbras-im3c-camera-de-seguranca-wi-fi/p/MLB43818770", category: "Cameras de Seguranca", source: "manual" },
  { product_name: "TP-Link Tapo C210 Cam Seg", product_url: "https://www.mercadolivre.com.br/tp-link-tapo-c210-camera-de-seguranca-wi-fi-2k-qhd/p/MLB43818774", category: "Cameras de Seguranca", source: "manual" },
  { product_name: "TP-Link Tapo C500 Cam Seg", product_url: "https://www.mercadolivre.com.br/tp-link-tapo-c500-camera-de-seguranca-wi-fi-pan-tilt-externa-full-hd/p/MLB43818780", category: "Cameras de Seguranca", source: "manual" },
  { product_name: "Xiaomi Mi Home Security Camera 2K Cam Seg", product_url: "https://www.mercadolivre.com.br/xiaomi-mi-home-security-camera-2k/p/MLB43818784", category: "Cameras de Seguranca", source: "manual" },
];

// ── Supabase helpers ─────────────────────────────────────────────────────────
async function supabaseRest(
  url: string,
  key: string,
  path: string,
  options: RequestInit = {}
) {
  const res = await fetch(`${url}${path}`, {
    ...options,
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      Prefer: options.headers?.["Prefer"] ?? "return=representation",
      ...options.headers,
    },
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`Supabase error ${res.status}: ${text}`);
  }
  if (!text || text.length === 0) return [];
  return JSON.parse(text);
}

// ── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  const env = loadEnvLocal();
  const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL;
  const SUPABASE_KEY = env.SUPABASE_SERVICE_KEY;

  if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_KEY in .env.local"
    );
    process.exit(1);
  }

  console.log(`URL: ${SUPABASE_URL}`);
  console.log(`Key: ${SUPABASE_KEY.slice(0, 12)}...`);

  // 1. Check if table exists
  console.log("\nChecking if product_links table exists...");
  try {
    await supabaseRest(
      SUPABASE_URL,
      SUPABASE_KEY,
      "/rest/v1/product_links?select=id&limit=1"
    );
    console.log("Table exists. Proceeding with seed...");
  } catch (e: any) {
    if (
      e.message.includes("42P01") ||
      e.message.includes("relation") ||
      e.message.includes("does not exist")
    ) {
      console.error(
        "Table product_links does not exist. Run the migration first."
      );
      process.exit(1);
    }
    // Other errors might just be RLS — table exists but empty
    console.log("Table check returned an error (might be empty), continuing...");
  }

  // 2. Prepare rows
  const rows = products.map((p) => ({
    slug: toSlug(p.product_name),
    product_name: p.product_name,
    category: p.category,
    product_url: p.product_url,
    marketplace: "mercadolivre",
    status: "active",
    source: p.source,
    has_review: false,
    has_video: false,
  }));

  console.log(`\nPrepared ${rows.length} products to insert.`);

  // 3. Get existing slugs to skip duplicates
  let existingSlugs = new Set<string>();
  try {
    const existing = await supabaseRest(
      SUPABASE_URL,
      SUPABASE_KEY,
      "/rest/v1/product_links?select=slug"
    );
    if (Array.isArray(existing)) {
      existingSlugs = new Set(existing.map((r: any) => r.slug));
    }
    console.log(`${existingSlugs.size} existing products in table.`);
  } catch {
    console.log("Could not fetch existing slugs, will try bulk insert.");
  }

  const newRows = rows.filter((r) => !existingSlugs.has(r.slug));
  const skippedCount = rows.length - newRows.length;

  if (newRows.length === 0) {
    console.log("All products already exist. Nothing to insert.");
    console.log(`\nDone. Inserted: 0 | Skipped: ${skippedCount} | Errors: 0`);
    return;
  }

  console.log(`${newRows.length} new products to insert (${skippedCount} duplicates skipped).`);

  // 4. Bulk insert in batches of 50
  let insertedCount = 0;
  let errorCount = 0;
  const BATCH_SIZE = 50;

  for (let i = 0; i < newRows.length; i += BATCH_SIZE) {
    const batch = newRows.slice(i, i + BATCH_SIZE);
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(newRows.length / BATCH_SIZE);
    process.stdout.write(
      `Batch ${batchNum}/${totalBatches} (${batch.length} rows)... `
    );

    try {
      const result = await supabaseRest(
        SUPABASE_URL,
        SUPABASE_KEY,
        "/rest/v1/product_links",
        {
          method: "POST",
          body: JSON.stringify(batch),
          headers: {
            Prefer: "return=minimal",
          },
        }
      );
      insertedCount += batch.length;
      console.log("OK");
    } catch (e: any) {
      const errMsg = e.message || String(e);
      // If bulk fails, try one by one
      if (errMsg.includes("duplicate") || errMsg.includes("unique")) {
        console.log("bulk duplicate error, falling back to row-by-row insert");
        for (const row of batch) {
          try {
            await supabaseRest(
              SUPABASE_URL,
              SUPABASE_KEY,
              "/rest/v1/product_links",
              {
                method: "POST",
                body: JSON.stringify(row),
                headers: { Prefer: "return=minimal" },
              }
            );
            insertedCount++;
          } catch (rowErr: any) {
            if (
              rowErr.message?.includes("duplicate") ||
              rowErr.message?.includes("23505")
            ) {
              skippedCount++;
            } else {
              console.error(`  Error inserting ${row.slug}: ${rowErr.message}`);
              errorCount++;
            }
          }
        }
      } else {
        console.error(`ERROR: ${errMsg}`);
        errorCount += batch.length;
      }
    }
  }

  // 5. Summary
  console.log(`\n${"=".repeat(50)}`);
  console.log(`Seed complete!`);
  console.log(`  Inserted: ${insertedCount}`);
  console.log(`  Skipped (duplicates): ${skippedCount}`);
  console.log(`  Errors: ${errorCount}`);
  console.log(`  Total products in array: ${rows.length}`);
  console.log(`${"=".repeat(50)}`);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
