# Inteli-Resx

A VS Code extension for managing `.resx` localization files directly from C# and Razor code. 

It provides IntelliSense for `IStringLocalizer`, detects missing keys, and includes a UI for adding or editing translations across multiple resource files simultaneously.

## Features

### 1. IntelliSense & Autocomplete
Auto-completes key names when using `IStringLocalizer`, `StringLocalizer`, or `.GetString()`.
* Triggers on `"` or `[` inside `.cs` and `.razor` files.
* Reads keys from your configured default `.resx` file.

### 2. Missing Key Detection
* Scans your code for keys that do not exist in the resource file.
* Marks missing keys with a **warning squiggle**.

### 3. Add & Edit Keys (Quick Fix)
Use `Ctrl + .` (Quick Fix) on any key string:
* **Add Key:** If the key is missing, opens a form to add it to your resource files.
* **Edit Key:** If the key exists, opens the form to update existing translations.

### 4. Resource Families & Grouping
The extension groups related files automatically.
* *Example:* If your target is `SharedResources.resx`, it automatically finds `SharedResources.fr.resx`, `SharedResources.es.resx`, etc.
* The "Add/Edit" form displays input fields for all found files in the family so you can translate everything in one go.

### 5. AI Translation Helper
* If you have **GitHub Copilot** (or a compatible Chat Model) installed, an **"AI Fill"** button appears in the form.
* It takes your primary language input and generates translations for the other fields automatically.

---

## Configuration

Add these settings to your `.vscode/settings.json`:

| Setting | Default | Description |
| :--- | :--- | :--- |
| `resxIntellisense.defaultFile` | `Resources.resx` | The main resource file to target. The extension will automatically find localized variants (e.g., setting `Shared.resx` will also find `Shared.fr.resx`). |
| `resxIntellisense.primaryLanguage` | `en` | The language code to sort to the top of the Add/Edit form (e.g., `en` or `sr-Latn-RS`). |
| `resxIntellisense.excludedLanguages` | `[]` | List of language codes to hide from the form (e.g., `["sqAL"]`). |
| `resxIntellisense.singleFileMode` | `false` | If `true`, ignores localized files and only writes to the exact `defaultFile`. Disables AI features. |

### Recommended Settings for Razor
VS Code disables string suggestions in Razor by default. To make the IntelliSense pop up automatically inside quotes, add this:

```json
"[razor]": {
    "editor.quickSuggestions": {
        "strings": true
    }
}