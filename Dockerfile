# First stage: Build the Node.js application
FROM node:18-alpine AS build

# Set the working directory inside the container to /app
WORKDIR /app

# Copy the package.json and package-lock.json files to the container
# This allows Docker to cache npm install step if package files haven't changed
COPY package*.json ./

# Install the dependencies defined in package.json
RUN npm ci

# Copy all other files from the host machine to the container
# This includes the application source code
COPY . .

# Run the build command to create production-ready static files
ARG PUBLIC_URL
RUN npm run build

# Second stage: Use Nginx to serve the built files
FROM nginx:1.21-alpine

# Copy the build output from the first stage to Nginx's default HTML directory
COPY --from=build /app/build /usr/share/nginx/html

# Expose port 80 so that the application can be accessed from outside the container
EXPOSE 80

# Add a health check to ensure Nginx is serving content properly
# This will help in detecting if the web server is functioning as expected
HEALTHCHECK CMD curl --fail http://localhost:80 || exit 1

# Run Nginx in the foreground to keep the container running
CMD ["nginx", "-g", "daemon off;"]
