# syntax=docker/dockerfile:1

FROM node:20-alpine AS base
RUN corepack enable && corepack prepare pnpm@9.15.9 --activate
WORKDIR /app

FROM base AS deps
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml* turbo.json tsconfig.base.json ./
COPY shared/package.json shared/
COPY backend/package.json backend/
RUN pnpm install --filter @your-academy/backend... --frozen-lockfile

FROM base AS build
COPY --from=deps /app /app
COPY shared shared
COPY backend backend
RUN pnpm --filter @your-academy/shared build && pnpm --filter @your-academy/backend build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup -S youracademy && adduser -S youracademy -G youracademy
COPY --from=build /app/package.json /app/pnpm-workspace.yaml ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/shared ./shared
COPY --from=build /app/backend ./backend
# prisma CLI must remain available for the one-shot migrate service
USER youracademy
WORKDIR /app/backend
EXPOSE 5000
HEALTHCHECK --interval=10s --timeout=5s --retries=5 CMD node -e "fetch('http://127.0.0.1:5000/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "dist/main.js"]
