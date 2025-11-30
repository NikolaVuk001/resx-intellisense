import * as vscode from "vscode";
import { ResxService } from "../services/resxService";

export class ResxCodeActionProvider implements vscode.CodeActionProvider {
  constructor(private resxService: ResxService) {}

  provideCodeActions(
    document: vscode.TextDocument,
    range: vscode.Range | vscode.Selection,
    context: vscode.CodeActionContext,
    token: vscode.CancellationToken
  ): vscode.ProviderResult<(vscode.CodeAction | vscode.Command)[]> {
    const lineText = document.lineAt(range.start.line).text;

    // REGEX: Extract the key inside Localizer["KEY"]
    const regex =
      /(Localizer|StringLocalizer|GetString)\s*\[\s*"([^"]+)"\s*\]/i;
    const match = lineText.match(regex);

    if (!match) return;

    const keyName = match[2];
    const keyExists = this.resxService.getKeyExsists(keyName);

    const actions: vscode.CodeAction[] = [];

    if (!keyExists) {
      // Logic 1: Missing Key -> "Add Key" Quick Fix
      // Create the Quick fix
      const action = new vscode.CodeAction(
        `Add key "${keyName}" to .resx`,
        vscode.CodeActionKind.QuickFix
      );

      action.command = {
        command: "resx-intelisense.addKey",
        title: "Add to Resx",
        arguments: [keyName],
      };

      actions.push(action);
    } else {
      // Logic 2: Key Exists -> "Edit Key" Quick Fix
      const editAction = new vscode.CodeAction(
        `Edit ${keyName} tranlations`,
        vscode.CodeActionKind.Refactor
      );
      editAction.command = {
        command: "resx-intelisense.addKey", // We reuse the same command!
        title: "Edit ResX",
        arguments: [keyName],
      };
      actions.push(editAction);
    }

    return actions;
  }
  resolveCodeAction?(
    codeAction: vscode.CodeAction,
    token: vscode.CancellationToken
  ): vscode.ProviderResult<vscode.CodeAction> {
    throw new Error("Method not implemented.");
  }
}
