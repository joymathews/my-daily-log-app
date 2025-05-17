FROM localstack/localstack:latest

# Install AWS CLI and other required tools
RUN apt-get update && \
    apt-get install -y \
    python3-pip \
    netcat-traditional \
    curl \
    unzip \
    && pip3 install --no-cache-dir awscli

# Create LocalStack temp directories
RUN mkdir -p /tmp/localstack_tmp /tmp/localstack_data && \
    chmod 777 /tmp/localstack_tmp /tmp/localstack_data

# Install dos2unix to convert Windows line endings to Unix
RUN apt-get update && apt-get install -y dos2unix

# Copy initialization script, convert line endings, and set execute permissions
COPY init-aws.sh /docker-entrypoint-initaws.d/
RUN dos2unix /docker-entrypoint-initaws.d/init-aws.sh && \
    chmod +x /docker-entrypoint-initaws.d/init-aws.sh

# Ensure LocalStack directories exist and have proper permissions
VOLUME ["/tmp/localstack_data", "/tmp/localstack_tmp"]

# Configure default AWS CLI settings
ENV AWS_ACCESS_KEY_ID=dummy
ENV AWS_SECRET_ACCESS_KEY=dummy
ENV AWS_DEFAULT_REGION=us-east-1
