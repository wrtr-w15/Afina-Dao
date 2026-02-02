'use client';

import React, { useState, useEffect } from 'react';
import AdminLayout from '@/components/admin/AdminLayout';
import {
  ShieldBan,
  UserX,
  Mail,
  MessageCircle,
  Plus,
  Trash2,
  RefreshCw,
  ArrowLeft
} from 'lucide-react';
import Link from 'next/link';

type BlocklistType = 'telegram_subscription' | 'email' | 'discord';

interface BlocklistItem {
  id: string;
  type: BlocklistType;
  value: string;
  createdAt: string;
}

const typeConfig: Record<BlocklistType, { label: string; placeholder: string; icon: typeof UserX }> = {
  telegram_subscription: {
    label: 'Telegram (запрещено покупать подписку)',
    placeholder: 'ID или @username',
    icon: UserX
  },
  email: {
    label: 'Почты (подключать нельзя)',
    placeholder: 'example@mail.com',
    icon: Mail
  },
  discord: {
    label: 'Discord (подключать нельзя)',
    placeholder: 'Discord ID',
    icon: MessageCircle
  }
};

export default function BlocklistPage() {
  const [items, setItems] = useState<BlocklistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState<Record<BlocklistType, boolean>>({
    telegram_subscription: false,
    email: false,
    discord: false
  });
  const [input, setInput] = useState<Record<BlocklistType, string>>({
    telegram_subscription: '',
    email: '',
    discord: ''
  });
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch('/api/admin/blocklist');
      if (!res.ok) throw new Error('Не удалось загрузить список');
      const data = await res.json();
      setItems(data.items || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ошибка');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const add = async (type: BlocklistType) => {
    const value = input[type].trim();
    if (!value) return;
    setAdding((p) => ({ ...p, [type]: true }));
    setError(null);
    try {
      const res = await fetch('/api/admin/blocklist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, value })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Ошибка добавления');
      setInput((p) => ({ ...p, [type]: '' }));
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ошибка');
    } finally {
      setAdding((p) => ({ ...p, [type]: false }));
    }
  };

  const remove = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/blocklist?id=${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Не удалось удалить');
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ошибка');
    }
  };

  const byType = (type: BlocklistType) => items.filter((i) => i.type === type);

  return (
    <AdminLayout title="Блокировка">
      <div className="space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <Link
              href="/admin"
              className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              В админку
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                <ShieldBan className="h-7 w-7 text-amber-400" />
                Блокировка
              </h1>
              <p className="text-gray-400 text-sm">
                Telegram — запрет покупки подписки в боте. Почта и Discord — запрет подключения; при попытке вы получите уведомление в бот 2FA.
              </p>
            </div>
          </div>
          <button
            onClick={load}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-gray-300 hover:bg-white/10 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Обновить
          </button>
        </div>

        {error && (
          <div className="rounded-xl bg-red-500/10 border border-red-500/20 px-4 py-3 text-red-400 text-sm">
            {error}
          </div>
        )}

        {(['telegram_subscription', 'email', 'discord'] as BlocklistType[]).map((type) => {
          const config = typeConfig[type];
          const Icon = config.icon;
          const list = byType(type);
          return (
            <section key={type} className="rounded-2xl bg-white/5 border border-white/10 overflow-hidden">
              <div className="px-6 py-4 border-b border-white/10 flex items-center gap-2">
                <Icon className="h-5 w-5 text-amber-400" />
                <h2 className="text-lg font-semibold text-white">{config.label}</h2>
              </div>
              <div className="p-6 space-y-4">
                <div className="flex flex-wrap gap-2">
                  <input
                    type="text"
                    value={input[type]}
                    onChange={(e) => setInput((p) => ({ ...p, [type]: e.target.value }))}
                    onKeyDown={(e) => e.key === 'Enter' && add(type)}
                    placeholder={config.placeholder}
                    className="flex-1 min-w-[200px] px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-amber-500/50"
                  />
                  <button
                    onClick={() => add(type)}
                    disabled={adding[type] || !input[type].trim()}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500/20 border border-amber-500/30 text-amber-300 hover:bg-amber-500/30 disabled:opacity-50"
                  >
                    <Plus className="h-4 w-4" />
                    Добавить
                  </button>
                </div>
                {loading ? (
                  <p className="text-gray-500 text-sm">Загрузка...</p>
                ) : list.length === 0 ? (
                  <p className="text-gray-500 text-sm">Пусто</p>
                ) : (
                  <ul className="space-y-2">
                    {list.map((item) => (
                      <li
                        key={item.id}
                        className="flex items-center justify-between py-2 px-3 rounded-lg bg-white/5 hover:bg-white/10"
                      >
                        <span className="text-white font-mono text-sm break-all">{item.value}</span>
                        <button
                          onClick={() => remove(item.id)}
                          className="p-2 rounded-lg text-gray-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                          title="Удалить"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </section>
          );
        })}
      </div>
    </AdminLayout>
  );
}
