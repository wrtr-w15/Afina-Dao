'use client';

import React, { useState, useEffect } from 'react';
import AdminLayout from '@/components/admin/AdminLayout';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { 
  DollarSign, 
  Save, 
  AlertCircle,
  CheckCircle,
  Users,
  Calendar
} from 'lucide-react';
import { SubscriptionPricing, UpdateSubscriptionPricingData } from '@/types/pricing';

interface Message {
  type: 'success' | 'error';
  text: string;
}

export default function SubscriptionPricingPage() {
  const [pricing, setPricing] = useState<SubscriptionPricing[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<Message | null>(null);

  useEffect(() => {
    loadPricing();
  }, []);

  const loadPricing = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/subscription-pricing', {
        cache: 'no-cache',
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch subscription pricing');
      }
      
      const data = await response.json();
      setPricing(data);
    } catch (error) {
      console.error('Error loading pricing:', error);
      setMessage({ 
        type: 'error', 
        text: 'Ошибка загрузки цен: ' + (error instanceof Error ? error.message : 'Unknown error') 
      });
    } finally {
      setIsLoading(false);
    }
  };

  const savePricing = async () => {
    setIsSaving(true);
    try {
      const updateData: UpdateSubscriptionPricingData[] = pricing.map(p => ({
        periodMonths: p.periodMonths,
        monthlyPrice: p.monthlyPrice
      }));

      const response = await fetch('/api/subscription-pricing', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache'
        },
        body: JSON.stringify(updateData),
        cache: 'no-cache'
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update subscription pricing');
      }
      
      setMessage({ type: 'success', text: 'Цены успешно сохранены' });
      setTimeout(() => setMessage(null), 3000);
      await loadPricing(); // Перезагружаем данные
    } catch (error) {
      console.error('Error saving pricing:', error);
      setMessage({ 
        type: 'error', 
        text: 'Ошибка сохранения цен: ' + (error instanceof Error ? error.message : 'Unknown error') 
      });
    } finally {
      setIsSaving(false);
    }
  };

  const updatePrice = (periodMonths: number, monthlyPrice: number) => {
    setPricing(prev => prev.map(p => 
      p.periodMonths === periodMonths 
        ? { ...p, monthlyPrice } 
        : p
    ));
  };

  const calculateTotal = (periodMonths: number, monthlyPrice: number) => {
    return periodMonths * monthlyPrice;
  };

  const calculateSavings = (periodMonths: number, monthlyPrice: number) => {
    if (periodMonths === 1) return 0;
    
    // Находим базовую цену (1 месяц)
    const basePrice = pricing.find(p => p.periodMonths === 1)?.monthlyPrice || monthlyPrice;
    const totalBase = basePrice * periodMonths;
    const totalCurrent = monthlyPrice * periodMonths;
    
    return totalBase - totalCurrent;
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
              Управление ценами подписок
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Настройка цен для страницы Private Community
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

          <Card className="p-6">
            <div className="flex items-center mb-6">
              <Users className="w-6 h-6 text-blue-600 dark:text-blue-400 mr-3" />
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Цены подписок
              </h2>
            </div>

            <div className="space-y-6">
              {pricing.map((item) => {
                const total = calculateTotal(item.periodMonths, item.monthlyPrice);
                const savings = calculateSavings(item.periodMonths, item.monthlyPrice);
                
                return (
                  <div key={item.periodMonths} className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <Calendar className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                          {item.periodMonths} {item.periodMonths === 1 ? 'месяц' : item.periodMonths < 5 ? 'месяца' : 'месяцев'}
                        </h3>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <div>
                        <Label htmlFor={`price-${item.periodMonths}`} className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          Цена за месяц ($)
                        </Label>
                        <div className="relative mt-2">
                          <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                          <Input
                            id={`price-${item.periodMonths}`}
                            type="number"
                            step="0.01"
                            min="0"
                            value={item.monthlyPrice}
                            onChange={(e) => updatePrice(item.periodMonths, parseFloat(e.target.value) || 0)}
                            className="pl-10"
                            placeholder="99.00"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                          <span className="font-medium">Полная стоимость:</span>{' '}
                          <span className="text-lg font-bold text-gray-900 dark:text-white">
                            ${total.toFixed(2)}
                          </span>
                        </div>
                        {savings > 0 && (
                          <div className="text-sm text-green-600 dark:text-green-400">
                            <span className="font-medium">Экономия:</span>{' '}
                            <span className="font-bold">${savings.toFixed(2)}</span>
                          </div>
                        )}
                        {item.periodMonths === 1 && (
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            Базовая цена
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>

          {/* Кнопка сохранения */}
          <div className="mt-8 flex justify-end">
            <Button
              onClick={savePricing}
              disabled={isSaving}
              className="flex items-center"
            >
              {isSaving ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              {isSaving ? 'Сохранение...' : 'Сохранить цены'}
            </Button>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}

