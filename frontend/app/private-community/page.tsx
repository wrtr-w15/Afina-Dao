'use client';

import React, { useState, useEffect, useRef } from 'react';
import Layout from '@/components/LayoutComponent';
import { 
  Zap, 
  Shield, 
  Code, 
  MessageCircle, 
  Lightbulb,
  Send,
  BookOpen,
  Check,
  TrendingUp,
  Star,
  LucideIcon,
  FileText,
  Calendar
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Tariff, TariffPrice } from '@/types/tariff';
import Link from 'next/link';

// Hook for scroll-triggered animations
function useScrollAnimation(threshold = 0.2) {
  const ref = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.unobserve(element);
        }
      },
      { threshold, rootMargin: '0px 0px -50px 0px' }
    );

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [threshold]);

  return { ref, isVisible };
}

interface RoadmapItemData {
  icon: LucideIcon;
  title: string;
  description: string;
  color: string;
}

// Roadmap item component with scroll animation
function RoadmapItem({ 
  item, 
  index, 
  isLeft 
}: { 
  item: RoadmapItemData; 
  index: number; 
  isLeft: boolean;
}) {
  const { ref, isVisible } = useScrollAnimation(0.15);
  const Icon = item.icon;

  return (
    <div
      ref={ref}
      className={`relative flex items-center gap-4 md:gap-8 ${
        isLeft ? 'md:flex-row' : 'md:flex-row-reverse'
      }`}
      style={{
        opacity: isVisible ? 1 : 0,
        transform: isVisible 
          ? 'translateY(0) translateX(0)' 
          : `translateY(30px) translateX(${isLeft ? '-20px' : '20px'})`,
        transition: `all 0.7s cubic-bezier(0.16, 1, 0.3, 1) ${index * 0.1}s`,
      }}
    >
      {/* Content Card */}
      <div className={`flex-1 ${isLeft ? 'md:text-right' : 'md:text-left'}`}>
        <div className={`
          p-5 md:p-6 rounded-2xl 
          bg-white/5 backdrop-blur-sm 
          border border-white/10 
          hover:bg-white/10 hover:border-white/20 
          transition-all duration-300
          ${isLeft ? 'md:ml-auto' : 'md:mr-auto'}
          md:max-w-md
        `}>
          <div className={`flex items-center gap-3 mb-3 ${isLeft ? 'md:flex-row-reverse' : ''}`}>
            <div 
              className={`p-2 rounded-xl bg-gradient-to-br ${item.color}`}
              style={{
                opacity: isVisible ? 1 : 0,
                transform: isVisible ? 'scale(1)' : 'scale(0.5)',
                transition: `all 0.5s cubic-bezier(0.16, 1, 0.3, 1) ${0.2 + index * 0.1}s`,
              }}
            >
              <Icon className="h-5 w-5 text-white" />
            </div>
            <h3 className="text-lg font-semibold text-white">
              {item.title}
            </h3>
          </div>
          <p className="text-gray-400 text-sm leading-relaxed">
            {item.description}
          </p>
        </div>
      </div>

      {/* Center dot */}
      <div 
        className="hidden md:flex items-center justify-center w-4 h-4 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 shadow-lg shadow-blue-500/30 z-10"
        style={{
          opacity: isVisible ? 1 : 0,
          transform: isVisible ? 'scale(1)' : 'scale(0)',
          transition: `all 0.4s cubic-bezier(0.16, 1, 0.3, 1) ${0.1 + index * 0.1}s`,
        }}
      />

      {/* Empty space for opposite side */}
      <div className="hidden md:block flex-1" />
    </div>
  );
}

// Pricing Card Component
function PricingCard({ 
  data, 
  isLoading, 
  basePrice,
  isVisible,
  index,
  t
}: {
  data: TariffPrice;
  isLoading: boolean;
  basePrice: number;
  isVisible: boolean;
  index: number;
  t: (key: string) => string;
}) {
  const isPop = data.isPopular;
  const total = data.periodMonths * data.monthlyPrice;
  const savings = data.periodMonths > 1 ? (basePrice * data.periodMonths) - total : 0;

  const features = [
    t('pricingSection.features.scripts'),
    t('pricingSection.features.support'),
    t('pricingSection.features.discord'),
    t('pricingSection.features.notion'),
  ];

  const getPeriodLabel = (months: number) => {
    if (months === 1) return t('pricingSection.period.month1');
    if (months === 3) return t('pricingSection.period.month3');
    if (months === 6) return t('pricingSection.period.month6');
    if (months === 12) return t('pricingSection.period.month12');
    return `${months} мес.`;
  };

  return (
    <div
      className={`
        relative group flex-1 min-w-[280px] max-w-[340px]
        ${isPop ? 'md:-mt-4 md:mb-4' : ''}
      `}
      style={{
        opacity: isVisible ? 1 : 0,
        transform: isVisible 
          ? 'translateY(0) scale(1)' 
          : 'translateY(30px) scale(0.95)',
        transition: `all 0.6s cubic-bezier(0.16, 1, 0.3, 1) ${index * 0.15}s`,
      }}
    >
      {/* Glow effect for popular */}
      {isPop && (
        <div className="absolute -inset-[1px] bg-gradient-to-b from-blue-500 via-purple-500 to-pink-500 rounded-3xl opacity-75 blur-sm group-hover:opacity-100 transition-opacity" />
      )}
      
      <div className={`
        relative h-full rounded-3xl overflow-hidden
        ${isPop 
          ? 'bg-gradient-to-b from-slate-900 to-slate-950' 
          : 'bg-white/[0.03] hover:bg-white/[0.06]'
        }
        border ${isPop ? 'border-white/20' : 'border-white/10 hover:border-white/20'}
        transition-all duration-500
      `}>
        <div className="p-6 md:p-8">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className={`
                p-2.5 rounded-xl 
                ${isPop 
                  ? 'bg-gradient-to-br from-blue-500 to-purple-600' 
                  : 'bg-white/10'
                }
              `}>
                <Calendar className={`h-5 w-5 ${isPop ? 'text-white' : 'text-gray-400'}`} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">{getPeriodLabel(data.periodMonths)}</h3>
                <p className="text-xs text-gray-500">
                  {data.periodMonths === 1 ? t('pricingSection.sublabel.starter') : t('pricingSection.sublabel.save')}
                </p>
              </div>
            </div>
            {isPop && (
              <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-500/30">
                <Star className="h-3 w-3 text-amber-400 fill-amber-400" />
                <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wide">{t('pricingSection.popular')}</span>
              </div>
            )}
          </div>

          {/* Price */}
          <div className="mb-6">
            <div className="flex items-baseline gap-1">
              <span className={`text-4xl md:text-5xl font-bold ${isPop ? 'text-white' : 'text-gray-100'}`}>
                {isLoading ? '...' : `${data.monthlyPrice.toFixed(0)}`}
              </span>
              <span className="text-gray-500 text-sm">USDT/{t('pricingSection.perMonth')}</span>
            </div>
            {data.periodMonths > 1 && (
              <div className="flex items-center gap-3 mt-2">
                <span className="text-sm text-gray-400">
                  {t('pricingSection.total')} <span className="text-white font-semibold">{total.toFixed(0)} USDT</span>
                </span>
                {savings > 0 && (
                  <span className="flex items-center gap-1 text-xs font-medium text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                    <TrendingUp className="h-3 w-3" />
                    −{savings.toFixed(0)} USDT
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Divider */}
          <div className={`h-px ${isPop ? 'bg-white/10' : 'bg-white/5'} mb-6`} />

          {/* Features */}
          <ul className="space-y-3">
            {features.map((feature, i) => (
              <li key={i} className="flex items-center gap-3">
                <div className={`
                  flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center
                  ${isPop 
                    ? 'bg-gradient-to-br from-blue-500 to-purple-600' 
                    : 'bg-white/10'
                  }
                `}>
                  <Check className="h-3 w-3 text-white" />
                </div>
                <span className="text-sm text-gray-300">{feature}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

const TELEGRAM_BOT_LINK = 'https://t.me/AfinaDaoBot';

const roadmapIcons: LucideIcon[] = [Code, Shield, MessageCircle, BookOpen, Lightbulb];
const roadmapColors = [
  'from-blue-500 to-cyan-500',
  'from-purple-500 to-pink-500',
  'from-indigo-500 to-violet-500',
  'from-amber-500 to-orange-500',
  'from-rose-500 to-red-500',
];

export default function PrivateCommunityPage() {
  const t = useTranslations('privateCommunity');
  const [tariff, setTariff] = useState<Tariff | null>(null);
  const [prices, setPrices] = useState<TariffPrice[]>([]);
  const [isLoadingPricing, setIsLoadingPricing] = useState(true);
  const pricingRef = useRef<HTMLDivElement>(null);
  const [pricingVisible, setPricingVisible] = useState(false);

  // Build roadmap items from translations
  const roadmapItems: RoadmapItemData[] = [1, 2, 3, 4, 5].map((num, index) => ({
    icon: roadmapIcons[index],
    title: t(`roadmap.item${num}.title`),
    description: t(`roadmap.item${num}.description`),
    color: roadmapColors[index],
  }));

  useEffect(() => {
    loadTariffs();
  }, []);

  useEffect(() => {
    const element = pricingRef.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setPricingVisible(true);
          observer.unobserve(element);
        }
      },
      { threshold: 0.1, rootMargin: '0px 0px -50px 0px' }
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const loadTariffs = async () => {
    try {
      // Загружаем активные тарифы (не кастомные, не архивные)
      const response = await fetch('/api/tariffs?activeOnly=true', { cache: 'no-cache' });
      if (response.ok) {
        const data = await response.json();
        if (data.tariffs && data.tariffs.length > 0) {
          // Берём первый активный тариф и его цены
          const activeTariff = data.tariffs[0] as Tariff;
          setTariff(activeTariff);
          setPrices(activeTariff.prices || []);
        }
      }
    } catch (error) {
      console.error('Error loading tariffs:', error);
    } finally {
      setIsLoadingPricing(false);
    }
  };

  // Sort prices by period months
  const sortedPrices = [...prices].sort((a, b) => a.periodMonths - b.periodMonths);
  const popularIndex = sortedPrices.findIndex(p => p.isPopular);
  
  let displayPricing: TariffPrice[] = sortedPrices;
  
  // If we have a popular item and at least 3 items, reorder to put popular in center
  if (popularIndex !== -1 && sortedPrices.length >= 3) {
    const popular = sortedPrices[popularIndex];
    const others = sortedPrices.filter(p => !p.isPopular);
    const middleIndex = Math.floor(others.length / 2);
    displayPricing = [
      ...others.slice(0, middleIndex),
      popular,
      ...others.slice(middleIndex)
    ];
  } else if (popularIndex !== -1 && sortedPrices.length === 2) {
    // With 2 items, popular goes second (right)
    const popular = sortedPrices[popularIndex];
    const other = sortedPrices.find(p => !p.isPopular);
    displayPricing = other ? [other, popular] : sortedPrices;
  }

  // Get base price (minimum period price) for savings calculation
  const basePrice = sortedPrices.length > 0 
    ? sortedPrices.reduce((min, p) => p.periodMonths < min.periodMonths ? p : min).monthlyPrice
    : 0;

  return (
    <Layout title={t('title')} description={t('description')}>
      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-500/20 mb-6">
            <Zap className="h-4 w-4 text-blue-400" />
            <span className="text-sm font-medium text-blue-400">Private Community</span>
          </div>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6">
            <span className="bg-gradient-to-r from-white via-blue-100 to-purple-200 bg-clip-text text-transparent">
              {t('header.title')}
            </span>
          </h1>
          <p className="text-lg md:text-xl text-gray-400 max-w-2xl mx-auto leading-relaxed">
            {t('header.subtitle')}
          </p>
        </div>

        {/* Roadmap Section */}
        <div className="mb-20">
          <div className="text-center mb-12">
            <h2 className="text-2xl md:text-3xl font-bold text-white mb-3">
              {t('roadmap.title')}
            </h2>
            <p className="text-gray-400">
              {t('roadmap.subtitle')}
            </p>
          </div>

          <div className="relative">
            {/* Vertical line */}
            <div className="absolute left-6 md:left-1/2 top-0 bottom-0 w-px bg-gradient-to-b from-blue-500/50 via-purple-500/50 to-transparent hidden md:block" />
            
            <div className="space-y-8 md:space-y-12">
              {roadmapItems.map((item, index) => (
                <RoadmapItem
                  key={index}
                  item={item}
                  index={index}
                  isLeft={index % 2 === 0}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Pricing Section */}
        <div ref={pricingRef} className="mb-16">
          <div className="text-center mb-10">
            <h2 className="text-2xl md:text-3xl font-bold text-white mb-3">
              {tariff?.name || t('pricingSection.title')}
            </h2>
            <p className="text-gray-400">
              {tariff?.description || t('pricingSection.subtitle')}
            </p>
          </div>

          {displayPricing.length > 0 ? (
            <div className="flex flex-col md:flex-row items-center justify-center gap-4 md:gap-6">
              {displayPricing.map((item, index) => (
                <PricingCard
                  key={item.id}
                  data={item}
                  isLoading={isLoadingPricing}
                  basePrice={basePrice}
                  isVisible={pricingVisible}
                  index={index}
                  t={t}
                />
              ))}
            </div>
          ) : (
            <div className="text-center text-gray-500 py-12">
              {isLoadingPricing ? 'Загрузка...' : 'Нет доступных тарифов'}
            </div>
          )}
        </div>

        {/* CTA */}
        <div 
          className="text-center"
          style={{
            opacity: pricingVisible ? 1 : 0,
            transform: pricingVisible ? 'translateY(0)' : 'translateY(20px)',
            transition: 'all 0.6s cubic-bezier(0.16, 1, 0.3, 1) 0.5s',
          }}
        >
          <a
            href={TELEGRAM_BOT_LINK}
            target="_blank"
            rel="noopener noreferrer"
            className="
              inline-flex items-center gap-3
              px-8 py-4
              bg-gradient-to-r from-blue-600 to-purple-600 
              hover:from-blue-500 hover:to-purple-500
              text-white text-lg font-semibold 
              rounded-2xl
              shadow-lg shadow-blue-500/20
              hover:shadow-xl hover:shadow-blue-500/30
              hover:-translate-y-1
              transition-all duration-300
            "
          >
            <Send className="h-5 w-5" />
            {t('cta.button')}
          </a>
          <p className="mt-4 text-sm text-gray-500">
            {t('cta.hint')}
          </p>
          
          {/* Terms link */}
          <Link
            href="/private-community/rules"
            className="inline-flex items-center gap-2 mt-6 text-sm text-gray-400 hover:text-white transition-colors"
          >
            <FileText className="h-4 w-4" />
            {t('cta.terms')}
          </Link>
        </div>
      </div>
    </Layout>
  );
}
