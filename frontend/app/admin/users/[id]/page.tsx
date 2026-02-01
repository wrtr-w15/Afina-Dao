'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import AdminLayout from '@/components/admin/AdminLayout';
import {
  ArrowLeft,
  Save,
  User,
  Mail,
  MessageCircle,
  Calendar,
  Wallet,
  Bot,
  CheckCircle,
  Edit3
} from 'lucide-react';
import { Tariff } from '@/types/tariff';

interface UserDetail {
  id: string;
  telegramId?: number;
  telegramUsername?: string;
  telegramFirstName?: string;
  telegramLastName?: string;
  discordId?: string;
  discordUsername?: string;
  email?: string;
  createdAt: string;
  updatedAt: string;
  availableTariffIds: string[];
  availableTariffs: { tariffId: string; tariffName: string }[];
  subscriptions: any[];
  payments: any[];
}

interface UserForm {
  telegramId: string;
  telegramUsername: string;
  telegramFirstName: string;
  telegramLastName: string;
  discordId: string;
  discordUsername: string;
  email: string;
}

export default function UserEditPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [user, setUser] = useState<UserDetail | null>(null);
  const [tariffs, setTariffs] = useState<Tariff[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingSub, setSavingSub] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [selectedTariffId, setSelectedTariffId] = useState<string | null>(null);
  const [formUser, setFormUser] = useState<UserForm>({
    telegramId: '',
    telegramUsername: '',
    telegramFirstName: '',
    telegramLastName: '',
    discordId: '',
    discordUsername: '',
    email: ''
  });
  const [editingSubId, setEditingSubId] = useState<string | null>(null);
  const [subEditForm, setSubEditForm] = useState<{ endDate: string; startDate: string; status: string; isFree: boolean }>({ endDate: '', startDate: '', status: 'active', isFree: false });

  useEffect(() => {
    loadUser();
    loadTariffs();
  }, [id]);

  const loadUser = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/users/${id}`);
      if (!res.ok) {
        if (res.status === 404) setError('Пользователь не найден');
        return;
      }
      const data = await res.json();
      setUser(data);
      setSelectedTariffId((data.availableTariffIds && data.availableTariffIds[0]) ? data.availableTariffIds[0] : null);
      setFormUser({
        telegramId: data.telegramId != null ? String(data.telegramId) : '',
        telegramUsername: data.telegramUsername || '',
        telegramFirstName: data.telegramFirstName || '',
        telegramLastName: data.telegramLastName || '',
        discordId: data.discordId || '',
        discordUsername: data.discordUsername || '',
        email: data.email || ''
      });
    } catch (e) {
      setError('Ошибка загрузки');
    } finally {
      setLoading(false);
    }
  };

  const loadTariffs = async () => {
    try {
      // Все тарифы, включая неактивные и архивные — чтобы у старых пользователей сохранялся закреплённый тариф
      const res = await fetch('/api/tariffs?includeArchived=true&includeCustom=true');
      if (res.ok) {
        const data = await res.json();
        setTariffs(data.tariffs || []);
      }
    } catch (e) {
      console.error('Error loading tariffs:', e);
    }
  };

  const handleSaveUser = async () => {
    setSaving(true);
    setError(null);
    setSuccessMsg(null);
    try {
      const res = await fetch(`/api/users/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          telegramId: formUser.telegramId ? Number(formUser.telegramId) : null,
          telegramUsername: formUser.telegramUsername || null,
          telegramFirstName: formUser.telegramFirstName || null,
          telegramLastName: formUser.telegramLastName || null,
          discordId: formUser.discordId || null,
          discordUsername: formUser.discordUsername || null,
          email: formUser.email || null
        })
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Ошибка сохранения');
        return;
      }
      setSuccessMsg('Данные пользователя сохранены.');
      setUser(prev => prev ? {
        ...prev,
        telegramId: formUser.telegramId ? Number(formUser.telegramId) : undefined,
        telegramUsername: formUser.telegramUsername || undefined,
        telegramFirstName: formUser.telegramFirstName || undefined,
        telegramLastName: formUser.telegramLastName || undefined,
        discordId: formUser.discordId || undefined,
        discordUsername: formUser.discordUsername || undefined,
        email: formUser.email || undefined
      } : null);
    } catch (e) {
      setError('Ошибка сохранения');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveTariffs = async () => {
    if (!user) return;
    setSaving(true);
    setError(null);
    setSuccessMsg(null);
    try {
      const res = await fetch(`/api/users/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ availableTariffIds: selectedTariffId ? [selectedTariffId] : [] })
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Ошибка сохранения');
        return;
      }
      setSuccessMsg('Тариф для бота сохранён.');
      setUser(prev => prev ? { ...prev, availableTariffIds: selectedTariffId ? [selectedTariffId] : [] } : null);
    } catch (e) {
      setError('Ошибка сохранения');
    } finally {
      setSaving(false);
    }
  };

  const openSubEdit = (sub: any) => {
    setEditingSubId(sub.id);
    setSubEditForm({
      endDate: sub.endDate ? new Date(sub.endDate).toISOString().split('T')[0] : '',
      startDate: sub.startDate ? new Date(sub.startDate).toISOString().split('T')[0] : '',
      status: sub.status || 'active',
      isFree: Boolean(sub.isFree)
    });
  };

  const handleSaveSubscription = async () => {
    if (!editingSubId) return;
    setSavingSub(editingSubId);
    setError(null);
    setSuccessMsg(null);
    try {
      const res = await fetch(`/api/subscriptions/${editingSubId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: subEditForm.status,
          startDate: subEditForm.startDate ? new Date(subEditForm.startDate).toISOString() : null,
          endDate: subEditForm.endDate ? new Date(subEditForm.endDate).toISOString() : null,
          isFree: subEditForm.isFree
        })
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Ошибка сохранения подписки');
        return;
      }
      setSuccessMsg('Подписка обновлена.');
      setEditingSubId(null);
      loadUser();
    } catch (e) {
      setError('Ошибка сохранения подписки');
    } finally {
      setSavingSub(null);
    }
  };


  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  if (loading || !user) {
    return (
      <AdminLayout title="Пользователь">
        <div className="flex items-center justify-center py-24 text-gray-400">
          {loading ? 'Загрузка...' : error || 'Пользователь не найден'}
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title={`Пользователь: ${user.telegramUsername ? `@${user.telegramUsername}` : user.telegramFirstName || user.id.slice(0, 8)}`}>
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push('/admin/users')}
            className="p-2 rounded-xl bg-white/5 text-gray-400 hover:text-white hover:bg-white/10 transition-all"
            title="Назад"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-2xl font-bold text-white">Редактирование пользователя</h1>
        </div>

        {error && (
          <div className="p-4 rounded-xl bg-red-500/20 border border-red-500/30 text-red-400 text-sm">
            {error}
          </div>
        )}
        {successMsg && (
          <div className="p-4 rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-sm flex items-center gap-2">
            <CheckCircle className="h-4 w-4 shrink-0" />
            {successMsg}
          </div>
        )}

        {/* Редактирование данных пользователя */}
        <div className="rounded-2xl bg-white/5 border border-white/10 overflow-hidden">
          <div className="p-6">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <User className="h-5 w-5 text-indigo-400" />
              Данные пользователя
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Telegram ID</label>
                <input
                  type="text"
                  value={formUser.telegramId}
                  onChange={e => setFormUser(u => ({ ...u, telegramId: e.target.value.replace(/\D/g, '') }))}
                  placeholder="123456789"
                  className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500/50"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Telegram @username</label>
                <input
                  type="text"
                  value={formUser.telegramUsername}
                  onChange={e => setFormUser(u => ({ ...u, telegramUsername: e.target.value.replace('@', '') }))}
                  placeholder="username"
                  className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500/50"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Имя (Telegram)</label>
                <input
                  type="text"
                  value={formUser.telegramFirstName}
                  onChange={e => setFormUser(u => ({ ...u, telegramFirstName: e.target.value }))}
                  placeholder="Имя"
                  className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500/50"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Фамилия (Telegram)</label>
                <input
                  type="text"
                  value={formUser.telegramLastName}
                  onChange={e => setFormUser(u => ({ ...u, telegramLastName: e.target.value }))}
                  placeholder="Фамилия"
                  className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500/50"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Discord ID</label>
                <input
                  type="text"
                  value={formUser.discordId}
                  onChange={e => setFormUser(u => ({ ...u, discordId: e.target.value }))}
                  placeholder="123456789012345678"
                  className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500/50"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Discord username</label>
                <input
                  type="text"
                  value={formUser.discordUsername}
                  onChange={e => setFormUser(u => ({ ...u, discordUsername: e.target.value }))}
                  placeholder="username#0"
                  className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500/50"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm text-gray-400 mb-1">Email</label>
                <input
                  type="email"
                  value={formUser.email}
                  onChange={e => setFormUser(u => ({ ...u, email: e.target.value }))}
                  placeholder="user@example.com"
                  className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500/50"
                />
              </div>
            </div>
            <p className="text-xs text-gray-500 mb-4">Создан: {formatDate(user.createdAt)}</p>
            <button
              onClick={handleSaveUser}
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-500 text-white hover:bg-indigo-600 disabled:opacity-50 transition-all"
            >
              <Save className="h-4 w-4" />
              {saving ? 'Сохранение...' : 'Сохранить данные пользователя'}
            </button>
          </div>
        </div>

        {/* Тариф в Telegram-боте */}
        <div className="rounded-2xl bg-white/5 border border-white/10 overflow-hidden">
          <div className="p-6">
            <h2 className="text-lg font-semibold text-white mb-2 flex items-center gap-2">
              <Bot className="h-5 w-5 text-indigo-400" />
              Тариф в Telegram-боте
            </h2>
            <p className="text-sm text-gray-400 mb-4">
              Выберите один тариф, который этот пользователь будет видеть при оплате в боте. Показаны все тарифы, включая неактивные. Если выбран «По умолчанию» — показывается тариф по умолчанию.
            </p>
            {tariffs.length === 0 ? (
              <p className="text-gray-500 text-sm">Нет тарифов. Создайте тарифы в разделе «Тарифы».</p>
            ) : (
              <div className="space-y-3">
                <label className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/10 hover:bg-white/[0.07] cursor-pointer transition-all">
                  <input
                    type="radio"
                    name="bot-tariff"
                    checked={selectedTariffId === null}
                    onChange={() => setSelectedTariffId(null)}
                    className="w-4 h-4 border-white/20 bg-white/5 text-indigo-500 focus:ring-indigo-500"
                  />
                  <span className="text-white font-medium">По умолчанию</span>
                </label>
                {tariffs.map(tariff => (
                  <label
                    key={tariff.id}
                    className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/10 hover:bg-white/[0.07] cursor-pointer transition-all"
                  >
                    <input
                      type="radio"
                      name="bot-tariff"
                      checked={selectedTariffId === tariff.id}
                      onChange={() => setSelectedTariffId(tariff.id)}
                      className="w-4 h-4 border-white/20 bg-white/5 text-indigo-500 focus:ring-indigo-500"
                    />
                    <span className="text-white font-medium">{tariff.name}</span>
                    {!tariff.isActive && (
                      <span className="text-xs px-2 py-0.5 rounded bg-gray-500/30 text-gray-400">неактив.</span>
                    )}
                    {tariff.prices?.length ? (
                      <span className="text-gray-500 text-sm">
                        {tariff.prices.length} период(ов)
                      </span>
                    ) : null}
                  </label>
                ))}
              </div>
            )}
            <div className="mt-6 flex items-center gap-3">
              <button
                onClick={handleSaveTariffs}
                disabled={saving}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-500 text-white hover:bg-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                <Save className="h-4 w-4" />
                {saving ? 'Сохранение...' : 'Сохранить тариф для бота'}
              </button>
              {selectedTariffId === null && (
                <span className="text-gray-500 text-sm">Будет использоваться тариф по умолчанию</span>
              )}
            </div>
          </div>
        </div>

        {/* Подписки — редактирование дат и статуса */}
        {user.subscriptions && user.subscriptions.length > 0 && (
          <div className="rounded-2xl bg-white/5 border border-white/10 overflow-hidden">
            <div className="p-6">
              <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <Wallet className="h-5 w-5 text-indigo-400" />
                Подписки
              </h2>
              <p className="text-sm text-gray-400 mb-4">
                Можно изменить дату окончания, дату начала и статус подписки. Платежей: {user.payments?.length || 0}.{' '}
                <button
                  type="button"
                  onClick={() => router.push('/admin/subscriptions')}
                  className="text-indigo-400 hover:underline"
                >
                  Все подписки
                </button>
              </p>
              <div className="space-y-4">
                {user.subscriptions.map((sub: any) => (
                  <div
                    key={sub.id}
                    className="p-4 rounded-xl bg-white/5 border border-white/10"
                  >
                    {editingSubId === sub.id ? (
                      <div className="space-y-3">
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <div>
                            <label className="block text-xs text-gray-400 mb-1">Статус</label>
                            <select
                              value={subEditForm.status}
                              onChange={e => setSubEditForm(s => ({ ...s, status: e.target.value }))}
                              className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-indigo-500/50"
                            >
                              <option value="pending">Ожидает</option>
                              <option value="active">Активна</option>
                              <option value="expired">Истекла</option>
                              <option value="cancelled">Отменена</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-xs text-gray-400 mb-1">Дата начала</label>
                            <input
                              type="date"
                              value={subEditForm.startDate}
                              onChange={e => setSubEditForm(s => ({ ...s, startDate: e.target.value }))}
                              className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-indigo-500/50"
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-gray-400 mb-1">Дата окончания</label>
                            <input
                              type="date"
                              value={subEditForm.endDate}
                              onChange={e => setSubEditForm(s => ({ ...s, endDate: e.target.value }))}
                              className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-indigo-500/50"
                            />
                          </div>
                        </div>
                        <div className="flex items-center gap-3 mt-2">
                          <input
                            type="checkbox"
                            id="sub-edit-isFree"
                            checked={subEditForm.isFree}
                            onChange={e => setSubEditForm(s => ({ ...s, isFree: e.target.checked }))}
                            className="w-4 h-4 rounded border-white/20 bg-white/5 text-amber-500 focus:ring-amber-500"
                          />
                          <label htmlFor="sub-edit-isFree" className="text-sm text-gray-400">Бесплатная подписка (не входит в прибыль)</label>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={handleSaveSubscription}
                            disabled={savingSub === sub.id}
                            className="px-3 py-1.5 rounded-lg bg-indigo-500 text-white text-sm hover:bg-indigo-600 disabled:opacity-50"
                          >
                            {savingSub === sub.id ? 'Сохранение...' : 'Сохранить'}
                          </button>
                          <button
                            onClick={() => setEditingSubId(null)}
                            className="px-3 py-1.5 rounded-lg bg-white/5 text-gray-400 text-sm hover:bg-white/10"
                          >
                            Отмена
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center gap-4 text-sm">
                          <span className={`px-2 py-1 rounded-lg text-xs font-medium ${
                            sub.status === 'active' ? 'bg-emerald-500/20 text-emerald-400' :
                            sub.status === 'expired' ? 'bg-red-500/20 text-red-400' :
                            sub.status === 'cancelled' ? 'bg-gray-500/20 text-gray-400' : 'bg-yellow-500/20 text-yellow-400'
                          }`}>
                            {sub.status === 'active' ? 'Активна' : sub.status === 'expired' ? 'Истекла' : sub.status === 'cancelled' ? 'Отменена' : 'Ожидает'}
                          </span>
                          <span className="text-gray-400">
                            {formatDate(sub.startDate)} — {formatDate(sub.endDate)}
                          </span>
                          <span className="text-white">{sub.amount} {sub.currency}</span>
                          {sub.isFree && (
                            <span className="text-xs px-2 py-0.5 rounded bg-amber-500/20 text-amber-400 ml-2">Бесплатная</span>
                          )}
                        </div>
                        <button
                          onClick={() => openSubEdit(sub)}
                          className="p-2 rounded-lg bg-white/5 text-gray-400 hover:text-white hover:bg-white/10 transition-all"
                          title="Изменить даты / статус"
                        >
                          <Edit3 className="h-4 w-4" />
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
        {user.payments?.length > 0 && (!user.subscriptions || user.subscriptions.length === 0) && (
          <div className="rounded-2xl bg-white/5 border border-white/10 overflow-hidden">
            <div className="p-6">
              <h2 className="text-lg font-semibold text-white mb-2 flex items-center gap-2">
                <Wallet className="h-5 w-5 text-indigo-400" />
                Платежи
              </h2>
              <p className="text-sm text-gray-400">
                Платежей: {user.payments.length}.{' '}
                <button type="button" onClick={() => router.push('/admin/subscriptions')} className="text-indigo-400 hover:underline">
                  Подписки
                </button>
              </p>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
