#!/bin/bash

make
go build -o babycheck .
go mod vendor

# Load environment variables if .env exists
if [ -f .env ]; then
    export $(grep -v '^#' .env | xargs)
fi

# Set default values if not set
export PORT=${PORT:-5001}
export GIN_MODE=${GIN_MODE:-debug}

# Run the app
./babycheck
