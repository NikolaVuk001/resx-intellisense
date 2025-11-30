import * as vscode from "vscode";

export function getWebviewContent(
  keyName: string,
  fileGroups: { path: string; label: string; value: string }[]
) {
  // Generate an input field for every file found
  const inputsHtml = fileGroups
    .map(
      (file) => `
        <div class="input-group">
            <label>${file.label}</label>
            <input type="text" id="${file.path}" value="${file.value}" placeholder="Translation for ${file.label}" />
        </div>
    `
    )
    .join("");

  return `<!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Add ResX Key</title>
        <style>
            body { 
                font-family: var(--vscode-font-family); 
                padding: 20px; 
                color: var(--vscode-editor-foreground);
                background-color: var(--vscode-editor-background);
            }
            h2 { color: var(--vscode-textLink-activeForeground); }
            .input-group { margin-bottom: 15px; }
            label { display: block; margin-bottom: 5px; font-weight: bold; font-size: 0.9em; opacity: 0.8; }
            input { 
                width: 100%; 
                padding: 8px; 
                background: var(--vscode-input-background); 
                color: var(--vscode-input-foreground); 
                border: 1px solid var(--vscode-input-border); 
                outline: none;
            }
            input:focus { border-color: var(--vscode-focusBorder); }
            button {
                background: var(--vscode-button-background);
                color: var(--vscode-button-foreground);
                border: none;
                padding: 10px 20px;
                cursor: pointer;
                font-size: 1em;
                margin-top: 10px;
            }
            button:hover { background: var(--vscode-button-hoverBackground); }
        </style>
    </head>
    <body>
        <h2>Add Key: <code>${keyName}</code></h2>
        
        <div id="form-container">
            ${inputsHtml}
        </div>

        <button id="saveBtn">Save All</button>

        <script>
            const vscode = acquireVsCodeApi();

            // 1. Save Logic
            document.getElementById('saveBtn').addEventListener('click', () => {
                const data = {};
                const inputs = document.querySelectorAll('input');
                inputs.forEach(input => {
                    data[input.id] = input.value;
                });

                vscode.postMessage({ command: 'save', data: data });
            });


            // 2. Auto-Focus the first input field
            // Since we sorted the list so "Default" is frist, this puts the cursor
            // exactly where you want it.
            const firstinput = document.querySelector('input');
            if(firstinput) {
                firstinput.focus();
            }


            // Allow pressing "Enter" to save
            window.addEventListener('keydown', (e) => {
                if(e.key === 'Enter') {
                    document.getElementById('saveBtn').click();
                }
            })

        </script>
    </body>
    </html>`;
}
