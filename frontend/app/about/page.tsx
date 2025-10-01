'use client';

import Layout from '@/components/LayoutComponent';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { BookOpen, Users, Target, Zap } from 'lucide-react';

export default function AboutPage() {
  return (
    <Layout title="Про Afina DAO" description="Информация о децентрализованной автономной организации Afina DAO">
      <div className="max-w-4xl mx-auto p-6">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center mb-6">
            <BookOpen className="h-12 w-12 text-blue-600 dark:text-blue-400 mr-4" />
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white">
              Про Afina DAO
            </h1>
          </div>
          <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
            Децентрализованная автономная организация, создающая инновационные решения для автоматизации и оптимизации бизнес-процессов
          </p>
        </div>

        {/* Main Content */}
        <div className="space-y-8">
          {/* Mission */}
          <Card className="p-8">
            <div className="flex items-start gap-4">
              <Target className="h-8 w-8 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-1" />
              <div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                  Наша миссия
                </h2>
                <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                  Afina DAO стремится революционизировать мир автоматизации, предоставляя 
                  мощные инструменты и решения, которые помогают компаниям и частным лицам 
                  оптимизировать свои процессы, повышать эффективность и достигать новых высот.
                </p>
              </div>
            </div>
          </Card>

          {/* Values */}
          <Card className="p-8">
            <div className="flex items-start gap-4">
              <Users className="h-8 w-8 text-green-600 dark:text-green-400 flex-shrink-0 mt-1" />
              <div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                  Наши ценности
                </h2>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">Инновации</Badge>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Постоянное развитие и внедрение передовых технологий
                    </p>
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">Прозрачность</Badge>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Открытость и честность во всех процессах
                    </p>
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">Сообщество</Badge>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Сильное сообщество единомышленников
                    </p>
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">Качество</Badge>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Высокие стандарты во всех продуктах
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </Card>

          {/* Technology */}
          <Card className="p-8">
            <div className="flex items-start gap-4">
              <Zap className="h-8 w-8 text-purple-600 dark:text-purple-400 flex-shrink-0 mt-1" />
              <div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                  Технологии
                </h2>
                <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-6">
                  Мы используем современные технологии для создания надежных и масштабируемых решений:
                </p>
                <div className="grid md:grid-cols-3 gap-4">
                  <div className="text-center p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Blockchain</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Децентрализованные решения
                    </p>
                  </div>
                  <div className="text-center p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <h3 className="font-semibold text-gray-900 dark:text-white mb-2">AI/ML</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Искусственный интеллект
                    </p>
                  </div>
                  <div className="text-center p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Automation</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Автоматизация процессов
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </Card>

          {/* Contact */}
          <Card className="p-8 bg-blue-50 dark:bg-blue-900/20">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                Присоединяйтесь к нам
              </h2>
              <p className="text-gray-700 dark:text-gray-300 mb-6">
                Станьте частью революции в области автоматизации и децентрализованных технологий
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <a
                  href="#"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Users className="h-4 w-4" />
                  Присоединиться к DAO
                </a>
                <a
                  href="#"
                  className="inline-flex items-center gap-2 px-6 py-3 border border-blue-600 text-blue-600 dark:text-blue-400 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                >
                  <BookOpen className="h-4 w-4" />
                  Узнать больше
                </a>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </Layout>
  );
}
