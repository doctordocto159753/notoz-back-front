# syntax=docker/dockerfile:1

FROM node:20-alpine AS deps
WORKDIR /app
COPY apps/frontend/package.json ./package.json
RUN npm install

FROM node:20-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY apps/frontend ./
# Build-time API base URL for Vite (can be overridden via --build-arg)
ARG VITE_API_BASE_URL=http://localhost:8080
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/dist ./dist
# vite preview is sufficient for local; serves static build
RUN npm install -g vite@6.3.5
EXPOSE 3000
CMD ["vite", "preview", "--host", "0.0.0.0", "--port", "3000"]
