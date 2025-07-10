FROM node:18-alpine

# PostgreSQL-Client für Schema-Setup
RUN apk add --no-cache postgresql-client

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies including csv-parser and wait-port
RUN npm install csv-parser wait-port

# Copy source code
COPY . .

# Expose port
EXPOSE 5000

# Use standard Node.js start
CMD ["npm", "run", "dev"]