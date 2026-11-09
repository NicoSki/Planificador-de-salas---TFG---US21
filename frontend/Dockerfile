#1) Compila la interfaz con Vite
FROM node:24-slim AS compilacion
WORKDIR /app
COPY package*.json ./
RUN npm ci --ignore-scripts
COPY . .
RUN npm run build

#2) nginx sirve dist y reenvía /api a la API
FROM nginx:stable-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=compilacion /app/dist /usr/share/nginx/html
