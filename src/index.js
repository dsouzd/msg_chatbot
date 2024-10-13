// src/index.js
import React from 'react';
import ReactDOM from 'react-dom';
import Chatbot from './components/Chatbot';

const createChatBot = () => {
  const div = document.createElement('div');
  document.body.appendChild(div);
  ReactDOM.render(<Chatbot />, div);
};

window.createChatBot = createChatBot;