// 后台服务 Worker 用于处理存储
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'setApiKey') {
    chrome.storage.local.set({ apiKey: request.key }, () => {
      sendResponse({ status: 'success' });
    });
    return true;
  }
});
