# One image for both processes (web + worker): the workspace packages ship TypeScript
# source, the web app is built with `next build` and the worker runs on tsx.
FROM node:22-bookworm-slim AS base
ENV PNPM_HOME=/pnpm PATH=/pnpm:$PATH NEXT_TELEMETRY_DISABLED=1
RUN corepack enable && corepack prepare pnpm@10.28.0 --activate
# ffmpeg for media processing; fonts for captions; shared libs for Remotion's headless Chrome
RUN apt-get update && apt-get install -y --no-install-recommends \
      ffmpeg fonts-inter fonts-dejavu-core fontconfig ca-certificates \
      libnss3 libdbus-1-3 libatk1.0-0 libatk-bridge2.0-0 libgbm1 libasound2 libxrandr2 \
      libxkbcommon0 libxfixes3 libxcomposite1 libxdamage1 libpango-1.0-0 libcairo2 libcups2 \
      build-essential git \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /app

FROM base AS deps
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/web/package.json apps/web/
COPY apps/worker/package.json apps/worker/
COPY packages/core/package.json packages/core/
COPY packages/db/package.json packages/db/
COPY packages/storage/package.json packages/storage/
COPY packages/providers/package.json packages/providers/
COPY packages/render/package.json packages/render/
COPY packages/bible/package.json packages/bible/
RUN pnpm install --frozen-lockfile

FROM deps AS app
COPY . .
# Public-domain Bible corpora (BSB, KJV, DRC, CPDV) for grounding and on-screen verses
RUN pnpm --filter @media-studio/bible fetch-data
# Chrome Headless Shell for Remotion rendering
RUN cd packages/render && pnpm exec remotion browser ensure
# Optional word-level caption alignment (adds ~2 min to the build)
ARG INSTALL_WHISPER=true
RUN if [ "$INSTALL_WHISPER" = "true" ]; then WHISPER_CPP_DIR=/opt/whisper pnpm --filter @media-studio/render install-whisper || echo "whisper.cpp install failed; captions will use estimated timings"; fi
RUN pnpm --filter @media-studio/web build
ENV NODE_ENV=production
EXPOSE 3000
