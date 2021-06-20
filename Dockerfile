FROM node:14.17

EXPOSE 3000
RUN apt update -y && apt install ffmpeg -y
WORKDIR /opt/app
COPY package.json package-lock.json /opt/app
RUN  npm ci
COPY . .

CMD npm start