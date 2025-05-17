FROM node:22

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

# Expose the development server port
EXPOSE 3000

# Run Vite in development mode with host binding to allow external connections
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0", "--port", "3000"]
