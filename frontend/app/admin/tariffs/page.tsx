'use client';

import React, { useState, useEffect } from 'react';
import AdminLayout from '@/components/admin/AdminLayout';
import { normalizeErrorMessage } from '@/lib/error-utils';
import { 
  Wallet, 
  Plus, 
  Edit2, 
  Archive, 
  Eye, 
  EyeOff,
  Trash2,
  X,
  Save,
  Loader2,
  CheckCircle,
  AlertCircle,
  Clock,
  Users,
  DollarSign,
  Calendar,
  Star,
  RotateCcw
} from 'lucide-react';
import { 
  Tariff, 
  TariffPrice,
  CreateTariffData, 
  UpdateTariffData,
  CreateTariffPriceData,
  TariffStats,
  formatTariffDuration,
  formatUSDT,
  TARIFF_COLORS,
  getTariffColorClass
} from '@/types/tariff';

interface Message {
  type: 'success' | 'error';
  text: string;
}

interface PriceFormItem {
  periodMonths: number;
  monthlyPrice: number;
  isPopular: boolean;
}

export default function TariffsPage() {
  const [tariffs, setTariffs] = useState<Tariff[]>([]);
  const [stats, setStats] = useState<TariffStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<Message | null>(null);
  
  // Filters
  const [showArchived, setShowArchived] = useState(false);
  const [showCustom, setShowCustom] = useState(true);
  
  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingTariff, setEditingTariff] = useState<Tariff | null>(null);
  const [saving, setSaving] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState<{
    name: string;
    description: string;
    isActive: boolean;
    color: string;
    badge: string;
    prices: PriceFormItem[];
  }>({
    name: '',
    description: '',
    isActive: true,
    color: 'indigo',
    badge: '',
    prices: [{ periodMonths: 1, monthlyPrice: 0, isPopular: false }]
  });

  // Настройки: через сколько дней после окончания подписки менять тариф (для всех тарифов)
  const [tariffSettings, setTariffSettings] = useState<{
    daysAfterExpirySwitch: number;
    actualTariffId: string | null;
    useAllActiveTariffs: boolean;
  }>({
    daysAfterExpirySwitch: 5,
    actualTariffId: null,
    useAllActiveTariffs: false
  });
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [settingsSaving, setSettingsSaving] = useState(false);

  useEffect(() => {
    loadTariffs();
  }, [showArchived, showCustom]);

  useEffect(() => {
    loadTariffSettings();
  }, []);

  const loadTariffSettings = async () => {
    setSettingsLoading(true);
    try {
      const res = await fetch('/api/admin/tariffs/settings');
      if (res.ok) {
        const data = await res.json();
        setTariffSettings({
          daysAfterExpirySwitch: data.daysAfterExpirySwitch ?? 5,
          actualTariffId: data.actualTariffId ?? null,
          useAllActiveTariffs: Boolean(data.useAllActiveTariffs)
        });
      }
    } catch {
      // ignore
    } finally {
      setSettingsLoading(false);
    }
  };

  const saveTariffSettings = async () => {
    setSettingsSaving(true);
    setMessage(null);
    try {
      const res = await fetch('/api/admin/tariffs/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          daysAfterExpirySwitch: tariffSettings.daysAfterExpirySwitch,
          actualTariffId: tariffSettings.actualTariffId,
          useAllActiveTariffs: tariffSettings.useAllActiveTariffs
        })
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Ошибка сохранения');
      }
      const data = await res.json();
      setTariffSettings({
        daysAfterExpirySwitch: data.daysAfterExpirySwitch ?? 5,
        actualTariffId: data.actualTariffId ?? null,
        useAllActiveTariffs: Boolean(data.useAllActiveTariffs)
      });
      setMessage({ type: 'success', text: 'Настройки сохранены' });
    } catch (e) {
      setMessage({ type: 'error', text: normalizeErrorMessage(e) });
    } finally {
      setSettingsSaving(false);
    }
  };

  const loadTariffs = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('withStats', 'true');
      if (showArchived) params.set('includeArchived', 'true');
      if (showCustom) params.set('includeCustom', 'true');

      const response = await fetch(`/api/tariffs?${params}`);
      if (!response.ok) throw new Error('Failed to fetch');

      const data = await response.json();
      setTariffs(data.tariffs || []);
      setStats(data.stats || null);
    } catch (error) {
      console.error('Error loading tariffs:', error);
      setMessage({ type: 'error', text: 'Ошибка загрузки тарифов' });
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!formData.name.trim()) {
      setMessage({ type: 'error', text: 'Укажите название тарифа' });
      return;
    }
    if (formData.prices.length === 0) {
      setMessage({ type: 'error', text: 'Добавьте хотя бы одну ценовую опцию' });
      return;
    }

    // Валидация цен
    for (const price of formData.prices) {
      if (price.periodMonths < 1) {
        setMessage({ type: 'error', text: 'Количество месяцев должно быть минимум 1' });
        return;
      }
      if (price.monthlyPrice < 0) {
        setMessage({ type: 'error', text: 'Цена не может быть отрицательной' });
        return;
      }
    }

    setSaving(true);
    try {
      const createData: CreateTariffData = {
        name: formData.name,
        description: formData.description || undefined,
        isActive: formData.isActive,
        color: formData.color,
        badge: formData.badge || undefined,
        prices: formData.prices.map((p, i) => ({
          periodMonths: p.periodMonths,
          monthlyPrice: p.monthlyPrice,
          isPopular: p.isPopular,
          sortOrder: i
        }))
      };

      const response = await fetch('/api/tariffs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(createData)
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to create');
      }

      setMessage({ type: 'success', text: 'Тариф создан' });
      setShowCreateModal(false);
      resetForm();
      loadTariffs();
    } catch (error) {
      setMessage({ type: 'error', text: error instanceof Error ? error.message : 'Ошибка создания' });
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async () => {
    if (!editingTariff) return;

    setSaving(true);
    try {
      const updateData: UpdateTariffData = {
        name: formData.name,
        description: formData.description || undefined,
        isActive: formData.isActive,
        color: formData.color,
        badge: formData.badge || undefined,
        prices: formData.prices.map((p, i) => ({
          periodMonths: p.periodMonths,
          monthlyPrice: p.monthlyPrice,
          isPopular: p.isPopular,
          sortOrder: i
        }))
      };

      const response = await fetch(`/api/tariffs/${editingTariff.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData)
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to update');
      }

      setMessage({ type: 'success', text: 'Тариф обновлён' });
      setShowEditModal(false);
      setEditingTariff(null);
      resetForm();
      loadTariffs();
    } catch (error) {
      setMessage({ type: 'error', text: normalizeErrorMessage(error) || 'Ошибка обновления' });
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (tariff: Tariff) => {
    try {
      const response = await fetch(`/api/tariffs/${tariff.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !tariff.isActive })
      });

      if (!response.ok) throw new Error('Failed to update');

      setMessage({ type: 'success', text: tariff.isActive ? 'Тариф деактивирован' : 'Тариф активирован' });
      loadTariffs();
    } catch (error) {
      setMessage({ type: 'error', text: 'Ошибка обновления статуса' });
    }
  };

  const handleArchive = async (tariff: Tariff) => {
    if (!confirm(`Архивировать тариф "${tariff.name}"?`)) return;

    try {
      const response = await fetch(`/api/tariffs/${tariff.id}`, {
        method: 'DELETE'
      });

      if (!response.ok) throw new Error('Failed to archive');

      setMessage({ type: 'success', text: 'Тариф архивирован' });
      loadTariffs();
    } catch (error) {
      setMessage({ type: 'error', text: 'Ошибка архивации' });
    }
  };

  const handleRestore = async (tariff: Tariff) => {
    try {
      const response = await fetch(`/api/tariffs/${tariff.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isArchived: false, isActive: true })
      });

      if (!response.ok) throw new Error('Failed to restore');

      setMessage({ type: 'success', text: 'Тариф восстановлен' });
      loadTariffs();
    } catch (error) {
      setMessage({ type: 'error', text: 'Ошибка восстановления' });
    }
  };

  const handleDelete = async (tariff: Tariff) => {
    if (!confirm(`Удалить тариф "${tariff.name}" навсегда? Это действие нельзя отменить.`)) return;

    try {
      const response = await fetch(`/api/tariffs/${tariff.id}?hard=true`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete');
      }

      setMessage({ type: 'success', text: 'Тариф удалён' });
      loadTariffs();
    } catch (error) {
      setMessage({ type: 'error', text: normalizeErrorMessage(error) || 'Ошибка удаления' });
    }
  };

  const openEditModal = (tariff: Tariff) => {
    setEditingTariff(tariff);
    setFormData({
      name: tariff.name,
      description: tariff.description || '',
      isActive: tariff.isActive,
      color: tariff.color || 'indigo',
      badge: tariff.badge || '',
      prices: tariff.prices?.map(p => ({
        periodMonths: p.periodMonths,
        monthlyPrice: p.monthlyPrice,
        isPopular: p.isPopular || false
      })) || [{ periodMonths: 1, monthlyPrice: 0, isPopular: false }]
    });
    setShowEditModal(true);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      isActive: true,
      color: 'indigo',
      badge: '',
      prices: [{ periodMonths: 1, monthlyPrice: 0, isPopular: false }]
    });
  };

  // Добавить новую ценовую опцию
  const addPriceOption = () => {
    const maxMonths = Math.max(...formData.prices.map(p => p.periodMonths), 0);
    setFormData({
      ...formData,
      prices: [...formData.prices, { 
        periodMonths: maxMonths + 1, 
        monthlyPrice: 0, 
        isPopular: false 
      }]
    });
  };

  // Удалить ценовую опцию
  const removePriceOption = (index: number) => {
    if (formData.prices.length <= 1) return;
    setFormData({
      ...formData,
      prices: formData.prices.filter((_, i) => i !== index)
    });
  };

  // Обновить ценовую опцию
  const updatePriceOption = (index: number, field: keyof PriceFormItem, value: any) => {
    const newPrices = [...formData.prices];
    newPrices[index] = { ...newPrices[index], [field]: value };
    
    // Если ставим популярный, убираем у остальных
    if (field === 'isPopular' && value === true) {
      newPrices.forEach((p, i) => {
        if (i !== index) p.isPopular = false;
      });
    }
    
    setFormData({ ...formData, prices: newPrices });
  };

  // Отфильтрованные тарифы
  const activeTariffs = tariffs.filter(t => !t.isArchived && t.isActive && !t.isCustom);
  const inactiveTariffs = tariffs.filter(t => !t.isArchived && !t.isActive && !t.isCustom);
  const customTariffs = tariffs.filter(t => t.isCustom && !t.isArchived);
  const archivedTariffs = tariffs.filter(t => t.isArchived);

  // Clear message after 3s
  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => setMessage(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  return (
    <AdminLayout title="Тарифы">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white mb-1">Тарифы</h1>
            <p className="text-gray-400 text-sm">Управление тарифными планами с пакетами цен</p>
          </div>
          <button
            onClick={() => {
              resetForm();
              setShowCreateModal(true);
            }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-medium hover:from-indigo-600 hover:to-purple-700 transition-all shadow-lg shadow-indigo-500/25"
          >
            <Plus className="h-4 w-4" />
            Создать тариф
          </button>
        </div>

        {/* Message */}
        {message && (
          <div className={`flex items-center gap-3 p-4 rounded-xl ${
            message.type === 'success' 
              ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'
              : 'bg-red-500/10 border border-red-500/20 text-red-400'
          }`}>
            {message.type === 'success' ? <CheckCircle className="h-5 w-5" /> : <AlertCircle className="h-5 w-5" />}
            <span className="text-sm">{message.text}</span>
          </div>
        )}

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            <StatCard icon={Wallet} label="Всего" value={stats.total} color="indigo" />
            <StatCard icon={Eye} label="Активных" value={stats.active} color="emerald" />
            <StatCard icon={Archive} label="Архивных" value={stats.archived} color="gray" />
            <StatCard icon={Star} label="Кастомных" value={stats.custom} color="amber" />
            <StatCard icon={Users} label="Подписок" value={stats.totalSubscriptions} color="blue" />
            <StatCard icon={DollarSign} label="Доход (USDT)" value={stats.totalRevenue.toFixed(2)} color="green" />
          </div>
        )}

        {/* Настройки: после окончания подписки */}
        <div className="rounded-2xl bg-white/5 border border-white/10 p-6">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Clock className="h-5 w-5 text-amber-400" />
            После окончания подписки
          </h2>
          <p className="text-sm text-gray-400 mb-4">
            Через указанное количество дней после окончания подписки тариф пользователя в боте снимается и заменяется: либо на один выбранный, либо на все активные тарифы сразу.
          </p>
          {settingsLoading ? (
            <p className="text-gray-500 text-sm">Загрузка настроек...</p>
          ) : (
            (() => {
              const daysValue = Number(tariffSettings.daysAfterExpirySwitch) || 5;
              const useAllActive = tariffSettings.useAllActiveTariffs === true;
              const actualTariffValue = tariffSettings.actualTariffId ?? '';
              return (
                <div className="space-y-4">
                  <div className="flex flex-wrap items-end gap-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-400 mb-1.5">Через сколько дней после окончания подписки снимать тариф (для всех)</label>
                      <input
                        type="number"
                        min={0}
                        max={365}
                        value={String(daysValue)}
                        onChange={(e) => setTariffSettings((s) => ({ ...s, daysAfterExpirySwitch: Math.max(0, Math.min(365, parseInt(e.target.value, 10) || 0)) }))}
                        className="w-24 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-indigo-500/50"
                      />
                    </div>
                    <button
                      onClick={saveTariffSettings}
                      disabled={settingsSaving}
                      className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500/20 border border-amber-500/30 text-amber-300 hover:bg-amber-500/30 disabled:opacity-50"
                    >
                      {settingsSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                      Сохранить
                    </button>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-400 mb-2">После срока показывать пользователю</label>
                    <div className="flex flex-wrap gap-4">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="after_expiry_mode"
                          checked={!useAllActive}
                          onChange={() => setTariffSettings((s) => ({ ...s, useAllActiveTariffs: false }))}
                          className="w-4 h-4 border-white/20 bg-white/5 text-amber-500 focus:ring-amber-500"
                        />
                        <span className="text-sm text-gray-300">Один тариф</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="after_expiry_mode"
                          checked={useAllActive}
                          onChange={() => setTariffSettings((s) => ({ ...s, useAllActiveTariffs: true }))}
                          className="w-4 h-4 border-white/20 bg-white/5 text-amber-500 focus:ring-amber-500"
                        />
                        <span className="text-sm text-gray-300">Все активные тарифы</span>
                      </label>
                    </div>
                    {!useAllActive && (
                      <div className="mt-2 min-w-[200px] max-w-xs">
                        <select
                          value={actualTariffValue}
                          onChange={(e) => setTariffSettings((s) => ({ ...s, actualTariffId: e.target.value || null }))}
                          className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-indigo-500/50 text-sm"
                        >
                          <option value="">По умолчанию (первый активный)</option>
                          {tariffs.filter((t) => t.isActive && !t.isArchived).map((t) => (
                            <option key={t.id} value={t.id}>{t.name}</option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>
                </div>
              );
            })()
          )}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={showArchived}
              onChange={(e) => setShowArchived(e.target.checked)}
              className="w-4 h-4 rounded bg-white/10 border-white/20 text-indigo-500 focus:ring-indigo-500"
            />
            <span className="text-sm text-gray-300">Показать архивные</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={showCustom}
              onChange={(e) => setShowCustom(e.target.checked)}
              className="w-4 h-4 rounded bg-white/10 border-white/20 text-indigo-500 focus:ring-indigo-500"
            />
            <span className="text-sm text-gray-300">Показать кастомные</span>
          </label>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 text-indigo-500 animate-spin" />
          </div>
        ) : (
          <div className="space-y-8">
            {/* Active Tariffs */}
            {activeTariffs.length > 0 && (
              <TariffSection
                title="Активные тарифы"
                icon={<Eye className="h-5 w-5 text-emerald-400" />}
                tariffs={activeTariffs}
                onEdit={openEditModal}
                onToggleActive={handleToggleActive}
                onArchive={handleArchive}
              />
            )}

            {/* Inactive Tariffs */}
            {inactiveTariffs.length > 0 && (
              <TariffSection
                title="Неактивные тарифы"
                icon={<EyeOff className="h-5 w-5 text-gray-500" />}
                tariffs={inactiveTariffs}
                onEdit={openEditModal}
                onToggleActive={handleToggleActive}
                onArchive={handleArchive}
              />
            )}

            {/* Custom Tariffs */}
            {showCustom && customTariffs.length > 0 && (
              <TariffSection
                title="Кастомные тарифы"
                icon={<Star className="h-5 w-5 text-amber-400" />}
                tariffs={customTariffs}
                onEdit={openEditModal}
                onToggleActive={handleToggleActive}
                onArchive={handleArchive}
              />
            )}

            {/* Archived Tariffs */}
            {showArchived && archivedTariffs.length > 0 && (
              <TariffSection
                title="Архивные тарифы"
                icon={<Archive className="h-5 w-5 text-gray-500" />}
                tariffs={archivedTariffs}
                onEdit={openEditModal}
                onRestore={handleRestore}
                onDelete={handleDelete}
                isArchived
              />
            )}

            {/* Empty State */}
            {tariffs.length === 0 && (
              <div className="rounded-2xl bg-white/5 border border-white/10 p-12 text-center">
                <Wallet className="h-12 w-12 text-gray-500 mx-auto mb-4" />
                <p className="text-gray-400 mb-4">Тарифы не найдены</p>
                <button
                  onClick={() => {
                    resetForm();
                    setShowCreateModal(true);
                  }}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-medium"
                >
                  <Plus className="h-4 w-4" />
                  Создать первый тариф
                </button>
              </div>
            )}
          </div>
        )}

        {/* Create/Edit Modal */}
        {(showCreateModal || showEditModal) && (
          <TariffModal
            title={showCreateModal ? 'Создать тариф' : 'Редактировать тариф'}
            formData={formData}
            setFormData={setFormData}
            saving={saving}
            onSave={showCreateModal ? handleCreate : handleUpdate}
            onClose={() => {
              setShowCreateModal(false);
              setShowEditModal(false);
              setEditingTariff(null);
              resetForm();
            }}
            addPriceOption={addPriceOption}
            removePriceOption={removePriceOption}
            updatePriceOption={updatePriceOption}
          />
        )}
      </div>
    </AdminLayout>
  );
}

// Компонент статистики
function StatCard({ icon: Icon, label, value, color }: { 
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string | number;
  color: string;
}) {
  const colorClasses: Record<string, string> = {
    indigo: 'bg-indigo-500/20 text-indigo-400',
    emerald: 'bg-emerald-500/20 text-emerald-400',
    gray: 'bg-gray-500/20 text-gray-400',
    amber: 'bg-amber-500/20 text-amber-400',
    blue: 'bg-blue-500/20 text-blue-400',
    green: 'bg-green-500/20 text-green-400',
  };

  return (
    <div className="rounded-xl bg-white/5 border border-white/10 p-4">
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-xl ${colorClasses[color]} flex items-center justify-center`}>
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="text-xl font-bold text-white">{value}</p>
          <p className="text-xs text-gray-400">{label}</p>
        </div>
      </div>
    </div>
  );
}

// Компонент секции тарифов
function TariffSection({ 
  title, 
  icon, 
  tariffs, 
  onEdit, 
  onToggleActive, 
  onArchive,
  onRestore,
  onDelete,
  isArchived = false
}: {
  title: string;
  icon: React.ReactNode;
  tariffs: Tariff[];
  onEdit: (tariff: Tariff) => void;
  onToggleActive?: (tariff: Tariff) => void;
  onArchive?: (tariff: Tariff) => void;
  onRestore?: (tariff: Tariff) => void;
  onDelete?: (tariff: Tariff) => void;
  isArchived?: boolean;
}) {
  return (
    <div>
      <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
        {icon}
        {title} ({tariffs.length})
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {tariffs.map((tariff) => (
          <TariffCard
            key={tariff.id}
            tariff={tariff}
            onEdit={() => onEdit(tariff)}
            onToggleActive={onToggleActive ? () => onToggleActive(tariff) : undefined}
            onArchive={onArchive ? () => onArchive(tariff) : undefined}
            onRestore={onRestore ? () => onRestore(tariff) : undefined}
            onDelete={onDelete ? () => onDelete(tariff) : undefined}
            isArchived={isArchived}
          />
        ))}
      </div>
    </div>
  );
}

// Компонент карточки тарифа
function TariffCard({ 
  tariff, 
  onEdit, 
  onToggleActive, 
  onArchive,
  onRestore,
  onDelete,
  isArchived = false
}: {
  tariff: Tariff;
  onEdit: () => void;
  onToggleActive?: () => void;
  onArchive?: () => void;
  onRestore?: () => void;
  onDelete?: () => void;
  isArchived?: boolean;
}) {
  const colorClass = getTariffColorClass(tariff.color);
  const prices = tariff.prices || [];
  const popularPrice = prices.find(p => p.isPopular);
  const minPrice = prices.length > 0 ? Math.min(...prices.map(p => p.monthlyPrice)) : 0;

  return (
    <div className={`rounded-2xl bg-white/5 border overflow-hidden transition-all ${
      tariff.isActive && !isArchived ? 'border-white/10' : 'border-white/5 opacity-70'
    } ${tariff.isCustom ? 'ring-2 ring-amber-500/30' : ''}`}>
      {/* Header */}
      <div className={`p-4 bg-gradient-to-r ${colorClass}`}>
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-white">{tariff.name}</h3>
            {tariff.badge && (
              <span className="inline-block mt-1 px-2 py-0.5 rounded-full bg-white/20 text-white text-xs">
                {tariff.badge}
              </span>
            )}
          </div>
          {tariff.isCustom && (
            <span className="px-2 py-1 rounded-lg bg-amber-500/20 text-amber-300 text-xs flex items-center gap-1">
              <Star className="h-3 w-3" />
              Кастом
            </span>
          )}
        </div>
      </div>

      {/* Body */}
      <div className="p-4 space-y-4">
        {/* Prices summary */}
        <div className="text-center">
          <p className="text-sm text-gray-400 mb-1">
            {prices.length} {prices.length === 1 ? 'опция' : prices.length < 5 ? 'опции' : 'опций'}
          </p>
          {prices.length > 0 && (
            <p className="text-2xl font-bold text-white">
              от {formatUSDT(minPrice)}<span className="text-sm font-normal text-gray-400">/мес</span>
            </p>
          )}
        </div>

        {/* Price options list */}
        {prices.length > 0 && (
          <div className="space-y-2">
            {prices.slice(0, 3).map((price) => (
              <div 
                key={price.id} 
                className={`flex items-center justify-between p-2 rounded-lg ${
                  price.isPopular ? 'bg-amber-500/10 border border-amber-500/20' : 'bg-white/5'
                }`}
              >
                <div className="flex items-center gap-2">
                  {price.isPopular && <Star className="h-3 w-3 text-amber-400" />}
                  <span className="text-sm text-gray-300">
                    {price.periodMonths} {price.periodMonths === 1 ? 'мес' : price.periodMonths < 5 ? 'мес' : 'мес'}
                  </span>
                </div>
                <span className="text-sm font-medium text-white">
                  {formatUSDT(price.monthlyPrice)}/мес
                </span>
              </div>
            ))}
            {prices.length > 3 && (
              <p className="text-xs text-gray-500 text-center">
                +{prices.length - 3} ещё
              </p>
            )}
          </div>
        )}

        {/* Description */}
        {tariff.description && (
          <p className="text-sm text-gray-400 line-clamp-2">{tariff.description}</p>
        )}

        {/* Actions */}
        <div className="flex items-center gap-2 pt-2 border-t border-white/5">
          {!isArchived ? (
            <>
              <button
                onClick={onEdit}
                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-white/5 text-gray-300 hover:bg-white/10 hover:text-white transition-all text-xs"
              >
                <Edit2 className="h-3.5 w-3.5" />
                Изменить
              </button>
              {onToggleActive && (
                <button
                  onClick={onToggleActive}
                  className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg transition-all text-xs ${
                    tariff.isActive 
                      ? 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30' 
                      : 'bg-white/5 text-gray-400 hover:bg-white/10'
                  }`}
                >
                  {tariff.isActive ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                  {tariff.isActive ? 'Активен' : 'Неактивен'}
                </button>
              )}
              {onArchive && (
                <button
                  onClick={onArchive}
                  className="p-2 rounded-lg bg-white/5 text-gray-400 hover:bg-red-500/20 hover:text-red-400 transition-all"
                  title="Архивировать"
                >
                  <Archive className="h-3.5 w-3.5" />
                </button>
              )}
            </>
          ) : (
            <>
              {onRestore && (
                <button
                  onClick={onRestore}
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 transition-all text-xs"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  Восстановить
                </button>
              )}
              {onDelete && (
                <button
                  onClick={onDelete}
                  className="p-2 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-all"
                  title="Удалить навсегда"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// Модальное окно создания/редактирования
function TariffModal({
  title,
  formData,
  setFormData,
  saving,
  onSave,
  onClose,
  addPriceOption,
  removePriceOption,
  updatePriceOption
}: {
  title: string;
  formData: {
    name: string;
    description: string;
    isActive: boolean;
    color: string;
    badge: string;
    prices: PriceFormItem[];
  };
  setFormData: React.Dispatch<React.SetStateAction<typeof formData>>;
  saving: boolean;
  onSave: () => void;
  onClose: () => void;
  addPriceOption: () => void;
  removePriceOption: (index: number) => void;
  updatePriceOption: (index: number, field: keyof PriceFormItem, value: any) => void;
}) {
  // Quick duration presets
  const durationPresets = [1, 3, 6, 12];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-2xl rounded-2xl bg-[#1a1a2e] border border-white/10 p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-semibold text-white">{title}</h3>
          <button onClick={onClose} className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-all">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-5">
          {/* Name */}
          <div>
            <label className="block text-sm text-gray-400 mb-2">Название тарифа *</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Например: Стандарт"
              className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500/50 transition-all"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm text-gray-400 mb-2">Описание</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Краткое описание тарифа..."
              rows={2}
              className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500/50 transition-all resize-none"
            />
          </div>

          {/* Prices */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="text-sm text-gray-400">Ценовые опции (USDT) *</label>
              <button
                type="button"
                onClick={addPriceOption}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-indigo-500/20 text-indigo-400 hover:bg-indigo-500/30 text-xs transition-all"
              >
                <Plus className="h-3 w-3" />
                Добавить
              </button>
            </div>
            
            <div className="space-y-3">
              {formData.prices.map((price, index) => (
                <div key={index} className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/5">
                  {/* Period months */}
                  <div className="flex-1">
                    <label className="block text-xs text-gray-500 mb-1">Месяцев</label>
                    <div className="flex gap-1">
                      {durationPresets.map(m => (
                        <button
                          key={m}
                          type="button"
                          onClick={() => updatePriceOption(index, 'periodMonths', m)}
                          className={`px-2 py-1 rounded text-xs transition-all ${
                            price.periodMonths === m
                              ? 'bg-indigo-500/30 text-indigo-400'
                              : 'bg-white/5 text-gray-400 hover:bg-white/10'
                          }`}
                        >
                          {m}
                        </button>
                      ))}
                      <input
                        type="number"
                        min="1"
                        value={price.periodMonths}
                        onChange={(e) => updatePriceOption(index, 'periodMonths', parseInt(e.target.value) || 1)}
                        className="w-14 px-2 py-1 rounded bg-white/5 border border-white/10 text-white text-xs focus:outline-none focus:border-indigo-500/50"
                      />
                    </div>
                  </div>

                  {/* Monthly price */}
                  <div className="w-32">
                    <label className="block text-xs text-gray-500 mb-1">Цена/мес</label>
                    <div className="relative">
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={price.monthlyPrice}
                        onChange={(e) => updatePriceOption(index, 'monthlyPrice', parseFloat(e.target.value) || 0)}
                        className="w-full px-2 py-1 rounded bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-indigo-500/50"
                      />
                    </div>
                  </div>

                  {/* Popular toggle */}
                  <div className="flex flex-col items-center">
                    <label className="block text-xs text-gray-500 mb-1">Попул.</label>
                    <button
                      type="button"
                      onClick={() => updatePriceOption(index, 'isPopular', !price.isPopular)}
                      className={`p-1.5 rounded transition-all ${
                        price.isPopular 
                          ? 'bg-amber-500/20 text-amber-400' 
                          : 'bg-white/5 text-gray-500 hover:bg-white/10'
                      }`}
                    >
                      <Star className="h-4 w-4" />
                    </button>
                  </div>

                  {/* Remove button */}
                  {formData.prices.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removePriceOption(index)}
                      className="p-1.5 rounded bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-all self-end mb-0.5"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>

            {/* Preview total */}
            {formData.prices.length > 0 && (
              <div className="mt-3 p-3 rounded-xl bg-white/5">
                <p className="text-xs text-gray-500 mb-2">Итого по опциям:</p>
                <div className="flex flex-wrap gap-2">
                  {formData.prices.map((price, i) => (
                    <span key={i} className={`px-2 py-1 rounded text-xs ${
                      price.isPopular ? 'bg-amber-500/20 text-amber-400' : 'bg-white/10 text-gray-300'
                    }`}>
                      {price.periodMonths} мес × {price.monthlyPrice} = {(price.periodMonths * price.monthlyPrice).toFixed(2)} USDT
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Color */}
          <div>
            <label className="block text-sm text-gray-400 mb-2">Цвет</label>
            <div className="flex flex-wrap gap-2">
              {TARIFF_COLORS.map(color => (
                <button
                  key={color.id}
                  type="button"
                  onClick={() => setFormData({ ...formData, color: color.id })}
                  className={`w-10 h-10 rounded-xl bg-gradient-to-r ${color.class} transition-all ${
                    formData.color === color.id ? 'ring-2 ring-white ring-offset-2 ring-offset-[#1a1a2e]' : ''
                  }`}
                  title={color.name}
                />
              ))}
            </div>
          </div>

          {/* Badge */}
          <div>
            <label className="block text-sm text-gray-400 mb-2">Бейдж (необязательно)</label>
            <input
              type="text"
              value={formData.badge}
              onChange={(e) => setFormData({ ...formData, badge: e.target.value })}
              placeholder="Например: Популярный, Выгодный..."
              className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500/50 transition-all"
            />
          </div>

          {/* Active */}
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="isActive"
              checked={formData.isActive}
              onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
              className="w-4 h-4 rounded bg-white/10 border-white/20 text-indigo-500 focus:ring-indigo-500"
            />
            <label htmlFor="isActive" className="text-white cursor-pointer">
              Активировать тариф
            </label>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl bg-white/5 text-gray-400 hover:text-white hover:bg-white/10 transition-all"
          >
            Отмена
          </button>
          <button
            onClick={onSave}
            disabled={saving}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-medium hover:from-indigo-600 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-indigo-500/25"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {saving ? 'Сохранение...' : 'Сохранить'}
          </button>
        </div>
      </div>
    </div>
  );
}
