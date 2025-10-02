import { PricingSettings, CreatePricingSettingsData, UpdatePricingSettingsData, PricingCalculation } from '../types/pricing';

// Получить настройки цен
export async function getPricingSettings(): Promise<PricingSettings> {
  const response = await fetch('/api/admin/pricing', {
    cache: 'no-cache',
    headers: {
      'Cache-Control': 'no-cache',
      'Pragma': 'no-cache'
    }
  });
  
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Failed to fetch pricing settings');
  }
  
  return response.json();
}

// Создать новые настройки цен
export async function createPricingSettings(data: CreatePricingSettingsData): Promise<{ id: string; message: string }> {
  const response = await fetch('/api/admin/pricing', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache'
    },
    body: JSON.stringify(data),
    cache: 'no-cache'
  });
  
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Failed to create pricing settings');
  }
  
  return response.json();
}

// Обновить настройки цен
export async function updatePricingSettings(data: UpdatePricingSettingsData): Promise<{ message: string }> {
  const response = await fetch('/api/admin/pricing', {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache'
    },
    body: JSON.stringify(data),
    cache: 'no-cache'
  });
  
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Failed to update pricing settings');
  }
  
  return response.json();
}

// Рассчитать цену для определенного количества проектов
export async function calculatePricing(projectCount: number): Promise<PricingCalculation> {
  const response = await fetch(`/api/admin/pricing/calculate?projects=${projectCount}`, {
    cache: 'no-cache',
    headers: {
      'Cache-Control': 'no-cache'
    }
  });
  
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Failed to calculate pricing');
  }
  
  return response.json();
}

// Получить расчеты для всех возможных количеств проектов (1-10)
export async function getAllPricingCalculations(): Promise<PricingCalculation[]> {
  const calculations: PricingCalculation[] = [];
  
  for (let i = 1; i <= 10; i++) {
    try {
      const calculation = await calculatePricing(i);
      calculations.push(calculation);
    } catch (error) {
      console.error(`Failed to calculate pricing for ${i} projects:`, error);
    }
  }
  
  return calculations;
}