'use client';

import React, { useState, useEffect } from 'react';
import LayoutComponent from '@/components/LayoutComponent';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Badge } from '@/components/ui/Badge';
import { 
  Calculator, 
  Users, 
  FolderOpen, 
  DollarSign, 
  Info,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { useTranslations } from 'next-intl';

interface PricingCalculation {
  accounts: number;
  projects: number;
  firstMonthPrice: number;
  subsequentMonthPrice: number;
  installationFee: number;
  totalFirstMonth: number;
  totalSubsequentMonth: number;
}

export default function PricingPage() {
  const t = useTranslations('pricingPage');
  const [accounts, setAccounts] = useState<number | string>(150);
  const [projects, setProjects] = useState<number | string>(4);
  const [calculation, setCalculation] = useState<PricingCalculation | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    calculatePricing();
  }, [accounts, projects]);

  const calculatePricing = async () => {
    // Не рассчитываем, если поля пустые или значения меньше минимума
    if (accounts === '' || projects === '' || 
        (typeof accounts === 'number' && accounts < 150) || 
        (typeof projects === 'number' && projects < 4)) {
      setCalculation(null);
      return;
    }

    // Преобразуем в числа для расчетов
    const accountsNum = typeof accounts === 'number' ? accounts : parseInt(accounts as string);
    const projectsNum = typeof projects === 'number' ? projects : parseInt(projects as string);

    setIsLoading(true);
    setError(null);

    try {
      // Получаем настройки цен из API
      const response = await fetch('/api/admin/pricing', {
        cache: 'no-cache',
        headers: {
          'Cache-Control': 'no-cache'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch pricing settings');
      }

      const pricingSettings = await response.json();
      
      // Рассчитываем цены
      const basePricePerAccount = pricingSettings.monthlyPricePerAccount;
      const installationFeePerProject = pricingSettings.installationPrice;
      
      // Находим скидку для количества проектов
      let discountMultiplier = 1.0;
      if (projectsNum <= 10) {
        discountMultiplier = pricingSettings.discountMultipliers[projectsNum.toString()] || 1.0;
      } else {
        // Для более чем 10 проектов используем скидку для 10 проектов
        discountMultiplier = pricingSettings.discountMultipliers['10'] || 1.0;
      }

      // Расчет ежемесячной подписки:
      // 1. Цена за один проект без скидки = количество аккаунтов × цена за аккаунт
      const basePricePerProject = accountsNum * basePricePerAccount;
      // 2. Цена за один проект со скидкой = базовая цена × (1 - скидка)
      const discountedPricePerProject = basePricePerProject * discountMultiplier;
      // 3. Общая ежемесячная подписка = цена за один проект со скидкой × количество проектов
      const monthlySubscription = discountedPricePerProject * projectsNum;
      const installationFee = installationFeePerProject * projectsNum;

      const calc: PricingCalculation = {
        accounts: accountsNum,
        projects: projectsNum,
        firstMonthPrice: monthlySubscription,
        subsequentMonthPrice: monthlySubscription,
        installationFee,
        totalFirstMonth: monthlySubscription + installationFee,
        totalSubsequentMonth: monthlySubscription
      };

      setCalculation(calc);
    } catch (err) {
      console.error('Error calculating pricing:', err);
      setError('Ошибка при расчете цен. Попробуйте позже.');
    } finally {
      setIsLoading(false);
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(price);
  };


  return (
    <LayoutComponent>
      <div className="py-12">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Заголовок */}
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
              {t('title')}
            </h1>
            <p className="text-xl text-gray-600 dark:text-gray-400 max-w-3xl mx-auto">
              {t('description')}
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Форма ввода */}
            <Card className="p-8">
              <div className="flex items-center mb-6">
                <Calculator className="w-6 h-6 text-blue-600 dark:text-blue-400 mr-3" />
                <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
                  {t('calculationParameters')}
                </h2>
              </div>

              <div className="space-y-6">
                <div>
                  <Label htmlFor="accounts" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {t('accountsCount')}
                  </Label>
                  <div className="relative mt-2">
                    <Users className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <Input
                      id="accounts"
                      type="number"
                      value={accounts}
                      onChange={(e) => {
                        const value = e.target.value;
                        if (value === '') {
                          setAccounts('');
                        } else {
                          const parsed = parseInt(value);
                          setAccounts(isNaN(parsed) ? '' : parsed);
                        }
                      }}
                      onBlur={(e) => {
                        const value = e.target.value;
                        if (value === '' || parseInt(value) < 150) {
                          setAccounts(150);
                        }
                      }}
                      className="pl-12"
                      min="150"
                    />
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    {t('minimumAccounts')}
                  </p>
                </div>

                <div>
                  <Label htmlFor="projects" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {t('projectsCount')}
                  </Label>
                  <div className="relative mt-2">
                    <FolderOpen className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <Input
                      id="projects"
                      type="number"
                      value={projects}
                      onChange={(e) => {
                        const value = e.target.value;
                        if (value === '') {
                          setProjects('');
                        } else {
                          const parsed = parseInt(value);
                          setProjects(isNaN(parsed) ? '' : parsed);
                        }
                      }}
                      onBlur={(e) => {
                        const value = e.target.value;
                        if (value === '' || parseInt(value) < 4) {
                          setProjects(4);
                        }
                      }}
                      className="pl-12"
                      min="4"
                    />
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    {t('minimumProjects')}
                  </p>
                </div>
              </div>

            </Card>

            {/* Результат расчета */}
            <Card className="p-8">
              <div className="flex items-center mb-6">
                <DollarSign className="w-6 h-6 text-green-600 dark:text-green-400 mr-3" />
                <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
                  {t('cost')}
                </h2>
              </div>

              {isLoading ? (
                <div className="flex items-center justify-center h-32">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : error ? (
                <div className="flex items-center p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
                  <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 mr-2" />
                  <span className="text-sm text-red-800 dark:text-red-200">{error}</span>
                </div>
              ) : calculation ? (
                <div className="space-y-6">
                  {/* Первый месяц */}
                  <div className="p-6 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-4">
                      {t('firstMonth')}
                    </h3>
                    <div className="space-y-3">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600 dark:text-gray-400">
                          {t('monthlySubscription')} ({calculation.projects} {calculation.projects === 1 ? t('project') : calculation.projects < 5 ? t('projects2') : t('projects')}):
                        </span>
                        <span>{formatPrice(calculation.firstMonthPrice)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600 dark:text-gray-400">
                          {t('installationFee')} ({calculation.projects} {calculation.projects === 1 ? t('project') : calculation.projects < 5 ? t('projects2') : t('projects')}):
                        </span>
                        <span>{formatPrice(calculation.installationFee)}</span>
                      </div>
                      <div className="border-t border-blue-200 dark:border-blue-700 pt-3">
                        <div className="flex justify-between text-lg font-semibold text-blue-900 dark:text-blue-100">
                          <span>{t('totalFirstMonth')}:</span>
                          <span>{formatPrice(calculation.totalFirstMonth)}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Последующие месяцы */}
                  <div className="p-6 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                      {t('subsequentMonths')}
                    </h3>
                    <div className="space-y-3">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600 dark:text-gray-400">
                          {t('monthlySubscription')} ({calculation.projects} {calculation.projects === 1 ? t('project') : calculation.projects < 5 ? t('projects2') : t('projects')}):
                        </span>
                        <span>{formatPrice(calculation.subsequentMonthPrice)}</span>
                      </div>
                      <div className="border-t border-gray-200 dark:border-gray-700 pt-3">
                        <div className="flex justify-between text-lg font-semibold text-gray-900 dark:text-gray-100">
                          <span>{t('totalPerMonth')}:</span>
                          <span>{formatPrice(calculation.totalSubsequentMonth)}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                </div>
              ) : (
                <div className="text-center text-gray-500 dark:text-gray-400 py-8">
                  {t('specifyParameters')}
                </div>
              )}
            </Card>
          </div>

          {/* Дополнительная информация */}
          <Card className="p-6 mt-8">
            <div className="flex items-start">
              <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 mr-3 mt-0.5" />
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  {t('importantInfo')}
                </h3>
                <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-2">
                  <li>• <strong>{t('firstMonth')}:</strong> {t('firstMonthInfo')}</li>
                  <li>• <strong>{t('subsequentMonths')}:</strong> {t('subsequentMonthsInfo')}</li>
                  <li>• <strong>{t('monthlySubscription')}:</strong> {t('discountsInfo')}</li>
                  <li>• <strong>{t('discount')}:</strong> {t('discountsInfo')}</li>
                  <li>• <strong>{t('newProjectsInfo')}:</strong> {t('newProjectsInfo')}</li>
                </ul>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </LayoutComponent>
  );
}