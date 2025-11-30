import * as vscode from "vscode";

export class AiService {  
  public async isAiAvailable(): Promise<boolean> {    
    const models = await vscode.lm.selectChatModels({ family: "gpt-4" });
    return models.length > 0;
  }

  public async getTranslations(
    keyName: string,
    sourceLang: string,
    sourceText: string,
    targetLangs: string[]
  ): Promise<{ [lang: string]: string }> {    
    const models = await vscode.lm.selectChatModels({ family: "gpt-4" });
    console.log("Available models for translation:", models);
    if (models.length === 0) return {};

    const model = models[0];
    
    const prompt = `
        You are a localization expert.
        Key: ${keyName}
        Source Language: ${sourceLang}
        Source Text: ${sourceText}
        

        Translate this into the following languages: ${targetLangs.join(", ")}.


        Return ONLY a JSON object where the key is ethe language code and the value is the translation.
        Example: { "fr": "Bonjour", "es", "Hola" }    
    `;

    const messages = [vscode.LanguageModelChatMessage.User(prompt)];

    try {
      const cancellation = new vscode.CancellationTokenSource();
      const response = await model.sendRequest(
        messages,
        {},
        cancellation.token
      );

      // 4. Read the stream
      let fullText = "";
      for await (const framgent of response.text) {
        fullText += framgent;
      }      

      const cleanJson = fullText.replace(/```json|```/g, "").trim();
      return JSON.parse(cleanJson);
    } catch (err) {
      console.error("Error getting translations from AI:", err);
      return {};
    }
  }
}
