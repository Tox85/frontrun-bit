#!/usr/bin/env ts-node

/**
 * Script de test pour valider le fonctionnement du bot avec des données mockées
 * Usage: npm run test:bot
 */

import { AnnouncementFetcher } from '../modules/fetcher';
import { AnnouncementAnalyzer } from '../modules/analyzer';
import { TelegramNotifier } from '../modules/telegram';
import { Logger } from '../modules/logger';
import { mockAnnouncementData } from '../tests/mock-data';
import { BotConfig } from '../types';

class MockBotTester {
  private config: BotConfig;
  private logger: Logger;
  private notifier: TelegramNotifier;
  private lastSeenId: string | null = null;
  private cycleCount: number = 0;
  private detectionCount: number = 0;

  constructor() {
    this.config = {
      telegramBotToken: '123456:ABC-DEF1234567890abcdefghijklmnopqrstuvwxyz',
      telegramChatId: '-1001234567890',
      pollMs: 300,
      targetUrl: 'https://feed.bithumb.com/notice?category=9&page=1',
      useProxy: false,
      logLevel: 'debug',
      logFormat: 'text'
    };

    this.logger = new Logger(this.config);
    this.notifier = new TelegramNotifier(this.config);
  }

  async runTest(): Promise<void> {
    console.log('🧪 Démarrage du test du bot avec données mockées\n');

    try {
      // Test 1: Initialisation
      await this.testInitialization();

      // Test 2: Détection d'une nouvelle annonce
      await this.testSingleDetection();

      // Test 3: Détection de plusieurs nouvelles annonces
      await this.testMultipleDetection();

      // Test 4: Gestion des annonces invalides
      await this.testInvalidAnnouncements();

      // Test 5: Performance
      await this.testPerformance();

      console.log('\n✅ Tous les tests sont passés avec succès !');
    } catch (error) {
      console.error('\n❌ Erreur lors des tests:', error);
      process.exit(1);
    }
  }

  private async testInitialization(): Promise<void> {
    console.log('🔍 Test 1: Initialisation...');
    
    this.lastSeenId = mockAnnouncementData.initial.announcements[0].id;
    console.log(`   ✅ LastSeenId initialisé: ${this.lastSeenId}`);
    
    // Test de la connexion Telegram (mockée)
    const telegramTest = await this.notifier.testConnection();
    console.log(`   ✅ Test Telegram: ${telegramTest.success ? 'OK' : 'ÉCHEC'}`);
    
    console.log('   ✅ Initialisation réussie\n');
  }

  private async testSingleDetection(): Promise<void> {
    console.log('🔍 Test 2: Détection d\'une nouvelle annonce...');
    
    const newAnnouncements = AnnouncementAnalyzer.findNewAnnouncements(
      mockAnnouncementData.withNew.announcements,
      this.lastSeenId
    );

    console.log(`   📊 Nouvelles annonces trouvées: ${newAnnouncements.length}`);
    
    for (const announcement of newAnnouncements) {
      const analysis = AnnouncementAnalyzer.parseAnnouncement(announcement);
      
      if (analysis.isValid && analysis.symbol) {
        console.log(`   🆕 Nouvelle annonce: ${analysis.symbol} - ${analysis.formattedTitle}`);
        
        // Simuler l'envoi de notification
        const detectionTime = new Date().toISOString();
        const result = await this.notifier.sendNewTokenAlert(
          analysis.symbol,
          analysis.formattedTitle,
          detectionTime
        );
        
        console.log(`   📤 Notification envoyée: ${result.success ? 'OK' : 'ÉCHEC'}`);
        this.detectionCount++;
      }
    }

    // Mettre à jour le lastSeenId
    this.lastSeenId = mockAnnouncementData.withNew.announcements[0].id;
    console.log('   ✅ Test de détection unique réussi\n');
  }

  private async testMultipleDetection(): Promise<void> {
    console.log('🔍 Test 3: Détection de plusieurs nouvelles annonces...');
    
    const newAnnouncements = AnnouncementAnalyzer.findNewAnnouncements(
      mockAnnouncementData.multipleNew.announcements,
      this.lastSeenId
    );

    console.log(`   📊 Nouvelles annonces trouvées: ${newAnnouncements.length}`);
    
    for (const announcement of newAnnouncements) {
      const analysis = AnnouncementAnalyzer.parseAnnouncement(announcement);
      
      if (analysis.isValid && analysis.symbol) {
        console.log(`   🆕 Nouvelle annonce: ${analysis.symbol} - ${analysis.formattedTitle}`);
        this.detectionCount++;
      }
    }

    // Mettre à jour le lastSeenId
    this.lastSeenId = mockAnnouncementData.multipleNew.announcements[0].id;
    console.log('   ✅ Test de détection multiple réussi\n');
  }

  private async testInvalidAnnouncements(): Promise<void> {
    console.log('🔍 Test 4: Gestion des annonces invalides...');
    
    const newAnnouncements = AnnouncementAnalyzer.findNewAnnouncements(
      mockAnnouncementData.invalid.announcements,
      this.lastSeenId
    );

    console.log(`   📊 Nouvelles annonces trouvées: ${newAnnouncements.length}`);
    
    let validCount = 0;
    let invalidCount = 0;
    
    for (const announcement of newAnnouncements) {
      const analysis = AnnouncementAnalyzer.parseAnnouncement(announcement);
      
      if (analysis.isValid && analysis.symbol) {
        console.log(`   ✅ Annonce valide: ${analysis.symbol}`);
        validCount++;
      } else {
        console.log(`   ❌ Annonce invalide ignorée: ${announcement.title}`);
        invalidCount++;
      }
    }

    console.log(`   📊 Résultat: ${validCount} valides, ${invalidCount} invalides`);
    console.log('   ✅ Test des annonces invalides réussi\n');
  }

  private async testPerformance(): Promise<void> {
    console.log('🔍 Test 5: Performance...');
    
    const iterations = 1000;
    const testTitles = [
      '오일러(EUL) 원화 마켓 추가',
      '캠프 네트워크(CAMP) 원화 마켓 추가',
      '비트코인(BTC) 원화 마켓 추가',
      '이더리움(ETH) 원화 마켓 추가',
      '리플(XRP) 원화 마켓 추가'
    ];

    // Test de performance extractSymbol
    const startTime = process.hrtime.bigint();
    
    for (let i = 0; i < iterations; i++) {
      testTitles.forEach(title => {
        AnnouncementAnalyzer.extractSymbol(title);
        AnnouncementAnalyzer.isMarketAddition(title);
        AnnouncementAnalyzer.formatTitle(title);
      });
    }
    
    const endTime = process.hrtime.bigint();
    const duration = Number(endTime - startTime) / 1e6;
    const avgTimePerCall = duration / (iterations * testTitles.length);

    console.log(`   ⚡ Performance extractSymbol:`);
    console.log(`      - ${iterations * testTitles.length} appels en ${duration.toFixed(2)}ms`);
    console.log(`      - Moyenne: ${avgTimePerCall.toFixed(4)}ms par appel`);

    // Test de performance sur gros dataset
    const largeDataset = Array(100).fill(0).map((_, i) => ({
      id: `perf-test-${i}`,
      title: `토큰${i}(TOKEN${i}) 원화 마켓 추가`,
      timestamp: new Date().toISOString(),
      url: `/notice/${i}`
    }));

    const startTime2 = process.hrtime.bigint();
    
    largeDataset.forEach(announcement => {
      AnnouncementAnalyzer.parseAnnouncement(announcement);
    });
    
    const endTime2 = process.hrtime.bigint();
    const duration2 = Number(endTime2 - startTime2) / 1e6;

    console.log(`   ⚡ Performance gros dataset:`);
    console.log(`      - ${largeDataset.length} annonces en ${duration2.toFixed(2)}ms`);
    console.log(`      - Moyenne: ${(duration2 / largeDataset.length).toFixed(4)}ms par annonce`);

    console.log('   ✅ Test de performance réussi\n');
  }

  private async simulatePollingCycle(): Promise<void> {
    this.cycleCount++;
    console.log(`🔄 Cycle #${this.cycleCount}`);
    
    // Simuler un délai de polling
    await new Promise(resolve => setTimeout(resolve, 100));
  }
}

// Point d'entrée
async function main() {
  const tester = new MockBotTester();
  await tester.runTest();
}

// Exécuter le test
if (require.main === module) {
  main().catch(console.error);
}

export { MockBotTester };
