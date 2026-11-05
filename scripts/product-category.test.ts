import assert from 'node:assert/strict';
import { inferProductCategory, isSourceLabelCategory } from '../src/lib/product-category';

// Rótulos de origem do afiliado nunca podem virar categoria editorial.
assert.equal(isSourceLabelCategory('Lista Social'), true);
assert.equal(isSourceLabelCategory('lista social'), true);
assert.equal(isSourceLabelCategory('Mercado Livre Frete Grátis'), true);
assert.equal(isSourceLabelCategory('Acessórios para Games'), false);

// Um review de PS5 não pode ficar em "Lista Social" nem virar acessório.
assert.equal(
  inferProductCategory('Console Sony Playstation 5 Edição Slim Disk 1tb Branco', '', 'Lista Social'),
  'Consoles',
);
assert.equal(
  inferProductCategory('Xbox Series S 512gb Ssd', '', 'Lista Social'),
  'Consoles',
);
assert.equal(
  inferProductCategory('Controle Gamesir G7 Pro Sem Fio Para Xbox, Pc E Android Prateado', '', 'Lista Social'),
  'Acessórios para Games',
);
// "Celular Hall" descreve o joystick, não o produto: não pode virar Smartphones.
assert.equal(
  inferProductCategory('Controle Gamesir Nova Lite 2 Sem Fio Pc Switch Celular Hall - Branco', '', 'Lista Social'),
  'Acessórios para Games',
);
assert.equal(
  inferProductCategory('Controle Sem Fio Para Playstation 5 Dualsense', '', 'Lista Social'),
  'Acessórios para Games',
);
// Controle remoto não é acessório de games.
assert.equal(
  inferProductCategory('Controle Remoto Universal Para Smart Tv', '', 'Lista Social'),
  'Geral',
);
assert.equal(
  inferProductCategory('Sensor Magnético Intelbras Mibo Asa 3001 Sem Fio', '', 'Lista Social'),
  'Casa Inteligente',
);
assert.equal(
  inferProductCategory('Echo Dot 5ª Geração Branco Amazon Smart Speaker Com Alexa Controle Por Voz', '', 'Lista Social'),
  'Casa Inteligente',
);
assert.equal(
  inferProductCategory('Fone Headphone Jbl Tune 520bt Bluetooth Branco', '', 'Lista Social'),
  'Fones de Ouvido',
);
assert.equal(
  inferProductCategory('Smartwatch Amazfit Bip 5', '', 'Lista Social'),
  'Wearables / Smartbands',
);
assert.equal(
  inferProductCategory('Tablet Samsung Galaxy Tab A9+ 128gb Wifi', '', 'Lista Social'),
  'Tablets',
);
assert.equal(
  inferProductCategory('Câmera De Segurança Intelbras Im5 Com Resolução 2mp', '', 'Lista Social'),
  'Câmeras de Segurança',
);
assert.equal(
  inferProductCategory('Aspirador Robô Xiaomi Robot Vacuum S10', '', 'Lista Social'),
  'Robôs Aspiradores',
);

// Sem inferência possível, o rótulo de origem ainda não pode ser usado.
assert.equal(inferProductCategory('Produto Sem Palavra Chave', '', 'Lista Social'), 'Geral');
assert.equal(inferProductCategory('Produto Sem Palavra Chave', '', null), 'Geral');

// Uma categoria editorial válida continua valendo.
assert.equal(inferProductCategory('Fone Bluetooth', '', 'Fones de Ouvido'), 'Fones de Ouvido');

console.log('Product category inference: OK');
