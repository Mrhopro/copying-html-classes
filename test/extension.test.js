const assert = require('assert');
const vscode = require('vscode');

suite('Extract SCSS Extension Tests', () => {
  test('command runs and copies SCSS for simple HTML', async () => {
    // Відкриваємо новий тимчасовий документ з HTML
    const doc = await vscode.workspace.openTextDocument({ 
      language: 'html', 
      content: `<div class="foo"><span class="bar"></span></div>` 
    });
    await vscode.window.showTextDocument(doc);

    // Викликаємо нашу команду
    await vscode.commands.executeCommand('extension.extractScss');

    // Читаємо з буфера обміну
    const scss = await vscode.env.clipboard.readText();

    // Перевіряємо, що отримали очікуваний SCSS
    const expected = `.foo {\n  .bar {\n  }\n}\n`;
    assert.strictEqual(scss, expected);
  });
});
