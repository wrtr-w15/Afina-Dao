// Главный модуль Telegram бота

import {
  handleStart,
  handleStatus,
  handleHelp,
  handleAccount,
  handleBackToMain,
  handleBuySubscription,
  handleSelectPlan,
  handleEnterEmail,
  handleEmailInput,
  handleConfirmOrder,
  handleProcessPayment,
  handleCancel,
  handleSocials,
  handleAccountCallback,
  handleChangeEmail,
  handleReconnectDiscord,
  handleDisconnectDiscord,
  handleConfirmDisconnectDiscord,
  handleDisconnectEmail,
  handleConfirmDisconnectEmail,
  handleCheckStatus,
  handleBackToAccount,
  handleDiscordInput,
  sendMessage
} from './handlers';
import { getConnection } from '@/lib/database';

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
      return { ...row, data: row.data ? JSON.parse(row.data) : {} };
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
    case 'awaiting_discord_oauth':
      return handleDiscordInput(message);
    default:
      return handleStart(message);
  }
}

// Обработка callback
async function handleCallbackQuery(callbackQuery: any): Promise<void> {
  const data = callbackQuery.data || '';

  switch (data) {
    case 'back_to_main': return handleBackToMain(callbackQuery);
    case 'buy_subscription':
    case 'renew_subscription': return handleBuySubscription(callbackQuery);
    case 'account':
    case 'my_account': return handleAccountCallback(callbackQuery);
    case 'socials': return handleSocials(callbackQuery);
    case 'confirm_order': return handleConfirmOrder(callbackQuery);
    case 'process_payment': return handleProcessPayment(callbackQuery);
    case 'cancel':
    case 'cancel_order': return handleCancel(callbackQuery);
    case 'enter_email': return handleEnterEmail(callbackQuery);
    case 'change_email': return handleChangeEmail(callbackQuery);
    case 'reconnect_discord':
    case 'connect_discord': return handleReconnectDiscord(callbackQuery);
    case 'disconnect_discord': return handleDisconnectDiscord(callbackQuery);
    case 'confirm_disconnect_discord': return handleConfirmDisconnectDiscord(callbackQuery);
    case 'disconnect_email': return handleDisconnectEmail(callbackQuery);
    case 'confirm_disconnect_email': return handleConfirmDisconnectEmail(callbackQuery);
    case 'check_status': return handleCheckStatus(callbackQuery);
    case 'back_to_account': return handleBackToAccount(callbackQuery);
    case 'help':
      return handleHelp({ chat: callbackQuery.message.chat, from: callbackQuery.from });
    default:
      if (data.startsWith('select_plan:')) return handleSelectPlan(callbackQuery);
  }
}

// Главная функция обработки
export async function processUpdate(update: TelegramUpdate): Promise<void> {
  try {
    if (update.message) await handleMessage(update.message);
    else if (update.callback_query) await handleCallbackQuery(update.callback_query);
  } catch (error) {
    console.error('Error processing Telegram update:', error);
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

export { sendMessage } from './handlers';
