import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";
import { XMLParser, XMLBuilder } from "fast-xml-parser";
import { getWebviewContent } from "../ui/addKeyWebview";

export async function addKeyCommand(keyName: string) {
  if (!keyName) return;

  // 1. Find the "Family" of resx files
  // Startegy: Look for the default file configured in settings, or fallback to searching.
  const config = vscode.workspace.getConfiguration("resxIntellisense");
  const defaultFileName = config.get<string>("defaultFile") || "Resources.resx";
  const baseName = defaultFileName.replace(".resx", "");

  const allFiles = await vscode.workspace.findFiles("**/*.resx");

  // Filter: Get all files that start witht the base name (e.g. Resources.fr.resx, Resources.es.resx)
  // Note: You might want to make this selection smarter or ask the user to pick a "Family" if multiple exsit.
  const familyFiles = allFiles.filter((f) =>
    path.basename(f.fsPath).startsWith(baseName)
  );

  if (familyFiles.length === 0) {
    vscode.window.showErrorMessage(
      `No files matching pattern ${baseName}*.resx found.`
    );
  }

  // 2. Prepare data for WebView
  const fileGroups = familyFiles.map((uri) => {
    const name = path.basename(uri.fsPath);
    // Label logic: "Resources.fr.resx" -> "fr", "Resources.resx" -> "default"
    const parts = name.split(".");
    const label = parts.length === 2 ? "Default" : parts[1].toUpperCase();

    return { path: uri.fsPath, label: label, value: "" };
  });

  // Sort so Default is first
  fileGroups.sort((a, b) => (a.label === "Default" ? -1 : 1));

  // 3. Create Webview Panel
  const panel = vscode.window.createWebviewPanel(
    "addResxKey",
    `Add Key: ${keyName}`,
    vscode.ViewColumn.Beside, // Open on the side
    { enableScripts: true }
  );

  panel.webview.html = getWebviewContent(keyName, fileGroups);

  // 4. Listen for the "Save" message from the HTML
  panel.webview.onDidReceiveMessage(
    async (message) => {
      if (message.command === "save") {
        await writeToFiles(keyName, message.data);
        panel.dispose();
        vscode.window.showInformationMessage(
          `Key "${keyName}" added to ${Object.keys(message.data).length} files.`
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
