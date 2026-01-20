FROM node:20-alpine

# Install serve globally
RUN npm install -g serve

# Set working directory
WORKDIR /app

# Copy only the build folder
COPY build ./build

# Expose port
EXPOSE 3000

# Serve the static files
CMD ["serve", "build", "-l", "3000"]
