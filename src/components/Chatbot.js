import React, { useState } from 'react';
import '../styles/Chatbot.css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faXmark } from '@fortawesome/free-solid-svg-icons';
import chatIcon from '../assets/chat-icon.svg'; 

const Chatbot = () => {
    const [isOpen, setIsOpen] = useState(false);

    const toggleChat = () => {
        setIsOpen(!isOpen);
    };

    return (
        <div className="chatbot-container">
            <button className="chatbot-icon" onClick={toggleChat}>
                <img src={chatIcon} alt="Chat" className="chat-icon" />
            </button>
            <div className={`chatbot-popup ${isOpen ? 'open' : ''}`}>
                <button className="close-button" onClick={toggleChat}>
                    <FontAwesomeIcon icon={faXmark} />
                </button>
                <div className="chat-window">
                    <p>Welcome to the chat!</p>
                </div>
            </div>
        </div>
    );
};

export default Chatbot;
