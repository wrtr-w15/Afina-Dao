'use client';

import React, { useState, useEffect } from 'react';
import Layout from '@/components/LayoutComponent';
import { Card } from '@/components/ui/Card';
import { Users, CheckCircle2, MessageCircle, ExternalLink, Sparkles, Activity, Fingerprint } from 'lucide-react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import ReflectiveCard from '@/components/ReflectiveCard';
import { SubscriptionPricing } from '@/types/pricing';

export default function PrivateCommunityPage() {
  const t = useTranslations('privateCommunity');
  const [pricing, setPricing] = useState<SubscriptionPricing[]>([]);
  const [isLoadingPricing, setIsLoadingPricing] = useState(true);
  
  const benefits = [
    { key: 'benefit1' },
    { key: 'benefit2' },
    { key: 'benefit3' },
    { key: 'benefit4' },
    { key: 'benefit5' },
    { key: 'benefit6' },
    { key: 'benefit7' },
    { key: 'benefit8' },
    { key: 'benefit9' },
    { key: 'benefit10' },
    { key: 'benefit11' },
    { key: 'benefit12' },
    { key: 'benefit13' }
  ];

  useEffect(() => {
    loadPricing();
  }, []);

  const loadPricing = async () => {
    try {
      const response = await fetch('/api/subscription-pricing', {
        cache: 'no-cache'
      });
      
      if (response.ok) {
        const data = await response.json();
        setPricing(data);
      }
    } catch (error) {
      console.error('Error loading pricing:', error);
    } finally {
      setIsLoadingPricing(false);
    }
  };

  const getPricingForPeriod = (periodMonths: number) => {
    return pricing.find(p => p.periodMonths === periodMonths);
  };

  const calculateTotal = (periodMonths: number, monthlyPrice: number) => {
    return periodMonths * monthlyPrice;
  };

  const calculateSavings = (periodMonths: number, monthlyPrice: number) => {
    if (periodMonths === 1) return 0;
    
    const basePrice = pricing.find(p => p.periodMonths === 1)?.monthlyPrice || monthlyPrice;
    const totalBase = basePrice * periodMonths;
    const totalCurrent = monthlyPrice * periodMonths;
    
    return totalBase - totalCurrent;
  };

  const formatPrice = (price: number) => {
    return price.toFixed(0);
  };
  
  return (
    <Layout title={t('title')} description={t('description')}>
      <div className="max-w-5xl mx-auto p-6">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center mb-6">
            <div className="p-3 bg-gradient-to-br from-blue-600 to-purple-600 rounded-full mr-4">
              <Users className="h-12 w-12 text-white" />
            </div>
            <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-400 dark:to-purple-400 bg-clip-text text-transparent">
              {t('header.title')}
            </h1>
          </div>
          <p className="text-lg text-gray-600 dark:text-gray-300 max-w-3xl mx-auto leading-relaxed">
            {t('header.subtitle')}
          </p>
        </div>

        {/* Main Content */}
        <div className="space-y-8">
          {/* Benefits Section */}
          <Card className="p-8 bg-gradient-to-br from-blue-50 via-purple-50 to-indigo-50 dark:from-blue-900/30 dark:via-purple-900/30 dark:to-indigo-900/30 border border-blue-200/50 dark:border-blue-800/30 shadow-lg">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg">
                <CheckCircle2 className="h-6 w-6 text-white" />
              </div>
              <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-400 dark:to-purple-400 bg-clip-text text-transparent">
                {t('benefits.title')}
              </h2>
            </div>
            <div className="space-y-4">
              {benefits.map((benefit, index) => (
                <div key={index} className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                  <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                    {t(`benefits.${benefit.key}`)}
                  </p>
                </div>
              ))}
            </div>
          </Card>

          {/* Pricing Cards Section */}
          <div className="mt-16">
            <h2 className="text-3xl font-bold text-center bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-400 dark:to-purple-400 bg-clip-text text-transparent mb-12">
              {t('pricing.title')}
            </h2>
            <div className="flex flex-wrap justify-center gap-6">
              {/* 1 Month Subscription */}
              <div className="w-[280px] h-[450px] relative flex-shrink-0">
                <ReflectiveCard
                  overlayColor="rgba(59, 130, 246, 0.05)"
                  blurStrength={8}
                  glassDistortion={10}
                  metalness={0.4}
                  roughness={0.6}
                  displacementStrength={20}
                  noiseScale={1.2}
                  specularConstant={1.5}
                  grayscale={0.8}
                  color="#1e293b"
                  className="mx-auto dark:text-white"
                  style={{ width: '280px', height: '450px' }}
                >
                  <div className="relative z-10 h-full flex flex-col justify-between p-6 text-gray-900 dark:text-white">
                    <div className="flex justify-between items-center border-b border-gray-300/30 dark:border-white/30 pb-4 mb-2">
                      <div className="flex items-center gap-1.5 text-[10px] font-extrabold tracking-[0.15em] px-4 py-2 bg-white dark:bg-gray-900 rounded-lg border-2 border-cyan-500 dark:border-cyan-400 shadow-2xl">
                        <Sparkles size={14} className="text-cyan-600 dark:text-cyan-400" />
                        <span className="text-cyan-700 dark:text-cyan-300 font-black">{t('pricing.period1.badge')}</span>
                      </div>
                      <Activity className="opacity-90 text-gray-900 dark:text-white" size={18} />
                    </div>

                    <div className="flex-1 flex flex-col justify-center items-center text-center gap-5">
                      <div className="w-full">
                        <div className="mb-6">
                          <h2 className="text-xl font-bold tracking-[0.05em] m-0 drop-shadow-md">
                            {t('pricing.period1.periodTitle')}
                          </h2>
                          <p className="text-xs tracking-[0.1em] opacity-80 m-0 mt-1">
                            {t('pricing.subscription')}
                          </p>
                        </div>
                        
                        <div className="space-y-4">
                          <div className="border-t border-gray-300/20 dark:border-white/20 pt-4">
                            <div className="text-[10px] uppercase tracking-[0.15em] opacity-60 mb-2">
                              {t('pricing.period1.pricePerMonth')}
                            </div>
                            <div className="flex items-baseline justify-center gap-1">
                              <span className="text-3xl font-bold">
                                {isLoadingPricing ? '...' : getPricingForPeriod(1) ? `$${formatPrice(getPricingForPeriod(1)!.monthlyPrice)}` : t('pricing.period1.monthlyPrice')}
                              </span>
                              <span className="text-sm opacity-80">
                                {t('pricing.period1.period')}
                              </span>
                            </div>
                          </div>
                          
                          <div className="border-t border-gray-300/20 dark:border-white/20 pt-4">
                            <div className="text-[10px] uppercase tracking-[0.15em] opacity-60 mb-2">
                              {t('pricing.period1.totalPrice')}
                            </div>
                            <div className="h-[3rem] flex items-center justify-center gap-2">
                              <div className="text-2xl font-bold">
                                {isLoadingPricing ? '...' : getPricingForPeriod(1) ? `$${formatPrice(calculateTotal(1, getPricingForPeriod(1)!.monthlyPrice))}` : t('pricing.period1.total')}
                              </div>
                              {t('pricing.period1.basePrice') && (
                                <div className="flex items-center gap-1 text-[10px] font-extrabold tracking-[0.15em] px-4 py-2 bg-white dark:bg-gray-900 rounded-lg border-2 border-cyan-500 dark:border-cyan-400 shadow-2xl">
                                  <Sparkles size={12} className="text-cyan-600 dark:text-cyan-400" />
                                  <span className="text-cyan-700 dark:text-cyan-300 font-black">{t('pricing.period1.basePrice')}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-center items-center border-t border-gray-300/30 dark:border-white/30 pt-4">
                      <div className="opacity-50">
                        <Fingerprint size={24} />
                      </div>
                    </div>
                  </div>
                </ReflectiveCard>
              </div>

              {/* 3 Months Subscription */}
              <div className="w-[280px] h-[450px] relative flex-shrink-0">
                <ReflectiveCard
                  overlayColor="rgba(147, 51, 234, 0.05)"
                  blurStrength={10}
                  glassDistortion={15}
                  metalness={0.4}
                  roughness={0.5}
                  displacementStrength={25}
                  noiseScale={1.5}
                  specularConstant={2.0}
                  grayscale={0.8}
                  color="#1e293b"
                  className="mx-auto dark:text-white"
                  style={{ width: '280px', height: '450px' }}
                >
                  <div className="relative z-10 h-full flex flex-col justify-between p-6 text-gray-900 dark:text-white">
                    <div className="flex justify-between items-center border-b border-gray-300/30 dark:border-white/30 pb-4 mb-2">
                      <div className="flex items-center gap-1.5 text-[10px] font-extrabold tracking-[0.15em] px-4 py-2 bg-white dark:bg-gray-900 rounded-lg border-2 border-amber-500 dark:border-amber-400 shadow-2xl">
                        <Sparkles size={14} className="text-amber-600 dark:text-amber-400" />
                        <span className="text-amber-700 dark:text-amber-300 font-black">{t('pricing.period3.badge')}</span>
                      </div>
                      <Activity className="opacity-90 text-gray-900 dark:text-white" size={18} />
                    </div>

                    <div className="flex-1 flex flex-col justify-center items-center text-center gap-5">
                      <div className="w-full">
                        <div className="mb-6">
                          <h2 className="text-xl font-bold tracking-[0.05em] m-0 drop-shadow-md">
                            {t('pricing.period3.periodTitle')}
                          </h2>
                          <p className="text-xs tracking-[0.1em] opacity-80 m-0 mt-1">
                            {t('pricing.subscription')}
                          </p>
                        </div>
                        
                        <div className="space-y-4">
                          <div className="border-t border-gray-300/20 dark:border-white/20 pt-4">
                            <div className="text-[10px] uppercase tracking-[0.15em] opacity-60 mb-2">
                              {t('pricing.period3.pricePerMonth')}
                            </div>
                            <div className="flex items-baseline justify-center gap-1">
                              <span className="text-3xl font-bold">
                                {isLoadingPricing ? '...' : getPricingForPeriod(3) ? `$${formatPrice(getPricingForPeriod(3)!.monthlyPrice)}` : t('pricing.period3.monthlyPrice')}
                              </span>
                              <span className="text-sm opacity-80">
                                {t('pricing.period3.period')}
                              </span>
                            </div>
                          </div>
                          
                          <div className="border-t border-gray-300/20 dark:border-white/20 pt-4">
                            <div className="text-[10px] uppercase tracking-[0.15em] opacity-60 mb-2">
                              {t('pricing.period3.totalPrice')}
                            </div>
                            <div className="h-[3rem] flex items-center justify-center gap-2">
                              <div className="text-2xl font-bold">
                                {isLoadingPricing ? '...' : getPricingForPeriod(3) ? `$${formatPrice(calculateTotal(3, getPricingForPeriod(3)!.monthlyPrice))}` : t('pricing.period3.total')}
                              </div>
                              {getPricingForPeriod(3) && calculateSavings(3, getPricingForPeriod(3)!.monthlyPrice) > 0 && (
                                <div className="flex items-center gap-1 text-[10px] font-extrabold tracking-[0.15em] px-4 py-2 bg-white dark:bg-gray-900 rounded-lg border-2 border-amber-500 dark:border-amber-400 shadow-2xl">
                                  <Sparkles size={12} className="text-amber-600 dark:text-amber-400" />
                                  <span className="text-amber-700 dark:text-amber-300 font-black">Экономия ${formatPrice(calculateSavings(3, getPricingForPeriod(3)!.monthlyPrice))}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-center items-center border-t border-gray-300/30 dark:border-white/30 pt-4">
                      <div className="opacity-50">
                        <Fingerprint size={24} />
                      </div>
                    </div>
                  </div>
                </ReflectiveCard>
              </div>

              {/* 6 Months Subscription */}
              <div className="w-[280px] h-[450px] relative flex-shrink-0">
                <ReflectiveCard
                  overlayColor="rgba(99, 102, 241, 0.05)"
                  blurStrength={12}
                  glassDistortion={20}
                  metalness={0.4}
                  roughness={0.4}
                  displacementStrength={30}
                  noiseScale={1.8}
                  specularConstant={2.5}
                  grayscale={0.8}
                  color="#1e293b"
                  className="mx-auto dark:text-white"
                  style={{ width: '280px', height: '450px' }}
                >
                  <div className="relative z-10 h-full flex flex-col justify-between p-6 text-gray-900 dark:text-white">
                    <div className="flex justify-between items-center border-b border-gray-300/30 dark:border-white/30 pb-4 mb-2">
                      <div className="flex items-center gap-1.5 text-[10px] font-extrabold tracking-[0.15em] px-4 py-2 bg-white dark:bg-gray-900 rounded-lg border-2 border-indigo-500 dark:border-indigo-400 shadow-2xl">
                        <Sparkles size={14} className="text-indigo-600 dark:text-indigo-400" />
                        <span className="text-indigo-700 dark:text-indigo-300 font-black">{t('pricing.period6.badge')}</span>
                      </div>
                      <Activity className="opacity-90 text-gray-900 dark:text-white" size={18} />
                    </div>

                    <div className="flex-1 flex flex-col justify-center items-center text-center gap-5">
                      <div className="w-full">
                        <div className="mb-6">
                          <h2 className="text-xl font-bold tracking-[0.05em] m-0 drop-shadow-md">
                            {t('pricing.period6.periodTitle')}
                          </h2>
                          <p className="text-xs tracking-[0.1em] opacity-80 m-0 mt-1">
                            {t('pricing.subscription')}
                          </p>
                        </div>
                        
                        <div className="space-y-4">
                          <div className="border-t border-gray-300/20 dark:border-white/20 pt-4">
                            <div className="text-[10px] uppercase tracking-[0.15em] opacity-60 mb-2">
                              {t('pricing.period6.pricePerMonth')}
                            </div>
                            <div className="flex items-baseline justify-center gap-1">
                              <span className="text-3xl font-bold">
                                {isLoadingPricing ? '...' : getPricingForPeriod(6) ? `$${formatPrice(getPricingForPeriod(6)!.monthlyPrice)}` : t('pricing.period6.monthlyPrice')}
                              </span>
                              <span className="text-sm opacity-80">
                                {t('pricing.period6.period')}
                              </span>
                            </div>
                          </div>
                          
                          <div className="border-t border-gray-300/20 dark:border-white/20 pt-4">
                            <div className="text-[10px] uppercase tracking-[0.15em] opacity-60 mb-2">
                              {t('pricing.period6.totalPrice')}
                            </div>
                            <div className="h-[3rem] flex items-center justify-center gap-2">
                              <div className="text-2xl font-bold">
                                {isLoadingPricing ? '...' : getPricingForPeriod(6) ? `$${formatPrice(calculateTotal(6, getPricingForPeriod(6)!.monthlyPrice))}` : t('pricing.period6.total')}
                              </div>
                              {getPricingForPeriod(6) && calculateSavings(6, getPricingForPeriod(6)!.monthlyPrice) > 0 && (
                                <div className="flex items-center gap-1 text-[10px] font-extrabold tracking-[0.15em] px-4 py-2 bg-white dark:bg-gray-900 rounded-lg border-2 border-indigo-500 dark:border-indigo-400 shadow-2xl">
                                  <Sparkles size={12} className="text-indigo-600 dark:text-indigo-400" />
                                  <span className="text-indigo-700 dark:text-indigo-300 font-black">Экономия ${formatPrice(calculateSavings(6, getPricingForPeriod(6)!.monthlyPrice))}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-center items-center border-t border-gray-300/30 dark:border-white/30 pt-4">
                      <div className="opacity-50">
                        <Fingerprint size={24} />
                      </div>
                    </div>
                  </div>
                </ReflectiveCard>
              </div>
            </div>
          </div>

          {/* Contact Section */}
          <div className="mt-16">
            <Card className="p-8 bg-gradient-to-br from-blue-50 via-purple-50 to-indigo-50 dark:from-blue-900/30 dark:via-purple-900/30 dark:to-indigo-900/30 border border-blue-200/50 dark:border-blue-800/30 shadow-lg">
              <div className="text-center mb-6">
                <div className="flex items-center justify-center gap-3 mb-4">
                  <div className="p-3 bg-blue-600 dark:bg-blue-500 rounded-full">
                    <MessageCircle className="h-6 w-6 text-white" />
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                    {t('contact.title')}
                  </h2>
                </div>
                <p className="text-gray-700 dark:text-gray-300 leading-relaxed max-w-2xl mx-auto">
                  {t('contact.description')}{' '}
                  <Link
                    href="/private-community/rules"
                    className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 underline font-medium transition-colors"
                  >
                    {t('contact.rulesLink')}
                  </Link>
                  {' '}{t('contact.descriptionEnd')}
                </p>
              </div>
              
              <div className="flex flex-wrap justify-center items-center gap-4 mt-8">
                <a
                  href="https://t.me/acycas"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group inline-flex items-center gap-3 px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-xl transition-all duration-300 font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                >
                  <MessageCircle className="h-5 w-5 group-hover:scale-110 transition-transform" />
                  <span>@acycas</span>
                  <ExternalLink className="h-4 w-4 opacity-80 group-hover:opacity-100 transition-opacity" />
                </a>
                <a
                  href="https://t.me/kirjeyy"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group inline-flex items-center gap-3 px-6 py-3 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white rounded-xl transition-all duration-300 font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                >
                  <MessageCircle className="h-5 w-5 group-hover:scale-110 transition-transform" />
                  <span>@kirjeyy</span>
                  <ExternalLink className="h-4 w-4 opacity-80 group-hover:opacity-100 transition-opacity" />
                </a>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </Layout>
  );
}

