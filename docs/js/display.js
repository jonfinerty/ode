"use strict";

function updateDisplayText() {
    const inputElement = document.querySelector("#input");
    const displayElement = document.querySelector("#display")
    const text = inputElement.value;

    //let paragraphCounter = 0;
    let rhymeSchemeCounter = 0;
    // each is [word, rhymeScheme]
    const lastWords = [];
    // let lastWords =[[]];
    const lines = splitTextToLines(text);
    lines.forEach((line, i) => {
        const words = splitLineToWords(line);
        // if (words.length == 0) {
        //   paragraphCounter++;
        //   lastWords[paragraphCounter] = [];
        //   return;
        // }
        if (words.length == 0) {
            return;
        }
        const lastWord = words[words.length - 1];
        let rhymeScheme = null;
        let rhymeFound = false;
        let rhymeFoundScheme = null;
        lastWords.forEach(previousLastWordAndRhymeScheme => {
            //lastWords[paragraphCounter].forEach(previousLastWordAndRhymeScheme => {
            const previousLastWord = previousLastWordAndRhymeScheme[0];
            const previousLastWordRhymeScheme = previousLastWordAndRhymeScheme[1];

            if (previousLastWord.rhymesWith(lastWord)) {
                rhymeFound = true;
                if (previousLastWordRhymeScheme == -1) {
                    // HERE
                    rhymeFoundScheme = rhymeSchemeCounter;
                    rhymeSchemeCounter++;
                } else {
                    rhymeFoundScheme = previousLastWordRhymeScheme;

                }
            }
        })

        if (rhymeFound) {
            // lastWords[paragraphCounter].push([lastWord,rhymeFoundScheme]);
            lastWords.push([lastWord, rhymeFoundScheme]);
            rhymeScheme = rhymeFoundScheme;
        } else {
            // lastWords[paragraphCounter].push([lastWord,rhymeSchemeCounter]);
            lastWords.push([lastWord, rhymeSchemeCounter]);
            rhymeScheme = rhymeSchemeCounter;
            rhymeSchemeCounter++;
        }

        // var pos = line.lastIndexOf(lastWord);
        var rhymeCssClass = "rhyme-" + rhymeScheme % 16; // start reusing colours after 16 rhymes
        var wordCssClass = "word";
        // let unescapedLinePart = line.substring(0, pos);
        // let markedEscapedUpEndOfLine = "<span class=\"" + rhymeCssClass + "\">" + escapeHtml(lastWord) + "</span>" + escapeHtml(line.substring(pos + lastWord.length));

        let markedUpLine = "";
        // // mid line rhymes - i.e the raven
        // words.forEach((word, j) => {
        //     // don't check last word against itself
        //     if (words.length - 1 == j) {
        //         return;
        //     }

        //     if (wordsRhyme(word, lastWord)) {
        //         //issue with replacing text multiple times, as you might hit 'span' or 'class'
        //         var pos = unescapedLinePart.indexOf(word);
        //         markedUpLine = markedUpLine + escapeHtml(unescapedLinePart.substring(0, pos)) + "<span class=\"" + rhymeCssClass + "\">" + escapeHtml(word) + "</span>";
        //         unescapedLinePart = unescapedLinePart.substring(pos + word.length);
        //     }
        // });

        let unescapedLinePart = line;
        words.forEach((word, i) => {
            // don't check last word against itself
            let wordIsRhyme = false
            // always take last word as a rhyme
            if (words.length - 1 == i) {
                wordIsRhyme = true;
            } else {
                wordIsRhyme = word.rhymesWith(lastWord);
            }

            let cssClasses = wordCssClass;
            if (wordIsRhyme) {
                cssClasses = cssClasses + " " + rhymeCssClass;
            }
            //issue with replacing text multiple times, as you might hit 'span' or 'class', so chunk through rather than replace all
            const pos = unescapedLinePart.indexOf(word.text);
            markedUpLine = markedUpLine + escapeHtml(unescapedLinePart.substring(0, pos)) + "<span class=\"" + cssClasses + "\">" + escapeHtml(word.text) + "</span>";
            unescapedLinePart = unescapedLinePart.substring(pos + word.text.length);
        });

        lines[i] = markedUpLine + escapeHtml(unescapedLinePart);// + markedEscapedUpEndOfLine;
    });
    displayElement.innerHTML = lines.join("\n");
}

function escapeHtml(text) {
    var map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };

    return text.replace(/[&<>"']/g, function (char) { return map[char]; });
}
