import { loadConfig, validateTelegramConfig } from './config';
import { AnnouncementFetcher } from './modules/fetcher';
import { AnnouncementAnalyzer } from './modules/analyzer';
import { TelegramNotifier } from './modules/telegram';
import { Logger } from './modules/logger';
import { BotConfig, DetectionMetrics } from './types';
import * as cheerio from 'cheerio';
import * as http from 'http';

class BithumbBot {
  private config: BotConfig;
  private fetcher: AnnouncementFetcher;
  private notifier: TelegramNotifier;
  private logger: Logger;
  private lastSeenId: string | null = null;
  private lastDetectionAt: string | null = null;
  private isRunning: boolean = false;
  private cycleCount: number = 0;
  private detectionCount: number = 0;
  private errorCount: number = 0;
  private startTime: number = Date.now();
  private performanceMetrics: {
    totalLatency: number;
    totalParseTime: number;
    totalTelegramTime: number;
  } = {
    totalLatency: 0,
    totalParseTime: 0,
    totalTelegramTime: 0
  };

  constructor() {
    try {
      this.config = loadConfig();
      this.fetcher = new AnnouncementFetcher(this.config);
      this.notifier = new TelegramNotifier(this.config);
      this.logger = new Logger(this.config);
    } catch (error) {
      console.error('Erreur lors de l\'initialisation du bot:', error);
      process.exit(1);
    }
  }

  /**
   * Démarre le bot
   */
  async start(): Promise<void> {
    try {
      this.logger.logStartup(this.config);

      // Valider la configuration Telegram
      if (!validateTelegramConfig(this.config)) {
        throw new Error('Configuration Telegram invalide');
      }

      // Tester la connexion Telegram (mode non-bloquant)
      try {
        const telegramTest = await this.notifier.testConnection();
        if (telegramTest.success) {
          this.logger.info('✅ Connexion Telegram validée');
        } else {
          this.logger.warn(`⚠️ Connexion Telegram échouée: ${telegramTest.error}`);
          this.logger.warn('⚠️ Le bot continuera sans notifications Telegram');
        }
      } catch (error) {
        this.logger.warn(`⚠️ Erreur lors du test Telegram: ${error instanceof Error ? error.message : String(error)}`);
        this.logger.warn('⚠️ Le bot continuera sans notifications Telegram');
      }

      // Initialiser le lastSeenId
      await this.initializeLastSeenId();

      this.isRunning = true;
      this.logger.info('🚀 Bot démarré avec succès');

      // Message de démarrage supprimé - Telegram réservé aux détections uniquement

      // Log périodique toutes les 30s
      this.startStatusCheckInterval();

      // Endpoint /healthz pour monitoring
      this.startHealthServer();

      // Démarrer la boucle de polling
      await this.startPollingLoop();

    } catch (error) {
      console.error('Erreur détaillée lors du démarrage:', error);
      this.logger.error('Erreur lors du démarrage du bot', error);
      await this.shutdown('Erreur de démarrage');
    }
  }

  /**
   * Initialise le lastSeenId avec la première annonce
   */
  private async initializeLastSeenId(): Promise<void> {
    try {
      this.logger.info('🔍 Initialisation du lastSeenId...');
      const data = await this.fetcher.fetchAnnouncements();
      
      if (data.announcements && data.announcements.length > 0) {
        const newestId = data.announcements[0].id;
        
                // Initialisation propre du lastSeenId
                if (!this.lastSeenId && newestId) {
                  this.lastSeenId = newestId;
                  this.lastDetectionAt = new Date().toISOString();
                  console.log("Init lastSeenId =", newestId);
                }
        
        this.logger.info(`✅ LastSeenId initialisé: ${this.lastSeenId}`);
      } else {
        this.logger.warn('⚠️ Aucune annonce trouvée lors de l\'initialisation');
      }
    } catch (error) {
      this.logger.error('Erreur lors de l\'initialisation du lastSeenId', error);
      throw error;
    }
  }

  /**
   * Boucle principale de polling
   */
  private async startPollingLoop(): Promise<void> {
    while (this.isRunning) {
      const cycleStart = process.hrtime.bigint();
      
      try {
        await this.pollingCycle();
        this.cycleCount++;
        
        // Log des métriques périodiques
        if (this.cycleCount % 100 === 0) {
          this.logPerformanceMetrics();
        }
        
      } catch (error) {
        this.errorCount++;
        this.logger.error('Erreur dans le cycle de polling', error);
        
        // Envoyer une notification d'erreur si le taux d'erreur est élevé
        if (this.errorCount % 10 === 0) {
          await this.notifier.sendErrorMessage(
            `Erreur de polling (${this.errorCount} erreurs)`,
            `Cycle #${this.cycleCount}`
          );
        }
      }

      // Calculer le délai pour la prochaine itération
      const cycleEnd = process.hrtime.bigint();
      const cycleDuration = Number(cycleEnd - cycleStart) / 1e6; // Convertir en ms
      const delay = Math.max(0, this.config.pollMs - cycleDuration);
      
      // Attendre avant la prochaine itération
      if (delay > 0) {
        await this.sleep(delay);
      }
    }
  }

  /**
   * Exécute un cycle de polling
   */
  private async pollingCycle(): Promise<void> {
    const startTime = process.hrtime.bigint();
    let parseTime = 0;
    let hasNewAnnouncements = false;

    try {
      // Récupérer les annonces
      const data = await this.fetcher.fetchAnnouncements();
      
      const parseStart = process.hrtime.bigint();
      
      if (data.announcements && data.announcements.length > 0) {
        // Trouver les nouvelles annonces
        const newAnnouncements = AnnouncementAnalyzer.findNewAnnouncements(
          data.announcements,
          this.lastSeenId
        );

        if (newAnnouncements.length > 0) {
          hasNewAnnouncements = true;
          
          // Traiter chaque nouvelle annonce
          for (const announcement of newAnnouncements) {
            await this.processNewAnnouncement(announcement);
          }
          
          // Mettre à jour le lastSeenId
          this.lastSeenId = data.announcements[0].id;
        }
      }
      
      const parseEnd = process.hrtime.bigint();
      parseTime = Number(parseEnd - parseStart) / 1e6;
      
    } catch (error) {
      this.logger.error('Erreur lors du cycle de polling', error);
      throw error;
    } finally {
      const endTime = process.hrtime.bigint();
      const totalLatency = Number(endTime - startTime) / 1e6;
      
      // Mettre à jour les métriques
      this.performanceMetrics.totalLatency += totalLatency;
      this.performanceMetrics.totalParseTime += parseTime;
      
      // Logger le cycle
      this.logger.logPollingCycle(
        this.cycleCount + 1,
        totalLatency,
        parseTime,
        hasNewAnnouncements
      );
    }
  }

  /**
   * Traite une nouvelle annonce détectée
   */
  private async processNewAnnouncement(announcement: any): Promise<void> {
    const detectionStart = process.hrtime.bigint();
    
    try {
      // Analyser l'annonce
      const analysis = AnnouncementAnalyzer.parseAnnouncement(announcement);
      
      if (!analysis.isValid || !analysis.symbol) {
        this.logger.warn(`Annonce invalide ignorée: ${announcement.title}`);
        return;
      }

      this.detectionCount++;
      this.lastDetectionAt = new Date().toISOString();
      this.logger.info(`🆕 Nouvelle annonce détectée: ${analysis.symbol}`);

      // Calculer les métriques
      const detectionTime = new Date().toISOString();
      const announceDelay = announcement.timestamp 
        ? AnnouncementAnalyzer.calculateAnnounceDelay(announcement.timestamp, detectionTime)
        : undefined;

      // Envoyer la notification Telegram
      const telegramStart = process.hrtime.bigint();
      const telegramResult = await this.notifier.sendNewTokenAlert(
        analysis.symbol,
        analysis.formattedTitle,
        detectionTime,
        announceDelay || undefined
      );
      const telegramEnd = process.hrtime.bigint();
      const telegramTime = Number(telegramEnd - telegramStart) / 1e6;

      // Mettre à jour les métriques
      this.performanceMetrics.totalTelegramTime += telegramTime;

      // Créer l'événement de détection
      const metrics: DetectionMetrics = {
        latency_since_last_check_ms: this.config.pollMs,
        parse_time_ms: 0, // Sera calculé dans le cycle principal
        telegram_send_time_ms: telegramTime,
        announce_delay_ms: announceDelay || undefined
      };

      const detectionEvent = this.logger.createDetectionEvent(
        analysis.formattedTitle,
        analysis.symbol,
        metrics
      );

      // Logger l'événement
      this.logger.logDetection(detectionEvent);

      // Vérifier si l'envoi Telegram a réussi
      if (!telegramResult.success) {
        this.logger.error(`Échec de l'envoi Telegram: ${telegramResult.error}`);
      }

    } catch (error) {
      this.logger.error('Erreur lors du traitement de l\'annonce', error);
    }
  }

  /**
   * Affiche les métriques de performance
   */
  private logPerformanceMetrics(): void {
    const uptime = this.formatUptime(Date.now() - this.startTime);
    const errorRate = this.cycleCount > 0 ? this.errorCount / this.cycleCount : 0;
    
    const metrics = {
      totalCycles: this.cycleCount,
      totalDetections: this.detectionCount,
      averageLatency: this.cycleCount > 0 ? this.performanceMetrics.totalLatency / this.cycleCount : 0,
      averageParseTime: this.cycleCount > 0 ? this.performanceMetrics.totalParseTime / this.cycleCount : 0,
      averageTelegramTime: this.detectionCount > 0 ? this.performanceMetrics.totalTelegramTime / this.detectionCount : 0,
      uptime,
      errorRate
    };

    this.logger.logPerformanceMetrics(metrics);
  }

  /**
   * Formate le temps d'activité
   */
  private formatUptime(ms: number): string {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) {
      return `${days}j ${hours % 24}h ${minutes % 60}m`;
    } else if (hours > 0) {
      return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  }

  /**
   * Met en pause l'exécution
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Endpoint /healthz pour monitoring
   */
  private startHealthServer(): void {
    const server = http.createServer((req, res) => {
      if (req.url === "/healthz") {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({
          status: "ok",
          lastSeenId: this.lastSeenId,
          lastDetectionAt: this.lastDetectionAt,
          uptime: process.uptime(),
          pollMs: this.config.pollMs
        }));
      } else {
        res.writeHead(404);
        res.end();
      }
    });

    const port = process.env.PORT || 3000;
    server.listen(port, () => {
      console.log(`🏥 Health server started on port ${port}`);
    });
  }

  /**
   * Log périodique toutes les 30s
   */
  private startStatusCheckInterval(): void {
    setInterval(async () => {
      try {
        // Utiliser le Worker Cloudflare comme le bot principal
        const proxyUrl = `${this.config.proxyUrl}?url=${encodeURIComponent(this.config.targetUrl)}`;
        const res = await fetch(proxyUrl);
        const html = await res.text();
        const $ = cheerio.load(html);

        // Chercher le premier lien d'annonce
        const first = $("a[href*='/notice/']").first();
        const title = first.text().trim();
        const href = first.attr("href") || "";
        const id = href.split("/").pop() || "";

        // Extraire le symbole
        const symbolExtracted = AnnouncementAnalyzer.extractSymbol(title);

        console.log(JSON.stringify({
          timestamp: new Date().toISOString(),
          event: "STATUS_CHECK",
          topId: id,
          topTitle: title,
          symbolExtracted: symbolExtracted
        }));
      } catch (e) {
        console.error("STATUS_CHECK error", e);
      }
    }, 30_000);
  }

  /**
   * Arrête le bot
   */
  async shutdown(reason: string): Promise<void> {
    this.logger.logShutdown(reason);
    this.isRunning = false;
    
    // Afficher les métriques finales
    this.logPerformanceMetrics();
    
    // Message d'arrêt supprimé - Telegram réservé aux détections uniquement
    
    process.exit(0);
  }
}

// Gestion des signaux d'arrêt
process.on('SIGINT', async () => {
  console.log('\n🛑 Signal d\'arrêt reçu...');
  if (global.bot) {
    await global.bot.shutdown('Signal SIGINT');
  } else {
    process.exit(0);
  }
});

process.on('SIGTERM', async () => {
  console.log('\n🛑 Signal de terminaison reçu...');
  if (global.bot) {
    await global.bot.shutdown('Signal SIGTERM');
  } else {
    process.exit(0);
  }
});

// Gestion des erreurs non capturées
process.on('uncaughtException', async (error) => {
  console.error('❌ Erreur non capturée:', error);
  if (global.bot) {
    await global.bot.shutdown('Erreur non capturée');
  } else {
    process.exit(1);
  }
});

process.on('unhandledRejection', async (reason, promise) => {
  console.error('❌ Promesse rejetée non gérée:', reason);
  if (global.bot) {
    await global.bot.shutdown('Promesse rejetée non gérée');
  } else {
    process.exit(1);
  }
});

// Déclaration globale pour le bot
declare global {
  var bot: BithumbBot | undefined;
}

// Point d'entrée principal
async function main() {
  try {
    const bot = new BithumbBot();
    global.bot = bot;
    await bot.start();
  } catch (error) {
    console.error('❌ Erreur fatale:', error);
    process.exit(1);
  }
}

// Démarrer le bot
if (require.main === module) {
  main();
}

export { BithumbBot };
