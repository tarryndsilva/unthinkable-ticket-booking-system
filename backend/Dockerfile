FROM node:20-slim

# Prisma's query engine needs OpenSSL at runtime; node:20-slim (Debian) doesn't
# include it by default.
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npx prisma generate
RUN npm run build

EXPOSE 4000

CMD ["node", "dist/server.js"]
