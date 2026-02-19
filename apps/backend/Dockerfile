FROM node:20-alpine

RUN apk add --no-cache openssl libc6-compat

WORKDIR /app/apps/backend

# Copy only backend sources (simple monorepo build)
COPY apps/backend/package.json ./package.json
COPY apps/backend/tsconfig.json ./tsconfig.json
COPY apps/backend/eslint.config.js ./eslint.config.js
COPY apps/backend/.prettierrc ./.prettierrc
COPY apps/backend/vitest.config.ts ./vitest.config.ts
COPY apps/backend/prisma ./prisma
COPY apps/backend/src ./src

RUN npm install \
  && npx prisma generate \
  && npm run build

COPY apps/backend/docker-entrypoint.sh ./docker-entrypoint.sh
RUN chmod +x ./docker-entrypoint.sh

EXPOSE 8080

CMD ["./docker-entrypoint.sh"]
