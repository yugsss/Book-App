# Use official Node.js 20 (LTS) image
FROM node:20-alpine

# Set working directory
WORKDIR /usr/src/app

# Copy package files first for caching
COPY functions/package*.json ./

# Install production dependencies only
RUN npm install --only=production

# Copy the rest of the application
COPY functions/ ./

# Copy frontend files (if applicable)
COPY public/ ./public/

# Set environment variables
ENV PORT=8080
ENV NODE_ENV=production

# Expose the app port
EXPOSE ${PORT}

# Start the application
CMD ["node", "index.js"]