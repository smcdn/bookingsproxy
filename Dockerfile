FROM node:lts-alpine
ENV NODE_ENV=production
WORKDIR /usr/src/app
COPY "package*.json" "./"
RUN npm install --production
COPY . .
EXPOSE 8081
RUN chown -R node /usr/src/app
USER node
CMD ["npm", "start"]
