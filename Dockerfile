# Stage 1: Build
FROM node:20-alpine AS builder
WORKDIR /usr/src/flexio-api

# Copy only the package files for installation
COPY prisma package.json package-lock.json ./

# Install dependencies using npm ci for cleaner installs
# RUN npm ci --unsafe-perm
RUN npm install --frozen-lockfile --unsafe-perm

# Copy the source code after dependencies are installed
COPY . .

# Build the application
RUN npm run build

# Stage 2: Production
FROM node:20-alpine
WORKDIR /usr/src/flexio-api

# Copy only the necessary files from builder stage
COPY package.json package-lock.json ./
COPY --from=builder /usr/src/flexio-api/node_modules /usr/src/flexio-api/node_modules
COPY --from=builder /usr/src/flexio-api/dist /usr/src/flexio-api/dist

EXPOSE 4500
CMD ["/usr/src/flexio-api/dist/server.js"]