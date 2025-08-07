const input = document.getElementById('input');
const sendBtn = document.getElementById('send');
const attachFileBtn = document.getElementById('attachFile');
const fileInput = document.getElementById('fileInput');
const filePreviewContainer = document.getElementById('filePreviewContainer');
const fileNameDisplay = document.getElementById('fileName');
const removeFileBtn = document.getElementById('removeFile');
const messages = document.getElementById('messages');
const applyChangesBtn = document.getElementById('applyChanges');
const uploadSelectionBtn = document.getElementById('uploadSelection');

let fileContent = '';
let selectedFileName = '';
let selectedFileUri = '';
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
  
  // Handle markdown-like formatting for better readability
  if (role === 'assistant') {
    // Convert code blocks to proper formatting
    text = text.replace(/```(\w+)?\n([\s\S]*?)```/g, '<pre><code>$2</code></pre>');
    // Convert inline code
    text = text.replace(/`([^`]+)`/g, '<code>$1</code>');
    // Convert line breaks
    text = text.replace(/\n/g, '<br>');
    content.innerHTML = text;
  } else {
    content.textContent = text;
  }

  const timestamp = document.createElement('div');
  timestamp.classList.add('timestamp');
  const now = new Date();
  timestamp.textContent = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  msg.appendChild(content);
  msg.appendChild(timestamp);

  messages.prepend(msg); // messages flow bottom-up (column-reverse)
  
  // Auto-scroll to bottom
  messages.scrollTop = messages.scrollHeight;
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

// Acquire VS Code API for messaging
const vscode = window.acquireVsCodeApi ? window.acquireVsCodeApi() : undefined;

// Initialize Monaco editor when it's ready
let monacoReady = false;

// Set up Monaco ready callback
window.onMonacoReady = () => {
  monacoReady = true;
};

// Check if Monaco is already ready
if (window.monaco) {
  monacoReady = true;
}

// Add event listener for messages from the extension
window.addEventListener('message', event => {
  const message = event.data;
  if (message.command === 'storeFileUri') {
    selectedFileUri = message.fileUri;
    console.log('Stored file URI:', selectedFileUri);
  } else if (message.command === 'changesApplied') {
    if (message.success) {
      appendMessage('assistant', '✅ Changes applied successfully to the file!');
      applyChangesBtn.style.display = 'none';
      applyChangesBtn.textContent = 'Apply Changes';
      applyChangesBtn.disabled = false;
    } else {
      appendMessage('assistant', `❌ Error applying changes: ${message.error}`);
      applyChangesBtn.textContent = 'Apply Changes';
      applyChangesBtn.disabled = false;
    }
  } else if (message.command === 'openFileInMonaco') {
    console.log('Received openFileInMonaco command:', message);
    fileContent = message.content;
    selectedFileName = message.fileName;
    fileNameDisplay.textContent = selectedFileName;
    filePreviewContainer.style.display = 'block';
    
    // Ensure Monaco is ready before creating editor
    const createEditor = () => {
      console.log('Creating Monaco editor for:', selectedFileName);
      if (monacoEditor) {
        monacoEditor.dispose();
      }
      
      const fileContentElement = document.getElementById('fileContent');
      if (!fileContentElement) {
        console.error('fileContent element not found');
        return;
      }
      
      const language = getLanguageFromFileName(selectedFileName);
      console.log('Language detected:', language);
      
      try {
        monacoEditor = monaco.editor.create(fileContentElement, {
          value: fileContent,
          language: language,
          theme: 'vs-dark',
          automaticLayout: true,
          minimap: { enabled: false },
          scrollBeyondLastLine: false,
          wordWrap: 'on',
          fontSize: 12,
          lineNumbers: 'on',
          renderWhitespace: 'selection'
        });
        
        console.log('Monaco editor created successfully');
        applyChangesBtn.style.display = 'none';
        
        // Add visual feedback
        appendMessage('assistant', `📄 Loaded file: ${selectedFileName} (${fileContent.length} characters)`);
        
        monacoEditor.onDidChangeModelContent(() => {
          updateSendState();
          applyChangesBtn.style.display = 'block';
        });
        
        // Force layout update
        setTimeout(() => {
          if (monacoEditor) {
            monacoEditor.layout();
          }
        }, 100);
        
        // Show/hide upload selection button based on selection
        function updateUploadSelectionBtn() {
          if (!monacoEditor) return;
          const selection = monacoEditor.getSelection();
          const selectedText = monacoEditor.getModel().getValueInRange(selection);
          if (selectedText && selectedText.trim().length > 0) {
            uploadSelectionBtn.style.display = 'inline-block';
          } else {
            uploadSelectionBtn.style.display = 'none';
          }
        }
        monacoEditor.onDidChangeCursorSelection(updateUploadSelectionBtn);
        updateUploadSelectionBtn();

        // Upload selection button click handler
        uploadSelectionBtn.onclick = function (event) {
          event.preventDefault();
          if (!monacoEditor) return;
          const selection = monacoEditor.getSelection();
          const selectedText = monacoEditor.getModel().getValueInRange(selection);
          if (selectedText && selectedText.trim().length > 0) {
            // Insert as code block in chat textarea, on a new line
            let current = input.value;
            if (current && !current.endsWith('\n')) current += '\n';
            const language = getLanguageFromFileName(selectedFileName);
            input.value = `${current}\n\n\`\`\`${language}\`\`\`\n\`\`\`\n${selectedText}\`\`\`\n\`\`\`\n`;
            input.focus();
            // Auto-resize textarea
            input.style.height = 'auto';
            input.style.height = input.scrollHeight + 'px';
            // Add .code-block class if triple backticks present
            if (input.value.includes('```')) {
              input.classList.add('code-block');
            } else {
              input.classList.remove('code-block');
            }
            updateSendState();
            // Optionally, clear selection in Monaco
            monacoEditor.setSelection({
              startLineNumber: selection.endLineNumber,
              startColumn: selection.endColumn,
              endLineNumber: selection.endLineNumber,
              endColumn: selection.endColumn
            });
            uploadSelectionBtn.style.display = 'none';
          }
        };
        
      } catch (error) {
        console.error('Error creating Monaco editor:', error);
      }
    };

    if (monacoReady && window.monaco) {
      createEditor();
    } else {
      console.log('Waiting for Monaco to be ready...');
      // Wait for Monaco to be ready
      const waitForMonaco = setInterval(() => {
        if (monacoReady && window.monaco) {
          console.log('Monaco is ready, creating editor');
          createEditor();
          clearInterval(waitForMonaco);
        }
      }, 100);
      
      // Timeout after 5 seconds
      setTimeout(() => {
        clearInterval(waitForMonaco);
        console.error('Monaco editor failed to initialize within timeout');
      }, 5000);
    }
  }
});

// File attach click
attachFileBtn.addEventListener('click', () => {
  if (vscode) {
    vscode.postMessage({ command: 'pickFile' });
  } else {
    fileInput.click(); // fallback
  }
});

// On file selected
fileInput.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = function (e) {
      fileContent = e.target.result;
      selectedFileName = file.name;
      selectedFileUri = ''; // Clear file URI for local files
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
  if (monacoEditor && selectedFileUri) {
    const updatedContent = monacoEditor.getValue();
    console.log('Applying changes to file:', selectedFileUri);
    
    // Send the updated content back to the extension
    if (vscode) {
      vscode.postMessage({
        command: 'applyChanges',
        fileUri: selectedFileUri,
        content: updatedContent
      });
    }
    
    // Show loading state
    applyChangesBtn.textContent = 'Applying...';
    applyChangesBtn.disabled = true;
  } else if (!selectedFileUri) {
    console.error('No file URI available for applying changes');
    appendMessage('assistant', '❌ Cannot apply changes: File was not selected through VS Code file picker.');
  } else {
    console.error('No Monaco editor available');
    appendMessage('assistant', '❌ No file loaded in the editor.');
  }
});

// Remove file
removeFileBtn.addEventListener('click', () => {
  fileInput.value = '';
  fileContent = '';
  selectedFileName = '';
  selectedFileUri = '';
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

// Add input event handler for #input to auto-resize and toggle .code-block class
input.addEventListener('input', function() {
  if (input.value.includes('```')) {
    input.classList.add('code-block');
  } else {
    input.classList.remove('code-block');
  }
  input.style.height = 'auto';
  input.style.height = input.scrollHeight + 'px';
  updateSendState();
});

// Handle Enter/Ctrl+Enter in textarea for form submission
input.addEventListener('keydown', function(e) {
  if (e.key === 'Enter') {
    if (e.ctrlKey || e.metaKey) {
      // Submit the form
      e.preventDefault();
      document.getElementById('chatForm').dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
    } else {
      // Just insert a new line
      // (Let default happen, but prevent form submit)
      e.stopPropagation();
    }
  }
});

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

// Add welcome message when the page loads
setTimeout(() => {
  appendMessage('assistant', '👋 Welcome to Luminos Chat! I can help you with your code. Try asking me questions or attach a file to get started.');
}, 500);
