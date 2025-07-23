# Multi-stage build for production optimization
# Stage 1: Build stage with all dependencies
FROM node:18-alpine AS builder

# Set working directory
WORKDIR /app

# Install dependencies (both prod and dev for building)
COPY package*.json ./
RUN npm ci

# Copy application code
COPY . .

# Build the Next.js application (requires devDependencies)
RUN npm run build

# Stage 2: Production stage with only runtime dependencies
FROM node:18-alpine AS runner

# Set working directory
WORKDIR /app

# Set environment variables for production
ENV NODE_ENV=production
ENV PORT=3000

# Install only production dependencies
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

# Copy built application from builder stage
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/server.js ./
COPY --from=builder /app/prisma ./prisma

# Create non-root user for security
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Change ownership of app directory
RUN chown -R nextjs:nodejs /app
USER nextjs

# Expose the port the app runs on
EXPOSE 3000

# Start the application using our custom server with Socket.io
CMD ["npm", "run", "start:server"]