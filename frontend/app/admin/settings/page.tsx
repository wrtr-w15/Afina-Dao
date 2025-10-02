'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AdminLayout from '@/components/admin/AdminLayout';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Badge } from '@/components/ui/Badge';
import { 
  Settings, 
  Save, 
  DollarSign, 
  Percent, 
  Calculator,
  AlertCircle,
  CheckCircle
} from 'lucide-react';

interface PricingSettings {
  oneTimeInstallationPrice: number;
  monthlyPricePerAccount: number;
  discounts: { [key: number]: number };
}

interface Message {
  type: 'success' | 'error';
  text: string;
}

export default function AdminSettingsPage() {
  const router = useRouter();
  const [settings, setSettings] = useState<PricingSettings>({
    oneTimeInstallationPrice: 0,
    monthlyPricePerAccount: 0,
    discounts: {}
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<Message | null>(null);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/admin/pricing', {
        cache: 'no-cache',
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch pricing settings');
      }
      
      const pricingSettings = await response.json();
      
      // Преобразуем данные из API в локальный формат
      const discounts: { [key: number]: number } = {};
      Object.entries(pricingSettings.discountMultipliers).forEach(([key, value]) => {
        const projectCount = parseInt(key);
        // Преобразуем множитель в процент скидки
        discounts[projectCount] = Math.round((1 - (value as number)) * 100);
      });
      
      setSettings({
        oneTimeInstallationPrice: pricingSettings.installationPrice,
        monthlyPricePerAccount: pricingSettings.monthlyPricePerAccount,
        discounts
      });
    } catch (error) {
      console.error('Error loading settings:', error);
      setMessage({ type: 'error', text: 'Ошибка загрузки настроек: ' + (error instanceof Error ? error.message : 'Unknown error') });
    } finally {
      setIsLoading(false);
    }
  };

  const saveSettings = async () => {
    setIsSaving(true);
    try {
      // Преобразуем локальные данные в формат API
      const discountMultipliers: Record<string, number> = {};
      Object.entries(settings.discounts).forEach(([key, value]) => {
        const projectCount = parseInt(key);
        discountMultipliers[projectCount.toString()] = 1 - (value / 100);
      });
      
      const response = await fetch('/api/admin/pricing', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache'
        },
        body: JSON.stringify({
          installationPrice: settings.oneTimeInstallationPrice,
          monthlyPricePerAccount: settings.monthlyPricePerAccount,
          discountMultipliers
        }),
        cache: 'no-cache'
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update pricing settings');
      }
      
      setMessage({ type: 'success', text: 'Настройки успешно сохранены' });
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      console.error('Error saving settings:', error);
      setMessage({ type: 'error', text: 'Ошибка сохранения настроек: ' + (error instanceof Error ? error.message : 'Unknown error') });
    } finally {
      setIsSaving(false);
    }
  };

  const updateDiscount = (projectCount: number, discount: number) => {
    setSettings(prev => ({
      ...prev,
      discounts: {
        ...prev.discounts,
        [projectCount]: discount
      }
    }));
  };

  const calculatePrice = (projectCount: number) => {
    const basePrice = settings.monthlyPricePerAccount * projectCount;
    const discount = settings.discounts[projectCount] || 0;
    const discountedPrice = basePrice * (1 - discount / 100);
    return {
      base: basePrice,
      discounted: discountedPrice,
      savings: basePrice - discountedPrice
    };
  };

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="p-8">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="p-8">
        <div className="max-w-4xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              Настройки цен
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Управление ценами и скидками для проектов
            </p>
          </div>

          {message && (
            <div className={`mb-6 p-4 rounded-lg flex items-center ${
              message.type === 'success' 
                ? 'bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-200' 
                : 'bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-200'
            }`}>
              {message.type === 'success' ? (
                <CheckCircle className="w-5 h-5 mr-2" />
              ) : (
                <AlertCircle className="w-5 h-5 mr-2" />
              )}
              {message.text}
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Основные настройки */}
            <Card className="p-6">
              <div className="flex items-center mb-6">
                <Settings className="w-6 h-6 text-blue-600 dark:text-blue-400 mr-3" />
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  Основные настройки
                </h2>
              </div>

              <div className="space-y-6">
                <div>
                  <Label htmlFor="installation-price" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Цена установки (одноразово)
                  </Label>
                  <div className="relative mt-2">
                    <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                      id="installation-price"
                      type="number"
                      value={settings.oneTimeInstallationPrice}
                      onChange={(e) => setSettings(prev => ({
                        ...prev,
                        oneTimeInstallationPrice: parseFloat(e.target.value) || 0
                      }))}
                      className="pl-10"
                      placeholder="1000"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="monthly-price" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Ежемесячная цена за аккаунт
                  </Label>
                  <div className="relative mt-2">
                    <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                      id="monthly-price"
                      type="number"
                      value={settings.monthlyPricePerAccount}
                      onChange={(e) => setSettings(prev => ({
                        ...prev,
                        monthlyPricePerAccount: parseFloat(e.target.value) || 0
                      }))}
                      className="pl-10"
                      placeholder="100"
                    />
                  </div>
                </div>
              </div>
            </Card>

            {/* Скидки */}
            <Card className="p-6">
              <div className="flex items-center mb-6">
                <Percent className="w-6 h-6 text-green-600 dark:text-green-400 mr-3" />
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  Скидки по количеству проектов
                </h2>
              </div>

              <div className="space-y-4">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(projectCount => (
                  <div key={projectCount} className="flex items-center justify-between">
                    <div className="flex items-center">
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300 w-8">
                        {projectCount}
                      </span>
                      <span className="text-sm text-gray-500 dark:text-gray-400 ml-2">
                        {projectCount === 1 ? 'проект' : projectCount < 5 ? 'проекта' : 'проектов'}
                      </span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Input
                        type="number"
                        value={settings.discounts[projectCount] || 0}
                        onChange={(e) => updateDiscount(projectCount, parseFloat(e.target.value) || 0)}
                        className="w-20 text-center"
                        min="0"
                        max="100"
                      />
                      <span className="text-sm text-gray-500 dark:text-gray-400">%</span>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          {/* Предварительный просмотр */}
          <Card className="p-6 mt-8">
            <div className="flex items-center mb-6">
              <Calculator className="w-6 h-6 text-purple-600 dark:text-purple-400 mr-3" />
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Предварительный просмотр цен
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 3, 5, 10].map(projectCount => {
                const price = calculatePrice(projectCount);
                return (
                  <div key={projectCount} className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      {projectCount} {projectCount === 1 ? 'проект' : projectCount < 5 ? 'проекта' : 'проектов'}
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span>Базовая цена:</span>
                        <span>${price.base.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Со скидкой:</span>
                        <span className="font-medium">${price.discounted.toFixed(2)}</span>
                      </div>
                      {price.savings > 0 && (
                        <div className="flex justify-between text-sm text-green-600 dark:text-green-400">
                          <span>Экономия:</span>
                          <span>${price.savings.toFixed(2)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>

          {/* Кнопка сохранения */}
          <div className="mt-8 flex justify-end">
            <Button
              onClick={saveSettings}
              disabled={isSaving}
              className="flex items-center"
            >
              {isSaving ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              {isSaving ? 'Сохранение...' : 'Сохранить настройки'}
            </Button>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}