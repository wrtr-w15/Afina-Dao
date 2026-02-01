'use client';

import React, { Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { AlertCircle, MessageCircle } from 'lucide-react';

function DiscordErrorContent() {
  const searchParams = useSearchParams();
  const reason = searchParams.get('reason') || 'Произошла ошибка при подключении Discord.';

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-12 relative overflow-hidden">
      <div className="fixed inset-0 z-0 bg-[#0f0f17]">
        <div className="absolute inset-0 bg-gradient-to-br from-[#0f0f17] via-[#151521] to-[#0f0f17]" />
        <div className="absolute top-1/4 right-0 w-[500px] h-[500px] bg-red-600/10 rounded-full blur-[120px]" />
      </div>

      <div className="relative z-10 max-w-lg w-full text-center space-y-8">
        <div className="flex justify-center">
          <div className="w-24 h-24 rounded-full bg-red-500/20 flex items-center justify-center ring-4 ring-red-500/30">
            <AlertCircle className="w-12 h-12 text-red-400" />
          </div>
        </div>

        <div className="space-y-2">
          <h1 className="text-3xl md:text-4xl font-bold text-white">
            Не удалось подключить Discord
          </h1>
          <p className="text-gray-400 text-lg break-words">
            {reason}
          </p>
        </div>

        <div className="rounded-2xl bg-white/5 border border-white/10 p-6 text-left">
          <p className="text-gray-400 text-sm">
            Начните подключение заново из Telegram бота: нажмите «Подключить Discord» и пройдите авторизацию ещё раз.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
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

export default function DiscordErrorPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-[#0f0f17]">
        <p className="text-gray-400">Загрузка...</p>
      </div>
    }>
      <DiscordErrorContent />
    </Suspense>
  );
}
