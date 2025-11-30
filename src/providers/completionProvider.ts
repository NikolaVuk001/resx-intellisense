import * as vscode from 'vscode';
import { ResxService } from '../services/resxService';


export class ResxCompletionProvider implements vscode.CompletionItemProvider {
    constructor(private resxService: ResxService) {}

    provideCompletionItems(docuemnt: vscode.TextDocument, postion: vscode.Position) {
        const linePrefix = docuemnt.lineAt(postion).text.substring(0, postion.character);

        // REGEX: MATCHES @Localizer["... OR _localizer["...
        if (!linePrefix.match(/(Localizer|StringLocalizer|GetString)\s*\[\s*"?$/i)) {
            return undefined;
        }
        return this.resxService.getAllCompletionItems();
    }
}