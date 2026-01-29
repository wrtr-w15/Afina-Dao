'use client';

import React from 'react';
import Layout from '@/components/LayoutComponent';
import { FileText, Shield, ArrowLeft } from 'lucide-react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';

export default function RulesPage() {
  const t = useTranslations('rules');

  return (
    <Layout title={t('title')} description={t('description')}>
      <div className="max-w-4xl mx-auto p-6">
        {/* Header */}
        <div className="mb-8">
          <Link 
            href="/private-community"
            className="inline-flex items-center gap-2 text-blue-400 hover:text-blue-300 mb-6 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>{t('backToCommunity')}</span>
          </Link>
          
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-gradient-to-br from-indigo-600 to-blue-600 rounded-full">
              <Shield className="h-8 w-8 text-white" />
            </div>
            <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-indigo-400 to-blue-400 bg-clip-text text-transparent">
              {t('title')}
            </h1>
          </div>
          <p className="text-lg text-gray-300">
            {t('description')}
          </p>
        </div>

        {/* Rules Content */}
        <div className="p-8 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm">
          <div className="space-y-8">
            {/* Section 2 */}
            <div>
              <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                <FileText className="h-5 w-5 text-indigo-400" />
                {t('section2.title')}
              </h2>
              <div className="space-y-3 ml-7">
                <p className="text-gray-300 leading-relaxed">
                  <strong className="text-white">{t('section2.item1.number')}</strong> {t('section2.item1.text')}
                </p>
                <p className="text-gray-300 leading-relaxed">
                  <strong className="text-white">{t('section2.item2.number')}</strong> {t('section2.item2.text')}
                </p>
                <p className="text-gray-300 leading-relaxed">
                  <strong className="text-white">{t('section2.item3.number')}</strong> {t('section2.item3.text')}
                </p>
              </div>
            </div>

            {/* Section 3 */}
            <div>
              <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                <FileText className="h-5 w-5 text-indigo-400" />
                {t('section3.title')}
              </h2>
              <div className="space-y-3 ml-7">
                <p className="text-gray-300 leading-relaxed">
                  <strong className="text-white">{t('section3.item1.number')}</strong> {t('section3.item1.text')}
                </p>
                <p className="text-gray-300 leading-relaxed">
                  <strong className="text-white">{t('section3.item2.number')}</strong> {t('section3.item2.text')}
                </p>
                <p className="text-gray-300 leading-relaxed">
                  <strong className="text-white">{t('section3.item3.number')}</strong> {t('section3.item3.text')}
                </p>
              </div>
            </div>

            {/* Section 4 */}
            <div>
              <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                <FileText className="h-5 w-5 text-indigo-400" />
                {t('section4.title')}
              </h2>
              <div className="space-y-3 ml-7">
                <p className="text-gray-300 leading-relaxed">
                  <strong className="text-white">{t('section4.item1.number')}</strong> {t('section4.item1.text')}
                </p>
                <p className="text-gray-300 leading-relaxed">
                  <strong className="text-white">{t('section4.item2.number')}</strong> {t('section4.item2.text')}
                </p>
                <p className="text-gray-300 leading-relaxed">
                  <strong className="text-white">{t('section4.item3.number')}</strong> {t('section4.item3.text')}
                </p>
              </div>
            </div>

            {/* Section 5 */}
            <div>
              <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                <FileText className="h-5 w-5 text-indigo-400" />
                {t('section5.title')}
              </h2>
              <div className="space-y-3 ml-7">
                <p className="text-gray-300 leading-relaxed">
                  <strong className="text-white">{t('section5.item1.number')}</strong> {t('section5.item1.text')}
                </p>
                <p className="text-gray-300 leading-relaxed">
                  <strong className="text-white">{t('section5.item2.number')}</strong> {t('section5.item2.text')}
                </p>
                <p className="text-gray-300 leading-relaxed">
                  <strong className="text-white">{t('section5.item3.number')}</strong> {t('section5.item3.text')}
                </p>
              </div>
            </div>

            {/* Section 6 */}
            <div>
              <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                <FileText className="h-5 w-5 text-indigo-400" />
                {t('section6.title')}
              </h2>
              <div className="space-y-3 ml-7">
                <p className="text-gray-300 leading-relaxed">
                  <strong className="text-white">{t('section6.item1.number')}</strong> {t('section6.item1.text')}
                </p>
                <p className="text-gray-300 leading-relaxed">
                  <strong className="text-white">{t('section6.item2.number')}</strong> {t('section6.item2.text')}
                </p>
              </div>
            </div>

            {/* Section 7 */}
            <div>
              <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                <FileText className="h-5 w-5 text-indigo-400" />
                {t('section7.title')}
              </h2>
              <div className="space-y-3 ml-7">
                <p className="text-gray-300 leading-relaxed">
                  <strong className="text-white">{t('section7.item1.number')}</strong> {t('section7.item1.text')}
                </p>
                <p className="text-gray-300 leading-relaxed">
                  <strong className="text-white">{t('section7.item2.number')}</strong> {t('section7.item2.text')}
                </p>
                <p className="text-gray-300 leading-relaxed">
                  <strong className="text-white">{t('section7.item3.number')}</strong> {t('section7.item3.text')}
                </p>
              </div>
            </div>

            {/* Section 8 */}
            <div>
              <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                <FileText className="h-5 w-5 text-indigo-400" />
                {t('section8.title')}
              </h2>
              <div className="space-y-3 ml-7">
                <p className="text-gray-300 leading-relaxed">
                  <strong className="text-white">{t('section8.item1.number')}</strong> {t('section8.item1.text')}
                </p>
                <p className="text-gray-300 leading-relaxed">
                  <strong className="text-white">{t('section8.item2.number')}</strong> {t('section8.item2.text')}
                </p>
                <p className="text-gray-300 leading-relaxed">
                  <strong className="text-white">{t('section8.item3.number')}</strong> {t('section8.item3.text')}
                </p>
              </div>
            </div>

            {/* Section 9 */}
            <div>
              <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                <FileText className="h-5 w-5 text-indigo-400" />
                {t('section9.title')}
              </h2>
              <div className="space-y-3 ml-7">
                <p className="text-gray-300 leading-relaxed">
                  <strong className="text-white">{t('section9.item1.number')}</strong> {t('section9.item1.text')}
                </p>
                <p className="text-gray-300 leading-relaxed">
                  <strong className="text-white">{t('section9.item2.number')}</strong> {t('section9.item2.text')}
                </p>
                <p className="text-gray-300 leading-relaxed">
                  <strong className="text-white">{t('section9.item3.number')}</strong> {t('section9.item3.text')}
                </p>
              </div>
            </div>

            {/* Section 10 */}
            <div>
              <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                <FileText className="h-5 w-5 text-indigo-400" />
                {t('section10.title')}
              </h2>
              <div className="space-y-3 ml-7">
                <p className="text-gray-300 leading-relaxed">
                  <strong className="text-white">{t('section10.item1.number')}</strong> {t('section10.item1.text')}
                </p>
                <p className="text-gray-300 leading-relaxed">
                  <strong className="text-white">{t('section10.item2.number')}</strong> {t('section10.item2.text')}
                </p>
              </div>
            </div>

            {/* Section 11 */}
            <div>
              <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                <FileText className="h-5 w-5 text-indigo-400" />
                {t('section11.title')}
              </h2>
              <div className="space-y-3 ml-7">
                <p className="text-gray-300 leading-relaxed">
                  <strong className="text-white">{t('section11.item1.number')}</strong> {t('section11.item1.text')}
                </p>
              </div>
            </div>

            {/* Section 12 */}
            <div>
              <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                <FileText className="h-5 w-5 text-indigo-400" />
                {t('section12.title')}
              </h2>
              <div className="space-y-3 ml-7">
                <p className="text-gray-300 leading-relaxed">
                  <strong className="text-white">{t('section12.item1.number')}</strong> {t('section12.item1.text')}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
