FROM node:24-alpine

WORKDIR /app

COPY package.json yarn.lock* package-lock.json* ./

RUN yarn install --frozen-lockfile || npm ci

COPY . .

EXPOSE 8082

CMD ["yarn", "web", "--", "--host", "0.0.0.0", "--port", "8082"]
