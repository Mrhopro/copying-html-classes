const vscode = require('vscode');
const cheerio = require('cheerio');
const parser = require('@babel/parser');
const traverse = require('@babel/traverse').default;

const { ReadableStream, WritableStream } = require('stream/web');
if (typeof global.ReadableStream === 'undefined') {
  global.ReadableStream = ReadableStream;
}
if (typeof global.WritableStream === 'undefined') {
  global.WritableStream = WritableStream;
}

/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {
  const disposable = vscode.commands.registerCommand('extension.extractScss', async () => {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      vscode.window.showErrorMessage(getText('Відкрий файл, будь ласка.', 'Please open a file.'));
      return;
    }

    const text = editor.document.getText();
    const lang = editor.document.languageId;
    let scss = '';

    // HTML-парсинг через cheerio
    if (lang === 'html') {
      const $ = cheerio.load(text);
      function processElement(el, level = 0) {
        let result = '';
        const indent = '  '.repeat(level);
        const classAttr = $(el).attr('class');
        if (classAttr) {
          const names = classAttr.split(/\s+/);
          names.forEach(name => {
            result += `${indent}.${name} {\n`;
            $(el).children().each((_, child) => {
              result += processElement(child, level + 1);
            });
            result += `${indent}}\n`;
          });
        } else {
          $(el).children().each((_, child) => {
            result += processElement(child, level);
          });
        }
        return result;
      }
      const root = $('body').length ? $('body').get(0) : $.root().get(0);
      scss = processElement(root);
    }

    // JSX/React-парсинг через Babel
    if (lang.startsWith('javascript') || lang.startsWith('typescript')) {
      let ast;
      try {
        ast = parser.parse(text, {
          sourceType: 'module',
          plugins: ['jsx', 'classProperties', 'typescript']
        });
      } catch (e) {
        vscode.window.showErrorMessage(getText('Помилка парсингу JSX: ', 'JSX parsing error: ') + e.message);
        return;
      }

      function processJSX(node, level = 0) {
        let result = '';
        const indent = '  '.repeat(level);

        // дістати className/class
        const opening = node.openingElement;
        const classAttr = opening.attributes.find(a =>
          a.name && (a.name.name === 'className' || a.name.name === 'class')
        );
        let classNames = [];
        if (classAttr && classAttr.value) {
          const val = classAttr.value;
          if (val.type === 'StringLiteral') {
            classNames = val.value.split(/\s+/);
          } else if (val.type === 'JSXExpressionContainer') {
            const expr = val.expression;
            if (expr.type === 'StringLiteral') {
              classNames = expr.value.split(/\s+/);
            } else if (expr.type === 'TemplateLiteral') {
              expr.quasis.forEach(q =>
                q.value.raw.split(/\s+/).forEach(c => c && classNames.push(c))
              );
            }
          }
        }

        // обробка будь-якого child (JSXElement або вираз)
        function handleChild(child, lvl) {
          if (child.type === 'JSXElement') {
            return processJSX(child, lvl);
          }
          if (child.type === 'JSXExpressionContainer') {
            const expr = child.expression;
            if (expr.type === 'JSXElement') {
              return processJSX(expr, lvl);
            }
            if (expr.type === 'ArrayExpression' || expr.type === 'CallExpression') {
              // якщо map() або масив
              const nodes = [];
              if (expr.type === 'ArrayExpression') {
                nodes.push(...expr.elements);
              } else if (expr.callee?.property?.name === 'map') {
                const fn = expr.arguments[0];
                if (fn.body) {
                  if (fn.body.type === 'JSXElement') {
                    nodes.push(fn.body);
                  } else if (fn.body.type === 'BlockStatement') {
                    fn.body.body.forEach(st => {
                      if (st.type === 'ReturnStatement' && st.argument?.type === 'JSXElement') {
                        nodes.push(st.argument);
                      }
                    });
                  }
                }
              }
              return nodes.map(n => n ? processJSX(n, lvl) : '').join('');
            }
          }
          return '';
        }

        if (classNames.length) {
          classNames.forEach(name => {
            result += `${indent}.${name} {\n`;
            node.children.forEach(c => {
              result += handleChild(c, level + 1);
            });
            result += `${indent}}\n`;
          });
        } else {
          node.children.forEach(c => {
            result += handleChild(c, level);
          });
        }

        return result;
      }

      // Тепер обробляємо лише ті JSXElement, які мають батька типу Program або ReturnStatement,
      // але не ті, що всередині JSXExpressionContainer чи інших JSXElement
      traverse(ast, {
        JSXElement(path) {
          const parent = path.parentPath;
          if (
            parent.isProgram() ||
            parent.isExpressionStatement() ||
            parent.isReturnStatement()
          ) {
            scss += processJSX(path.node, 0);
          }
        }
      });
    }

    if (!scss.trim()) {
      vscode.window.showInformationMessage(getText('Класи не знайдені.', 'No classes found.'));
      return;
    }

    await vscode.env.clipboard.writeText(scss.trim());
    const count = (scss.match(/^\s*\./gm) || []).length;
    vscode.window.showInformationMessage(
      getText(
        `Згенеровано ${count} SCSS-блоків і скопійовано в буфер обміну.`,
        `Generated ${count} SCSS blocks and copied to clipboard.`
      )
    );
  });

  context.subscriptions.push(disposable);

  // кнопка в статус-барі
  const statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left);
  statusBarItem.text = '$(code) SCSS Extract';
  statusBarItem.tooltip = getText('Згенерувати SCSS з HTML/JSX', 'Generate SCSS from HTML/JSX');
  statusBarItem.command = 'extension.extractScss';
  statusBarItem.show();
  context.subscriptions.push(statusBarItem);
}

function getText(ua, en) {
  const locale = vscode.env.language;
  return locale.startsWith('uk') ? ua : en;
}

function deactivate() {} // функція деактивації (не використовується)

module.exports = { activate, deactivate };
