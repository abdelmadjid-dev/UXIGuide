pipeline {
    agent any

    environment {
        // Assume GCP credentials are bound to the Jenkins server host
        GCP_PROJECT_ID = 'uxiguide-prod'
        DOCKER_REGISTRY = "gcr.io/${GCP_PROJECT_ID}"
        
        // Pull FIREBASE_TOKEN securely from Jenkins Credentials config
        FIREBASE_TOKEN = credentials('uxiguide-firebase-token')
    
        // Pull GCP Secret File securely from Jenkins Credentials config
        GCP_CREDENTIALS = credentials('uxiguide-google-cloud-creds')
        
        // Extract version from branch name, failing if not a release branch
        RELEASE_VERSION = sh(script: "echo ${env.BRANCH_NAME} | sed 's/.*release\\/v//'", returnStdout: true).trim()
        VERSION_TAG = "v${RELEASE_VERSION}"
        
        // Pull Frontend Production Config from Jenkins Credentials
        FRONTEND_PROD_CONFIG = credentials('uxiguide-frontend-prod-config')
    }

    stages {
        // Enforce pipeline only runs on release branches
        stage('Check Branch') {
            steps {
                script {
                    if (!env.BRANCH_NAME.startsWith('release/')) {
                        error("Pipeline is configured to run ONLY on 'release/*' branches. Current branch: ${env.BRANCH_NAME}")
                    }
                }
            }
        }

        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Build Frontend & Script') {
            steps {
                script {
                    // Ensure the directory exists
                    sh "mkdir -p frontend/src/environments"
                    
                    // Inject Production Environment (Safe rewrite using Jenkins DSL to keep quotes)
                    writeFile file: "frontend/src/environments/environment.ts", text: env.FRONTEND_PROD_CONFIG
                    
                    // Inject Stub Development Environment (Required for resolution during build replacement)
                    writeFile file: "frontend/src/environments/environment.development.ts", text: env.FRONTEND_PROD_CONFIG
                }
                sh '''
                docker run --rm -v $(pwd):/app -w /app node:22-alpine sh -c "
                    if [ -d 'frontend' ]; then
                        echo 'Building Frontend...'
                        cd frontend && npm install && npm run build && cd ..
                    fi &&
                    if [ -d 'script' ]; then
                        echo 'Building Widget Script...'
                        cd script && npm install && npm run build && cd ..
                    fi
                "
                '''
            }
        }

        stage('Build Backend Docker Image') {
            steps {
                sh '''
                if [ -d "backend" ]; then
                    docker build -t ${DOCKER_REGISTRY}/uxiguide-backend:${VERSION_TAG} ./backend
                fi
                '''
            }
        }

        stage('Deploy to GCP & Firebase') {
            when {
                branch 'release/*'
            }
            steps {
                echo "Deploying Version: ${VERSION_TAG} for branch ${env.BRANCH_NAME}"
                
                // Authenticate gcloud using the injected secret file credential
                sh "gcloud auth activate-service-account --key-file=\"${GCP_CREDENTIALS}\""
                sh "gcloud config set project ${GCP_PROJECT_ID}"
                sh "gcloud auth configure-docker --quiet"
                
                // Deploy Backend to Cloud Run
                sh "chmod +x ./ops/deploy-backend.sh"
                sh "./ops/deploy-backend.sh ${GCP_PROJECT_ID} ${VERSION_TAG} ${DOCKER_REGISTRY}"
                
                // Deploy Frontend to Firebase Hosting
                sh "chmod +x ./ops/deploy-frontend.sh"
                sh "./ops/deploy-frontend.sh ${GCP_PROJECT_ID} ${VERSION_TAG}"
            }
        }
    }

    post {
        always {
            script {
                try {
                    cleanWs(deleteDirs: true, disableDeferredWipeout: true)
                } catch (Exception e) {
                    echo "Cleanup skipped: ${e.message}"
                }
            }
        }
    }
}
