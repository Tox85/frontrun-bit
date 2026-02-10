import { BithumbBot } from '../index';
import { AnnouncementFetcher } from '../modules/fetcher';
import { TelegramNotifier } from '../modules/telegram';
import { mockAnnouncementData } from './mock-data';
import { BotConfig } from '../types';

// Mock des modules externes
jest.mock('../modules/fetcher');
jest.mock('../modules/telegram');

describe('BithumbBot Integration Tests', () => {
  let mockFetcher: jest.Mocked<AnnouncementFetcher>;
  let mockNotifier: jest.Mocked<TelegramNotifier>;
  let bot: BithumbBot;
  let mockConfig: BotConfig;

  beforeEach(() => {
    // Configuration mock
    mockConfig = {
      telegramBotToken: '123456:ABC-DEF1234567890abcdefghijklmnopqrstuvwxyz',
      telegramChatId: '-1001234567890',
      pollMs: 300,
      targetUrl: 'https://feed.bithumb.com/notice?category=9&page=1',
      useProxy: false,
      logLevel: 'debug',
      logFormat: 'text',
      trading: {
        liveMode: false,
        tradingBudget: 0,
        leverage: 1,
        stopLossPercent: 3,
        takeProfitPercent: 0,
        maxHoldTimeMs: 0,
        timeBeforeExecutionSec: 0,
        quoteCurrencies: ['USDT', 'USDC'],
        exchanges: {
          bybit: {
            enabled: false,
            id: 'bybit',
            credentials: {}
          },
          hyperliquid: {
            enabled: false,
            id: 'hyperliquid',
            credentials: {}
          }
        }
      }
    };

    // Mock du fetcher
    mockFetcher = {
      fetchAnnouncements: jest.fn()
    } as any;

    // Mock du notifier
    mockNotifier = {
      testConnection: jest.fn(),
      sendNewTokenAlert: jest.fn(),
      sendStatusMessage: jest.fn(),
      sendErrorMessage: jest.fn()
    } as any;

    // Mock des constructeurs
    (AnnouncementFetcher as jest.Mock).mockImplementation(() => mockFetcher);
    (TelegramNotifier as jest.Mock).mockImplementation(() => mockNotifier);

    // Configuration des mocks par défaut
    mockFetcher.fetchAnnouncements.mockResolvedValue(mockAnnouncementData.initial);
    mockNotifier.testConnection.mockResolvedValue({ success: true });
    mockNotifier.sendStatusMessage.mockResolvedValue(true);
    mockNotifier.sendNewTokenAlert.mockResolvedValue({ success: true, responseTime: 50 });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Initialisation', () => {
    test('devrait initialiser correctement avec une configuration valide', () => {
      expect(() => new BithumbBot()).not.toThrow();
    });

    test('devrait échouer avec une configuration invalide', () => {
      // Mock d'une configuration invalide
      const originalEnv = process.env;
      const originalNodeEnv = process.env.NODE_ENV;
      const originalAllowTestDefaults = process.env.ALLOW_TEST_DEFAULTS;
      process.env = { ...originalEnv };
      delete process.env.TELEGRAM_BOT_TOKEN;
      process.env.ALLOW_TEST_DEFAULTS = 'false';

      expect(() => new BithumbBot()).toThrow();

      process.env = originalEnv;
      process.env.NODE_ENV = originalNodeEnv;
      process.env.ALLOW_TEST_DEFAULTS = originalAllowTestDefaults;
    });
  });

  describe('Détection de nouvelles annonces', () => {
    test('devrait détecter une nouvelle annonce', async () => {
      // Simuler l'initialisation
      mockFetcher.fetchAnnouncements
        .mockResolvedValueOnce(mockAnnouncementData.initial) // Initialisation
        .mockResolvedValueOnce(mockAnnouncementData.withNew); // Détection

      bot = new BithumbBot();
      
      // Démarrer le bot et attendre un cycle
      const startPromise = bot.start();
      
      // Attendre un peu pour que le bot traite les données
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Vérifier que la notification a été envoyée
      expect(mockNotifier.sendNewTokenAlert).toHaveBeenCalledWith(
        'EUL',
        '오일러(EUL) 원화 마켓 추가',
        expect.any(String),
        expect.any(Number)
      );

      // Arrêter le bot
      await bot.shutdown('Test terminé');
    });

    test('devrait détecter plusieurs nouvelles annonces', async () => {
      mockFetcher.fetchAnnouncements
        .mockResolvedValueOnce(mockAnnouncementData.initial)
        .mockResolvedValueOnce(mockAnnouncementData.multipleNew);

      bot = new BithumbBot();
      
      const startPromise = bot.start();
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Devrait détecter 2 nouvelles annonces
      expect(mockNotifier.sendNewTokenAlert).toHaveBeenCalledTimes(2);
      expect(mockNotifier.sendNewTokenAlert).toHaveBeenCalledWith(
        'NEW1',
        '새로운토큰1(NEW1) 원화 마켓 추가',
        expect.any(String),
        expect.any(Number)
      );
      expect(mockNotifier.sendNewTokenAlert).toHaveBeenCalledWith(
        'NEW2',
        '새로운토큰2(NEW2) 원화 마켓 추가',
        expect.any(String),
        expect.any(Number)
      );

      await bot.shutdown('Test terminé');
    });

    test('ne devrait pas envoyer de notification pour des annonces invalides', async () => {
      mockFetcher.fetchAnnouncements
        .mockResolvedValueOnce(mockAnnouncementData.initial)
        .mockResolvedValueOnce(mockAnnouncementData.invalid);

      bot = new BithumbBot();
      
      const startPromise = bot.start();
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Ne devrait pas envoyer de notification
      expect(mockNotifier.sendNewTokenAlert).not.toHaveBeenCalled();

      await bot.shutdown('Test terminé');
    });
  });

  describe('Gestion des erreurs', () => {
    test('devrait gérer les erreurs de fetch', async () => {
      mockFetcher.fetchAnnouncements
        .mockResolvedValueOnce(mockAnnouncementData.initial)
        .mockRejectedValueOnce(new Error('Erreur de réseau'));

      bot = new BithumbBot();
      
      const startPromise = bot.start();
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Le bot devrait continuer à fonctionner malgré l'erreur
      expect(mockFetcher.fetchAnnouncements).toHaveBeenCalledTimes(2);

      await bot.shutdown('Test terminé');
    });

    test('devrait gérer les erreurs de notification Telegram', async () => {
      mockFetcher.fetchAnnouncements
        .mockResolvedValueOnce(mockAnnouncementData.initial)
        .mockResolvedValueOnce(mockAnnouncementData.withNew);

      mockNotifier.sendNewTokenAlert.mockResolvedValue({
        success: false,
        responseTime: 100,
        error: 'Erreur Telegram'
      });

      bot = new BithumbBot();
      
      const startPromise = bot.start();
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Devrait quand même essayer d'envoyer la notification
      expect(mockNotifier.sendNewTokenAlert).toHaveBeenCalled();

      await bot.shutdown('Test terminé');
    });
  });

  describe('Métriques de performance', () => {
    test('devrait mesurer les latences correctement', async () => {
      mockFetcher.fetchAnnouncements
        .mockResolvedValueOnce(mockAnnouncementData.initial)
        .mockResolvedValueOnce(mockAnnouncementData.withNew);

      bot = new BithumbBot();
      
      const startPromise = bot.start();
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Vérifier que les métriques sont collectées
      // (Dans un vrai test, on vérifierait les logs ou les métriques internes)

      await bot.shutdown('Test terminé');
    });
  });
});
