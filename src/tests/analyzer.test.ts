import { AnnouncementAnalyzer } from '../modules/analyzer';
import { Announcement } from '../types';

describe('AnnouncementAnalyzer', () => {
  describe('extractSymbol', () => {
    test('devrait extraire le symbole d\'un titre standard', () => {
      const title = '오일러(EUL) 원화 마켓 추가';
      const result = AnnouncementAnalyzer.extractSymbol(title);
      expect(result).toBe('EUL');
    });

    test('devrait extraire le symbole avec espace avant parenthèse', () => {
      const title = '토큰이름 (SYM) 추가';
      const result = AnnouncementAnalyzer.extractSymbol(title);
      expect(result).toBe('SYM');
    });

    test('devrait extraire le premier symbole s\'il y en a plusieurs', () => {
      const title = '여러 토큰(AAA), 다른 토큰(BBB) 마켓 추가';
      const result = AnnouncementAnalyzer.extractSymbol(title);
      expect(result).toBe('AAA');
    });

    test('devrait extraire un symbole avec des chiffres', () => {
      const title = '토큰123(TKN123) 원화 마켓 추가';
      const result = AnnouncementAnalyzer.extractSymbol(title);
      expect(result).toBe('TKN123');
    });

    test('devrait retourner null pour un titre sans parenthèses', () => {
      const title = 'NoParentheses Token Listing';
      const result = AnnouncementAnalyzer.extractSymbol(title);
      expect(result).toBeNull();
    });

    test('devrait retourner null pour un titre vide', () => {
      const title = '';
      const result = AnnouncementAnalyzer.extractSymbol(title);
      expect(result).toBeNull();
    });

    test('devrait retourner null pour un titre null/undefined', () => {
      expect(AnnouncementAnalyzer.extractSymbol(null as any)).toBeNull();
      expect(AnnouncementAnalyzer.extractSymbol(undefined as any)).toBeNull();
    });

    test('devrait gérer les parenthèses mal formées', () => {
      const title = '잘못된 예시(() 마켓 추가';
      const result = AnnouncementAnalyzer.extractSymbol(title);
      expect(result).toBe('');
    });

    test('devrait extraire des symboles avec des caractères spéciaux', () => {
      const title = '토큰-특수(TOKEN-SPECIAL) 마켓 추가';
      const result = AnnouncementAnalyzer.extractSymbol(title);
      expect(result).toBe('TOKEN-SPECIAL');
    });

    test('devrait trimmer les espaces dans le symbole', () => {
      const title = '토큰 ( SYMBOL ) 마켓 추가';
      const result = AnnouncementAnalyzer.extractSymbol(title);
      expect(result).toBe('SYMBOL');
    });
  });

  describe('isMarketAddition', () => {
    test('devrait détecter un ajout de marché standard', () => {
      const title = '오일러(EUL) 원화 마켓 추가';
      const result = AnnouncementAnalyzer.isMarketAddition(title);
      expect(result).toBe(true);
    });

    test('devrait détecter un listing', () => {
      const title = '비트코인(BTC) 상장';
      const result = AnnouncementAnalyzer.isMarketAddition(title);
      expect(result).toBe(true);
    });

    test('devrait détecter un support de trading', () => {
      const title = '이더리움(ETH) 거래 지원';
      const result = AnnouncementAnalyzer.isMarketAddition(title);
      expect(result).toBe(true);
    });

    test('devrait détecter un début de trading', () => {
      const title = '리플(XRP) 거래 시작';
      const result = AnnouncementAnalyzer.isMarketAddition(title);
      expect(result).toBe(true);
    });

    test('ne devrait pas détecter une annonce non liée au marché', () => {
      const title = '서비스 점검 안내';
      const result = AnnouncementAnalyzer.isMarketAddition(title);
      expect(result).toBe(false);
    });

    test('devrait retourner false pour un titre vide', () => {
      const title = '';
      const result = AnnouncementAnalyzer.isMarketAddition(title);
      expect(result).toBe(false);
    });
  });

  describe('findNewAnnouncements', () => {
    const mockAnnouncements: Announcement[] = [
      { id: '3', title: '토큰3(TOKEN3) 원화 마켓 추가' },
      { id: '2', title: '토큰2(TOKEN2) 원화 마켓 추가' },
      { id: '1', title: '토큰1(TOKEN1) 원화 마켓 추가' }
    ];

    test('devrait trouver de nouvelles annonces', () => {
      const result = AnnouncementAnalyzer.findNewAnnouncements(mockAnnouncements, '1');
      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('3');
      expect(result[1].id).toBe('2');
    });

    test('ne devrait pas trouver de nouvelles annonces si lastSeenId est le premier', () => {
      const result = AnnouncementAnalyzer.findNewAnnouncements(mockAnnouncements, '3');
      expect(result).toHaveLength(0);
    });

    test('devrait retourner toutes les annonces si lastSeenId est null', () => {
      const result = AnnouncementAnalyzer.findNewAnnouncements(mockAnnouncements, null);
      expect(result).toHaveLength(0);
    });

    test('devrait gérer une liste vide', () => {
      const result = AnnouncementAnalyzer.findNewAnnouncements([], '1');
      expect(result).toHaveLength(0);
    });
  });

  describe('validateAnnouncement', () => {
    test('devrait valider une annonce correcte', () => {
      const announcement: Announcement = {
        id: '123',
        title: '토큰(SYMBOL) 원화 마켓 추가'
      };
      const result = AnnouncementAnalyzer.validateAnnouncement(announcement);
      expect(result).toBe(true);
    });

    test('ne devrait pas valider une annonce sans ID', () => {
      const announcement: Announcement = {
        id: '',
        title: '토큰(SYMBOL) 원화 마켓 추가'
      };
      const result = AnnouncementAnalyzer.validateAnnouncement(announcement);
      expect(result).toBe(false);
    });

    test('ne devrait pas valider une annonce sans titre', () => {
      const announcement: Announcement = {
        id: '123',
        title: ''
      };
      const result = AnnouncementAnalyzer.validateAnnouncement(announcement);
      expect(result).toBe(false);
    });

    test('ne devrait pas valider une annonce sans symbole valide', () => {
      const announcement: Announcement = {
        id: '123',
        title: '토큰 sans parenthèses'
      };
      const result = AnnouncementAnalyzer.validateAnnouncement(announcement);
      expect(result).toBe(false);
    });
  });

  describe('parseAnnouncement', () => {
    test('devrait parser une annonce complète', () => {
      const announcement: Announcement = {
        id: '123',
        title: '오일러(EUL) 원화 마켓 추가'
      };
      
      const result = AnnouncementAnalyzer.parseAnnouncement(announcement);
      
      expect(result.symbol).toBe('EUL');
      expect(result.isValid).toBe(true);
      expect(result.isMarketAddition).toBe(true);
      expect(result.formattedTitle).toBe('오일러(EUL) 원화 마켓 추가');
    });

    test('devrait parser une annonce invalide', () => {
      const announcement: Announcement = {
        id: '123',
        title: 'Annonce sans symbole'
      };
      
      const result = AnnouncementAnalyzer.parseAnnouncement(announcement);
      
      expect(result.symbol).toBeNull();
      expect(result.isValid).toBe(false);
      expect(result.isMarketAddition).toBe(false);
      expect(result.formattedTitle).toBe('Annonce sans symbole');
    });
  });

  describe('calculateAnnounceDelay', () => {
    test('devrait calculer le délai correctement', () => {
      const announceTime = '2025-01-15T10:00:00.000Z';
      const detectTime = '2025-01-15T10:00:01.500Z';
      
      const result = AnnouncementAnalyzer.calculateAnnounceDelay(announceTime, detectTime);
      expect(result).toBe(1500);
    });

    test('devrait retourner null pour des timestamps invalides', () => {
      const result = AnnouncementAnalyzer.calculateAnnounceDelay('invalid', 'invalid');
      expect(result).toBeNull();
    });
  });
});
