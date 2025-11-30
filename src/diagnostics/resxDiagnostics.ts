import * as vscode from "vscode";
import { ResxService } from "../services/resxService";
import { DiagnosticCodes } from "../constants/diagnosticCodes";

export class ResxDiagnostics {
  private diagnosticCollection: vscode.DiagnosticCollection;

  constructor(private resxService: ResxService) {
    this.diagnosticCollection =
      vscode.languages.createDiagnosticCollection("resx-diagnostics");
  }
  
  public refreshDiagnostics(document: vscode.TextDocument): void {
    // The only check supported files
    if (
      document.languageId !== "csharp" &&
      document.languageId !== "razor" &&
      document.languageId !== "aspnetcorerazor"
    ) {
      return;
    }

    const diagnostics: vscode.Diagnostic[] = [];
    const text = document.getText();

    // REGEX: Global search for Localizer["Key"]
    // Group1: The Localizer word
    // Group2: The Key inside the brackets and quotes
    const regex =
      /(Localizer|StringLocalizer|GetString)\s*\[\s*"([^"]+)"\s*\]/g;

    let match;
    while ((match = regex.exec(text)) !== null) {
      const keyName = match[2];
      
      if (this.resxService.getKeyExsists(keyName)) {
        continue;
      }

      const matchStart = match.index;
      const keyStart = matchStart + match[0].indexOf(`"${keyName}"`) + 1; // +1 to skip the opening quote
      const keyEnd = keyStart + keyName.length;

      const range = new vscode.Range(
        document.positionAt(keyStart),
        document.positionAt(keyEnd)
      );

      const diagnostic = new vscode.Diagnostic(
        range,
        `Key "${keyName}" not found in .resx files.`,
        vscode.DiagnosticSeverity.Warning
      );
      
      diagnostic.code = DiagnosticCodes.MissingResxKey;

      diagnostics.push(diagnostic);
    }

    this.diagnosticCollection.set(document.uri, diagnostics);
  }

  public dispose() {
    this.diagnosticCollection.dispose();
  }
}
