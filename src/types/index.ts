export interface Announcement {
  id: string;
  title: string;
  timestamp?: string;
  url?: string;
}

export interface AnnouncementData {
  announcements: Announcement[];
  buildId?: string;
  timestamp?: string;
}

export interface DetectionMetrics {
  latency_since_last_check_ms: number;
  parse_time_ms: number;
  telegram_send_time_ms: number;
  announce_delay_ms?: number;
}

export interface DetectionEvent {
  timestamp: string;
  event: 'NEW_TOKEN';
  title: string;
  symbol: string;
  metrics: DetectionMetrics;
}

export interface ExchangeCredentials {
  apiKey?: string;
  secret?: string;
  password?: string;
}

export interface TradingExchangeConfig {
  enabled: boolean;
  id: string;
  credentials: ExchangeCredentials;
}

export interface TradingConfig {
  liveMode: boolean;
  tradingBudget: number;
  leverage: number;
  stopLossPercent: number;
  takeProfitPercent?: number;
  maxHoldTimeMs: number;
  timeBeforeExecutionSec: number;
  quoteCurrencies: string[];
  exchanges: {
    bybit: TradingExchangeConfig;
    hyperliquid: TradingExchangeConfig;
  };
}

export interface BotConfig {
  telegramBotToken: string;
  telegramChatId: string;
  pollMs: number;
  targetUrl: string;
  useProxy: boolean;
  proxyUrl?: string;
  logLevel: string;
  logFormat: string;
  trading: TradingConfig;
}

export interface TradeExecutionDetails {
  exchange: string;
  marketSymbol: string;
  side: 'buy' | 'sell';
  amount: number;
  entryPrice: number;
  exitPrice?: number;
  profit?: number;
  profitPercent?: number;
  orderId?: string;
  status: 'simulated' | 'pending' | 'filled' | 'closed' | 'failed';
  mode: 'live' | 'paper';
  error?: string;
}
