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

export interface BotConfig {
  telegramBotToken: string;
  telegramChatId: string;
  pollMs: number;
  targetUrl: string;
  useProxy: boolean;
  proxyUrl?: string;
  logLevel: string;
  logFormat: string;
}
