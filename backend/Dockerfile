FROM node:22

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

# Install netcat-openbsd explicitly
RUN apt-get update && apt-get install -y netcat-openbsd

# Install AWS CLI for the create-table.sh script
RUN apt-get update && apt-get install -y curl unzip \
    && curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip" \
    && unzip awscliv2.zip \
    && ./aws/install \
    && rm -rf awscliv2.zip aws

# Install dos2unix for line-ending conversion
RUN apt-get update && apt-get install -y dos2unix

# Copy and convert wait-for-it.sh to Unix line endings
COPY wait-for-it.sh /app/wait-for-it.sh
RUN dos2unix /app/wait-for-it.sh && chmod +x /app/wait-for-it.sh
COPY create-table.sh /app/create-table.sh
RUN dos2unix /app/create-table.sh && chmod +x /app/create-table.sh

EXPOSE 3001
CMD ["/bin/bash", "-c", "/app/wait-for-it.sh ${DYNAMODB_HOST:-dynamodb} ${DYNAMODB_PORT:-8000} -- /app/create-table.sh && node index.js"]
