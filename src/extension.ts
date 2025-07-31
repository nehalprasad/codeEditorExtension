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
          }
        },
        undefined,
        context.subscriptions
      );
    })
  );
}

function getWebviewContent(panel: vscode.WebviewPanel, extensionUri: vscode.Uri): string {
  const htmlPath = vscode.Uri.joinPath(extensionUri, 'src', 'media', 'webview.html');
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
