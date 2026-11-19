FROM node:22-bookworm-slim@sha256:e9f565d32859f0cbfb52125eafe8be39390f24dac302dc3cdf566e8ba3ab21ee AS dependencies
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

FROM dependencies AS app
WORKDIR /app
COPY --chown=node:node . .
RUN npm run build
# Vite writes a temporary compiled config in node_modules at startup. Ensure
# the unprivileged runtime account can create that cache without root access.
RUN chown -R node:node /app/node_modules
USER node
EXPOSE 3000 5173
CMD ["node", "./node_modules/tsx/dist/cli.mjs", "api/server.ts"]
