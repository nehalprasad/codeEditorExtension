"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deactivate = exports.activate = void 0;
const fs = __importStar(require("fs"));
const axios_1 = __importDefault(require("axios"));
const vscode = __importStar(require("vscode"));
function activate(context) {
    context.subscriptions.push(vscode.commands.registerCommand('luminosChatPanel.start', () => {
        const panel = vscode.window.createWebviewPanel('luminosChatPanel', 'Luminos Chat', vscode.ViewColumn.One, {
            enableScripts: true,
            localResourceRoots: [vscode.Uri.joinPath(context.extensionUri, 'src', 'media')],
        });
        const html = getWebviewContent(panel, context.extensionUri);
        panel.webview.html = html;
        panel.webview.onDidReceiveMessage(async (message) => {
            if (message.command === 'ask') {
                try {
                    const question = message.question;
                    const editor = vscode.window.activeTextEditor;
                    const selection = editor?.document.getText(editor.selection) || '';
                    const contextText = selection.trim();
                    const reply = await sendToLuminosAPI(question, contextText);
                    panel.webview.postMessage({ text: reply });
                }
                catch (error) {
                    panel.webview.postMessage({ text: `❌ Error: ${error.message}` });
                }
            }
        }, undefined, context.subscriptions);
    }));
}
exports.activate = activate;
function getWebviewContent(panel, extensionUri) {
    const htmlPath = vscode.Uri.joinPath(extensionUri, 'src', 'media', 'webview.html');
    let html = fs.readFileSync(htmlPath.fsPath, 'utf8');
    const cssUri = panel.webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, 'src', 'media', 'styles.css'));
    const jsUri = panel.webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, 'src', 'media', 'main.js'));
    html = html.replace('./styles.css', cssUri.toString());
    html = html.replace('./main.js', jsUri.toString());
    return html;
}
async function sendToLuminosAPI(question, context) {
    const url = 'https://luminos.app.n8n.cloud/webhook/75218963-0545-4924-971c-69ee1fb460bc';
    const payload = {
        question: question,
        context: context,
        'maybe more in the future': 'extension-v1'
    };
    const response = await axios_1.default.post(url, payload);
    return response.data?.result || '❌ No "result" field in response';
}
function deactivate() { }
exports.deactivate = deactivate;
//# sourceMappingURL=extension.js.map