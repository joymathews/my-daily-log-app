FROM node:22

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
COPY create-table.sh /app/create-table.sh
RUN chmod +x /app/create-table.sh
COPY wait-for-it.sh /app/wait-for-it.sh
RUN chmod +x /app/wait-for-it.sh

# Install netcat-openbsd explicitly
RUN apt-get update && apt-get install -y netcat-openbsd

# Install AWS CLI for the create-table.sh script
RUN apt-get update && apt-get install -y curl unzip \
    && curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip" \
    && unzip awscliv2.zip \
    && ./aws/install \
    && rm -rf awscliv2.zip aws

EXPOSE 3001
CMD ["/bin/bash", "-c", "/app/wait-for-it.sh ${DYNAMODB_HOST:-dynamodb} ${DYNAMODB_PORT:-8000} -- /app/create-table.sh && node index.js"]
