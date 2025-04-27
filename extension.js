const vscode = require('vscode');
const cheerio = require('cheerio');
const parser = require('@babel/parser');
const traverse = require('@babel/traverse').default;

// polyfill Web Streams для Extension Host
const { ReadableStream, WritableStream } = require('stream/web');
if (typeof global.ReadableStream === 'undefined') global.ReadableStream = ReadableStream;
if (typeof global.WritableStream === 'undefined') global.WritableStream = WritableStream;

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

    // ── HTML ──────────────────────────────────────────────────────────────────────
    if (lang === 'html') {
      const $ = cheerio.load(text);
      function processElement(el, level = 0) {
        let result = '';
        const indent = '  '.repeat(level);
        const classAttr = $(el).attr('class');
        const idAttr    = $(el).attr('id');
        const tag       = el.tagName;

        let names = [];
        if (classAttr) {
          names = classAttr.split(/\s+/).map(c => `.${c}`);
        } else if (idAttr) {
          names = [`#${idAttr}`];
        } else {
          names = [tag];
        }

        names.forEach(name => {
          result += `${indent}${name} {\n`;
          $(el).children().each((_, child) => {
            result += processElement(child, level + 1);
          });
          result += `${indent}}\n`;
        });
        return result;
      }

      // ітеруємось по дітях body/root, щоб не було блоку body {…}
      const root = $('body').length ? $('body') : $.root();
      root.children().each((_, child) => {
        scss += processElement(child, 0);
      });
    }

    // ── JSX/React ─────────────────────────────────────────────────────────────────
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

        // отримати className / id / тег
        const opening = node.openingElement;
        const attrs = opening.attributes || [];
        const clsNode = attrs.find(a => a.name && (a.name.name === 'className' || a.name.name === 'class'));
        const idNode  = attrs.find(a => a.name && a.name.name === 'id');
        const tag     = opening.name.name;

        let classNames = [];
        if (clsNode && clsNode.value) {
          const v = clsNode.value;
          if (v.type === 'StringLiteral') classNames = v.value.split(/\s+/);
          else if (v.type === 'JSXExpressionContainer') {
            const e = v.expression;
            if (e.type === 'StringLiteral') classNames = e.value.split(/\s+/);
            else if (e.type === 'TemplateLiteral') {
              e.quasis.forEach(q => q.value.raw.split(/\s+/).forEach(c => c && classNames.push(c)));
            }
          }
        }

        let names;
        if (classNames.length) {
          names = classNames.map(c => `.${c}`);
        } else if (idNode && idNode.value && idNode.value.type === 'StringLiteral') {
          names = [`#${idNode.value.value}`];
        } else {
          names = [tag];
        }

        // обробка будь-якого child (JSXElement або ExpressionContainer з map/масивом)
        function handleChild(child, lvl) {
          if (child.type === 'JSXElement') {
            return processJSX(child, lvl);
          }
          if (child.type === 'JSXExpressionContainer') {
            const e = child.expression;
            if (e.type === 'JSXElement') {
              return processJSX(e, lvl);
            }
            // масив literal-елементів
            if (e.type === 'ArrayExpression') {
              return e.elements.map(el => el && el.type === 'JSXElement' ? processJSX(el, lvl) : '').join('');
            }
            // .map(...)
            if (e.type === 'CallExpression' && e.callee.property?.name === 'map') {
              const fn = e.arguments[0];
              if (fn.body) {
                if (fn.body.type === 'JSXElement') return processJSX(fn.body, lvl);
                if (fn.body.type === 'BlockStatement') {
                  return fn.body.body
                    .filter(st => st.type === 'ReturnStatement' && st.argument?.type === 'JSXElement')
                    .map(st => processJSX(st.argument, lvl))
                    .join('');
                }
              }
            }
          }
          return '';
        }

        names.forEach(name => {
          result += `${indent}${name} {\n`;
          node.children.forEach(c => {
            result += handleChild(c, level + 1);
          });
          result += `${indent}}\n`;
        });
        return result;
      }

      traverse(ast, {
        JSXElement(path) {
          const p = path.parentPath;
          // тільки якщо батько – Program, ExpressionStatement або ReturnStatement
          if (
            p.isProgram() ||
            p.isExpressionStatement() ||
            p.isReturnStatement()
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
    const count = (scss.match(/^\s*(\.|#|\w)/gm) || []).length;
    vscode.window.showInformationMessage(
      getText(
        `Згенеровано ${count} SCSS-блоків і скопійовано в буфер обміну.`,
        `Generated ${count} SCSS blocks and copied to clipboard.`
      )
    );
  });

  context.subscriptions.push(disposable);

  const statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left);
  statusBarItem.text = '$(code) SCSS Extract';
  statusBarItem.tooltip = getText('Згенерувати SCSS з HTML/JSX', 'Generate SCSS from HTML/JSX');
  statusBarItem.command = 'extension.extractScss';
  statusBarItem.show();
  context.subscriptions.push(statusBarItem);
}

function getText(ua, en) {
  return vscode.env.language.startsWith('uk') ? ua : en;
}

function deactivate() {}

module.exports = { activate, deactivate };
