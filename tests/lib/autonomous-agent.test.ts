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
      expect(validateProductCategory('Geladeira Electrolux', 'Eletroportáteis')).toBe(false);
      expect(validateProductCategory('Refrigerador Brastemp', 'Eletroportáteis')).toBe(false);
    });

    it('should return true for unknown categories', () => {
      expect(validateProductCategory('Any Product', 'Unknown Category')).toBe(true);
    });
  });
});
