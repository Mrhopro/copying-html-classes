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
- SCSS preview
- Instantly copy the result to the clipboard
- Interactive selection of action after generation:
- Copy only
- Copy and show preview
- Automatic saving of user selection with the ability to change in VS Code settings
- Localization: Ukrainian and English interface language (automatically determined based on VS Code language)
- Button in the status bar for quick launch

---

## 🖱️ How to Use

1. Open an HTML or JSX/TSX file in VS Code.
2. Open the Command Palette (`Ctrl+Shift+P` or `F1`) and run:
3. After generation, a prompt will appear: copy only or show preview.
4. The selection will be saved and will be used by default next time (it can be changed in the settings).

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

## Known limitations

- No SCSS will be generated in HTML/JSX without classes

- Dynamically generated class names may not be fully processed

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
 - Попередній перегляд SCSS
 - Миттєве копіювання результату у буфер обміну
- Інтерактивний вибір дії після генерації:
  - Лише скопіювати
  - Скопіювати і показати попередній перегляд
- Автоматичне запам'ятовування вибору користувача з можливістю зміни в налаштуваннях VS Code
- Локалізація: українська та англійська мова інтерфейсу (визначається автоматично на основі мови VS Code)
- Кнопка в статус-барі для швидкого запуску

---

 ## 🖱️ Як користуватись

 1. Відкрий HTML або JSX/TSX файл у VS Code.
 2. Відкрий палітру команд (`Ctrl+Shift+P` або `F1`) і введи:
 ```Extract SCSS from HTML/JSX```
 3. Після генерації з'явиться запит: лише скопіювати чи показати попередній перегляд.
 4. Вибір збережеться і буде використовуватись за замовчуванням наступного разу (його можна змінити в налаштуваннях).

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

## Відомі обмеження

- У HTML/JSX без класів не буде згенеровано SCSS
- Динамічно сформовані імена класів можуть не бути оброблені повністю

Автор

Створено з ❤️ [Mrhopro]