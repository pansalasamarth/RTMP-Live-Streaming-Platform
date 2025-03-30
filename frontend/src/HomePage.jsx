import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './HomePage.css';


const SERVER_URL = import.meta.env.VITE_SERVER_URL;

const HomePage = () => {
    const [streams, setStreams] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const navigate = useNavigate();

    const startStream = () => {
        const publisherName = prompt('Please enter your name:', 'Publisher');
        navigate(`/publisher/${publisherName}`);
    };

    useEffect(() => {
        const fetchStreams = async () => {
            try {
                console.log(`${SERVER_URL}/streams`);
                const response = await axios.get(`${SERVER_URL}/streams`);
                setStreams(response.data.streams);
                console.log(streams);
            } catch (error) {
                console.error('Error fetching streams:', error);
            }
        };
        fetchStreams();
    }, []);

    const handleJoinStream = (streamId) => {
        navigate(`/viewer/${streamId}`);
    };

    const filteredStreams = streams.filter((stream) =>
    (stream.publisherId.toLowerCase().includes(searchTerm.toLowerCase())
        || stream.name.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    return (
        <div className="homepage-container">
            {/* Navbar */}
            <nav className="navbar">
                <div className="logo">MyStream</div>
                <div className="nav-actions">
                    <button className="start-btn" onClick={startStream}>
                        Start a New Stream
                    </button>
                </div>
            </nav>

            {/* Hero Section */}
            <section className="hero">
                <div className="hero-content">
                    <h1>Stream Your World</h1>
                    <p>Experience live streaming like never before.</p>
                    <button className="hero-button" onClick={startStream}>
                        Go Live Now
                    </button>
                    {/* Hint: Display message if live streams exist */}
                    {filteredStreams.length > 0 && (
                        <div className="live-hint">
                            <p>Live streams are running now! Join one below.</p>
                        </div>
                    )}
                </div>
            </section>

            {/* Search Bar */}
            <div className="search-section">
                <input
                    type="text"
                    placeholder="Search for streams..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
                <button className="search-btn">Search</button>
            </div>

            {/* Streams Section */}
            <section className="streams-section">
                <h2 className="section-title">Live Streams</h2>
                {filteredStreams.length > 0 ? (
                    <div className="streams-grid">
                        {filteredStreams.map((stream) => (
                            <div key={stream.publisherId} className="stream-card">
                                <div className="stream-info">

                                    <h3>Stream {stream.name} ({stream.publisherId})</h3>
                                    {/* Display the description if available */}
                                    {stream.description && (
                                        <p className="stream-description">{stream.description}</p>
                                    )}
                                    <button
                                        className="join-stream-btn"
                                        onClick={() => handleJoinStream(stream.publisherId)}
                                    >
                                        Join Stream
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="no-streams">No active streams</p>
                )}
            </section>

            {/* Footer */}
            <footer className="footer">
                <p>&copy; {new Date().getFullYear()} MyStream. All rights reserved.</p>
            </footer>
        </div>
    );
};

export default HomePage;