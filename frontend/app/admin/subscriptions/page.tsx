'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AdminLayout from '@/components/admin/AdminLayout';
import { normalizeErrorMessage } from '@/lib/error-utils';
import { 
  Users, 
  Search, 
  Filter,
  Eye,
  Edit,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Calendar,
  DollarSign,
  RefreshCw,
  X,
  Ban,
  Play,
  Plus
} from 'lucide-react';

interface Subscription {
  id: string;
  userId: string;
  tariffId?: string;
  periodMonths: number;
  amount: number;
  currency: string;
  status: 'pending' | 'active' | 'expired' | 'cancelled';
  startDate?: string;
  endDate?: string;
  isFree?: boolean;
  discordRoleGranted: boolean;
  notionAccessGranted: boolean;
  createdAt: string;
  user?: {
    telegramId: number;
    telegramUsername?: string;
    telegramFirstName?: string;
    discordId?: string;
    email?: string;
  };
  tariff?: {
    id: string;
    name: string;
    price: number;
    durationDays: number;
  };
}

interface EditForm {
  status: string;
  endDate: string;
  notes: string;
  isFree: boolean;
}

const statusConfig = {
  pending: { label: 'Ожидает', color: 'bg-yellow-500/20 text-yellow-400', icon: Clock },
  active: { label: 'Активна', color: 'bg-emerald-500/20 text-emerald-400', icon: CheckCircle },
  expired: { label: 'Истекла', color: 'bg-red-500/20 text-red-400', icon: XCircle },
  cancelled: { label: 'Отменена', color: 'bg-gray-500/20 text-gray-400', icon: AlertCircle },
};

export default function SubscriptionsPage() {
  const router = useRouter();
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [stats, setStats] = useState({ total: 0, active: 0, pending: 0, expired: 0 });
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, pages: 0 });
  
  // Edit modal
  const [editingSub, setEditingSub] = useState<Subscription | null>(null);
  const [editForm, setEditForm] = useState<EditForm>({ status: '', endDate: '', notes: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadSubscriptions();
  }, [statusFilter, pagination.page]);

  const loadSubscriptions = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (statusFilter) params.set('status', statusFilter);
      params.set('page', pagination.page.toString());
      params.set('limit', pagination.limit.toString());

      const response = await fetch(`/api/subscriptions?${params}`);
      if (!response.ok) throw new Error('Failed to fetch');
      
      const data = await response.json();
      setSubscriptions(data.subscriptions);
      setPagination(prev => ({ ...prev, ...data.pagination }));

      // Подсчёт статистики
      const statsResponse = await fetch('/api/subscriptions?limit=1000');
      const statsData = await statsResponse.json();
      const allSubs = statsData.subscriptions;
      setStats({
        total: allSubs.length,
        active: allSubs.filter((s: Subscription) => s.status === 'active').length,
        pending: allSubs.filter((s: Subscription) => s.status === 'pending').length,
        expired: allSubs.filter((s: Subscription) => s.status === 'expired').length,
      });
    } catch (error) {
      console.error('Error loading subscriptions:', error);
    } finally {
      setLoading(false);
    }
  };

  const runScheduler = async () => {
    try {
      const response = await fetch('/api/scheduler?action=run', { method: 'POST' });
      const data = await response.json();
      if (data.success) {
        alert('Scheduler выполнен успешно');
        loadSubscriptions();
      } else {
        alert('Ошибка: ' + data.message);
      }
    } catch (error) {
      alert('Ошибка запуска scheduler');
    }
  };

  const openEditModal = (sub: Subscription) => {
    setEditingSub(sub);
    setEditForm({
      status: sub.status,
      endDate: sub.endDate ? new Date(sub.endDate).toISOString().split('T')[0] : '',
      notes: '',
      isFree: Boolean(sub.isFree)
    });
    setError(null);
  };

  const handleSave = async () => {
    if (!editingSub) return;

    setSaving(true);
    setError(null);

    try {
      const response = await fetch(`/api/subscriptions/${editingSub.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: editForm.status,
          endDate: editForm.endDate ? new Date(editForm.endDate).toISOString() : null,
          notes: editForm.notes || null,
          isFree: editForm.isFree
        })
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Не удалось обновить подписку');
        return;
      }

      setEditingSub(null);
      loadSubscriptions();
    } catch (error) {
      setError('Ошибка при обновлении подписки');
    } finally {
      setSaving(false);
    }
  };

  const quickDeactivate = async (sub: Subscription) => {
    if (!confirm('Деактивировать подписку? Доступы Discord и Notion будут отозваны.')) return;

    try {
      const response = await fetch(`/api/subscriptions/${sub.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'cancelled' })
      });

      const data = await response.json().catch(() => ({}));
      if (response.ok) {
        loadSubscriptions();
      } else {
        alert(data.error || 'Ошибка деактивации');
      }
    } catch (error) {
      alert('Ошибка деактивации: ' + normalizeErrorMessage(error));
    }
  };

  const quickActivate = async (sub: Subscription) => {
    if (!confirm('Активировать подписку?')) return;

    try {
      const endDate = new Date();
      endDate.setMonth(endDate.getMonth() + (sub.periodMonths || 1));

      const response = await fetch(`/api/subscriptions/${sub.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          status: 'active',
          startDate: new Date().toISOString(),
          endDate: endDate.toISOString()
        })
      });

      const data = await response.json().catch(() => ({}));
      if (response.ok) {
        loadSubscriptions();
      } else {
        alert(data.error || 'Ошибка активации');
      }
    } catch (error) {
      alert('Ошибка активации: ' + (error instanceof Error ? error.message : 'сеть'));
    }
  };

  const extendSubscription = async (sub: Subscription, months: number) => {
    try {
      const currentEnd = sub.endDate ? new Date(sub.endDate) : new Date();
      const newEnd = new Date(currentEnd);
      newEnd.setMonth(newEnd.getMonth() + months);

      const response = await fetch(`/api/subscriptions/${sub.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          status: 'active',
          endDate: newEnd.toISOString()
        })
      });

      const data = await response.json().catch(() => ({}));
      if (response.ok) {
        loadSubscriptions();
      } else {
        alert(data.error || 'Ошибка продления');
      }
    } catch (error) {
      alert('Ошибка продления: ' + normalizeErrorMessage(error));
    }
  };

  const filteredSubscriptions = subscriptions.filter(sub => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      sub.user?.telegramUsername?.toLowerCase().includes(query) ||
      sub.user?.telegramFirstName?.toLowerCase().includes(query) ||
      sub.user?.discordId?.includes(query) ||
      sub.user?.email?.toLowerCase().includes(query) ||
      sub.id.includes(query)
    );
  });

  const formatDate = (dateString?: string) => {
    if (!dateString) return '—';
    return new Date(dateString).toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const getDaysLeft = (endDate?: string) => {
    if (!endDate) return null;
    const end = new Date(endDate);
    const now = new Date();
    const days = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return days;
  };

  return (
    <AdminLayout title="Подписки">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white mb-1">Подписки</h1>
            <p className="text-gray-400 text-sm">Управление подписками пользователей</p>
          </div>
          <button
            onClick={runScheduler}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-500/20 text-indigo-400 hover:bg-indigo-500/30 transition-all"
          >
            <RefreshCw className="h-4 w-4" />
            Проверить истёкшие
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="rounded-xl bg-white/5 border border-white/10 p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/20 flex items-center justify-center">
                <Users className="h-5 w-5 text-indigo-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{stats.total}</p>
                <p className="text-sm text-gray-400">Всего</p>
              </div>
            </div>
          </div>
          <div className="rounded-xl bg-white/5 border border-white/10 p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                <CheckCircle className="h-5 w-5 text-emerald-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{stats.active}</p>
                <p className="text-sm text-gray-400">Активных</p>
              </div>
            </div>
          </div>
          <div className="rounded-xl bg-white/5 border border-white/10 p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-yellow-500/20 flex items-center justify-center">
                <Clock className="h-5 w-5 text-yellow-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{stats.pending}</p>
                <p className="text-sm text-gray-400">Ожидают</p>
              </div>
            </div>
          </div>
          <div className="rounded-xl bg-white/5 border border-white/10 p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-500/20 flex items-center justify-center">
                <XCircle className="h-5 w-5 text-red-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{stats.expired}</p>
                <p className="text-sm text-gray-400">Истекших</p>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
            <input
              type="text"
              placeholder="Поиск по username, email, Discord ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-11 pr-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500/50 transition-all text-sm"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-indigo-500/50 transition-all text-sm"
          >
            <option value="">Все статусы</option>
            <option value="active">Активные</option>
            <option value="pending">Ожидающие</option>
            <option value="expired">Истёкшие</option>
            <option value="cancelled">Отменённые</option>
          </select>
        </div>

        {/* Table */}
        <div className="rounded-2xl bg-white/5 border border-white/10 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Пользователь</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Тариф</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Статус</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Период</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Доступы</th>
                  <th className="px-6 py-4 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">Действия</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-gray-400">
                      Загрузка...
                    </td>
                  </tr>
                ) : filteredSubscriptions.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-gray-400">
                      Подписки не найдены
                    </td>
                  </tr>
                ) : (
                  filteredSubscriptions.map((sub) => {
                    const StatusIcon = statusConfig[sub.status].icon;
                    const daysLeft = sub.status === 'active' ? getDaysLeft(sub.endDate) : null;

                    return (
                      <tr key={sub.id} className="hover:bg-white/[0.02] transition-colors">
                        <td className="px-6 py-4">
                          <div>
                            <p className="text-white font-medium">
                              {sub.user?.telegramUsername 
                                ? `@${sub.user.telegramUsername}`
                                : sub.user?.telegramFirstName || 'Unknown'}
                            </p>
                            <p className="text-xs text-gray-500">
                              {sub.user?.email || sub.user?.discordId || `TG: ${sub.user?.telegramId}`}
                            </p>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div>
                            {sub.isFree && (
                              <span className="inline-block mr-2 px-2 py-0.5 rounded text-xs bg-amber-500/20 text-amber-400">Бесплатная</span>
                            )}
                            {sub.tariff ? (
                              <>
                                <p className="text-white font-medium">{sub.tariff.name}</p>
                                <p className="text-xs text-gray-500">
                                  {sub.amount.toFixed(2)} USDT / {sub.tariff.durationDays} дн.
                                </p>
                              </>
                            ) : (
                              <div className="flex items-center gap-2">
                                <DollarSign className="h-4 w-4 text-gray-500" />
                                <span className="text-white">{sub.amount.toFixed(2)} USDT</span>
                                <span className="text-gray-500">/ {sub.periodMonths} мес.</span>
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium ${statusConfig[sub.status].color}`}>
                            <StatusIcon className="h-3.5 w-3.5" />
                            {statusConfig[sub.status].label}
                          </span>
                          {daysLeft !== null && daysLeft <= 7 && daysLeft > 0 && (
                            <span className="ml-2 text-xs text-yellow-400">
                              ({daysLeft} дн.)
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2 text-sm">
                            <Calendar className="h-4 w-4 text-gray-500" />
                            <span className="text-gray-300">
                              {formatDate(sub.startDate)} — {formatDate(sub.endDate)}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <span className={`w-2 h-2 rounded-full ${sub.discordRoleGranted ? 'bg-emerald-500' : 'bg-gray-500'}`} title="Discord" />
                            <span className={`w-2 h-2 rounded-full ${sub.notionAccessGranted ? 'bg-emerald-500' : 'bg-gray-500'}`} title="Notion" />
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-end gap-1">
                            {sub.status === 'active' && (
                              <button
                                onClick={() => quickDeactivate(sub)}
                                className="p-2 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-all"
                                title="Деактивировать"
                              >
                                <Ban className="h-4 w-4" />
                              </button>
                            )}
                            {(sub.status === 'pending' || sub.status === 'expired' || sub.status === 'cancelled') && (
                              <button
                                onClick={() => quickActivate(sub)}
                                className="p-2 rounded-lg bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 transition-all"
                                title="Активировать"
                              >
                                <Play className="h-4 w-4" />
                              </button>
                            )}
                            {sub.status === 'active' && (
                              <button
                                onClick={() => extendSubscription(sub, 1)}
                                className="p-2 rounded-lg bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 transition-all"
                                title="+1 месяц"
                              >
                                <Plus className="h-4 w-4" />
                              </button>
                            )}
                            <button
                              onClick={() => openEditModal(sub)}
                              className="p-2 rounded-lg bg-indigo-500/20 text-indigo-400 hover:bg-indigo-500/30 transition-all"
                              title="Редактировать"
                            >
                              <Edit className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {pagination.pages > 1 && (
            <div className="px-6 py-4 border-t border-white/10 flex items-center justify-between">
              <p className="text-sm text-gray-400">
                Показано {(pagination.page - 1) * pagination.limit + 1} - {Math.min(pagination.page * pagination.limit, pagination.total)} из {pagination.total}
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPagination(p => ({ ...p, page: p.page - 1 }))}
                  disabled={pagination.page === 1}
                  className="px-3 py-1.5 rounded-lg bg-white/5 text-gray-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  Назад
                </button>
                <span className="text-sm text-gray-400">
                  {pagination.page} / {pagination.pages}
                </span>
                <button
                  onClick={() => setPagination(p => ({ ...p, page: p.page + 1 }))}
                  disabled={pagination.page === pagination.pages}
                  className="px-3 py-1.5 rounded-lg bg-white/5 text-gray-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  Далее
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Edit Modal */}
        {editingSub && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div 
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setEditingSub(null)}
            />
            <div className="relative bg-[#1a1a2e] border border-white/10 rounded-2xl p-6 w-full max-w-md mx-4 shadow-2xl">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-white">Редактировать подписку</h2>
                <button
                  onClick={() => setEditingSub(null)}
                  className="p-2 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-all"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* User info */}
              <div className="mb-6 p-3 rounded-lg bg-white/5">
                <p className="text-white font-medium">
                  {editingSub.user?.telegramUsername 
                    ? `@${editingSub.user.telegramUsername}`
                    : editingSub.user?.telegramFirstName || editingSub.user?.email || 'Unknown'}
                </p>
                <p className="text-sm text-gray-400">
                  {editingSub.tariff ? (
                    <span>{editingSub.tariff.name} — {editingSub.amount.toFixed(2)} USDT</span>
                  ) : (
                    <span>{editingSub.amount.toFixed(2)} USDT / {editingSub.periodMonths} мес.</span>
                  )}
                </p>
              </div>

              {error && (
                <div className="mb-4 p-3 rounded-lg bg-red-500/20 border border-red-500/30 text-red-400 text-sm">
                  {error}
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Статус</label>
                  <select
                    value={editForm.status}
                    onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-indigo-500/50 transition-all"
                  >
                    <option value="pending">Ожидает оплаты</option>
                    <option value="active">Активна</option>
                    <option value="expired">Истекла</option>
                    <option value="cancelled">Отменена</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm text-gray-400 mb-2">Дата окончания</label>
                  <input
                    type="date"
                    value={editForm.endDate}
                    onChange={(e) => setEditForm({ ...editForm, endDate: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-indigo-500/50 transition-all"
                  />
                </div>

                <div>
                  <label className="block text-sm text-gray-400 mb-2">Заметка (опционально)</label>
                  <textarea
                    value={editForm.notes}
                    onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                    placeholder="Причина изменения..."
                    rows={2}
                    className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500/50 transition-all resize-none"
                  />
                </div>

                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="edit-isFree"
                    checked={editForm.isFree}
                    onChange={(e) => setEditForm({ ...editForm, isFree: e.target.checked })}
                    className="w-4 h-4 rounded border-white/20 bg-white/5 text-amber-500 focus:ring-amber-500"
                  />
                  <label htmlFor="edit-isFree" className="text-sm text-gray-300">
                    Бесплатная подписка (не входит в прибыль)
                  </label>
                </div>

                {/* Quick actions */}
                <div className="pt-2 border-t border-white/10">
                  <p className="text-xs text-gray-500 mb-2">Быстрые действия:</p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        const date = new Date();
                        date.setMonth(date.getMonth() + 1);
                        setEditForm({ ...editForm, endDate: date.toISOString().split('T')[0], status: 'active' });
                      }}
                      className="px-3 py-1.5 text-xs rounded-lg bg-white/5 text-gray-300 hover:bg-white/10 transition-all"
                    >
                      +1 мес
                    </button>
                    <button
                      onClick={() => {
                        const date = new Date();
                        date.setMonth(date.getMonth() + 3);
                        setEditForm({ ...editForm, endDate: date.toISOString().split('T')[0], status: 'active' });
                      }}
                      className="px-3 py-1.5 text-xs rounded-lg bg-white/5 text-gray-300 hover:bg-white/10 transition-all"
                    >
                      +3 мес
                    </button>
                    <button
                      onClick={() => {
                        const date = new Date();
                        date.setMonth(date.getMonth() + 6);
                        setEditForm({ ...editForm, endDate: date.toISOString().split('T')[0], status: 'active' });
                      }}
                      className="px-3 py-1.5 text-xs rounded-lg bg-white/5 text-gray-300 hover:bg-white/10 transition-all"
                    >
                      +6 мес
                    </button>
                    <button
                      onClick={() => {
                        const date = new Date();
                        date.setFullYear(date.getFullYear() + 1);
                        setEditForm({ ...editForm, endDate: date.toISOString().split('T')[0], status: 'active' });
                      }}
                      className="px-3 py-1.5 text-xs rounded-lg bg-white/5 text-gray-300 hover:bg-white/10 transition-all"
                    >
                      +1 год
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setEditingSub(null)}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-white/5 text-gray-300 hover:bg-white/10 transition-all"
                >
                  Отмена
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-indigo-500 text-white hover:bg-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  {saving ? 'Сохранение...' : 'Сохранить'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
