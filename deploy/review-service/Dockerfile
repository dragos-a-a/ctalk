FROM node:current-slim

# Set the working directory in the container to /app
WORKDIR /app

# Bundle the common module
COPY packages/common/ packages/common/
COPY packages/review-service/ packages/review-service/

# Copy package.json to the working directory
COPY package.json ./

# Copy typescript config files to the working directory
COPY tsconfig.json ./
COPY tsup.config.ts ./

# Install any needed packages specified in package.json
RUN npm install

# Build the TypeScript files
RUN npm run build

# Make port 8080 available to the world outside the container
EXPOSE 8080

# Run the app when the container launches
CMD ["npm", "run", "start:review"]