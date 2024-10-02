import * as vscode from 'vscode';
import axios from 'axios';

export function activate(context: vscode.ExtensionContext) {

    console.log('Congratulations, your extension "llm-integration-plugin" is now active!');

    // Register a new command to configure LLM API Key
    const configureApiKeyDisposable = vscode.commands.registerCommand('llm-integration-plugin.configureLLM', () => {
        vscode.window.showInputBox({ prompt: 'Enter API Key for LLM' }).then(apiKey => {
            if (apiKey) {
                context.globalState.update('llmApiKey', apiKey);
                vscode.window.showInformationMessage('API Key saved successfully!');
            }
        });
    });

    // Command to show the API Key (for testing purposes)
    const showApiKeyDisposable = vscode.commands.registerCommand('llm-integration-plugin.showLLMApiKey', () => {
        const apiKey = context.globalState.get<string>('llmApiKey');
        if (apiKey) {
            vscode.window.showInformationMessage(`Current API Key: ${apiKey}`);
        } else {
            vscode.window.showInformationMessage('No API Key found.');
        }
    });

    // Command to interact with OpenAI Chat API
    const askOpenAiDisposable = vscode.commands.registerCommand('llm-integration-plugin.askOpenAI', async () => {
        const apiKey = context.globalState.get<string>('llmApiKey');
        if (!apiKey) {
            vscode.window.showErrorMessage('No API Key found. Please configure the API Key first.');
            return;
        }

        // Prompt the user for input
        const prompt = await vscode.window.showInputBox({ prompt: 'Enter your prompt for OpenAI' });
        if (!prompt) {
            return;
        }

        try {
            const response = await axios.post(
                'https://api.openai.com/v1/chat/completions',
                {
                    model: 'gpt-4o',
                    messages: [
                        { role: 'user', content: prompt }
                    ],
                    max_tokens: 150,
                    temperature: 0.7
                },
                {
                    headers: {
                        'Authorization': `Bearer ${apiKey}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            if (response.data && response.data.choices && response.data.choices.length > 0) {
                const reply = response.data.choices[0].message.content.trim();
                vscode.window.showInformationMessage(`OpenAI says: ${reply}`);
            } else {
                vscode.window.showErrorMessage('No response from OpenAI.');
            }

        } catch (error) {
            const err = error as any;
            if (axios.isAxiosError(err)) {
                if (err.response) {
                    vscode.window.showErrorMessage(`Error communicating with OpenAI: Status ${err.response.status} - ${err.response.statusText}`);
                    console.error('Response data:', err.response.data);
                } else if (err.request) {
                    vscode.window.showErrorMessage('No response received from OpenAI.');
                    console.error('Request details:', err.request);
                } else {
                    vscode.window.showErrorMessage(`Error setting up request to OpenAI: ${err.message}`);
                }
            } else {
                vscode.window.showErrorMessage(`Unexpected error: ${err}`);
            }
        }
    });

    context.subscriptions.push(configureApiKeyDisposable);
    context.subscriptions.push(showApiKeyDisposable);
    context.subscriptions.push(askOpenAiDisposable);
}

export function deactivate() {}
