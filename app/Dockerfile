# Stage 1: Runtime
FROM node:20-alpine

# Set non-root working directory
WORKDIR /usr/src/app

# Security: Install curl for healthcheck
RUN apk add --no-cache curl

# Copy dependency files first for layer caching
COPY package*.json ./

# Install production dependencies
RUN npm install --omit=dev

# Copy application source code
COPY . .

# Security Hardening: Ensure proper permissions and switch to unprivileged 'node' user
RUN chown -R node:node /usr/src/app
USER node

# Expose internal app port
EXPOSE 3000

# Built-in container healthcheck
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:3000/health || exit 1

# Start the application
CMD ["node", "server.js"]
