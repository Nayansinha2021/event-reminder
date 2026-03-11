FROM node:18-alpine as build

WORKDIR /usr/src/app

COPY package*.json ./
RUN npm install

COPY . .
RUN chmod +x node_modules/.bin/vite
RUN npm run build

# Use Nginx to serve the build
FROM nginx:alpine
COPY --from=build /usr/src/app/dist /usr/share/nginx/html

# Expose port (Nginx defaults to 80)
EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
