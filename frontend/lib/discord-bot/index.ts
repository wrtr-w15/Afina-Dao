// Discord бот для управления ролями подписчиков

import { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder } from 'discord.js';
import { getConnection } from '@/lib/database';

let client: Client | null = null;
let isReady = false;

// Инициализация бота
export function initDiscordBot(): Client {
  if (client) return client;

  client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMembers,
    ]
  });

  client.on('ready', () => {
    console.log(`✅ Discord bot logged in as ${client?.user?.tag}`);
    isReady = true;
  });

  client.on('error', (error) => {
    console.error('Discord bot error:', error);
  });

  // Обработка slash команд
  client.on('interactionCreate', async (interaction) => {
    if (!interaction.isChatInputCommand()) return;

    if (interaction.commandName === 'subscription') {
      await handleSubscriptionCommand(interaction);
    }
  });

  return client;
}

// Подключение к Discord
export async function connectDiscordBot(): Promise<void> {
  const token = process.env.DISCORD_BOT_TOKEN;
  if (!token) {
    console.error('DISCORD_BOT_TOKEN not set');
    return;
  }

  const bot = initDiscordBot();
  
  try {
    await bot.login(token);
  } catch (error) {
    console.error('Failed to connect Discord bot:', error);
  }
}

// Регистрация slash команд
export async function registerCommands(): Promise<void> {
  const token = process.env.DISCORD_BOT_TOKEN;
  const clientId = process.env.DISCORD_CLIENT_ID;
  const guildId = process.env.DISCORD_GUILD_ID;

  if (!token || !clientId || !guildId) {
    console.error('Discord configuration missing');
    return;
  }

  const commands = [
    new SlashCommandBuilder()
      .setName('subscription')
      .setDescription('Проверить статус подписки')
      .toJSON()
  ];

  const rest = new REST({ version: '10' }).setToken(token);

  try {
    console.log('Registering Discord slash commands...');
    await rest.put(
      Routes.applicationGuildCommands(clientId, guildId),
      { body: commands }
    );
    console.log('✅ Discord commands registered');
  } catch (error) {
    console.error('Failed to register commands:', error);
  }
}

// Обработка команды /subscription
async function handleSubscriptionCommand(interaction: any): Promise<void> {
  const discordId = interaction.user.id;

  const connection = await getConnection();
  try {
    // Ищем пользователя по Discord ID
    const [users] = await connection.execute(
      'SELECT id FROM users WHERE discord_id = ?',
      [discordId]
    );

    if ((users as any[]).length === 0) {
      await interaction.reply({
        content: '❌ Ваш Discord аккаунт не привязан к подписке.\nПриобретите подписку через Telegram бота.',
        ephemeral: true
      });
      return;
    }

    const userId = (users as any[])[0].id;

    // Проверяем активную подписку
    const [subscriptions] = await connection.execute(
      `SELECT * FROM subscriptions 
       WHERE user_id = ? AND status = 'active' AND end_date > NOW()
       ORDER BY end_date DESC LIMIT 1`,
      [userId]
    );

    if ((subscriptions as any[]).length === 0) {
      await interaction.reply({
        content: '❌ У вас нет активной подписки.\nПродлите подписку через Telegram бота.',
        ephemeral: true
      });
      return;
    }

    const subscription = (subscriptions as any[])[0];
    const endDate = new Date(subscription.end_date);
    const now = new Date();
    const daysLeft = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    await interaction.reply({
      content: `✅ **Подписка активна**\n\n📅 Действует до: **${endDate.toLocaleDateString('ru-RU')}**\n⏳ Осталось: **${daysLeft} дн.**`,
      ephemeral: true
    });
  } catch (error) {
    console.error('Error handling subscription command:', error);
    await interaction.reply({
      content: '❌ Произошла ошибка. Попробуйте позже.',
      ephemeral: true
    });
  } finally {
    connection.release();
  }
}

// Выдача роли пользователю
export async function grantRole(discordId: string): Promise<{ success: boolean; error?: string }> {
  const guildId = process.env.DISCORD_GUILD_ID;
  const roleId = process.env.DISCORD_SUBSCRIBER_ROLE_ID;

  if (!guildId || !roleId) {
    return { success: false, error: 'Discord configuration missing' };
  }

  if (!client || !isReady) {
    // Пытаемся подключиться
    await connectDiscordBot();
    // Ждём подключения
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    if (!isReady) {
      return { success: false, error: 'Discord bot not connected' };
    }
  }

  try {
    const guild = await client!.guilds.fetch(guildId);
    const member = await guild.members.fetch(discordId);
    
    if (!member) {
      return { success: false, error: 'User not found in server' };
    }

    await member.roles.add(roleId);
    
    console.log(`✅ Role granted to ${member.user.tag} (${discordId})`);
    return { success: true };
  } catch (error: any) {
    console.error('Error granting role:', error);
    return { success: false, error: error.message };
  }
}

// Забор роли у пользователя
export async function revokeRole(discordId: string): Promise<{ success: boolean; error?: string }> {
  const guildId = process.env.DISCORD_GUILD_ID;
  const roleId = process.env.DISCORD_SUBSCRIBER_ROLE_ID;

  if (!guildId || !roleId) {
    return { success: false, error: 'Discord configuration missing' };
  }

  if (!client || !isReady) {
    await connectDiscordBot();
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    if (!isReady) {
      return { success: false, error: 'Discord bot not connected' };
    }
  }

  try {
    const guild = await client!.guilds.fetch(guildId);
    const member = await guild.members.fetch(discordId);
    
    if (!member) {
      return { success: false, error: 'User not found in server' };
    }

    await member.roles.remove(roleId);
    
    console.log(`✅ Role revoked from ${member.user.tag} (${discordId})`);
    return { success: true };
  } catch (error: any) {
    console.error('Error revoking role:', error);
    return { success: false, error: error.message };
  }
}

// Проверка наличия роли у пользователя
export async function checkRole(discordId: string): Promise<{ hasRole: boolean; error?: string }> {
  const guildId = process.env.DISCORD_GUILD_ID;
  const roleId = process.env.DISCORD_SUBSCRIBER_ROLE_ID;

  if (!guildId || !roleId) {
    return { hasRole: false, error: 'Discord configuration missing' };
  }

  if (!client || !isReady) {
    await connectDiscordBot();
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    if (!isReady) {
      return { hasRole: false, error: 'Discord bot not connected' };
    }
  }

  try {
    const guild = await client!.guilds.fetch(guildId);
    const member = await guild.members.fetch(discordId);
    
    if (!member) {
      return { hasRole: false, error: 'User not found in server' };
    }

    const hasRole = member.roles.cache.has(roleId);
    return { hasRole };
  } catch (error: any) {
    console.error('Error checking role:', error);
    return { hasRole: false, error: error.message };
  }
}

// Отправка DM пользователю
export async function sendDM(discordId: string, message: string): Promise<{ success: boolean; error?: string }> {
  if (!client || !isReady) {
    await connectDiscordBot();
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    if (!isReady) {
      return { success: false, error: 'Discord bot not connected' };
    }
  }

  try {
    const user = await client!.users.fetch(discordId);
    await user.send(message);
    return { success: true };
  } catch (error: any) {
    console.error('Error sending DM:', error);
    return { success: false, error: error.message };
  }
}

// Получение информации о пользователе
export async function getUserInfo(discordId: string): Promise<any> {
  const guildId = process.env.DISCORD_GUILD_ID;

  if (!guildId) {
    return null;
  }

  if (!client || !isReady) {
    await connectDiscordBot();
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    if (!isReady) {
      return null;
    }
  }

  try {
    const guild = await client!.guilds.fetch(guildId);
    const member = await guild.members.fetch(discordId);
    
    return {
      id: member.user.id,
      username: member.user.username,
      discriminator: member.user.discriminator,
      displayName: member.displayName,
      avatar: member.user.avatarURL(),
      joinedAt: member.joinedAt
    };
  } catch (error) {
    console.error('Error getting user info:', error);
    return null;
  }
}

// Закрытие соединения
export async function disconnectDiscordBot(): Promise<void> {
  if (client) {
    client.destroy();
    client = null;
    isReady = false;
    console.log('Discord bot disconnected');
  }
}
