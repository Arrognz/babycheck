#!/bin/bash

echo "Starting frontend watch mode..."
echo "Files will be automatically built and copied to ../../static"

# Build once initially
npm run build
rm -rf ../../static
cp -r build ../../static

# Watch for changes and rebuild
npm run build -- --watch &
WATCH_PID=$!

# Function to copy files when build changes
copy_on_change() {
    while true; do
        if [ -d "build" ]; then
            # Check if build directory was modified in last 2 seconds
            if [ $(find build -newermt "2 seconds ago" | wc -l) -gt 0 ]; then
                echo "Detected changes, copying to static..."
                rm -rf ../../static
                cp -r build ../../static
                echo "Files copied!"
            fi
        fi
        sleep 2
    done
}

# Start the copy watcher in background
copy_on_change &
COPY_PID=$!

# Cleanup function
cleanup() {
    echo "Stopping watch mode..."
    kill $WATCH_PID 2>/dev/null
    kill $COPY_PID 2>/dev/null
    exit 0
}

# Trap signals to cleanup properly
trap cleanup SIGINT SIGTERM

echo "Watch mode started. Press Ctrl+C to stop."
echo "Backend should be running separately with ./run.sh"

# Keep script running
wait