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
    faMicrophone,
    faMicrophoneSlash,
    faVolumeUp,
} from '@fortawesome/free-solid-svg-icons';
import chatIcon from '../assets/chat-icon.svg';
import logo from '../assets/new_msg_logo.svg';
import DOMPurify from 'dompurify';

const API_BASE_URL = 'http://localhost:9000';

const Chatbot = (props) => {
    const [isOpen, setIsOpen] = useState(false);
    const [selectedDepartment, setSelectedDepartment] = useState(
        localStorage.getItem('selected_department') || null
    );
    const [sessionId, setSessionId] = useState(localStorage.getItem('session_id') || null);
    const [messages, setMessages] = useState([]);
    const [question, setQuestion] = useState('');
    const [theme, setTheme] = useState('light');
    const [autoScroll, setAutoScroll] = useState(true);
    const [exitLoading, setExitLoading] = useState(false);
    const [isAuthorized, setIsAuthorized] = useState(null);
    const [isListening, setIsListening] = useState(false);
    const [permissionDenied, setPermissionDenied] = useState(false);
    const [inputDisabled, setInputDisabled] = useState(false);
    const recognitionRef = useRef(null);
    const chatMessagesRef = useRef(null);
    const messageIdRef = useRef(0);

    const toggleChat = () => {
        setIsOpen(!isOpen);
    };

    useEffect(() => {
        if (isOpen && !inputDisabled) {
            initializeChat();
        }
    }, [isOpen]);

    useEffect(() => {
        document.body.className = theme === 'dark' ? 'dark-mode' : '';
    }, [theme]);

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
            const response = await fetch(`${API_BASE_URL}/validate`, {
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
                    content:
                        'An error occurred while validating your token. Please refresh the page or try again later.',
                });
                setIsAuthorized(false);
                return false;
            }
        } catch (error) {
            addBotMessage({
                content:
                    'An error occurred while validating your token. Please refresh the page or try again later.',
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
                const response = await fetch(`${API_BASE_URL}/token`, {
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
                        content:
                            'An error occurred while obtaining session token. Please refresh the page or try again later.',
                    });
                    return false;
                }
            } catch (error) {
                addBotMessage({
                    content:
                        'An error occurred while obtaining session token. Please refresh the page or try again later.',
                });
                return false;
            }
        } else {
            setSessionId(sid);
            return true;
        }
    };

    const speak = (text) => {
        if ('speechSynthesis' in window) {
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.lang = 'en-US';
            window.speechSynthesis.speak(utterance);
        } else {
            console.warn('SpeechSynthesis is not supported in this browser.');
        }
    };

    const addBotMessage = (message, isStreamComplete = true) => {
        const id = messageIdRef.current++;
        setMessages((prevMessages) => [
            ...prevMessages,
            { id, type: 'bot', ...message, streamComplete: isStreamComplete } 
        ]);
        setAutoScroll(true);
        return id;
    };
    
    
    const addUserMessage = (messageContent) => {
        const id = messageIdRef.current++;
        setMessages((prevMessages) => [...prevMessages, { id, type: 'user', content: messageContent }]);
        setAutoScroll(true);
        return id;
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
        setInputDisabled(true);
    
        const botMessageId = addBotMessage({
            content: '<div class="typing-indicator"><div class="dot"></div><div class="dot"></div><div class="dot"></div></div>'
        }, false);  
    
        try {
            const response = await fetch(`${API_BASE_URL}/ask`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    department: selectedDepartment,
                    question: trimmedQuestion,
                    token: sessionId,
                }),
            });
    
            if (response.ok && response.body) {
                const reader = response.body.getReader();
                const decoder = new TextDecoder('utf-8');
                let done = false;
                let content = '';
    
                while (!done) {
                    const { value, done: doneReading } = await reader.read();
                    done = doneReading;
                    if (value) {
                        const chunk = decoder.decode(value, { stream: true });
                        content += chunk;
    
                        setMessages((prevMessages) =>
                            prevMessages.map((msg) =>
                                msg.id === botMessageId
                                    ? { ...msg, content: msg.content.replace(/<div.*<\/div>/, '') + chunk }
                                    : msg
                            )
                        );
                    }
                }
    
                setMessages((prevMessages) =>
                    prevMessages.map((msg) =>
                        msg.id === botMessageId
                            ? { ...msg, streamComplete: true } 
                            : msg
                    )
                );
                setInputDisabled(false);
    
                if (content.toLowerCase().includes('out of my knowledge')) {
                    addConcernMessage();
                }
            } else {
                addBotMessage({
                    content:
                        'An error occurred while processing your request. Please refresh the page or try again later.',
                });
            }
        } catch (error) {
            console.error('Error handling streamed response:', error);
            addBotMessage({
                content:
                    'An error occurred while processing your request. Please refresh the page or try again later.',
            });
        }
    };
    

    const addConcernMessage = () => {
        setInputDisabled(true);
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
                const response = await fetch(`${API_BASE_URL}/raiseconcernmail`, {
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
                    content:
                        'An error occurred while processing your request. Please refresh the page or try again later.',
                });
            }
        } else {
            addBotMessage({ content: 'You can continue the chat.' });
        }
        setInputDisabled(false);
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
            setIsAuthorized(true);
            getSessionId();
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

    useEffect(() => {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (SpeechRecognition) {
            recognitionRef.current = new SpeechRecognition();
            recognitionRef.current.continuous = false;
            recognitionRef.current.interimResults = false;
            recognitionRef.current.lang = 'en-US';

            recognitionRef.current.onresult = (event) => {
                const transcript = event.results[0][0].transcript;
                setQuestion(transcript);
                submitField();
            };

            recognitionRef.current.onerror = (event) => {
                console.error('Speech recognition error:', event.error);
                if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
                    setPermissionDenied(true);
                    addBotMessage({
                        content: 'Microphone access was denied. Please allow access to use voice input.',
                    });
                }
                setIsListening(false);
            };

            recognitionRef.current.onend = () => {
                setIsListening(false);
            };
        } else {
            console.warn('SpeechRecognition is not supported in this browser.');
            addBotMessage({
                content: 'Voice input is not supported in your browser.',
            });
        }
    }, []);

    const startListening = () => {
        if (recognitionRef.current && !isListening && selectedDepartment && isAuthorized) {
            try {
                recognitionRef.current.start();
                setIsListening(true);
                setPermissionDenied(false);
            } catch (error) {
                console.error('Error starting speech recognition:', error);
            }
        }
    };

    const stopListening = () => {
        if (recognitionRef.current && isListening) {
            recognitionRef.current.stop();
            setIsListening(false);
        }
    };

    const handleReadAloud = (text) => {
        const cleanText = DOMPurify.sanitize(text, { ALLOWED_TAGS: [] });
        speak(cleanText);
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
                                    <img src={logo} alt="MSG Global" title="msg global" />
                                </div>
                                <div className="chat-info">
                                    <h2>AssistMe</h2>
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
                                    title={
                                        isAuthorized === false
                                            ? 'You are not authorized to end the chat.'
                                            : 'End Chat'
                                    }
                                    disabled={isAuthorized === false}
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
                            aria-live="polite"
                        >
                            {messages.map((msg) => {
                                const lastBotIndex = [...messages]
                                    .reverse()
                                    .findIndex((m) => m.type === 'bot');
                                const actualLastBotIndex = lastBotIndex === -1 ? -1 : messages.length - 1 - lastBotIndex;
                                const isLatestBot = msg.type === 'bot' && messages.indexOf(msg) === actualLastBotIndex;

                                return (
                                    <div key={msg.id} className={`message ${msg.type}-message`}>
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
                                                                    aria-label={`Option: ${option.label}`}
                                                                >
                                                                    {option.label}
                                                                </button>
                                                            ))}
                                                        </div>
                                                    )}
                                                    {isLatestBot && msg.streamComplete &&  (
                                                        <button
                                                            className={`btn btn-read-aloud ${isListening ? 'listening' : ''}`}
                                                            onClick={() => handleReadAloud(msg.content)}
                                                            aria-label="Read this message aloud"
                                                            title="Read this message aloud"
                                                        >
                                                            <FontAwesomeIcon icon={faVolumeUp} />
                                                        </button>
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
                                );
                            })}
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
                                    disabled={!selectedDepartment || inputDisabled}
                                    value={question}
                                    onChange={(e) => setQuestion(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') submitField();
                                    }}
                                    aria-label="Type your message here"
                                />
                                <button
                                    className={`btn btn-voice ${isListening ? 'active' : ''}`}
                                    onClick={isListening ? stopListening : startListening}
                                    aria-label={isListening ? 'Stop voice input' : 'Start voice input'}
                                    title={isListening ? 'Stop voice input' : 'Start voice input'}
                                    disabled={!selectedDepartment  || inputDisabled}
                                >
                                    <FontAwesomeIcon
                                        icon={isListening ? faMicrophoneSlash : faMicrophone}
                                        size="lg"
                                    />
                                </button>
                                <button
                                    className="btn btn-send"
                                    id="submitButton"
                                    onClick={submitField}
                                    disabled={!selectedDepartment || question.trim() === ''  || inputDisabled}
                                    title="Send Message"
                                    aria-label="Send message"
                                >
                                    <FontAwesomeIcon icon={faPaperPlane} size="lg" />
                                </button>
                            </div>
                        )}

                        {exitLoading && (
                            <div className="loading-overlay" id="loading" aria-hidden="true">
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
