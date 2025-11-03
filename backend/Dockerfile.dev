# ---- Builder Stage ----
# This stage installs all dependencies, generates the Prisma client, and builds the TypeScript code.
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package.json and lock file first to leverage Docker cache
COPY package*.json ./

# Copy the Prisma schema file
COPY prisma ./prisma/

# Install all dependencies (including devDependencies like typescript and prisma)
RUN npm ci

# Copy the rest of your application's source code
COPY . .

# Provide a dummy DATABASE_URL for the prisma generate command.
# This is ONLY for the build step. Render will provide the real one at runtime.
# The value must be a correctly formatted but fake connection string.
ENV DATABASE_URL="postgresql://user:password@host:port/db?schema=public"

# Generate the Prisma Client. This MUST happen before the build step.
RUN npx prisma generate

# Build the TypeScript application into JavaScript
RUN npm run build


# ---- Production Stage ----
# This stage creates the final, lean image for running the application.
FROM node:18-alpine AS production

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install ONLY production dependencies to keep the image small
RUN npm ci --only=production

# Copy the compiled JavaScript code from the builder stage
COPY --from=builder /app/dist ./dist

# Copy the generated Prisma client from the builder stage.
# This is essential for your application to connect to the database.
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

# Copy the Prisma schema. This is good practice and may be needed for runtime features.
COPY --from=builder /app/prisma ./prisma

# Expose the port your application will run on
EXPOSE 3001

# The command to start your application
# Ensure your "start" script in package.json points to the compiled output, e.g., "node dist/index.js"
CMD ["npm", "start"]