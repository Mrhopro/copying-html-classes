const vscode = require('vscode');
const cheerio = require('cheerio');
const parser = require('@babel/parser');
const traverse = require('@babel/traverse').default;
const path = require('path'); // Import path module for file saving

/**
 * Provides localized text based on VS Code's language setting.
 * @param {string} ua Ukrainian text.
 * @param {string} en English text.
 * @returns {string} The localized text.
 */
function getText(ua, en) {
    return vscode.env.language.startsWith('uk') ? ua : en;
}

/**
 * Extracts potential class names from a JSX expression.
 * Handles StringLiteral, TemplateLiteral, ConditionalExpression, and LogicalExpression (&&).
 * @param {object} expression - The Babel AST node for the expression.
 * @returns {string[]} An array of potential class name strings.
 */
function extractClassesFromJSXExpression(expression) {
    const classes = new Set();

    if (!expression) {
        return Array.from(classes);
    }

    switch (expression.type) {
        case 'StringLiteral':
            expression.value.split(/\s+/).forEach(c => c && classes.add(c));
            break;
        case 'TemplateLiteral':
            expression.quasis.forEach(q => q.value.raw.split(/\s+/).forEach(c => c && classes.add(c)));
            // Option: Also try to extract from dynamic parts (expressions) in template literals
            // expression.expressions.forEach(exp => extractClassesFromJSXExpression(exp).forEach(c => classes.add(c)));
            break;
        case 'ConditionalExpression':
            // Handle test ? consequent : alternate
            extractClassesFromJSXExpression(expression.consequent).forEach(c => classes.add(c));
            extractClassesFromJSXExpression(expression.alternate).forEach(c => classes.add(c));
            break;
        case 'LogicalExpression':
            // Handle left && right (only the right side contributes classes if left is truthy)
            if (expression.operator === '&&') {
                extractClassesFromJSXExpression(expression.right).forEach(c => classes.add(c));
            }
            // Could potentially handle || or ??, but && is most common for conditional classes
            break;
        case 'JSXExpressionContainer':
            // If somehow a JSXExpressionContainer is nested
            extractClassesFromJSXExpression(expression.expression).forEach(c => classes.add(c));
            break;
        case 'ArrayExpression':
             expression.elements.forEach(element => {
                 // Handle elements like 'class1', condition && 'class2', etc.
                 extractClassesFromJSXExpression(element).forEach(c => classes.add(c));
             });
             break;
        case 'CallExpression':
            // Handle common cases like `classNames(...)` or `[...].join(' ')`
            // This would require more sophisticated type analysis or pattern matching.
            // Skipping complex call expressions for now.
            break;
        default:
            // Ignore other expression types (variables, function calls, etc.)
            // console.log(`Skipping complex className expression type in extraction: ${expression.type}`); // Debugging
            break;
    }

    return Array.from(classes);
}


/**
 * Generates the single primary selector string for an element based on configuration.
 * @param {{tag?: string, classes: string[], id?: string}} elementInfo - Information about the element.
 * @param {vscode.WorkspaceConfiguration} config - VS Code extension configuration.
 * @returns {string|null} The primary selector string (e.g., 'div.my-class#my-id', '.my-class', '#my-id', 'div'), or null if no relevant selector found.
 */
function generatePrimarySelector(elementInfo, config) {
    const { tag, classes, id } = elementInfo;
    const selectorType = config.get('selectorType', 'full'); // 'full' or 'simple'

    const hasId = id && id.trim() !== '';
    const hasClasses = classes && classes.length > 0 && classes.some(c => c.trim() !== '');
    const hasTag = tag && tag.trim() !== '';

    let selector = null;

    if (selectorType === 'simple') {
        // Simple: #id or .class1.class2...
        if (hasId) {
            selector = `#${id}`;
        } else if (hasClasses) {
            selector = classes.filter(c => c && c.trim() !== '').map(c => `.${c}`).join('');
        }
        // If neither ID nor classes, selector remains null. This element might be skipped.
    } else { // selectorType === 'full'
         // Full: tag#id.class1.class2... or tag.class1.class2... or #id.class1.class2... or tag or #id or .class1.class2...
         // Let's prioritize combining available attributes: tag + #id (if exists) + .classes (if any exist)
         let combinedSelector = '';
         if(hasTag) combinedSelector += tag;
         if(hasId) combinedSelector += `#${id}`;
         if(hasClasses) combinedSelector += classes.filter(c => c && c.trim() !== '').map(c => `.${c}`).join('');

         if (combinedSelector) {
             selector = combinedSelector;
         } else if (hasTag) {
            // Fallback to just tag if no id/classes but tag exists
             selector = tag;
         }
        // If no tag, no ID, no classes (shouldn't happen for valid element), selector remains null
    }

    // Ensure the selector is not just an empty string or '.'
    if (selector && selector.trim() !== '' && selector !== '.') {
        return selector;
    }

    return null; // No suitable selector found
}


/**
 * Recursively processes HTML elements to generate SCSS/SASS.
 * @param {object} el - The Cheerio element node.
 * @param {object} $ - The Cheerio instance.
 * @param {vscode.WorkspaceConfiguration} config - VS Code extension configuration.
 * @param {number} level - The current nesting level.
 * @returns {string} The generated SCSS/SASS string for this element and its children.
 */
function processHTMLElement(el, $, config, level = 0) {
    let result = '';
    const indent = '  '.repeat(level); // Use 2 spaces for indentation
    const classAttr = $(el).attr('class');
    const idAttr = $(el).attr('id');
    const tag = el.tagName ? el.tagName.toLowerCase() : ''; // Handle potential non-element nodes

    // Skip non-element nodes like text, comments etc. in Cheerio tree
    if (el.nodeType !== 1) {
        return '';
    }

    const elementInfo = {
        tag: tag,
        classes: classAttr ? classAttr.split(/\s+/).filter(c => c) : [],
        id: idAttr
    };

    // Generate the SINGLE primary selector for this element
    const selector = generatePrimarySelector(elementInfo, config);

    const syntax = config.get('syntax', 'scss'); // 'scss' or 'sass'

    // Determine the level for children. Increase level ONLY if THIS element generates a block.
    const childLevel = level + (selector !== null ? 1 : 0);

    // Process children recursively
    const childrenResult = $(el).children().map((_, child) =>
        processHTMLElement(child, $, config, childLevel)
    ).get().join('');

    // If no selector for this element based on config, just return children's result at the current level
    if (selector === null) {
         return childrenResult;
    }

    // Generate the block for the single primary selector
    switch (syntax) {
        case 'scss':
            result += `${indent}${selector} {\n`;
            result += childrenResult; // Append children result
            result += `${indent}}\n`;
            break;
        case 'sass':
            result += `${indent}${selector}\n`;
            result += childrenResult; // Append children result
            break;
    }

    return result;
}

/**
 * Recursively processes JSX elements to generate SCSS/SASS.
 * @param {object} node - The Babel AST JSXElement node.
 * @param {vscode.WorkspaceConfiguration} config - VS Code extension configuration.
 * @param {number} level - The current nesting level.
 * @returns {string} The generated SCSS/SASS string for this element and its children.
 */
function processJSXElement(node, config, level = 0) {
    let result = '';
    const indent = '  '.repeat(level); // Use 2 spaces for indentation
    const opening = node.openingElement;
    const attrs = opening.attributes || [];
    const clsNode = attrs.find(a => a.name?.name === 'className' || a.name?.name === 'class');
    const idNode = attrs.find(a => a.name?.name === 'id');
    const tag = (opening.name?.name || '').toLowerCase(); // Use ?. for safety

    let classes = [];
    if (clsNode?.value) {
        const v = clsNode.value;
        if (v.type === 'StringLiteral') {
             classes = v.value.split(/\s+/).filter(c => c);
        } else if (v.type === 'JSXExpressionContainer') {
             classes = extractClassesFromJSXExpression(v.expression).filter(c => c);
        }
         // Note: If className is a variable or complex expression not handled, classes will be empty
    }

    let id = null;
    if (idNode?.value?.type === 'StringLiteral') {
        id = idNode.value.value;
    }
    // We don't attempt to evaluate dynamic IDs from JSXExpressionContainer

    const elementInfo = {
        tag: tag,
        classes: classes, // Includes static and potential conditional classes
        id: id
    };

    // Generate the SINGLE primary selector for this element
    const selector = generatePrimarySelector(elementInfo, config);

    const syntax = config.get('syntax', 'scss'); // 'scss' or 'sass'

    // Determine the level for children. Increase level ONLY if THIS element generates a block.
    const childLevel = level + (selector !== null ? 1 : 0);

    // Process children recursively
    const childrenResult = node.children.map(c =>
        handleJSXChild(c, config, childLevel)
    ).filter(childScss => childScss !== null && childScss !== undefined).join(''); // Filter out null/undefined results

    // If no selector for this element based on config, just return children's result at the current level
    if (selector === null) {
        return childrenResult;
    }

    // Generate the block for the single primary selector
    switch (syntax) {
        case 'scss':
            result += `${indent}${selector} {\n`;
            result += childrenResult; // Append children result
            result += `${indent}}\n`;
            break;
        case 'sass':
            result += `${indent}${selector}\n`;
            result += childrenResult; // Append children result
            break;
    }

    return result;
}

/**
 * Handles different types of JSX children nodes (like JSXElements, expressions containing them).
 * @param {object} child - The Babel AST node for the child.
 * @param {vscode.WorkspaceConfiguration} config - VS Code extension configuration.
 * @param {number} level - The current nesting level.
 * @returns {string|null|undefined} The generated SCSS/SASS string for the child, or null/undefined if not relevant for SCSS extraction.
 */
function handleJSXChild(child, config, level) {
    if (child.type === 'JSXElement') {
        return processJSXElement(child, config, level);
    }
    if (child.type === 'JSXExpressionContainer') {
        const e = child.expression;
        // Handle expressions that might resolve to JSX elements (like maps or conditionals)
        if (e.type === 'JSXElement') {
            return processJSXElement(e, config, level);
        }
        if (e.type === 'ArrayExpression') {
            // Process elements within an array expression
            return e.elements.map(el => el?.type === 'JSXElement' ? processJSXElement(el, config, level) : '').filter(css => css.trim() !== '').join(''); // Filter empty strings from elements that weren't JSXElement
        }
         if (e.type === 'ConditionalExpression') {
             // Process conditional rendering: <>{condition ? <Elem1/> : <Elem2/>}</>
             // Recursively process consequent and alternate as potential children
             let result = '';
             // Pass the expression node directly to handleJSXChild
             const consequentResult = handleJSXChild(e.consequent, config, level);
             if (consequentResult) result += consequentResult;
             const alternateResult = handleJSXChild(e.alternate, config, level);
             if (alternateResult) result += alternateResult;
             return result; // Corrected: Return the accumulated result
         }
         if (e.type === 'LogicalExpression' && e.operator === '&&') {
              // Process logical rendering: <>{condition && <Elem/>}</>
              // Recursively process the right side as potential child
              let result = '';
               // Pass the expression node directly to handleJSXChild
              const rightResult = handleJSXChild(e.right, config, level);
              if (rightResult) result += rightResult;
              return result; // Corrected: Return the accumulated result
         }
        if (e.type === 'CallExpression' && e.callee.property?.name === 'map' && e.arguments.length > 0) {
            // Handle common map function for lists: array.map(...)
            const fn = e.arguments[0];
            if (fn.type === 'ArrowFunctionExpression' || fn.type === 'FunctionExpression') {
                 // Look inside the function body for returned JSX
                 if (fn.body?.type === 'JSXElement') {
                     return processJSXElement(fn.body, config, level);
                 }
                 if (fn.body?.type === 'BlockStatement') {
                     return fn.body.body
                         .filter(st => st.type === 'ReturnStatement' && st.argument) // Ensure return statement has an argument
                         .map(st => handleJSXChild(st.argument, config, level)) // Pass the returned argument to handleJSXChild
                         .filter(css => css !== null && css !== undefined && css.trim() !== '') // Filter out non-css results
                         .join('');
                 }
            }
        }
         // If the expression container contains something else (variable, function call, etc.), ignore it for SCSS generation
         // console.log(`Skipping JSXExpressionContainer with expression type: ${e.type}`); // Debugging
         return null;
    }
     // If the child is not JSXElement or JSXExpressionContainer containing JSX, it's ignored for SCSS extraction
     return null;
}


/**
 * Parses the document content and processes it based on language.
 * @param {string} text - The document text.
 * @param {string} lang - The document language ID.
 * @param {vscode.WorkspaceConfiguration} config - VS Code extension configuration.
 * @returns {string} The generated SCSS/SASS string.
 * @throws {Error} If parsing fails or language is unsupported.
 */
function parseAndProcess(text, lang, config) {
    let scss = '';

    if (lang === 'html') {
        try {
            const $ = cheerio.load(text);
            // Process direct children of body or the root itself
            // Use .toArray() to iterate over native elements, not Cheerio objects directly
            const root = $('body').length ? $('body') : $.root();
            root.children().toArray().forEach((child) => {
                // Call processHTMLElement directly for top-level children at level 0
                scss += processHTMLElement(child, $, config, 0);
            });
        } catch (e) {
            // console.error("HTML Parsing Error:", e); // Debugging
            throw new Error(getText('Помилка парсингу HTML: ', 'HTML parsing error: ') + e.message);
        }
    } else if (lang.startsWith('javascript') || lang.startsWith('typescript') || lang === 'javascriptreact' || lang === 'typescriptreact') {
        let ast;
        try {
            // Use a broader set of plugins for common React/TSX patterns
            ast = parser.parse(text, {
                sourceType: 'module',
                plugins: [
                    'jsx',
                    'classProperties',
                    'typescript',
                    'dynamicImport',
                    'objectRestSpread', // Add common plugins
                    'optionalChaining',
                    'nullishCoalescing',
                    'nullishesCoalcingOperator', // Alias
                    'optionalCatchBinding',
                    'leadingDecorators'
                ]
            });
        } catch (e) {
            // console.error("JSX/TSX Parsing Error:", e); // Debugging
            throw new Error(getText('Помилка парсингу JSX/TSX: ', 'JSX/TSX parsing error: ') + e.message);
        }

        try {
            // Traverse the AST to find top-level JSX elements
            traverse(ast, {
                JSXElement(path) {
                    const p = path.parentPath;
                     // Check if the JSXElement is a direct child of standard root nodes
                    const isStandardRoot = p.isProgram() ||
                                       p.isExpressionStatement() ||
                                       p.isReturnStatement() ||
                                       // Also handle JSX assigned to variables or exported directly
                                       (p.isVariableDeclarator() && p.node.init === path.node) ||
                                       (p.isAssignmentExpression() && p.node.right === path.node);


                    if (isStandardRoot) {
                        // Process this element directly as a top-level block at level 0
                        scss += processJSXElement(path.node, config, 0);
                        // Important: Skip traversing children of this top-level element,
                        // because processJSXElement handles recursive traversal internally.
                        // Skipping prevents potential double-processing if a child
                        // is also independently visited by the traversal engine.
                        path.skip();
                    }
                    // If parent is an ArrayExpression, ConditionalExpression, LogicalExpression etc.,
                    // the JSXElement within it will be processed when its parent is encountered
                    // by handleJSXChild if the parent itself is part of a structure being processed.
                }
            });
        } catch (e) {
             // console.error("AST Processing Error:", e); // Debugging
             throw new Error(getText('Помилка обробки AST: ', 'AST processing error: ') + e.message);
        }

    } else {
        throw new Error(getText('Непідтримуваний тип файлу. Підтримуються: HTML, JSX, TSX.', 'Unsupported file type. Supported: HTML, JSX, TSX.'));
    }

    return scss.trim();
}

/**
 * Handles the output of the generated SCSS/SASS based on user configuration or choice.
 * @param {string} scssContent - The generated SCSS/SASS string.
 * @param {string} syntax - The syntax ('scss' or 'sass').
 * @param {vscode.WorkspaceConfiguration} config - VS Code extension configuration.
 * @param {number} selectorCount - The number of generated top-level selectors.
 * @returns {Promise<void>}
 */
async function handleOutput(scssContent, syntax, config, selectorCount) {
    const outputMethod = config.get('outputMethod', 'ask'); // 'clipboard', 'preview', 'file', 'ask'

    const copyToClipboard = async () => {
        try {
            await vscode.env.clipboard.writeText(scssContent);
             vscode.window.showInformationMessage(
                 getText(
                     `Згенеровано ${selectorCount} ${syntax.toUpperCase()}-блоків і скопійовано в буфер обміну.`,
                     `Generated ${selectorCount} ${syntax.toUpperCase()} blocks and copied to clipboard.`
                 )
             );
        } catch (error) {
             vscode.window.showErrorMessage(getText(`Не вдалося скопіювати в буфер обміну: ${error.message}`, `Failed to copy to clipboard: ${error.message}`));
        }
    };

    const showPreview = async () => {
        try {
            const document = await vscode.workspace.openTextDocument({
                content: scssContent,
                language: syntax === 'scss' ? 'scss' : 'sass'
            });
            await vscode.window.showTextDocument(document);
            vscode.window.showInformationMessage(getText('Згенерований код показано у попередньому перегляді.', 'Generated code shown in preview.'));
        } catch (error) {
             vscode.window.showErrorMessage(getText(`Не вдалося показати попередній перегляд: ${error.message}`, `Failed to show preview: ${error.message}`));
        }
    };

    const saveToFile = async () => {
        const defaultFileName = `extracted.${syntax}`;
        const uri = await vscode.window.showSaveDialog({
            defaultUri: vscode.Uri.file(path.join(vscode.workspace.rootPath || '', defaultFileName)),
            filters: {
                'SCSS Files': ['scss'],
                'SASS Files': ['sass']
            },
            title: getText('Зберегти згенерований SCSS/SASS як...', 'Save generated SCSS/SASS as...')
        });

        if (uri) {
            try {
                await vscode.workspace.fs.writeFile(uri, new TextEncoder().encode(scssContent));
                vscode.window.showInformationMessage(getText(`Згенерований код збережено у ${uri.fsPath}`, `Generated code saved to ${uri.fsPath}`));
            } catch (error) {
                vscode.window.showErrorMessage(getText(`Не вдалося зберегти файл: ${error.message}`, `Failed to save file: ${error.message}`));
            }
        } else {
             vscode.window.showInformationMessage(getText('Збереження скасовано.', 'Save cancelled.'));
        }
    };

    if (outputMethod === 'clipboard') {
        await copyToClipboard();
    } else if (outputMethod === 'preview') {
        await showPreview();
    } else if (outputMethod === 'file') {
        await saveToFile();
    } else { // 'ask' or any other value
        const options = [
            { label: getText('Копіювати в буфер обміну', 'Copy to Clipboard'), action: 'copy' },
            { label: getText('Показати попередній перегляд', 'Show Preview'), action: 'preview' },
            { label: getText('Зберегти у файл', 'Save to File'), action: 'save' }
        ];

        const choice = await vscode.window.showQuickPick(options, {
            placeHolder: getText(`Згенеровано ${selectorCount} ${syntax.toUpperCase()}-блоків. Що зробити?`, `Generated ${selectorCount} ${syntax.toUpperCase()} blocks. What to do?`)
        });

        if (choice) {
            if (choice.action === 'copy') {
                await copyToClipboard();
            } else if (choice.action === 'preview') {
                await showPreview();
            } else if (choice.action === 'save') {
                await saveToFile();
            }
        } else {
            // User cancelled the quick pick
            vscode.window.showInformationMessage(getText('Дія скасована.', 'Action cancelled.'));
        }
    }
}


/**
 * Main command handler function.
 */
async function extractScssCommand() {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
        vscode.window.showErrorMessage(getText('Відкрий файл, будь ласка.', 'Please open a file.'));
        return;
    }

    const text = editor.document.getText();
    const lang = editor.document.languageId;
    const config = vscode.workspace.getConfiguration('extractScss');
    const syntax = config.get('syntax', 'scss');

    try {
        const scss = parseAndProcess(text, lang, config);

        if (!scss.trim()) {
            vscode.window.showInformationMessage(getText('Класи/Ідентифікатори/Теги не знайдені для генерації.', 'No classes/ids/tags found for generation.'));
            return;
        }

        // Simple counting of top-level blocks based on indentation and selector start
        // This regex looks for lines starting with 0 indentation, followed by . # or a letter
        const topLevelSelectorRegex = /^(\.|#|[a-zA-Z])/gm;
        const count = (scss.match(topLevelSelectorRegex) || []).length;
        // Note: This counting method might not be perfectly accurate for all edge cases,
        // but it gives a reasonable estimate of generated top-level blocks.

        await handleOutput(scss, syntax, config, count);

    } catch (error) {
        // console.error("Extract SCSS Command Error:", error); // Debugging
        vscode.window.showErrorMessage(error.message);
    }
}




/**
 * Activates the extension.
 * @param {vscode.ExtensionContext} context - The extension context.
 */
function activate(context) {
    // Register the main command
    const disposable = vscode.commands.registerCommand('extension.extractScss', extractScssCommand);
    context.subscriptions.push(disposable);

    // Create and show the status bar item
    const statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left);
    statusBarItem.text = '$(code) SCSS Extract';
    statusBarItem.tooltip = getText('Згенерувати SCSS з HTML/JSX', 'Generate SCSS from HTML/JSX');
    statusBarItem.command = 'extension.extractScss';
    statusBarItem.show();
    context.subscriptions.push(statusBarItem);

    // Optional: Add a language status item for supported files
    // This gives quick access but can be visually noisy if many extensions add them.
    // const languageStatusItem = vscode.languages.createLanguageStatusItem('extractScssStatus', ['html', 'javascriptreact', 'typescriptreact']);
    // languageStatusItem.text = '$(code)';
    // languageStatusItem.detail = 'Extract SCSS';
    // languageStatusItem.command = 'extension.extractScss';
    // context.subscriptions.push(languageStatusItem);
}

/**
 * Deactivates the extension.
 */
function deactivate() {}

module.exports = { activate, deactivate };