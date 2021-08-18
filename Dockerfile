FROM mhart/alpine-node:14

WORKDIR /app
COPY package.json package-lock.json ./
RUN  npm ci --prod

FROM mhart/alpine-node:slim-14

RUN apk add --no-cache ffmpeg
WORKDIR /app
COPY --from=0 /app .
COPY . .

CMD node src