import * as fs from 'fs';
import axios from 'axios';
import * as vscode from 'vscode';

export function activate(context: vscode.ExtensionContext) {
  context.subscriptions.push(
    vscode.commands.registerCommand('luminosChatPanel.start', () => {
      const panel = vscode.window.createWebviewPanel(
        'luminosChatPanel',
        'Luminos Chat',
        vscode.ViewColumn.One,
        {
          enableScripts: true,
          localResourceRoots: [vscode.Uri.joinPath(context.extensionUri, 'src', 'media')],
          retainContextWhenHidden: true
        }
      );

      const html = getWebviewContent(panel, context.extensionUri);
      panel.webview.html = html;

      panel.webview.onDidReceiveMessage(
        async message => {
          if (message.command === 'ask') {
            try {
              const question = message.question;

              const editor = vscode.window.activeTextEditor;
              const selection = editor?.document.getText(editor.selection) || '';
              const contextText = selection.trim();

              const reply = await sendToLuminosAPI(question, contextText);
              panel.webview.postMessage({ text: reply });
            } catch (error: any) {
              panel.webview.postMessage({ text: `❌ Error: ${error.message}` });
            }
          } else if (message.command === 'pickFile') {
            // Custom QuickPick for fuzzy file search
            const files = await vscode.workspace.findFiles('**/*', '**/node_modules/**');
            const items = files.map(uri => ({
              label: vscode.workspace.asRelativePath(uri),
              uri
            }));
            const picked = await vscode.window.showQuickPick(items, {
              placeHolder: 'Type to search for a file to add as context',
              matchOnDescription: true,
              matchOnDetail: true
            });
            if (picked && picked.uri) {
              const fileUri = picked.uri;
              const fileName = fileUri.fsPath.split(/[\\/]/).pop() || '';
              const fileContent = (await vscode.workspace.fs.readFile(fileUri)).toString();
              
              // Store the file URI for later use when applying changes
              panel.webview.postMessage({
                command: 'storeFileUri',
                fileUri: fileUri.toString()
              });
              
              // Open file in main VS Code editor in a different column to keep webview visible
              const doc = await vscode.workspace.openTextDocument(fileUri);
              await vscode.window.showTextDocument(doc, vscode.ViewColumn.Two);
              
              // Send file content to webview for Monaco editor
              console.log('Sending file to webview:', fileName, 'Content length:', fileContent.length);
              panel.webview.postMessage({
                command: 'openFileInMonaco',
                fileName,
                content: fileContent
              });
              
              // Bring webview back to focus after a short delay
              setTimeout(() => {
                panel.reveal();
              }, 100);
            }
          } else if (message.command === 'applyChanges') {
            try {
              const fileUri = vscode.Uri.parse(message.fileUri);
              const newContent = message.content;
              
              // Write the updated content back to the file
              await vscode.workspace.fs.writeFile(fileUri, Buffer.from(newContent, 'utf8'));
              
              // Notify the webview that changes were applied successfully
              panel.webview.postMessage({
                command: 'changesApplied',
                success: true
              });
              
              console.log('Changes applied successfully to:', fileUri.fsPath);
            } catch (error: any) {
              console.error('Error applying changes:', error);
              panel.webview.postMessage({
                command: 'changesApplied',
                success: false,
                error: error.message
              });
            }
          }
        },
        undefined,
        context.subscriptions
      );
    })
  );
}

function getWebviewContent(panel: vscode.WebviewPanel, extensionUri: vscode.Uri): string {
  const htmlPath = vscode.Uri.joinPath(extensionUri, 'src', 'media', 'index.html');
  let html = fs.readFileSync(htmlPath.fsPath, 'utf8');

  const cssUri = panel.webview.asWebviewUri(
    vscode.Uri.joinPath(extensionUri, 'src', 'media', 'styles.css')
  );

  const jsUri = panel.webview.asWebviewUri(
    vscode.Uri.joinPath(extensionUri, 'src', 'media', 'main.js')
  );

  html = html.replace('./styles.css', cssUri.toString());
  html = html.replace('./main.js', jsUri.toString());

  return html;
}

async function sendToLuminosAPI(question: string, context: string): Promise<string> {
  const url = 'https://luminos.app.n8n.cloud/webhook/75218963-0545-4924-971c-69ee1fb460bc';

  const payload = {
    question: question,
    context: context,
    'maybe more in the future': 'extension-v1'
  };

  const response = await axios.post(url, payload);
  return response.data?.result || '❌ No "result" field in response';
}


export function deactivate() {}
