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
  const [exitLoading, setExitLoading] = useState(false);
  const [isAuthorized, setIsAuthorized] = useState(null); 
  const chatMessagesRef = useRef(null);

  const toggleChat = () => {
    setIsOpen(!isOpen);
  };

  useEffect(() => {
    if (isOpen) {
      initializeChat();
    }
  }, [isOpen]);

  useEffect(() => {
    document.body.className = theme === 'dark' ? 'dark-mode' : '';
  }, [theme]);

  // Scroll behavior
  const handleScroll = () => {
    const chatMessagesDiv = chatMessagesRef.current;
    if (chatMessagesDiv) {
      const isAtBottom =
        chatMessagesDiv.scrollHeight - chatMessagesDiv.scrollTop - chatMessagesDiv.clientHeight <= 1;
      setAutoScroll(isAtBottom);
    }
  };

  useEffect(() => {
    if (autoScroll && chatMessagesRef.current) {
      chatMessagesRef.current.scrollTop = chatMessagesRef.current.scrollHeight;
    }
  }, [messages, autoScroll]);

  const validateToken = async () => {
    try {
      const response = await fetch('http://localhost:8000/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channelId: props.channelId,
          token: props.token,
        }),
      });

      if (response.ok) {
        setIsAuthorized(true);
        return true;
      } else if (response.status === 401) {
        addBotMessage({
          content:
            'You are not authorized to access the chatbot. Token validation failed. (401 Unauthorized)',
        });
        setIsAuthorized(false); 
        return false;
      } else {
        addBotMessage({
          content: 'An error occurred while validating your token. Please try again.',
        });
        setIsAuthorized(false);
        return false;
      }
    } catch (error) {
      addBotMessage({
        content: 'An error occurred while validating your token. Please try again.',
      });
      setIsAuthorized(false);
      return false;
    }
  };

  const initializeChat = async () => {
    const authorized = await validateToken();
    if (!authorized) {
      return;
    }

    await getSessionId();

    if (selectedDepartment) {
      addBotMessage({
        content: `Welcome back! You are chatting with <strong>${selectedDepartment}</strong>. How can I assist you today?`,
      });
    } else {
      addInitialMessage();
    }
  };

  const getSessionId = async () => {
    let sid = localStorage.getItem('session_id');
    if (!sid) {
      try {
        const response = await fetch('http://localhost:8000/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        });

        if (response.ok) {
          const data = await response.json();
          sid = data.token;
          localStorage.setItem('session_id', sid);
          setSessionId(sid);
          return true;
        } else {
          addBotMessage({
            content: 'An error occurred while obtaining session token. Please try again.',
          });
          return false;
        }
      } catch (error) {
        addBotMessage({
          content: 'An error occurred while obtaining session token. Please try again.',
        });
        return false;
      }
    } else {
      setSessionId(sid);
      return true;
    }
  };


  const addBotMessage = (message) => {
    setMessages((prevMessages) => [...prevMessages, { type: 'bot', ...message }]);
    setAutoScroll(true); 
  };


  const addUserMessage = (messageContent) => {
    setMessages((prevMessages) => [...prevMessages, { type: 'user', content: messageContent }]);
    setAutoScroll(true); 
  };


  const handleFieldSelection = async (choice) => {
    const departments = {
      '1': 'Human Resources',
      '2': 'IT',
      '3': 'Finance',
    };

    const selectedDept = departments[choice];
    if (!selectedDept) {
      addBotMessage({
        content: 'Invalid selection. Please choose a proper department.',
      });
      return;
    }

    setSelectedDepartment(selectedDept);
    localStorage.setItem('selected_department', selectedDept);
    await getSessionId();
    addBotMessage({
      content: `You selected <strong>${selectedDept}</strong>. How can I assist you today?`,
    });
  };


  const submitField = async () => {
    const trimmedQuestion = question.trim();
    if (!selectedDepartment || !trimmedQuestion || !isAuthorized) return;

    addUserMessage(trimmedQuestion);
    setQuestion('');

    try {
      const response = await fetch('http://localhost:8000/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          department: selectedDepartment,
          question: trimmedQuestion,
          token: sessionId,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.content.toLowerCase().includes('out of my knowledge')) {
          addConcernMessage();
        } else {
          addBotMessage({ content: data.content });
        }
      } else {
        addBotMessage({
          content: 'An error occurred while processing your request. Please try again.',
        });
      }
    } catch (error) {
      addBotMessage({
        content: 'An error occurred while processing your request. Please try again.',
      });
    }
  };


  const addConcernMessage = () => {
    const concernMessage = {
      content: `
        <p>As there is no data available, we could send your question to the <strong>${selectedDepartment}</strong> team.</p>
        <p>Your entire conversation history will be shared. As the conversation is submitted, this chat session will be closed.</p>
        <p>Do you want to raise a concern?</p>
      `,
      options: [
        { label: 'Yes', value: true },
        { label: 'No', value: false },
      ],
      action: 'raiseConcern',
    };
    addBotMessage(concernMessage);
  };


  const raiseConcern = async (request) => {
    if (request) {
      try {
        const response = await fetch('http://localhost:8000/raiseconcernmail', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            department: selectedDepartment,
            token: sessionId,
            request: request,
          }),
        });

        const data = await response.json();

        if (data.success) {
          addBotMessage({
            content: `An email has been sent to the <strong>${selectedDepartment}</strong> team. Thank you. A new chat session has been initiated.`,
          });
          setTimeout(endChat, 3000);
        } else {
          addBotMessage({
            content: 'There was an issue raising your concern. Please try again.',
          });
        }
      } catch (error) {
        addBotMessage({
          content: 'An error occurred while processing your request. Please try again.',
        });
      }
    } else {
      addBotMessage({ content: 'You can continue the chat.' });
    }
  };


  const endChat = () => {
    setExitLoading(true);

    setTimeout(() => {
      setSelectedDepartment(null);
      setSessionId(null);
      localStorage.removeItem('session_id');
      localStorage.removeItem('selected_department');
      setQuestion('');
      setMessages([]);
      setExitLoading(false);
      setIsAuthorized(null); 
      addInitialMessage();
    }, 3000);
  };


  const addInitialMessage = () => {
    addBotMessage({
        content: `
        <p>Welcome to msg global! I'm here to answer all your questions.</p>
        <p>Please select your department:</p>
      `,
      options: [
        { label: 'Human Resources', value: '1' },
        { label: 'IT', value: '2' },
        { label: 'Finance', value: '3' },
      ],
      action: 'selectDepartment',
    });
  };


  const scrollToTop = () => {
    if (chatMessagesRef.current) {
      chatMessagesRef.current.scrollTop = 0;
    }
    setAutoScroll(false);
  };


  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
  };


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
                  aria-label="End Chat"
                  title="End Chat"
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
            <div
              className="chat-messages"
              id="chat-messages"
              ref={chatMessagesRef}
              onScroll={handleScroll}
            >
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
                        {msg.options && (
                          <div className="options">
                            {msg.options.map((option, idx) => (
                              <button
                                key={idx}
                                className="btn btn-option"
                                onClick={() => {
                                  if (msg.action === 'selectDepartment') {
                                    handleFieldSelection(option.value);
                                  } else if (msg.action === 'raiseConcern') {
                                    raiseConcern(option.value);
                                  }
                                }}
                              >
                                {option.label}
                              </button>
                            ))}
                          </div>
                        )}
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
            {isAuthorized && (
              <div className="chat-input">
                <input
                  type="text"
                  id="question"
                  placeholder={
                    selectedDepartment
                      ? 'Type a message...'
                      : 'Select a department to start...'
                  }
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
            )}
            {(exitLoading) && (
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
