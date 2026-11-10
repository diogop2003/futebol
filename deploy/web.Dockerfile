FROM node:22-alpine AS build
WORKDIR /app
COPY pelada-front/package*.json ./
RUN npm ci
COPY pelada-front/ ./
RUN npm run build

FROM nginx:stable-alpine
COPY deploy/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist/pelada-web/browser /usr/share/nginx/html
