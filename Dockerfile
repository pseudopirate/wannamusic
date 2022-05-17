FROM mhart/alpine-node:14

WORKDIR /app
RUN apk add --no-cache ffmpeg
COPY tsconfig.json package.json package-lock.json ./
RUN  npm ci
COPY src ./src
RUN npm run build && npm prune --production

CMD npm start
