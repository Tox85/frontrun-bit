# BithumbBot - Bot de Détection Ultra-Rapide

Bot TypeScript ultra-rapide pour détecter les nouvelles annonces de listing de tokens sur Bithumb et envoyer des notifications Telegram instantanées.

## 🚀 Fonctionnalités

- **Détection ultra-rapide** : Polling toutes les 200-400ms pour une latence < 1 seconde
- **Extraction automatique** : Extraction du symbole de token depuis le titre de l'annonce
- **Notifications Telegram** : Alertes instantanées avec horodatage précis
- **Mesures de performance** : Monitoring des latences et métriques détaillées
- **Contournement Cloudflare** : Support des proxies et cloudflare-scraper
- **Architecture modulaire** : Code organisé en modules réutilisables
- **Tests complets** : Suite de tests unitaires pour tous les composants

## 📋 Prérequis

- Node.js 20+
- npm ou yarn
- Token de bot Telegram
- Chat ID Telegram

## 🛠️ Installation

1. **Cloner le repository**
```bash
git clone <repository-url>
cd bithumb-bot
```

2. **Installer les dépendances**
```bash
npm install
```

3. **Configuration**
```bash
cp env.example .env
```

4. **Modifier le fichier .env**
```env
TELEGRAM_BOT_TOKEN=123456:ABC-DEF1234567890abcdefghijklmnopqrstuvwxyz
TELEGRAM_CHAT_ID=-1001234567890
POLL_MS=300
TARGET_URL=https://feed.bithumb.com/notice?category=9&page=1
USE_PROXY=false
PROXY_URL=https://your-worker.workers.dev
LOG_LEVEL=info
LOG_FORMAT=text
```

## 🚀 Utilisation

### Développement
```bash
npm run dev
```

### Production
```bash
npm run build
npm start
```

### Tests
```bash
npm test
npm run test:watch
```

## 🐳 Docker

### Construction
```bash
docker build -t bithumb-bot .
```

### Exécution
```bash
docker run -d \
  --name bithumb-bot \
  --env-file .env \
  bithumb-bot
```

## ☁️ Déploiement Cloudflare Worker

1. **Installer Wrangler**
```bash
npm install -g wrangler
```

2. **Se connecter à Cloudflare**
```bash
wrangler login
```

3. **Déployer le worker**
```bash
wrangler deploy
```

4. **Configurer le bot pour utiliser le proxy**
```env
USE_PROXY=true
PROXY_URL=https://bithumb-proxy.your-subdomain.workers.dev
```

## 📊 Architecture

```
src/
├── config/          # Configuration et validation
├── modules/         # Modules principaux
│   ├── fetcher.ts   # Récupération des données
│   ├── analyzer.ts  # Analyse et extraction
│   ├── telegram.ts  # Notifications Telegram
│   └── logger.ts    # Journalisation et métriques
├── tests/           # Tests unitaires
├── types/           # Types TypeScript
└── index.ts         # Point d'entrée principal
```

## 🔧 Configuration

### Variables d'environnement

| Variable | Description | Défaut |
|----------|-------------|---------|
| `TELEGRAM_BOT_TOKEN` | Token du bot Telegram | **Requis** |
| `TELEGRAM_CHAT_ID` | ID du chat Telegram | **Requis** |
| `POLL_MS` | Intervalle de polling (ms) | `300` |
| `TARGET_URL` | URL de la page Bithumb | `https://feed.bithumb.com/notice?category=9&page=1` |
| `USE_PROXY` | Utiliser un proxy Cloudflare | `false` |
| `PROXY_URL` | URL du proxy | - |
| `LOG_LEVEL` | Niveau de log (debug/info/warn/error) | `info` |
| `LOG_FORMAT` | Format de log (text/json) | `text` |

### Optimisations

- **POLL_MS** : Réduire pour plus de réactivité (min: 100ms)
- **USE_PROXY** : Activer pour contourner Cloudflare
- **LOG_FORMAT** : Utiliser "json" pour l'analyse des logs

## 📈 Monitoring

Le bot génère des métriques détaillées :

- **Latence de polling** : Temps entre les cycles
- **Temps de parsing** : Durée d'analyse des données
- **Temps d'envoi Telegram** : Latence des notifications
- **Délai de détection** : Retard par rapport à l'annonce officielle

### Exemple de log JSON
```json
{
  "timestamp": "2025-01-15T10:00:01.500Z",
  "event": "NEW_TOKEN",
  "title": "오일러(EUL) 원화 마켓 추가",
  "symbol": "EUL",
  "metrics": {
    "latency_since_last_check_ms": 300,
    "parse_time_ms": 5,
    "telegram_send_time_ms": 80,
    "announce_delay_ms": 610
  }
}
```

## 🧪 Tests

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

## 🚨 Dépannage

### Erreurs communes

1. **Erreur 403 Cloudflare**
   - Activer `USE_PROXY=true`
   - Déployer le Cloudflare Worker
   - Configurer `PROXY_URL`

2. **Token Telegram invalide**
   - Vérifier le format du token
   - S'assurer que le bot est ajouté au chat

3. **Chat ID invalide**
   - Utiliser un chat ID négatif pour les canaux
   - Vérifier que le bot a les permissions

### Logs de debug

```bash
LOG_LEVEL=debug npm run dev
```

## 📝 Format des notifications

```
🔔 Nouveau token détecté : EUL

📝 Titre : 오일러(EUL) 원화 마켓 추가
⏰ Heure de détection : 2025-01-15T10:00:01.500Z
⚡ Délai de détection : 0.61s après l'annonce officielle

🚀 Détection ultra-rapide par BithumbBot
```

## 🔒 Sécurité

- Variables sensibles dans `.env`
- Utilisateur non-root dans Docker
- Validation des entrées
- Gestion des erreurs robuste

## 📄 Licence

MIT License - Voir le fichier LICENSE pour plus de détails.

## 🤝 Contribution

1. Fork le projet
2. Créer une branche feature
3. Commiter les changements
4. Pousser vers la branche
5. Ouvrir une Pull Request

## 📞 Support

Pour toute question ou problème, ouvrir une issue sur GitHub.

---

**⚠️ Avertissement** : Ce bot est destiné à des fins éducatives et de recherche. Respectez les conditions d'utilisation de Bithumb et les lois applicables.
