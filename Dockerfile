# Stage 1: Builder
FROM node:22.13.1-alpine3.23 AS builder

WORKDIR /app

# Copy dependency manifests
COPY package.json pnpm-lock.yaml ./

# Enable pnpm and install all dependencies (including devDependencies for build)
RUN corepack enable && pnpm install --frozen-lockfile

# Copy source code
COPY tsconfig.json ./
COPY src ./src

# Compile TypeScript to JavaScript
RUN pnpm build

# Stage 2: Production
FROM node:22.13.1-alpine3.23

# Install tini for PID 1 signal handling (INFRA-03 requirement)
RUN apk add --no-cache tini

WORKDIR /app

# Copy dependency manifests
COPY package.json pnpm-lock.yaml ./

# Enable pnpm and install ONLY production dependencies
RUN corepack enable && pnpm install --frozen-lockfile --prod

# Copy compiled JavaScript from builder stage
COPY --from=builder /app/build ./build

# Run as non-root user for security
USER node

# Expose HTTP port
EXPOSE 3000

# Health check (placeholder - actual healthcheck.js created in Plan 04)
HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
  CMD node /app/build/healthcheck.js || exit 1

# Use tini as PID 1 to forward signals
ENTRYPOINT ["/sbin/tini", "--"]

# Start server
CMD ["node", "build/server.js"]
