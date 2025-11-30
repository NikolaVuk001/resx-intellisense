import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";
import { XMLParser, XMLBuilder } from "fast-xml-parser";
import { getWebviewContent } from "../ui/addKeyWebview";
import { AiService } from "../services/aiService";
import { isDataView } from "util/types";


// Command to add or edit a key in the resx files
export async function addKeyCommand(keyName: string) {
  if (!keyName) return;


  const config = vscode.workspace.getConfiguration("resxIntellisense");
  const targetFamilyFile = config.get<string>("defaultFile") || "Resources.resx";
  const primaryLang = config.get<string>("primaryLanguage") || "en";
  const baseName = targetFamilyFile.replace(".resx", "");
  const excludedLangs = config.get<string[]>("excludedLanguages") || [];

  const allFiles = await vscode.workspace.findFiles("**/*.resx");

  const familyFiles = allFiles.filter((uri) => {
    const fileName = path.basename(uri.fsPath);
    return fileName === targetFamilyFile || fileName.startsWith(baseName + ".");
  });

  if (familyFiles.length === 0) {
    const action = await vscode.window.showErrorMessage(
      `Could not find any files matching the family "${baseName}".`,
      "Open Settings"
    );
    if (action === "Open Settings") {
      vscode.commands.executeCommand("workbench.action.openSettings", "resxIntellisense.defaultFile");
    }
    return;
  }
  
  let fileGroups = familyFiles.map((uri) => {
    const name = path.basename(uri.fsPath);
    let label = "";

    if (name === targetFamilyFile) {
      label = "Default";
    } else {
      const labelParts = name.replace(baseName, "").replace(".resx", "").split(".");
      label = labelParts.filter((p) => p !== "").join("-");
    }

    let currentValue = "";
    try {
      const content = fs.readFileSync(uri.fsPath, "utf8");      
      const parser = new XMLParser({ ignoreAttributes: false });
      const result = parser.parse(content);

      if (result.root && result.root.data) {
        const dataArray = Array.isArray(result.root.data) ? result.root.data : [result.root.data];
        const entry = dataArray.find((d: any) => d['@_name'] === keyName);
        if (entry && entry.value) {
          currentValue = entry.value;
        }
      }
    } catch (e) {
      console.error(`Error reading ${name}:`, e);
    }

    return { path: uri.fsPath, label: label, value: currentValue, isDisabled: excludedLangs.includes(label) };
  });

  console.log("File Groups before filtering:", fileGroups);

  // EXPERIMENTAL: If we want to exclude some languages
  // fileGroups = fileGroups.filter(group => !excludedLangs.includes(group.label));

  fileGroups.sort((a, b) => {
    const isPrimary = (lbl: string) => lbl === primaryLang || (primaryLang === "en" && lbl === "Default");
    if (isPrimary(a.label)) return -1;
    if (isPrimary(b.label)) return 1;
    return 0;
  });
  
  // AI SERVICE CHECK
  const aiService = new AiService();
  const hasAi = await aiService.isAiAvailable();


  // Opening the webview panel
  const panel = vscode.window.createWebviewPanel(
    "editResxKey",
    `Edit Key: ${keyName}`,
    vscode.ViewColumn.Beside,
    { enableScripts: true }
  );

  panel.webview.html = getWebviewContent(keyName, fileGroups, hasAi);

  panel.webview.onDidReceiveMessage(async (message) => {
      if (message.command === "save") {
        await writeToFiles(keyName, message.data);
        panel.dispose();
        vscode.window.showInformationMessage(`Saved "${keyName}"!`);
      }

      if (message.command === "generate-ai") {
        const targets = fileGroups.slice(1).filter(g => !g.isDisabled).map((g) => g.label);
        const sourceLang = fileGroups[0].label;
        vscode.window.withProgress(
          { location: vscode.ProgressLocation.Notification, title: "Asking AI..." },
          async () => {
            const translations = await aiService.getTranslations(keyName, sourceLang, message.sourceText, targets);
            panel.webview.postMessage({ command: "fill-translations", data: translations });
          }
        );
      }
    },
    undefined,
    []
  );
}

// ---------------------------------------------------------
// WRITE LOGIC
// ---------------------------------------------------------
function writeToFiles(keyName: string, data: { [filePath: string]: string }) {
  for (const [filePath, value] of Object.entries(data)) {
    try {
      const fileContent = fs.readFileSync(filePath, "utf8");
      
      // PRESERVE ORDER IS CRITICAL FOR WRITING
      const parser = new XMLParser({ ignoreAttributes: false, preserveOrder: true });
      const parsedData = parser.parse(fileContent);

      // Create the new entry structure
      const newEntry = {
        data: [{ value: [{ "#text": value }] }],
        ":@": { "@_name": keyName, "@_xml:space": "preserve" },
      };

      let rootFound = false;
      let keyUpdated = false;

      // Iterate through the nodes to find <root>
      for (const node of parsedData) {
        if (node.root) {
          rootFound = true;
          
          // Check if key already exists in the children of <root>
          // node.root is an array of children objects
          for (let i = 0; i < node.root.length; i++) {
            const child = node.root[i];
            
            // Check if this child is a <data> tag with name === keyName
            if (child.data && child[':@'] && child[':@']['@_name'] === keyName) {
                // UPDATE EXISTING KEY
                // We replace the contents of this <data> tag with our new value structure
                child.data = [{ value: [{ "#text": value }] }];
                keyUpdated = true;
                break;
            }
          }

          // IF KEY WAS NOT FOUND, APPEND IT
          if (!keyUpdated) {
            node.root.push(newEntry);
          }
          break;
        }
      }

      if (rootFound) {
        const builder = new XMLBuilder({ ignoreAttributes: false, format: true, preserveOrder: true });
        const newXml = builder.build(parsedData);
        fs.writeFileSync(filePath, newXml);
      }
    } catch (error) {
      vscode.window.showErrorMessage(`Failed to write file: ${filePath}`);
    }
  }
}