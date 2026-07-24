# Stage 1: Build dependencies and transpile code
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

# Stage 2: Production runner environment
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

# Install only production dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy from builder stage
COPY --from=builder /app ./

# Run container as non-privileged non-root user
USER node

EXPOSE 5000

CMD ["node", "server.js"]
