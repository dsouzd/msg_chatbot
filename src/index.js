import React from 'react';
import ReactDOM from 'react-dom';
import Chatbot from './components/Chatbot';

(function() {
  const createChatBot = (options = {}) => {
    const div = document.createElement('div');
    document.body.appendChild(div);
    ReactDOM.render(<Chatbot {...options} />, div);
  };

  window.createChatBot = createChatBot;

  let script = document.currentScript || (function() {
    const scripts = document.getElementsByTagName('script');
    return scripts[scripts.length - 1];
  })();

  const options = {
    channelId: script.getAttribute('channelId'),
    token: script.getAttribute('token'),
  };

  createChatBot(options);
})();
