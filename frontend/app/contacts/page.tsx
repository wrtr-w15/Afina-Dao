'use client';

import React from 'react';
import Layout from '@/components/LayoutComponent';
import { MessageCircle, MessageSquare } from 'lucide-react';
import Link from 'next/link';

export default function ContactsPage() {
  return (
    <Layout
      title="Контакты"
      description="Связь с командой AfinaDAO"
    >
      <div className="max-w-3xl mx-auto space-y-6">
        <h1 className="text-3xl font-bold text-white">
          Контакты
        </h1>

        {/* Просто ссылки без карточек/блоков */}
        <div className="flex flex-col gap-4 text-sm md:text-base text-gray-200">
          <Link
            href="https://discord.gg/your-discord-invite"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-indigo-300 hover:text-indigo-100 transition-colors"
          >
            <MessageSquare className="h-5 w-5" />
            <span>Наш Discord сервер</span>
          </Link>

          <Link
            href="https://t.me/your_telegram_channel_or_chat"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-sky-300 hover:text-sky-100 transition-colors"
          >
            <MessageCircle className="h-5 w-5" />
            <span>Наш Telegram</span>
          </Link>
        </div>
      </div>
    </Layout>
  );
}

