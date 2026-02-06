'use client';

import React, { useState, useEffect } from 'react';
import AdminLayout from '@/components/admin/AdminLayout';
import { Shield, RefreshCw, CheckCircle, XCircle, Filter } from 'lucide-react';

interface LoginLog {
  id: string;
  ip: string;
  userAgent: string | null;
  event: 'success' | 'failure';
  details: string | null;
  createdAt: string;
}

const detailsLabels: Record<string, string> = {
  dev_mode: 'Вход (режим разработки)',
  telegram_approved: 'Вход (подтверждено в Telegram)',
  request_created: 'Запрос на вход отправлен в Telegram',
  invalid_password: 'Неверный пароль',
  rate_limit: 'Превышен лимит попыток',
  session_created: 'Сессия создана',
};

export default function LoginLogsPage() {
  const [logs, setLogs] = useState<LoginLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, limit: 50, total: 0, pages: 0 });
  const [eventFilter, setEventFilter] = useState<string>('');

  const loadLogs = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.set('page', pagination.page.toString());
      params.set('limit', pagination.limit.toString());
      if (eventFilter) params.set('event', eventFilter);
      const res = await fetch(`/api/admin/login-logs?${params}`);
      if (!res.ok) throw new Error('Не удалось загрузить логи');
      const data = await res.json();
      setLogs(data.logs || []);
      setPagination((prev) => ({ ...prev, ...data.pagination }));
    } catch (e) {
      console.error(e);
      setLogs([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, [pagination.page, eventFilter]);

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const detailLabel = (d: string | null) => (d ? detailsLabels[d] || d : '—');

  return (
    <AdminLayout title="Логи входов в админку">
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <Shield className="h-7 w-7 text-indigo-400" />
              Логи входов в админку
            </h1>
            <p className="text-gray-400 text-sm mt-1">
              IP, время и результат попыток входа (успешные и неудачные)
            </p>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={eventFilter}
              onChange={(e) => {
                setEventFilter(e.target.value);
                setPagination((p) => ({ ...p, page: 1 }));
              }}
              className="px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-indigo-500/50 text-sm"
            >
              <option value="">Все события</option>
              <option value="success">Только успешные</option>
              <option value="failure">Только неудачные</option>
            </select>
            <button
              type="button"
              onClick={() => loadLogs()}
              disabled={loading}
              className="p-2.5 rounded-xl bg-white/5 border border-white/10 text-gray-400 hover:text-white hover:bg-white/10 disabled:opacity-50 transition-all"
              title="Обновить"
            >
              <RefreshCw className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        <div className="rounded-2xl bg-white/5 border border-white/10 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Дата и время</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">IP</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Событие</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Детали</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">User-Agent</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-gray-400">
                      Загрузка...
                    </td>
                  </tr>
                ) : logs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-gray-400">
                      Записей пока нет
                    </td>
                  </tr>
                ) : (
                  logs.map((log) => (
                    <tr key={log.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="px-6 py-4 text-sm text-gray-300 whitespace-nowrap">
                        {formatDate(log.createdAt)}
                      </td>
                      <td className="px-6 py-4">
                        <span className="font-mono text-sm text-white">{log.ip}</span>
                      </td>
                      <td className="px-6 py-4">
                        {log.event === 'success' ? (
                          <span className="inline-flex items-center gap-1.5 text-emerald-400">
                            <CheckCircle className="h-4 w-4" />
                            Успех
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 text-red-400">
                            <XCircle className="h-4 w-4" />
                            Неудача
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-400">
                        {detailLabel(log.details)}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate" title={log.userAgent || ''}>
                        {log.userAgent || '—'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {pagination.pages > 1 && (
            <div className="px-6 py-4 border-t border-white/10 flex items-center justify-between">
              <p className="text-sm text-gray-400">
                Показано {(pagination.page - 1) * pagination.limit + 1}–{Math.min(pagination.page * pagination.limit, pagination.total)} из {pagination.total}
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPagination((p) => ({ ...p, page: p.page - 1 }))}
                  disabled={pagination.page === 1}
                  className="px-3 py-1.5 rounded-lg bg-white/5 text-gray-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-all text-sm"
                >
                  Назад
                </button>
                <span className="text-sm text-gray-400">
                  {pagination.page} / {pagination.pages}
                </span>
                <button
                  type="button"
                  onClick={() => setPagination((p) => ({ ...p, page: p.page + 1 }))}
                  disabled={pagination.page === pagination.pages}
                  className="px-3 py-1.5 rounded-lg bg-white/5 text-gray-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-all text-sm"
                >
                  Вперёд
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
