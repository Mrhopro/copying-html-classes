<style>
  /* 🌟 Creative “Night Mode” CSS Theme for README Preview 🌙 */

/* Base background & text */
body {
  background: linear-gradient(135deg, #0d1b2a, #1b263b);
  color: #e0e1dd;
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  line-height: 1.6;
  padding: 2rem;
}

/* Headers with glowing effect */
h1, h2, h3 {
  text-shadow: 0 0 5px rgba(224,225,221,0.7);
  margin-bottom: 1rem;
}

/* Code blocks with “terminal” vibe */
pre, code {
  background: #18232e;
  border: 1px solid #33415c;
  padding: 0.5rem;
  border-radius: 4px;
  font-family: 'Courier New', Courier, monospace;
  color: #a8dadc;
}

/* Add a subtle flicker animation to headings */
@keyframes flicker {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.85; }
}
h1 {
  animation: flicker 4s infinite ease-in-out;
}

/* Blockquotes styled as “speech bubbles” */
blockquote {
  background: rgba(224,225,221,0.1);
  border-left: 4px solid #e63946;
  padding: 0.5rem 1rem;
  border-radius: 4px;
  position: relative;
}
blockquote::before {
  content: "💬";
  position: absolute;
  top: -0.5rem;
  left: -1.2rem;
  font-size: 1.2rem;
}

/* Links with neon underline on hover */
a {
  color: #f1faee;
  text-decoration: none;
  position: relative;
}
a::after {
  content: '';
  position: absolute;
  width: 100%; height: 2px;
  background: #e63946;
  bottom: -2px; left: 0;
  transform: scaleX(0);
  transform-origin: left;
  transition: transform 0.3s ease;
}
a:hover::after {
  transform: scaleX(1);
}

/* Tables with alternating row glow */
table {
  width: 100%;
  border-collapse: collapse;
  margin: 1rem 0;
}
th, td {
  padding: 0.5rem;
  border: 1px solid #33415c;
}
tr:nth-child(even) {
  background: rgba(255, 255, 255, 0.05);
}

/* Button style for status-bar simulation in README */
.button {
  display: inline-block;
  background: #e63946;
  color: #f1faee;
  padding: 0.4em 1em;
  border-radius: 3px;
  text-decoration: none;
  font-weight: bold;
}
.button:hover {
  background: #d62828;
  box-shadow: 0 0 8px rgba(214,40,40,0.6);
}

/* End of Night Mode README CSS */
</style>

# 📋 Extract SCSS Classes

> 🇺🇦 Українська версія нижче ⬇

Extension for Visual Studio Code that extracts CSS/SCSS (or indented SASS) selectors from your HTML, JSX or TSX, preserving nesting, and outputs them (clipboard, preview or file).

---

## ⚙️ Features

- Parses **HTML** (`class="…"`, `id="…"`, tags without attributes)
- Parses **JSX/TSX** (`className="…"`, conditional/template expressions, `map()`, self-closing tags)
- Supports **simple** selectors (`.class`, `#id`) or **full** selectors (`tag.class#id…`)
- Configurable output syntax: **scss** or **sass**
- Output methods:
  - **ask** each time (QuickPick)
  - **clipboard** (copy silently)
  - **preview** (open new editor tab)
  - **file** (prompt to save `.scss`/`.sass`)
- Localization: English 🇺🇸 / Ukrainian 🇺🇦 based on VS Code language
- Status-bar button for one-click extraction

---

## 🖱️ How to Use

1. Open an **HTML**, **.jsx** or **.tsx** file in VS Code.  
2. Click the **SCSS Extract** button in the status bar, or run the command  
```Ctrl+Shift+P → Extract SCSS from HTML/JSX```
3. If `outputMethod` = “ask”, choose:
- Copy to Clipboard  
- Show Preview  
- Save to File  
4. Your SCSS/SASS code is generated with proper nesting.

---

## ⚙️ Configuration

Open **Settings** (Ctrl+,) and search for “Extract SCSS”. Available options:

| Setting                                 | Type     | Default | Description                                                                                       |
|-----------------------------------------|----------|---------|---------------------------------------------------------------------------------------------------|
| **extractScss.syntax**                  | `string` | `scss`  | Output syntax: `scss` (braces) or `sass` (indented).                                              |
| **extractScss.selectorType**            | `string` | `full`  | Selector style: `full` (e.g. `div.my-class#my-id`) or `simple` (`.my-class` or `#my-id` only).    |
| **extractScss.outputMethod**            | `string` | `ask`   | Where to send generated code: `ask`, `clipboard`, `preview`, or `file`.                           |
| **extractScss.generateComponentSelectors** | `boolean`| `false` | If true, also generate selectors for component root elements based on their static classes/IDs.   |

---

## 💡 Example

### HTML

```html
<div>
<h1 class="a">
 <span class="b"></span>
 <p></p>
 <img/>
 <div/>
 <a href="" id="c"></a>
</h1>
</div>
```

### Generated SCSS (with default settings):

```scss
div {
  .a {
    .b { }
    p { }
    img { }
    div { }
    #c { }
  }
}
```
### JSX / TSX

```
export default function Test() {
  return (
    <div className="wrapper">
      {items.map(x => <span className="item" />)}
      <footer id="ftr"><p/></footer>
    </div>
  );
}
```

### Produces:
```
div.wrapper {
  span.item { }
  #ftr {
    p { }
  }
}
```

## Author

Created with ❤️ by [Mrhopro]
And special thanks to [Mik00000]
---

🇺🇦 Витягування SCSS класів

Розширення для Visual Studio Code, яке витягує CSS/SCSS (або індентований SASS) селектори з HTML, JSX чи TSX, зберігає вкладеність і виводить їх (буфер, прев’ю або файл).

---

## ⚙️ Можливості

- Парсинг **HTML** (`class="…"`, `id="…"`, теги без атрибутів)  
- Парсинг **JSX/TSX** (`className="…"`, умовні/шаблонні вирази, `map()`, self-closing теги)  
- Підтримка **простих** селекторів (`.class`, `#id`) або **повних** селекторів (`tag.class#id…`)  
- Налаштовуваний синтаксис: **scss** або **sass**  
- Способи виводу:  
  - **ask** – запит щоразу (QuickPick)  
  - **clipboard** – копіювати без запиту  
  - **preview** – відкрити у новій вкладці  
  - **file** – зберегти у `.scss`/`.sass`  
- Локалізація: англійська/українська залежно від мови VS Code  
- Кнопка в статус-барі для швидкого запуску  

---

## 🚀 Використання

1. Відкрий файл **HTML**, **.jsx** або **.tsx** у VS Code.  
2. Натисни кнопку **SCSS Extract** в статус-барі або виконай команду  
   ```
   Ctrl+Shift+P → Extract SCSS from HTML/JSX
   ```  
3. Якщо `outputMethod` = “ask”, обери:  
   - Копіювати в буфер  
   - Показати прев’ю  
   - Зберегти у файл  
4. Отримай згенерований SCSS/SASS з коректною вкладеністю.  

---

## ⚙️ Налаштування

Відкрий **Налаштування** (Ctrl+,) та знайди “Extract SCSS”. Доступні опції:

| Налаштування                           | Тип      | За замовч. | Опис                                                                                              |
|----------------------------------------|----------|------------|----------------------------------------------------------------------------------------------------|
| **extractScss.syntax**                 | `string` | `scss`     | Синтаксис: `scss` (з фігурними дужками) або `sass` (відступи).                                       |
| **extractScss.selectorType**           | `string` | `full`     | Стиль селектора: `full` (наприклад `div.class#id`) або `simple` (`.class` чи `#id`).               |
| **extractScss.outputMethod**           | `string` | `ask`      | Куди виводити: `ask`, `clipboard`, `preview` або `file`.                                           |
| **extractScss.generateComponentSelectors** | `boolean`| `false`    | Якщо true, генерувати селектори для кореневих компонентів за їхніми статичними класами/ID.          |

---

## 📑 Приклади

### HTML

```html
<div>
  <h1 class="a">
    <span class="b"></span>
    <p></p>
    <img/>
    <div/>
    <a href="" id="c"></a>
  </h1>
</div>
```

**Згенерований SCSS**:

```scss
div {
  .a {
    .b { }
    p { }
    img { }
    div { }
    #c { }
  }
}
```

### JSX / TSX

```jsx
export default function Test() {
  return (
    <div className="wrapper">
      {items.map(x => <span className="item" />)}
      <footer id="ftr"><p/></footer>
    </div>
  );
}
```

**Згенерований SCSS**:

```scss
div.wrapper {
  span.item { }
  #ftr {
    p { }
  }
}
```

---


## Автор

Створено з ❤️ [Mrhopro]
і окрема подяка [Mik00000]