'use client';

import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Loader2, CheckCircle, Clock, XCircle, ArrowLeft, Receipt } from 'lucide-react';

interface Payment {
  id: string;
  amount: number;
  currency: string;
  status: string;
  createdAt: string;
  paidAt: string | null;
  subscription: {
    periodMonths: number;
    status: string;
    endDate: string | null;
  };
  promocode: {
    code: string;
    discountType: string;
    discountAmount: number;
  } | null;
}

export default function PaymentHistoryPage() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setError('Токен доступа отсутствует');
      setLoading(false);
      return;
    }

    fetch(`/api/user/payments?token=${token}`)
      .then(async (res) => {
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || 'Ошибка загрузки');
        }
        return res.json();
      })
      .then((data) => {
        setPayments(data.payments || []);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Error loading payments:', err);
        setError(err.message || 'Не удалось загрузить историю платежей');
        setLoading(false);
      });
  }, [token]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-emerald-400" />;
      case 'pending':
        return <Clock className="w-5 h-5 text-amber-400" />;
      default:
        return <XCircle className="w-5 h-5 text-red-400" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed':
        return 'Оплачено';
      case 'pending':
        return 'Ожидание';
      case 'failed':
        return 'Ошибка';
      default:
        return status;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ru-RU', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="min-h-screen bg-[#0f0f17] text-white">
      {/* Background */}
      <div className="fixed inset-0 z-0">
        <div className="absolute inset-0 bg-gradient-to-br from-[#0f0f17] via-[#151521] to-[#0f0f17]" />
        <div className="absolute top-1/4 right-0 w-[500px] h-[500px] bg-indigo-600/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-1/4 left-0 w-[400px] h-[400px] bg-purple-600/10 rounded-full blur-[100px]" />
      </div>

      <div className="relative z-10 max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-gray-400 hover:text-white mb-4 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            На главную
          </Link>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
              <Receipt className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">История платежей</h1>
              <p className="text-gray-400 text-sm">Все ваши транзакции в одном месте</p>
            </div>
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-400" />
          </div>
        ) : error ? (
          <div className="rounded-2xl bg-red-500/10 border border-red-500/20 p-6 text-center">
            <XCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-white mb-2">Ошибка</h2>
            <p className="text-gray-400">{error}</p>
            <p className="text-gray-500 text-sm mt-4">
              Откройте эту страницу через кнопку в Telegram боте
            </p>
          </div>
        ) : payments.length === 0 ? (
          <div className="rounded-2xl bg-white/5 border border-white/10 p-8 text-center">
            <Receipt className="w-16 h-16 text-gray-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-white mb-2">Платежей пока нет</h2>
            <p className="text-gray-400 mb-6">
              Когда вы совершите первую покупку, она появится здесь
            </p>
            <Link
              href="/pricing"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-indigo-500 text-white font-medium hover:bg-indigo-600 transition-colors"
            >
              Посмотреть тарифы
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {payments.map((payment) => (
              <div
                key={payment.id}
                className="rounded-2xl bg-white/5 border border-white/10 p-6 hover:bg-white/10 transition-colors"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    {getStatusIcon(payment.status)}
                    <div>
                      <div className="font-semibold text-white">
                        {payment.amount} {payment.currency.toUpperCase()}
                      </div>
                      <div className="text-sm text-gray-400">
                        {formatDate(payment.createdAt)}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`px-3 py-1 rounded-lg text-sm font-medium ${
                      payment.status === 'completed'
                        ? 'bg-emerald-500/20 text-emerald-400'
                        : payment.status === 'pending'
                        ? 'bg-amber-500/20 text-amber-400'
                        : 'bg-red-500/20 text-red-400'
                    }`}>
                      {getStatusText(payment.status)}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-white/10">
                  <div>
                    <div className="text-xs text-gray-500 mb-1">Подписка</div>
                    <div className="text-sm text-gray-300">
                      {payment.subscription.periodMonths} {payment.subscription.periodMonths === 1 ? 'месяц' : payment.subscription.periodMonths < 5 ? 'месяца' : 'месяцев'}
                    </div>
                    {payment.subscription.endDate && (
                      <div className="text-xs text-gray-500 mt-1">
                        До {new Date(payment.subscription.endDate).toLocaleDateString('ru-RU')}
                      </div>
                    )}
                  </div>
                  {payment.promocode && (
                    <div>
                      <div className="text-xs text-gray-500 mb-1">Промокод</div>
                      <div className="text-sm text-gray-300">
                        {payment.promocode.code}
                        {payment.promocode.discountType === 'percent' ? (
                          <span className="text-emerald-400 ml-2">
                            -{payment.promocode.discountAmount}%
                          </span>
                        ) : (
                          <span className="text-emerald-400 ml-2">
                            -{payment.promocode.discountAmount} {payment.currency.toUpperCase()}
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {payment.paidAt && (
                  <div className="text-xs text-gray-500 mt-4 pt-4 border-t border-white/10">
                    Оплачено: {formatDate(payment.paidAt)}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
