'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import AdminLayout from '@/components/admin/AdminLayout';
import {
  ArrowLeft,
  BarChart3,
  TrendingUp,
  DollarSign,
  RefreshCw,
  Calendar
} from 'lucide-react';

type MonthRow = { month: string; monthLabel: string; count: number; amount: number };

export default function StatisticsByMonthPage() {
  const [data, setData] = useState<MonthRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState<6 | 12>(12);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch('/api/admin/stats');
      if (!res.ok) throw new Error('Не удалось загрузить данные');
      const json = await res.json();
      const byMonth: MonthRow[] = Array.isArray(json.paymentsByMonth) ? json.paymentsByMonth : [];
      setData(byMonth);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ошибка загрузки');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const displayData = data.slice(0, period);
  const maxCount = Math.max(1, ...displayData.map((d) => d.count));
  const maxAmount = Math.max(0.01, ...displayData.map((d) => d.amount));

  if (loading && data.length === 0) {
    return (
      <AdminLayout title="Статистика по месяцам">
        <div className="flex items-center justify-center min-h-[40vh]">
          <RefreshCw className="h-8 w-8 text-indigo-400 animate-spin" />
        </div>
      </AdminLayout>
    );
  }

  if (error && data.length === 0) {
    return (
      <AdminLayout title="Статистика по месяцам">
        <div className="rounded-xl bg-red-500/10 border border-red-500/20 p-4 text-red-400">
          {error}
          <button onClick={loadData} className="ml-4 underline">Обновить</button>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Статистика по месяцам">
      <div className="space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <Link
              href="/admin/statistics"
              className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Назад к статистике
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-white">Статистика по месяцам</h1>
              <p className="text-gray-400 text-sm">Графики оплат и сумм для сравнения</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <select
              value={period}
              onChange={(e) => setPeriod(Number(e.target.value) as 6 | 12)}
              className="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-indigo-500/50"
            >
              <option value={6}>Последние 6 месяцев</option>
              <option value={12}>Последние 12 месяцев</option>
            </select>
            <button
              onClick={loadData}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-gray-300 hover:bg-white/10 hover:text-white transition-all disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Обновить
            </button>
          </div>
        </div>

        {displayData.length === 0 ? (
          <div className="rounded-2xl bg-white/5 border border-white/10 p-12 text-center text-gray-400">
            <Calendar className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>Нет данных по месяцам за выбранный период</p>
          </div>
        ) : (
          <>
            {/* График: количество оплат по месяцам */}
            <section className="rounded-2xl bg-white/5 border border-white/10 p-6">
              <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-indigo-400" />
                Количество оплат по месяцам
              </h2>
              <div className="space-y-4">
                {displayData.map((row) => (
                  <div key={row.month} className="flex items-center gap-4">
                    <div className="w-28 shrink-0 text-sm text-gray-300 font-medium">
                      {row.monthLabel}
                    </div>
                    <div className="flex-1 min-w-0 flex items-center gap-3">
                      <div className="flex-1 h-8 rounded-lg bg-white/5 overflow-hidden">
                        <div
                          className="h-full rounded-lg bg-gradient-to-r from-indigo-500 to-indigo-400 transition-all duration-500"
                          style={{ width: `${(row.count / maxCount) * 100}%` }}
                        />
                      </div>
                      <span className="w-12 text-right text-white font-medium tabular-nums text-sm shrink-0">
                        {row.count}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
              <p className="mt-3 text-xs text-gray-500">Максимум за период: {maxCount} оплат</p>
            </section>

            {/* График: сумма по месяцам */}
            <section className="rounded-2xl bg-white/5 border border-white/10 p-6">
              <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-emerald-400" />
                Сумма по месяцам (USDT)
              </h2>
              <div className="space-y-4">
                {displayData.map((row) => (
                  <div key={row.month} className="flex items-center gap-4">
                    <div className="w-28 shrink-0 text-sm text-gray-300 font-medium">
                      {row.monthLabel}
                    </div>
                    <div className="flex-1 min-w-0 flex items-center gap-3">
                      <div className="flex-1 h-8 rounded-lg bg-white/5 overflow-hidden">
                        <div
                          className="h-full rounded-lg bg-gradient-to-r from-emerald-500 to-emerald-400 transition-all duration-500"
                          style={{ width: `${(row.amount / maxAmount) * 100}%` }}
                        />
                      </div>
                      <span className="w-24 text-right text-white font-medium tabular-nums text-sm shrink-0">
                        {row.amount.toFixed(2)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
              <p className="mt-3 text-xs text-gray-500">
                Максимум за период: {maxAmount.toFixed(2)} USDT
              </p>
            </section>

            {/* Сводная таблица для сравнения */}
            <section className="rounded-2xl bg-white/5 border border-white/10 overflow-hidden">
              <h2 className="text-lg font-semibold text-white px-6 py-4 border-b border-white/10 flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-amber-400" />
                Сводка по месяцам
              </h2>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-white/10">
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                        Месяц
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                        Кол-во оплат
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                        Сумма (USDT)
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                        Ср. чек
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {displayData.map((row) => (
                      <tr key={row.month} className="hover:bg-white/[0.02] transition-colors">
                        <td className="px-6 py-3 text-white font-medium">{row.monthLabel}</td>
                        <td className="px-6 py-3 text-right text-gray-300 tabular-nums">
                          {row.count}
                        </td>
                        <td className="px-6 py-3 text-right text-gray-300 tabular-nums">
                          {row.amount.toFixed(2)}
                        </td>
                        <td className="px-6 py-3 text-right text-gray-300 tabular-nums">
                          {row.count > 0
                            ? (row.amount / row.count).toFixed(2)
                            : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        )}
      </div>
    </AdminLayout>
  );
}
