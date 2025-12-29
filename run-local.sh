#!/bin/bash

# Load environment variables from .env file
if [ -f .env ]; then
    echo "Loading environment variables from .env file..."
    export $(grep -v '^#' .env | xargs)
fi

# Start Redis if not running
docker-compose up -d redis

# Wait for Redis to be ready
echo "Waiting for Redis to be ready..."
until docker-compose exec redis redis-cli ping > /dev/null 2>&1; do
    sleep 1
done

echo "Redis is ready!"

# Override Redis URL for local development
export SCALINGO_REDIS_URL="redis://localhost:6379"
export GIN_MODE="debug"
export PORT="8080"

echo "Starting BabyCheck with local Redis on port $PORT..."
echo "Passcode required: $PASSCODE"
go run main.go