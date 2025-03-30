# RTMP Live Streaming with Cloud Integration

This is a simple live streaming platform with a frontend built using JavaScript frameworks, a backend running on Node.js and deployed on cloud with AWS EC2 service.

## Installation and Running the Project

## install node

```
# Download and install nvm:
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.2/install.sh | bash
# in lieu of restarting the shell
\. "$HOME/.nvm/nvm.sh"
# Download and install Node.js:
nvm install 22
```

## install git

```
sudo apt install git
```

## clone repo

```
git clone https://github.com/Niraj-KC/Live-Streaming-Platform/
```

## chmod

```
chmod +x ./Live-Streaming-Platform/start-script.sh
```

## start-service

```
sudo nano /etc/systemd/system/mystartup.service
```

## create service

```
[Unit]
Description=My Startup Script
After=network.target

[Service]
Type=simple
Environment="PATH=/home/ec2-user/.nvm/versions/node/v18.16.0/bin:/usr/local/bin:/usr/bin:/bin"
ExecStart=/home/ec2-user/Live-Streaming-Platform/start-script.sh
Restart=on-failure
User=ec2-user
WorkingDirectory=/home/ec2-user/Live-Streaming-Platform
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
```

## install dependancy

```
cd ./Live-Streaming-Platform
cd ./frontend
npm i
cd ../backend
npm i
```

## start service

```
sudo systemctl daemon-reload
sudo systemctl enable mystartup.service
sudo systemctl start mystartup.service
sudo systemctl status mystartup.service
```

## info commads
```
journalctl -u mystartup.service --no-pager --lines=50
sudo systemctl status mystartup.service
```