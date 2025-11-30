import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";
import { XMLParser } from "fast-xml-parser";

export class ResxService {
  private cache: Map<string, vscode.CompletionItem[]> = new Map();
  private watcher: vscode.FileSystemWatcher;
  private _onKeysUpdated: vscode.EventEmitter<void> = new vscode.EventEmitter<void>();
  public readonly onKeysUpdated = this._onKeysUpdated.event;

  constructor() {
    // Intitialize Watcher
    this.watcher = vscode.workspace.createFileSystemWatcher("**/*.resx");
    this.watcher.onDidChange((uri) => this.parseResxFile(uri));
    this.watcher.onDidCreate((uri) => this.parseResxFile(uri));
  }

  public loadFiles() {
    vscode.workspace.findFiles("**/*.resx").then((files) => {
      files.forEach((file) => this.parseResxFile(file));
    });
  }

  public getAllCompletionItems(): vscode.CompletionItem[] {
    const allItems: vscode.CompletionItem[] = [];
    this.cache.forEach((items) => allItems.push(...items));
    return allItems;
  }

  public getKeyExsists(keyName: string): boolean {
    let exists = false;
    this.cache.forEach((itmes) => {
      if (itmes.some((i) => i.label === keyName)) {
        exists = true;
      }
    });
    return exists;
  }

  public dispose() {
    this.watcher.dispose();
  }

  private parseResxFile(uri: vscode.Uri): void {
    const fileName = path.basename(uri.fsPath);

    // Skip localized files (e.g., .fr.resx, .es.resx, etc.)
    if (fileName.split(".").length > 2) return;

    try {
      const fileContent = fs.readFileSync(uri.fsPath, "utf8");
      const parser = new XMLParser({ ignoreAttributes: false });
      const result = parser.parse(fileContent);
      const items: vscode.CompletionItem[] = [];

      if (result.root && result.root.data) {
        const dataArray = Array.isArray(result.root.data)
          ? result.root.data
          : [result.root.data];

        dataArray.forEach((entry: any) => {
          if (entry["@_name"]) {
            const item = new vscode.CompletionItem(
              entry["@_name"],
              vscode.CompletionItemKind.Text
            );
            item.detail = fileName;
            items.push(item);
          }
        });
      }

      this.cache.set(fileName, items);
      console.log(`Loaded ${items.length} keys from ${fileName}`);

      this._onKeysUpdated.fire();
      
    } catch (error) {
      console.error(`Error parsing ${fileName}:`, error);
    }
  }


}
