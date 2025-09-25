import { AnnouncementAnalyzer } from '../modules/analyzer';
import { mockAnnouncementsWithNew } from './mock-data';

describe('Performance Tests', () => {
  describe('extractSymbol Performance', () => {
    test('devrait extraire les symboles rapidement', () => {
      const titles = [
        '오일러(EUL) 원화 마켓 추가',
        '캠프 네트워크(CAMP) 원화 마켓 추가',
        '비트코인(BTC) 원화 마켓 추가',
        '이더리움(ETH) 원화 마켓 추가',
        '리플(XRP) 원화 마켓 추가'
      ];

      const iterations = 10000;
      const startTime = process.hrtime.bigint();

      for (let i = 0; i < iterations; i++) {
        titles.forEach(title => {
          AnnouncementAnalyzer.extractSymbol(title);
        });
      }

      const endTime = process.hrtime.bigint();
      const duration = Number(endTime - startTime) / 1e6; // Convertir en ms
      const avgTimePerCall = duration / (iterations * titles.length);

      console.log(`Performance extractSymbol:`);
      console.log(`- ${iterations * titles.length} appels en ${duration.toFixed(2)}ms`);
      console.log(`- Moyenne: ${avgTimePerCall.toFixed(4)}ms par appel`);

      // Vérifier que la performance est acceptable (< 0.1ms par appel)
      expect(avgTimePerCall).toBeLessThan(0.1);
    });

    test('devrait gérer de gros volumes de données', () => {
      const largeDataset = Array(1000).fill(0).map((_, i) => ({
        id: `announcement-${i}`,
        title: `토큰${i}(TOKEN${i}) 원화 마켓 추가`,
        timestamp: new Date().toISOString(),
        url: `/notice/${i}`
      }));

      const startTime = process.hrtime.bigint();

      largeDataset.forEach(announcement => {
        const analysis = AnnouncementAnalyzer.parseAnnouncement(announcement);
        expect(analysis.symbol).toBe(`TOKEN${announcement.id.split('-')[1]}`);
        expect(analysis.isValid).toBe(true);
        expect(analysis.isMarketAddition).toBe(true);
      });

      const endTime = process.hrtime.bigint();
      const duration = Number(endTime - startTime) / 1e6;

      console.log(`Performance sur gros dataset:`);
      console.log(`- ${largeDataset.length} annonces traitées en ${duration.toFixed(2)}ms`);
      console.log(`- Moyenne: ${(duration / largeDataset.length).toFixed(4)}ms par annonce`);

      // Vérifier que la performance reste acceptable
      expect(duration).toBeLessThan(1000); // Moins d'1 seconde pour 1000 annonces
    });
  });

  describe('Memory Usage', () => {
    test('ne devrait pas avoir de fuites mémoire', () => {
      const initialMemory = process.memoryUsage().heapUsed;
      
      // Simuler plusieurs cycles de traitement
      for (let cycle = 0; cycle < 100; cycle++) {
        const announcements = Array(100).fill(0).map((_, i) => ({
          id: `cycle-${cycle}-announcement-${i}`,
          title: `토큰${cycle}-${i}(TOKEN${cycle}${i}) 원화 마켓 추가`,
          timestamp: new Date().toISOString(),
          url: `/notice/${cycle}-${i}`
        }));

        announcements.forEach(announcement => {
          AnnouncementAnalyzer.parseAnnouncement(announcement);
        });
      }

      // Forcer le garbage collection si disponible
      if (global.gc) {
        global.gc();
      }

      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;

      console.log(`Utilisation mémoire:`);
      console.log(`- Initial: ${(initialMemory / 1024 / 1024).toFixed(2)} MB`);
      console.log(`- Final: ${(finalMemory / 1024 / 1024).toFixed(2)} MB`);
      console.log(`- Augmentation: ${(memoryIncrease / 1024 / 1024).toFixed(2)} MB`);

      // Vérifier que l'augmentation mémoire est raisonnable (< 50MB)
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024);
    });
  });

  describe('Concurrent Processing', () => {
    test('devrait gérer le traitement concurrent', async () => {
      const concurrentPromises = Array(10).fill(0).map(async (_, i) => {
        const startTime = process.hrtime.bigint();
        
        const announcements = Array(100).fill(0).map((_, j) => ({
          id: `concurrent-${i}-${j}`,
          title: `토큰${i}-${j}(TOKEN${i}${j}) 원화 마켓 추가`,
          timestamp: new Date().toISOString(),
          url: `/notice/${i}-${j}`
        }));

        announcements.forEach(announcement => {
          AnnouncementAnalyzer.parseAnnouncement(announcement);
        });

        const endTime = process.hrtime.bigint();
        return Number(endTime - startTime) / 1e6;
      });

      const results = await Promise.all(concurrentPromises);
      const avgTime = results.reduce((sum, time) => sum + time, 0) / results.length;

      console.log(`Traitement concurrent:`);
      console.log(`- 10 tâches parallèles`);
      console.log(`- Temps moyen: ${avgTime.toFixed(2)}ms`);

      // Vérifier que le traitement concurrent fonctionne
      expect(results).toHaveLength(10);
      expect(avgTime).toBeLessThan(100); // Moins de 100ms en moyenne
    });
  });

  describe('Edge Cases Performance', () => {
    test('devrait gérer les cas limites rapidement', () => {
      const edgeCases = [
        '', // Chaîne vide
        'A'.repeat(10000), // Très longue chaîne
        '토큰(TOKEN) 원화 마켓 추가'.repeat(100), // Répétition
        '토큰(TOKEN) 원화 마켓 추가\n'.repeat(1000), // Avec retours à la ligne
        '토큰(TOKEN) 원화 마켓 추가\t'.repeat(1000), // Avec tabulations
        '토큰(TOKEN) 원화 마켓 추가 '.repeat(1000), // Avec espaces
      ];

      const startTime = process.hrtime.bigint();

      edgeCases.forEach(title => {
        AnnouncementAnalyzer.extractSymbol(title);
        AnnouncementAnalyzer.isMarketAddition(title);
        AnnouncementAnalyzer.formatTitle(title);
      });

      const endTime = process.hrtime.bigint();
      const duration = Number(endTime - startTime) / 1e6;

      console.log(`Cas limites:`);
      console.log(`- ${edgeCases.length} cas traités en ${duration.toFixed(2)}ms`);
      console.log(`- Moyenne: ${(duration / edgeCases.length).toFixed(4)}ms par cas`);

      // Vérifier que même les cas limites sont traités rapidement
      expect(duration).toBeLessThan(100);
    });
  });
});
