# Changements apportés

- Ajout d'un moteur de trading modulaire (`src/modules/trading.ts`) basé sur CCXT avec support Bybit et HyperLiquid, gestion du compte à rebours et clôture automatique.
- Extension de la configuration (`src/config/index.ts`, `env.example`, `README.md`) pour inclure les paramètres de trading (budget, délai avant exécution, clés API, levier, etc.).
- Intégration du moteur de trading dans le bot principal (`src/index.ts`), amélioration de l'arrêt (serveur santé/intervalle), et optimisation de la boucle pour l'environnement de test.
- Ajout de logs détaillés pour les opérations de trading (entrée, sortie, erreurs, compte à rebours) dans `src/modules/logger.ts`.
- Renforcement de l'analyse (`src/modules/analyzer.ts`) pour gérer les parenthèses mal formées et éviter les doublons lorsque `lastSeenId` est absent.
- Mise à jour des tests et scripts (`src/tests/bot-integration.test.ts`, `src/scripts/test-bot.ts`) pour prendre en compte la nouvelle configuration, assurer les scénarios d'erreur et accepter les métriques supplémentaires.
- Ajout des nouveaux types nécessaires (`src/types/index.ts`) et mise à jour des dépendances (`package.json`, `package-lock.json`).
