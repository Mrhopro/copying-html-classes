# 📋 Extract SCSS Classes

> 🇺🇦 Українська версія нижче ⬇

An extension for Visual Studio Code that extracts all CSS classes from HTML or JSX code and formats them into **nested SCSS**. The result is automatically copied to the clipboard.

---

## ⚙️ Features

- Supports standard HTML (`class="..."`)
- Supports JSX/React (`className="..."`, template strings, nested components)
- Generates **nested** SCSS
- Copies the result to clipboard
- Displays the number of extracted SCSS blocks
- Instantly copy the result to the clipboard
- Localization: Ukrainian and English interface language (automatically determined based on VS Code language)
- Button in the status bar for quick launch

---

## 🖱️ How to Use

1. Open an HTML or JSX/TSX file in VS Code.
2. Open the Command Palette (`Ctrl+Shift+P` or `F1`) and run:
```Extract SCSS from HTML/JSX```

---

## 💡 Example

HTML:

```html
<div class="wrapper">
<header class="header">
 <h1 class="title">Title</h1>
</header>
</div>
```

SCSS:

```scss
.wrapper {
  .header {
    .title {
    }
  }
}
```

Author

Created with ❤️ by [Mrhopro]

---

🇺🇦 Витягування SCSS класів

Розширення для Visual Studio Code, яке витягує всі CSS-класи з HTML або JSX-коду та формує з них вкладену структуру SCSS. Результат автоматично копіюється в буфер обміну.

---

 ## ⚙️ Можливості

 - Підтримка звичайного HTML (class="...")
 - Підтримка JSX/React (className="...", шаблонні строки, вкладені компоненти)
 - Генерація SCSS з вкладеністю
 - Копіювання результату у буфер обміну
 - Повідомлення про кількість згенерованих SCSS-блоків
 - Миттєве копіювання результату у буфер обміну
 - Локалізація: українська та англійська мова інтерфейсу (визначається автоматично на основі мови VS Code)
 - Кнопка в статус-барі для швидкого запуску

---

 ## 🖱️ Як користуватись

 1. Відкрий HTML або JSX/TSX файл у VS Code.
 2. Відкрий палітру команд (`Ctrl+Shift+P` або `F1`) і введи:
 ```Extract SCSS from HTML/JSX```
 
---

 ## 💡 Приклад
 HTML:

```html
<div class="wrapper">
<header class="header">
 <h1 class="title">Title</h1>
</header>
</div>
```

SCSS:

```scss
.wrapper {
  .header {
    .title {
    }
  }
}
```

Автор

Створено з ❤️ [Mrhopro]