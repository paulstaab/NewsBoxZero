# syntax=docker/dockerfile:1.7

FROM node:18-alpine AS runtime
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=8000

# Install minimal tooling to serve static assets
RUN apk add --no-cache dumb-init \
	&& npm install --global serve@14 \
	&& addgroup -g 65532 -S app \
	&& adduser -S -u 65532 -G app app

# Copy exported site produced locally (e.g., via npm run export)
ADD --chmod=555 out /app

USER 65532
EXPOSE 8000

ENTRYPOINT ["/usr/bin/dumb-init", "--"]
CMD ["serve", "-s", "/app", "-l", "8000"]
