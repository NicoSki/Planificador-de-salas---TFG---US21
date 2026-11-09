FROM node:24-slim
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev --ignore-scripts
COPY prisma.config.js ./
COPY src ./src
RUN DATABASE_URL=postgresql://x:x@localhost:5432/x npx prisma generate
USER node
EXPOSE 4000
CMD ["sh", "-c", "npm run db:aplicar && node src/index.js"]
