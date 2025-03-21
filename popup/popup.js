document.addEventListener('DOMContentLoaded', () => {
  const chatContainer = document.getElementById('chat-container');
  const input = document.getElementById('input');
  const sendButton = document.getElementById('send');
  const apiKeyInput = document.getElementById('api-key');
  const clearHistoryButton = document.getElementById('clear-history');

  // 初始化存储数据
  chrome.storage.local.get(['apiKey', 'chatHistory'], (result) => {
    apiKeyInput.value = result.apiKey || '';
    if (result.chatHistory?.html) {
      chatContainer.innerHTML = result.chatHistory.html;
      chatContainer.scrollTop = chatContainer.scrollHeight;
    }
  });

  // 配置相关逻辑
  const configModal = document.getElementById('config-modal');
  const baseUrlInput = document.getElementById('base-url');
  const modelInput = document.getElementById('model');
  const configApiKeyInput = document.getElementById('config-api-key');

  // 初始化配置
  chrome.storage.local.get(['baseUrl', 'model', 'apiKey'], (result) => {
    baseUrlInput.value = result.baseUrl || 'https://api.deepseek.com/v1';
    modelInput.value = result.model || 'deepseek-chat';
    configApiKeyInput.value = result.apiKey || '';
  });

  // 切换配置密钥可见性
  document.getElementById('config-toggle-key').addEventListener('click', () => {
    configApiKeyInput.type = configApiKeyInput.type === 'password' ? 'text' : 'password';
    document.getElementById('config-toggle-key').textContent = 
      configApiKeyInput.type === 'password' ? '显示' : '隐藏';
  });

  // 打开配置弹窗
  document.getElementById('settings').addEventListener('click', () => {
    configModal.style.display = 'flex';
  });

  // 保存配置
  document.getElementById('save-config').addEventListener('click', () => {
    chrome.storage.local.set({
      baseUrl: baseUrlInput.value,
      model: modelInput.value,
      apiKey: configApiKeyInput.value
    });
    configModal.style.display = 'none';
  });

  // 点击遮罩层关闭弹窗
  configModal.addEventListener('click', (e) => {
    if (e.target === configModal) {
      configModal.style.display = 'none';
    }
  });

  // 清除历史记录
  clearHistoryButton.addEventListener('click', () => {
    chatContainer.innerHTML = '';
    chrome.storage.local.remove('chatHistory');
  });

  // 发送消息逻辑
  sendButton.addEventListener('click', async () => {
    const message = input.value.trim();
    console.log(message);
    if (!message) {
      addMessage('请输入有效内容', 'error');
      return;
    }

    // 防止重复提交
    if (sendButton.classList.contains('loading')) return;

    // 在 try 块外声明状态变量
    let originalInputState = input.disabled;
    let originalButtonState = sendButton.disabled;
    
    try {
      // 锁定界面
      // 保存当前状态
      originalInputState = input.disabled;
      originalButtonState = sendButton.disabled;
      
      sendButton.disabled = true;
      input.disabled = true;
      sendButton.classList.add('loading');
      
      // 获取API密钥
      const apiKey = await getApiKey();
      if (!apiKey) {
        addMessage('请先设置API密钥', 'error');
        // 提前返回前恢复状态
        sendButton.disabled = originalButtonState;
        input.disabled = originalInputState;
        sendButton.classList.remove('loading');
        return;
      }

      addMessage(message, 'user');
      addMessage('正在加载中.....', 'ai');
      input.value = '';
      console.log("here");
      saveChatHistory();

      const baseUrl = await getConfig('baseUrl');
      const model = await getConfig('model');
      
      const response = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await getApiKey()}`
        },
        body: JSON.stringify({
          model: "deepseek-chat",
          messages: (await getChatHistory()).map(msg => ({
            role: msg.type === 'user' ? 'user' : 'assistant',
            content: msg.text
          })).concat({role: "user", content: message}),
          stream: true
        })
      });

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let aiResponse = '';
      
      while(true) {
        const {done, value} = await reader.read();
        if (done) break;
        
        buffer += decoder.decode(value, {stream: true});
        const chunks = buffer.split('data: ');
        buffer = chunks.pop();
        
        for (const chunk of chunks) {
          try {
            const data = JSON.parse(chunk);
            if (data.choices[0].delta.content) {
              aiResponse += data.choices[0].delta.content;
      updateLastMessage(aiResponse); // 保留加载提示并追加内容
saveChatHistory(); 
            }
          } catch (e) {
            console.error('解析错误:', e);
          }
        }
      }
      finalizeMessage();
    } catch (error) {
      addMessage(`请求失败: ${error.message}`, 'error');
    } finally {
      // 使用原始状态恢复确保一致性
      sendButton.disabled = originalButtonState;
      input.disabled = originalInputState;
      sendButton.classList.remove('loading');
    }
  });

  function addMessage(text, type) {
    const container = document.getElementById('chat-container');
    const div = document.createElement('div');
    div.className = `message ${type}-message`;
    
    if (type === 'ai') {
      div.classList.add('markdown-body');
      div.innerHTML = DOMPurify.sanitize(marked.parse(text));
    } else {
      div.textContent = text;
    }
    
    container.appendChild(div);
    container.scrollTop = container.scrollHeight;
  }

  function updateLastMessage(text) {
    const messages = document.querySelectorAll('.message');
    const lastMessage = messages[messages.length - 1];
    
    // 仅更新AI消息的Markdown内容
    if (lastMessage && lastMessage.classList.contains('ai-message')) {
      lastMessage.innerHTML = DOMPurify.sanitize(marked.parse(text));
    } else if (lastMessage && lastMessage.classList.contains('user-message')) {
      // 用户消息保持纯文本更新
      lastMessage.textContent = text; 
    } else {
      addMessage(text, 'ai');
    }
    chatContainer.scrollTop = chatContainer.scrollHeight;
  }

  function finalizeMessage() {
    const messages = document.querySelectorAll('.ai-message');
    if (messages.length > 0) {
      const lastMessage = messages[messages.length - 1];
      // 移除加载提示前缀
      lastMessage.textContent = lastMessage.textContent.replace('正在加载中..... ', '');
      lastMessage.classList.add('final-message');
    }
  }

  async function getConfig(key) {
    return new Promise(resolve => {
      chrome.storage.local.get([key], result => {
        const defaults = {
          baseUrl: 'https://api.deepseek.com/v1',
          model: 'deepseek-chat'
        };
        resolve(result[key] || defaults[key]);
      });
    });
  }

  async function getApiKey() {
    return new Promise(resolve => {
      chrome.storage.local.get(['apiKey'], result => {
        resolve(result.apiKey || prompt('请输入API密钥:'));
      });
    });
  }

  // 获取完整对话历史
  async function getChatHistory() {
    return new Promise(resolve => {
      chrome.storage.local.get(['chatHistory'], result => {
        resolve(result.chatHistory?.messages || []);
      });
    });
  }

  // 保存聊天记录到本地存储
  function saveChatHistory() {
      const messages = Array.from(document.querySelectorAll('.message')).map(msg => ({
        html: msg.outerHTML,
        text: msg.textContent,
        type: msg.classList.contains('user-message') ? 'user' : 
              msg.classList.contains('ai-message') ? 'ai' : 'error'
      }));

        chrome.storage.local.set({ 
          chatHistory: {
            html: chatContainer.innerHTML,
            messages: messages
          }
      });
  }
});
