(function () {
    /** 対応記法
     * - ノーマルテキスト
     * - 多段箇条書き
     * - 見出し
     * - 画像
     * - リンク
     * - 単一行コード
     * - コードブロック
     **/

    var writer = (title='Title', texts=[]) => {
        var res = `# ${title}\n`;
        for (var i = 0; i < texts.length; i++) {
            var text = texts[i];
            res += '\n' + text;
        }

        var win = window.open();
        win.document.open();
        win.document.write(`<title>${title}</title>`);
        win.document.write('<pre>');
        win.document.write(escapeHtml(res));
        win.document.write('</pre>');
        win.document.close();
    };

    var escapeHtml = (str) => {
        str = str.replace(/&/g, '&amp;');
        str = str.replace(/</g, '&lt;');
        str = str.replace(/>/g, '&gt;');
        str = str.replace(/"/g, '&quot;');
        str = str.replace(/'/g, '&#39;');
        return str;
    };

    var markdownIndent = (level=0) => {
        var indent = '';
        for (var u = 1; u < level; u++) {
            // 半角スペース4個ぶん
            indent += '    ';
        }
        return indent;
    };

    var guessLanguageFromFileName = (fileName='') => {
      const extensions = {
        js: "javascript",
        py: "python",
        java: "java",
        rb: "ruby",
        php: "php",
        html: "html",
        css: "css",
        cpp: "cpp",
        c: "c",
        cs: "csharp",
        sh: "bash",
        zsh: "bash",
        md: "markdown",
        json: "json",
        xml: "xml",
        yml: "yaml",
        yaml: "yaml",
        ts: "typescript",
        go: "go",
        rs: "rust",
        kt: "kotlin",
        swift: "swift",
      };
      return ((fileName='') => {
        const extension = fileName.includes(".")
          ? fileName.split(".").pop()
          : "";
        return extensions[extension] || "";
      })(fileName);
    };
  
    var codeblock = (text="") => {
      var div = document.createElement("div");
      div.innerHTML = text;
  
      // code blockの開始
      var codeStart = div.querySelector(".code-start");
      if (codeStart !== null) {
        var fileNameOrLanguage = codeStart.querySelector("a").innerText;
        var language = "";
        if (fileNameOrLanguage) {
          var language = guessLanguageFromFileName(fileNameOrLanguage);
        }
        if (language) {
          language = language + ":";
        }
        return "```" + language + fileNameOrLanguage;
      }
  
      // code blockの内容
      var codebody = div.querySelector(".code-body");
      if (codebody !== null) {
        var codeTag = codebody.querySelector("code");
        if (codeTag) {
          return codeTag.innerText.trim();
        }
      }
      return div.innerText;
    };

    // level小: 文字小 (Scrapbox記法に準ずる)
    // 1 <= level <= MAX_LEVEL
    // (MAX_LEVEL + 1) - level: 「#」の数
    var headlineMark = (level=1) => {
        var MAX_LEVEL = 5;
        var numMarks = (MAX_LEVEL + 1) - level;
        var r = '';
        for (var i = 0; i < numMarks; i++) {
            r += '#';
        }
        return r;
    };

    var headline = (text='') => {
        var div = document.createElement("div");
        div.innerHTML = text;
        var strongTags = div.querySelectorAll('strong');
        for (var i = 0; i < strongTags.length; i++) {
            var strong = strongTags[i];
            var level = +(strong.className.split('level-')[1]);
            var title = strong.innerHTML;
            strong.innerHTML = `${headlineMark(level)} ${title}`;
        }
        return div.innerHTML;
    };

    var links = (text='') => {
        var div = document.createElement("div");
        div.innerHTML = text;

        var aTags = div.querySelectorAll('a');
        for (var i = 0; i < aTags.length; i++) {
            var a = aTags[i];
            var aHtml = a.innerText.trim();
            var aHref = a.href;
            var linkMarkdown = `[${aHtml}](${aHref})`;

            // 画像対応
            var img = a.querySelector('img');
            if (img !== null) {
                linkMarkdown = `[![Image](${img.src})](${aHref})`;
            }
            a.innerText = linkMarkdown;
        }
        return div.innerText;
    };


    var lines = document.querySelector('.lines');
    var pageTitle = lines.querySelector('.line-title .text').innerText;
    var indentUnitWidthEm = 1.5;
    var isCodeBlock = false;

    lines = lines.querySelectorAll('.line');
    pageTexts = [];
    for (var i = 1; i < lines.length; i++) {
        var line = lines[i].querySelector('.text').cloneNode(true);

        // 空白文字を持つ要素を除去
        var emptyChars = line.querySelectorAll('span.empty-char-index');
        for (var j = 0; j < emptyChars.length; j++) {
            var e = emptyChars[j];
            e.innerText = '';
        }

        // バッククオートを有効化
        var backQuos = line.querySelectorAll('span.backquote');
        for (var j = 0; j < backQuos.length; j++) {
            var e = backQuos[j];
            e.innerText = '`';
        }

        var html = line.innerHTML.replace(/<span>/g, '');
        html = html.replace(/<span.+?>/g, '').replace(/<\/span>/g, '');
        html = html.replace(/<br.+?>/g, '');
        var text = html.replace(/\n/gi, '').replace(/\t/gi, '').trim();

        // コードブロック対応
        if (text.includes("code-start") && isCodeBlock === true) {
          // code-start時にisCodeBlockがtrueの場合、コードブロックが連続していると判断し、コードブロックを閉じる。
          pageTexts.push("```");
        }
        if (isCodeBlock === false && text.includes("code-start")) {
          isCodeBlock = true;
        }
        if (text.includes("code-start") || text.includes("code-body")) {
          text = codeblock(text);
          isCodeBlock = true;
        } else if (isCodeBlock === true) {
          pageTexts.push("```");
          isCodeBlock = false;
        }

        text = headline(text);
        text = links(text);

        // 箇条書き対応
        var liDot = line.querySelector('.indent-mark');
        if (liDot !== null && isCodeBlock === false) {
            // 箇条書きの入れ子構造を取得
            var width = +((liDot.style.width).split('em')[0]);
            var indentLevel = width / indentUnitWidthEm * 2;
            text = markdownIndent(indentLevel) + '- ' + text;
        }
        if (liDot === null && text.length > 0 && text[0] !== '#') {
            text += '<br>'
        }

        pageTexts.push(text);
    }

    writer(pageTitle, pageTexts);
})();
