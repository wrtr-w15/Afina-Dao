// Типы для настроек цен

export interface PricingSettings {
  id: string;
  installationPrice: number;
  monthlyPricePerAccount: number;
  discountMultipliers: Record<string, number>;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePricingSettingsData {
  installationPrice: number;
  monthlyPricePerAccount: number;
  discountMultipliers: Record<string, number>;
}

export interface UpdatePricingSettingsData {
  installationPrice?: number;
  monthlyPricePerAccount?: number;
  discountMultipliers?: Record<string, number>;
}

export interface PricingCalculation {
  projectCount: number;
  basePrice: number;
  discountMultiplier: number;
  discountedPrice: number;
  totalPrice: number;
}

// Типы для цен подписок на странице private-community
export interface SubscriptionPricing {
  id: string;
  periodMonths: number;
  monthlyPrice: number;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateSubscriptionPricingData {
  periodMonths: number;
  monthlyPrice: number;
}
