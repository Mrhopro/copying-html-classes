const vscode = require('vscode');
const cheerio = require('cheerio');
const parser = require('@babel/parser');
const traverse = require('@babel/traverse').default;

/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {
  const disposable = vscode.commands.registerCommand('extension.extractScss', async () => {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      vscode.window.showErrorMessage('Відкрий файл, будь ласка.');
      return;
    }

    const text = editor.document.getText();
    const lang = editor.document.languageId;
	// Перевірка на якій мові написано
	
    let scss = '';
	// sccs класи

    // HTML: рекурсивний парсинг через cheerio з вкладеністю
    if (lang === 'html')  { //просто if
      const $ = cheerio.load(text); // $ - це cheerio отримання тексту для скорочення коду (зручно!)
      function processElement(el, level = 0) { // el = елемент, level = рівень вкладеності
        let result = ''; // результат
        const indent = '  '.repeat(level); // відступ
        const classAttr = $(el).attr('class'); // отримання класу
        if (classAttr) { // якщо клас є то обробляємо його 
          const names = classAttr.split(/\s+/); // розбиваємо клас на масив (/\s+/ - регулярний вираз для пробілів (один або більше пробілів) (виглядає я просто набір символів))
          names.forEach(name => { // перебираємо класи
            result += `${indent}.${name} {\n`; // додаємо клас до результату
            $(el).children().each((_, child) => { // перебираємо дітей елемента (???????????)
              result += processElement(child, level + 1); // рекурсивно обробляємо дітей(????????????????)
            });
            result += `${indent}}\n`; // закриваємо клас
          }); 
        } else  { // якщо класу немає то просто обробляємо дітей(???????????)
          $(el).children().each((_, child) => { // перебираємо дітей елемента _ - це індекс, child - це сам елемент
            result += processElement(child, level); // рекурсивна обробка 
          });
        }
        return result; // повертаємо результат
      }
      const root = $('body').length ? $('body').get(0) : $.root().get(0); // отримуємо кореневий елемент (якщо є body то беремо його, якщо ні то беремо кореневий елемент)
      scss = processElement(root); // обробляємо кореневий елемент
    }

    // React/JSX: парсинг через Babel з вкладеністю
    if (lang.startsWith('javascript') || lang.startsWith('typescript')) { // якщо мова javascript або typescript
      let ast; // AST - абстрактне синтаксичне дерево
      try { // намагаємось зпарсити текст
		// Перевіряємо чи є JSX у файлі
        ast = parser.parse(text, {
          sourceType: 'module',
          plugins: ['jsx', 'classProperties', 'typescript']
        });
      } catch (e) { // якщо не вдалось зпарсити то показуємо помилку (e - це помилка)
        vscode.window.showErrorMessage('Помилка парсингу JSX: ' + e.message);
        return;
      }
      // Рекурсивна обробка JSX-елемента
      function processJSX(node, level = 0) { // node - це елемент, level - це рівень вкладеності
        let result = ''; // результат
        const indent = '  '.repeat(level); // відступ
        // Знаходимо класи у attributes
        const opening = node.openingElement; // openingElement - це відкриваючий тег
        const classAttr = opening.attributes.find(attr => attr.name && (attr.name.name === 'className' || attr.name.name === 'class')); // знаходимо клас у атрибутах (className або class)
        let classNames = []; // масив класів
        if (classAttr && classAttr.value) { // якщо клас є і у нього є значення
          const val = classAttr.value; // значення класу
          if (val.type === 'StringLiteral') { // якщо значення - це рядок
            classNames = val.value.split(/\s+/); // розбиваємо рядок на масив класів
          } else if (val.type === 'JSXExpressionContainer') { // якщо значення - це контейнер виразу (контейнер виразу - це коли клас передається через {})
            const expr = val.expression; // отримуємо вираз
            if (expr.type === 'StringLiteral') { // якщо вираз - це рядок
              classNames = expr.value.split(/\s+/); // розбиваємо рядок на масив класів
            } else if (expr.type === 'TemplateLiteral') { // якщо вираз - це шаблонний рядок
              expr.quasis.forEach(q => q.value.raw.split(/\s+/).forEach(c => c && classNames.push(c))); // перебираємо шаблонні рядки і розбиваємо їх на масив класів
            }
          }
        }
        if (classNames.length) { // якщо масив класів не пустий то
          classNames.forEach(name => { // перебираємо класи
            result += `${indent}.${name} {\n`; // додаємо клас до результату
            // Діти JSX
            node.children.forEach(child => { // перебираємо дітей
              if (child.type === 'JSXElement') { // якщо дитина - це JSX елемент
                result += processJSX(child, level + 1); // рекурсивно обробляємо його
              }
            });
            result += `${indent}}\n`; // закриваємо клас
          });
        } else { // якщо класів немає то просто перебираємо дітей
          node.children.forEach(child => { // перебираємо дітей
            if (child.type === 'JSXElement') { // якщо дитина - це JSX елемент
              result += processJSX(child, level); // рекурсивно обробляємо його
            }
          });
        }
        return result; // повертаємо результат
      }
      // Збираємо лише корневі JSX елементи
      traverse(ast, { //ast - це абстрактне синтаксичне дерево
        JSXElement(path) { // якщо елемент - це JSX елемент
          if (!path.parentPath.isJSXElement()) { // якщо батько не JSX елемент
            scss += processJSX(path.node, 0); // обробляємо його 
          }
        }
      });
    }

    if (!scss.trim()) { // якщо результат пустий
      vscode.window.showInformationMessage('Класи не знайдені.'); // показуємо повідомлення
      return; // виходимо з функції
    }

    await vscode.env.clipboard.writeText(scss.trim()); // копіюємо результат в буфер обміну
    const count = (scss.match(/^\s*\./gm) || []).length; // рахуємо кількість класів
    vscode.window.showInformationMessage(`Згенеровано ${count} вкладених SCSS-блоків і скопійовано в буфер обміну.`); // показуємо повідомлення
  });

  context.subscriptions.push(disposable); // реєструємо команду
}

function deactivate() {} // функція деактивації (Я її не використовую)

module.exports = { activate, deactivate };
