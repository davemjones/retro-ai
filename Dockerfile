FROM node:20-alpine

WORKDIR /app

# Install dependencies for Prisma
RUN apk add --no-cache libc6-compat openssl

# Copy package files
COPY package*.json ./
COPY yarn.lock* ./
COPY pnpm-lock.yaml* ./

# Install dependencies based on the lock file
RUN \
  if [ -f yarn.lock ]; then yarn --frozen-lockfile; \
  elif [ -f package-lock.json ]; then npm ci; \
  elif [ -f pnpm-lock.yaml ]; then corepack enable pnpm && pnpm i --frozen-lockfile; \
  else echo "No lockfile found. Please create one." && exit 1; \
  fi

# Copy the rest of the application
COPY . .

# Generate Prisma client
RUN npx prisma generate

# Expose the port
EXPOSE 3000

# Start the development server
CMD ["npm", "run", "dev"]