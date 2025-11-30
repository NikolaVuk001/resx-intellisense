import * as vscode from "vscode";

export function getWebviewContent(
  keyName: string,
  fileGroups: { path: string; label: string; value: string }[],
  hasAi: boolean
) {
  // Generate an input field for every file found
  const inputsHtml = fileGroups
    .map(
      (file, index) => `
        <div class="input-group">
            <label>${file.label.toUpperCase()}</label>
            <input 
                type="text" 
                id="${file.label}" 
                data-path="${file.path}" 
                placeholder="Translation for ${file.label}" 
                ${index === 0 ? 'class="primary-input"' : ""} 
            />
        </div>
    `
    )
    .join("");
    
  const aiButtonHtml = hasAi
    ? `<button id="aiBtn" style="background-color: var(--vscode-button-secondaryBackground); color: var(--vscode-button-secondaryForeground); margin-right: 10px;">✨ AI Fill</button>`
    : "";

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

        <div style="margin-top: 20px;">
            ${aiButtonHtml}
            <button id="saveBtn">Save All</button>    
        </div>  
        
        <script>

            const vscode = acquireVsCodeApi();

            // 1. Save Logic (Updated to use data-path)
            document.getElementById("saveBtn").addEventListener("click", () => {
            const data = {};
            const inputs = document.querySelectorAll("input");
            inputs.forEach((input) => {
                // Use the file path stored in data-path attribute
                const filePath = input.getAttribute("data-path");
                if (input.value.trim() !== "") {
                data[filePath] = input.value;
                }
            });
            vscode.postMessage({ command: "save", data: data });
            });

            // 2. AI Logic
            const aiBtn  = document.getElementById("aiBtn");
            if (aiBtn) {
                aiBtn.addEventListener('click', () => {
                    // Get text from the first input (the primary one)
                    const primaryInput = document.querySelector(".primary-input");
                    const text = primaryInput.value;
                    console.log("AI Generation requested for text:", text);
                    if(!text) return;

                    vscode.postMessage({
                        command: 'generate-ai',
                        sourceText: text.trim()
                    });
                });
            }

            // 3. Listen for AI Results comming back
            window.addEventListener("message", (event) => {
            const message = event.data;

            if (message.command === "fill-translations") {
                const translations = message.data;

                const inputs = document.querySelectorAll("input");
                // FIXED: inputs.forEach instead of input.forEach
                inputs.forEach((input) => {
                // <--- WAS WRONG HERE
                const langCode = input.id;
                if (translations[langCode] && input.value.trim() === "") {
                    input.value = translations[langCode];
                }
                });
            }
            });

            // 2. Auto-Focus the first input field
            // Since we sorted the list so "Default" is frist, this puts the cursor
            // exactly where you want it.
            const firstInput = document.querySelector("input");
            if (firstInput) {
                firstInput.focus();
            }

            // Allow pressing "Enter" to save
            window.addEventListener("keydown", (e) => {
            if (e.key === "Enter") {
                document.getElementById("saveBtn").click();
            }
            });

        </script>
    </body>
    </html>`;
}
