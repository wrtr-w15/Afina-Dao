'use client';

import React, { useState, useEffect } from 'react';
import AdminLayout from '@/components/admin/AdminLayout';
import { 
  Settings, 
  Save, 
  DollarSign, 
  Percent, 
  Calculator,
  AlertCircle,
  CheckCircle,
  Loader2,
  TrendingDown
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
  const [settings, setSettings] = useState<PricingSettings>({
    oneTimeInstallationPrice: 0,
    monthlyPricePerAccount: 0,
    discounts: {}
  });
  const [isLoading, setIsLoading] = useState(true);
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
      
      const discounts: { [key: number]: number } = {};
      Object.entries(pricingSettings.discountMultipliers).forEach(([key, value]) => {
        const projectCount = parseInt(key);
        discounts[projectCount] = Math.round((1 - (value as number)) * 100);
      });
      
      setSettings({
        oneTimeInstallationPrice: pricingSettings.installationPrice,
        monthlyPricePerAccount: pricingSettings.monthlyPricePerAccount,
        discounts
      });
    } catch (error) {
      console.error('Error loading settings:', error);
      setMessage({ type: 'error', text: 'Ошибка загрузки настроек' });
    } finally {
      setIsLoading(false);
    }
  };

  const saveSettings = async () => {
    setIsSaving(true);
    try {
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
        throw new Error(errorData.error || 'Failed to update');
      }
      
      setMessage({ type: 'success', text: 'Настройки сохранены' });
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      console.error('Error saving settings:', error);
      setMessage({ type: 'error', text: 'Ошибка сохранения' });
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

  const getProjectLabel = (count: number) => {
    if (count === 1) return 'проект';
    if (count < 5) return 'проекта';
    return 'проектов';
  };

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 text-indigo-500 animate-spin" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white mb-1">
            Настройки
          </h1>
          <p className="text-gray-400 text-sm">
            Управление ценами и скидками
          </p>
        </div>

        {/* Message */}
        {message && (
          <div className={`flex items-center gap-3 p-4 rounded-xl mb-6 ${
            message.type === 'success' 
              ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'
              : 'bg-red-500/10 border border-red-500/20 text-red-400'
          }`}>
            {message.type === 'success' ? (
              <CheckCircle className="h-5 w-5 flex-shrink-0" />
            ) : (
              <AlertCircle className="h-5 w-5 flex-shrink-0" />
            )}
            <span className="text-sm">{message.text}</span>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Base Prices */}
          <div className="rounded-2xl bg-white/5 border border-white/10 overflow-hidden">
            <div className="p-4 border-b border-white/5 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center">
                <Settings className="h-5 w-5 text-blue-400" />
              </div>
              <div>
                <h2 className="font-semibold text-white">Базовые цены</h2>
                <p className="text-xs text-gray-500">Основные настройки</p>
              </div>
            </div>
            
            <div className="p-5 space-y-5">
              <div>
                <label className="block text-sm text-gray-400 mb-2">
                  Цена установки (одноразово)
                </label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                  <input
                    type="number"
                    value={settings.oneTimeInstallationPrice}
                    onChange={(e) => setSettings(prev => ({
                      ...prev,
                      oneTimeInstallationPrice: parseFloat(e.target.value) || 0
                    }))}
                    className="w-full pl-10 pr-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-blue-500/50 transition-all"
                    placeholder="1000"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-2">
                  Ежемесячная цена за аккаунт
                </label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                  <input
                    type="number"
                    value={settings.monthlyPricePerAccount}
                    onChange={(e) => setSettings(prev => ({
                      ...prev,
                      monthlyPricePerAccount: parseFloat(e.target.value) || 0
                    }))}
                    className="w-full pl-10 pr-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-blue-500/50 transition-all"
                    placeholder="100"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Discounts */}
          <div className="rounded-2xl bg-white/5 border border-white/10 overflow-hidden">
            <div className="p-4 border-b border-white/5 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                <Percent className="h-5 w-5 text-emerald-400" />
              </div>
              <div>
                <h2 className="font-semibold text-white">Скидки</h2>
                <p className="text-xs text-gray-500">По количеству проектов</p>
              </div>
            </div>
            
            <div className="p-5">
              <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(projectCount => (
                  <div 
                    key={projectCount} 
                    className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02] hover:bg-white/5 transition-all"
                  >
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-lg bg-white/10 flex items-center justify-center text-sm font-medium text-white">
                        {projectCount}
                      </span>
                      <span className="text-sm text-gray-400">
                        {getProjectLabel(projectCount)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        value={settings.discounts[projectCount] || 0}
                        onChange={(e) => updateDiscount(projectCount, parseFloat(e.target.value) || 0)}
                        className="w-16 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-white text-center text-sm focus:outline-none focus:border-emerald-500/50 transition-all"
                        min="0"
                        max="100"
                      />
                      <span className="text-sm text-gray-500 w-4">%</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Preview */}
        <div className="rounded-2xl bg-white/5 border border-white/10 overflow-hidden mb-8">
          <div className="p-4 border-b border-white/5 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-violet-500/20 flex items-center justify-center">
              <Calculator className="h-5 w-5 text-violet-400" />
            </div>
            <div>
              <h2 className="font-semibold text-white">Предпросмотр цен</h2>
              <p className="text-xs text-gray-500">Примеры расчёта</p>
            </div>
          </div>
          
          <div className="p-5">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[1, 3, 5, 10].map(projectCount => {
                const price = calculatePrice(projectCount);
                const hasDiscount = price.savings > 0;
                
                return (
                  <div 
                    key={projectCount} 
                    className="p-4 rounded-xl bg-white/[0.03] border border-white/5"
                  >
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-2xl font-bold text-white">{projectCount}</span>
                      <span className="text-sm text-gray-500">{getProjectLabel(projectCount)}</span>
                    </div>
                    
                    <div className="space-y-1.5">
                      {hasDiscount && (
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-gray-500">Было:</span>
                          <span className="text-gray-500 line-through">${price.base.toFixed(0)}</span>
                        </div>
                      )}
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-400">Цена:</span>
                        <span className="text-lg font-bold text-white">${price.discounted.toFixed(0)}</span>
                      </div>
                      {hasDiscount && (
                        <div className="flex items-center gap-1 text-emerald-400 text-xs">
                          <TrendingDown className="h-3 w-3" />
                          <span>-${price.savings.toFixed(0)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end">
          <button
            onClick={saveSettings}
            disabled={isSaving}
            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-medium hover:from-indigo-600 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-indigo-500/25"
          >
            {isSaving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            {isSaving ? 'Сохранение...' : 'Сохранить'}
          </button>
        </div>
      </div>
    </AdminLayout>
  );
}
