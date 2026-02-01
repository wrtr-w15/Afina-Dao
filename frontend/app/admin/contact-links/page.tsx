'use client';

import React, { useState, useEffect } from 'react';
import AdminLayout from '@/components/admin/AdminLayout';
import { Link2, Save, Loader2, CheckCircle, AlertCircle } from 'lucide-react';

interface ContactLinks {
  telegramChannelUrl: string;
  discordInviteUrl: string;
  supportTg1: string;
  supportTg2: string;
}

export default function AdminContactLinksPage() {
  const [links, setLinks] = useState<ContactLinks>({
    telegramChannelUrl: '',
    discordInviteUrl: '',
    supportTg1: 'kirjeyy',
    supportTg2: 'ascys',
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    loadLinks();
  }, []);

  const loadLinks = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/admin/site-contact-links', { cache: 'no-cache' });
      if (!res.ok) throw new Error('Ошибка загрузки');
      const data = await res.json();
      setLinks({
        telegramChannelUrl: data.telegramChannelUrl ?? '',
        discordInviteUrl: data.discordInviteUrl ?? '',
        supportTg1: data.supportTg1 ?? '',
        supportTg2: data.supportTg2 ?? '',
      });
    } catch (e) {
      console.error(e);
      setMessage({ type: 'error', text: 'Не удалось загрузить ссылки' });
    } finally {
      setIsLoading(false);
    }
  };

  const saveLinks = async () => {
    setIsSaving(true);
    setMessage(null);
    try {
      const res = await fetch('/api/admin/site-contact-links', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          telegramChannelUrl: links.telegramChannelUrl,
          discordInviteUrl: links.discordInviteUrl,
          supportTg1: links.supportTg1,
          supportTg2: links.supportTg2,
        }),
      });
      if (!res.ok) throw new Error('Ошибка сохранения');
      setMessage({ type: 'success', text: 'Ссылки сохранены' });
    } catch (e) {
      console.error(e);
      setMessage({ type: 'error', text: 'Не удалось сохранить' });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <AdminLayout title="Ссылки для страницы контактов" description="Настройка ссылок на Telegram, Discord и поддержку">
      <div className="max-w-2xl">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-sky-500 to-indigo-600 flex items-center justify-center">
            <Link2 className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Ссылки контактов</h1>
            <p className="text-gray-400 text-sm">Эти ссылки отображаются на странице «Контакты»</p>
          </div>
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
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-sky-400" />
          </div>
        ) : (
          <div className="space-y-6 rounded-2xl border border-white/10 bg-white/5 p-6">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Ссылка на Telegram‑канал</label>
              <input
                type="url"
                value={links.telegramChannelUrl}
                onChange={(e) => setLinks((l) => ({ ...l, telegramChannelUrl: e.target.value }))}
                placeholder="https://t.me/your_channel"
                className="w-full px-4 py-2.5 rounded-xl bg-black/30 border border-white/10 text-white placeholder-gray-500 focus:border-sky-500/50 outline-none"
              />
              <p className="text-xs text-gray-500 mt-1">Полная ссылка на канал или чат</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Ссылка на Discord‑сервер</label>
              <input
                type="url"
                value={links.discordInviteUrl}
                onChange={(e) => setLinks((l) => ({ ...l, discordInviteUrl: e.target.value }))}
                placeholder="https://discord.gg/your-invite"
                className="w-full px-4 py-2.5 rounded-xl bg-black/30 border border-white/10 text-white placeholder-gray-500 focus:border-sky-500/50 outline-none"
              />
              <p className="text-xs text-gray-500 mt-1">Приглашение на сервер (Invite link)</p>
            </div>

            <div className="border-t border-white/10 pt-6">
              <h3 className="text-sm font-semibold text-white mb-3">Поддержка в Telegram</h3>
              <p className="text-xs text-gray-500 mb-4">Укажите юзернеймы (без @). На странице контактов будут кнопки «Написать в Telegram».</p>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Первый контакт</label>
                  <input
                    type="text"
                    value={links.supportTg1}
                    onChange={(e) => setLinks((l) => ({ ...l, supportTg1: e.target.value.replace(/^@/, '') }))}
                    placeholder="kirjeyy"
                    className="w-full px-4 py-2.5 rounded-xl bg-black/30 border border-white/10 text-white placeholder-gray-500 focus:border-sky-500/50 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Второй контакт</label>
                  <input
                    type="text"
                    value={links.supportTg2}
                    onChange={(e) => setLinks((l) => ({ ...l, supportTg2: e.target.value.replace(/^@/, '') }))}
                    placeholder="ascys"
                    className="w-full px-4 py-2.5 rounded-xl bg-black/30 border border-white/10 text-white placeholder-gray-500 focus:border-sky-500/50 outline-none"
                  />
                </div>
              </div>
            </div>

            <button
              onClick={saveLinks}
              disabled={isSaving}
              className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-600 text-white font-medium hover:opacity-90 disabled:opacity-50 transition"
            >
              {isSaving ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />}
              {isSaving ? 'Сохранение...' : 'Сохранить'}
            </button>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
