import axios, { AxiosInstance } from 'axios';
import * as cheerio from 'cheerio';
import { BotConfig, AnnouncementData, Announcement } from '../types';

export class AnnouncementFetcher {
  private httpClient: AxiosInstance;
  private buildId: string | null = null;
  private config: BotConfig;

  constructor(config: BotConfig) {
    this.config = config;
    this.httpClient = axios.create({
      timeout: 10000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json,text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'ko-KR,ko;q=0.9,en;q=0.8',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
      }
    });
  }

  /**
   * Récupère le buildId depuis la page principale
   */
  private async fetchBuildId(): Promise<string> {
    try {
      const response = await this.httpClient.get(this.config.targetUrl);
      const html = response.data;
      
      // Recherche du buildId dans le HTML
      const buildIdMatch = html.match(/_next\/static\/([a-zA-Z0-9_-]+)\/_buildManifest\.js/);
      if (buildIdMatch) {
        return buildIdMatch[1];
      }
      
      // Fallback: recherche alternative
      const altMatch = html.match(/"buildId":"([^"]+)"/);
      if (altMatch) {
        return altMatch[1];
      }
      
      throw new Error('BuildId non trouvé dans la page');
    } catch (error) {
      console.warn('Erreur lors de la récupération du buildId:', error);
      return 'fallback-build-id';
    }
  }

  /**
   * Récupère les annonces via l'API JSON Next.js
   */
  private async fetchAnnouncementsJSON(): Promise<AnnouncementData> {
    if (!this.buildId) {
      this.buildId = await this.fetchBuildId();
    }

    const jsonUrl = `https://feed.bithumb.com/_next/data/${this.buildId}/notice.json?category=9&page=1`;
    
    try {
      const response = await this.httpClient.get(jsonUrl);
      return response.data;
    } catch (error) {
      console.warn('Erreur lors de la récupération JSON, fallback vers HTML:', error);
      return await this.fetchAnnouncementsHTML();
    }
  }

  /**
   * Récupère les annonces via parsing HTML (fallback)
   */
  private async fetchAnnouncementsHTML(): Promise<AnnouncementData> {
    try {
      const response = await this.httpClient.get(this.config.targetUrl);
      return this.parseHTML(response.data);
    } catch (error) {
      console.warn('Erreur lors de la récupération HTML, tentative avec le proxy Cloudflare Worker:', error);
      return await this.fetchWithCloudflareScraper();
    }
  }

  /**
   * Utilise le proxy Cloudflare Worker pour contourner les protections
   */
  private async fetchWithCloudflareScraper(): Promise<AnnouncementData> {
    try {
      if (!this.config.proxyUrl) {
        throw new Error('URL du proxy non configurée');
      }
      
      const proxyUrl = `${this.config.proxyUrl}?url=${encodeURIComponent(this.config.targetUrl)}`;
      const response = await this.httpClient.get(proxyUrl);
      return this.parseHTML(response.data);
    } catch (error) {
      console.error('Erreur avec le proxy Cloudflare Worker:', error);
      throw new Error('Impossible de récupérer les données malgré tous les fallbacks');
    }
  }

  /**
   * Parse le HTML pour extraire les annonces
   */
  private parseHTML(html: string): AnnouncementData {
    const $ = cheerio.load(html);
    const announcements: Announcement[] = [];

    // Sélecteur robuste : tous les liens vers /notice/
    const noticeLinks = $('a[href*="/notice/"]');

    noticeLinks.each((i, element) => {
      const title = $(element).text().trim();
      const href = $(element).attr('href');
      const id = href ? href.split('/').pop() : undefined;

      // Nettoyer le titre (enlever les espaces et caractères spéciaux)
      const cleanTitle = title.replace(/\s+/g, ' ').trim();

      if (id && cleanTitle && cleanTitle.length > 0) {
        announcements.push({
          id,
          title: cleanTitle,
          timestamp: new Date().toISOString()
        });
      }
    });

    return {
      announcements: announcements,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Méthode principale pour récupérer les annonces
   */
  async fetchAnnouncements(): Promise<AnnouncementData> {
    try {
      if (this.config.useProxy && this.config.proxyUrl) {
        return await this.fetchViaProxy();
      }
      
      return await this.fetchAnnouncementsJSON();
    } catch (error) {
      console.error('Erreur lors de la récupération des annonces:', error);
      throw error;
    }
  }

  /**
   * Récupère les données via un proxy Cloudflare Worker
   */
  private async fetchViaProxy(): Promise<AnnouncementData> {
    const proxyUrl = `${this.config.proxyUrl}?url=${encodeURIComponent(this.config.targetUrl)}`;
    const response = await this.httpClient.get(proxyUrl);
    return this.parseHTML(response.data);
  }
}
