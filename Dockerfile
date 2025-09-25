# Dockerfile multi-stage pour BithumbBot
FROM node:20-alpine AS builder

# Installer les dépendances système nécessaires
RUN apk add --no-cache python3 make g++

# Définir le répertoire de travail
WORKDIR /app

# Copier les fichiers de dépendances
COPY package.json package-lock.json ./

# Installer les dépendances
RUN npm ci --only=production && npm cache clean --force

# Copier le code source
COPY . .

# Compiler TypeScript
RUN npm run build

# Stage de production
FROM node:20-alpine

# Installer les dépendances système minimales
RUN apk add --no-cache dumb-init

# Créer un utilisateur non-root
RUN addgroup -g 1001 -S nodejs && \
    adduser -S bithumb -u 1001

# Définir le répertoire de travail
WORKDIR /app

# Copier les fichiers compilés et les dépendances depuis le builder
COPY --from=builder --chown=bithumb:nodejs /app/dist ./dist
COPY --from=builder --chown=bithumb:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=bithumb:nodejs /app/package.json ./

# Changer vers l'utilisateur non-root
USER bithumb

# Exposer le port (optionnel, pour monitoring)
EXPOSE 3000

# Variables d'environnement par défaut
ENV NODE_ENV=production
ENV POLL_MS=300
ENV LOG_LEVEL=info
ENV LOG_FORMAT=json

# Point d'entrée
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/index.js"]
