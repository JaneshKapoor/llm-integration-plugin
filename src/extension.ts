import * as vscode from 'vscode';

export function activate(context: vscode.ExtensionContext) {

    console.log('Congratulations, your extension "llm-integration-plugin" is now active!');

    // Register a new command to configure LLM API Key
    const disposable = vscode.commands.registerCommand('llm-integration-plugin.configureLLM', () => {
        // Show input box to collect API key from the user
        vscode.window.showInputBox({ prompt: 'Enter API Key for LLM' }).then(apiKey => {
            if (apiKey) {
                // Save the API key to global state (persisted storage)
                context.globalState.update('llmApiKey', apiKey);
                vscode.window.showInformationMessage('API Key saved successfully!');
            }
        });
    });

	const showApiKey = vscode.commands.registerCommand('llm-integration-plugin.showLLMApiKey', () => {
		const apiKey = context.globalState.get('llmApiKey');
		if (apiKey) {
			vscode.window.showInformationMessage(`Current API Key: ${apiKey}`);
		} else {
			vscode.window.showInformationMessage('No API Key found.');
		}
	});
	
	context.subscriptions.push(showApiKey);
	

    context.subscriptions.push(disposable);
}

// This method is called when your extension is deactivated
export function deactivate() {}
