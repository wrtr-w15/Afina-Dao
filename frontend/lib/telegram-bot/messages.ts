// Тексты сообщений для Telegram бота (из БД с подстановкой, fallback — дефолты)

import { getBotText } from './get-text';

// Дефолтные тексты (если в БД пусто)
const defaults: Record<string, string> = {
  welcome: `🎉 <b>Добро пожаловать в Afina DAO!</b>{{subscriptionInfo}}

Мы — приватное сообщество трейдеров и разработчиков. Подписка открывает доступ к:

✨ Все скрипты без ограничений
💬 Приватный Discord сервер
📚 База знаний в Notion
🛠 Техподдержка 24/7

Выберите действие:`,
  connectDiscord: `🎮 <b>Подключите ваш Discord</b>

Для получения роли в нашем Discord сервере, подключите ваш аккаунт.

Нажмите кнопку ниже — откроется страница авторизации Discord.

⚠️ Мы получаем только ваш <b>ID</b> и <b>имя пользователя</b>.`,
  askEmail: `📧 <b>Введите ваш Email</b>

Email нужен для приглашения в Notion с гайдами.

Пример: <code>user@example.com</code>`,
  invalidEmail: `❌ <b>Неверный формат Email</b>

Пожалуйста, введите корректный email адрес:`,
  askGoogleDriveEmail: `📁 <b>Введите ваш Google Drive Email</b>

Email нужен для предоставления доступа к Google Drive.

Пример: <code>user@example.com</code>`,
  invalidGoogleDriveEmail: `❌ <b>Неверный формат Email</b>

Пожалуйста, введите корректный Google Drive email адрес:`,
  confirmDisconnectGoogleDrive: `⚠️ <b>Отключить Google Drive Email?</b>

Доступ к Google Drive будет отозван.`,
  googleDriveDisconnected: `✅ <b>Google Drive Email отключён</b>

Доступ к Google Drive был отозван.`,
  confirmOrder: `📝 <b>Подтверждение заказа</b>

🎯 Тариф: <b>{{planName}}</b>
📅 Период: <b>{{period}} мес.</b>
💰 Сумма: <b>{{priceUsdt}} USDT</b>

🎮 Discord: {{discordLine}}
📧 Email: {{emailLine}}

Всё верно?`,
  awaitingPayment: `💳 <b>Оплата</b>

Сумма к оплате: <b>{{priceUsdt}} USDT</b>

{{paymentInfo}}

⚠️ После оплаты нажмите «Проверить статус» или дождитесь автоматического уведомления.`,
  paymentSuccess: `✅ <b>Оплата прошла успешно!</b>

🎉 Ваша подписка активирована!

Что дальше:
• Роль в Discord выдана автоматически
• Приглашение в Notion отправлено на вашу почту

Если возникнут вопросы — пишите в поддержку.`,
  paymentFailed: `❌ <b>Ошибка оплаты</b>

Что-то пошло не так. Попробуйте ещё раз или обратитесь в поддержку.`,
  subscriptionStatus_active: `📊 <b>Статус подписки</b>

✅ Подписка активна
📅 Действует до: <b>{{endDate}}</b>
⏳ Осталось: <b>{{daysLeft}} дн.</b>`,
  subscriptionStatus_inactive: `📊 <b>Статус подписки</b>

❌ У вас нет активной подписки.

Нажмите "Купить подписку" чтобы получить доступ.`,
  help: `ℹ️ <b>Справка по боту</b>

<b>Команды:</b>
/start — Главное меню
/account — Личный кабинет
/status — Статус подписки
/help — Эта справка

<b>Что вы получаете:</b>
• Доступ ко всем скриптам Afina DAO
• Приватный Discord сервер с поддержкой
• База знаний в Notion с гайдами

<b>Поддержка:</b>
Если у вас возникли вопросы, напишите {{supportText}}`,
  account: `👤 <b>Личный кабинет</b>

📊 <b>Подписка:</b> {{subscriptionStatus}}

🎮 <b>Discord:</b> {{discordStatus}}
📧 <b>Email (Notion):</b> {{emailStatus}}
📁 <b>Google Drive:</b> {{googleDriveStatus}}

Управляйте своими данными:`,
  cancelled: `❌ Действие отменено.

Используйте /start для главного меню.`,
  error: `❌ <b>Произошла ошибка</b>

Пожалуйста, попробуйте позже или обратитесь в поддержку @afina_support`,
  discordDisconnected: `✅ <b>Discord отключён</b>

Ваш Discord аккаунт отвязан от профиля.
Роль в Discord сервере снята.`,
  emailDisconnected: `✅ <b>Email отключён</b>

Ваш Email отвязан от профиля.
Доступ к Notion отозван.`,
  socials: `🌐 <b>Наши социальные сети</b>

Подписывайтесь, чтобы быть в курсе новостей:`,
  selectPlan_header: `💰 <b>Тариф «{{tariffName}}»</b>\n\n`,
  selectPlan_footer: `\n\nВыберите период:`,
  askPromocode: `🎫 <b>Введите промокод</b>

Введите код промокода для получения скидки на подписку.

Или отправьте "отмена" для отмены.`
};

async function text(key: string, params?: Record<string, string>): Promise<string> {
  try {
    const fromDb = await getBotText(key, params);
    console.log(`[Telegram Bot] text() function - key: "${key}", fromDb:`, fromDb ? `"${fromDb.substring(0, 100)}..." (length: ${fromDb.length}, trimmed: ${fromDb.trim().length})` : 'null/empty');
    if (fromDb && fromDb.trim()) {
      console.log(`[Telegram Bot] Text "${key}" loaded from DB successfully`);
      return fromDb;
    }
    const def = defaults[key];
    console.log(`[Telegram Bot] Text "${key}" not found in DB, checking defaults:`, def ? `"${def.substring(0, 100)}..." (length: ${def.length})` : 'not found');
    if (def) {
      const result = replaceParams(def, params);
      console.log(`[Telegram Bot] Text "${key}" using default:`, result ? `"${result.substring(0, 100)}..." (length: ${result.length})` : 'empty');
      return result;
    }
    console.warn(`[Telegram Bot] Text "${key}" not found in DB or defaults`);
    return '';
  } catch (error) {
    console.error(`[Telegram Bot] Error loading text "${key}":`, error);
    const def = defaults[key];
    if (def) {
      const result = replaceParams(def, params);
      console.log(`[Telegram Bot] Using default text for "${key}" due to error:`, result ? `"${result.substring(0, 100)}..."` : 'empty');
      return result;
    }
    return '';
  }
}

function replaceParams(s: string, params?: Record<string, string>): string {
  if (!params) return s;
  let out = s;
  for (const [k, v] of Object.entries(params)) {
    out = out.replace(new RegExp(`\\{\\{${k}\\}\\}`, 'g'), v ?? '');
  }
  return out;
}

export const messages = {
  welcome: async (hasSubscription: boolean, endDate?: string): Promise<string> => {
    const subscriptionInfo = hasSubscription && endDate
      ? `\n\n✅ <b>У вас есть подписка до ${endDate}</b>`
      : '';
    return text('welcome', { subscriptionInfo });
  },

  selectPlan: async (plans: { tariffName?: string; name: string; period: number; priceUsdt: number; monthlyPriceUsdt?: number; isPopular?: boolean }[]): Promise<string> => {
    const tariffName = plans[0]?.tariffName ?? '';
    const header = await text('selectPlan_header', { tariffName }) || `💰 <b>Тариф${tariffName ? ` «${tariffName}»` : ''}</b>\n\n`;
    const footer = await text('selectPlan_footer') || '\n\nВыберите период:';
    let body = '';
    for (const plan of plans) {
      const star = plan.isPopular ? '⭐ ' : '';
      const perMonth = plan.period > 1 && plan.monthlyPriceUsdt != null
        ? ` (${plan.monthlyPriceUsdt.toFixed(0)} USDT/мес.)`
        : '';
      body += `${star}<b>${plan.name}</b> — <b>${plan.priceUsdt.toFixed(0)} USDT</b>${perMonth}\n`;
    }
    return header + body + footer;
  },

  connectDiscord: (): Promise<string> => text('connectDiscord'),
  askEmail: (): Promise<string> => text('askEmail'),
  invalidEmail: (): Promise<string> => text('invalidEmail'),

  confirmOrder: async (data: { planName: string; period: number; priceUsdt: number; discordUsername?: string; email?: string; promocode?: string; originalPrice?: number; discountPercent?: number; discountType?: 'percent' | 'fixed'; discountAmount?: number }): Promise<string> => {
    const discordLine = data.discordUsername ? `✅ <code>${data.discordUsername}</code>` : '❌ Не подключён';
    const emailLine = data.email ? `✅ <code>${data.email}</code>` : '❌ Не указан';
    let promocodeLine = '';
    if (data.promocode && data.originalPrice) {
      const discount = data.originalPrice - data.priceUsdt;
      const discountText = data.discountType === 'fixed' && data.discountAmount
        ? `${data.discountAmount.toFixed(2)} USDT`
        : `${data.discountPercent || 0}%`;
      promocodeLine = `\n\n🎫 <b>Промокод:</b> ${data.promocode}\n` +
        `💰 <b>Скидка:</b> ${discountText}\n` +
        `💵 <b>Было:</b> ${data.originalPrice.toFixed(2)} USDT\n` +
        `💵 <b>Стало:</b> ${data.priceUsdt.toFixed(2)} USDT`;
    }
    const baseText = await text('confirmOrder', {
      planName: data.planName,
      period: String(data.period),
      priceUsdt: String(data.priceUsdt),
      discordLine,
      emailLine
    });
    return baseText + promocodeLine;
  },

  awaitingPayment: async (priceUsdt: number, paymentUrl?: string): Promise<string> => {
    const paymentInfo = paymentUrl 
      ? `Нажмите кнопку ниже, чтобы перейти на страницу оплаты.\nМожно оплатить USDT на сети Arbitrum.`
      : `⚠️ Ошибка создания платежа. Попробуйте позже.`;
    return await text('awaitingPayment', { priceUsdt: String(priceUsdt), paymentInfo });
  },
  paymentSuccess: (): Promise<string> => text('paymentSuccess'),
  paymentFailed: (): Promise<string> => text('paymentFailed'),

  subscriptionStatus: async (hasSubscription: boolean, endDate?: string, daysLeft?: number): Promise<string> => {
    if (hasSubscription && endDate != null && daysLeft != null) {
      return await text('subscriptionStatus_active', { endDate, daysLeft: String(daysLeft) });
    }
    return await text('subscriptionStatus_inactive');
  },

  help: async (supportText?: string): Promise<string> => {
    const defaultSupport = supportText || 'в поддержку';
    return await text('help', { supportText: defaultSupport });
  },

  account: async (data: {
    hasSubscription: boolean;
    endDate?: string;
    daysLeft?: number;
    discordConnected: boolean;
    discordUsername?: string;
    emailConnected: boolean;
    email?: string;
    googleDriveConnected?: boolean;
    googleDriveEmail?: string;
  }): Promise<string> => {
    const subscriptionStatus = data.hasSubscription && data.endDate != null && data.daysLeft != null
      ? `✅ Активна до <b>${data.endDate}</b> (${data.daysLeft} дн.)`
      : '❌ Нет активной подписки';
    const discordStatus = data.discordConnected && data.discordUsername
      ? `✅ <code>${data.discordUsername}</code>`
      : '❌ Не подключён';
    const emailStatus = data.emailConnected && data.email
      ? `✅ <code>${data.email}</code>`
      : '❌ Не указан';
    const googleDriveStatus = data.googleDriveConnected && data.googleDriveEmail
      ? `✅ <code>${data.googleDriveEmail}</code>`
      : '❌ Не указан';
    return await text('account', { subscriptionStatus, discordStatus, emailStatus, googleDriveStatus });
  },

  cancelled: (): Promise<string> => text('cancelled'),
  error: (): Promise<string> => text('error'),
  discordDisconnected: (): Promise<string> => text('discordDisconnected'),
  emailDisconnected: (): Promise<string> => text('emailDisconnected'),
  socials: (): Promise<string> => text('socials'),
  
  paymentHistory: async (paymentList: string, paginationInfo: string): Promise<string> => {
    return await text('paymentHistory', { paymentList, paginationInfo });
  },
  
  paymentHistoryEmpty: (): Promise<string> => text('paymentHistory_empty'),
  
  askPromocode: (): Promise<string> => text('askPromocode'),
  
  askGoogleDriveEmail: (): Promise<string> => text('askGoogleDriveEmail'),
  invalidGoogleDriveEmail: (): Promise<string> => text('invalidGoogleDriveEmail'),
  confirmDisconnectGoogleDrive: (): Promise<string> => text('confirmDisconnectGoogleDrive'),
  googleDriveDisconnected: (): Promise<string> => text('googleDriveDisconnected')
};
