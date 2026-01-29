'use client';

import React, { useState, useEffect } from 'react';
import AdminLayout from '@/components/admin/AdminLayout';
import { MessageCircle, Save, Loader2, CheckCircle, AlertCircle, ChevronDown, ChevronRight } from 'lucide-react';

interface TelegramText {
  id: string;
  key: string;
  section: string;
  value: string;
  description: string;
  sortOrder: number;
}

const SECTION_LABELS: Record<string, string> = {
  start: 'Старт (/start)',
  buy: 'Покупка подписки',
  account: 'Личный кабинет',
  common: 'Общие сообщения'
};

export default function AdminTelegramPage() {
  const [texts, setTexts] = useState<TelegramText[]>([]);
  const [edited, setEdited] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});

  useEffect(() => {
    loadTexts();
  }, []);

  const loadTexts = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/admin/telegram-texts', { cache: 'no-cache' });
      if (!res.ok) throw new Error('Ошибка загрузки');
      const data = await res.json();
      setTexts(data.texts || []);
      const initial: Record<string, string> = {};
      (data.texts || []).forEach((t: TelegramText) => { initial[t.key] = t.value; });
      setEdited(initial);
    } catch (e) {
      console.error(e);
      setMessage({ type: 'error', text: 'Не удалось загрузить тексты' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (key: string, value: string) => {
    setEdited((prev) => ({ ...prev, [key]: value }));
  };

  const saveAll = async () => {
    setIsSaving(true);
    setMessage(null);
    try {
      const updates = texts.map((t) => ({ key: t.key, value: edited[t.key] ?? t.value }));
      const res = await fetch('/api/admin/telegram-texts', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ updates })
      });
      if (!res.ok) throw new Error('Ошибка сохранения');
      setMessage({ type: 'success', text: 'Тексты сохранены' });
    } catch (e) {
      console.error(e);
      setMessage({ type: 'error', text: 'Не удалось сохранить' });
    } finally {
      setIsSaving(false);
    }
  };

  const toggleSection = (section: string) => {
    setCollapsedSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  const bySection = texts.reduce<Record<string, TelegramText[]>>((acc, t) => {
    if (!acc[t.section]) acc[t.section] = [];
    acc[t.section].push(t);
    return acc;
  }, {});

  const sections = ['start', 'buy', 'account', 'common'];

  return (
    <AdminLayout title="Telegram — Тексты бота" description="Настройка текстов для каждого раздела бота">
      <div className="relative z-10 max-w-4xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-sky-500 to-blue-600 flex items-center justify-center">
              <MessageCircle className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Тексты Telegram-бота</h1>
              <p className="text-gray-400 text-sm">Редактируйте сообщения для каждого раздела бота</p>
            </div>
          </div>
          <button
            onClick={saveAll}
            disabled={isLoading || isSaving}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 text-white font-medium hover:opacity-90 disabled:opacity-50 transition"
          >
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {isSaving ? 'Сохранение...' : 'Сохранить всё'}
          </button>
        </div>

        {message && (
          <div
            className={`flex items-center gap-2 px-4 py-3 rounded-xl mb-6 ${
              message.type === 'success' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'
            }`}
          >
            {message.type === 'success' ? <CheckCircle className="h-5 w-5" /> : <AlertCircle className="h-5 w-5" />}
            <span>{message.text}</span>
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
                        <div key={t.id} className="rounded-xl bg-black/20 p-4">
                          <label className="block text-sm font-medium text-gray-300 mb-1">
                            {t.key}
                            {t.description && (
                              <span className="ml-2 text-gray-500 font-normal">— {t.description}</span>
                            )}
                          </label>
                          <textarea
                            value={edited[t.key] ?? t.value}
                            onChange={(e) => handleChange(t.key, e.target.value)}
                            rows={Math.min(12, (edited[t.key] ?? t.value).split('\n').length + 2)}
                            className="w-full px-4 py-3 rounded-lg bg-black/30 border border-white/10 text-white placeholder-gray-500 focus:border-sky-500/50 focus:ring-1 focus:ring-sky-500/50 outline-none resize-y font-mono text-sm"
                            placeholder="Текст сообщения (поддерживается HTML: &lt;b&gt;, &lt;code&gt;)"
                          />
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
          Подстановки в шаблонах: <code className="text-gray-400">{'{{subscriptionInfo}}'}</code>,{' '}
          <code className="text-gray-400">{'{{tariffName}}'}</code>, <code className="text-gray-400">{'{{planName}}'}</code>,{' '}
          <code className="text-gray-400">{'{{priceUsdt}}'}</code>, <code className="text-gray-400">{'{{discordLine}}'}</code>,{' '}
          <code className="text-gray-400">{'{{emailLine}}'}</code>, <code className="text-gray-400">{'{{endDate}}'}</code>,{' '}
          <code className="text-gray-400">{'{{daysLeft}}'}</code>, <code className="text-gray-400">{'{{subscriptionStatus}}'}</code>,{' '}
          <code className="text-gray-400">{'{{discordStatus}}'}</code>, <code className="text-gray-400">{'{{emailStatus}}'}</code>,{' '}
          <code className="text-gray-400">{'{{period}}'}</code>
        </p>
      </div>
    </AdminLayout>
  );
}
