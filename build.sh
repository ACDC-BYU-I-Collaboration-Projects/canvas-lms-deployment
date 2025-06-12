#!/bin/bash

# --- Configuration ---
BUILDER_NAME="containerBuilder"
REGISTRY_IMAGE="acdccanvas.azurecr.io/canvas-app:latest"
DOCKERFILE_PATH="Dockerfile.production"
PLATFORMS="linux/amd64,linux/arm64"

# --- Function to stop the builder ---
stop_builder() {
    echo "Stopping buildx builder: $BUILDER_NAME"
    docker buildx stop "$BUILDER_NAME"
    if [ $? -ne 0 ]; then
        echo "Warning: Failed to stop buildx builder '$BUILDER_NAME'. It might still be running."
    else
        echo "Buildx builder '$BUILDER_NAME' stopped successfully."
    fi
}

# --- Trap command to ensure builder is stopped on script exit (even on errors) ---
# This ensures that stop_builder function is called when the script exits,
# whether due to success, failure, or interruption.
trap stop_builder EXIT

# --- Step 1: Create or ensure the buildx builder is running ---
echo "Checking for existing buildx builder: $BUILDER_NAME"
if ! docker buildx ls | grep -q "$BUILDER_NAME"; then
    echo "Builder '$BUILDER_NAME' not found. Creating..."
    docker buildx create --name "$BUILDER_NAME" --driver docker-container --use
    if [ $? -ne 0 ]; then
        echo "Error: Failed to create buildx builder. Exiting."
        exit 1
    fi
else
    echo "Builder '$BUILDER_NAME' found. Ensuring it's in use..."
    docker buildx use "$BUILDER_NAME"
    if [ $? -ne 0 ]; then
        echo "Error: Failed to switch to buildx builder. Exiting."
        exit 1
    fi
fi

# Verify the builder is running
echo "Verifying buildx builder status..."
docker buildx ls

# --- Step 2: Build the Docker image ---
echo "Starting Docker image build for platforms: $PLATFORMS"
echo "This process can take up to an hour..."

docker buildx build \
  --platform "$PLATFORMS" \
  -f "$DOCKERFILE_PATH" \
  -t "$REGISTRY_IMAGE" \
  --push \
  .

# Store the exit code of the build command
BUILD_EXIT_CODE=$?

if [ $BUILD_EXIT_CODE -ne 0 ]; then
    echo "Error: Docker build failed (Exit Code: $BUILD_EXIT_CODE)."
    # The trap command will handle stopping the builder before exiting
    exit $BUILD_EXIT_CODE
else
    echo "Docker image built and pushed successfully: $REGISTRY_IMAGE"
fi
