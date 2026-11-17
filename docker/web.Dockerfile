FROM node:22.22.3-bookworm-slim
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
RUN corepack enable && pnpm --filter @cafeclick/web install --frozen-lockfile
COPY apps/web/ apps/web/
EXPOSE 3000
CMD ["pnpm", "--filter", "@cafeclick/web", "dev", "--host", "0.0.0.0", "--port", "3000"]
