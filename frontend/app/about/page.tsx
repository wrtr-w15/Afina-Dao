'use client';

import Layout from '@/components/LayoutComponent';
import { Card } from '@/components/ui/Card';
import { FileText, Shield, Users, DollarSign, AlertTriangle, Info } from 'lucide-react';
import { useTranslations } from 'next-intl';

export default function AboutPage() {
  const t = useTranslations('about');
  
  return (
    <Layout title={t('title')} description={t('description')}>
      <div className="max-w-5xl mx-auto p-6">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center mb-6">
            <FileText className="h-12 w-12 text-blue-600 dark:text-blue-400 mr-4" />
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white">
              {t('header.title')}
            </h1>
          </div>
          <p className="text-lg text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
            {t('header.subtitle')}
          </p>
        </div>

        {/* Main Content */}
        <div className="space-y-8">
          {/* Section 1: General Provisions */}
          <Card className="p-6">
            <div className="flex items-start gap-4 mb-4">
              <Info className="h-6 w-6 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-1" />
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                {t('section1.title')}
              </h2>
            </div>
            <div className="space-y-3">
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                {t('section1.point1')}
              </p>
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                {t('section1.point2')}
              </p>
            </div>
          </Card>

          {/* Section 2: Rights and Obligations of the Organization */}
          <Card className="p-6">
            <div className="flex items-start gap-4 mb-4">
              <Shield className="h-6 w-6 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-1" />
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                {t('section2.title')}
              </h2>
            </div>
            <div className="space-y-6">
              {/* Obligations */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                  {t('section2.subtitle1')}
                </h3>
                <div className="space-y-2 ml-4">
                  <p className="text-gray-700 dark:text-gray-300">{t('section2.obligation1')}</p>
                  <p className="text-gray-700 dark:text-gray-300">{t('section2.obligation2')}</p>
                  <p className="text-gray-700 dark:text-gray-300">{t('section2.obligation3')}</p>
                  <p className="text-gray-700 dark:text-gray-300">{t('section2.obligation4')}</p>
                </div>
              </div>
              
              {/* Not Performed */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                  {t('section2.subtitle2')}
                </h3>
                <div className="space-y-2 ml-4">
                  <p className="text-gray-700 dark:text-gray-300">{t('section2.notPerformed1')}</p>
                </div>
              </div>

              {/* Rights */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                  {t('section2.subtitle3')}
                </h3>
                <div className="space-y-2 ml-4">
                  <p className="text-gray-700 dark:text-gray-300">{t('section2.right1')}</p>
                  <p className="text-gray-700 dark:text-gray-300">{t('section2.right2')}</p>
                </div>
              </div>
            </div>
          </Card>

          {/* Section 3: Rights and Obligations of the Client */}
          <Card className="p-6">
            <div className="flex items-start gap-4 mb-4">
              <Users className="h-6 w-6 text-green-600 dark:text-green-400 flex-shrink-0 mt-1" />
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                {t('section3.title')}
              </h2>
            </div>
            <div className="space-y-6">
              {/* Client Obligations */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                  {t('section3.subtitle1')}
                </h3>
                <div className="space-y-2 ml-4">
                  <p className="text-gray-700 dark:text-gray-300">{t('section3.obligation1')}</p>
                  <p className="text-gray-700 dark:text-gray-300">{t('section3.obligation2')}</p>
                </div>
              </div>

              {/* Client Rights */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                  {t('section3.subtitle2')}
                </h3>
                <div className="space-y-2 ml-4">
                  <p className="text-gray-700 dark:text-gray-300">{t('section3.right1')}</p>
                </div>
              </div>
            </div>
          </Card>

          {/* Section 4: Liability of the Parties */}
          <Card className="p-6 border-2 border-amber-400 dark:border-amber-500 shadow-lg shadow-amber-100 dark:shadow-amber-900/20 bg-amber-50/50 dark:bg-amber-900/10">
            <div className="flex items-start gap-4 mb-4">
              <div className="bg-amber-100 dark:bg-amber-900/30 p-2 rounded-lg">
                <AlertTriangle className="h-6 w-6 text-amber-600 dark:text-amber-400 flex-shrink-0" />
              </div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                {t('section4.title')}
              </h2>
            </div>
            <div className="space-y-6">
              {/* Organization is not responsible */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                  {t('section4.subtitle1')}
                </h3>
                <div className="space-y-2 ml-4">
                  <p className="text-gray-700 dark:text-gray-300">{t('section4.notResponsible1')}</p>
                  <p className="text-gray-700 dark:text-gray-300">{t('section4.notResponsible2')}</p>
                  <p className="text-gray-700 dark:text-gray-300">{t('section4.notResponsible3')}</p>
                </div>
              </div>

              {/* Other points */}
              <div className="space-y-3">
                <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                  {t('section4.point2')}
                </p>
                <p className="text-gray-900 dark:text-white font-bold leading-relaxed">
                  {t('section4.point3')}
                </p>
              </div>
            </div>
          </Card>

          {/* Section 5: Payment for Services */}
          <Card className="p-6">
            <div className="flex items-start gap-4 mb-4">
              <DollarSign className="h-6 w-6 text-purple-600 dark:text-purple-400 flex-shrink-0 mt-1" />
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                {t('section5.title')}
              </h2>
            </div>
            <div className="space-y-3">
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                {t('section5.point1')}
              </p>
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                {t('section5.point2')}
              </p>
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed font-semibold">
                {t('section5.point3')}
              </p>
            </div>
          </Card>

          {/* Contact */}
          <Card className="p-6 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20">
            <div className="text-center">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-3">
                {t('contact.title')}
              </h2>
              <p className="text-gray-700 dark:text-gray-300 mb-2">
                {t('contact.subtitle')}
              </p>
              <p className="text-blue-600 dark:text-blue-400 font-mono text-lg">
                {t('contact.representatives')}
              </p>
            </div>
          </Card>
        </div>
      </div>
    </Layout>
  );
}
