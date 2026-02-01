// NOWPayments API клиент
// Документация: https://documenter.getpostman.com/view/7907941/2s93JusNJt

const NOWPAYMENTS_API_URL = 'https://api.nowpayments.io/v1';

export interface CreateInvoiceParams {
  price_amount: number;
  price_currency: string;
  pay_currency?: string;
  ipn_callback_url?: string;
  order_id?: string;
  order_description?: string;
  success_url?: string;
  cancel_url?: string;
}

export interface InvoiceResponse {
  id: string;
  token_id: string;
  order_id: string;
  order_description: string;
  price_amount: number;
  price_currency: string;
  pay_currency: string | null;
  ipn_callback_url: string;
  invoice_url: string;
  success_url: string;
  cancel_url: string;
  created_at: string;
  updated_at: string;
}

export interface PaymentStatus {
  payment_id: number;
  invoice_id: number;
  payment_status: string;
  pay_address: string;
  payin_extra_id: string | null;
  price_amount: number;
  price_currency: string;
  pay_amount: number;
  actually_paid: number;
  pay_currency: string;
  order_id: string;
  order_description: string;
  purchase_id: number;
  outcome_amount: number;
  outcome_currency: string;
  payout_hash: string | null;
  payin_hash: string | null;
  created_at: string;
  updated_at: string;
  type: string;
}

export interface IPNPayload {
  payment_id: number;
  invoice_id: number;
  payment_status: string;
  pay_address: string;
  payin_extra_id: string | null;
  price_amount: number;
  price_currency: string;
  pay_amount: number;
  actually_paid: number;
  pay_currency: string;
  order_id: string;
  order_description: string;
  purchase_id: string;
  outcome_amount: number;
  outcome_currency: string;
  fee?: {
    currency: string;
    depositFee: number;
    serviceFee: number;
    withdrawalFee: number;
  };
}

class NOWPaymentsAPI {
  private apiKey: string;
  private ipnSecret: string;

  constructor() {
    this.apiKey = process.env.NOWPAYMENTS_API_KEY || '';
    this.ipnSecret = process.env.NOWPAYMENTS_IPN_SECRET || '';
  }

  private async request<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const response = await fetch(`${NOWPAYMENTS_API_URL}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
        ...options?.headers,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      console.error(`NOWPayments API error [${endpoint}]:`, error);
      throw new Error(`NOWPayments API error: ${response.status} ${error}`);
    }

    return response.json();
  }

  // Проверка статуса API
  async getStatus(): Promise<{ message: string }> {
    return this.request('/status');
  }

  // Получение списка доступных валют
  async getCurrencies(): Promise<{ currencies: string[] }> {
    return this.request('/currencies');
  }

  // Получение минимальной суммы платежа
  async getMinimumPaymentAmount(currencyFrom: string, currencyTo: string): Promise<{
    currency_from: string;
    currency_to: string;
    min_amount: number;
    fiat_equivalent: number;
  }> {
    return this.request(`/min-amount?currency_from=${currencyFrom}&currency_to=${currencyTo}`);
  }

  // Получение оценки цены
  async getEstimatePrice(amount: number, currencyFrom: string, currencyTo: string): Promise<{
    currency_from: string;
    currency_to: string;
    amount_from: number;
    estimated_amount: number;
  }> {
    return this.request(`/estimate?amount=${amount}&currency_from=${currencyFrom}&currency_to=${currencyTo}`);
  }

  // Создание инвойса (счёта)
  async createInvoice(params: CreateInvoiceParams): Promise<InvoiceResponse> {
    return this.request('/invoice', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  }

  // Создание платежа напрямую
  async createPayment(params: {
    price_amount: number;
    price_currency: string;
    pay_currency: string;
    ipn_callback_url?: string;
    order_id?: string;
    order_description?: string;
    payout_address?: string;
    payout_currency?: string;
    fixed_rate?: boolean;
  }): Promise<{
    payment_id: string;
    payment_status: string;
    pay_address: string;
    price_amount: number;
    price_currency: string;
    pay_amount: number;
    pay_currency: string;
    order_id: string;
    order_description: string;
    purchase_id: string;
    created_at: string;
    updated_at: string;
  }> {
    return this.request('/payment', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  }

  // Получение статуса платежа
  async getPaymentStatus(paymentId: string): Promise<PaymentStatus> {
    return this.request(`/payment/${paymentId}`);
  }

  // Получение списка платежей
  async getPayments(params?: {
    limit?: number;
    page?: number;
    sortBy?: string;
    orderBy?: 'asc' | 'desc';
    dateFrom?: string;
    dateTo?: string;
  }): Promise<{ data: PaymentStatus[]; total: number; limit: number; page: number }> {
    const queryParams = new URLSearchParams();
    if (params?.limit) queryParams.set('limit', params.limit.toString());
    if (params?.page) queryParams.set('page', params.page.toString());
    if (params?.sortBy) queryParams.set('sortBy', params.sortBy);
    if (params?.orderBy) queryParams.set('orderBy', params.orderBy);
    if (params?.dateFrom) queryParams.set('dateFrom', params.dateFrom);
    if (params?.dateTo) queryParams.set('dateTo', params.dateTo);

    const query = queryParams.toString();
    return this.request(`/payment${query ? `?${query}` : ''}`);
  }

  // Проверка подписи IPN (Instant Payment Notification)
  verifyIPNSignature(payload: string, signature: string): boolean {
    const crypto = require('crypto');
    
    // NOWPayments использует HMAC-SHA512 для подписи
    const hmac = crypto.createHmac('sha512', this.ipnSecret);
    hmac.update(payload);
    const calculatedSignature = hmac.digest('hex');

    return calculatedSignature === signature;
  }

  // Создание подписи для IPN (для отладки)
  createIPNSignature(payload: object): string {
    const crypto = require('crypto');
    
    // Сортируем ключи объекта и создаём строку
    const sortedPayload = this.sortObject(payload);
    const payloadString = JSON.stringify(sortedPayload);
    
    const hmac = crypto.createHmac('sha512', this.ipnSecret);
    hmac.update(payloadString);
    return hmac.digest('hex');
  }

  // Сортировка объекта по ключам (рекурсивно)
  private sortObject(obj: any): any {
    if (typeof obj !== 'object' || obj === null) {
      return obj;
    }

    if (Array.isArray(obj)) {
      return obj.map(item => this.sortObject(item));
    }

    return Object.keys(obj)
      .sort()
      .reduce((result: any, key) => {
        result[key] = this.sortObject(obj[key]);
        return result;
      }, {});
  }
}

// Экспортируем синглтон
export const nowPayments = new NOWPaymentsAPI();

// Типы статусов платежа NOWPayments
export const PaymentStatuses = {
  WAITING: 'waiting',          // Ожидание оплаты
  CONFIRMING: 'confirming',    // Транзакция на подтверждении
  CONFIRMED: 'confirmed',      // Подтверждена, ожидание обработки
  SENDING: 'sending',          // Отправка средств
  PARTIALLY_PAID: 'partially_paid', // Частично оплачено
  FINISHED: 'finished',        // Успешно завершено
  FAILED: 'failed',            // Ошибка
  REFUNDED: 'refunded',        // Возврат
  EXPIRED: 'expired',          // Истекло время
} as const;

export type PaymentStatusType = typeof PaymentStatuses[keyof typeof PaymentStatuses];
