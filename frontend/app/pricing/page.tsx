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

// Стили для чекбокса без hover-эффекта, но с плавной анимацией
const checkboxStyles = `
  .custom-checkbox {
    appearance: none;
    -webkit-appearance: none;
    position: relative;
  }
  
  .custom-checkbox:focus {
    outline: none;
    box-shadow: none;
  }
  
  /* Четкая галочка из векторных линий */
  .custom-checkbox:checked::after {
    content: '';
    position: absolute;
    left: 50%;
    top: 50%;
    width: 4px;
    height: 8px;
    border: solid white;
    border-width: 0 2px 2px 0;
    transform: translate(-50%, -60%) rotate(45deg);
    animation: checkmark 0.3s cubic-bezier(0.68, -0.55, 0.265, 1.55);
  }
  
  @keyframes checkmark {
    0% {
      transform: translate(-50%, -60%) rotate(45deg) scale(0);
      opacity: 0;
    }
    50% {
      transform: translate(-50%, -60%) rotate(45deg) scale(1.1);
    }
    100% {
      transform: translate(-50%, -60%) rotate(45deg) scale(1);
      opacity: 1;
    }
  }
`;

interface PricingCalculation {
  accounts: number;
  projects: number;
  firstMonthPrice: number;
  subsequentMonthPrice: number;
  installationFee: number;
  totalFirstMonth: number;
  totalSubsequentMonth: number;
  serverCost: number;
  proxyCost: number;
  serversCount: number;
  proxiesCount: number;
}

export default function PricingPage() {
  const t = useTranslations('pricingPage');
  const [accounts, setAccounts] = useState<number | string>(200);
  const [projects, setProjects] = useState<number | string>(4);
  const [ownProxies, setOwnProxies] = useState(false);
  const [calculation, setCalculation] = useState<PricingCalculation | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    calculatePricing();
  }, [accounts, projects, ownProxies]);

  const calculatePricing = async () => {
    // Не рассчитываем, если поля пустые или значения меньше минимума
    if (accounts === '' || projects === '' || 
        (typeof accounts === 'number' && accounts < 200) || 
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

      // Расчет стоимости серверов: 1 сервер ($65) на каждые 500 аккаунтов
      const serversCount = Math.ceil(accountsNum / 500);
      const serverCost = serversCount * 65;

      // Расчет стоимости прокси: каждые 300 аккаунтов = 100 прокси по $1.2 за прокси
      const proxiesCount = ownProxies ? 0 : Math.ceil(accountsNum / 300) * 100;
      const proxyCost = ownProxies ? 0 : proxiesCount * 1.2;

      const calc: PricingCalculation = {
        accounts: accountsNum,
        projects: projectsNum,
        firstMonthPrice: monthlySubscription,
        subsequentMonthPrice: monthlySubscription,
        installationFee,
        totalFirstMonth: monthlySubscription + installationFee + serverCost + proxyCost,
        totalSubsequentMonth: monthlySubscription + serverCost + proxyCost,
        serverCost,
        proxyCost,
        serversCount,
        proxiesCount
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
      maximumFractionDigits: 2
    }).format(price);
  };


  return (
    <LayoutComponent>
      <style dangerouslySetInnerHTML={{ __html: checkboxStyles }} />
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
                        if (value === '' || parseInt(value) < 200) {
                          setAccounts(200);
                        }
                      }}
                      className="pl-12"
                      min="200"
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

                <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                  <div className="flex items-center space-x-3">
                    <input
                      id="ownProxies"
                      type="checkbox"
                      checked={ownProxies}
                      onChange={(e) => setOwnProxies(e.target.checked)}
                      className="custom-checkbox w-5 h-5 bg-white dark:bg-gray-700 border-2 border-gray-300 dark:border-gray-600 rounded transition-all duration-300 ease-in-out checked:bg-gray-600 dark:checked:bg-gray-500 checked:border-gray-600 dark:checked:border-gray-500 cursor-pointer"
                    />
                    <label htmlFor="ownProxies" className="flex-1 text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer">
                      {t('ownProxies')}
                    </label>
                    <div className="group relative">
                      <Info className="w-4 h-4 text-gray-400 dark:text-gray-500 cursor-help transition-colors duration-200" />
                      <div className="absolute right-0 top-6 w-64 p-3 bg-gray-900 dark:bg-gray-800 text-white text-xs rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-10 border border-gray-700">
                        <div className="absolute -top-1 right-3 w-2 h-2 bg-gray-900 dark:bg-gray-800 border-t border-l border-gray-700 transform rotate-45"></div>
                        {t('ownProxiesInfo')}
                      </div>
                    </div>
                  </div>
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
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600 dark:text-gray-400">
                          {t('servers')} ({calculation.serversCount} {t('pieces')}):
                        </span>
                        <span>{formatPrice(calculation.serverCost)}</span>
                      </div>
                      {!ownProxies && (
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600 dark:text-gray-400">
                            {t('proxies')} ({calculation.proxiesCount} {t('pieces')}):
                          </span>
                          <span>{formatPrice(calculation.proxyCost)}</span>
                        </div>
                      )}
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
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600 dark:text-gray-400">
                          {t('servers')} ({calculation.serversCount} {t('pieces')}):
                        </span>
                        <span>{formatPrice(calculation.serverCost)}</span>
                      </div>
                      {!ownProxies && (
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600 dark:text-gray-400">
                            {t('proxies')} ({calculation.proxiesCount} {t('pieces')}):
                          </span>
                          <span>{formatPrice(calculation.proxyCost)}</span>
                        </div>
                      )}
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
                  <li>• <strong>{t('servers')}:</strong> {t('serversInfo')}</li>
                  <li>• <strong>{t('proxies')}:</strong> {t('proxiesInfo')}</li>
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