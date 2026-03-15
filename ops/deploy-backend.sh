#!/bin/bash
set -e

# Usage: ./deploy-backend.sh <GCP_PROJECT_ID> <VERSION_TAG> <DOCKER_REGISTRY>
# Example: ./deploy-backend.sh uxiguide-prod v1 gcr.io/uxiguide-prod

GCP_PROJECT_ID=$1
VERSION_TAG=$2
DOCKER_REGISTRY=$3

SERVICE_NAME="uxiguide-backend-${VERSION_TAG}"
IMAGE_URL="${DOCKER_REGISTRY}/uxiguide-backend:${VERSION_TAG}"

echo "Starting Backend Deployment for ${SERVICE_NAME}..."

# Push the Docker image to Container Registry
echo "Pushing image to ${IMAGE_URL}..."
docker push ${IMAGE_URL}

# Deploy to Cloud Run with strict cost-saving limits
echo "Deploying to Google Cloud Run..."
# Extract region from registry URL (first part)
REGION=$(echo $DOCKER_REGISTRY | cut -d'-' -f1-2)
gcloud run deploy ${SERVICE_NAME} \
    --image ${IMAGE_URL} \
    --project ${GCP_PROJECT_ID} \
    --platform managed \
    --region ${REGION} \
    --allow-unauthenticated \
    --port 8080 \
    --max-instances 2 \
    --memory 512Mi \
    --cpu 1

echo "Backend ${SERVICE_NAME} successfully deployed!"
