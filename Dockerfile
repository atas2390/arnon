FROM node:22-alpine
RUN addgroup -S arnon && adduser -S arnon -G arnon
WORKDIR /app
COPY relay/package.json relay/server.js ./
RUN npm ci --omit=dev
USER arnon
EXPOSE 9444
CMD ["node", "server.js", "--port", "9444"]
