import { NextRequest, NextResponse } from 'next/server';
import { getConnection } from '@/lib/database';
import { checkAdminAuth } from '@/lib/security-middleware';
import crypto from 'crypto';
import { clearBotTextCache } from '@/lib/telegram-bot/get-text';

// Полная структура текстов и кнопок для Telegram бота
const DEFAULT_TEXTS_AND_BUTTONS = [
  // === START SECTION ===
  {
    key: 'welcome',
    section: 'start',
    value: `🎉 <b>Добро пожаловать в Afina DAO!</b>{{subscriptionInfo}}

Мы — приватное сообщество трейдеров и разработчиков. Подписка открывает доступ к:

✨ Все скрипты без ограничений
💬 Приватный Discord сервер
📚 База знаний в Notion
🛠 Техподдержка 24/7

Выберите действие:`,
    description: 'Приветствие /start. Переменные: {{subscriptionInfo}}',
    sortOrder: 1,
    buttons: [
      [{ text: '🛒 Купить подписку', callback_data: 'buy_subscription' }],
      [{ text: '👤 Личный кабинет', callback_data: 'account' }],
      [{ text: '📜 История платежей', callback_data: 'payment_history' }],
      [{ text: '🌐 Наши соцсети', callback_data: 'socials' }],
      [{ text: '❓ Помощь', callback_data: 'help' }]
    ]
  },

  // === BUY SECTION ===
  {
    key: 'selectPlan_header',
    section: 'buy',
    value: `💰 <b>Тариф «{{tariffName}}»</b>\n\n`,
    description: 'Заголовок выбора тарифа. Переменные: {{tariffName}}',
    sortOrder: 10
  },
  {
    key: 'selectPlan_footer',
    section: 'buy',
    value: `\n\nВыберите период:`,
    description: 'Подвал экрана выбора тарифа',
    sortOrder: 11
  },
  {
    key: 'confirmOrder',
    section: 'buy',
    value: `📝 <b>Подтверждение заказа</b>

🎯 Тариф: <b>{{planName}}</b>
📅 Период: <b>{{period}} мес.</b>
💰 Сумма: <b>{{priceUsdt}} USDT</b>

🎮 Discord: {{discordLine}}
📧 Email (Notion): {{notionEmailLine}}
☁️ Email (Google Drive): {{googleDriveEmailLine}}

Всё верно?`,
    description: 'Подтверждение заказа. Переменные: {{planName}}, {{period}}, {{priceUsdt}}, {{discordLine}}, {{notionEmailLine}}, {{googleDriveEmailLine}}',
    sortOrder: 20,
    buttons: [
      [{ text: '🎮 Подключить Discord', url: '{{discordOAuthUrl}}' }],
      [{ text: '📧 Email (Notion)', callback_data: 'enter_email' }],
      [{ text: '📁 Email (Google Drive)', callback_data: 'enter_google_drive_email' }],
      [{ text: '🎫 Ввести промокод', callback_data: 'enter_promocode' }],
      [{ text: '✅ Подтвердить и оплатить', callback_data: 'confirm_order' }],
      [{ text: '🔄 Обновить данные подключений', callback_data: 'refresh_access' }],
      [{ text: '◀️ Назад', callback_data: 'buy_subscription' }]
    ]
  },
  {
    key: 'awaitingPayment',
    section: 'buy',
    value: `💳 <b>Оплата</b>

Сумма к оплате: <b>{{priceUsdt}} USDT</b>

{{paymentInfo}}

⚠️ После оплаты нажмите «Проверить статус» или дождитесь автоматического уведомления.`,
    description: 'Ожидание оплаты. Переменные: {{priceUsdt}}, {{paymentInfo}}, {{paymentUrl}} в кнопках',
    sortOrder: 30,
    buttons: [
      [{ text: '💳 Перейти к оплате', url: '{{paymentUrl}}' }],
      [{ text: '🔄 Проверить статус', callback_data: 'check_payment_status' }],
      [{ text: '❌ Отмена', callback_data: 'cancel_order' }]
    ]
  },
  {
    key: 'paymentSuccess',
    section: 'buy',
    value: `✅ <b>Оплата прошла успешно!</b>

🎉 Ваша подписка активирована!

Что дальше:
• Роль в Discord выдана автоматически
• Приглашение в Notion отправлено на указанный email
• Доступ к Google Drive предоставлен на указанный email

Если возникнут вопросы — пишите в поддержку.`,
    description: 'Сообщение об успешной оплате (после подстановки {{discordInviteUrl}} в кнопках)',
    sortOrder: 40,
    buttons: [
      [{ text: '🎮 Перейти в Discord', url: '{{discordInviteUrl}}' }],
      [{ text: '👤 Личный кабинет', callback_data: 'account' }],
      [{ text: '🏠 Главное меню', callback_data: 'back_to_main' }]
    ]
  },
  {
    key: 'paymentFailed',
    section: 'buy',
    value: `❌ <b>Ошибка оплаты</b>

Что-то пошло не так. Попробуйте ещё раз или обратитесь в поддержку.`,
    description: 'Сообщение об ошибке оплаты',
    sortOrder: 50,
    buttons: [
      [{ text: '🔄 Попробовать снова', callback_data: 'buy_subscription' }],
      [{ text: '🏠 Главное меню', callback_data: 'back_to_main' }]
    ]
  },
  {
    key: 'howToStartInCommunity',
    section: 'buy',
    value: `📖 <b>Как начать работу в Сообществе</b>

Вот куда у вас есть доступ и что делать дальше:

<b>🎮 Discord</b>
Роль на сервере уже выдана. Нажмите кнопку «Перейти в Discord» выше или перейдите по ссылке из следующего сообщения — вы попадёте в наш приватный сервер. Там:
• Каналы с материалами и обсуждениями
• Техподдержка и связь с командой
• Анонсы и обновления

<b>📚 Notion</b>
Приглашение в базу знаний отправлено на вашу почту{{notionEmailLine}}. Проверьте входящие и папку «Спам». В Notion вы найдёте:
• Гайды и инструкции
• Документацию по скриптам
• Структурированную базу знаний

<b>📁 Google Drive</b>
Доступ к общей папке с материалами выдан на указанный при оплате email. Зайдите в Google Drive под этим аккаунтом — папка будет в «Доступные мне» или «Общий доступ».

Если чего-то не видите или не пришло приглашение — напишите в поддержку через /help.`,
    description: 'Инструкция «Как начать работу в Сообществе» после оплаты. Переменная: {{notionEmailLine}}',
    sortOrder: 48
  },
  {
    key: 'connectDiscord',
    section: 'buy',
    value: `🎮 <b>Подключите ваш Discord</b>

Для получения роли в нашем Discord сервере, подключите ваш аккаунт.

Нажмите кнопку ниже — откроется страница авторизации Discord.

⚠️ Мы получаем только ваш <b>ID</b> и <b>имя пользователя</b>.`,
    description: 'Инструкция по подключению Discord',
    sortOrder: 60
  },
  {
    key: 'askEmail',
    section: 'buy',
    value: `📧 <b>Введите ваш Email</b>

Email нужен для приглашения в Notion с гайдами.

Пример: <code>user@example.com</code>`,
    description: 'Запрос Email адреса',
    sortOrder: 70,
    buttons: [
      [{ text: '◀️ Назад', callback_data: 'back_to_account' }]
    ]
  },
  {
    key: 'invalidEmail',
    section: 'buy',
    value: `❌ <b>Неверный формат Email</b>

Пожалуйста, введите корректный email адрес (Notion):`,
    description: 'Ошибка неверного формата Email (Notion)',
    sortOrder: 80
  },
  {
    key: 'askPromocode',
    section: 'buy',
    value: `🎫 <b>Введите промокод</b>

Введите код промокода для получения скидки на подписку.

Или отправьте "отмена" для отмены.`,
    description: 'Запрос ввода промокода',
    sortOrder: 85,
    buttons: [
      [{ text: '◀️ Назад', callback_data: 'buy_subscription' }]
    ]
  },

  // === ACCOUNT SECTION ===
  {
    key: 'account',
    section: 'account',
    value: `👤 <b>Личный кабинет</b>

📋 <b>Тариф:</b> {{tariffName}}

📊 <b>Подписка:</b> {{subscriptionStatus}}

🎮 <b>Discord:</b> {{discordStatus}}
📧 <b>Email (Notion):</b> {{emailStatus}}
📁 <b>Google Drive:</b> {{googleDriveStatus}}

Управляйте своими данными:`,
    description: 'Личный кабинет. Переменные: {{tariffName}}, {{subscriptionStatus}}, {{discordStatus}}, {{emailStatus}}, {{googleDriveStatus}}',
    sortOrder: 100,
    buttons: [
      [{ text: '📊 Статус подписки', callback_data: 'check_status' }],
      [{ text: '📜 История платежей', callback_data: 'payment_history' }],
      [{ text: '🎮 Подключить Discord', url: '{{discordOAuthUrl}}' }],
      [{ text: '🔄 Email (Notion)', callback_data: 'change_email' }],
      [{ text: '🔄 Email (Google Drive)', callback_data: 'change_google_drive_email' }],
      [{ text: '🔄 Обновить информацию', callback_data: 'refresh_account_info' }],
      [{ text: '🏠 Главное меню', callback_data: 'back_to_main' }]
    ]
  },
  {
    key: 'subscriptionStatus_active',
    section: 'account',
    value: `📊 <b>Статус подписки</b>

✅ Подписка активна
📅 Действует до: <b>{{endDate}}</b>
⏳ Осталось: <b>{{daysLeft}} дн.</b>`,
    description: 'Статус активной подписки. Переменные: {{endDate}}, {{daysLeft}}',
    sortOrder: 110
  },
  {
    key: 'subscriptionStatus_inactive',
    section: 'account',
    value: `📊 <b>Статус подписки</b>

❌ У вас нет активной подписки.

Нажмите "Купить подписку" чтобы получить доступ.`,
    description: 'Статус неактивной подписки',
    sortOrder: 120,
    buttons: [
      [{ text: '🛒 Купить подписку', callback_data: 'buy_subscription' }],
      [{ text: '◀️ Назад', callback_data: 'back_to_account' }]
    ]
  },
  {
    key: 'paymentHistory',
    section: 'account',
    value: `📜 <b>История платежей</b>

{{paymentList}}

{{paginationInfo}}`,
    description: 'История платежей. Переменные: {{paymentList}}, {{paginationInfo}}',
    sortOrder: 130,
    buttons: [
      [{ text: '◀️ Назад', callback_data: 'back_to_account' }]
    ]
  },
  {
    key: 'paymentHistory_empty',
    section: 'account',
    value: `📜 <b>История платежей</b>

У вас пока нет платежей.

Нажмите "Купить подписку" чтобы сделать первый платёж.`,
    description: 'Пустая история платежей',
    sortOrder: 140,
    buttons: [
      [{ text: '🛒 Купить подписку', callback_data: 'buy_subscription' }],
      [{ text: '◀️ Назад', callback_data: 'back_to_account' }]
    ]
  },
  {
    key: 'discordDisconnected',
    section: 'account',
    value: `✅ <b>Discord отключён</b>

Ваш Discord аккаунт отвязан от профиля.
Роль в Discord сервере снята.`,
    description: 'Подтверждение отключения Discord',
    sortOrder: 150
  },
  {
    key: 'emailDisconnected',
    section: 'account',
    value: `✅ <b>Email отключён</b>

Ваш Email отвязан от профиля.
Доступ к Notion отозван.`,
    description: 'Подтверждение отключения Email',
    sortOrder: 160
  },
  {
    key: 'askGoogleDriveEmail',
    section: 'account',
    value: `📁 <b>Введите ваш Google Drive Email</b>

Email нужен для предоставления доступа к Google Drive.

Пример: <code>user@example.com</code>`,
    description: 'Запрос ввода Google Drive Email',
    sortOrder: 165,
    buttons: [
      [{ text: '◀️ Назад', callback_data: 'account' }]
    ]
  },
  {
    key: 'invalidGoogleDriveEmail',
    section: 'account',
    value: `❌ <b>Неверный формат Email</b>

Пожалуйста, введите корректный Google Drive email адрес:`,
    description: 'Ошибка неверного формата Google Drive Email',
    sortOrder: 166
  },
  {
    key: 'confirmDisconnectGoogleDrive',
    section: 'account',
    value: `⚠️ <b>Отключить Google Drive Email?</b>

Доступ к Google Drive будет отозван.`,
    description: 'Подтверждение отключения Google Drive Email',
    sortOrder: 167
  },
  {
    key: 'googleDriveDisconnected',
    section: 'account',
    value: `✅ <b>Google Drive Email отключён</b>

Доступ к Google Drive был отозван.`,
    description: 'Сообщение об отключении Google Drive Email',
    sortOrder: 168
  },

  // === SOCIALS SECTION ===
  {
    key: 'socials',
    section: 'common',
    value: `🌐 <b>Наши социальные сети</b>

Подписывайтесь, чтобы быть в курсе новостей:`,
    description: 'Сообщение со ссылками на соцсети. Подстановки: {{telegramChannelUrl}}, {{discordInviteUrl}}',
    sortOrder: 200,
    buttons: [
      [{ text: '📱 Telegram канал', url: '{{telegramChannelUrl}}' }],
      [{ text: '🎮 Discord сервер', url: '{{discordInviteUrl}}' }],
      [{ text: '🏠 Главное меню', callback_data: 'back_to_main' }]
    ]
  },

  // === HELP SECTION ===
  {
    key: 'help',
    section: 'common',
    value: `ℹ️ <b>Справка по боту</b>

<b>Команды:</b>
/start — Главное меню
/account — Личный кабинет
/status — Статус подписки
/help — Эта справка

<b>Что вы получаете:</b>
• Доступ ко всем скриптам Afina DAO
• Приватный Discord сервер с поддержкой
• База знаний в Notion с гайдами
• Доступ к материалам в Google Drive

<b>Поддержка:</b>
Если у вас возникли вопросы, напишите {{supportText}}`,
    description: 'Справка. Переменные: {{supportText}}, {{supportTg1}}, {{supportTg2}}',
    sortOrder: 210,
    buttons: [
      [{ text: '💬 Написать в поддержку', url: 'https://t.me/{{supportTg1}}' }],
      [{ text: '🏠 Главное меню', callback_data: 'back_to_main' }]
    ]
  },

  // === COMMON MESSAGES ===
  {
    key: 'cancelled',
    section: 'common',
    value: `❌ Действие отменено.

Используйте /start для главного меню.`,
    description: 'Сообщение об отмене действия',
    sortOrder: 300
  },
  {
    key: 'error',
    section: 'common',
    value: `❌ <b>Произошла ошибка</b>

Пожалуйста, попробуйте позже или обратитесь в поддержку.`,
    description: 'Общее сообщение об ошибке',
    sortOrder: 310
  },

  // === NOTIFICATIONS ===
  {
    key: 'subscription_expiring_3_days',
    section: 'notifications',
    value: `⚠️ <b>Ваша подписка скоро истечёт!</b>

📅 Дата окончания: {{endDate}}
⏳ Осталось: {{daysLeft}} дн.

Продлите подписку, чтобы не потерять доступ. Нажмите /start или кнопку «Продлить подписку».`,
    description: 'Уведомление за 3 дня до конца подписки. Переменные: {{endDate}}, {{daysLeft}}',
    sortOrder: 10,
    notificationCondition: { type: 'days_before_expiry', days: 3 },
    buttons: [
      [{ text: '🔄 Продлить подписку', callback_data: 'buy_subscription' }],
      [{ text: '👤 Личный кабинет', callback_data: 'account' }]
    ]
  },
  {
    key: 'subscription_expiring_1_day',
    section: 'notifications',
    value: `🚨 <b>Ваша подписка истекает завтра!</b>

📅 Дата окончания: {{endDate}}
⏳ Осталось: {{daysLeft}} дн.

Срочно продлите подписку, чтобы не потерять доступ ко всем функциям.`,
    description: 'Уведомление за 1 день до окончания. Переменные: {{endDate}}, {{daysLeft}}',
    sortOrder: 20,
    notificationCondition: { type: 'days_before_expiry', days: 1 },
    buttons: [
      [{ text: '🔄 Продлить подписку', callback_data: 'buy_subscription' }],
      [{ text: '👤 Личный кабинет', callback_data: 'account' }]
    ]
  }
];

export async function POST(request: NextRequest) {
  let connection: Awaited<ReturnType<typeof getConnection>> | null = null;
  try {
    const { checkAdminAuth } = await import('@/lib/security-middleware');
    const authResult = await checkAdminAuth(request);
    if (authResult) return authResult;

    connection = await getConnection();

    // Создаем таблицу если её нет
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS telegram_bot_texts (
        id VARCHAR(36) PRIMARY KEY,
        \`key\` VARCHAR(100) NOT NULL UNIQUE,
        section VARCHAR(50) NOT NULL DEFAULT 'common',
        value TEXT,
        description VARCHAR(500) NULL,
        sort_order INT NOT NULL DEFAULT 0,
        buttons JSON NULL,
        notification_condition JSON NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_section (section)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    let created = 0;
    let updated = 0;
    let skipped = 0;

    for (const item of DEFAULT_TEXTS_AND_BUTTONS) {
      const [existing] = await connection.execute(
        'SELECT id FROM telegram_bot_texts WHERE `key` = ?',
        [item.key]
      );

      const buttonsJson = item.buttons ? JSON.stringify(item.buttons) : null;
      const notificationConditionJson = item.notificationCondition 
        ? JSON.stringify(item.notificationCondition) 
        : null;

      if ((existing as any[]).length > 0) {
        // Обновляем существующий
        await connection.execute(
          `UPDATE telegram_bot_texts 
           SET section = ?, value = ?, description = ?, sort_order = ?, buttons = ?, notification_condition = ?, updated_at = NOW()
           WHERE \`key\` = ?`,
          [
            item.section,
            item.value,
            item.description,
            item.sortOrder,
            buttonsJson,
            notificationConditionJson,
            item.key
          ]
        );
        updated++;
      } else {
        // Создаем новый
        await connection.execute(
          `INSERT INTO telegram_bot_texts (id, \`key\`, section, value, description, sort_order, buttons, notification_condition)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            crypto.randomUUID(),
            item.key,
            item.section,
            item.value,
            item.description,
            item.sortOrder,
            buttonsJson,
            notificationConditionJson
          ]
        );
        created++;
      }
    }

    clearBotTextCache();

    return NextResponse.json({
      success: true,
      created,
      updated,
      skipped,
      message: `Инициализация завершена: создано ${created}, обновлено ${updated}`
    });
  } catch (error: any) {
    console.error('Error initializing telegram texts:', error);
    return NextResponse.json(
      { error: 'Failed to initialize', details: error.message },
      { status: 500 }
    );
  } finally {
    if (connection) connection.release();
  }
}
