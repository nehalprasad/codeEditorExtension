const input = document.getElementById('input');
const sendBtn = document.getElementById('send');
const attachFileBtn = document.getElementById('attachFile');
const fileInput = document.getElementById('fileInput');
const filePreviewContainer = document.getElementById('filePreviewContainer');
const fileNameDisplay = document.getElementById('fileName');
const removeFileBtn = document.getElementById('removeFile');
const messages = document.getElementById('messages');
const applyChangesBtn = document.getElementById('applyChanges');

let fileContent = '';
let selectedFileName = '';
let monacoEditor = null;

// Enable/disable send button
function updateSendState() {
  const hasText = input.value.trim() !== '';
  const hasFile = monacoEditor && monacoEditor.getValue().trim() !== '';
  sendBtn.disabled = !(hasText || hasFile);
}

// Add message to chat
function appendMessage(role, text) {
  const msg = document.createElement('div');
  msg.classList.add('message', role);

  const content = document.createElement('div');
  content.classList.add('message-text');
  content.textContent = text;

  const timestamp = document.createElement('div');
  timestamp.classList.add('timestamp');
  const now = new Date();
  timestamp.textContent = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  msg.appendChild(content);
  msg.appendChild(timestamp);

  messages.prepend(msg); // messages flow bottom-up (column-reverse)
}

// Determine Monaco language from file extension
function getLanguageFromFileName(fileName) {
  const ext = fileName.split('.').pop().toLowerCase();
  switch (ext) {
    case 'js': return 'javascript';
    case 'ts':
    case 'tsx': return 'typescript';
    case 'json': return 'json';
    case 'html': return 'html';
    case 'css': return 'css';
    case 'py': return 'python';
    case 'java': return 'java';
    case 'cpp': return 'cpp';
    case 'c': return 'c';
    case 'md': return 'markdown';
    default: return 'plaintext';
  }
}

// File attach click
attachFileBtn.addEventListener('click', () => {
  fileInput.click();
});

// On file selected
fileInput.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = function (e) {
      fileContent = e.target.result;
      selectedFileName = file.name;
      fileNameDisplay.textContent = selectedFileName;
      filePreviewContainer.style.display = 'block';

      if (monacoEditor) monacoEditor.dispose();

      const language = getLanguageFromFileName(file.name);
      monacoEditor = monaco.editor.create(document.getElementById('fileContent'), {
        value: fileContent,
        language: language,
        theme: 'vs-dark',
        automaticLayout: true,
        minimap: { enabled: false }
      });

      applyChangesBtn.style.display = 'none';

      monacoEditor.onDidChangeModelContent(() => {
        updateSendState();
        applyChangesBtn.style.display = 'block';
      });
    };
    reader.readAsText(file);
  }
});

// Apply changes
applyChangesBtn.addEventListener('click', () => {
  if (monacoEditor) {
    fileContent = monacoEditor.getValue();
    applyChangesBtn.style.display = 'none';
    alert('✅ Changes applied.');
  }
});

// Remove file
removeFileBtn.addEventListener('click', () => {
  fileInput.value = '';
  fileContent = '';
  selectedFileName = '';
  fileNameDisplay.textContent = '';
  filePreviewContainer.style.display = 'none';

  if (monacoEditor) {
    monacoEditor.dispose();
    monacoEditor = null;
  }

  updateSendState();
});

// Input typing
input.addEventListener('input', updateSendState);

// Handle form submit
document.getElementById('chatForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  if (sendBtn.disabled) return;

  const question = input.value.trim();
  const context = monacoEditor ? monacoEditor.getValue().trim() : '';

  appendMessage('user', question);
  input.value = '';
  updateSendState();

  appendMessage('assistant', '⏳ Thinking...');

  try {
    const url = 'https://luminos.app.n8n.cloud/webhook/75218963-0545-4924-971c-69ee1fb460bc';
    const payload = {
      question,
      context,
      'maybe more in the future': 'extension-v1'
    };
    const response = await axios.post(url, payload);
    const reply = response.data?.result || '❌ No "result" field in response';

    messages.firstChild.remove(); // Remove loading
    appendMessage('assistant', reply);
  } catch (err) {
    messages.firstChild.remove();
    appendMessage('assistant', `❌ API error: ${err.message}`);
  }
});

updateSendState();
