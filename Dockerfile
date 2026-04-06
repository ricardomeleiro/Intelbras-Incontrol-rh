# ── Stage 1: Backend Node.js ──────────────────────────────
FROM node:20-alpine AS backend
WORKDIR /app
COPY backend/package.json .
RUN npm install --production
COPY backend/server.js .

# ── Stage 2: Frontend + Nginx com proxy para backend ──────
FROM nginx:alpine

# Instala Node.js no container Nginx para rodar o backend junto
RUN apk add --no-cache nodejs npm

# Copia o backend já instalado
WORKDIR /app/backend
COPY --from=backend /app /app/backend

# Copia o frontend
COPY frontend/index.html /usr/share/nginx/html/index.html
COPY frontend/nginx-standalone.conf /etc/nginx/conf.d/default.conf

# Script de entrada que sobe Node + Nginx simultaneamente
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

EXPOSE 80

ENTRYPOINT ["/docker-entrypoint.sh"]
