# syntax=docker/dockerfile:1
FROM node:22-bookworm-slim AS builder

WORKDIR /app

# Set memory limit to prevent QEMU OOM during multi-arch buildx (amd64 / arm64)
ENV NODE_OPTIONS="--max-old-space-size=4096"

# Install dependencies (all multi-arch native bindings are declared in package.json)
COPY package*.json ./
RUN if [ -f package-lock.json ]; then npm ci || npm install; else npm install; fi

# Copy source and build frontend
COPY . .
RUN npm run build

# Production runtime stage
FROM node:22-bookworm-slim AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV DATA_DIR=/app/data

# Create data directories for dual-path persistence (/app/data and /data)
RUN mkdir -p /app/data /data

COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/server ./server
COPY --from=builder /app/server.ts ./server.ts
COPY --from=builder /app/tsconfig.json ./tsconfig.json
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

EXPOSE 3000
VOLUME ["/app/data", "/data"]

ENTRYPOINT ["/docker-entrypoint.sh"]
CMD ["npx", "tsx", "server.ts"]
