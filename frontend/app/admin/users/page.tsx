'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AdminLayout from '@/components/admin/AdminLayout';
import { 
  Users, 
  Search, 
  Eye,
  Calendar,
  Mail,
  MessageCircle,
  CheckCircle,
  XCircle,
  Plus,
  X,
  Wallet,
  ChevronDown
} from 'lucide-react';
import { Tariff, TariffPrice } from '@/types/tariff';

interface User {
  id: string;
  telegramId?: number;
  telegramUsername?: string;
  telegramFirstName?: string;
  telegramLastName?: string;
  discordId?: string;
  discordUsername?: string;
  email?: string;
  createdAt: string;
  totalSubscriptions: number;
  activeSubscriptions: number;
  subscriptionEndDate?: string;
  tariffId?: string;
  tariffName?: string;
}

interface NewUserForm {
  name: string;
  telegramId: string;
  telegramUsername: string;
  discordId: string;
  discordUsername: string;
  email: string;
  // Subscription fields
  createSubscription: boolean;
  tariffId: string;
  tariffPriceId: string;
  subscriptionAmount: number;
  subscriptionEndDate: string;
}

export default function UsersPage() {
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [subscriptionFilter, setSubscriptionFilter] = useState<string>('');
  const [stats, setStats] = useState({ total: 0, withActive: 0, withDiscord: 0, withEmail: 0 });
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, pages: 0 });
  
  // Тарифы
  const [tariffs, setTariffs] = useState<Tariff[]>([]);
  const [selectedTariff, setSelectedTariff] = useState<Tariff | null>(null);
  const [selectedPrice, setSelectedPrice] = useState<TariffPrice | null>(null);
  
  // Модальное окно добавления пользователя
  const [showAddModal, setShowAddModal] = useState(false);
  
  // Default end date: 1 month from now
  const getDefaultEndDate = (months: number = 1) => {
    const date = new Date();
    date.setMonth(date.getMonth() + months);
    return date.toISOString().split('T')[0];
  };

  const [newUser, setNewUser] = useState<NewUserForm>({
    name: '',
    telegramId: '',
    telegramUsername: '',
    discordId: '',
    discordUsername: '',
    email: '',
    createSubscription: true,
    tariffId: '',
    tariffPriceId: '',
    subscriptionAmount: 0,
    subscriptionEndDate: getDefaultEndDate()
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadUsers();
    loadTariffs();
  }, []);

  useEffect(() => {
    loadUsers();
  }, [subscriptionFilter, pagination.page]);

  const loadTariffs = async () => {
    try {
      const response = await fetch('/api/tariffs?activeOnly=true&includeCustom=true');
      if (response.ok) {
        const data = await response.json();
        setTariffs(data.tariffs || []);
      }
    } catch (error) {
      console.error('Error loading tariffs:', error);
    }
  };

  const loadUsers = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (subscriptionFilter) params.set('hasSubscription', subscriptionFilter);
      params.set('page', pagination.page.toString());
      params.set('limit', pagination.limit.toString());

      const response = await fetch(`/api/users?${params}`);
      if (!response.ok) throw new Error('Failed to fetch');
      
      const data = await response.json();
      setUsers(data.users || []);
      setPagination(prev => ({ ...prev, ...data.pagination }));

      // Подсчёт статистики
      setStats({
        total: data.pagination?.total || data.users?.length || 0,
        withActive: (data.users || []).filter((u: User) => u.activeSubscriptions > 0).length,
        withDiscord: (data.users || []).filter((u: User) => u.discordId).length,
        withEmail: (data.users || []).filter((u: User) => u.email).length,
      });
    } catch (error) {
      console.error('Error loading users:', error);
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  // Выбор тарифа
  const handleTariffSelect = (tariffId: string) => {
    const tariff = tariffs.find(t => t.id === tariffId);
    setSelectedTariff(tariff || null);
    setSelectedPrice(null);
    setNewUser(prev => ({
      ...prev,
      tariffId: tariffId,
      tariffPriceId: '',
      subscriptionAmount: 0
    }));
  };

  // Выбор ценовой опции
  const handlePriceSelect = (priceId: string) => {
    if (!selectedTariff) return;
    
    const price = selectedTariff.prices?.find(p => p.id === priceId);
    setSelectedPrice(price || null);
    
    if (price) {
      const total = price.periodMonths * price.monthlyPrice;
      setNewUser(prev => ({
        ...prev,
        tariffPriceId: priceId,
        subscriptionAmount: total,
        subscriptionEndDate: getDefaultEndDate(price.periodMonths)
      }));
    }
  };

  const handleAddUser = async () => {
    // Валидация
    if (!newUser.telegramId && !newUser.discordId && !newUser.email) {
      setError('Укажите хотя бы один идентификатор: Telegram ID, Discord ID или Email');
      return;
    }

    if (newUser.createSubscription && !newUser.subscriptionEndDate) {
      setError('Укажите дату окончания подписки');
      return;
    }

    if (newUser.createSubscription && !newUser.tariffId) {
      setError('Выберите тариф');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newUser.name || null,
          telegramId: newUser.telegramId ? parseInt(newUser.telegramId) : null,
          telegramUsername: newUser.telegramUsername || null,
          telegramFirstName: newUser.name || null,
          discordId: newUser.discordId || null,
          discordUsername: newUser.discordUsername || null,
          email: newUser.email || null,
          // Subscription data
          createSubscription: newUser.createSubscription,
          tariffId: newUser.tariffId,
          tariffPriceId: newUser.tariffPriceId,
          subscriptionAmount: newUser.subscriptionAmount,
          subscriptionEndDate: newUser.subscriptionEndDate
        })
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Не удалось создать пользователя');
        return;
      }

      // Успешно создан
      resetForm();
      setShowAddModal(false);
      loadUsers();
    } catch (error) {
      setError('Ошибка при создании пользователя');
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    setNewUser({ 
      name: '', 
      telegramId: '', 
      telegramUsername: '', 
      discordId: '', 
      discordUsername: '', 
      email: '',
      createSubscription: true,
      tariffId: '',
      tariffPriceId: '',
      subscriptionAmount: 0,
      subscriptionEndDate: getDefaultEndDate()
    });
    setSelectedTariff(null);
    setSelectedPrice(null);
  };

  const filteredUsers = users.filter(user => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      user.telegramUsername?.toLowerCase().includes(query) ||
      user.telegramFirstName?.toLowerCase().includes(query) ||
      user.discordId?.includes(query) ||
      user.email?.toLowerCase().includes(query) ||
      user.telegramId?.toString().includes(query)
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

  return (
    <AdminLayout title="Пользователи">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white mb-1">Пользователи</h1>
            <p className="text-gray-400 text-sm">Все пользователи, зарегистрированные через бота</p>
          </div>
          <button
            onClick={() => {
              resetForm();
              setShowAddModal(true);
            }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-500 text-white hover:bg-indigo-600 transition-all"
          >
            <Plus className="h-4 w-4" />
            Добавить
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
                <p className="text-2xl font-bold text-white">{stats.withActive}</p>
                <p className="text-sm text-gray-400">С подпиской</p>
              </div>
            </div>
          </div>
          <div className="rounded-xl bg-white/5 border border-white/10 p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center">
                <MessageCircle className="h-5 w-5 text-purple-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{stats.withDiscord}</p>
                <p className="text-sm text-gray-400">С Discord</p>
              </div>
            </div>
          </div>
          <div className="rounded-xl bg-white/5 border border-white/10 p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center">
                <Mail className="h-5 w-5 text-blue-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{stats.withEmail}</p>
                <p className="text-sm text-gray-400">С Email</p>
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
              placeholder="Поиск по username, email, Discord ID, Telegram ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-11 pr-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500/50 transition-all text-sm"
            />
          </div>
          <select
            value={subscriptionFilter}
            onChange={(e) => setSubscriptionFilter(e.target.value)}
            className="px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-indigo-500/50 transition-all text-sm"
          >
            <option value="">Все пользователи</option>
            <option value="true">С активной подпиской</option>
            <option value="false">Без подписки</option>
          </select>
        </div>

        {/* Table */}
        <div className="rounded-2xl bg-white/5 border border-white/10 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Telegram</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Discord</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Email</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Подписки</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Регистрация</th>
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
                ) : filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-gray-400">
                      Пользователи не найдены
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((user) => (
                    <tr key={user.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="px-6 py-4">
                        <div>
                          <p className="text-white font-medium">
                            {user.telegramUsername 
                              ? `@${user.telegramUsername}`
                              : user.telegramFirstName || user.email?.split('@')[0] || 'Unknown'}
                          </p>
                          {user.telegramId && (
                            <p className="text-xs text-gray-500">ID: {user.telegramId}</p>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {user.discordId ? (
                          <div>
                            <p className="text-white">{user.discordUsername || user.discordId}</p>
                            {user.discordUsername && (
                              <p className="text-xs text-gray-500">{user.discordId}</p>
                            )}
                          </div>
                        ) : (
                          <span className="text-gray-500">—</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span className={user.email ? 'text-white' : 'text-gray-500'}>
                          {user.email || '—'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          {user.activeSubscriptions > 0 ? (
                            <>
                              <CheckCircle className="h-4 w-4 text-emerald-400" />
                              <span className="text-emerald-400">
                                {user.activeSubscriptions} активн.
                              </span>
                              {user.subscriptionEndDate && (
                                <span className="text-xs text-gray-500">
                                  (до {formatDate(user.subscriptionEndDate)})
                                </span>
                              )}
                            </>
                          ) : (
                            <>
                              <XCircle className="h-4 w-4 text-gray-500" />
                              <span className="text-gray-500">Нет</span>
                            </>
                          )}
                        </div>
                        {user.totalSubscriptions > user.activeSubscriptions && (
                          <p className="text-xs text-gray-500 mt-1">
                            Всего: {user.totalSubscriptions}
                          </p>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 text-sm text-gray-400">
                          <Calendar className="h-4 w-4" />
                          {formatDate(user.createdAt)}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end">
                          <button
                            onClick={() => router.push(`/admin/users/${user.id}`)}
                            className="p-2 rounded-lg bg-white/5 text-gray-400 hover:text-white hover:bg-white/10 transition-all"
                            title="Подробнее"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
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

        {/* Add User Modal */}
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div 
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setShowAddModal(false)}
            />
            <div className="relative bg-[#1a1a2e] border border-white/10 rounded-2xl p-6 w-full max-w-lg mx-4 shadow-2xl max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-white">Добавить пользователя</h2>
                <button
                  onClick={() => setShowAddModal(false)}
                  className="p-2 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-all"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {error && (
                <div className="mb-4 p-3 rounded-lg bg-red-500/20 border border-red-500/30 text-red-400 text-sm">
                  {error}
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Имя</label>
                  <input
                    type="text"
                    value={newUser.name}
                    onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                    placeholder="Иван Иванов"
                    className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500/50 transition-all"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-gray-400 mb-2">Telegram ID</label>
                    <input
                      type="text"
                      value={newUser.telegramId}
                      onChange={(e) => setNewUser({ ...newUser, telegramId: e.target.value.replace(/\D/g, '') })}
                      placeholder="123456789"
                      className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500/50 transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-2">Telegram Username</label>
                    <input
                      type="text"
                      value={newUser.telegramUsername}
                      onChange={(e) => setNewUser({ ...newUser, telegramUsername: e.target.value.replace('@', '') })}
                      placeholder="username"
                      className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500/50 transition-all"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-gray-400 mb-2">Discord ID</label>
                    <input
                      type="text"
                      value={newUser.discordId}
                      onChange={(e) => setNewUser({ ...newUser, discordId: e.target.value.replace(/\D/g, '') })}
                      placeholder="123456789012345678"
                      className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500/50 transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-2">Discord Username</label>
                    <input
                      type="text"
                      value={newUser.discordUsername}
                      onChange={(e) => setNewUser({ ...newUser, discordUsername: e.target.value })}
                      placeholder="user#1234"
                      className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500/50 transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm text-gray-400 mb-2">Email</label>
                  <input
                    type="email"
                    value={newUser.email}
                    onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                    placeholder="user@example.com"
                    className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500/50 transition-all"
                  />
                </div>

                <p className="text-xs text-gray-500">
                  * Укажите хотя бы один идентификатор: Telegram ID, Discord ID или Email
                </p>

                {/* Subscription Section */}
                <div className="pt-4 border-t border-white/10">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newUser.createSubscription}
                      onChange={(e) => setNewUser({ ...newUser, createSubscription: e.target.checked })}
                      className="w-4 h-4 rounded bg-white/10 border-white/20 text-indigo-500 focus:ring-indigo-500 focus:ring-offset-0"
                    />
                    <span className="text-white font-medium">Создать подписку</span>
                  </label>
                </div>

                {newUser.createSubscription && (
                  <div className="space-y-4 p-4 rounded-xl bg-white/5">
                    {/* Выбор тарифа */}
                    <div>
                      <label className="block text-sm text-gray-400 mb-2">
                        <Wallet className="inline h-4 w-4 mr-1" />
                        Тариф
                      </label>
                      <select
                        value={newUser.tariffId}
                        onChange={(e) => handleTariffSelect(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-indigo-500/50 transition-all"
                      >
                        <option value="">Выберите тариф...</option>
                        {tariffs.map(tariff => (
                          <option key={tariff.id} value={tariff.id}>
                            {tariff.name} {tariff.isCustom ? '(кастомный)' : ''}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Выбор ценовой опции */}
                    {selectedTariff && selectedTariff.prices && selectedTariff.prices.length > 0 && (
                      <div>
                        <label className="block text-sm text-gray-400 mb-2">Ценовая опция</label>
                        <div className="space-y-2">
                          {selectedTariff.prices.map(price => (
                            <button
                              key={price.id}
                              type="button"
                              onClick={() => handlePriceSelect(price.id)}
                              className={`w-full flex items-center justify-between p-3 rounded-xl border transition-all ${
                                selectedPrice?.id === price.id
                                  ? 'border-indigo-500 bg-indigo-500/20'
                                  : 'border-white/10 bg-white/5 hover:bg-white/10'
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                <span className="text-white font-medium">
                                  {price.periodMonths} {price.periodMonths === 1 ? 'месяц' : price.periodMonths < 5 ? 'месяца' : 'месяцев'}
                                </span>
                                {price.isPopular && (
                                  <span className="px-2 py-0.5 text-xs rounded-full bg-amber-500/20 text-amber-400">
                                    Популярный
                                  </span>
                                )}
                              </div>
                              <div className="text-right">
                                <p className="text-white font-semibold">
                                  {(price.periodMonths * price.monthlyPrice).toFixed(2)} USDT
                                </p>
                                <p className="text-xs text-gray-500">
                                  {price.monthlyPrice.toFixed(2)} USDT/мес
                                </p>
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Ручной ввод суммы */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm text-gray-400 mb-2">Сумма (USDT)</label>
                        <input
                          type="number"
                          step="0.01"
                          value={newUser.subscriptionAmount}
                          onChange={(e) => setNewUser({ ...newUser, subscriptionAmount: parseFloat(e.target.value) || 0 })}
                          placeholder="0.00"
                          className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500/50 transition-all"
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-gray-400 mb-2">Дата окончания</label>
                        <input
                          type="date"
                          value={newUser.subscriptionEndDate}
                          onChange={(e) => setNewUser({ ...newUser, subscriptionEndDate: e.target.value })}
                          className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-indigo-500/50 transition-all"
                        />
                      </div>
                    </div>

                    {/* Quick date buttons */}
                    <div className="flex gap-2 flex-wrap">
                      {[1, 3, 6, 12].map(months => (
                        <button
                          key={months}
                          type="button"
                          onClick={() => {
                            setNewUser({ 
                              ...newUser, 
                              subscriptionEndDate: getDefaultEndDate(months)
                            });
                          }}
                          className="px-3 py-1.5 text-xs rounded-lg bg-white/5 text-gray-300 hover:bg-white/10 transition-all"
                        >
                          +{months} {months === 1 ? 'мес' : months === 12 ? 'год' : 'мес'}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-white/5 text-gray-300 hover:bg-white/10 transition-all"
                >
                  Отмена
                </button>
                <button
                  onClick={handleAddUser}
                  disabled={saving}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-indigo-500 text-white hover:bg-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  {saving ? 'Сохранение...' : 'Добавить'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
