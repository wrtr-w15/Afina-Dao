'use client';

import React from 'react';
import Link from 'next/link';
import { CheckCircle, MessageCircle } from 'lucide-react';

export default function DiscordConnectedPage() {
  const discordUrl =
    typeof process.env.NEXT_PUBLIC_DISCORD_INVITE_URL !== 'undefined'
      ? process.env.NEXT_PUBLIC_DISCORD_INVITE_URL
      : 'https://discord.com/invite/afina';

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-12 relative overflow-hidden">
      <div className="fixed inset-0 z-0 bg-[#0f0f17]">
        <div className="absolute inset-0 bg-gradient-to-br from-[#0f0f17] via-[#151521] to-[#0f0f17]" />
        <div className="absolute top-1/4 right-0 w-[500px] h-[500px] bg-indigo-600/10 rounded-full blur-[120px]" />
      </div>

      <div className="relative z-10 max-w-lg w-full text-center space-y-8">
        <div className="flex justify-center">
          <div className="w-24 h-24 rounded-full bg-indigo-500/20 flex items-center justify-center ring-4 ring-indigo-500/30">
            <CheckCircle className="w-12 h-12 text-indigo-400" />
          </div>
        </div>

        <div className="space-y-2">
          <h1 className="text-3xl md:text-4xl font-bold text-white">
            Discord подключён
          </h1>
          <p className="text-gray-400 text-lg">
            Ваш аккаунт Discord успешно привязан к подписке
          </p>
        </div>

        <div className="rounded-2xl bg-white/5 border border-white/10 p-6 text-left space-y-4">
          <p className="text-gray-300 text-sm">
            Можете закрыть эту вкладку и вернуться в Telegram бот — там обновится статус подключения.
          </p>
          <p className="text-gray-400 text-sm flex items-center gap-2">
            <MessageCircle className="w-5 h-5 text-indigo-400 shrink-0" />
            Если ещё не в сервере — перейдите по ссылке ниже.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
          <a
            href={discordUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-indigo-500/20 text-indigo-300 hover:bg-indigo-500/30 transition-all"
          >
            <MessageCircle className="w-5 h-5" />
            Открыть Discord сервер
          </a>
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-white/5 text-gray-300 hover:bg-white/10 transition-all"
          >
            На главную
          </Link>
        </div>
      </div>
    </div>
  );
}
