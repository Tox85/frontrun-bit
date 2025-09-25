import axios, { AxiosResponse } from 'axios';
import { BotConfig } from '../types';

export class TelegramNotifier {
  private config: BotConfig;
  private baseUrl: string;

  constructor(config: BotConfig) {
    this.config = config;
    this.baseUrl = `https://api.telegram.org/bot${config.telegramBotToken}`;
  }

  /**
   * Envoie une notification de nouveau token détecté
   */
  async sendNewTokenAlert(
    symbol: string,
    title: string,
    detectionTime: string,
    announceDelay?: number
  ): Promise<{ success: boolean; responseTime: number; error?: string }> {
    const startTime = process.hrtime.bigint();
    
    try {
      const message = this.formatNewTokenMessage(symbol, title, detectionTime, announceDelay);
      
      const response: AxiosResponse = await axios.post(
        `${this.baseUrl}/sendMessage`,
        {
          chat_id: this.config.telegramChatId,
          text: message,
          parse_mode: 'HTML',
          disable_web_page_preview: true
        },
        {
          timeout: 10000,
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );

      const endTime = process.hrtime.bigint();
      const responseTime = Number(endTime - startTime) / 1e6; // Convertir en millisecondes

      if (response.status === 200 && response.data.ok) {
        return {
          success: true,
          responseTime
        };
      } else {
        return {
          success: false,
          responseTime,
          error: `Erreur API Telegram: ${response.data.description || 'Unknown error'}`
        };
      }
    } catch (error: any) {
      const endTime = process.hrtime.bigint();
      const responseTime = Number(endTime - startTime) / 1e6;
      
      return {
        success: false,
        responseTime,
        error: error.message || 'Erreur inconnue lors de l\'envoi'
      };
    }
  }

  /**
   * Formate le message de notification
   */
  private formatNewTokenMessage(
    symbol: string,
    title: string,
    detectionTime: string,
    announceDelay?: number
  ): string {
    let message = `🔔 <b>Nouveau token détecté : ${symbol}</b>\n\n`;
    message += `📝 <b>Titre :</b> ${title}\n`;
    message += `⏰ <b>Heure de détection :</b> <code>${detectionTime}</code>\n`;
    
    if (announceDelay !== undefined && announceDelay !== null) {
      const delaySeconds = Math.round(announceDelay / 1000 * 100) / 100;
      message += `⚡ <b>Délai de détection :</b> ${delaySeconds}s après l'annonce officielle\n`;
    }
    
    message += `\n🚀 <i>Détection ultra-rapide par BithumbBot</i>`;
    
    return message;
  }

  /**
   * Envoie un message de statut du bot
   */
  async sendStatusMessage(message: string): Promise<boolean> {
    try {
      const response = await axios.post(
        `${this.baseUrl}/sendMessage`,
        {
          chat_id: this.config.telegramChatId,
          text: `🤖 <b>BithumbBot Status</b>\n\n${message}`,
          parse_mode: 'HTML'
        },
        { timeout: 5000 }
      );

      return response.status === 200 && response.data.ok;
    } catch (error) {
      console.error('Erreur lors de l\'envoi du message de statut:', error);
      return false;
    }
  }

  /**
   * Envoie un message d'erreur
   */
  async sendErrorMessage(error: string, context?: string): Promise<boolean> {
    try {
      let message = `❌ <b>Erreur BithumbBot</b>\n\n`;
      message += `<code>${error}</code>\n`;
      
      if (context) {
        message += `\n📋 <b>Contexte :</b> ${context}`;
      }
      
      message += `\n\n⏰ <i>${new Date().toISOString()}</i>`;

      const response = await axios.post(
        `${this.baseUrl}/sendMessage`,
        {
          chat_id: this.config.telegramChatId,
          text: message,
          parse_mode: 'HTML'
        },
        { timeout: 5000 }
      );

      return response.status === 200 && response.data.ok;
    } catch (err) {
      console.error('Erreur lors de l\'envoi du message d\'erreur:', err);
      return false;
    }
  }

  /**
   * Teste la connexion au bot Telegram
   */
  async testConnection(): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await axios.get(
        `${this.baseUrl}/getMe`,
        { timeout: 5000 }
      );

      if (response.status === 200 && response.data.ok) {
        return {
          success: true
        };
      } else {
        return {
          success: false,
          error: 'Réponse invalide de l\'API Telegram'
        };
      }
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Erreur de connexion'
      };
    }
  }

  /**
   * Envoie un rapport de performance
   */
  async sendPerformanceReport(
    totalDetections: number,
    averageLatency: number,
    uptime: string
  ): Promise<boolean> {
    try {
      let message = `📊 <b>Rapport de Performance BithumbBot</b>\n\n`;
      message += `🔍 <b>Détections totales :</b> ${totalDetections}\n`;
      message += `⚡ <b>Latence moyenne :</b> ${Math.round(averageLatency)}ms\n`;
      message += `⏱️ <b>Uptime :</b> ${uptime}\n`;
      message += `\n📅 <i>Rapport généré le ${new Date().toISOString()}</i>`;

      const response = await axios.post(
        `${this.baseUrl}/sendMessage`,
        {
          chat_id: this.config.telegramChatId,
          text: message,
          parse_mode: 'HTML'
        },
        { timeout: 5000 }
      );

      return response.status === 200 && response.data.ok;
    } catch (error) {
      console.error('Erreur lors de l\'envoi du rapport de performance:', error);
      return false;
    }
  }
}
