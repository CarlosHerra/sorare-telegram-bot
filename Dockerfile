# -- Stage 1: Build the React Client --
FROM node:18-alpine AS client_builder
WORKDIR /app/client

# Copy package.json and install dependencies
COPY client/package*.json ./
RUN npm install

# Copy the rest of the client code and build
COPY client/ ./
RUN npm run build

# -- Stage 2: Build Server and Setup App --
FROM node:18-alpine
WORKDIR /app/server

# Copy package.json and install only production dependencies
COPY server/package*.json ./
RUN npm install --production

# Copy backend files
COPY server/ ./

# Create directory for built client files
RUN mkdir -p /app/client/dist

# Copy the built client from the previous stage
COPY --from=client_builder /app/client/dist /app/client/dist

# Expose the API port
EXPOSE 3001

# Set the production environment so express.static works
ENV NODE_ENV=production

# Start the server
CMD ["node", "index.js"]
