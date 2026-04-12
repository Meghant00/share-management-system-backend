FROM node:22.12.0-bookworm-slim

WORKDIR /app


COPY package*.json ./

RUN npm install


RUN npx playwright install --with-deps chromium

COPY . .

RUN npm run build

EXPOSE 3000

CMD ["npm", "run", "start:prod"]