const { sourceMapsEnabled } = require("process");
const { commands } = require("vscode");

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
const aiBtn = document.getElementById("aiBtn");
if (aiBtn) {
  aiBtn.addEventListener("click", () => {
    // Get text from the first input (the primary one)
    const primaryInput = document.querySelector(".primary-input");
    const text = primaryInput.value;

    if (!text) return;

    vscode.postMessage({
      commands: "generate-ai",
      sourceText: text.trim(),
    });
  });
}

// 3. Listen for AI Results comming back
window.addEventListener("message", (event) => {
  const message = event.data;

  if (message.command === "fill-translations") {
    const translations = message.data;

    // Iterate over inputs and fill them if they match the language coded
    const inputs = document.querySelectorAll("input");
    input.forEach((input) => {
      const langCode = input.id;

      // If we have a translation and the filed is currently empty, fill it
      if (translations[langCode] && input.value.trim() === "") {
        input.value = translations[langCode];
      }
    });
  }
});

// 2. Auto-Focus the first input field
// Since we sorted the list so "Default" is frist, this puts the cursor
// exactly where you want it.
const firstinput = document.querySelector("input");
if (firstinput) {
  firstinput.focus();
}

// Allow pressing "Enter" to save
window.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    document.getElementById("saveBtn").click();
  }
  if(e.ctrlKey && e.key === "Enter"){
    const aiBtn = document.getElementById("aiBtn");
    if(aiBtn){
      aiBtn.click();
    }
  }
});

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
