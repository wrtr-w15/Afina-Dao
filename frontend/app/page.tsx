'use client';

import React from 'react';
import Layout from '@/components/LayoutComponent';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { 
  Search, 
  BookOpen, 
  Users, 
  Globe, 
  Shield, 
  Zap,
  TrendingUp,
  Star,
  Clock,
  ArrowRight
} from 'lucide-react';
import Link from 'next/link';

export default function HomePage() {
  const categories = [
    {
      id: 'getting-started',
      title: 'Начало работы',
      description: 'Основы работы с Afina DAO',
      icon: Star,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100 dark:bg-blue-900/20',
      articles: 12
    },
    {
      id: 'defi',
      title: 'DeFi',
      description: 'Децентрализованные финансы',
      icon: TrendingUp,
      color: 'text-green-600',
      bgColor: 'bg-green-100 dark:bg-green-900/20',
      articles: 8
    },
    {
      id: 'security',
      title: 'Безопасность',
      description: 'Безопасность и аудит',
      icon: Shield,
      color: 'text-red-600',
      bgColor: 'bg-red-100 dark:bg-red-900/20',
      articles: 15
    },
    {
      id: 'community',
      title: 'Сообщество',
      description: 'Управление сообществом',
      icon: Users,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100 dark:bg-purple-900/20',
      articles: 6
    }
  ];

  const recentArticles = [
    {
      id: 1,
      title: 'Введение в Afina DAO',
      excerpt: 'Полное руководство по началу работы с платформой Afina DAO',
      category: 'Начало работы',
      author: 'Admin',
      date: '2024-01-15',
      readTime: '5 мин',
      views: 1234
    },
    {
      id: 2,
      title: 'DeFi стратегии для новичков',
      excerpt: 'Основные принципы работы с децентрализованными финансами',
      category: 'DeFi',
      author: 'Admin',
      date: '2024-01-14',
      readTime: '8 мин',
      views: 856
    },
    {
      id: 3,
      title: 'Безопасность кошельков',
      excerpt: 'Как защитить свои цифровые активы',
      category: 'Безопасность',
      author: 'Admin',
      date: '2024-01-13',
      readTime: '6 мин',
      views: 2103
    }
  ];

  return (
        <Layout 
          title="Afina DAO Wiki"
          description="Comprehensive knowledge base for Afina DAO"
          showSidebar={true}
        >
          <div className="space-y-8">
        {/* Hero Section */}
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white">
            Добро пожаловать в Afina DAO Wiki
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-400 max-w-3xl mx-auto">
            Ваша комплексная база знаний для всего, что касается Afina DAO. 
            Найдите ответы на свои вопросы и изучите возможности платформы.
          </p>
          <div className="flex justify-center space-x-4">
            <Button size="lg">
              <Search className="h-5 w-5 mr-2" />
              Начать поиск
            </Button>
            <Button variant="outline" size="lg">
              <BookOpen className="h-5 w-5 mr-2" />
              Изучить документацию
            </Button>
          </div>
        </div>

        {/* Categories Grid */}
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
            Категории
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {categories.map((category) => (
              <Link key={category.id} href={`/category/${category.id}`}>
                <Card className="p-6 hover:shadow-lg transition-shadow cursor-pointer">
                  <div className="flex items-center space-x-4">
                    <div className={`p-3 rounded-lg ${category.bgColor}`}>
                      <category.icon className={`h-6 w-6 ${category.color}`} />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 dark:text-white">
                        {category.title}
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {category.description}
                      </p>
                      <div className="flex items-center mt-2">
                        <Badge variant="secondary" className="text-xs">
                          {category.articles} статей
                        </Badge>
                      </div>
                    </div>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        </div>

        {/* Recent Articles */}
        <div>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              Последние статьи
            </h2>
            <Link href="/articles">
              <Button variant="outline">
                Посмотреть все
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {recentArticles.map((article) => (
              <Link key={article.id} href={`/article/${article.id}`}>
                <Card className="p-6 hover:shadow-lg transition-shadow cursor-pointer">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Badge variant="secondary" className="text-xs">
                        {article.category}
                      </Badge>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {article.date}
                      </span>
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                        {article.title}
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {article.excerpt}
                      </p>
                    </div>
                    <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
                      <div className="flex items-center space-x-4">
                        <span className="flex items-center">
                          <Clock className="h-4 w-4 mr-1" />
                          {article.readTime}
                        </span>
                        <span>{article.views} просмотров</span>
                      </div>
                      <span>Автор: {article.author}</span>
                    </div>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        </div>

        {/* Quick Links */}
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
            Быстрые ссылки
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Link href="/admin">
              <Card className="p-6 hover:shadow-lg transition-shadow cursor-pointer">
                <div className="flex items-center space-x-4">
                  <div className="p-3 rounded-lg bg-blue-100 dark:bg-blue-900/20">
                    <Shield className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white">
                      Панель администратора
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Управление контентом
                    </p>
                  </div>
                </div>
              </Card>
            </Link>
            
            <Link href="/search">
              <Card className="p-6 hover:shadow-lg transition-shadow cursor-pointer">
                <div className="flex items-center space-x-4">
                  <div className="p-3 rounded-lg bg-green-100 dark:bg-green-900/20">
                    <Search className="h-6 w-6 text-green-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white">
                      Поиск
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Найдите нужную информацию
                    </p>
                  </div>
                </div>
              </Card>
            </Link>
            
            <Link href="/about">
              <Card className="p-6 hover:shadow-lg transition-shadow cursor-pointer">
                <div className="flex items-center space-x-4">
                  <div className="p-3 rounded-lg bg-purple-100 dark:bg-purple-900/20">
                    <Globe className="h-6 w-6 text-purple-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white">
                      О проекте
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Узнайте больше о Afina DAO
                    </p>
                  </div>
                </div>
              </Card>
            </Link>
          </div>
        </div>
      </div>
    </Layout>
  );
}