# RTMP Live Streaming Platform with Cloud Integration

**Course**: Cloud Computing (3CS402CC24)
**Authors**:

* Niraj Chaudhari (22BCE209)
* Samarth Pansala (22BCE220)
* Himanshu Parghi (22BCE222)

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [Features](#features)
3. [Technology Stack](#technology-stack)
4. [Architecture](#architecture)
5. [Project Structure](#project-structure)
6. [Getting Started](#getting-started)

   * [Prerequisites](#prerequisites)
   * [Installation](#installation)
   * [Configuration](#configuration)
7. [Usage](#usage)

   * [Running Locally](#running-locally)
   * [AWS Cloud Deployment](#aws-cloud-deployment)
8. [Contributing](#contributing)
9. [License](#license)
10. [Acknowledgements](#acknowledgements)

---

## Project Overview

This cloud-based SaaS live streaming platform enables real-time video/audio broadcasting between publishers and viewers. It features a React frontend, a Node.js/Express backend, Docker-managed TURN servers for NAT traversal, and seamless WebRTC/WebSocket communication—all deployed on AWS EC2 for scalability and high availability.

---

## Features

* **Live Streaming with WebRTC**:

  * Multi-publisher support with unique Publisher IDs
  * Viewer dashboard with active streams list and search
  * Real-time status logs of connected peers
* **Secure Signaling & Media**:

  * HTTPS Express server with SSL/TLS certificates
  * WebSocket-based signaling (offer/answer/ICE)
  * REST endpoints:

    * `GET /streams` – list active streams
    * `GET /ice-config` – STUN/TURN configuration
* **Scalable Cloud Architecture**:

  * Dockerized Coturn TURN server for reliable relay
  * AWS EC2 deployment for flexible resource scaling
  * Pay-as-you-go cost model with high availability

---

## Technology Stack

* **Frontend**

  * React (Vite), JavaScript, HTML/CSS
  * WebRTC APIs for media capture & playback
* **Backend**

  * Node.js, Express.js
  * WebSocket (ws) for signaling
  * Docker (Coturn)
* **Cloud & DevOps**

  * AWS EC2, S3, CloudFront, Lambda, Systems Manager
  * SSL/TLS certificates (stored in `/backend/certs`)
  * Environment variables (`.env`) for dynamic config
* **Utilities**

  * `start-script.sh` – automated build & deploy script
  * Systemd service for auto-start on boot

---

## Architecture

1. **Client Layer**

   * **Publisher**: captures local media, establishes peer connections
   * **Viewer**: connects to publisher, renders live stream
2. **Signaling Layer**

   * WebSocket server attached to HTTPS server
   * Handles offer/answer/ICE candidate exchange
3. **Media Relay**

   * STUN/TURN servers (Coturn) in Docker for NAT traversal
4. **Cloud Layer**

   * Deployed on AWS EC2 (`https://<EC2_PUBLIC_IP>:8443`)
   * Scalable, with monitoring via systemd logs & CloudWatch integration

---

## Project Structure

```text
├── .vscode/              # VS Code settings
├── backend/
│   ├── certs/            # SSL/TLS certificates
│   ├── Dockerfile        # Docker image for backend + TURN
│   ├── .env              # Backend env variables
│   ├── server.js         # Express + WebSocket server
│   └── package*.json     # Node.js dependencies
├── frontend/
│   ├── public/
│   ├── src/              # React components & assets
│   ├── .env              # Frontend env variables
│   ├── index.html
│   └── vite.config.js
├── start-script.sh       # Builds, configures, and starts services
├── .gitignore
└── README.md             # This file
```

---

## Getting Started

### Prerequisites

* Node.js (via NVM recommended)
* Docker & Docker Compose
* Git

### Installation

1. **Clone the repo**

   ```bash
   git clone https://github.com/your-username/rtmp-live-streaming.git
   cd rtmp-live-streaming
   ```
2. **Install dependencies**

   ```bash
   # Frontend
   cd frontend && npm install
   # Backend
   cd ../backend && npm install
   ```

### Configuration

1. **Create **\`\`** files**

   * Copy `.env.example` to `.env` in both `frontend/` and `backend/`
   * Set `REACT_APP_SIGNALING_URL`, `PORT`, `STUN_SERVERS`, `TURN_SERVERS`, etc.
2. **Place SSL certs** in `backend/certs/` as `key.pem` & `cert.pem`.

---

## Usage

### Running Locally

```bash
# From project root
chmod +x start-script.sh
./start-script.sh
```

* Frontend served on `https://localhost:3000`
* Backend (HTTPS + WebSocket) on `https://localhost:8443`

### AWS Cloud Deployment

1. **Launch EC2 Instance** (Ubuntu 22.04 LTS)
2. **Open Security Group**

   * TCP 8443 (HTTPS/WSS)
   * TCP 3478 (TURN)
3. **SSH & Prepare**

   ```bash
   # Install NVM, Node.js v22, Git
   curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
   source ~/.bashrc
   nvm install 22
   sudo apt-get update && sudo apt-get install -y git docker.io
   ```
4. **Clone & Deploy**

   ```bash
   git clone https://github.com/your-username/rtmp-live-streaming.git
   cd rtmp-live-streaming
   chmod +x start-script.sh
   sudo ./start-script.sh
   ```
5. **(Optional) Systemd Service**
   Create `/etc/systemd/system/rtmp.service` with:

   ```ini
   [Unit]
   Description=RTMP Live Streaming Service
   After=network.target

   [Service]
   Type=simple
   User=ubuntu
   WorkingDirectory=/home/ubuntu/rtmp-live-streaming
   ExecStart=/home/ubuntu/rtmp-live-streaming/start-script.sh
   Restart=on-failure
   Environment="PATH=/home/ubuntu/.nvm/versions/node/v22.*/bin:/usr/bin"

   [Install]
   WantedBy=multi-user.target
   ```

   ```bash
   sudo systemctl daemon-reload
   sudo systemctl enable rtmp
   sudo systemctl start rtmp
   sudo journalctl -u rtmp -f
   ```

---

## Contributing

1. Fork this repository
2. Create a feature branch (`git checkout -b feature/YourFeature`)
3. Commit changes (`git commit -m "Add YourFeature"`)
4. Push branch and open a Pull Request

---

## License

This project is licensed under the MIT License. See [LICENSE](LICENSE) for details.

---

## Acknowledgements

* WebRTC and WebSocket documentation
* Docker Coturn official image
* AWS EC2 user guide

---

> *“Streaming is the new frontier; build it secure, build it scalable.”*
