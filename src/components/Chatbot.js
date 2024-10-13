import React, { useState } from 'react';
import '../styles/Chatbot.css';

const Chatbot = () => {
    const [isOpen, setIsOpen] = useState(false);

    const toggleChat = () => {
        setIsOpen(!isOpen);
    };

    return (
        <div className="chatbot-container">
            {!isOpen && (
                <button className="chatbot-icon" onClick={toggleChat}>
                    💬
                </button>
            )}
            {isOpen && (
                <div className="chatbot-popup">
                    <button className="close-button" onClick={toggleChat}>X</button>
                    <div className="chat-window">
                        <p>Welcome to the chat!</p>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Chatbot;