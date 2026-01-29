// Типы для системы подписок

export interface User {
  id: string;
  telegramId: number;
  telegramUsername?: string;
  telegramFirstName?: string;
  telegramLastName?: string;
  discordId?: string;
  discordUsername?: string;
  email?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateUserData {
  telegramId: number;
  telegramUsername?: string;
  telegramFirstName?: string;
  telegramLastName?: string;
  discordId?: string;
  discordUsername?: string;
  email?: string;
}

export interface UpdateUserData {
  discordId?: string;
  discordUsername?: string;
  email?: string;
  telegramUsername?: string;
}

export type SubscriptionStatus = 'pending' | 'active' | 'expired' | 'cancelled';

export interface Subscription {
  id: string;
  userId: string;
  pricingId?: string;
  periodMonths: number;
  amount: number;
  currency: string;
  status: SubscriptionStatus;
  startDate?: string;
  endDate?: string;
  discordRoleGranted: boolean;
  notionAccessGranted: boolean;
  autoRenew: boolean;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  // Joined data
  user?: User;
}

export interface CreateSubscriptionData {
  userId: string;
  pricingId?: string;
  periodMonths: number;
  amount: number;
  currency?: string;
  status?: SubscriptionStatus;
  autoRenew?: boolean;
  notes?: string;
}

export interface UpdateSubscriptionData {
  status?: SubscriptionStatus;
  startDate?: string;
  endDate?: string;
  discordRoleGranted?: boolean;
  notionAccessGranted?: boolean;
  autoRenew?: boolean;
  notes?: string;
}

export type PaymentStatus = 'pending' | 'completed' | 'failed' | 'refunded' | 'cancelled';

export interface Payment {
  id: string;
  subscriptionId: string;
  userId: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  paymentMethod?: string;
  externalId?: string;
  providerData?: Record<string, any>;
  errorMessage?: string;
  paidAt?: string;
  createdAt: string;
  updatedAt: string;
  // Joined data
  user?: User;
  subscription?: Subscription;
}

export interface CreatePaymentData {
  subscriptionId: string;
  userId: string;
  amount: number;
  currency?: string;
  paymentMethod?: string;
}

export interface UpdatePaymentData {
  status?: PaymentStatus;
  externalId?: string;
  providerData?: Record<string, any>;
  errorMessage?: string;
  paidAt?: string;
}

export type BotState = 'idle' | 'awaiting_plan' | 'awaiting_discord' | 'awaiting_email' | 'awaiting_payment' | 'awaiting_confirmation';

export interface UserBotState {
  id: string;
  telegramId: number;
  state: BotState;
  data?: {
    selectedPlanId?: string;
    selectedPeriod?: number;
    discordId?: string;
    email?: string;
    amount?: number;
    currency?: string;
  };
  expiresAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SubscriptionLog {
  id: string;
  userId?: string;
  subscriptionId?: string;
  action: string;
  details?: Record<string, any>;
  createdAt: string;
}

// Statistics types for admin panel
export interface SubscriptionStats {
  total: number;
  active: number;
  pending: number;
  expired: number;
  cancelled: number;
  totalRevenue: number;
  thisMonthRevenue: number;
}

export interface UserStats {
  total: number;
  withActiveSubscription: number;
  withDiscord: number;
  withNotion: number;
}

export interface PaymentStats {
  total: number;
  completed: number;
  pending: number;
  failed: number;
  totalAmount: number;
  thisMonthAmount: number;
}
