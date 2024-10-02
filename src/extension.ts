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

    // Command to interact with OpenAI Chat API and preview the result
    const askOpenAiDisposable = vscode.commands.registerCommand('llm-integration-plugin.askOpenAI', async () => {
        const apiKey = context.globalState.get<string>('llmApiKey');
        if (!apiKey) {
            vscode.window.showErrorMessage('No API Key found. Please configure the API Key first.');
            return;
        }

        // Get the active editor and determine the file extension
        const editor = vscode.window.activeTextEditor;
        let language = 'code';  // Default generic language

        if (editor) {
            const fileName = editor.document.fileName;
            const fileExtension = fileName.split('.').pop();

            // Map file extensions to programming languages
            const languageMap: { [key: string]: string } = {
                'js': 'JavaScript',
                'ts': 'TypeScript',
                'py': 'Python',
                'java': 'Java',
                'cpp': 'C++',
                'cs': 'C#',
                'rb': 'Ruby',
                'php': 'PHP',
                'html': 'HTML',
                'css': 'CSS',
                // Add more file extensions and languages as needed
            };

            language = languageMap[fileExtension || ''] || 'code';  // Default to 'code' if unknown extension
        }

        // Prompt the user for input
        const userPrompt = await vscode.window.showInputBox({
            prompt: 'Enter your prompt for OpenAI (e.g., "Write a function to sort an array")'
        });

        if (!userPrompt) {
            return;
        }

        // Add refinement to the prompt, including the detected language if no language is specified
        let refinedPrompt = userPrompt;

        // Check if the user explicitly specified a language
        const languageSpecified = /\b(in|using|with|for)\b\s+(JavaScript|Python|TypeScript|C\+\+|C#|Ruby|PHP|Java)\b/i.test(userPrompt);

        if (!languageSpecified) {
            refinedPrompt += ` in ${language}. Return only the code without explanations.`;
        } else {
            refinedPrompt += `. Return only the code without explanations.`;
        }

        try {
            const response = await axios.post(
                'https://api.openai.com/v1/chat/completions',
                {
                    model: 'gpt-4o',
                    messages: [
                        { role: 'user', content: refinedPrompt }
                    ],
                    max_tokens: 1000, // Increased token limit
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
                let reply = response.data.choices[0].message.content.trim();

                // Extract code block from the response if present
                const codeBlockMatch = reply.match(/```(?:\w+)?\n([\s\S]*?)```/);
                if (codeBlockMatch && codeBlockMatch[1]) {
                    reply = codeBlockMatch[1].trim();  // Extract content within the code block
                } else {
                    // If no code block found, remove any ``` markers if they exist
                    reply = reply.replace(/```/g, '');
                }

                // Preview the code in the editor using ghost text (decorations)
                if (editor) {
                    const decorationType = vscode.window.createTextEditorDecorationType({
                        after: { contentText: reply, color: '#888888' },  // ghost text styling
                        isWholeLine: true  // Show the ghost text as if it is part of a new line
                    });

                    const lastLine = editor.document.lineAt(editor.document.lineCount - 1);
                    const decoration = { range: new vscode.Range(lastLine.range.end, lastLine.range.end) };
                    editor.setDecorations(decorationType, [decoration]);

                    const accept = 'Accept';
                    const discard = 'Discard';

                    vscode.window.showInformationMessage('OpenAI generated code. Would you like to insert it?', accept, discard).then(selection => {
                        if (selection === accept) {
                            editor.edit(editBuilder => {
                                editBuilder.insert(lastLine.range.end, `\n${reply}\n`);
                            });
                            // Clear the preview decoration after insertion
                            editor.setDecorations(decorationType, []);
                        } else if (selection === discard) {
                            // Clear the preview if discarded
                            editor.setDecorations(decorationType, []);
                        }
                    });
                }
            } else {
                vscode.window.showErrorMessage('No response from OpenAI.');
            }

        } catch (error) {
            const err = error as any;
            if (axios.isAxiosError(err)) {
                if (err.response) {
                    vscode.window.showErrorMessage(`Error communicating with OpenAI: Status ${err.response.status} - ${err.response.statusText}`);
                    console.error(`OpenAI API error:`, err.response.data);
                } else {
                    vscode.window.showErrorMessage('Error communicating with OpenAI.');
                }
            } else {
                vscode.window.showErrorMessage('Unexpected error.');
            }
        }
    });

    // Register the command disposables
    context.subscriptions.push(configureApiKeyDisposable);
    context.subscriptions.push(showApiKeyDisposable);
    context.subscriptions.push(askOpenAiDisposable);
}

// This method is called when your extension is deactivated
export function deactivate() {}
