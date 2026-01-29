// Обработчики команд и callback для Telegram бота

import { getConnection } from '@/lib/database';
import { messages } from './messages';
import { 
  getMainMenuKeyboard,
  getPlanKeyboard, 
  getConfirmKeyboard, 
  getPaymentKeyboard,
  getSuccessKeyboard,
  getAccountKeyboard,
  getEmailInputKeyboard,
  getSocialsKeyboard,
  getConfirmDisconnectDiscordKeyboard,
  getConfirmDisconnectEmailKeyboard,
  getBackToMainKeyboard
} from './keyboards';
import crypto from 'crypto';

const SUBSCRIPTION_BOT_TOKEN = process.env.TELEGRAM_SUBSCRIPTION_BOT_TOKEN || process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_API = `https://api.telegram.org/bot${SUBSCRIPTION_BOT_TOKEN}`;

// Отправка сообщения
export async function sendMessage(chatId: number, text: string, keyboard?: any): Promise<any> {
  const response = await fetch(`${TELEGRAM_API}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: 'HTML',
      ...(keyboard && { reply_markup: keyboard })
    })
  });
  return response.json();
}

// Редактирование сообщения
export async function editMessage(chatId: number, messageId: number, text: string, keyboard?: any): Promise<any> {
  const response = await fetch(`${TELEGRAM_API}/editMessageText`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      message_id: messageId,
      text,
      parse_mode: 'HTML',
      ...(keyboard && { reply_markup: keyboard })
    })
  });
  return response.json();
}

// Ответ на callback
export async function answerCallback(callbackQueryId: string, text?: string): Promise<any> {
  const response = await fetch(`${TELEGRAM_API}/answerCallbackQuery`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ callback_query_id: callbackQueryId, text })
  });
  return response.json();
}

// Получение или создание пользователя
async function getOrCreateUser(telegramUser: any): Promise<{ id: string; isNew: boolean }> {
  const connection = await getConnection();
  try {
    const [existing] = await connection.execute(
      'SELECT id FROM users WHERE telegram_id = ?',
      [telegramUser.id]
    );

    if ((existing as any[]).length > 0) {
      await connection.execute(
        `UPDATE users SET telegram_username = ?, telegram_first_name = ?, telegram_last_name = ?, updated_at = CURRENT_TIMESTAMP WHERE telegram_id = ?`,
        [telegramUser.username || null, telegramUser.first_name || null, telegramUser.last_name || null, telegramUser.id]
      );
      return { id: (existing as any[])[0].id, isNew: false };
    }

    const userId = crypto.randomUUID();
    await connection.execute(
      `INSERT INTO users (id, telegram_id, telegram_username, telegram_first_name, telegram_last_name) VALUES (?, ?, ?, ?, ?)`,
      [userId, telegramUser.id, telegramUser.username || null, telegramUser.first_name || null, telegramUser.last_name || null]
    );
    return { id: userId, isNew: true };
  } finally {
    connection.release();
  }
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
  } finally {
    connection.release();
  }
}

// Сохранение состояния
async function saveUserState(telegramId: number, state: string, data: any): Promise<void> {
  const connection = await getConnection();
  try {
    const id = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000);
    await connection.execute(
      `INSERT INTO user_bot_states (id, telegram_id, state, data, expires_at) VALUES (?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE state = VALUES(state), data = VALUES(data), expires_at = VALUES(expires_at), updated_at = CURRENT_TIMESTAMP`,
      [id, telegramId, state, JSON.stringify(data), expiresAt]
    );
  } finally {
    connection.release();
  }
}

// Очистка состояния
async function clearUserState(telegramId: number): Promise<void> {
  const connection = await getConnection();
  try {
    await connection.execute('DELETE FROM user_bot_states WHERE telegram_id = ?', [telegramId]);
  } finally {
    connection.release();
  }
}

// Получение тарифов — те же данные что на сайте: tariffs + tariff_prices
async function getPlans(): Promise<any[]> {
  const connection = await getConnection();
  try {
    // Активный тариф (как на странице private-community: первый активный)
    const [tariffRows] = await connection.execute(
      `SELECT id, name FROM tariffs WHERE is_active = 1 AND is_archived = 0 AND is_custom = 0 ORDER BY sort_order ASC, created_at DESC LIMIT 1`
    );
    if ((tariffRows as any[]).length === 0) return [];

    const tariff = (tariffRows as any[])[0];
    const tariffId = tariff.id;
    const tariffName = tariff.name;

    // Цены тарифа — monthly_price в USDT, итого = monthly_price * period_months
    const [priceRows] = await connection.execute(
      `SELECT id, period_months, monthly_price, is_popular FROM tariff_prices WHERE tariff_id = ? ORDER BY sort_order ASC, period_months ASC`,
      [tariffId]
    );

    return (priceRows as any[]).map(row => {
      const period = row.period_months;
      const monthlyPrice = parseFloat(row.monthly_price);
      const totalUsdt = monthlyPrice * period;
      const periodLabel = period === 1 ? '1 месяц' : period < 5 ? `${period} месяца` : `${period} месяцев`;
      return {
        id: row.id,
        tariffId,
        tariffName,
        name: periodLabel,
        period,
        monthlyPriceUsdt: monthlyPrice,
        priceUsdt: totalUsdt,
        isPopular: Boolean(row.is_popular)
      };
    });
  } finally {
    connection.release();
  }
}

// Получение активной подписки
async function getActiveSubscription(userId: string): Promise<any> {
  const connection = await getConnection();
  try {
    const [rows] = await connection.execute(
      `SELECT * FROM subscriptions WHERE user_id = ? AND status = 'active' AND end_date > NOW() ORDER BY end_date DESC LIMIT 1`,
      [userId]
    );
    return (rows as any[])[0] || null;
  } finally {
    connection.release();
  }
}

// Получение данных пользователя
async function getUserData(telegramId: number): Promise<any> {
  const connection = await getConnection();
  try {
    const [rows] = await connection.execute('SELECT * FROM users WHERE telegram_id = ?', [telegramId]);
    return (rows as any[])[0] || null;
  } finally {
    connection.release();
  }
}

// Discord OAuth URL
export function getDiscordOAuthUrl(telegramId: number): string {
  const clientId = process.env.DISCORD_CLIENT_ID;
  const redirectUri = process.env.DISCORD_REDIRECT_URI || `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/discord/callback`;
  const state = Buffer.from(JSON.stringify({ telegramId })).toString('base64');
  const params = new URLSearchParams({ client_id: clientId!, redirect_uri: redirectUri, response_type: 'code', scope: 'identify', state });
  return `https://discord.com/oauth2/authorize?${params.toString()}`;
}

// ============ КОМАНДЫ ============

export async function handleStart(message: any): Promise<void> {
  const chatId = message.chat.id;
  try {
    const { id: userId } = await getOrCreateUser(message.from);
    const subscription = await getActiveSubscription(userId);
    const endDate = subscription ? new Date(subscription.end_date).toLocaleDateString('ru-RU') : undefined;
    await sendMessage(chatId, await messages.welcome(!!subscription, endDate), getMainMenuKeyboard(!!subscription));
  } catch (error) {
    console.error('Error in handleStart:', error);
    await sendMessage(chatId, await messages.error());
  }
}

export async function handleAccount(message: any): Promise<void> {
  const chatId = message.chat.id;
  try {
    const { id: userId } = await getOrCreateUser(message.from);
    const user = await getUserData(message.from.id);
    const subscription = await getActiveSubscription(userId);
    
    let endDate, daysLeft;
    if (subscription) {
      const end = new Date(subscription.end_date);
      endDate = end.toLocaleDateString('ru-RU');
      daysLeft = Math.ceil((end.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    }
    
    await sendMessage(chatId, await messages.account({
      hasSubscription: !!subscription,
      endDate,
      daysLeft,
      discordConnected: !!user?.discord_id,
      discordUsername: user?.discord_username,
      emailConnected: !!user?.email,
      email: user?.email
    }), getAccountKeyboard({
      hasSubscription: !!subscription,
      discordConnected: !!user?.discord_id,
      emailConnected: !!user?.email,
      discordOAuthUrl: getDiscordOAuthUrl(message.from.id)
    }));
  } catch (error) {
    console.error('Error in handleAccount:', error);
    await sendMessage(chatId, await messages.error());
  }
}

export async function handleStatus(message: any): Promise<void> {
  const chatId = message.chat.id;
  try {
    const { id: userId } = await getOrCreateUser(message.from);
    const subscription = await getActiveSubscription(userId);
    if (!subscription) {
      await sendMessage(chatId, await messages.subscriptionStatus(false), getBackToMainKeyboard());
      return;
    }
    const endDate = new Date(subscription.end_date);
    const daysLeft = Math.ceil((endDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    await sendMessage(chatId, await messages.subscriptionStatus(true, endDate.toLocaleDateString('ru-RU'), daysLeft), getBackToMainKeyboard());
  } catch (error) {
    console.error('Error in handleStatus:', error);
    await sendMessage(chatId, await messages.error());
  }
}

export async function handleHelp(message: any): Promise<void> {
  await sendMessage(message.chat.id, await messages.help(), getBackToMainKeyboard());
}

// ============ CALLBACKS ============

export async function handleBackToMain(callbackQuery: any): Promise<void> {
  try {
    await answerCallback(callbackQuery.id);
    await clearUserState(callbackQuery.from.id);
    await handleStart({ chat: callbackQuery.message.chat, from: callbackQuery.from });
  } catch (error) {
    console.error('Error in handleBackToMain:', error);
  }
}

export async function handleBuySubscription(callbackQuery: any): Promise<void> {
  const chatId = callbackQuery.message.chat.id;
  const messageId = callbackQuery.message.message_id;
  try {
    await answerCallback(callbackQuery.id);
    const plans = await getPlans();
    if (plans.length === 0) {
      await editMessage(chatId, messageId, '❌ Тарифы временно недоступны.', getBackToMainKeyboard());
      return;
    }
    await editMessage(chatId, messageId, await messages.selectPlan(plans), getPlanKeyboard(plans));
  } catch (error) {
    console.error('Error in handleBuySubscription:', error);
    await sendMessage(chatId, await messages.error());
  }
}

export async function handleSelectPlan(callbackQuery: any): Promise<void> {
  const chatId = callbackQuery.message.chat.id;
  const messageId = callbackQuery.message.message_id;
  const telegramId = callbackQuery.from.id;
  try {
    await answerCallback(callbackQuery.id);
    const planId = callbackQuery.data.split(':')[1];
    const plans = await getPlans();
    const plan = plans.find(p => p.id === planId);
    if (!plan) {
      await editMessage(chatId, messageId, '❌ Тариф не найден.', getBackToMainKeyboard());
      return;
    }
    const user = await getUserData(telegramId);
    // plan.id = tariff_price_id, plan.tariffId = tariff_id (как на сайте)
    await saveUserState(telegramId, 'selecting_plan', {
      planId: plan.id,
      tariffId: plan.tariffId,
      planName: plan.tariffName ? `${plan.tariffName}, ${plan.name}` : plan.name,
      period: plan.period,
      priceUsdt: plan.priceUsdt,
      discordId: user?.discord_id,
      discordUsername: user?.discord_username,
      email: user?.email
    });
    const needsDiscord = !user?.discord_id;
    const needsEmail = !user?.email;
    await editMessage(chatId, messageId, await messages.confirmOrder({
      planName: plan.tariffName ? `${plan.tariffName} — ${plan.name}` : plan.name,
      period: plan.period,
      priceUsdt: plan.priceUsdt,
      discordUsername: user?.discord_username,
      email: user?.email
    }), getConfirmKeyboard(needsDiscord, needsEmail, getDiscordOAuthUrl(telegramId)));
  } catch (error) {
    console.error('Error in handleSelectPlan:', error);
    await sendMessage(chatId, await messages.error());
  }
}

export async function handleEnterEmail(callbackQuery: any): Promise<void> {
  const chatId = callbackQuery.message.chat.id;
  const messageId = callbackQuery.message.message_id;
  const telegramId = callbackQuery.from.id;
  try {
    await answerCallback(callbackQuery.id);
    const state = await getUserState(telegramId);
    await saveUserState(telegramId, 'entering_email', state?.data || {});
    await editMessage(chatId, messageId, await messages.askEmail(), getEmailInputKeyboard());
  } catch (error) {
    console.error('Error in handleEnterEmail:', error);
    await sendMessage(chatId, await messages.error());
  }
}

export async function handleEmailInput(message: any): Promise<void> {
  const chatId = message.chat.id;
  const telegramId = message.from.id;
  const email = message.text.trim().toLowerCase();
  try {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      await sendMessage(chatId, await messages.invalidEmail(), getEmailInputKeyboard());
      return;
    }
    const connection = await getConnection();
    try {
      await connection.execute('UPDATE users SET email = ?, updated_at = CURRENT_TIMESTAMP WHERE telegram_id = ?', [email, telegramId]);
    } finally {
      connection.release();
    }
    const state = await getUserState(telegramId);
    if (state?.state === 'entering_email' && state.data?.planId) {
      const user = await getUserData(telegramId);
      const needsDiscord = !user?.discord_id;
      await saveUserState(telegramId, 'selecting_plan', { ...state.data, email });
      await sendMessage(chatId,         await messages.confirmOrder({
          planName: state.data.planName,
          period: state.data.period,
          priceUsdt: state.data.priceUsdt,
          discordUsername: user?.discord_username,
          email
        }), getConfirmKeyboard(needsDiscord, false, getDiscordOAuthUrl(telegramId)));
    } else {
      await clearUserState(telegramId);
      await sendMessage(chatId, `✅ Email сохранён: <code>${email}</code>`, getBackToMainKeyboard());
    }
  } catch (error) {
    console.error('Error in handleEmailInput:', error);
    await sendMessage(chatId, await messages.error());
  }
}

export async function handleConfirmOrder(callbackQuery: any): Promise<void> {
  const chatId = callbackQuery.message.chat.id;
  const messageId = callbackQuery.message.message_id;
  const telegramId = callbackQuery.from.id;
  try {
    await answerCallback(callbackQuery.id);
    const state = await getUserState(telegramId);
    const user = await getUserData(telegramId);
    if (!user?.discord_id || !user?.email) {
      await answerCallback(callbackQuery.id, '⚠️ Заполните Discord и Email');
      return;
    }
    if (!state?.data?.planId) {
      await editMessage(chatId, messageId, await messages.error(), getBackToMainKeyboard());
      return;
    }
    const connection = await getConnection();
    try {
      const { id: userId } = await getOrCreateUser(callbackQuery.from);
      const subscriptionId = crypto.randomUUID();
      // tariff_id и tariff_price_id — как на сайте (tariffs + tariff_prices)
      await connection.execute(
        `INSERT INTO subscriptions (id, user_id, tariff_id, tariff_price_id, period_months, amount, currency, status) VALUES (?, ?, ?, ?, ?, ?, ?, 'pending')`,
        [subscriptionId, userId, state.data.tariffId || null, state.data.planId, state.data.period, state.data.priceUsdt, 'USDT']
      );
      const paymentId = crypto.randomUUID();
      await connection.execute(
        `INSERT INTO payments (id, subscription_id, user_id, amount, currency, status, payment_method) VALUES (?, ?, ?, ?, ?, 'pending', 'crypto')`,
        [paymentId, subscriptionId, userId, state.data.priceUsdt, 'USDT']
      );
      await saveUserState(telegramId, 'awaiting_payment', { ...state.data, subscriptionId, paymentId });
      await editMessage(chatId, messageId, await messages.awaitingPayment(state.data.priceUsdt), getPaymentKeyboard());
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Error in handleConfirmOrder:', error);
    await sendMessage(chatId, await messages.error());
  }
}

export async function handleProcessPayment(callbackQuery: any): Promise<void> {
  const chatId = callbackQuery.message.chat.id;
  const messageId = callbackQuery.message.message_id;
  const telegramId = callbackQuery.from.id;
  try {
    await answerCallback(callbackQuery.id, '💳 Обработка...');
    const state = await getUserState(telegramId);
    if (!state || state.state !== 'awaiting_payment') {
      await sendMessage(chatId, await messages.error());
      return;
    }
    const connection = await getConnection();
    try {
      const now = new Date();
      const endDate = new Date(now);
      endDate.setMonth(endDate.getMonth() + state.data.period);
      await connection.execute(`UPDATE subscriptions SET status = 'active', start_date = ?, end_date = ? WHERE id = ?`, [now, endDate, state.data.subscriptionId]);
      await connection.execute(`UPDATE payments SET status = 'completed', paid_at = CURRENT_TIMESTAMP WHERE id = ?`, [state.data.paymentId]);
      await clearUserState(telegramId);
      await editMessage(chatId, messageId, await messages.paymentSuccess(), getSuccessKeyboard(process.env.DISCORD_INVITE_URL));
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Error in handleProcessPayment:', error);
    await sendMessage(chatId, await messages.paymentFailed());
  }
}

export async function handleCancel(callbackQuery: any): Promise<void> {
  const chatId = callbackQuery.message.chat.id;
  const messageId = callbackQuery.message.message_id;
  try {
    await answerCallback(callbackQuery.id);
    await clearUserState(callbackQuery.from.id);
    await editMessage(chatId, messageId, await messages.cancelled(), getBackToMainKeyboard());
  } catch (error) {
    console.error('Error in handleCancel:', error);
  }
}

export async function handleSocials(callbackQuery: any): Promise<void> {
  const chatId = callbackQuery.message.chat.id;
  const messageId = callbackQuery.message.message_id;
  try {
    await answerCallback(callbackQuery.id);
    await editMessage(chatId, messageId, await messages.socials(), getSocialsKeyboard());
  } catch (error) {
    console.error('Error in handleSocials:', error);
  }
}

export async function handleAccountCallback(callbackQuery: any): Promise<void> {
  try {
    await answerCallback(callbackQuery.id);
    await handleAccount({ chat: callbackQuery.message.chat, from: callbackQuery.from });
  } catch (error) {
    console.error('Error in handleAccountCallback:', error);
  }
}

export async function handleChangeEmail(callbackQuery: any): Promise<void> {
  const chatId = callbackQuery.message.chat.id;
  const messageId = callbackQuery.message.message_id;
  try {
    await answerCallback(callbackQuery.id);
    await saveUserState(callbackQuery.from.id, 'changing_email', { returnTo: 'account' });
    await editMessage(chatId, messageId, `📧 <b>Введите Email</b>\n\nEmail используется для доступа к Notion:`, getEmailInputKeyboard());
  } catch (error) {
    console.error('Error in handleChangeEmail:', error);
  }
}

export async function handleReconnectDiscord(callbackQuery: any): Promise<void> {
  const chatId = callbackQuery.message.chat.id;
  const messageId = callbackQuery.message.message_id;
  try {
    await answerCallback(callbackQuery.id);
    await editMessage(chatId, messageId, await messages.connectDiscord(), {
      inline_keyboard: [
        [{ text: '🎮 Подключить Discord', url: getDiscordOAuthUrl(callbackQuery.from.id) }],
        [{ text: '◀️ Назад', callback_data: 'account' }]
      ]
    });
  } catch (error) {
    console.error('Error in handleReconnectDiscord:', error);
  }
}

export async function handleDisconnectDiscord(callbackQuery: any): Promise<void> {
  const chatId = callbackQuery.message.chat.id;
  const messageId = callbackQuery.message.message_id;
  try {
    await answerCallback(callbackQuery.id);
    await editMessage(chatId, messageId, `⚠️ <b>Отключить Discord?</b>\n\nВаша роль в Discord сервере будет снята.`, getConfirmDisconnectDiscordKeyboard());
  } catch (error) {
    console.error('Error in handleDisconnectDiscord:', error);
  }
}

export async function handleConfirmDisconnectDiscord(callbackQuery: any): Promise<void> {
  const chatId = callbackQuery.message.chat.id;
  const telegramId = callbackQuery.from.id;
  try {
    await answerCallback(callbackQuery.id);
    const connection = await getConnection();
    try {
      const user = await getUserData(telegramId);
      if (user?.discord_id) {
        console.log(`Removing Discord role for user ${user.discord_id}`);
        // TODO: Снять роль в Discord
      }
      await connection.execute('UPDATE users SET discord_id = NULL, discord_username = NULL, updated_at = CURRENT_TIMESTAMP WHERE telegram_id = ?', [telegramId]);
    } finally {
      connection.release();
    }
    await sendMessage(chatId, await messages.discordDisconnected(), getBackToMainKeyboard());
  } catch (error) {
    console.error('Error in handleConfirmDisconnectDiscord:', error);
    await sendMessage(chatId, await messages.error());
  }
}

export async function handleDisconnectEmail(callbackQuery: any): Promise<void> {
  const chatId = callbackQuery.message.chat.id;
  const messageId = callbackQuery.message.message_id;
  try {
    await answerCallback(callbackQuery.id);
    await editMessage(chatId, messageId, `⚠️ <b>Отключить Email?</b>\n\nДоступ к Notion будет отозван.`, getConfirmDisconnectEmailKeyboard());
  } catch (error) {
    console.error('Error in handleDisconnectEmail:', error);
  }
}

export async function handleConfirmDisconnectEmail(callbackQuery: any): Promise<void> {
  const chatId = callbackQuery.message.chat.id;
  const telegramId = callbackQuery.from.id;
  try {
    await answerCallback(callbackQuery.id);
    const connection = await getConnection();
    try {
      const user = await getUserData(telegramId);
      if (user?.email) {
        console.log(`Revoking Notion access for ${user.email}`);
        // TODO: Отозвать доступ к Notion
      }
      await connection.execute('UPDATE users SET email = NULL, updated_at = CURRENT_TIMESTAMP WHERE telegram_id = ?', [telegramId]);
    } finally {
      connection.release();
    }
    await sendMessage(chatId, await messages.emailDisconnected(), getBackToMainKeyboard());
  } catch (error) {
    console.error('Error in handleConfirmDisconnectEmail:', error);
    await sendMessage(chatId, await messages.error());
  }
}

export async function handleCheckStatus(callbackQuery: any): Promise<void> {
  try {
    await answerCallback(callbackQuery.id);
    await handleStatus({ chat: callbackQuery.message.chat, from: callbackQuery.from });
  } catch (error) {
    console.error('Error in handleCheckStatus:', error);
  }
}

export async function handleBackToAccount(callbackQuery: any): Promise<void> {
  try {
    await answerCallback(callbackQuery.id);
    await clearUserState(callbackQuery.from.id);
    await handleAccount({ chat: callbackQuery.message.chat, from: callbackQuery.from });
  } catch (error) {
    console.error('Error in handleBackToAccount:', error);
  }
}

export async function handleDiscordInput(message: any): Promise<void> {
  await sendMessage(message.chat.id, '⚠️ Для подключения Discord нажмите кнопку <b>"🎮 Подключить Discord"</b>.', getBackToMainKeyboard());
}
