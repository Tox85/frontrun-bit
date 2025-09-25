# Démonstration du BithumbBot

Ce document montre comment utiliser le bot de détection ultra-rapide de nouvelles annonces Bithumb.

## 🚀 Démarrage rapide

### 1. Installation des dépendances
```bash
npm install
```

### 2. Configuration
```bash
cp env.example .env
# Modifier .env avec vos paramètres
```

### 3. Test avec données mockées
```bash
npm run test:bot
```

### 4. Tests unitaires
```bash
npm test
```

### 5. Tests de performance
```bash
npm run test:performance
```

### 6. Démarrage en mode développement
```bash
npm run dev
```

### 7. Compilation et démarrage en production
```bash
npm run build
npm start
```

## 📊 Exemple de sortie

### Mode développement
```
[2025-01-15T10:00:00.000Z] ℹ️ INFO: 🚀 Démarrage de BithumbBot
[2025-01-15T10:00:00.001Z] ℹ️ INFO: 📡 URL cible: https://feed.bithumb.com/notice?category=9&page=1
[2025-01-15T10:00:00.002Z] ℹ️ INFO: ⏱️ Intervalle de polling: 300ms
[2025-01-15T10:00:00.003Z] ℹ️ INFO: 🔧 Proxy: Désactivé
[2025-01-15T10:00:00.004Z] ℹ️ INFO: 📝 Format de log: text
[2025-01-15T10:00:00.005Z] ℹ️ INFO: 📊 Niveau de log: info
[2025-01-15T10:00:00.006Z] ℹ️ INFO: ✅ Connexion Telegram validée
[2025-01-15T10:00:00.007Z] ℹ️ INFO: 🔍 Initialisation du lastSeenId...
[2025-01-15T10:00:00.008Z] ℹ️ INFO: ✅ LastSeenId initialisé: 1649812
[2025-01-15T10:00:00.009Z] ℹ️ INFO: 🚀 Bot démarré avec succès
[2025-01-15T10:00:00.010Z] 🔍 DEBUG: Cycle #1 - ✅ OK - Latence: 45ms, Parse: 2ms
[2025-01-15T10:00:00.311Z] 🔍 DEBUG: Cycle #2 - ✅ OK - Latence: 38ms, Parse: 1ms
[2025-01-15T10:00:00.612Z] 🔍 DEBUG: Cycle #3 - 🆕 NOUVEAU - Latence: 42ms, Parse: 3ms
[2025-01-15T10:00:00.613Z] ℹ️ INFO: 🆕 Nouvelle annonce détectée: EUL
[2025-01-15T10:00:00.614Z] 🔔 NOUVEAU TOKEN DÉTECTÉ: EUL
  📝 Titre: 오일러(EUL) 원화 마켓 추가
  ⚡ Latence: 300ms
  🔍 Parse: 3ms
  📤 Telegram: 85ms
  ⏰ Délai annonce: 610ms
```

### Mode JSON (production)
```json
{"timestamp":"2025-01-15T10:00:00.614Z","event":"NEW_TOKEN","title":"오일러(EUL) 원화 마켓 추가","symbol":"EUL","metrics":{"latency_since_last_check_ms":300,"parse_time_ms":3,"telegram_send_time_ms":85,"announce_delay_ms":610}}
```

## 🔧 Configuration avancée

### Variables d'environnement détaillées

```env
# Configuration Telegram (requis)
TELEGRAM_BOT_TOKEN=123456:ABC-DEF1234567890abcdefghijklmnopqrstuvwxyz
TELEGRAM_CHAT_ID=-1001234567890

# Configuration du polling
POLL_MS=300                    # Intervalle en millisecondes (100-5000)
TARGET_URL=https://feed.bithumb.com/notice?category=9&page=1

# Configuration du proxy (optionnel)
USE_PROXY=false               # Activer le proxy Cloudflare
PROXY_URL=https://your-worker.workers.dev

# Configuration du logging
LOG_LEVEL=info                # debug, info, warn, error
LOG_FORMAT=text               # text ou json
```

### Optimisations de performance

#### Pour une latence maximale
```env
POLL_MS=200
LOG_LEVEL=warn
LOG_FORMAT=json
```

#### Pour la stabilité
```env
POLL_MS=500
LOG_LEVEL=info
LOG_FORMAT=text
```

#### Avec proxy Cloudflare
```env
USE_PROXY=true
PROXY_URL=https://bithumb-proxy.your-subdomain.workers.dev
```

## 🐳 Déploiement Docker

### Construction de l'image
```bash
docker build -t bithumb-bot .
```

### Exécution avec variables d'environnement
```bash
docker run -d \
  --name bithumb-bot \
  -e TELEGRAM_BOT_TOKEN="your-token" \
  -e TELEGRAM_CHAT_ID="your-chat-id" \
  -e POLL_MS=300 \
  bithumb-bot
```

### Exécution avec fichier .env
```bash
docker run -d \
  --name bithumb-bot \
  --env-file .env \
  bithumb-bot
```

## ☁️ Déploiement Cloudflare Worker

### 1. Installation de Wrangler
```bash
npm install -g wrangler
```

### 2. Connexion à Cloudflare
```bash
wrangler login
```

### 3. Déploiement
```bash
wrangler deploy
```

### 4. Configuration du bot
```env
USE_PROXY=true
PROXY_URL=https://bithumb-proxy.your-subdomain.workers.dev
```

## 📈 Monitoring et métriques

### Métriques disponibles
- **Latence de polling** : Temps entre les cycles de vérification
- **Temps de parsing** : Durée d'analyse des données HTML/JSON
- **Temps d'envoi Telegram** : Latence des notifications
- **Délai de détection** : Retard par rapport à l'annonce officielle

### Exemple de rapport de performance
```
📊 MÉTRIQUES DE PERFORMANCE
============================
🔄 Cycles totaux: 1000
🔍 Détections: 5
⚡ Latence moyenne: 45ms
🔍 Parse moyen: 2ms
📤 Telegram moyen: 85ms
⏱️ Uptime: 5m 30s
❌ Taux d'erreur: 0.1%
```

## 🧪 Tests et validation

### Tests unitaires
```bash
npm test
```

### Tests de performance
```bash
npm run test:performance
```

### Tests d'intégration
```bash
npm run test:integration
```

### Test avec données mockées
```bash
npm run test:bot
```

## 🚨 Dépannage

### Problèmes courants

#### Erreur 403 Cloudflare
```
❌ Erreur lors de la récupération des annonces: 403 Forbidden
```
**Solution** : Activer le proxy Cloudflare
```env
USE_PROXY=true
PROXY_URL=https://your-worker.workers.dev
```

#### Token Telegram invalide
```
❌ Configuration Telegram invalide
```
**Solution** : Vérifier le format du token
```
Format attendu: 123456:ABC-DEF1234567890abcdefghijklmnopqrstuvwxyz
```

#### Chat ID invalide
```
❌ Format de chat ID Telegram invalide
```
**Solution** : Utiliser un chat ID valide
```
Canal: -1001234567890
Groupe: -1234567890
Chat privé: 123456789
```

### Logs de debug
```bash
LOG_LEVEL=debug npm run dev
```

## 📱 Format des notifications Telegram

### Notification standard
```
🔔 Nouveau token détecté : EUL

📝 Titre : 오일러(EUL) 원화 마켓 추가
⏰ Heure de détection : 2025-01-15T10:00:01.500Z
⚡ Délai de détection : 0.61s après l'annonce officielle

🚀 Détection ultra-rapide par BithumbBot
```

### Message de statut
```
🤖 BithumbBot Status

Bot de détection Bithumb démarré avec succès
```

### Message d'erreur
```
❌ Erreur BithumbBot

Erreur de polling (10 erreurs)

📋 Contexte : Cycle #150

⏰ 2025-01-15T10:00:01.500Z
```

## 🔒 Sécurité

### Bonnes pratiques
- Ne jamais commiter le fichier `.env`
- Utiliser des tokens avec des permissions minimales
- Surveiller les logs pour détecter les anomalies
- Mettre à jour régulièrement les dépendances

### Variables sensibles
- `TELEGRAM_BOT_TOKEN` : Token secret du bot
- `TELEGRAM_CHAT_ID` : ID du chat (peut être public)

## 📚 API et intégration

### Structure des données
```typescript
interface Announcement {
  id: string;
  title: string;
  timestamp?: string;
  url?: string;
}

interface DetectionEvent {
  timestamp: string;
  event: 'NEW_TOKEN';
  title: string;
  symbol: string;
  metrics: DetectionMetrics;
}
```

### Webhooks (futur)
Le bot peut être étendu pour envoyer des webhooks HTTP en plus des notifications Telegram.

## 🤝 Contribution

### Structure du projet
```
src/
├── config/          # Configuration
├── modules/         # Modules principaux
├── tests/           # Tests
├── scripts/         # Scripts utilitaires
├── types/           # Types TypeScript
└── index.ts         # Point d'entrée
```

### Ajout de fonctionnalités
1. Créer un nouveau module dans `src/modules/`
2. Ajouter les tests correspondants
3. Mettre à jour la documentation
4. Tester avec `npm run test:bot`

---

**Note** : Ce bot est conçu pour des fins éducatives et de recherche. Respectez les conditions d'utilisation de Bithumb et les lois applicables.
