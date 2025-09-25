import dotenv from 'dotenv';
import { BotConfig } from '../types';

// Charger les variables d'environnement
dotenv.config();

export function loadConfig(): BotConfig {
  const requiredEnvVars = [
    'TELEGRAM_BOT_TOKEN',
    'TELEGRAM_CHAT_ID'
  ];

  // Vérifier que toutes les variables requises sont présentes
  for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
      throw new Error(`Variable d'environnement manquante: ${envVar}`);
    }
  }

  const config: BotConfig = {
    telegramBotToken: process.env.TELEGRAM_BOT_TOKEN!,
    telegramChatId: process.env.TELEGRAM_CHAT_ID!,
    pollMs: parseInt(process.env.POLL_MS || '300'),
    targetUrl: process.env.TARGET_URL || 'https://feed.bithumb.com/notice?category=9&page=1',
    useProxy: process.env.USE_PROXY === 'true',
    proxyUrl: process.env.PROXY_URL,
    logLevel: process.env.LOG_LEVEL || 'info',
    logFormat: process.env.LOG_FORMAT || 'text'
  };

  // Force debug

  // Validation des valeurs
  if (config.pollMs < 100) {
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
