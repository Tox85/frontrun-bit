import dotenv from 'dotenv';
import { BotConfig, TradingConfig } from '../types';

// Charger les variables d'environnement
dotenv.config();

function resolveEnv(name: string, fallback?: string, options: { allowEmptyInTest?: boolean } = {}): string {
  const value = process.env[name];
  const isTestEnv = process.env.NODE_ENV === 'test';
  const allowTestDefaults = process.env.ALLOW_TEST_DEFAULTS !== 'false';

  if (value !== undefined && value !== '') {
    return value;
  }

  if (isTestEnv && allowTestDefaults) {
    if (fallback !== undefined) {
      return fallback;
    }

    if (options.allowEmptyInTest) {
      return '';
    }
  }

  throw new Error(`Variable d'environnement manquante: ${name}`);
}

function loadTradingConfig(): TradingConfig {
  const liveMode = (process.env.LIVE_MODE || 'false').toLowerCase() === 'true';
  const tradingBudget = parseFloat(process.env.TRADING_BUDGET || '0');
  const leverage = parseFloat(process.env.LEVERAGE || '1');
  const stopLossPercent = parseFloat(process.env.STOP_LOSS_PERCENT || '3');
  const takeProfitPercent = process.env.TAKE_PROFIT_PERCENT
    ? parseFloat(process.env.TAKE_PROFIT_PERCENT)
    : undefined;
  const maxHoldTimeMs = parseInt(process.env.MAX_HOLD_TIME_MS || '180000', 10);
  const timeBeforeExecutionSec = parseInt(process.env.TIME_BEFORE_EXECUTION || '0', 10);
  const quoteCurrencies = (process.env.QUOTE_CURRENCIES || 'USDT,USDC')
    .split(',')
    .map(symbol => symbol.trim().toUpperCase())
    .filter(Boolean);

  if (Number.isNaN(tradingBudget) || tradingBudget < 0) {
    throw new Error('TRADING_BUDGET doit être un nombre positif');
  }

  if (Number.isNaN(stopLossPercent) || stopLossPercent < 0) {
    throw new Error('STOP_LOSS_PERCENT doit être un nombre positif');
  }

  if (Number.isNaN(leverage) || leverage <= 0) {
    throw new Error('LEVERAGE doit être un nombre supérieur à 0');
  }

  if (Number.isNaN(maxHoldTimeMs) || maxHoldTimeMs < 0) {
    throw new Error('MAX_HOLD_TIME_MS doit être un nombre positif');
  }

  if (Number.isNaN(timeBeforeExecutionSec) || timeBeforeExecutionSec < 0) {
    throw new Error('TIME_BEFORE_EXECUTION doit être un nombre positif');
  }

  const tradingConfig: TradingConfig = {
    liveMode,
    tradingBudget,
    leverage,
    stopLossPercent,
    takeProfitPercent,
    maxHoldTimeMs,
    timeBeforeExecutionSec,
    quoteCurrencies: quoteCurrencies.length > 0 ? quoteCurrencies : ['USDT'],
    exchanges: {
      bybit: {
        enabled: (process.env.ENABLE_BYBIT || 'true').toLowerCase() !== 'false',
        id: 'bybit',
        credentials: {
          apiKey: process.env.BYBIT_API_KEY,
          secret: process.env.BYBIT_API_SECRET
        }
      },
      hyperliquid: {
        enabled: (process.env.ENABLE_HYPERLIQUID || 'true').toLowerCase() !== 'false',
        id: 'hyperliquid',
        credentials: {
          apiKey: process.env.HYPERLIQUID_API_KEY,
          secret: process.env.HYPERLIQUID_API_SECRET,
          password: process.env.HYPERLIQUID_PASSWORD
        }
      }
    }
  };

  return tradingConfig;
}

export function loadConfig(): BotConfig {
  const isTestEnv = process.env.NODE_ENV === 'test';

  const telegramBotToken = resolveEnv(
    'TELEGRAM_BOT_TOKEN',
    '123456:TEST-TOKEN',
    { allowEmptyInTest: true }
  );

  const telegramChatId = resolveEnv(
    'TELEGRAM_CHAT_ID',
    '-1000000000000',
    { allowEmptyInTest: true }
  );

  const config: BotConfig = {
    telegramBotToken,
    telegramChatId,
    pollMs: parseInt(process.env.POLL_MS || '300', 10),
    targetUrl: process.env.TARGET_URL || 'https://feed.bithumb.com/notice?category=9&page=1',
    useProxy: process.env.USE_PROXY === 'true',
    proxyUrl: process.env.PROXY_URL,
    logLevel: process.env.LOG_LEVEL || (isTestEnv ? 'warn' : 'info'),
    logFormat: process.env.LOG_FORMAT || 'text',
    trading: loadTradingConfig()
  };

  // Validation des valeurs
  if (Number.isNaN(config.pollMs) || config.pollMs < 100) {
    throw new Error('POLL_MS doit être d\'au moins 100ms pour éviter la surcharge');
  }

  if (config.pollMs > 5000) {
    throw new Error('POLL_MS ne doit pas dépasser 5000ms pour maintenir la réactivité');
  }

  if (config.useProxy && !config.proxyUrl) {
    throw new Error('PROXY_URL est requis quand USE_PROXY est activé');
  }

  return config;
}

export function validateTelegramConfig(config: BotConfig): boolean {
  // Vérifier le format du token Telegram
  const tokenRegex = /^\d+:[A-Za-z0-9_-]+$/;
  if (!tokenRegex.test(config.telegramBotToken)) {
    console.error('Format de token Telegram invalide');
    return false;
  }

  // Vérifier le format du chat ID
  const chatIdRegex = /^-?\d+$/;
  if (!chatIdRegex.test(config.telegramChatId)) {
    console.error('Format de chat ID Telegram invalide');
    return false;
  }

  return true;
}
