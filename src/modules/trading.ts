import ccxt, { Exchange, Market } from 'ccxt';
import { Logger } from './logger';
import { TradeExecutionDetails, TradingConfig, TradingExchangeConfig } from '../types';

interface ExchangeWrapper {
  config: TradingExchangeConfig;
  client: Exchange;
}

export class TradingEngine {
  private config: TradingConfig;
  private logger: Logger;
  private exchanges: ExchangeWrapper[] = [];
  private prepared: boolean = false;

  constructor(config: TradingConfig, logger: Logger) {
    this.config = config;
    this.logger = logger;
  }

  /**
   * Prépare les exchanges (chargement des marchés) pour réduire la latence lors des exécutions.
   */
  async prepare(): Promise<void> {
    if (this.prepared || !this.shouldTrade()) {
      return;
    }

    const wrappers: ExchangeWrapper[] = [];

    for (const exchangeConfig of Object.values(this.config.exchanges)) {
      if (!exchangeConfig.enabled) {
        this.logger.debug(`Exchange ${exchangeConfig.id} désactivé via la configuration`);
        continue;
      }

      const client = this.instantiateExchange(exchangeConfig);

      if (this.config.liveMode && (!exchangeConfig.credentials.apiKey || !exchangeConfig.credentials.secret)) {
        this.logger.warn(`Clés API manquantes pour ${exchangeConfig.id}. L'exchange sera ignoré en mode live.`);
        continue;
      }

      try {
        await client.loadMarkets();
        this.logger.debug(`Marchés chargés pour ${exchangeConfig.id} (${Object.keys(client.markets).length} marchés)`);
        wrappers.push({ config: exchangeConfig, client });
      } catch (error) {
        this.logger.error(`Impossible de charger les marchés pour ${exchangeConfig.id}`, error);
      }
    }

    this.exchanges = wrappers;
    this.prepared = true;
  }

  /**
   * Exécute un trade perpétuel pour un symbole détecté.
   */
  async executeTrade(symbol: string): Promise<TradeExecutionDetails | null> {
    const sanitizedSymbol = symbol.trim().toUpperCase();

    if (!this.shouldTrade()) {
      this.logger.debug(`Trading désactivé - aucune exécution pour ${sanitizedSymbol}`);
      return null;
    }

    if (this.config.tradingBudget <= 0) {
      this.logger.warn(`TRADING_BUDGET nul ou négatif - trading ignoré pour ${sanitizedSymbol}`);
      return null;
    }

    await this.prepare();

    if (this.exchanges.length === 0) {
      this.logger.warn(`Aucun exchange disponible pour exécuter ${sanitizedSymbol}`);
      return null;
    }

    if (this.config.timeBeforeExecutionSec > 0) {
      await this.handleCountdown(sanitizedSymbol, this.config.timeBeforeExecutionSec);
    }

    for (const wrapper of this.exchanges) {
      try {
        const market = await this.findPerpetualMarket(wrapper.client, sanitizedSymbol);

        if (!market) {
          this.logger.warn(`Marché perpétuel introuvable pour ${sanitizedSymbol} sur ${wrapper.client.id}`);
          continue;
        }

        return await this.executeOnExchange(wrapper.client, market);
      } catch (error) {
        this.logger.error(`Erreur lors de l'exécution sur ${wrapper.client.id}`, error);
      }
    }

    this.logger.warn(`Impossible d'exécuter ${sanitizedSymbol} sur les exchanges configurés`);
    return null;
  }

  /**
   * Détermine si le trading doit être exécuté.
   */
  private shouldTrade(): boolean {
    return this.config.liveMode || this.config.tradingBudget > 0;
  }

  /**
   * Initialise une instance CCXT pour l'exchange donné.
   */
  private instantiateExchange(exchangeConfig: TradingExchangeConfig): Exchange {
    const exchangeClass = (ccxt as any)[exchangeConfig.id];

    if (!exchangeClass) {
      throw new Error(`Exchange ${exchangeConfig.id} non supporté par CCXT`);
    }

    const params: any = {
      enableRateLimit: true,
      timeout: 1000,
    };

    if (exchangeConfig.credentials.apiKey) {
      params.apiKey = exchangeConfig.credentials.apiKey;
    }

    if (exchangeConfig.credentials.secret) {
      params.secret = exchangeConfig.credentials.secret;
    }

    if (exchangeConfig.credentials.password) {
      params.password = exchangeConfig.credentials.password;
    }

    return new exchangeClass(params);
  }

  /**
   * Recherche un marché perpétuel correspondant au symbole.
   */
  private async findPerpetualMarket(exchange: Exchange, baseSymbol: string): Promise<Market | undefined> {
    if (!exchange.markets || Object.keys(exchange.markets).length === 0) {
      await exchange.loadMarkets();
    }

    const candidates = Object.values(exchange.markets).filter(market => {
      if (!market) {
        return false;
      }

      const isPerp = Boolean(market.swap) || Boolean(market.future);
      const baseMatches = market.base?.toUpperCase() === baseSymbol;
      const quoteMatches = market.quote && this.config.quoteCurrencies.includes(market.quote.toUpperCase());

      return isPerp && baseMatches && quoteMatches;
    });

    return candidates[0];
  }

  /**
   * Applique un compte à rebours bloquant avant l'exécution.
   */
  private async handleCountdown(symbol: string, seconds: number): Promise<void> {
    this.logger.logTradeCountdownStart(symbol, seconds);

    for (let remaining = seconds; remaining > 0; remaining--) {
      await this.delay(1000);
      const nextValue = remaining - 1;
      this.logger.logTradeCountdownTick(symbol, nextValue);
    }

    this.logger.logTradeCountdownEnd(symbol);
  }

  /**
   * Execute le trade sur un exchange spécifique.
   */
  private async executeOnExchange(exchange: Exchange, market: Market | undefined): Promise<TradeExecutionDetails> {
    if (!market) {
      throw new Error('Marché invalide');
    }

    const marketSymbol = market.symbol || market.id;

    if (!marketSymbol) {
      throw new Error('Symbole de marché introuvable');
    }

    const ticker = await exchange.fetchTicker(marketSymbol);
    const referencePrice = ticker.last || ticker.ask || ticker.bid;

    if (!referencePrice) {
      throw new Error(`Prix indisponible pour ${marketSymbol}`);
    }

    const rawAmount = (this.config.tradingBudget * this.config.leverage) / referencePrice;
    const amount = Number(exchange.amountToPrecision(marketSymbol, rawAmount));

    if (!amount || Number.isNaN(amount) || amount <= 0) {
      throw new Error(`Quantité calculée invalide pour ${marketSymbol}`);
    }

    const mode: 'live' | 'paper' = this.config.liveMode ? 'live' : 'paper';

    if (!this.config.liveMode) {
      const simulatedTrade: TradeExecutionDetails = {
        exchange: exchange.id,
        marketSymbol,
        side: 'buy',
        amount,
        entryPrice: referencePrice,
        status: 'simulated',
        mode,
      };

      this.logger.logTradeEntry(simulatedTrade);
      this.scheduleExit(exchange, simulatedTrade);
      return simulatedTrade;
    }

    if (!exchange.has || !exchange.has['createOrder']) {
      throw new Error(`createOrder non disponible sur ${exchange.id}`);
    }

    const pendingTrade: TradeExecutionDetails = {
      exchange: exchange.id,
      marketSymbol,
      side: 'buy',
      amount,
      entryPrice: referencePrice,
      status: 'pending',
      mode,
    };

    this.logger.logTradeAttempt(pendingTrade);

    const order = await exchange.createOrder(marketSymbol, 'market', 'buy', amount);
    const entryPrice = order.average || order.price || referencePrice;

    const executedTrade: TradeExecutionDetails = {
      exchange: exchange.id,
      marketSymbol,
      side: 'buy',
      amount,
      entryPrice,
      orderId: order.id,
      status: order.status === 'closed' ? 'filled' : 'pending',
      mode,
    };

    this.logger.logTradeEntry(executedTrade);
    this.scheduleExit(exchange, executedTrade);
    return executedTrade;
  }

  /**
   * Programme la fermeture de la position après le délai maximum.
   */
  private scheduleExit(exchange: Exchange, trade: TradeExecutionDetails): void {
    if (this.config.maxHoldTimeMs <= 0) {
      return;
    }

    const timer = setTimeout(() => {
      void this.closePosition(exchange, trade);
    }, this.config.maxHoldTimeMs);

    if (typeof timer.unref === 'function') {
      timer.unref();
    }
  }

  /**
   * Ferme la position (réelle ou simulée) et log les performances.
   */
  private async closePosition(exchange: Exchange, trade: TradeExecutionDetails): Promise<void> {
    try {
      let exitPrice = trade.entryPrice;
      let orderId = trade.orderId;

      if (trade.mode === 'live') {
        const exitOrder = await exchange.createOrder(trade.marketSymbol, 'market', trade.side === 'buy' ? 'sell' : 'buy', trade.amount, undefined, { reduceOnly: true });
        exitPrice = exitOrder.average || exitOrder.price || exitPrice;
        orderId = exitOrder.id;
      } else {
        const ticker = await exchange.fetchTicker(trade.marketSymbol);
        exitPrice = ticker.last || ticker.bid || exitPrice;
      }

      const profit = (exitPrice - trade.entryPrice) * trade.amount;
      const notional = trade.entryPrice * trade.amount;
      const profitPercent = notional > 0 ? (profit / notional) * 100 : undefined;

      this.logger.logTradeExit({
        ...trade,
        status: 'closed',
        exitPrice,
        profit,
        profitPercent,
        orderId,
      });
    } catch (error) {
      this.logger.logTradeError(trade.marketSymbol, exchange.id, error);
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
