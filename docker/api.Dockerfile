FROM node:22.22.3-bookworm-slim AS base
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
RUN corepack enable && pnpm --version

FROM base AS build
RUN pnpm --filter @cafeclick/api install --frozen-lockfile
COPY apps/api/src/ apps/api/src/
COPY apps/api/tsconfig.json apps/api/
RUN pnpm --filter @cafeclick/api build

FROM base AS runtime
ENV NODE_ENV=production
ENV DATABASE_DIR=/app/database
RUN pnpm --filter @cafeclick/api install --prod --frozen-lockfile
COPY --from=build /app/apps/api/dist/ apps/api/dist/
COPY database/ database/
WORKDIR /app/apps/api
USER node
EXPOSE 3001
CMD ["sh", "-c", "node dist/database/migrate.js && exec node dist/server.js"]
