'use client';

import React, { useState, useEffect } from 'react';
import AdminLayout from '@/components/admin/AdminLayout';
import { useToast } from '@/components/admin/ToastContext';
import { MessageCircle, Save, Loader2, CheckCircle, AlertCircle, ChevronDown, ChevronRight, Plus, Trash2, X, HelpCircle, Download, Send, Image as ImageIcon } from 'lucide-react';

export type TelegramButton = { text: string; callback_data?: string; url?: string };
export type TelegramButtons = TelegramButton[][]; // массив рядов, ряд = массив кнопок

export type NotificationCondition = { type: 'days_before_expiry'; days: number } | null;

interface TelegramText {
  id: string;
  key: string;
  section: string;
  value: string;
  description: string;
  sortOrder: number;
  buttons?: TelegramButtons;
  notificationCondition?: NotificationCondition;
}

const SECTION_LABELS: Record<string, string> = {
  start: 'Старт (/start)',
  buy: 'Покупка подписки',
  account: 'Личный кабинет',
  notifications: 'Уведомления',
  common: 'Общие сообщения'
};

const SECTION_ORDER = ['start', 'buy', 'account', 'notifications', 'common'];

const TELEGRAM_VARIABLES: { name: string; desc: string }[] = [
  // Подписка и тарифы
  { name: '{{subscriptionInfo}}', desc: 'Приветствие: строка про подписку до даты (если есть)' },
  { name: '{{tariffName}}', desc: 'Название тарифа: на экране выбора тарифа; в личном кабинете — закреплённый за пользователем (из подписки или user_available_tariffs)' },
  { name: '{{planName}}', desc: 'Название выбранного плана (подтверждение заказа)' },
  { name: '{{period}}', desc: 'Период подписки в месяцах' },
  { name: '{{priceUsdt}}', desc: 'Сумма в USDT' },
  { name: '{{endDate}}', desc: 'Дата окончания подписки (формат по локали)' },
  { name: '{{daysLeft}}', desc: 'Дней до конца подписки' },
  { name: '{{subscriptionStatus}}', desc: 'Статус подписки в личном кабинете (✅ Активна до... или ❌ Нет активной подписки)' },
  
  // Discord
  { name: '{{discordLine}}', desc: 'Строка про Discord в подтверждении заказа (✅ username или ❌ Не подключён)' },
  { name: '{{discordStatus}}', desc: 'Статус Discord в личном кабинете (✅ username или ❌ Не подключён)' },
  { name: '{{discordOAuthUrl}}', desc: 'URL для авторизации Discord (OAuth)' },
  { name: '{{discordInviteUrl}}', desc: 'URL приглашения в Discord сервер' },
  
  // Email (Notion) и Google Drive
  { name: '{{emailLine}}', desc: 'Строка про Email в подтверждении заказа (устаревший, используйте {{notionEmailLine}} и {{googleDriveEmailLine}})' },
  { name: '{{emailStatus}}', desc: 'Личный кабинет: статус Email (Notion) (✅ email или ❌ Не указан)' },
  { name: '{{notionEmailLine}}', desc: 'Подтверждение заказа: строка Email (Notion) (✅ email или ❌ Не указан)' },
  { name: '{{googleDriveStatus}}', desc: 'Личный кабинет: статус Google Drive (✅ email или ❌ Не указан)' },
  { name: '{{googleDriveEmailLine}}', desc: 'Подтверждение заказа: строка Email (Google Drive) (✅ email или ❌ Не указан)' },
  
  // Платежи
  { name: '{{paymentInfo}}', desc: 'Текст про оплату (ожидание оплаты)' },
  { name: '{{paymentUrl}}', desc: 'URL страницы оплаты' },
  { name: '{{paymentList}}', desc: 'Список платежей в истории (форматированный текст)' },
  { name: '{{paginationInfo}}', desc: 'Информация о пагинации истории платежей' },
  
  // Промокоды
  { name: '{{promocode}}', desc: 'Код промокода (если применён)' },
  { name: '{{originalPrice}}', desc: 'Исходная цена до применения промокода (в USDT)' },
  { name: '{{discountPercent}}', desc: 'Процент скидки (если промокод процентный)' },
  { name: '{{discountAmount}}', desc: 'Фиксированная сумма скидки (если промокод фиксированный)' },
  { name: '{{discountType}}', desc: 'Тип скидки: percent или fixed' },
  
  // Социальные сети и поддержка
  { name: '{{telegramChannelUrl}}', desc: 'URL Telegram канала (для кнопок соцсетей)' },
  { name: '{{supportText}}', desc: 'Текст поддержки (например: @kirjeyy или @ascys)' },
  { name: '{{supportTg1}}', desc: 'Первый Telegram username для поддержки (без @, для URL кнопок)' },
  { name: '{{supportTg2}}', desc: 'Второй Telegram username для поддержки (без @, для URL кнопок)' },
];

export default function AdminTelegramPage() {
  const toast = useToast();
  const [texts, setTexts] = useState<TelegramText[]>([]);
  const [edited, setEdited] = useState<Record<string, string>>({});
  const [editedButtons, setEditedButtons] = useState<Record<string, TelegramButtons>>({});
  const [editedConditions, setEditedConditions] = useState<Record<string, NotificationCondition>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});
  const [showVariablesHint, setShowVariablesHint] = useState(false);
  const [showAddBlock, setShowAddBlock] = useState(false);
  const [newBlock, setNewBlock] = useState({
    key: '',
    section: 'common' as string,
    value: '',
    description: '',
    notificationCondition: null as NotificationCondition
  });
  const [addingBlock, setAddingBlock] = useState(false);
  const [showBroadcast, setShowBroadcast] = useState(false);
  const [broadcastText, setBroadcastText] = useState('');
  const [broadcastImageUrl, setBroadcastImageUrl] = useState('');
  const [broadcasting, setBroadcasting] = useState(false);
  const [broadcastStats, setBroadcastStats] = useState<{ sent: number; failed: number; total: number } | null>(null);
  const [broadcastTarget, setBroadcastTarget] = useState<'all' | 'with_subscription' | 'without_subscription'>('all');
  const [broadcastTariffIds, setBroadcastTariffIds] = useState<string[]>([]);
  const [tariffs, setTariffs] = useState<Array<{ id: string; name: string }>>([]);

  useEffect(() => {
    loadTexts();
  }, []);

  useEffect(() => {
    const loadTariffs = async () => {
      try {
        const res = await fetch('/api/tariffs?includeArchived=true');
        if (!res.ok) return;
        const data = await res.json();
        setTariffs(data.tariffs || []);
      } catch {
        // ignore
      }
    };
    if (showBroadcast) loadTariffs();
  }, [showBroadcast]);

  const loadTexts = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/admin/telegram-texts', { cache: 'no-cache' });
      if (!res.ok) throw new Error('Ошибка загрузки');
      const data = await res.json();
      setTexts(data.texts || []);
      const initial: Record<string, string> = {};
      const initialButtons: Record<string, TelegramButtons> = {};
      const initialConditions: Record<string, NotificationCondition> = {};
      (data.texts || []).forEach((t: TelegramText) => {
        initial[t.key] = t.value;
        initialButtons[t.key] = Array.isArray(t.buttons) && t.buttons.length > 0 ? t.buttons : [];
        if (t.section === 'notifications') {
          initialConditions[t.key] = t.notificationCondition ?? null;
        }
      });
      setEdited(initial);
      setEditedButtons(initialButtons);
      setEditedConditions(initialConditions);
    } catch (e) {
      console.error(e);
      toast.showError('Не удалось загрузить тексты');
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (key: string, value: string) => {
    setEdited((prev) => ({ ...prev, [key]: value }));
  };

  const saveAll = async () => {
    setIsSaving(true);
    try {
      const updates = texts.map((t) => {
        const u: { key: string; value: string; buttons: TelegramButtons; notification_condition?: NotificationCondition } = {
          key: t.key,
          value: edited[t.key] ?? t.value,
          buttons: editedButtons[t.key] ?? t.buttons ?? []
        };
        if (t.section === 'notifications') {
          u.notification_condition = editedConditions[t.key] ?? t.notificationCondition ?? null;
        }
        return u;
      });
      const res = await fetch('/api/admin/telegram-texts', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ updates })
      });
      if (!res.ok) throw new Error('Ошибка сохранения');
      toast.showSuccess('Тексты сохранены');
    } catch (e) {
      console.error(e);
      toast.showError('Не удалось сохранить');
    } finally {
      setIsSaving(false);
    }
  };

  const toggleSection = (section: string) => {
    setCollapsedSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  const getButtons = (key: string): TelegramButtons => editedButtons[key] ?? [];
  const setButtons = (key: string, next: TelegramButtons) => {
    setEditedButtons((prev) => ({ ...prev, [key]: next }));
  };
  const addRow = (key: string) => {
    setButtons(key, [...getButtons(key), []]);
  };
  const removeRow = (key: string, rowIndex: number) => {
    setButtons(key, getButtons(key).filter((_, i) => i !== rowIndex));
  };
  const addButton = (key: string, rowIndex: number) => {
    const rows = [...getButtons(key)];
    if (!rows[rowIndex]) rows[rowIndex] = [];
    rows[rowIndex] = [...rows[rowIndex], { text: '', callback_data: '' }];
    setButtons(key, rows);
  };
  const removeButton = (key: string, rowIndex: number, btnIndex: number) => {
    const rows = getButtons(key).map((row, i) =>
      i === rowIndex ? row.filter((_, j) => j !== btnIndex) : row
    );
    setButtons(key, rows.filter((row) => row.length > 0));
  };
  const updateButton = (key: string, rowIndex: number, btnIndex: number, field: 'text' | 'callback_data' | 'url', value: string) => {
    const rows = getButtons(key).map((row, i) =>
      i === rowIndex
        ? row.map((btn, j) => (j === btnIndex ? { ...btn, [field]: value } : btn))
        : row
    );
    setButtons(key, rows);
  };

  const bySection = texts.reduce<Record<string, TelegramText[]>>((acc, t) => {
    if (!acc[t.section]) acc[t.section] = [];
    acc[t.section].push(t);
    return acc;
  }, {});

  const sections = Array.from(new Set([...SECTION_ORDER, ...Object.keys(bySection)])).sort((a, b) => {
    const ai = SECTION_ORDER.indexOf(a);
    const bi = SECTION_ORDER.indexOf(b);
    if (ai !== -1 && bi !== -1) return ai - bi;
    if (ai !== -1) return -1;
    if (bi !== -1) return 1;
    return a.localeCompare(b);
  });

  const setCondition = (key: string, cond: NotificationCondition) => {
    setEditedConditions((prev) => ({ ...prev, [key]: cond }));
  };

  const handleAddBlock = async () => {
    const key = newBlock.key.trim();
    if (!key) {
      toast.showError('Введите ключ блока');
      return;
    }
    setAddingBlock(true);
    try {
      const body: Record<string, unknown> = {
        key,
        section: newBlock.section,
        value: newBlock.value,
        description: newBlock.description,
        sort_order: 100
      };
      if (newBlock.section === 'notifications' && newBlock.notificationCondition?.type === 'days_before_expiry' && newBlock.notificationCondition.days >= 1) {
        body.notification_condition = newBlock.notificationCondition;
      }
      const res = await fetch('/api/admin/telegram-texts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Ошибка создания');
      toast.showSuccess('Блок добавлен');
      setShowAddBlock(false);
      setNewBlock({ key: '', section: 'common', value: '', description: '', notificationCondition: null });
      loadTexts();
    } catch (e) {
      toast.showError(e instanceof Error ? e.message : 'Не удалось добавить блок');
    } finally {
      setAddingBlock(false);
    }
  };

  return (
    <AdminLayout title="Telegram — Тексты бота" description="Настройка текстов для каждого раздела бота">
      <div className="relative z-10 max-w-4xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-sky-500 to-blue-600 flex items-center justify-center">
              <MessageCircle className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Тексты Telegram-бота</h1>
              <p className="text-gray-400 text-sm">Редактируйте сообщения для каждого раздела бота</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowVariablesHint((v) => !v)}
                className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-gray-300 hover:bg-white/10 hover:text-white transition"
                title="Все переменные"
              >
                <HelpCircle className="h-4 w-4" />
                Все переменные
              </button>
              {showVariablesHint && (
                <>
                  <div className="absolute right-0 top-full mt-1 z-50 w-[420px] max-h-[70vh] overflow-y-auto rounded-xl bg-[#1a1a2e] border border-white/10 shadow-xl p-4">
                    <div className="flex items-center justify-between mb-3">
                      <span className="font-semibold text-white">Доступные переменные</span>
                      <button type="button" onClick={() => setShowVariablesHint(false)} className="p-1 rounded text-gray-400 hover:text-white">
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                    <p className="text-xs text-gray-500 mb-3">Вставляйте в текст в формате {'{{имя}}'}. Регистр важен.</p>
                    <ul className="space-y-2">
                      {TELEGRAM_VARIABLES.map((v) => (
                        <li key={v.name} className="text-sm">
                          <code className="text-sky-300 font-mono">{v.name}</code>
                          <span className="text-gray-400 ml-2">— {v.desc}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="fixed inset-0 z-40" onClick={() => setShowVariablesHint(false)} aria-hidden="true" />
                </>
              )}
            </div>
            <button
              type="button"
              onClick={() => setShowBroadcast(true)}
              className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-purple-500/20 border border-purple-500/30 text-purple-300 hover:bg-purple-500/30 transition"
            >
              <Send className="h-4 w-4" />
              Отправить всем
            </button>
            <button
              type="button"
              onClick={() => setShowAddBlock(true)}
              className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-gray-300 hover:bg-white/10 hover:text-white transition"
            >
              <Plus className="h-4 w-4" />
              Добавить блок
            </button>
            <button
              onClick={saveAll}
              disabled={isLoading || isSaving}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 text-white font-medium hover:opacity-90 disabled:opacity-50 transition"
            >
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {isSaving ? 'Сохранение...' : 'Сохранить всё'}
            </button>
          </div>
        </div>

        {/* Модальное окно массовой рассылки */}
        {showBroadcast && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
            <div className="absolute inset-0 bg-black/60" onClick={() => {
              setShowBroadcast(false);
              setBroadcastText('');
              setBroadcastImageUrl('');
              setBroadcastStats(null);
              setBroadcastTariffIds([]);
            }} />
            <div className="relative w-full max-w-2xl max-h-[90vh] flex flex-col rounded-2xl bg-[#1a1a2e] border border-white/10 shadow-xl overflow-hidden">
              <div className="flex-shrink-0 flex items-center justify-between p-6 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center">
                    <Send className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-white">Массовая рассылка</h2>
                    <p className="text-xs text-gray-400">Отправить сообщение всем пользователям бота</p>
                  </div>
                </div>
                <button 
                  type="button" 
                  onClick={() => {
                    setShowBroadcast(false);
                    setBroadcastText('');
                    setBroadcastImageUrl('');
                    setBroadcastStats(null);
                    setBroadcastTarget('all');
                    setBroadcastTariffIds([]);
                  }} 
                  className="p-1 rounded text-gray-400 hover:text-white transition"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="flex-1 min-h-0 overflow-y-auto px-6 pb-4 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Целевая аудитория <span className="text-red-400">*</span>
                  </label>
                  <div className="grid grid-cols-1 gap-2">
                    <label className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/10 cursor-pointer hover:bg-white/10 transition">
                      <input
                        type="radio"
                        name="broadcastTarget"
                        value="all"
                        checked={broadcastTarget === 'all'}
                        onChange={(e) => setBroadcastTarget(e.target.value as any)}
                        className="w-4 h-4 text-purple-500 focus:ring-purple-500 focus:ring-2"
                      />
                      <div className="flex-1">
                        <div className="text-white font-medium">Всем пользователям</div>
                        <div className="text-xs text-gray-400">Отправить сообщение всем пользователям бота</div>
                      </div>
                    </label>
                    <label className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/10 cursor-pointer hover:bg-white/10 transition">
                      <input
                        type="radio"
                        name="broadcastTarget"
                        value="with_subscription"
                        checked={broadcastTarget === 'with_subscription'}
                        onChange={(e) => setBroadcastTarget(e.target.value as any)}
                        className="w-4 h-4 text-purple-500 focus:ring-purple-500 focus:ring-2"
                      />
                      <div className="flex-1">
                        <div className="text-white font-medium">С активной подпиской</div>
                        <div className="text-xs text-gray-400">Только пользователям с активной подпиской</div>
                      </div>
                    </label>
                    <label className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/10 cursor-pointer hover:bg-white/10 transition">
                      <input
                        type="radio"
                        name="broadcastTarget"
                        value="without_subscription"
                        checked={broadcastTarget === 'without_subscription'}
                        onChange={(e) => setBroadcastTarget(e.target.value as any)}
                        className="w-4 h-4 text-purple-500 focus:ring-purple-500 focus:ring-2"
                      />
                      <div className="flex-1">
                        <div className="text-white font-medium">Без активной подписки</div>
                        <div className="text-xs text-gray-400">Только пользователям без активной подписки</div>
                      </div>
                    </label>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Только по тарифам (опционально)
                  </label>
                  <p className="text-xs text-gray-500 mb-2">
                    Оставьте пустым — рассылка по выбранной аудитории выше. Отметьте тарифы — сообщение получат только пользователи, у которых есть подписка (в т.ч. истёкшая) с одним из этих тарифов.
                  </p>
                  <div className="max-h-40 overflow-y-auto rounded-xl bg-white/5 border border-white/10 p-3 space-y-2">
                    {tariffs.length === 0 ? (
                      <div className="text-xs text-gray-500">Загрузка тарифов...</div>
                    ) : (
                      tariffs.map((tariff) => (
                        <label key={tariff.id} className="flex items-center gap-2 cursor-pointer hover:bg-white/5 p-2 rounded-lg">
                          <input
                            type="checkbox"
                            checked={broadcastTariffIds.includes(tariff.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setBroadcastTariffIds(prev => [...prev, tariff.id]);
                              } else {
                                setBroadcastTariffIds(prev => prev.filter(id => id !== tariff.id));
                              }
                            }}
                            className="w-4 h-4 text-purple-500 rounded focus:ring-purple-500 focus:ring-2"
                          />
                          <span className="text-sm text-white">{tariff.name}</span>
                        </label>
                      ))
                    )}
                  </div>
                  {broadcastTariffIds.length > 0 && (
                    <p className="mt-1 text-xs text-purple-400">Выбрано тарифов: {broadcastTariffIds.length}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Текст сообщения <span className="text-red-400">*</span>
                  </label>
                  <textarea
                    value={broadcastText}
                    onChange={(e) => setBroadcastText(e.target.value)}
                    placeholder="Введите текст сообщения для всех пользователей..."
                    rows={6}
                    className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500/50 focus:bg-white/10 transition-all resize-none"
                  />
                  <p className="mt-1 text-xs text-gray-500">Поддерживается HTML разметка</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    <ImageIcon className="h-4 w-4 inline mr-1" />
                    URL изображения (опционально)
                  </label>
                  <input
                    type="url"
                    value={broadcastImageUrl}
                    onChange={(e) => setBroadcastImageUrl(e.target.value)}
                    placeholder="https://example.com/image.jpg"
                    className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500/50 focus:bg-white/10 transition-all"
                  />
                  <p className="mt-1 text-xs text-gray-500">Публичный URL изображения. Если указан, сообщение будет отправлено как фото с подписью</p>
                </div>

                {broadcastStats && (
                  <div className={`p-4 rounded-xl border ${
                    broadcastStats.failed === 0 
                      ? 'bg-green-500/10 border-green-500/20 text-green-400'
                      : 'bg-amber-500/10 border-amber-500/20 text-amber-400'
                  }`}>
                    <div className="flex items-center gap-2 mb-2">
                      {broadcastStats.failed === 0 ? (
                        <CheckCircle className="h-5 w-5" />
                      ) : (
                        <AlertCircle className="h-5 w-5" />
                      )}
                      <span className="font-semibold">
                        {broadcastStats.failed === 0 ? 'Рассылка завершена успешно' : 'Рассылка завершена с ошибками'}
                      </span>
                    </div>
                    <div className="text-sm space-y-1">
                      <div>Всего пользователей: <strong>{broadcastStats.total}</strong></div>
                      <div className="text-green-400">Отправлено: <strong>{broadcastStats.sent}</strong></div>
                      {broadcastStats.failed > 0 && (
                        <div className="text-red-400">Ошибок: <strong>{broadcastStats.failed}</strong></div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex-shrink-0 flex justify-end gap-3 px-6 py-4 border-t border-white/10 bg-[#1a1a2e]">
                  <button
                    type="button"
                    onClick={() => {
                      setShowBroadcast(false);
                      setBroadcastText('');
                      setBroadcastImageUrl('');
                      setBroadcastStats(null);
                      setBroadcastTariffIds([]);
                    }}
                    className="px-4 py-2.5 rounded-xl bg-white/5 text-gray-300 hover:bg-white/10 transition"
                    disabled={broadcasting}
                  >
                    Отмена
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      if (!broadcastText.trim()) {
                        toast.showError('Введите текст сообщения');
                        return;
                      }

                      const targetLabel = 
                        broadcastTarget === 'all' ? 'всем пользователям' :
                        broadcastTarget === 'with_subscription' ? 'пользователям с активной подпиской' :
                        'пользователям без активной подписки';
                      const tariffLabel = broadcastTariffIds.length > 0
                        ? ` (только с тарифами: ${broadcastTariffIds.length})`
                        : '';

                      if (!confirm(`Отправить сообщение ${targetLabel}${tariffLabel}?\n\nТекст: ${broadcastText.substring(0, 100)}${broadcastText.length > 100 ? '...' : ''}\n\nЭто действие нельзя отменить.`)) {
                        return;
                      }

                      setBroadcasting(true);
                      setBroadcastStats(null);
                      try {
                        const res = await fetch('/api/admin/telegram/broadcast', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            text: broadcastText,
                            imageUrl: broadcastImageUrl.trim() || null,
                            target: broadcastTarget,
                            tariffIds: broadcastTariffIds.length > 0 ? broadcastTariffIds : null
                          })
                        });

                        const data = await res.json();
                        
                        if (!res.ok) {
                          throw new Error(data.error || 'Ошибка рассылки');
                        }

                        setBroadcastStats({
                          sent: data.sent || 0,
                          failed: data.failed || 0,
                          total: data.total || 0
                        });

                        if (data.failed === 0) {
                          toast.showSuccess(`Сообщение отправлено всем ${data.sent} пользователям`);
                        } else {
                          toast.showWarning(`Отправлено ${data.sent} из ${data.total} пользователей. Ошибок: ${data.failed}`);
                        }
                      } catch (e) {
                        toast.showError(e instanceof Error ? e.message : 'Ошибка при выполнении рассылки');
                      } finally {
                        setBroadcasting(false);
                      }
                    }}
                    disabled={broadcasting || !broadcastText.trim()}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-purple-500 to-pink-600 text-white font-medium hover:opacity-90 disabled:opacity-50 transition"
                  >
                    {broadcasting ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Отправка...
                      </>
                    ) : (
                      <>
                        <Send className="h-4 w-4" />
                        Отправить всем
                      </>
                    )}
                  </button>
              </div>
            </div>
          </div>
        )}

        {showAddBlock && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60" onClick={() => setShowAddBlock(false)} />
            <div className="relative w-full max-w-lg rounded-2xl bg-[#1a1a2e] border border-white/10 p-6 shadow-xl">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-white">Добавить блок сообщения</h2>
                <button type="button" onClick={() => setShowAddBlock(false)} className="p-1 rounded text-gray-400 hover:text-white">
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Ключ (уникальный, латиница/подчёркивание)</label>
                  <input
                    type="text"
                    value={newBlock.key}
                    onChange={(e) => setNewBlock((b) => ({ ...b, key: e.target.value.replace(/[^a-zA-Z0-9_]/g, '') }))}
                    placeholder="my_custom_message"
                    className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:border-sky-500/50 outline-none font-mono"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Раздел</label>
                  <select
                    value={newBlock.section}
                    onChange={(e) => setNewBlock((b) => ({ ...b, section: e.target.value }))}
                    className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white focus:border-sky-500/50 outline-none"
                  >
                    {SECTION_ORDER.map((s) => (
                      <option key={s} value={s}>{SECTION_LABELS[s] || s}</option>
                    ))}
                  </select>
                </div>
                {newBlock.section === 'notifications' && (
                  <div className="rounded-xl bg-amber-500/10 border border-amber-500/20 p-4 space-y-2">
                    <p className="text-sm font-medium text-amber-200">Условие отправки</p>
                    <p className="text-xs text-gray-400">Отправить сообщение, когда до окончания подписки осталось указанное число дней.</p>
                    <div className="flex items-center gap-2 flex-wrap">
                      <label className="text-sm text-gray-400">За</label>
                      <input
                        type="number"
                        min={1}
                        max={365}
                        value={newBlock.notificationCondition?.type === 'days_before_expiry' ? newBlock.notificationCondition.days : ''}
                        onChange={(e) => {
                          const n = parseInt(e.target.value, 10);
                          setNewBlock((b) => ({
                            ...b,
                            notificationCondition: Number.isFinite(n) && n >= 1
                              ? { type: 'days_before_expiry', days: n }
                              : null
                          }));
                        }}
                        placeholder="3"
                        className="w-20 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white focus:border-sky-500/50 outline-none"
                      />
                      <span className="text-sm text-gray-400">дней до окончания подписки</span>
                      {(newBlock.notificationCondition?.type === 'days_before_expiry') && (
                        <button
                          type="button"
                          onClick={() => setNewBlock((b) => ({ ...b, notificationCondition: null }))}
                          className="text-xs text-gray-500 hover:text-red-400"
                        >
                          Без условия
                        </button>
                      )}
                    </div>
                  </div>
                )}
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Описание (подсказка для себя)</label>
                  <input
                    type="text"
                    value={newBlock.description}
                    onChange={(e) => setNewBlock((b) => ({ ...b, description: e.target.value }))}
                    placeholder="Краткое описание блока"
                    className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:border-sky-500/50 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Текст сообщения</label>
                  <textarea
                    value={newBlock.value}
                    onChange={(e) => setNewBlock((b) => ({ ...b, value: e.target.value }))}
                    rows={4}
                    placeholder="Текст с переменными {{name}}..."
                    className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:border-sky-500/50 outline-none resize-y font-mono text-sm"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 mt-6">
                <button type="button" onClick={() => setShowAddBlock(false)} className="px-4 py-2 rounded-xl bg-white/5 text-gray-300 hover:bg-white/10">
                  Отмена
                </button>
                <button type="button" onClick={handleAddBlock} disabled={addingBlock} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-sky-500/20 text-sky-300 hover:bg-sky-500/30 disabled:opacity-50">
                  {addingBlock ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                  {addingBlock ? 'Добавление...' : 'Добавить'}
                </button>
              </div>
            </div>
          </div>
        )}


        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-sky-400" />
          </div>
        ) : (
          <div className="space-y-6">
            {sections.map((section) => {
              const items = bySection[section] || [];
              if (items.length === 0) return null;
              const isCollapsed = collapsedSections[section];
              return (
                <div
                  key={section}
                  className="rounded-2xl border border-white/10 bg-white/5 overflow-hidden"
                >
                  <button
                    type="button"
                    onClick={() => toggleSection(section)}
                    className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-white/5 transition"
                  >
                    <span className="font-semibold text-white">{SECTION_LABELS[section] || section}</span>
                    {isCollapsed ? (
                      <ChevronRight className="h-5 w-5 text-gray-400" />
                    ) : (
                      <ChevronDown className="h-5 w-5 text-gray-400" />
                    )}
                  </button>
                  {!isCollapsed && (
                    <div className="px-5 pb-5 space-y-5">
                      {items.map((t) => (
                        <div key={t.id} className="rounded-xl bg-black/20 p-4 space-y-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-300 mb-1">
                              {t.key}
                              {t.description && (
                                <span className="ml-2 text-gray-500 font-normal">— {t.description}</span>
                              )}
                            </label>
                            <p className="text-xs text-gray-400 mb-2">
                              Полный текст сообщения (шаблон). Все переменные в формате <code className="text-sky-300">{'{{...}}'}</code> (в т.ч. {'{{discordStatus}}'}, {'{{emailStatus}}'}, {'{{googleDriveStatus}}'}, {'{{notionEmailLine}}'}, {'{{googleDriveEmailLine}}'}) подставляются ботом при отправке. Редактируйте весь текст целиком, включая строки с Google Drive.
                            </p>
                            {section === 'notifications' && (() => {
                              const cond = editedConditions[t.key] ?? t.notificationCondition ?? null;
                              const hasCondition = cond?.type === 'days_before_expiry';
                              return (
                                <div className="mb-3 rounded-lg bg-amber-500/10 border border-amber-500/20 p-3 flex items-center gap-3 flex-wrap">
                                  <span className="text-sm text-amber-200">Условие:</span>
                                  <div className="flex items-center gap-2">
                                    <label className="text-xs text-gray-400">За</label>
                                    <input
                                      type="number"
                                      min={1}
                                      max={365}
                                      value={hasCondition ? cond.days : ''}
                                      onChange={(e) => {
                                        const n = parseInt(e.target.value, 10);
                                        setCondition(t.key, Number.isFinite(n) && n >= 1 ? { type: 'days_before_expiry', days: n } : null);
                                      }}
                                      placeholder="дней"
                                      className="w-16 px-2 py-1.5 rounded bg-white/5 border border-white/10 text-white text-sm focus:border-sky-500/50 outline-none"
                                    />
                                    <span className="text-xs text-gray-400">дней до конца подписки</span>
                                  </div>
                                  {hasCondition && (
                                    <button
                                      type="button"
                                      onClick={() => setCondition(t.key, null)}
                                      className="text-xs text-gray-500 hover:text-red-400"
                                    >
                                      Убрать условие
                                    </button>
                                  )}
                                  {!hasCondition && (
                                    <span className="text-xs text-gray-500">Без условия — не отправляется по расписанию</span>
                                  )}
                                </div>
                              );
                            })()}
                            <textarea
                              value={edited[t.key] ?? t.value}
                              onChange={(e) => handleChange(t.key, e.target.value)}
                              rows={Math.min(24, Math.max(10, (edited[t.key] ?? t.value).split('\n').length + 3))}
                              className="w-full min-h-[240px] px-4 py-3 rounded-lg bg-black/30 border border-white/10 text-white placeholder-gray-500 focus:border-sky-500/50 focus:ring-1 focus:ring-sky-500/50 outline-none resize-y font-mono text-sm leading-relaxed"
                              placeholder="Введите полный текст сообщения. Переменные: {{subscriptionStatus}}, {{discordStatus}}, {{emailStatus}}, {{googleDriveStatus}}, {{notionEmailLine}}, {{googleDriveEmailLine}} и др. HTML: &lt;b&gt;, &lt;code&gt;"
                            />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-300 mb-2">Кнопки к сообщению</p>
                            <p className="text-xs text-gray-500 mb-2">
                              Каждый ряд — отдельная строка кнопок. У кнопки укажите текст и либо <strong>callback_data</strong> (без пробелов, до 64 байт), либо <strong>url</strong> (ссылка). Регистр callback_data не важен. После сохранения кэш бота сбрасывается.
                            </p>
                            <p className="text-xs text-gray-400 mb-2">
                              Допустимые callback_data: <code className="text-gray-300">back_to_main</code>, <code className="text-gray-300">account</code>, <code className="text-gray-300">my_account</code>, <code className="text-gray-300">buy_subscription</code> (меню тарифов), <code className="text-gray-300">selectPlan_header</code> (то же — меню тарифов), <code className="text-gray-300">socials</code>, <code className="text-gray-300">help</code>, <code className="text-gray-300">check_status</code>, <code className="text-gray-300">back_to_account</code>, <code className="text-gray-300">refresh_account_info</code>, <code className="text-gray-300">change_email</code>, <code className="text-gray-300">enter_email</code>, <code className="text-gray-300">reconnect_discord</code>, <code className="text-gray-300">disconnect_discord</code>, <code className="text-gray-300">confirm_order</code>, <code className="text-gray-300">cancel_order</code>. Для выбора тарифа: <code className="text-gray-300">select_plan:ID</code> (ID тарифа).
                            </p>
                            {getButtons(t.key).map((row, rowIndex) => (
                              <div key={rowIndex} className="mb-3 pl-2 border-l-2 border-white/10 space-y-2">
                                <div className="flex items-center gap-2 flex-wrap">
                                  {row.map((btn, btnIndex) => (
                                    <div key={btnIndex} className="flex items-center gap-1 flex-wrap rounded-lg bg-black/30 p-2">
                                      <input
                                        type="text"
                                        value={btn.text}
                                        onChange={(e) => updateButton(t.key, rowIndex, btnIndex, 'text', e.target.value)}
                                        placeholder="Текст кнопки"
                                        className="w-28 px-2 py-1 rounded bg-white/5 border border-white/10 text-white text-sm"
                                      />
                                      <input
                                        type="text"
                                        value={btn.callback_data ?? ''}
                                        onChange={(e) => updateButton(t.key, rowIndex, btnIndex, 'callback_data', e.target.value)}
                                        placeholder="callback_data"
                                        className="w-32 px-2 py-1 rounded bg-white/5 border border-white/10 text-white text-sm font-mono"
                                      />
                                      <input
                                        type="text"
                                        value={btn.url ?? ''}
                                        onChange={(e) => updateButton(t.key, rowIndex, btnIndex, 'url', e.target.value)}
                                        placeholder="или url"
                                        className="w-36 px-2 py-1 rounded bg-white/5 border border-white/10 text-white text-sm"
                                      />
                                      <button
                                        type="button"
                                        onClick={() => removeButton(t.key, rowIndex, btnIndex)}
                                        className="p-1 rounded text-gray-400 hover:text-red-400 hover:bg-red-500/10"
                                        title="Удалить кнопку"
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </button>
                                    </div>
                                  ))}
                                  <button
                                    type="button"
                                    onClick={() => addButton(t.key, rowIndex)}
                                    className="flex items-center gap-1 px-2 py-1 rounded-lg bg-white/5 text-gray-400 hover:text-white hover:bg-white/10 text-sm"
                                  >
                                    <Plus className="h-4 w-4" /> Кнопка
                                  </button>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => removeRow(t.key, rowIndex)}
                                  className="text-xs text-gray-500 hover:text-red-400"
                                >
                                  Удалить ряд
                                </button>
                              </div>
                            ))}
                            <button
                              type="button"
                              onClick={() => addRow(t.key)}
                              className="flex items-center gap-1 px-3 py-2 rounded-xl bg-white/5 text-gray-400 hover:text-white hover:bg-white/10 text-sm"
                            >
                              <Plus className="h-4 w-4" /> Ряд кнопок
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <p className="mt-6 text-gray-500 text-sm">
          Подстановки в шаблонах — см. кнопку <strong>«Все переменные»</strong> справа вверху.
        </p>
      </div>
    </AdminLayout>
  );
}
