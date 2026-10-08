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
# Migrations run against whatever DATABASE_URL the platform injects, from
# inside the platform's own network, before the server starts accepting
# traffic -- avoids needing a developer laptop to have direct DB access.
CMD ["sh", "-c", "node packages/server/dist/db/migrate.js && node packages/server/dist/index.js"]
