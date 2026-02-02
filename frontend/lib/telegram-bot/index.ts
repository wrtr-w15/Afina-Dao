// Главный модуль Telegram бота

import {
  handleStart,
  handleStatus,
  handleHelp,
  handleHelpCallback,
  handleAccount,
  handleBackToMain,
  handleBuySubscription,
  handleSelectPlan,
  handleEnterEmail,
  handleEmailInput,
  handleEnterPromocode,
  handlePromocodeInput,
  handleRefreshAccess,
  handlePaymentHistory,
  handlePaymentHistoryPage,
  handleConfirmOrder,
  handleProcessPayment,
  handleCheckPaymentStatus,
  handleCancel,
  handleSocials,
  handleAccountCallback,
  handleChangeEmail,
  handleReconnectDiscord,
  handleDisconnectDiscord,
  handleConfirmDisconnectDiscord,
  handleDisconnectEmail,
  handleConfirmDisconnectEmail,
  handleEnterGoogleDriveEmail,
  handleGoogleDriveEmailInput,
  handleChangeGoogleDriveEmail,
  handleDisconnectGoogleDrive,
  handleConfirmDisconnectGoogleDrive,
  handleCheckStatus,
  handleBackToAccount,
  handleRefreshAccountInfo,
  handleDiscordInput,
  sendMessage,
  answerCallback
} from '@/lib/telegram-bot/handlers';
import { getConnection } from '@/lib/database';
import { isTelegramBlockedForSubscription } from '@/lib/blocklist';

interface TelegramUpdate {
  update_id: number;
  message?: any;
  callback_query?: any;
}

// Получение состояния пользователя
async function getUserState(telegramId: number): Promise<any> {
  const connection = await getConnection();
  try {
    const [rows] = await connection.execute('SELECT * FROM user_bot_states WHERE telegram_id = ?', [telegramId]);
    if ((rows as any[]).length > 0) {
      const row = (rows as any[])[0];
      // MySQL может вернуть JSON как объект или строку
      let data = row.data;
      if (typeof data === 'string') {
        try {
          data = JSON.parse(data);
        } catch {
          data = {};
        }
      }
      return { ...row, data: data || {} };
    }
    return null;
  } catch {
    return null;
  } finally {
    connection.release();
  }
}

// Обработка сообщения
async function handleMessage(message: any): Promise<void> {
  const text = message.text || '';
  const telegramId = message.from.id;

  // Команды
  if (text.startsWith('/')) {
    const command = text.split(' ')[0].toLowerCase();
    switch (command) {
      case '/start': return handleStart(message);
      case '/account':
      case '/profile':
      case '/cabinet': return handleAccount(message);
      case '/status': return handleStatus(message);
      case '/help': return handleHelp(message);
      default: return handleHelp(message);
    }
  }

  // Проверяем состояние для ввода текста
  const state = await getUserState(telegramId);
  if (!state) return handleStart(message);

  switch (state.state) {
    case 'entering_email':
    case 'changing_email':
      return handleEmailInput(message);
    case 'entering_google_drive_email':
    case 'changing_google_drive_email':
      return handleGoogleDriveEmailInput(message);
    case 'entering_promocode':
      return handlePromocodeInput(message);
    case 'awaiting_discord_oauth':
      return handleDiscordInput(message);
    default:
      return handleStart(message);
  }
}

// Обработка callback. callback_data сравниваем без учёта регистра для известных действий.
async function handleCallbackQuery(callbackQuery: any): Promise<void> {
  const raw = callbackQuery.data || '';
  const data = raw.trim();

  if (!data) {
    console.warn('Empty callback_data received');
    try {
      await answerCallback(callbackQuery.id, '⚠️ Пустой запрос');
    } catch (e) {
      console.error('Error answering empty callback:', e);
    }
    return;
  }

  const lower = data.toLowerCase();
  
  console.log(`[Telegram Bot] Processing callback: ${data} (lowercase: ${lower})`);
  
  try {
    switch (lower) {
      case 'back_to_main': 
        return await handleBackToMain(callbackQuery);
      case 'buy_subscription':
      case 'renew_subscription':
      case 'selectplan_header': // ключ текста «выбор тарифа» — открыть меню выбора тарифа
        return await handleBuySubscription(callbackQuery);
      case 'account':
      case 'my_account': 
        return await handleAccountCallback(callbackQuery);
      case 'socials': 
        return await handleSocials(callbackQuery);
      case 'confirm_order': 
        return await handleConfirmOrder(callbackQuery);
      case 'process_payment': 
        return await handleProcessPayment(callbackQuery);
      case 'check_payment_status': 
        return await handleCheckPaymentStatus(callbackQuery);
      case 'cancel':
      case 'cancel_order': 
        return await handleCancel(callbackQuery);
      case 'enter_email': 
        return await handleEnterEmail(callbackQuery);
      case 'change_email': 
        return await handleChangeEmail(callbackQuery);
      case 'reconnect_discord':
      case 'connect_discord': 
        return await handleReconnectDiscord(callbackQuery);
      case 'disconnect_discord': 
        return await handleDisconnectDiscord(callbackQuery);
      case 'confirm_disconnect_discord': 
        return await handleConfirmDisconnectDiscord(callbackQuery);
      case 'disconnect_email': 
        return await handleDisconnectEmail(callbackQuery);
      case 'confirm_disconnect_email': 
        return await handleConfirmDisconnectEmail(callbackQuery);
      case 'change_google_drive_email':
      case 'enter_google_drive_email':
        return await handleEnterGoogleDriveEmail(callbackQuery);
      case 'disconnect_google_drive':
        return await handleDisconnectGoogleDrive(callbackQuery);
      case 'confirm_disconnect_google_drive':
        return await handleConfirmDisconnectGoogleDrive(callbackQuery);
      case 'check_status': 
        return await handleCheckStatus(callbackQuery);
      case 'back_to_account': 
        return await handleBackToAccount(callbackQuery);
      case 'refresh_account_info': 
        return await handleRefreshAccountInfo(callbackQuery);
      case 'enter_promocode': 
        return await handleEnterPromocode(callbackQuery);
      case 'refresh_access':
        return await handleRefreshAccess(callbackQuery);
      case 'payment_history': 
        return await handlePaymentHistory(callbackQuery);
      case 'help':
        return await handleHelpCallback(callbackQuery);
      default:
        if (data.startsWith('select_plan:')) return await handleSelectPlan(callbackQuery);
        if (data.startsWith('payment_page:')) return await handlePaymentHistoryPage(callbackQuery);
        
        // Если callback не обработан, отвечаем на него, чтобы убрать индикатор загрузки
        console.warn(`Unhandled callback_data: ${data}`);
        try {
          await answerCallback(callbackQuery.id, '⚠️ Действие не найдено');
        } catch (e) {
          console.error('Error answering unhandled callback:', e);
        }
    }
  } catch (error) {
    console.error(`Error handling callback "${data}":`, error);
    try {
      await answerCallback(callbackQuery.id, '❌ Произошла ошибка');
    } catch (e) {
      console.error('Error answering callback after error:', e);
    }
  }
}

// Главная функция обработки
export async function processUpdate(update: TelegramUpdate): Promise<void> {
  try {
    const from = update.message?.from ?? update.callback_query?.from;
    const chatId = update.message?.chat?.id ?? update.callback_query?.message?.chat?.id;

    if (from?.id && chatId) {
      const blocked = await isTelegramBlockedForSubscription(from.id, from.username);
      if (blocked) {
        const text = '🚫 Доступ с этого аккаунта запрещён. Обратитесь в поддержку.';
        await sendMessage(chatId, text);
        if (update.callback_query) {
          await answerCallback(update.callback_query.id, 'Доступ запрещён', true);
        }
        return;
      }
    }

    if (update.message) {
      console.log(`[Telegram Bot] Processing message from ${update.message.from?.id}: ${update.message.text?.substring(0, 50)}`);
      await handleMessage(update.message);
    } else if (update.callback_query) {
      console.log(`[Telegram Bot] Processing callback_query from ${update.callback_query.from?.id}: ${update.callback_query.data}`);
      await handleCallbackQuery(update.callback_query);
    }
  } catch (error) {
    console.error('[Telegram Bot] Error processing Telegram update:', error);
    // Пытаемся ответить на callback, если это был callback_query
    if (update.callback_query) {
      try {
        await answerCallback(update.callback_query.id, '❌ Произошла ошибка');
      } catch (e) {
        console.error('[Telegram Bot] Error answering callback after update error:', e);
      }
    }
  }
}

const getToken = () => process.env.TELEGRAM_SUBSCRIPTION_BOT_TOKEN || process.env.TELEGRAM_BOT_TOKEN;

export async function setWebhook(webhookUrl: string): Promise<any> {
  const response = await fetch(`https://api.telegram.org/bot${getToken()}/setWebhook`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url: webhookUrl, allowed_updates: ['message', 'callback_query'] })
  });
  return response.json();
}

export async function deleteWebhook(): Promise<any> {
  const response = await fetch(`https://api.telegram.org/bot${getToken()}/deleteWebhook`, { method: 'POST' });
  return response.json();
}

export async function getMe(): Promise<any> {
  const response = await fetch(`https://api.telegram.org/bot${getToken()}/getMe`);
  return response.json();
}

export { sendMessage };
