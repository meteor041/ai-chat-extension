// 加载保存的配置
function loadConfig() {
  chrome.storage.sync.get(['baseUrl', 'model', 'apiKey'], function(result) {
    document.getElementById('base-url').value = result.baseUrl || '';
    document.getElementById('model').value = result.model || '';
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
