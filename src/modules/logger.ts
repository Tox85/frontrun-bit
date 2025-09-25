import { DetectionEvent, DetectionMetrics, BotConfig } from '../types';

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3
}

export class Logger {
  private config: BotConfig;
  private logLevel: LogLevel;
  private isJsonFormat: boolean;

  constructor(config: BotConfig) {
    this.config = config;
    this.logLevel = this.parseLogLevel(config.logLevel);
    this.isJsonFormat = config.logFormat.toLowerCase() === 'json';
  }

  private parseLogLevel(level: string): LogLevel {
    switch (level.toLowerCase()) {
      case 'debug': return LogLevel.DEBUG;
      case 'info': return LogLevel.INFO;
      case 'warn': return LogLevel.WARN;
      case 'error': return LogLevel.ERROR;
      default: return LogLevel.INFO;
    }
  }

  /**
   * Log un événement de détection de nouveau token
   */
  logDetection(event: DetectionEvent): void {
    if (this.isJsonFormat) {
      console.log(JSON.stringify(event));
    } else {
      const timestamp = new Date(event.timestamp).toLocaleString('fr-FR');
      console.log(`[${timestamp}] 🔔 NOUVEAU TOKEN DÉTECTÉ: ${event.symbol}`);
      console.log(`  📝 Titre: ${event.title}`);
      console.log(`  ⚡ Latence: ${event.metrics.latency_since_last_check_ms}ms`);
      console.log(`  🔍 Parse: ${event.metrics.parse_time_ms}ms`);
      console.log(`  📤 Telegram: ${event.metrics.telegram_send_time_ms}ms`);
      
      if (event.metrics.announce_delay_ms !== undefined) {
        console.log(`  ⏰ Délai annonce: ${event.metrics.announce_delay_ms}ms`);
      }
      console.log('');
    }
  }

  /**
   * Log un message de debug
   */
  debug(message: string, data?: any): void {
    if (this.logLevel <= LogLevel.DEBUG) {
      this.log(LogLevel.DEBUG, message, data);
    }
  }

  /**
   * Log un message d'information
   */
  info(message: string, data?: any): void {
    if (this.logLevel <= LogLevel.INFO) {
      this.log(LogLevel.INFO, message, data);
    }
  }

  /**
   * Log un avertissement
   */
  warn(message: string, data?: any): void {
    if (this.logLevel <= LogLevel.WARN) {
      this.log(LogLevel.WARN, message, data);
    }
  }

  /**
   * Log une erreur
   */
  error(message: string, error?: Error | any): void {
    if (this.logLevel <= LogLevel.ERROR) {
      this.log(LogLevel.ERROR, message, error);
    }
  }

  /**
   * Log un cycle de polling
   */
  logPollingCycle(
    cycleNumber: number,
    latency: number,
    parseTime: number,
    hasNewAnnouncements: boolean,
    error?: string
  ): void {
    if (this.logLevel <= LogLevel.DEBUG) {
      const status = error ? '❌ ERREUR' : (hasNewAnnouncements ? '🆕 NOUVEAU' : '✅ OK');
      const message = `Cycle #${cycleNumber} - ${status} - Latence: ${latency}ms, Parse: ${parseTime}ms`;
      
      if (error) {
        this.debug(message, { error });
      } else {
        this.debug(message);
      }
    }
  }

  /**
   * Log les métriques de performance
   */
  logPerformanceMetrics(metrics: {
    totalCycles: number;
    totalDetections: number;
    averageLatency: number;
    averageParseTime: number;
    averageTelegramTime: number;
    uptime: string;
    errorRate: number;
  }): void {
    if (this.isJsonFormat) {
      console.log(JSON.stringify({
        timestamp: new Date().toISOString(),
        event: 'PERFORMANCE_METRICS',
        ...metrics
      }));
    } else {
      console.log('\n📊 MÉTRIQUES DE PERFORMANCE');
      console.log('============================');
      console.log(`🔄 Cycles totaux: ${metrics.totalCycles}`);
      console.log(`🔍 Détections: ${metrics.totalDetections}`);
      console.log(`⚡ Latence moyenne: ${Math.round(metrics.averageLatency)}ms`);
      console.log(`🔍 Parse moyen: ${Math.round(metrics.averageParseTime)}ms`);
      console.log(`📤 Telegram moyen: ${Math.round(metrics.averageTelegramTime)}ms`);
      console.log(`⏱️ Uptime: ${metrics.uptime}`);
      console.log(`❌ Taux d'erreur: ${(metrics.errorRate * 100).toFixed(2)}%`);
      console.log('');
    }
  }

  /**
   * Log le démarrage du bot
   */
  logStartup(config: BotConfig): void {
    this.info('🚀 Démarrage de BithumbBot');
    this.info(`📡 URL cible: ${config.targetUrl}`);
    this.info(`⏱️ Intervalle de polling: ${config.pollMs}ms`);
    this.info(`🔧 Proxy: ${config.useProxy ? 'Activé' : 'Désactivé'}`);
    this.info(`📝 Format de log: ${config.logFormat}`);
    this.info(`📊 Niveau de log: ${config.logLevel}`);
  }

  /**
   * Log l'arrêt du bot
   */
  logShutdown(reason: string): void {
    this.info(`🛑 Arrêt de BithumbBot: ${reason}`);
  }

  /**
   * Log une erreur de connexion
   */
  logConnectionError(error: string, retryCount: number, maxRetries: number): void {
    this.warn(`🔌 Erreur de connexion (${retryCount}/${maxRetries}): ${error}`);
  }

  /**
   * Log une récupération après erreur
   */
  logRecovery(): void {
    this.info('✅ Connexion rétablie');
  }

  /**
   * Méthode privée pour formater et afficher les logs
   */
  private log(level: LogLevel, message: string, data?: any): void {
    const timestamp = new Date().toISOString();
    const levelStr = LogLevel[level];
    const emoji = this.getLevelEmoji(level);

    if (this.isJsonFormat) {
      const logEntry: any = {
        timestamp,
        level: levelStr,
        message
      };
      
      if (data) {
        logEntry.data = data;
      }
      
      console.log(JSON.stringify(logEntry));
    } else {
      const formattedMessage = `[${timestamp}] ${emoji} ${levelStr}: ${message}`;
      
      if (data) {
        console.log(formattedMessage, data);
      } else {
        console.log(formattedMessage);
      }
    }
  }

  private getLevelEmoji(level: LogLevel): string {
    switch (level) {
      case LogLevel.DEBUG: return '🔍';
      case LogLevel.INFO: return 'ℹ️';
      case LogLevel.WARN: return '⚠️';
      case LogLevel.ERROR: return '❌';
      default: return '📝';
    }
  }

  /**
   * Crée un objet DetectionEvent pour le logging
   */
  createDetectionEvent(
    title: string,
    symbol: string,
    metrics: DetectionMetrics
  ): DetectionEvent {
    return {
      timestamp: new Date().toISOString(),
      event: 'NEW_TOKEN',
      title,
      symbol,
      metrics
    };
  }
}
