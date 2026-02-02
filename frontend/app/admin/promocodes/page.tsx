'use client';

import React, { useState, useEffect } from 'react';
import AdminLayout from '@/components/admin/AdminLayout';
import {
  Plus,
  Edit2,
  Trash2,
  X,
  Save,
  Loader2,
  CheckCircle,
  AlertCircle,
  Ticket,
  Users,
  Globe,
  DollarSign
} from 'lucide-react';

interface Promocode {
  id: string;
  code: string;
  type: 'mass' | 'personal';
  discount_type: 'percent' | 'fixed';
  discount_percent: number | null;
  discount_amount: number | null;
  max_uses: number | null;
  used_count: number;
  allowed_users: string[] | null;
  allowed_tariff_ids: string[] | null;
  extra_days: Record<string, number> | null;
  is_active: boolean;
  valid_from: string | null;
  valid_until: string | null;
  total_revenue: number;
  total_usages: number;
  created_at: string;
}

export default function PromocodesPage() {
  const [promocodes, setPromocodes] = useState<Promocode[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    code: '',
    type: 'mass' as 'mass' | 'personal',
    discount_type: 'percent' as 'percent' | 'fixed',
    discount_percent: null as number | null,
    discount_amount: null as number | null,
    max_uses: null as number | null,
    allowed_users: [] as string[],
    allowed_tariff_ids: [] as string[],
    extra_days: {} as Record<string, number>,
    is_active: true,
    valid_from: '' as string,
    valid_until: '' as string
  });
  
  const [tariffs, setTariffs] = useState<Array<{ id: string; name: string }>>([]);

  useEffect(() => {
    loadPromocodes();
    loadTariffs();
  }, []);
  
  const loadTariffs = async () => {
    try {
      const res = await fetch('/api/tariffs?includeArchived=true');
      if (!res.ok) throw new Error('Failed to load tariffs');
      const data = await res.json();
      setTariffs(data.tariffs || []);
    } catch (err) {
      console.error('Error loading tariffs:', err);
    }
  };

  const loadPromocodes = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/promocodes');
      if (!res.ok) throw new Error('Failed to load promocodes');
      const data = await res.json();
      setPromocodes(data.promocodes || []);
    } catch (err) {
      setMessage({ type: 'error', text: 'Ошибка загрузки промокодов' });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      code: '',
      type: 'mass',
      discount_type: 'percent',
      discount_percent: null,
      discount_amount: null,
      max_uses: null,
      allowed_users: [],
      extra_days: {},
      is_active: true,
      valid_from: '',
      valid_until: ''
    });
    setEditingId(null);
    setShowCreateModal(false);
  };

  const handleCreate = async () => {
    if (!formData.code.trim()) {
      setMessage({ type: 'error', text: 'Введите код промокода' });
      return;
    }
    if (formData.discount_type === 'percent') {
      if (formData.discount_percent === null || formData.discount_percent <= 0 || formData.discount_percent > 100) {
        setMessage({ type: 'error', text: 'Скидка должна быть от 1 до 100%' });
        return;
      }
    } else if (formData.discount_type === 'fixed') {
      if (formData.discount_amount === null || formData.discount_amount <= 0) {
        setMessage({ type: 'error', text: 'Сумма скидки должна быть больше 0' });
        return;
      }
    }
    if (formData.type === 'personal' && formData.allowed_users.length === 0) {
      setMessage({ type: 'error', text: 'Укажите хотя бы одного пользователя для персонального промокода' });
      return;
    }

    setSaving(true);
    try {
      const res = await fetch('/api/admin/promocodes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          allowed_tariff_ids: (formData.allowed_tariff_ids ?? []).length > 0 ? (formData.allowed_tariff_ids ?? []) : null,
          extra_days: Object.keys(formData.extra_days || {}).length > 0 ? formData.extra_days : null
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Ошибка создания');
      setMessage({ type: 'success', text: 'Промокод создан' });
      resetForm();
      loadPromocodes();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Ошибка создания промокода' });
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async () => {
    if (!editingId) return;
    if (!formData.code.trim()) {
      setMessage({ type: 'error', text: 'Введите код промокода' });
      return;
    }
    if (formData.discount_type === 'percent') {
      if (formData.discount_percent === null || formData.discount_percent <= 0 || formData.discount_percent > 100) {
        setMessage({ type: 'error', text: 'Скидка должна быть от 1 до 100%' });
        return;
      }
    } else if (formData.discount_type === 'fixed') {
      if (formData.discount_amount === null || formData.discount_amount <= 0) {
        setMessage({ type: 'error', text: 'Сумма скидки должна быть больше 0' });
        return;
      }
    }
    if (formData.type === 'personal' && formData.allowed_users.length === 0) {
      setMessage({ type: 'error', text: 'Укажите хотя бы одного пользователя для персонального промокода' });
      return;
    }

    setSaving(true);
    try {
      const res = await fetch('/api/admin/promocodes', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingId,
          ...formData,
          allowed_tariff_ids: (formData.allowed_tariff_ids ?? []).length > 0 ? (formData.allowed_tariff_ids ?? []) : null,
          extra_days: Object.keys(formData.extra_days || {}).length > 0 ? formData.extra_days : null
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Ошибка обновления');
      setMessage({ type: 'success', text: 'Промокод обновлён' });
      resetForm();
      loadPromocodes();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Ошибка обновления промокода' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Удалить промокод?')) return;
    try {
      const res = await fetch(`/api/admin/promocodes?id=${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Ошибка удаления');
      setMessage({ type: 'success', text: 'Промокод удалён' });
      loadPromocodes();
    } catch (err) {
      setMessage({ type: 'error', text: 'Ошибка удаления промокода' });
    }
  };

  const startEdit = (promocode: Promocode) => {
    setEditingId(promocode.id);
    // Форматируем даты для input[type="datetime-local"]
    const formatDateForInput = (dateStr: string | null) => {
      if (!dateStr) return '';
      const date = new Date(dateStr);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      return `${year}-${month}-${day}T${hours}:${minutes}`;
    };
    const extraDays = promocode.extra_days 
      ? (typeof promocode.extra_days === 'string' ? JSON.parse(promocode.extra_days) : promocode.extra_days)
      : {};
    
    const allowedTariffIds = promocode.allowed_tariff_ids
      ? (typeof promocode.allowed_tariff_ids === 'string' ? JSON.parse(promocode.allowed_tariff_ids) : promocode.allowed_tariff_ids)
      : [];
    
    setFormData({
      code: promocode.code,
      type: promocode.type,
      discount_type: promocode.discount_type || 'percent',
      discount_percent: promocode.discount_percent,
      discount_amount: promocode.discount_amount,
      max_uses: promocode.max_uses,
      allowed_users: promocode.allowed_users || [],
      allowed_tariff_ids: Array.isArray(allowedTariffIds) ? allowedTariffIds : [],
      extra_days: extraDays,
      is_active: promocode.is_active,
      valid_from: formatDateForInput(promocode.valid_from),
      valid_until: formatDateForInput(promocode.valid_until)
    });
    setShowCreateModal(true);
  };

  const addAllowedUser = () => {
    const username = prompt('Введите Telegram username (без @):');
    if (username && username.trim()) {
      const clean = username.trim().replace('@', '');
      if (!formData.allowed_users.includes(clean)) {
        setFormData(prev => ({
          ...prev,
          allowed_users: [...prev.allowed_users, clean]
        }));
      }
    }
  };

  const removeAllowedUser = (username: string) => {
    setFormData(prev => ({
      ...prev,
      allowed_users: prev.allowed_users.filter(u => u !== username)
    }));
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white flex items-center gap-3">
              <Ticket className="h-8 w-8 text-orange-500" />
              Промокоды
            </h1>
            <p className="text-gray-400 mt-1">Управление промокодами для Telegram бота</p>
          </div>
          <button
            onClick={() => {
              resetForm();
              setShowCreateModal(true);
            }}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg flex items-center gap-2 transition-colors"
          >
            <Plus className="h-5 w-5" />
            Создать промокод
          </button>
        </div>

        {/* Message */}
        {message && (
          <div className={`p-4 rounded-lg flex items-center gap-2 ${
            message.type === 'success' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
          }`}>
            {message.type === 'success' ? <CheckCircle className="h-5 w-5" /> : <AlertCircle className="h-5 w-5" />}
            {message.text}
          </div>
        )}

        {/* Promocodes List */}
        <div className="grid gap-4">
          {promocodes.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              Нет промокодов. Создайте первый промокод.
            </div>
          ) : (
            promocodes.map((promocode) => (
              <div
                key={promocode.id}
                className="bg-white/5 border border-white/10 rounded-lg p-6 hover:bg-white/10 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <code className="text-2xl font-bold text-white">{promocode.code}</code>
                      {promocode.type === 'mass' ? (
                        <span className="px-2 py-1 bg-blue-500/20 text-blue-400 rounded text-sm flex items-center gap-1">
                          <Globe className="h-3 w-3" />
                          Массовый
                        </span>
                      ) : (
                        <span className="px-2 py-1 bg-purple-500/20 text-purple-400 rounded text-sm flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          Персональный
                        </span>
                      )}
                      {promocode.is_active ? (
                        <span className="px-2 py-1 bg-green-500/20 text-green-400 rounded text-sm">Активен</span>
                      ) : (
                        <span className="px-2 py-1 bg-gray-500/20 text-gray-400 rounded text-sm">Неактивен</span>
                      )}
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                      <div>
                        <div className="text-sm text-gray-400">Скидка</div>
                        <div className="text-xl font-bold text-white">{promocode.discount_percent}%</div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-400">Использований</div>
                        <div className="text-xl font-bold text-white">
                          {promocode.used_count}
                          {promocode.max_uses !== null && ` / ${promocode.max_uses}`}
                        </div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-400">Сумма покупок</div>
                        <div className="text-xl font-bold text-green-400 flex items-center gap-1">
                          <DollarSign className="h-5 w-5" />
                          {Number(promocode.total_revenue).toFixed(2)}
                        </div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-400">Всего использований</div>
                        <div className="text-xl font-bold text-white">{promocode.total_usages}</div>
                      </div>
                    </div>
                    {(promocode.valid_from || promocode.valid_until) && (
                      <div className="mt-4">
                        <div className="text-sm text-gray-400 mb-2">Срок действия:</div>
                        <div className="flex flex-wrap gap-4 text-sm">
                          {promocode.valid_from && (
                            <div>
                              <span className="text-gray-500">С:</span>{' '}
                              <span className="text-white">{new Date(promocode.valid_from).toLocaleString('ru-RU')}</span>
                            </div>
                          )}
                          {promocode.valid_until && (
                            <div>
                              <span className="text-gray-500">До:</span>{' '}
                              <span className="text-white">{new Date(promocode.valid_until).toLocaleString('ru-RU')}</span>
                            </div>
                          )}
                          {promocode.valid_until && new Date(promocode.valid_until) < new Date() && (
                            <span className="px-2 py-1 bg-red-500/20 text-red-400 rounded text-xs">Истек</span>
                          )}
                          {promocode.valid_from && new Date(promocode.valid_from) > new Date() && (
                            <span className="px-2 py-1 bg-yellow-500/20 text-yellow-400 rounded text-xs">Еще не активен</span>
                          )}
                        </div>
                      </div>
                    )}
                    {promocode.type === 'personal' && promocode.allowed_users && promocode.allowed_users.length > 0 && (
                      <div className="mt-4">
                        <div className="text-sm text-gray-400 mb-2">Доступен для:</div>
                        <div className="flex flex-wrap gap-2">
                          {promocode.allowed_users.map((user) => (
                            <span key={user} className="px-2 py-1 bg-purple-500/20 text-purple-400 rounded text-sm">
                              @{user}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    {promocode.allowed_tariff_ids && (() => {
                      const tariffIds = typeof promocode.allowed_tariff_ids === 'string' 
                        ? JSON.parse(promocode.allowed_tariff_ids) 
                        : promocode.allowed_tariff_ids;
                      return Array.isArray(tariffIds) && tariffIds.length > 0 && (
                        <div className="mt-4">
                          <div className="text-sm text-gray-400 mb-2">Разрешенные тарифы:</div>
                          <div className="flex flex-wrap gap-2">
                            {tariffIds.map((tariffId: string) => {
                              const tariff = tariffs.find(t => t.id === tariffId);
                              return (
                                <span key={tariffId} className="px-2 py-1 bg-blue-500/20 text-blue-400 rounded text-sm">
                                  {tariff ? tariff.name : tariffId}
                                </span>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })()}
                    {promocode.extra_days && Object.keys(promocode.extra_days).length > 0 && (
                      <div className="mt-4">
                        <div className="text-sm text-gray-400 mb-2">Дополнительные дни:</div>
                        <div className="flex flex-wrap gap-2">
                          {Object.entries(typeof promocode.extra_days === 'string' ? JSON.parse(promocode.extra_days) : promocode.extra_days).map(([period, days]) => (
                            <span key={period} className="px-2 py-1 bg-green-500/20 text-green-400 rounded text-sm">
                              {period} мес. → +{days} дней
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    <button
                      onClick={() => startEdit(promocode)}
                      className="p-2 hover:bg-white/10 rounded transition-colors"
                      title="Редактировать"
                    >
                      <Edit2 className="h-5 w-5 text-blue-400" />
                    </button>
                    <button
                      onClick={() => handleDelete(promocode.id)}
                      className="p-2 hover:bg-white/10 rounded transition-colors"
                      title="Удалить"
                    >
                      <Trash2 className="h-5 w-5 text-red-400" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Create/Edit Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-[#1a1a24] border border-white/10 rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-white">
                  {editingId ? 'Редактировать промокод' : 'Создать промокод'}
                </h2>
                <button
                  onClick={resetForm}
                  className="p-2 hover:bg-white/10 rounded transition-colors"
                >
                  <X className="h-5 w-5 text-gray-400" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Код промокода</label>
                  <input
                    type="text"
                    value={formData.code}
                    onChange={(e) => setFormData(prev => ({ ...prev, code: e.target.value.toUpperCase() }))}
                    className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-indigo-500"
                    placeholder="PROMO2024"
                  />
                </div>

                <div>
                  <label className="block text-sm text-gray-400 mb-2">Тип промокода</label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value as 'mass' | 'personal', allowed_users: e.target.value === 'mass' ? [] : prev.allowed_users }))}
                    className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="mass">Массовый (доступен всем)</option>
                    <option value="personal">Персональный (только для указанных пользователей)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm text-gray-400 mb-2">Тип скидки</label>
                  <select
                    value={formData.discount_type}
                    onChange={(e) => setFormData(prev => ({ 
                      ...prev, 
                      discount_type: e.target.value as 'percent' | 'fixed',
                      discount_percent: e.target.value === 'percent' ? prev.discount_percent : null,
                      discount_amount: e.target.value === 'fixed' ? prev.discount_amount : null
                    }))}
                    className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="percent">Процентная (%)</option>
                    <option value="fixed">Фиксированная сумма (USDT)</option>
                  </select>
                </div>

                {formData.discount_type === 'percent' ? (
                  <div>
                    <label className="block text-sm text-gray-400 mb-2">Скидка (%)</label>
                    <input
                      type="number"
                      min="1"
                      max="100"
                      value={formData.discount_percent || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, discount_percent: e.target.value ? parseFloat(e.target.value) : null }))}
                      className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-indigo-500"
                      placeholder="10"
                    />
                  </div>
                ) : (
                  <div>
                    <label className="block text-sm text-gray-400 mb-2">Сумма скидки (USDT)</label>
                    <input
                      type="number"
                      min="0.01"
                      step="0.01"
                      value={formData.discount_amount || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, discount_amount: e.target.value ? parseFloat(e.target.value) : null }))}
                      className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-indigo-500"
                      placeholder="10.00"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-sm text-gray-400 mb-2">Максимум использований (оставьте пустым для безлимита)</label>
                  <input
                    type="number"
                    min="1"
                    value={formData.max_uses || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, max_uses: e.target.value ? parseInt(e.target.value) : null }))}
                    className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-indigo-500"
                    placeholder="Безлимит"
                  />
                </div>

                <div>
                  <label className="block text-sm text-gray-400 mb-2">
                    Дополнительные дни к подписке (по периодам)
                    <span className="text-xs text-gray-500 ml-2">Укажите период в месяцах и количество дополнительных дней</span>
                  </label>
                  <div className="space-y-2">
                    {Object.entries(formData.extra_days || {}).map(([period, days]) => (
                      <div key={period} className="flex items-center gap-2">
                        <input
                          type="number"
                          min="1"
                          value={period}
                          onChange={(e) => {
                            const newPeriod = e.target.value;
                            if (newPeriod && parseInt(newPeriod) > 0) {
                              const newExtraDays = { ...formData.extra_days };
                              delete newExtraDays[period];
                              newExtraDays[newPeriod] = days;
                              setFormData(prev => ({ ...prev, extra_days: newExtraDays }));
                            }
                          }}
                          className="w-24 px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-indigo-500"
                          placeholder="Период"
                        />
                        <span className="text-gray-400">мес. →</span>
                        <input
                          type="number"
                          min="1"
                          value={days}
                          onChange={(e) => {
                            const newDays = e.target.value ? parseInt(e.target.value) : 0;
                            if (newDays > 0) {
                              setFormData(prev => ({
                                ...prev,
                                extra_days: { ...prev.extra_days, [period]: newDays }
                              }));
                            } else {
                              const newExtraDays = { ...formData.extra_days };
                              delete newExtraDays[period];
                              setFormData(prev => ({ ...prev, extra_days: newExtraDays }));
                            }
                          }}
                          className="w-24 px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-indigo-500"
                          placeholder="Дней"
                        />
                        <span className="text-gray-400">дней</span>
                        <button
                          type="button"
                          onClick={() => {
                            const newExtraDays = { ...formData.extra_days };
                            delete newExtraDays[period];
                            setFormData(prev => ({ ...prev, extra_days: newExtraDays }));
                          }}
                          className="px-3 py-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition"
                        >
                          Удалить
                        </button>
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() => {
                        const newPeriod = String(Object.keys(formData.extra_days || {}).length + 1);
                        setFormData(prev => ({
                          ...prev,
                          extra_days: { ...prev.extra_days, [newPeriod]: 0 }
                        }));
                      }}
                      className="px-4 py-2 bg-indigo-500/20 text-indigo-400 rounded-lg hover:bg-indigo-500/30 transition"
                    >
                      + Добавить период
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-gray-400 mb-2">Действует с (необязательно)</label>
                    <input
                      type="datetime-local"
                      value={formData.valid_from}
                      onChange={(e) => setFormData(prev => ({ ...prev, valid_from: e.target.value }))}
                      className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-2">Действует до (необязательно)</label>
                    <input
                      type="datetime-local"
                      value={formData.valid_until}
                      onChange={(e) => setFormData(prev => ({ ...prev, valid_until: e.target.value }))}
                      className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm text-gray-400 mb-2">
                    Разрешенные тарифы
                    <span className="text-xs text-gray-500 ml-2">Оставьте пустым для всех тарифов</span>
                  </label>
                  <div className="space-y-2 max-h-48 overflow-y-auto border border-white/10 rounded-lg p-3 bg-white/5">
                    {tariffs.length === 0 ? (
                      <div className="text-sm text-gray-500">Загрузка тарифов...</div>
                    ) : (
                      tariffs.map((tariff) => (
                        <label key={tariff.id} className="flex items-center gap-2 cursor-pointer hover:bg-white/5 p-2 rounded">
                          <input
                            type="checkbox"
                            checked={(formData.allowed_tariff_ids ?? []).includes(tariff.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setFormData(prev => ({
                                  ...prev,
                                  allowed_tariff_ids: [...(prev.allowed_tariff_ids ?? []), tariff.id]
                                }));
                              } else {
                                setFormData(prev => ({
                                  ...prev,
                                  allowed_tariff_ids: (prev.allowed_tariff_ids ?? []).filter(id => id !== tariff.id)
                                }));
                              }
                            }}
                            className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
                          />
                          <span className="text-white text-sm">{tariff.name}</span>
                        </label>
                      ))
                    )}
                  </div>
                  {(formData.allowed_tariff_ids ?? []).length > 0 && (
                    <div className="mt-2 text-xs text-gray-500">
                      Выбрано тарифов: {(formData.allowed_tariff_ids ?? []).length}
                    </div>
                  )}
                </div>

                {formData.type === 'personal' && (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-sm text-gray-400">Telegram пользователи</label>
                      <button
                        onClick={addAllowedUser}
                        className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-sm transition-colors"
                      >
                        Добавить
                      </button>
                    </div>
                    <div className="space-y-2">
                      {formData.allowed_users.map((user) => (
                        <div key={user} className="flex items-center justify-between px-3 py-2 bg-white/5 rounded">
                          <span className="text-white">@{user}</span>
                          <button
                            onClick={() => removeAllowedUser(user)}
                            className="text-red-400 hover:text-red-300"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                      {formData.allowed_users.length === 0 && (
                        <div className="text-gray-500 text-sm">Нет пользователей. Нажмите "Добавить" чтобы добавить.</div>
                      )}
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="is_active"
                    checked={formData.is_active}
                    onChange={(e) => setFormData(prev => ({ ...prev, is_active: e.target.checked }))}
                    className="w-4 h-4"
                  />
                  <label htmlFor="is_active" className="text-sm text-gray-400">Активен</label>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    onClick={editingId ? handleUpdate : handleCreate}
                    disabled={saving}
                    className="flex-1 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                  >
                    {saving ? (
                      <>
                        <Loader2 className="h-5 w-5 animate-spin" />
                        Сохранение...
                      </>
                    ) : (
                      <>
                        <Save className="h-5 w-5" />
                        {editingId ? 'Сохранить' : 'Создать'}
                      </>
                    )}
                  </button>
                  <button
                    onClick={resetForm}
                    className="px-4 py-2 bg-white/5 hover:bg-white/10 text-white rounded-lg transition-colors"
                  >
                    Отмена
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
