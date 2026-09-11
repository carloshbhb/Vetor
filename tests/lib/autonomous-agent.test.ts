import { describe, it, expect, vi, beforeEach } from 'vitest';
import { validateProductCategory } from '@/app/api/cron/autonomous-agent/route';

describe('Autonomous Agent - Category Validation', () => {
  describe('validateProductCategory', () => {
    it('should validate Robôs Aspiradores correctly', () => {
      expect(validateProductCategory('Robô Aspirador Xiaomi S20', 'Robôs Aspiradores')).toBe(true);
      expect(validateProductCategory('Robot L10s', 'Robôs Aspiradores')).toBe(true);
      expect(validateProductCategory('Electrolux ERB30', 'Robôs Aspiradores')).toBe(false);
      expect(validateProductCategory('Geladeira Brastemp', 'Robôs Aspiradores')).toBe(false);
    });

    it('should validate Fones de Ouvido correctly', () => {
      expect(validateProductCategory('Sony WF-1000XM5', 'Fones de Ouvido')).toBe(true);
      expect(validateProductCategory('AirPods Pro 2', 'Fones de Ouvido')).toBe(true);
      expect(validateProductCategory('Samsung Galaxy Watch', 'Fones de Ouvido')).toBe(false);
      expect(validateProductCategory('Notebook Dell', 'Fones de Ouvido')).toBe(false);
    });

    it('should validate Casa Inteligente correctly', () => {
      expect(validateProductCategory('Amazon Echo Dot', 'Casa Inteligente')).toBe(true);
      expect(validateProductCategory('Lâmpada Inteligente Philips', 'Casa Inteligente')).toBe(true);
      expect(validateProductCategory('Aspirador Robô', 'Casa Inteligente')).toBe(false);
      expect(validateProductCategory('Geladeira Frost Free', 'Casa Inteligente')).toBe(false);
    });

    it('should validate Wearables / Smartbands correctly', () => {
      expect(validateProductCategory('Xiaomi Mi Band 9', 'Wearables / Smartbands')).toBe(true);
      expect(validateProductCategory('Samsung Galaxy Watch 7', 'Wearables / Smartbands')).toBe(true);
      expect(validateProductCategory('Fone JBL', 'Wearables / Smartbands')).toBe(false);
      expect(validateProductCategory('Aspirador Robô', 'Wearables / Smartbands')).toBe(false);
    });

    it('should validate Notebooks correctly', () => {
      expect(validateProductCategory('MacBook Air M3', 'Notebooks')).toBe(true);
      expect(validateProductCategory('Lenovo IdeaPad 3i', 'Notebooks')).toBe(true);
      expect(validateProductCategory('iPad 10ª Geração', 'Notebooks')).toBe(false);
      expect(validateProductCategory('Samsung Galaxy Tab', 'Notebooks')).toBe(false);
    });

    it('should validate Tablets correctly', () => {
      expect(validateProductCategory('iPad 10ª Geração', 'Tablets')).toBe(true);
      expect(validateProductCategory('Samsung Galaxy Tab S9', 'Tablets')).toBe(true);
      expect(validateProductCategory('MacBook Air', 'Tablets')).toBe(false);
      expect(validateProductCategory('Notebook Dell', 'Tablets')).toBe(false);
    });

    it('should validate Câmeras de Segurança correctly', () => {
      expect(validateProductCategory('Intelbras iM3', 'Câmeras de Segurança')).toBe(true);
      expect(validateProductCategory('TP-Link Tapo C200', 'Câmeras de Segurança')).toBe(true);
      expect(validateProductCategory('Fone Bluetooth', 'Câmeras de Segurança')).toBe(false);
      expect(validateProductCategory('Smartwatch', 'Câmeras de Segurança')).toBe(false);
    });

    it('should validate Eletroportáteis correctly', () => {
      expect(validateProductCategory('Air Fryer Mondial', 'Eletroportáteis')).toBe(true);
      expect(validateProductCategory('Liquidificador Oster', 'Eletroportáteis')).toBe(true);
      expect(validateProductCategory('Ventilador de Coluna Mondial Super Turbo', 'Eletroportáteis')).toBe(true);
      expect(validateProductCategory('Geladeira Electrolux', 'Eletroportáteis')).toBe(false);
      expect(validateProductCategory('Refrigerador Brastemp', 'Eletroportáteis')).toBe(false);
    });

    it('should validate Acessórios para Games correctly', () => {
      expect(validateProductCategory('Controle Xbox Wireless', 'Acessórios para Games')).toBe(true);
      expect(validateProductCategory('Cadeira Gamer ThunderX3', 'Acessórios para Games')).toBe(true);
      expect(validateProductCategory('Teclado Mecânico Redragon Kumara', 'Acessórios para Games')).toBe(true);
      expect(validateProductCategory('Webcam Logitech C270', 'Acessórios para Games')).toBe(true);
      expect(validateProductCategory('Geladeira Brastemp', 'Acessórios para Games')).toBe(false);
      expect(validateProductCategory('Amazon Echo Dot', 'Acessórios para Games')).toBe(false);
      expect(validateProductCategory('Air Fryer Mondial', 'Acessórios para Games')).toBe(false);
    });

    it('should accept former dead fallback items (pool saturation fix)', () => {
      // Estes itens estavam no fallback mas SEMPRE falhavam na validação,
      // esvaziando o pool silenciosamente (zero artigos em 10/09/2026).
      expect(validateProductCategory('Amazfit Bip 5', 'Wearables / Smartbands')).toBe(true);
      expect(validateProductCategory('Amazfit GTS 4 Mini', 'Wearables / Smartbands')).toBe(true);
      expect(validateProductCategory('QCY T13', 'Fones de Ouvido')).toBe(true);
      expect(validateProductCategory('JBL Wave Flex', 'Fones de Ouvido')).toBe(true);
      expect(validateProductCategory('Nothing Ear (2)', 'Fones de Ouvido')).toBe(true);
      expect(validateProductCategory('Soundcore R50i', 'Fones de Ouvido')).toBe(true);
      expect(validateProductCategory('Xiaomi Pad 6', 'Tablets')).toBe(true);
      expect(validateProductCategory('Lenovo Tab M11', 'Tablets')).toBe(true);
      expect(validateProductCategory('Xiaomi Pad 7', 'Tablets')).toBe(true);
      expect(validateProductCategory('Robô Aspirador Electrolux ERB30', 'Robôs Aspiradores')).toBe(true);
      expect(validateProductCategory('Xiaomi Watch S3', 'Wearables / Smartbands')).toBe(true);
    });

    it('should return true for unknown categories', () => {
      expect(validateProductCategory('Any Product', 'Unknown Category')).toBe(true);
    });
  });
});
