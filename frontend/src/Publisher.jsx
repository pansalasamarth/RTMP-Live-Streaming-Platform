/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable no-unused-vars */
// Publisher.jsx
import React, { useState, useRef, useEffect } from 'react';
import './Publisher.css';
import axios from 'axios';
import { useParams } from 'react-router';

const SERVER_URL = import.meta.env.VITE_SERVER_URL;

const Publisher = () => {
  const { publisherName } = useParams();

  // Refs for local video, stream, peer connections, candidate queues, and signaling
  const localVideoRef = useRef(null);
  const localStreamRef = useRef(null);
  const peerConnectionsRef = useRef({}); // Maps viewerId to RTCPeerConnection
  const candidateQueuesRef = useRef({}); // Maps viewerId to an array of queued ICE candidates
  const signalingRef = useRef(null);

  // State for logs, viewers, and streaming state
  const [logs, setLogs] = useState([]);
  const [viewers, setViewers] = useState([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [configuration, setConfiguration] = useState({});

  // Helper: Append log messages with a timestamp.
  const addLog = (msg) => {
    const timestamp = new Date().toLocaleTimeString();
    const logMessage = `${timestamp} - ${msg}`;
    console.log(logMessage);
    setLogs(prev => [...prev, logMessage]);
  };

  // Helper: Add a viewer to the list.
  const addViewer = (viewerId, viewerName) => {
    addLog(`Adding viewer: ${viewerId} (${viewerName})`);
    setViewers(prev => [...prev, { viewerId, viewerName }]);
  };

  // Helper: Remove a viewer.
  const removeViewer = (viewerId) => {
    addLog(`Removing viewer: ${viewerId}`);
    setViewers(prev => prev.filter(v => v.viewerId !== viewerId));
  };

  // Function: Flush queued ICE candidates for a given viewer.
  const flushCandidateQueue = async (viewerId, pc) => {
    const queuedCandidates = candidateQueuesRef.current[viewerId];
    if (queuedCandidates && queuedCandidates.length > 0) {
      for (const candidate of queuedCandidates) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
          addLog(`Added queued ICE candidate from viewer: ${viewerId}`);
        } catch (err) {
          addLog(`Error adding queued ICE candidate from viewer ${viewerId}: ${err}`);
        }
      }
      candidateQueuesRef.current[viewerId] = [];
    }
  };

  // Function: Handle a new viewer by creating a new RTCPeerConnection, adding tracks, and sending an offer.
  const handleNewViewer = async (viewerId) => {
    addLog(`Handling new viewer: ${viewerId}`);
    if (!localStreamRef.current) {
      addLog('Local stream not available. Cannot create peer connection.');
      return;
    }
    const pc = new RTCPeerConnection(configuration);
    peerConnectionsRef.current[viewerId] = pc;
    addLog(`RTCPeerConnection created for viewer: ${viewerId}`);

    // Add local tracks to the connection
    localStreamRef.current.getTracks().forEach(track => {
      pc.addTrack(track, localStreamRef.current);
      addLog(`Added ${track.kind} track to connection for viewer: ${viewerId}`);
    });

    // Handle ICE candidate events
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        const candidateStr = JSON.stringify(event.candidate);
        signalingRef.current.send(JSON.stringify({
          type: 'candidate',
          role: 'publisher',
          target: viewerId,
          payload: event.candidate
        }));
        addLog(`Sent ICE candidate to viewer ${viewerId}: ${candidateStr}`);
      } else {
        addLog(`ICE candidate gathering complete for viewer ${viewerId}`);
      }
    };

    // Log connection state changes
    pc.onconnectionstatechange = () => {
      addLog(`Connection state for viewer ${viewerId}: ${pc.connectionState}`);
    };
    pc.oniceconnectionstatechange = () => {
      addLog(`ICE connection state for viewer ${viewerId}: ${pc.iceConnectionState}`);
    };
    pc.onsignalingstatechange = () => {
      addLog(`Signaling state for viewer ${viewerId}: ${pc.signalingState}`);
    };

    // Create and send offer
    try {
      addLog(`Creating offer for viewer ${viewerId}...`);
      const offer = await pc.createOffer();
      addLog(`Offer created for viewer ${viewerId}: ${JSON.stringify(offer)}`);
      await pc.setLocalDescription(offer);
      addLog(`Local description set for viewer ${viewerId}.`);
      signalingRef.current.send(JSON.stringify({
        type: 'offer',
        role: 'publisher',
        target: viewerId,
        payload: offer
      }));
      addLog(`Sent offer to viewer: ${viewerId}`);
    } catch (err) {
      addLog(`Error creating offer for viewer ${viewerId}: ${err}`);
    }
  };

  // Set up the signaling WebSocket when the component mounts.
  useEffect(() => {
    const fetchServerConfig = async () => {
      try {
        const response = await axios.get(`${SERVER_URL}/ice-config`);
        setConfiguration(response.data);
      } catch (error) {
        console.error('Error fetching server configuration:', error);
      }
    };
    fetchServerConfig();


    addLog('Initializing signaling WebSocket for publisher...');
    const signaling = new WebSocket(import.meta.env.VITE_SIGNALING_SERVER_URL);
    signalingRef.current = signaling;
    signaling.onopen = () => {
      addLog('Connected to signaling server as publisher.');
      signaling.send(JSON.stringify({
        type: 'join',
        role: 'publisher',
        name: publisherName,
      }));
    };

    // Log raw message and handle different signaling messages.
    signaling.onmessage = async (messageEvent) => {
      addLog('Raw signaling message: ' + messageEvent.data);
      const data = JSON.parse(messageEvent.data);
      addLog('Parsed signaling message: ' + data.type);

      if (data.type === 'newViewer') {
        const { viewerId, viewerName } = data;
        addLog(`New viewer joined: ${viewerId} (${viewerName})`);
        addViewer(viewerId, viewerName);
        await handleNewViewer(viewerId);
      } else if (data.type === 'answer') {
        const { viewerId, payload } = data;
        const pc = peerConnectionsRef.current[viewerId];
        if (pc) {
          await pc.setRemoteDescription(new RTCSessionDescription(payload));
          addLog(`Received answer from viewer: ${viewerId}`);
          // Flush any queued ICE candidates now that remote description is set.
          await flushCandidateQueue(viewerId, pc);
        } else {
          addLog(`No peer connection exists for viewer: ${viewerId}`);
        }
      } else if (data.type === 'candidate') {
        if (data.role === 'viewer' && data.target) {
          const targetViewerId = data.target;
          const pc = peerConnectionsRef.current[targetViewerId];
          if (pc) {
            // If remote description is not set, queue the candidate.
            if (!pc.remoteDescription || !pc.remoteDescription.type) {
              if (!candidateQueuesRef.current[targetViewerId]) {
                candidateQueuesRef.current[targetViewerId] = [];
              }
              candidateQueuesRef.current[targetViewerId].push(data.payload);
              addLog(`Queued ICE candidate for viewer ${targetViewerId} because remote description is not set.`);
              // Attempt to flush queued candidates after a short delay
              setTimeout(async () => {
                if (pc.remoteDescription && pc.remoteDescription.type) {
                  await flushCandidateQueue(targetViewerId, pc);
                }
              }, 1000);
            } else {
              try {
                await pc.addIceCandidate(new RTCIceCandidate(data.payload));
                addLog(`Added ICE candidate from viewer: ${targetViewerId}`);
              } catch (err) {
                addLog(`Error adding ICE candidate from viewer ${targetViewerId}: ${err}`);
              }
            }
          } else {
            addLog(`Received ICE candidate for non-existent connection for viewer: ${targetViewerId}`);
          }
        }
      } else {
        addLog('Unknown signaling message type received.');
      }
    };

    signaling.onerror = (err) => {
      addLog('WebSocket error: ' + err.message);
    };

    signaling.onclose = () => {
      addLog('WebSocket connection closed.');
    };

    // Cleanup on unmount
    return () => {
      addLog('Cleaning up signaling WebSocket.');
      signaling.close();
    };
  }, []);

  // Function: Start streaming by accessing the local media devices.
  const startStream = async () => {
    addLog('Start stream button clicked.');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      localStreamRef.current = stream;
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }
      addLog('Local stream started successfully.');
      setIsStreaming(true);
    } catch (err) {
      addLog('Error accessing media devices: ' + err);
    }
  };

  // Function: Stop streaming by stopping tracks and closing all peer connections.
  const stopStream = () => {
    addLog('Stop stream button clicked.');
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = null;
      }
      addLog('Local stream stopped.');
      setIsStreaming(false);
      // Close all peer connections
      Object.keys(peerConnectionsRef.current).forEach(viewerId => {
        addLog(`Closing connection for viewer: ${viewerId}`);
        peerConnectionsRef.current[viewerId].close();
        delete peerConnectionsRef.current[viewerId];
      });
      setViewers([]); // Clear viewers list
    }
  };

  // Replace your current return (...) with:

  return (
    <div className="publisher-container">
      <nav className="publisher-navbar">
        <div className="publisher-logo">RTMP Publisher</div>
      </nav>

      <main className="publisher-hero">
        {/* Video Section */}
        <div className="video-section">
          <div className="card">
            <div className="card-header">Live Preview</div>
            <div className="video-container">
              <video ref={localVideoRef} autoPlay playsInline muted />
            </div>
          </div>
          <div className="controls">
            <button className="btn start-btn" onClick={startStream} disabled={isStreaming}>
              Start Streaming
            </button>
            <button className="btn stop-btn" onClick={stopStream} disabled={!isStreaming}>
              Stop Streaming
            </button>
          </div>
        </div>

        {/* Dashboard Section */}
        <div className="dashboard-section">
          <div className="dashboard-card">
            <div className="dashboard-card-header">Connected Viewers</div>
            <div className="dashboard-card-body">
              {viewers.length > 0 ? (
                <ul className="viewer-list">
                  {viewers.map((viewer) => (
                    <li key={viewer.viewerId}>
                      {viewer.viewerId} - {viewer.viewerName}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="no-viewers">No viewers connected</p>
              )}
            </div>
          </div>

          <div className="dashboard-card">
            <div className="dashboard-card-header">Status Log</div>
            <div className="dashboard-card-body">
              {logs.map((msg, index) => (
                <p key={index} className="log-entry">{msg}</p>
              ))}
            </div>
          </div>
        </div>

      </main>

      <footer className="publisher-footer">
        <p>&copy; {new Date().getFullYear()} RTMP Publisher. All rights reserved.</p>
      </footer>
    </div>
  );

};

export default Publisher;
