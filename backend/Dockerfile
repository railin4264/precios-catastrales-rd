FROM node:20-slim

# Install system dependencies for Prisma and Puppeteer
RUN apt-get update && apt-get install -y \
    openssl \
    libnss3 \
    libatk-bridge2.0-0 \
    libxcomposite1 \
    libxdamage1 \
    libxrandr2 \
    libgbm1 \
    libasound2 \
    libpangocairo-1.0-0 \
    libxshmfence1 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

# Generate Prisma client and build TypeScript
RUN npx prisma generate
RUN npm run build

# Copy and set entrypoint permissions
COPY entrypoint.sh /app/entrypoint.sh
RUN chmod +x /app/entrypoint.sh

EXPOSE 4000

# The entrypoint runs migrations then starts the server
ENTRYPOINT ["/app/entrypoint.sh"]
