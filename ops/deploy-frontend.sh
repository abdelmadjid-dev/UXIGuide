#!/bin/bash
set -e

# Usage: ./deploy-frontend.sh <GCP_PROJECT_ID> <VERSION_TAG>
# Example: ./deploy-frontend.sh uxiguide-prod v1

GCP_PROJECT_ID=$1
VERSION_TAG=$2

# Sanitize version (e.g., v0.1 -> v0-1) for Firebase rewrite serviceId
VERSION_TAG_SANITIZED=$(echo "${VERSION_TAG}" | sed 's/\./-/g')

echo "Starting Frontend/Widget Deployment for version ${VERSION_TAG}..."

# We need a temporary firebase.json structure to map the deployments
# to their versioned subfolders securely without overwriting the base.
cat <<EOF > firebase.json
{
  "hosting": {
    "public": "deploy_tmp",
    "ignore": [
      "firebase.json",
      "**/.*",
      "**/node_modules/**"
    ],
    "rewrites": [
      {
        "source": "/${VERSION_TAG}/api/**",
        "run": {
          "serviceId": "uxiguide-backend-${VERSION_TAG_SANITIZED}",
          "region": "europe-west9"
        }
      },
      {
        "source": "/${VERSION_TAG}/dashboard/**",
        "destination": "/${VERSION_TAG}/dashboard/index.html"
      }
    ]
  }
}
EOF

# Create a temporary deployment directory explicitly namespaced by version
rm -rf deploy_tmp
mkdir -p deploy_tmp/${VERSION_TAG}

# Copy the built widget script
if [ -d "script/dist" ]; then
    echo "Copying Widget Script to /${VERSION_TAG}..."
    cp -r script/dist/* deploy_tmp/${VERSION_TAG}/
fi

# Copy the built Dashboard (if Angular exists)
if [ -d "frontend/dist/frontend/browser" ]; then
    echo "Copying Dashboard UI to /${VERSION_TAG}/dashboard..."
    mkdir -p deploy_tmp/${VERSION_TAG}/dashboard
    cp -r frontend/dist/frontend/browser/* deploy_tmp/${VERSION_TAG}/dashboard/
fi

# Deploy
echo "Deploying to Firebase Hosting..."
if [ -z "$FIREBASE_TOKEN" ]; then
    echo "ERROR: FIREBASE_TOKEN environment variable is not set. Cannot drop to interactive login in CI."
    exit 1
fi
firebase deploy --only hosting --project ${GCP_PROJECT_ID} --token ${FIREBASE_TOKEN}

# Cleanup
rm -rf deploy_tmp
rm firebase.json

echo "Frontend successfully deployed to /${VERSION_TAG} paths!"
