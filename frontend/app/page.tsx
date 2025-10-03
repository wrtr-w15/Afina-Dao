'use client';

import React from 'react';
import Layout from '@/components/LayoutComponent';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { 
  Shield, 
  Server,
  Clock,
  Zap,
  FileText,
  ArrowRight
} from 'lucide-react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';

export default function HomePage() {
  const t = useTranslations('home');

  const features = [
    {
      id: 'management',
      icon: Server,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100 dark:bg-blue-900/20',
    },
    {
      id: 'security',
      icon: Shield,
      color: 'text-green-600',
      bgColor: 'bg-green-100 dark:bg-green-900/20',
    },
    {
      id: 'monitoring',
      icon: Clock,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100 dark:bg-purple-900/20',
    },
    {
      id: 'automation',
      icon: Zap,
      color: 'text-orange-600',
      bgColor: 'bg-orange-100 dark:bg-orange-900/20',
    }
  ];


  return (
    <Layout 
      title="Afina DAO"
      description="Professional crypto wallet management and automation platform"
      showSidebar={true}
    >
      <div className="space-y-12">
        {/* Hero Section */}
        <div className="text-center space-y-6">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white">
            {t('hero.title')}
          </h1>
          <p className="text-lg md:text-xl text-gray-600 dark:text-gray-400 max-w-4xl mx-auto leading-relaxed">
            {t('hero.description')}
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4 mt-8">
            <Link href="/about">
              <Button size="lg">
                <FileText className="h-5 w-5 mr-2" />
                {t('hero.learnMore')}
              </Button>
            </Link>
            <Link href="/pricing">
              <Button variant="outline" size="lg">
                <ArrowRight className="h-5 w-5 mr-2" />
                {t('hero.viewPricing')}
              </Button>
            </Link>
          </div>
        </div>

        {/* Features Grid */}
        <div>
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-8 text-center">
            {t('features.title')}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {features.map((feature) => (
              <Card key={feature.id} className="p-6">
                <div className="flex items-start space-x-4">
                  <div className={`p-3 rounded-lg ${feature.bgColor} flex-shrink-0`}>
                    <feature.icon className={`h-6 w-6 ${feature.color}`} />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                      {t(`features.${feature.id}.title`)}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                      {t(`features.${feature.id}.description`)}
                    </p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>

        {/* Partnership Section */}
        <Card className="p-8 bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 border-blue-200 dark:border-blue-800">
          <div className="flex items-center space-x-4 mb-4">
            <Zap className="h-8 w-8 text-blue-600" />
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
              {t('partnership.title')}
            </h3>
          </div>
          <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
            {t('partnership.description')}
          </p>
        </Card>

        {/* Security Section */}
        <Card className="p-8 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-green-200 dark:border-green-800">
          <div className="flex items-center space-x-4 mb-4">
            <Shield className="h-8 w-8 text-green-600" />
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
              {t('security.title')}
            </h3>
          </div>
          <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
            {t('security.description')}
          </p>
        </Card>

        {/* Business Model Section */}
        <div>
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-6 text-center">
            {t('businessModel.title')}
          </h2>
          <Card className="p-8">
            <p className="text-gray-600 dark:text-gray-400 leading-relaxed mb-6">
              {t('businessModel.description')}
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Link href="/pricing" className="flex-1">
                <Button variant="primary" className="w-full">
                  {t('businessModel.viewPricing')}
                </Button>
              </Link>
              <Link href="/about" className="flex-1">
                <Button variant="outline" className="w-full">
                  {t('businessModel.contactUs')}
                </Button>
              </Link>
            </div>
          </Card>
        </div>

      </div>
    </Layout>
  );
}
