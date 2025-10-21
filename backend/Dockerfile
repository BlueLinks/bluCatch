FROM node:20-alpine

WORKDIR /app

# Install dependencies for better-sqlite3
RUN apk add --no-cache python3 make g++

# Copy package files
COPY backend/package*.json ./
RUN npm install --omit=dev --no-audit

# Copy backend code
COPY backend/ .

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --retries=3 \
    CMD wget --quiet --tries=1 --spider http://localhost:3001/health || exit 1

CMD ["node", "server.js"]

