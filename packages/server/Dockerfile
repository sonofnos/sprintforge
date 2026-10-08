FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
COPY packages/server/package.json packages/server/package.json
RUN npm ci --workspace packages/server
COPY packages/server packages/server
RUN npm run build --workspace packages/server

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY package.json package-lock.json ./
COPY packages/server/package.json packages/server/package.json
RUN npm ci --workspace packages/server --omit=dev
COPY --from=build /app/packages/server/dist packages/server/dist
COPY packages/server/db packages/server/db
EXPOSE 4000
CMD ["node", "packages/server/dist/index.js"]
