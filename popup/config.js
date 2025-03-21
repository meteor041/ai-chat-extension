// 加载保存的配置
function loadConfig() {
  chrome.storage.local.get(['baseUrl', 'model', 'apiKey'], function(result) {
    document.getElementById('base-url').value = result.baseUrl || 'https://api.deepseek.com/v1';
    document.getElementById('model').value = result.model || 'deepseek-chat';
    document.getElementById('api-key').value = result.apiKey || '';
  });
}

// 保存配置
function saveConfig() {
  const baseUrl = document.getElementById('base-url').value;
  const model = document.getElementById('model').value;
  const apiKey = document.getElementById('api-key').value;

  chrome.storage.local.set({
    baseUrl: baseUrl,
    model: model,
    apiKey: apiKey
  }, function() {
    showMessage('配置保存成功！');
  });

  // 延迟关闭窗口，给用户看到保存成功的提示
  setTimeout(() => {
    window.close();
  }, 1500); // 可以根据消息提示的显示时间调整延迟
}

// 显示消息提示
function showMessage(message) {
  const msg = document.createElement('div');
  msg.textContent = message;
  msg.style.position = 'fixed';
  msg.style.bottom = '20px';
  msg.style.left = '50%';
  msg.style.transform = 'translateX(-50%)';
  msg.style.backgroundColor = '#4CAF50';
  msg.style.color = 'white';
  msg.style.padding = '10px 20px';
  msg.style.borderRadius = '4px';
  msg.style.zIndex = '1000';
  document.body.appendChild(msg);
  
  setTimeout(() => {
    msg.remove();
  }, 2000);
}

// 初始化
document.addEventListener('DOMContentLoaded', function() {
  loadConfig();
  
  document.getElementById('save-config').addEventListener('click', saveConfig);
});
