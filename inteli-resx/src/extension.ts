import * as vscode from "vscode";
import { ResxService } from "./services/resxService";
import { ResxCompletionProvider } from "./providers/completionProvider";
import { ResxCodeActionProvider } from "./providers/codeActionProvider";
import { CommandNames } from "./constants/commandNames";
import { addKeyCommand } from "./commands/addKeyCommand";
import { ResxDiagnostics } from "./diagnostics/resxDiagnostics";
import { DiagnosticCodes } from "./constants/diagnosticCodes";

export function activate(context: vscode.ExtensionContext) {
  console.log("ResX Intellisense is active!");

  // 1. Initialize Service (The State)
  const resxService = new ResxService();
  resxService.loadFiles();
  context.subscriptions.push({ dispose: () => resxService.dispose() });

  // 2. Diagnostics Manager
  const diagnosticsManager = new ResxDiagnostics(resxService);

  // -- EVENT LISTENERS --
  // A. When a file is active/opened, check it immediately
  if (vscode.window.activeTextEditor) {
    diagnosticsManager.refreshDiagnostics(
      vscode.window.activeTextEditor.document
    );
  }
  context.subscriptions.push(
    vscode.window.onDidChangeActiveTextEditor((editor) => {
      if (editor) {
        diagnosticsManager.refreshDiagnostics(editor.document);
      }
    })
  );

  // B. When th user types (Text Changed)
  context.subscriptions.push(
    vscode.workspace.onDidChangeTextDocument((e) => {
      diagnosticsManager.refreshDiagnostics(e.document);
    })
  );

  // C. When .resx files change (Keys updated)
  // If we add a key, we want the existing yellow squiggles to go away
  resxService.onKeysUpdated(() => {
    if (vscode.window.activeTextEditor) {
      diagnosticsManager.refreshDiagnostics(
        vscode.window.activeTextEditor.document
      );
    }
  });

  // 3. Register InteliSense Provider
  const completionProvider = vscode.languages.registerCompletionItemProvider(
    ["csharp", "razor", "aspnetcorerazor"],
    new ResxCompletionProvider(resxService),
    '"' // Trigger on double quote
  );

  // 4. Register Code Action Provider (Quick Fix)
  const codeActionProvider = vscode.languages.registerCodeActionsProvider(
    ["csharp", "razor", "aspnetcorerazor"],
    new ResxCodeActionProvider(resxService),
    { providedCodeActionKinds: [vscode.CodeActionKind.QuickFix] }
  );

  // 4. Register Command
  const command = vscode.commands.registerCommand(
    CommandNames.AddKey,
    addKeyCommand
  );

  // Add to subscriptions
  context.subscriptions.push(
    { dispose: () => resxService.dispose() },
    { dispose: () => diagnosticsManager.dispose() },
    completionProvider,
    codeActionProvider,
    command
  );
}

export function deactivate() {}
