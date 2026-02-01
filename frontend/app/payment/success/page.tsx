'use client';

import React, { Suspense } from 'react';
import Link from 'next/link';
import { CheckCircle, MessageCircle, BookOpen, ArrowRight, Loader2 } from 'lucide-react';

function SuccessContent() {
  const discordUrl =
    typeof process.env.NEXT_PUBLIC_DISCORD_INVITE_URL !== 'undefined'
      ? process.env.NEXT_PUBLIC_DISCORD_INVITE_URL
      : 'https://discord.com/invite/afina';

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-12 relative overflow-hidden">
      {/* Background */}
      <div className="fixed inset-0 z-0 bg-[#0f0f17]">
        <div className="absolute inset-0 bg-gradient-to-br from-[#0f0f17] via-[#151521] to-[#0f0f17]" />
        <div className="absolute top-1/4 right-0 w-[500px] h-[500px] bg-emerald-600/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-1/4 left-0 w-[400px] h-[400px] bg-indigo-600/10 rounded-full blur-[100px]" />
      </div>

      <div className="relative z-10 max-w-lg w-full text-center space-y-8">
        {/* Icon */}
        <div className="flex justify-center">
          <div className="w-24 h-24 rounded-full bg-emerald-500/20 flex items-center justify-center ring-4 ring-emerald-500/30">
            <CheckCircle className="w-12 h-12 text-emerald-400" />
          </div>
        </div>

        {/* Title */}
        <div className="space-y-2">
          <h1 className="text-3xl md:text-4xl font-bold text-white">
            Оплата прошла успешно
          </h1>
          <p className="text-gray-400 text-lg">
            Спасибо за покупку подписки Afina DAO
          </p>
        </div>

        {/* Info block */}
        <div className="rounded-2xl bg-white/5 border border-white/10 p-6 text-left space-y-4">
          <p className="text-gray-300 text-sm">
            Мы отправили уведомление в ваш Telegram. Дальнейшие шаги:
          </p>
          <ul className="space-y-3 text-gray-400 text-sm">
            <li className="flex items-center gap-3">
              <MessageCircle className="w-5 h-5 text-indigo-400 shrink-0" />
              <span>Роль в Discord сервере выдана автоматически</span>
            </li>
            <li className="flex items-center gap-3">
              <BookOpen className="w-5 h-5 text-indigo-400 shrink-0" />
              <span>Приглашение в Notion придёт на указанный email</span>
            </li>
          </ul>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
          <a
            href={discordUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-indigo-500 text-white font-medium hover:bg-indigo-600 transition-colors"
          >
            <MessageCircle className="w-5 h-5" />
            Перейти в Discord
            <ArrowRight className="w-4 h-4" />
          </a>
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-white/10 text-white font-medium hover:bg-white/20 transition-colors border border-white/10"
          >
            На главную
          </Link>
        </div>

        <p className="text-gray-500 text-sm pt-4">
          Если возникли вопросы — напишите в поддержку в Telegram боте
        </p>
      </div>
    </div>
  );
}

export default function PaymentSuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-[#0f0f17]">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-400" />
        </div>
      }
    >
      <SuccessContent />
    </Suspense>
  );
}
