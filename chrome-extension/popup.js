document.addEventListener('DOMContentLoaded', async () => {
  const apiUrlInput = document.getElementById('apiUrl');
  const saveBtn = document.getElementById('saveBtn');
  const statusDiv = document.getElementById('status');

  // Load saved setting
  const data = await chrome.storage.local.get(['apiUrl']);
  if (data.apiUrl) {
    apiUrlInput.value = data.apiUrl;
  } else {
    apiUrlInput.value = 'http://localhost:3000/api/leads';
  }

  saveBtn.addEventListener('click', async () => {
    const apiUrl = apiUrlInput.value.trim() || 'http://localhost:3000/api/leads';
    await chrome.storage.local.set({ apiUrl });
    statusDiv.style.display = 'block';
    setTimeout(() => {
      statusDiv.style.display = 'none';
    }, 2000);
  });
});
