#!/bin/bash
source /home/ec2-user/.nvm/nvm.sh 
set -e  # Exit immediately if a command exits with a non-zero status

# Prompt the user for the public IP address
EC2_PUBLIC_IP=$(curl -s http://checkip.amazonaws.com)
# EC2_PUBLIC_IP=192.168.238.248

# Validate input
if [ -z "$EC2_PUBLIC_IP" ]; then
    echo "No IP provided. Exiting."
    exit 1
fi

# Define the absolute path
PROJECT_DIR="/home/ec2-user/Live-Streaming-Platform"
# PROJECT_DIR="D:\College\Sem-6\CC\Assignment\Live-Streaming-Platfrom"

# Configure frontend .env file
cd "$PROJECT_DIR/frontend" || { echo "Failed to change directory to frontend"; exit 1; }

cat > .env <<EOF
VITE_SIGNALING_SERVER_URL=wss://$EC2_PUBLIC_IP:8443/ws
VITE_SERVER_URL=https://$EC2_PUBLIC_IP:8443
EOF

echo "Frontend .env file created successfully."

# Configure backend .env file
cd "$PROJECT_DIR/backend" || { echo "Failed to change directory to backend"; exit 1; }

cat > .env <<EOF
SIGNALLING_SERVER_HOST=$EC2_PUBLIC_IP
SIGNALLING_SERVER_PORT=8443
SIGNALLING_SERVER_PATH=/ws

STUN_SERVER=stun:stun.l.google.com:19302
TURN_SERVER=turn:$EC2_PUBLIC_IP:3478
TURN_USERNAME=admin
TURN_CREDENTIAL=admin
EOF

echo "Backend .env file created successfully."

# Build the frontend and copy the dist folder to backend
cd "$PROJECT_DIR/frontend" || { echo "Failed to change directory back to frontend"; exit 1; }
echo "Running npm build"
npm run build || { echo "npm build failed"; exit 1; }

echo "Copying dist to backend"
cp -r ./dist "$PROJECT_DIR/backend/" || { echo "Copying dist failed"; exit 1; }


# Check if Docker daemon is running
if ! sudo systemctl is-active --quiet docker; then
    echo "Starting Docker daemon..."
    sudo systemctl start docker
    sleep 5  # Wait for Docker to start
fi

# Check if a container named 'coturn' exists (running or stopped)
if sudo docker ps -a --format '{{.Names}}' | grep -q "^coturn$"; then
    # Check if the 'coturn' container is running
    if sudo docker ps --format '{{.Names}}' | grep -q "^coturn$"; then
        echo "Coturn server is already running."
    else
        echo "Starting existing coturn container..."
        sudo docker start coturn
        if [ $? -ne 0 ]; then
            echo "Error: Failed to start existing coturn container."
            exit 1
        fi
    fi
else
    echo "Creating and starting new coturn container..."
    sudo docker run -d --name coturn -p 3478:3478 -p 3478:3478/udp \
        -e TURN_REALM=$EC2_PUBLIC_IP -e TURN_USER=user:password \
        instrumentisto/coturn
    if [ $? -ne 0 ]; then
        echo "Error: Failed to create and start new coturn container."
        exit 1
    fi
fi


# Run the server
echo "Running server.js"
cd "$PROJECT_DIR/backend" || { echo "Failed to change directory to backend"; exit 1; }
node ./server.js

``