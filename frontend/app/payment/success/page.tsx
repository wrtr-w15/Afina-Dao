'use client';

import React, { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { CheckCircle, MessageCircle, BookOpen, ArrowRight, Loader2, AlertCircle, RefreshCw } from 'lucide-react';

function SuccessContent() {
  const searchParams = useSearchParams();
  const npId = searchParams.get('NP_id');
  const subscriptionId = searchParams.get('subscription');
  
  const [confirmStatus, setConfirmStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [confirmMessage, setConfirmMessage] = useState('');

  const discordUrl =
    typeof process.env.NEXT_PUBLIC_DISCORD_INVITE_URL !== 'undefined'
      ? process.env.NEXT_PUBLIC_DISCORD_INVITE_URL
      : 'https://discord.com/invite/afina';

  // Автоматически подтверждаем оплату, если есть NP_id
  useEffect(() => {
    if (npId && confirmStatus === 'idle') {
      confirmPayment(npId);
    }
  }, [npId, confirmStatus]);

  async function confirmPayment(paymentId: string) {
    setConfirmStatus('loading');
    setConfirmMessage('Подтверждаем оплату...');
    try {
      const res = await fetch('/api/nowpayments/confirm-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ payment_id: paymentId }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setConfirmStatus('success');
        setConfirmMessage('Подписка активирована!');
      } else if (data.error === 'Payment not finished') {
        setConfirmStatus('error');
        setConfirmMessage('Платёж ещё не завершён в NOWPayments. Подождите несколько минут и обновите страницу.');
      } else if (data.error === 'Payment not found in DB') {
        setConfirmStatus('error');
        setConfirmMessage('Платёж не найден. Обратитесь в поддержку.');
      } else {
        setConfirmStatus('error');
        setConfirmMessage(data.error || 'Не удалось подтвердить оплату.');
      }
    } catch (e: any) {
      setConfirmStatus('error');
      setConfirmMessage('Ошибка сети. Попробуйте обновить страницу.');
    }
  }

  function handleRetry() {
    if (npId) {
      setConfirmStatus('idle');
    }
  }

  // Если идёт подтверждение
  if (confirmStatus === 'loading') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4 py-12 relative overflow-hidden">
        <div className="fixed inset-0 z-0 bg-[#0f0f17]">
          <div className="absolute inset-0 bg-gradient-to-br from-[#0f0f17] via-[#151521] to-[#0f0f17]" />
        </div>
        <div className="relative z-10 text-center space-y-4">
          <Loader2 className="w-12 h-12 animate-spin text-indigo-400 mx-auto" />
          <p className="text-gray-300 text-lg">{confirmMessage}</p>
        </div>
      </div>
    );
  }

  // Если ошибка подтверждения
  if (confirmStatus === 'error') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4 py-12 relative overflow-hidden">
        <div className="fixed inset-0 z-0 bg-[#0f0f17]">
          <div className="absolute inset-0 bg-gradient-to-br from-[#0f0f17] via-[#151521] to-[#0f0f17]" />
        </div>
        <div className="relative z-10 max-w-lg w-full text-center space-y-6">
          <div className="flex justify-center">
            <div className="w-20 h-20 rounded-full bg-amber-500/20 flex items-center justify-center ring-4 ring-amber-500/30">
              <AlertCircle className="w-10 h-10 text-amber-400" />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-white">Подтверждение оплаты</h1>
          <p className="text-gray-400">{confirmMessage}</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
            <button
              onClick={handleRetry}
              className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-indigo-500 text-white font-medium hover:bg-indigo-600 transition-colors"
            >
              <RefreshCw className="w-5 h-5" />
              Повторить
            </button>
            <Link
              href="/"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-white/10 text-white font-medium hover:bg-white/20 transition-colors border border-white/10"
            >
              На главную
            </Link>
          </div>
          <p className="text-gray-500 text-sm">
            NP_id: {npId}
          </p>
        </div>
      </div>
    );
  }

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
