const vscode = require('vscode');
const cheerio = require('cheerio');
const parser = require('@babel/parser');
const traverse = require('@babel/traverse').default;

// Polyfill for ReadableStream and WritableStream
const { ReadableStream, WritableStream } = require('stream/web');
if (typeof global.ReadableStream === 'undefined') global.ReadableStream = ReadableStream;
if (typeof global.WritableStream === 'undefined') global.WritableStream = WritableStream;

/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {
  // Реєструємо команду для генерації SCSS
  const disposable = vscode.commands.registerCommand('extension.extractScss', async () => {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      const msg = getText('Відкрий файл, будь ласка.', 'Please open a file.');
      vscode.window.showErrorMessage(msg);
      return;
    }

    const text = editor.document.getText();
    const lang = editor.document.languageId;
    let scss = '';

    // HTML: рекурсивний парсинг через cheerio з вкладеністю
    if (lang === 'html') { // якщо це HTML-файл
      const $ = cheerio.load(text);
      function processElement(el, level = 0) { // el = елемент, level = рівень вкладеності
        let result = ''; // результат
        const indent = '  '.repeat(level); // відступ
        const classAttr = $(el).attr('class'); // отримання класу
        if (classAttr) { // якщо є клас
          const names = classAttr.split(/\s+/); // розбиваємо на окремі класи
          names.forEach(name => { // обробляємо кожен клас
            result += `${indent}.${name} {\n`;
            $(el).children().each((_, child) => { // обробляємо дітей
              result += processElement(child, level + 1);
            });
            result += `${indent}}\n`; // закриваємо блок
          });
        } else { // якщо класів нема
          $(el).children().each((_, child) => {
            result += processElement(child, level);
          });
        }
        return result; // повертаємо згенерований текст
      }
      const root = $('body').length ? $('body').get(0) : $.root().get(0); // отримуємо кореневий елемент
      scss = processElement(root); // генеруємо SCSS
    }

    // React/JSX: парсинг через Babel з вкладеністю
    if (lang.startsWith('javascript') || lang.startsWith('typescript')) { // якщо JS/TS файл
      let ast;
      try {
        ast = parser.parse(text, { sourceType: 'module', plugins: ['jsx', 'classProperties', 'typescript'] });
      } catch (e) { // помилка парсингу JSX
        const msg = getText('Помилка парсингу JSX: ', 'JSX parsing error: ') + e.message;
        vscode.window.showErrorMessage(msg);
        return;
      }
      function processJSX(node, level = 0) { // обробка JSX-елемента
        let result = '';
        const indent = '  '.repeat(level);
        const opening = node.openingElement;
        const classAttr = opening.attributes.find(attr => attr.name && (attr.name.name === 'className' || attr.name.name === 'class'));
        let classNames = [];
        if (classAttr && classAttr.value) {
          const val = classAttr.value;
          if (val.type === 'StringLiteral') { // статичний рядок
            classNames = val.value.split(/\s+/);
          } else if (val.type === 'JSXExpressionContainer') { // експресія
            const expr = val.expression;
            if (expr.type === 'StringLiteral') classNames = expr.value.split(/\s+/);
            else if (expr.type === 'TemplateLiteral') expr.quasis.forEach(q => q.value.raw.split(/\s+/).forEach(c => c && classNames.push(c)));
          }
        }
        if (classNames.length) { // якщо є класи
          classNames.forEach(name => {
            result += `${indent}.${name} {\n`;
            node.children.forEach(child => { if (child.type === 'JSXElement') result += processJSX(child, level + 1); });
            result += `${indent}}\n`;
          });
        } else { // якщо немає класів
          node.children.forEach(child => { if (child.type === 'JSXElement') result += processJSX(child, level); });
        }
        return result; // повертаємо результат
      }
      traverse(ast, { JSXElement(path) { if (!path.parentPath.isJSXElement()) scss += processJSX(path.node, 0); } });
    }

    if (!scss.trim()) { // якщо результат порожній
      const msg = getText('Класи не знайдені.', 'No classes found.');
      vscode.window.showInformationMessage(msg);
      return;
    }

    // Копіюємо SCSS в буфер обміну
    await vscode.env.clipboard.writeText(scss.trim());
    const count = (scss.match(/^\s*\./gm) || []).length;
    const msg = getText(
      `Згенеровано ${count} SCSS-блоків і скопійовано в буфер обміну.`,  
      `Generated ${count} SCSS blocks and copied to clipboard.`
    );
    vscode.window.showInformationMessage(msg);
  });

  context.subscriptions.push(disposable); // реєструємо команду

  // Додаємо кнопку в статус-барі
  const statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left);
  statusBarItem.text = '$(code) SCSS Extract'; // текст та іконка
  statusBarItem.tooltip = getText('Згенерувати SCSS з HTML/JSX', 'Generate SCSS from HTML/JSX'); // підказка
  statusBarItem.command = 'extension.extractScss'; // команда
  statusBarItem.show(); // показуємо кнопку
  context.subscriptions.push(statusBarItem); // додаємо до підписок
}

/**
 * Локалізація повідомлень: ua та en
 */
function getText(ua, en) {
  const lang = vscode.env.language.toLowerCase();
  return lang.startsWith('uk') ? ua : en;
}

function deactivate() {} // функція деактивації

module.exports = { activate, deactivate };
