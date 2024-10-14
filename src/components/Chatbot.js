import React, { useState, useEffect, useRef } from 'react';
import '../styles/Chatbot.css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faXmark,
  faMoon,
  faSun,
  faComment,
  faPaperPlane,
  faArrowUp,
  faHeadset,
  faUserNinja,
} from '@fortawesome/free-solid-svg-icons';
import chatIcon from '../assets/chat-icon.svg';
import logo from '../assets/msg_logo.svg';
import DOMPurify from 'dompurify';

const Chatbot = (props) => {
  // State variables
  const [isOpen, setIsOpen] = useState(false);
  const [selectedDepartment, setSelectedDepartment] = useState(
    localStorage.getItem('selected_department') || null
  );
  const [sessionId, setSessionId] = useState(localStorage.getItem('session_id') || null);
  const [messages, setMessages] = useState([]);
  const [question, setQuestion] = useState('');
  const [loading, setLoading] = useState(false);
  const [theme, setTheme] = useState('light');
  const [autoScroll, setAutoScroll] = useState(true);
  const chatMessagesRef = useRef(null);

  const toggleChat = () => {
    setIsOpen(!isOpen);
  };

  // Initialize chat on component mount
  useEffect(() => {
    initializeChat();
  }, []);

  useEffect(() => {
    document.body.className = theme === 'dark' ? 'dark-mode' : '';
  }, [theme]);

  // Scroll behavior
  useEffect(() => {
    const chatMessagesDiv = chatMessagesRef.current;

    const handleScroll = () => {
      if (
        chatMessagesDiv.scrollTop + chatMessagesDiv.clientHeight <
        chatMessagesDiv.scrollHeight
      ) {
        setAutoScroll(false);
      } else {
        setAutoScroll(true);
      }
    };

    if (chatMessagesDiv) {
      chatMessagesDiv.addEventListener('scroll', handleScroll);
      return () => {
        chatMessagesDiv.removeEventListener('scroll', handleScroll);
      };
    }
  }, []);

  useEffect(() => {
    if (autoScroll && chatMessagesRef.current) {
      chatMessagesRef.current.scrollTop = chatMessagesRef.current.scrollHeight;
    }
  }, [messages, autoScroll]);

  // Initialize Chat
  const initializeChat = async () => {
    if (selectedDepartment) {
      addBotMessage(
        `Welcome back! You are chatting with <strong>${selectedDepartment}</strong>. How can I assist you today?`
      );
      await getSessionId();
    } else {
      addBotMessage(`
        <p>Welcome to MSG! I'm here to answer all your questions.</p>
        <p>Please select your department:</p>
        <div class="options">
          <button class="btn btn-option" onClick={() => handleFieldSelection('1')}>Human Resources</button>
          <button class="btn btn-option" onClick={() => handleFieldSelection('2')}>IT</button>
          <button class="btn btn-option" onClick={() => handleFieldSelection('3')}>Finance</button>
        </div>
      `);
    }
  };

  // Get Session ID
  const getSessionId = async () => {
    let sid = localStorage.getItem('session_id');
    if (!sid) {
      try {
        const response = await fetch('/token'); // Update the endpoint as needed
        const data = await response.json();
        sid = data.token;
        localStorage.setItem('session_id', sid);
        setSessionId(sid);
      } catch (error) {
        addBotMessage('An error occurred while obtaining session token. Please try again.');
      }
    } else {
      setSessionId(sid);
    }
  };

  // Add Bot Message
  const addBotMessage = (messageContent) => {
    setMessages((prevMessages) => [
      ...prevMessages,
      { type: 'bot', content: messageContent },
    ]);
  };

  // Add User Message
  const addUserMessage = (messageContent) => {
    setMessages((prevMessages) => [
      ...prevMessages,
      { type: 'user', content: messageContent },
    ]);
  };

  // Handle Department Selection
  const handleFieldSelection = async (choice) => {
    const departments = {
      '1': 'Human Resources',
      '2': 'IT',
      '3': 'Finance',
    };

    const selectedDept = departments[choice];
    if (!selectedDept) {
      addBotMessage('Invalid selection. Please choose a proper department.');
      return;
    }

    setSelectedDepartment(selectedDept);
    localStorage.setItem('selected_department', selectedDept);
    await getSessionId();
    addBotMessage(
      `You selected <strong>${selectedDept}</strong>. How can I assist you today?`
    );
  };

  // Submit Question
  const submitField = async () => {
    const trimmedQuestion = question.trim();
    if (!selectedDepartment || !trimmedQuestion) return;

    addUserMessage(trimmedQuestion);
    setQuestion('');
    setLoading(true);

    try {
      const response = await fetch('/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          department: selectedDepartment,
          question: trimmedQuestion,
          token: sessionId,
        }),
      });

      const data = await response.json();
      setLoading(false);

      if (data.content.toLowerCase().includes('out of my knowledge')) {
        addConcernMessage();
      } else {
        addBotMessage(data.content);
      }
    } catch (error) {
      setLoading(false);
      addBotMessage('An error occurred while processing your request. Please try again.');
    }
  };

  // Add Concern Message
  const addConcernMessage = () => {
    const concernMessage = `
      <p>As there is no data available, we could send your question to the <strong>${selectedDepartment}</strong> team.</p>
      <p>Your entire conversation history will be shared. As the conversation is submitted, this chat session will be closed.</p>
      <p>Do you want to raise a concern?</p>
      <div class="options">
        <button class="btn btn-option" onClick={() => raiseConcern(true)}>Yes</button>
        <button class="btn btn-option" onClick={() => raiseConcern(false)}>No</button>
      </div>
    `;
    addBotMessage(concernMessage);
  };

  // Raise Concern
  const raiseConcern = async (request) => {
    if (request) {
      setLoading(true);

      try {
        const response = await fetch('/raiseconcernmail', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            department: selectedDepartment,
            token: sessionId,
            request: request,
          }),
        });

        const data = await response.json();
        setLoading(false);

        if (data.success) {
          addBotMessage(
            `An email has been sent to the <strong>${selectedDepartment}</strong> team. Thank you. A new chat session has been initiated.`
          );
          setTimeout(endChat, 3000);
        } else {
          addBotMessage('There was an issue raising your concern. Please try again.');
        }
      } catch (error) {
        setLoading(false);
        addBotMessage('An error occurred while processing your request. Please try again.');
      }
    } else {
      addBotMessage('You can continue the chat.');
    }
  };

  // End Chat
  const endChat = () => {
    setLoading(true);
    setTimeout(() => {
      setSelectedDepartment(null);
      setSessionId(null);
      localStorage.removeItem('session_id');
      localStorage.removeItem('selected_department');
      setMessages([]);
      setLoading(false);
      initializeChat();
    }, 3000);
  };

  // Scroll to Top
  const scrollToTop = () => {
    if (chatMessagesRef.current) {
      chatMessagesRef.current.scrollTop = 0;
    }
    setAutoScroll(true);
  };

  // Toggle Theme
  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
  };

  // Render component
  return (
    <div className="chatbot-container">
      <button className="chatbot-icon" onClick={toggleChat} aria-label="Open chat">
        <img src={chatIcon} alt="Chat" className="chat-icon" />
      </button>
      {isOpen && (
        <div className={`chatbot-popup ${isOpen ? 'open' : ''}`}>
          <div className="chat-container">
            <div className="chat-header">
              <div className="header-left">
                <div className="avatar">
                  <img src={logo} alt="MSG Global" title="MSG Global" />
                </div>
                <div className="chat-info">
                  <h2>Assistant Bot</h2>
                  <p id="department">{selectedDepartment || 'Online'}</p>
                </div>
              </div>
              <div className="header-right">
                <button
                  className="btn btn-icon"
                  onClick={toggleTheme}
                  aria-label="Toggle Theme"
                  title="Theme"
                >
                  <FontAwesomeIcon icon={theme === 'light' ? faMoon : faSun} />
                </button>
                <button
                  className="btn btn-icon"
                  onClick={endChat}
                  aria-label="New Chat"
                  title="New Chat"
                >
                  <FontAwesomeIcon icon={faComment} />
                </button>
                <button
                  className="btn btn-icon"
                  onClick={toggleChat}
                  aria-label="Close Chat"
                  title="Close Chat"
                >
                  <FontAwesomeIcon icon={faXmark} />
                </button>
              </div>
            </div>
            <div className="chat-messages" id="chat-messages" ref={chatMessagesRef}>
              {messages.map((msg, index) => (
                <div key={index} className={`message ${msg.type}-message`}>
                  {msg.type === 'bot' ? (
                    <>
                      <div className="avatar">
                        <FontAwesomeIcon icon={faHeadset} />
                      </div>
                      <div className="message-content">
                        <div
                          className="bubble"
                          dangerouslySetInnerHTML={{
                            __html: DOMPurify.sanitize(msg.content),
                          }}
                        />
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="message-content">
                        <div className="bubble">{msg.content}</div>
                      </div>
                      <div className="avatar">
                        <FontAwesomeIcon icon={faUserNinja} />
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
            {!autoScroll && (
              <button
                id="scrollToTopIcon"
                className="floating-icon"
                onClick={scrollToTop}
                aria-label="Scroll to Top"
              >
                <FontAwesomeIcon icon={faArrowUp} />
              </button>
            )}
            <div className="chat-input">
              <input
                type="text"
                id="question"
                placeholder="Type a message..."
                disabled={!selectedDepartment}
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') submitField();
                }}
              />
              <button
                className="btn btn-send"
                id="submitButton"
                onClick={submitField}
                disabled={!selectedDepartment}
                title="Submit Button"
              >
                <FontAwesomeIcon icon={faPaperPlane} />
              </button>
            </div>
            {loading && (
              <div className="loading-overlay" id="loading">
                <div className="spinner">
                  <div className="spinner-inner"></div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Chatbot;
