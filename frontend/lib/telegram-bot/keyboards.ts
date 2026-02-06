// Inline клавиатуры для Telegram бота

export interface InlineButton {
  text: string;
  callback_data?: string;
  url?: string;
}

export interface InlineKeyboard {
  inline_keyboard: InlineButton[][];
}

const BUY_SUBSCRIPTION_LABEL_WITH_SUB = '🔄 Продлить подписку';
const BUY_SUBSCRIPTION_LABEL_WITHOUT_SUB = '🛒 Купить подписку';

// Подставить подпись «Продлить»/«Купить» для кнопки buy_subscription в клавиатуре из БД
export function applySubscriptionLabelToWelcomeKeyboard(
  keyboard: InlineKeyboard | null,
  hasSubscription: boolean
): InlineKeyboard | null {
  if (!keyboard?.inline_keyboard?.length) return keyboard;
  const label = hasSubscription ? BUY_SUBSCRIPTION_LABEL_WITH_SUB : BUY_SUBSCRIPTION_LABEL_WITHOUT_SUB;
  const rows = keyboard.inline_keyboard.map((row) =>
    row.map((btn) =>
      btn.callback_data === 'buy_subscription' ? { ...btn, text: label } : btn
    )
  );
  return { inline_keyboard: rows };
}

// Главное меню при /start
export function getMainMenuKeyboard(hasSubscription: boolean): InlineKeyboard {
  const buttons: InlineButton[][] = [];
  
  buttons.push([{
    text: hasSubscription ? BUY_SUBSCRIPTION_LABEL_WITH_SUB : BUY_SUBSCRIPTION_LABEL_WITHOUT_SUB,
    callback_data: 'buy_subscription'
  }]);
  
  buttons.push([{ text: '👤 Личный кабинет', callback_data: 'account' }]);
  buttons.push([{ text: '📜 История платежей', callback_data: 'payment_history' }]);
  buttons.push([{ text: '🌐 Наши соцсети', callback_data: 'socials' }]);
  
  return { inline_keyboard: buttons };
}

// Клавиатура выбора тарифа - цены в USDT
export function getPlanKeyboard(plans: { id: string; name: string; priceUsdt: number; isPopular?: boolean }[]): InlineKeyboard {
  const buttons: InlineButton[][] = plans.map(plan => {
    const star = plan.isPopular ? '⭐ ' : '';
    return [{
      text: `${star}${plan.name} — ${plan.priceUsdt} USDT`,
      callback_data: `select_plan:${plan.id}`
    }];
  });

  buttons.push([{ text: '◀️ Назад', callback_data: 'back_to_main' }]);

  return { inline_keyboard: buttons };
}

// Клавиатура подтверждения заказа (отдельно Notion и Google Drive)
export function getConfirmKeyboard(
  needsDiscord: boolean,
  needsNotionEmail: boolean,
  needsGoogleDriveEmail: boolean,
  discordOAuthUrl?: string,
  hasPromocode?: boolean
): InlineKeyboard {
  const buttons: InlineButton[][] = [];

  if (needsDiscord && discordOAuthUrl) {
    buttons.push([{ text: '🎮 Подключить Discord', url: discordOAuthUrl }]);
  }

  if (needsNotionEmail) {
    buttons.push([{ text: '📧 Email (Notion)', callback_data: 'enter_email' }]);
  }

  if (needsGoogleDriveEmail) {
    buttons.push([{ text: '📁 Email (Google Drive)', callback_data: 'enter_google_drive_email' }]);
  }

  buttons.push([{ text: hasPromocode ? '🎫 Изменить промокод' : '🎫 Ввести промокод', callback_data: 'enter_promocode' }]);

  const allFilled = !needsDiscord && !needsNotionEmail && !needsGoogleDriveEmail;
  if (allFilled) {
    buttons.push([{ text: '✅ Подтвердить и оплатить', callback_data: 'confirm_order' }]);
    buttons.push([{ text: '🔄 Обновить данные подключений', callback_data: 'refresh_access' }]);
  }

  buttons.push([{ text: '◀️ Назад', callback_data: 'buy_subscription' }]);

  return { inline_keyboard: buttons };
}

// Клавиатура оплаты
export function getPaymentKeyboard(paymentUrl?: string): InlineKeyboard {
  const buttons: InlineButton[][] = [];
  
  if (paymentUrl) {
    // Кнопка-ссылка на страницу оплаты NOWPayments
    buttons.push([{ text: '💳 Перейти к оплате', url: paymentUrl }]);
    buttons.push([{ text: '🔄 Проверить статус', callback_data: 'check_payment_status' }]);
  } else {
    // Fallback для тестирования
    buttons.push([{ text: '💳 Оплатить (тест)', callback_data: 'process_payment' }]);
  }
  
  buttons.push([{ text: '❌ Отмена', callback_data: 'cancel_order' }]);
  
  return { inline_keyboard: buttons };
}

// Клавиатура после успешной оплаты
export function getSuccessKeyboard(discordInvite?: string): InlineKeyboard {
  const buttons: InlineButton[][] = [];

  buttons.push([{ text: '📖 Как начать работу в Сообществе', callback_data: 'how_to_start_community' }]);

  if (discordInvite) {
    buttons.push([{ text: '🎮 Перейти в Discord', url: discordInvite }]);
  }

  buttons.push([{ text: '👤 Личный кабинет', callback_data: 'account' }]);
  buttons.push([{ text: '🏠 Главное меню', callback_data: 'back_to_main' }]);

  return { inline_keyboard: buttons };
}

// Клавиатура личного кабинета
export function getAccountKeyboard(options: {
  hasSubscription: boolean;
  discordConnected: boolean;
  emailConnected: boolean;
  googleDriveConnected: boolean;
  discordOAuthUrl?: string;
}): InlineKeyboard {
  const buttons: InlineButton[][] = [];
  
  if (options.hasSubscription) {
    buttons.push([{ text: '📊 Статус подписки', callback_data: 'check_status' }]);
  }
  
  // История платежей - будет открываться в браузере
  buttons.push([{ text: '📜 История платежей', callback_data: 'payment_history' }]);
  
  // Discord
  if (options.discordConnected) {
    buttons.push([
      { text: '🎮 Переподключить Discord', callback_data: 'reconnect_discord' },
      { text: '🔌 Отключить', callback_data: 'disconnect_discord' }
    ]);
  } else if (options.discordOAuthUrl) {
    buttons.push([{ text: '🎮 Подключить Discord', url: options.discordOAuthUrl }]);
  }
  
  // Email (Notion)
  if (options.emailConnected) {
    buttons.push([
      { text: '🔄 Email (Notion)', callback_data: 'change_email' },
      { text: '🔌 Отключить', callback_data: 'disconnect_email' }
    ]);
  } else {
    buttons.push([{ text: '🔄 Email (Notion)', callback_data: 'change_email' }]);
  }
  
  // Email (Google Drive)
  if (options.googleDriveConnected) {
    buttons.push([
      { text: '🔄 Email (Google Drive)', callback_data: 'change_google_drive_email' },
      { text: '🔌 Отключить', callback_data: 'disconnect_google_drive' }
    ]);
  } else {
    buttons.push([{ text: '🔄 Email (Google Drive)', callback_data: 'change_google_drive_email' }]);
  }

  buttons.push([{ text: '🔄 Обновить информацию', callback_data: 'refresh_account_info' }]);

  buttons.push([{ text: '🏠 Главное меню', callback_data: 'back_to_main' }]);
  
  return { inline_keyboard: buttons };
}

// Клавиатура ввода email
export function getEmailInputKeyboard(): InlineKeyboard {
  return {
    inline_keyboard: [
      [{ text: '◀️ Назад', callback_data: 'back_to_account' }]
    ]
  };
}

// Клавиатура ввода Google Drive email
export function getGoogleDriveEmailInputKeyboard(): InlineKeyboard {
  return {
    inline_keyboard: [
      [{ text: '◀️ Назад', callback_data: 'account' }]
    ]
  };
}

// Клавиатура подтверждения отключения Google Drive
export function getConfirmDisconnectGoogleDriveKeyboard(): InlineKeyboard {
  return {
    inline_keyboard: [
      [{ text: '✅ Да, отключить', callback_data: 'confirm_disconnect_google_drive' }],
      [{ text: '❌ Отмена', callback_data: 'account' }]
    ]
  };
}

// Клавиатура соцсетей
export function getSocialsKeyboard(telegramChannelUrl?: string, discordInviteUrl?: string): InlineKeyboard {
  const buttons: InlineButton[][] = [];
  
  const tgUrl = telegramChannelUrl || 'https://t.me/afina_dao';
  const discUrl = discordInviteUrl || process.env.DISCORD_INVITE_URL || 'https://discord.gg/afinadao';
  
  if (tgUrl) {
    buttons.push([{ text: '📱 Telegram канал', url: tgUrl }]);
  }
  
  if (discUrl) {
    buttons.push([{ text: '🎮 Discord сервер', url: discUrl }]);
  }
  
  buttons.push([{ text: '🏠 Главное меню', callback_data: 'back_to_main' }]);
  
  return {
    inline_keyboard: buttons
  };
}

// Подтверждение отключения Discord
export function getConfirmDisconnectDiscordKeyboard(): InlineKeyboard {
  return {
    inline_keyboard: [
      [{ text: '✅ Да, отключить', callback_data: 'confirm_disconnect_discord' }],
      [{ text: '❌ Отмена', callback_data: 'back_to_account' }]
    ]
  };
}

// Подтверждение отключения Email
export function getConfirmDisconnectEmailKeyboard(): InlineKeyboard {
  return {
    inline_keyboard: [
      [{ text: '✅ Да, отключить', callback_data: 'confirm_disconnect_email' }],
      [{ text: '❌ Отмена', callback_data: 'back_to_account' }]
    ]
  };
}

// Клавиатура отмены
export function getCancelKeyboard(): InlineKeyboard {
  return {
    inline_keyboard: [
      [{ text: '❌ Отмена', callback_data: 'cancel' }]
    ]
  };
}

// Клавиатура помощи
export function getHelpKeyboard(supportTg1?: string, supportTg2?: string): InlineKeyboard {
  const buttons: InlineButton[][] = [];
  
  console.log(`[Telegram Bot] getHelpKeyboard called with:`, { supportTg1, supportTg2 });
  
  if (supportTg1 && supportTg1.trim()) {
    const tgUrl = `https://t.me/${supportTg1.replace(/^@/, '')}`;
    buttons.push([{ text: `💬 Написать @${supportTg1}`, url: tgUrl }]);
    console.log(`[Telegram Bot] Added support button 1:`, tgUrl);
  }
  
  if (supportTg2 && supportTg2.trim()) {
    const tgUrl = `https://t.me/${supportTg2.replace(/^@/, '')}`;
    buttons.push([{ text: `💬 Написать @${supportTg2}`, url: tgUrl }]);
    console.log(`[Telegram Bot] Added support button 2:`, tgUrl);
  }
  
  // Если нет кнопок поддержки, добавляем хотя бы главное меню
  if (buttons.length === 0) {
    console.warn(`[Telegram Bot] No support buttons added, supportTg1=${supportTg1}, supportTg2=${supportTg2}`);
  }
  
  buttons.push([{ text: '🏠 Главное меню', callback_data: 'back_to_main' }]);
  
  const result = {
    inline_keyboard: buttons
  };
  
  console.log(`[Telegram Bot] getHelpKeyboard result:`, JSON.stringify(result));
  
  return result;
}

// Клавиатура назад в главное меню
export function getBackToMainKeyboard(): InlineKeyboard {
  return {
    inline_keyboard: [
      [{ text: '🏠 Главное меню', callback_data: 'back_to_main' }]
    ]
  };
}
