import { Announcement } from '../types';

export class AnnouncementAnalyzer {
  /**
   * Extrait le symbole du token depuis le titre de l'annonce
   * Le symbole est toujours entre parenthèses dans le titre
   * Exemple: "오일러(EUL) 원화 마켓 추가" -> "EUL"
   */
  static extractSymbol(title: string): string | null {
    if (!title || typeof title !== 'string') {
      return null;
    }

    // Expression régulière pour capturer le contenu entre parenthèses
    const match = title.match(/\(([^)]+)\)/);

    if (match && match[1]) {
      const extracted = match[1].trim();

      // Gérer les parenthèses mal formées ou imbriquées
      if (extracted.includes('(') || extracted.includes(')')) {
        return '';
      }

      return extracted;
    }

    return null;
  }

  /**
   * Vérifie si une annonce est un ajout de marché
   * Recherche des mots-clés coréens indiquant un nouveau listing
   */
  static isMarketAddition(title: string): boolean {
    if (!title || typeof title !== 'string') {
      return false;
    }

    const marketAdditionKeywords = [
      '마켓 추가', // ajout de marché
      '원화 마켓 추가', // ajout de marché KRW
      '상장', // listing
      '거래 지원', // support de trading
      '거래 시작' // début de trading
    ];

    return marketAdditionKeywords.some(keyword => 
      title.includes(keyword)
    );
  }

  /**
   * Analyse une liste d'annonces et retourne les nouvelles détectées
   */
  static findNewAnnouncements(
    currentAnnouncements: Announcement[],
    lastSeenId: string | null
  ): Announcement[] {
    if (!lastSeenId || currentAnnouncements.length === 0) {
      return [];
    }

    const newAnnouncements: Announcement[] = [];
    
    let foundLastSeen = false;

    for (const announcement of currentAnnouncements) {
      if (announcement.id === lastSeenId) {
        foundLastSeen = true;
        break;
      }

      // Vérifier que c'est bien un ajout de marché
      if (this.isMarketAddition(announcement.title)) {
        newAnnouncements.push(announcement);
      }
    }

    if (!foundLastSeen) {
      return [];
    }

    return newAnnouncements;
  }

  /**
   * Calcule le délai entre l'annonce officielle et la détection
   */
  static calculateAnnounceDelay(
    announcementTimestamp: string,
    detectionTimestamp: string
  ): number | null {
    try {
      const announceTime = new Date(announcementTimestamp).getTime();
      const detectTime = new Date(detectionTimestamp).getTime();
      
      if (isNaN(announceTime) || isNaN(detectTime)) {
        return null;
      }
      
      return detectTime - announceTime;
    } catch (error) {
      console.warn('Erreur lors du calcul du délai d\'annonce:', error);
      return null;
    }
  }

  /**
   * Valide qu'une annonce contient un symbole valide
   */
  static validateAnnouncement(announcement: Announcement): boolean {
    if (!announcement.id || !announcement.title) {
      return false;
    }

    const symbol = this.extractSymbol(announcement.title);
    if (!symbol) {
      return false;
    }

    // Vérifier que le symbole contient au moins un caractère alphanumérique
    if (!/^[A-Z0-9]+$/.test(symbol)) {
      return false;
    }

    return true;
  }

  /**
   * Formate le titre pour l'affichage
   */
  static formatTitle(title: string): string {
    if (!title) return '';
    
    // Nettoyer les caractères spéciaux et espaces multiples
    return title
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Extrait des informations détaillées d'une annonce
   */
  static parseAnnouncement(announcement: Announcement): {
    symbol: string | null;
    isValid: boolean;
    isMarketAddition: boolean;
    formattedTitle: string;
  } {
    const symbol = this.extractSymbol(announcement.title);
    const isValid = this.validateAnnouncement(announcement);
    const isMarketAddition = this.isMarketAddition(announcement.title);
    const formattedTitle = this.formatTitle(announcement.title);

    return {
      symbol,
      isValid,
      isMarketAddition,
      formattedTitle
    };
  }
}
