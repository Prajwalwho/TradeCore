# ---- Stage 1: build the C++ engine ----
FROM node:22-slim AS engine-build
RUN apt-get update && apt-get install -y cmake g++ git libgtest-dev nlohmann-json3-dev \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /engine
COPY engine/ .
RUN cmake -S . -B build -DCMAKE_BUILD_TYPE=Release \
    && cmake --build build --target engine_server -j"$(nproc)"

# ---- Stage 2: build the backend ----
FROM node:22-slim AS backend-build
WORKDIR /app
COPY backend/package*.json ./
RUN npm ci
COPY backend/ .
RUN npx tsc

# ---- Stage 3: production image ----
FROM node:22-slim
WORKDIR /app
COPY backend/package*.json ./
RUN npm ci 
COPY --from=backend-build /app/dist ./dist
COPY --from=backend-build /app/drizzle ./drizzle
COPY --from=backend-build /app/drizzle.config.ts ./
COPY --from=engine-build /engine/build/engine_server ./engine/build/engine_server
RUN chmod +x ./engine/build/engine_server

ENV ENGINE_BINARY=./engine/build/engine_server
EXPOSE 3000
CMD ["node", "dist/index.js"]