# Cố tình sử dụng Base Image Node.js phiên bản rất cũ (v14) chứa nhiều lỗ hổng hệ điều hành
FROM node:14-alpine

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

EXPOSE 3000
CMD ["node", "server.js"]
