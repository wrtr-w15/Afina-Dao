'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AdminLayout from '@/components/admin/AdminLayout';
import {
  Receipt,
  CheckCircle,
  Clock,
  XCircle,
  CreditCard,
  Users,
  TrendingUp,
  Calendar,
  ArrowRight,
  RefreshCw,
  DollarSign,
  BarChart3
} from 'lucide-react';

interface Stats {
  payments: {
    total: number;
    completed: number;
    pending: number;
    failed: number;
    refunded: number;
    cancelled: number;
    totalAmount: number;
    monthAmount: number;
    lastMonthAmount: number;
  };
  subscriptions: {
    total: number;
    active: number;
    expired: number;
    pending: number;
    cancelled: number;
  };
  users: { total: number };
  recentPayments: Array<{
    id: string;
    amount: number;
    currency: string;
    status: string;
    paidAt?: string;
    createdAt: string;
    externalId?: string;
    user?: { telegramUsername?: string; telegramFirstName?: string };
  }>;
}

const paymentStatusConfig: Record<string, { label: string; color: string; icon: typeof CheckCircle }> = {
  completed: { label: 'Оплачен', color: 'bg-emerald-500/20 text-emerald-400', icon: CheckCircle },
  pending: { label: 'Ожидает', color: 'bg-yellow-500/20 text-yellow-400', icon: Clock },
  failed: { label: 'Ошибка', color: 'bg-red-500/20 text-red-400', icon: XCircle },
  refunded: { label: 'Возврат', color: 'bg-purple-500/20 text-purple-400', icon: Receipt },
  cancelled: { label: 'Отменён', color: 'bg-gray-500/20 text-gray-400', icon: XCircle }
};

export default function StatisticsPage() {
  const router = useRouter();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadStats = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch('/api/admin/stats?recent=15');
      if (!res.ok) throw new Error('Не удалось загрузить статистику');
      const data = await res.json();
      setStats(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ошибка загрузки');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStats();
  }, []);

  const formatAmount = (amount: number) => `${amount.toFixed(2)} USDT`;
  const formatDate = (dateString?: string) => {
    if (!dateString) return '—';
    return new Date(dateString).toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading && !stats) {
    return (
      <AdminLayout title="Статистика">
        <div className="flex items-center justify-center min-h-[40vh]">
          <RefreshCw className="h-8 w-8 text-indigo-400 animate-spin" />
        </div>
      </AdminLayout>
    );
  }

  if (error || !stats) {
    return (
      <AdminLayout title="Статистика">
        <div className="rounded-xl bg-red-500/10 border border-red-500/20 p-4 text-red-400">
          {error || 'Нет данных'}
          <button onClick={loadStats} className="ml-4 underline">Обновить</button>
        </div>
      </AdminLayout>
    );
  }

  const { payments, subscriptions, users, recentPayments } = stats;

  return (
    <AdminLayout title="Статистика">
      <div className="space-y-8">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white">Статистика</h1>
            <p className="text-gray-400 text-sm">Оплаты, подписки и пользователи</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push('/admin/statistics/by-month')}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 hover:bg-indigo-500/30 hover:text-white transition-all"
            >
              <BarChart3 className="h-4 w-4" />
              Посмотреть статистику по месяцам
            </button>
            <button
              onClick={loadStats}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-gray-300 hover:bg-white/10 hover:text-white transition-all disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Обновить
            </button>
          </div>
        </div>

        {/* Платежи */}
        <section>
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Receipt className="h-5 w-5 text-indigo-400" />
            Платежи
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            <div className="rounded-xl bg-white/5 border border-white/10 p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-500/20 flex items-center justify-center">
                  <BarChart3 className="h-5 w-5 text-indigo-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">{payments.total}</p>
                  <p className="text-xs text-gray-400">Всего</p>
                </div>
              </div>
            </div>
            <div className="rounded-xl bg-white/5 border border-white/10 p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                  <CheckCircle className="h-5 w-5 text-emerald-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">{payments.completed}</p>
                  <p className="text-xs text-gray-400">Успешных</p>
                </div>
              </div>
            </div>
            <div className="rounded-xl bg-white/5 border border-white/10 p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-yellow-500/20 flex items-center justify-center">
                  <Clock className="h-5 w-5 text-yellow-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">{payments.pending}</p>
                  <p className="text-xs text-gray-400">Ожидают</p>
                </div>
              </div>
            </div>
            <div className="rounded-xl bg-white/5 border border-white/10 p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-red-500/20 flex items-center justify-center">
                  <XCircle className="h-5 w-5 text-red-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">{payments.failed}</p>
                  <p className="text-xs text-gray-400">Ошибок</p>
                </div>
              </div>
            </div>
            <div className="rounded-xl bg-white/5 border border-white/10 p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-green-500/20 flex items-center justify-center">
                  <DollarSign className="h-5 w-5 text-green-400" />
                </div>
                <div>
                  <p className="text-xl font-bold text-white">{formatAmount(payments.totalAmount)}</p>
                  <p className="text-xs text-gray-400">Всего</p>
                </div>
              </div>
            </div>
            <div className="rounded-xl bg-white/5 border border-white/10 p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-cyan-500/20 flex items-center justify-center">
                  <Calendar className="h-5 w-5 text-cyan-400" />
                </div>
                <div>
                  <p className="text-xl font-bold text-white">{formatAmount(payments.monthAmount)}</p>
                  <p className="text-xs text-gray-400">За месяц</p>
                </div>
              </div>
            </div>
          </div>
          <div className="mt-3 flex gap-4 text-sm text-gray-400">
            <span>Прошлый месяц: <strong className="text-white">{formatAmount(payments.lastMonthAmount)}</strong></span>
          </div>
        </section>

        {/* Подписки и пользователи */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <section>
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-amber-400" />
              Подписки
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <div className="rounded-xl bg-white/5 border border-white/10 p-4">
                <p className="text-2xl font-bold text-white">{subscriptions.total}</p>
                <p className="text-xs text-gray-400">Всего</p>
              </div>
              <div className="rounded-xl bg-white/5 border border-white/10 p-4">
                <p className="text-2xl font-bold text-emerald-400">{subscriptions.active}</p>
                <p className="text-xs text-gray-400">Активных</p>
              </div>
              <div className="rounded-xl bg-white/5 border border-white/10 p-4">
                <p className="text-2xl font-bold text-red-400">{subscriptions.expired}</p>
                <p className="text-xs text-gray-400">Истекших</p>
              </div>
              <div className="rounded-xl bg-white/5 border border-white/10 p-4">
                <p className="text-2xl font-bold text-yellow-400">{subscriptions.pending}</p>
                <p className="text-xs text-gray-400">Ожидают</p>
              </div>
              <div className="rounded-xl bg-white/5 border border-white/10 p-4">
                <p className="text-2xl font-bold text-gray-400">{subscriptions.cancelled}</p>
                <p className="text-xs text-gray-400">Отменено</p>
              </div>
            </div>
            <button
              onClick={() => router.push('/admin/subscriptions')}
              className="mt-3 flex items-center gap-2 text-sm text-indigo-400 hover:text-indigo-300"
            >
              Все подписки <ArrowRight className="h-4 w-4" />
            </button>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Users className="h-5 w-5 text-pink-400" />
              Пользователи
            </h2>
            <div className="rounded-xl bg-white/5 border border-white/10 p-6">
              <p className="text-4xl font-bold text-white">{users.total}</p>
              <p className="text-sm text-gray-400 mt-1">Всего в системе</p>
              <button
                onClick={() => router.push('/admin/users')}
                className="mt-4 flex items-center gap-2 text-sm text-indigo-400 hover:text-indigo-300"
              >
                Список пользователей <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </section>
        </div>

        {/* Последние платежи */}
        <section>
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-emerald-400" />
            Последние платежи
          </h2>
          <div className="rounded-2xl bg-white/5 border border-white/10 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Пользователь</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Сумма</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Статус</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Дата</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {recentPayments.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-6 py-8 text-center text-gray-500">Платежей пока нет</td>
                    </tr>
                  ) : (
                    recentPayments.map((p) => {
                      const config = paymentStatusConfig[p.status] || paymentStatusConfig.pending;
                      const Icon = config.icon;
                      return (
                        <tr key={p.id} className="hover:bg-white/[0.02] transition-colors">
                          <td className="px-6 py-3">
                            <span className="text-white font-medium">
                              {p.user?.telegramUsername ? `@${p.user.telegramUsername}` : p.user?.telegramFirstName || '—'}
                            </span>
                          </td>
                          <td className="px-6 py-3 text-white font-medium">{formatAmount(p.amount)}</td>
                          <td className="px-6 py-3">
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium ${config.color}`}>
                              <Icon className="h-3.5 w-3.5" />
                              {config.label}
                            </span>
                          </td>
                          <td className="px-6 py-3 text-sm text-gray-400">{formatDate(p.paidAt || p.createdAt)}</td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
            <div className="px-6 py-3 border-t border-white/10">
              <button
                onClick={() => router.push('/admin/payments')}
                className="flex items-center gap-2 text-sm text-indigo-400 hover:text-indigo-300"
              >
                Все платежи <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </section>
      </div>
    </AdminLayout>
  );
}
