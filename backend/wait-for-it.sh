#!/bin/bash
set -e

# Default timeout of 15 seconds
TIMEOUT=15
QUIET=0

# Process command line arguments
host="$1"
port="$2"
shift 2

# Extract command from remaining arguments
cmd="$@"

# Execute command if provided or do nothing
wait_and_run() {
    echo "Waiting for $host:$port to be ready..."
    
    # Count attempts
    attempt=1
    max_attempts=$((TIMEOUT))
    
    # Loop until service is available or timeout
    while [ $attempt -le $max_attempts ]; do
        if nc -z "$host" "$port" > /dev/null 2>&1; then
            echo "$host:$port is available after $attempt seconds"
            if [ -n "$cmd" ]; then
                echo "Executing command: $cmd"
                exec $cmd
            fi
            return 0
        fi
        
        # Wait and increment counter
        echo "Attempt $attempt/$max_attempts: $host:$port is not available yet, waiting..."
        sleep 1
        attempt=$((attempt + 1))
    done
    
    echo "Timeout reached after $max_attempts seconds waiting for $host:$port"
    return 1
}

# Start the waiting process
wait_and_run
