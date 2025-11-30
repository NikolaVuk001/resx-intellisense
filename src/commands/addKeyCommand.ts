import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";
import { XMLParser, XMLBuilder } from "fast-xml-parser";
import { getWebviewContent } from "../ui/addKeyWebview";
import { AiService } from "../services/aiService";

export async function addKeyCommand(keyName: string) {
  if (!keyName) return;

  // 1. Get Settings
  const config = vscode.workspace.getConfiguration("resxIntellisense");
  // This is where you tell it: "Use SharedResources.resx"
  const targetFamilyFile =
    config.get<string>("defaultFile") || "Resources.resx";
  const primaryLang = config.get<string>("primaryLanguage") || "en";

  // 2. Calculate the "Family Name"
  // If target is "SharedResources.resx", the family base is "SharedResources"
  const baseName = targetFamilyFile.replace(".resx", "");

  // 3. Find ALL .resx files in the workspace
  const allFiles = await vscode.workspace.findFiles("**/*.resx");

  // 4. FILTER: Keep only files that belong to the target family
  // Logic: The file must start with "SharedResources." OR be exactly "SharedResources.resx"
  const familyFiles = allFiles.filter((uri) => {
    const fileName = path.basename(uri.fsPath);
    return fileName === targetFamilyFile || fileName.startsWith(baseName + ".");
  });

  if (familyFiles.length === 0) {
    // Fallback: If we couldn't find your specific family, warn the user
    const action = await vscode.window.showErrorMessage(
      `Could not find any files matching the family "${baseName}". Check your 'defaultFile' setting.`,
      "Open Settings"
    );
    if (action === "Open Settings") {
      vscode.commands.executeCommand(
        "workbench.action.openSettings",
        "resxIntellisense.defaultFile"
      );
    }
    return;
  }

  // 5. Prepare Data for Webview (Labeling logic)
  const fileGroups = familyFiles.map((uri) => {
    const name = path.basename(uri.fsPath);
    let label = "";

    if (name === targetFamilyFile) {
      // This is the parent (SharedResources.resx) -> Label "Default"
      label = "Default";
    } else {
      // This is a child (SharedResources.sr-Latn-RS.resx)
      // Remove the base name and extension to get the lang code
      // "SharedResources.sr-Latn-RS.resx" -> ".sr-Latn-RS." -> "sr-Latn-RS"
      const labelParts = name
        .replace(baseName, "")
        .replace(".resx", "")
        .split(".");
      // Filter out empty strings from split
      label = labelParts.filter((p) => p !== "").join("-");
    }

    return {
      path: uri.fsPath,
      label: label,
      value: "",
    };
  });

  // 6. Sort: Put Primary Language or Default first
  fileGroups.sort((a, b) => {
    // Helper to check if a label matches the primary language
    const isPrimary = (lbl: string) =>
      lbl === primaryLang || (primaryLang === "en" && lbl === "Default");

    if (isPrimary(a.label)) return -1;
    if (isPrimary(b.label)) return 1;
    return 0; // Keep original order otherwise
  });

  // 7. Check AI & Open Panel (Standard logic)
  const aiService = new AiService();
  const hasAi = await aiService.isAiAvailable();

  const panel = vscode.window.createWebviewPanel(
    "addResxKey",
    `Add Key: ${keyName} (${baseName})`, // Show user which family they are editing
    vscode.ViewColumn.Beside,
    { enableScripts: true }
  );

  panel.webview.html = getWebviewContent(keyName, fileGroups, hasAi);

  // 5. Listen for the "Save" message from the HTML
  panel.webview.onDidReceiveMessage(
    async (message) => {
      // Save Command
      if (message.command === "save") {
        await writeToFiles(keyName, message.data);
        panel.dispose();
        vscode.window.showInformationMessage(
          `Key "${keyName}" added to ${Object.keys(message.data).length} files.`
        );
      }

      // Hanlde AI Generation Request
      if (message.command === "generate-ai") {
        const { sourceText } = message;
        console.log("AI Generation requested for text:", sourceText);

        // Indetify target langauges (everything except the first one)
        const targets = fileGroups.slice(1).map((g) => g.label);
        const sourceLang = fileGroups[0].label;

        vscode.window.withProgress(
          {
            location: vscode.ProgressLocation.Notification,
            title: "Asking Copilot for translations...",
          },
          async () => {
            const translations = await aiService.getTranslations(
              keyName,
              sourceLang,
              sourceText,
              targets
            );

            // Send results back to Webiew
            panel.webview.postMessage({
              command: "fill-translations",
              data: translations,
            });
          }
        );
      }
    },
    undefined,
    []
  );
}

// Helper: The writing to files logic (Handles the loop)
function writeToFiles(keyName: string, data: { [filePath: string]: string }) {
  for (const [filePath, value] of Object.entries(data)) {
    try {
      const fileContent = fs.readFileSync(filePath, "utf8");
      const parser = new XMLParser({
        ignoreAttributes: false,
        preserveOrder: true,
      });
      const parsedData = parser.parse(fileContent);

      // Create new entry
      const newEntry = {
        data: [{ value: [{ "#text": value }] }],
        ":@": { "@_name": keyName, "@_xml:space": "preserve" },
      };

      // Append to root
      let rootFound = false;
      for (const node of parsedData) {
        if (node.root) {
          node.root.push(newEntry);
          rootFound = true;
          break;
        }
      }

      if (rootFound) {
        const builder = new XMLBuilder({
          ignoreAttributes: false,
          format: true,
          preserveOrder: true,
        });
        const newXml = builder.build(parsedData);
        fs.writeFileSync(filePath, newXml);
      }
    } catch (error) {
      vscode.window.showErrorMessage(`Failed to read file: ${filePath}`);
    }
  }
}
