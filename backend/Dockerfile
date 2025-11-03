# Build stage
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY backend/package*.json ./package.json

COPY backend/.env ./.env

# Install all dependencies
RUN npm ci

# Copy source code
COPY backend ./

# Generate Prisma client
RUN npx prisma generate

# Build the application
RUN npm run build

# Production stage
FROM node:18-alpine AS production

WORKDIR /app

# Copy package files
COPY backend/package*.json ./package.json

# Install only production dependencies
RUN npm ci --only=production

# Copy built application from builder stage
COPY --from=builder /app/dist ./dist

# Expose port
EXPOSE 3001

# Start the application
CMD ["npm", "start"]