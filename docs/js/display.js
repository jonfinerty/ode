function wordsRhyme(word1, word2) {
    //controversially
    if (word1 == word2) {
        return false;
    }

    let word1Props = getWordProps(word1);
    if (!word1Props) {
        return false;
    }
    let word2Props = getWordProps(word2);
    if (!word2Props) {
        return false;
    }

    return word1Props[3].some(rhymeGroupId => word2Props[3].includes(rhymeGroupId));
}

function updateDisplayText() {
    let inputElement = document.querySelector("#input");
    let displayElement = document.querySelector("#display")
    let text = inputElement.value;

    //let paragraphCounter = 0;
    let rhymeSchemeCounter = 0;
    // each is [word, rhymeIndex]
    let lastWords = [];
    // let lastWords =[[]];
    let lines = splitTextToLines(text);
    lines.forEach((line, i) => {
        let words = splitLineToWords(line);
        // if (words.length == 0) {
        //   paragraphCounter++;
        //   lastWords[paragraphCounter] = [];
        //   return;
        // }
        if (words.length == 0) {
            return;
        }
        let lastWord = words[words.length - 1];
        let rhymeScheme = null;
        let rhymeFound = false;
        let rhymeFoundScheme = null;
        lastWords.forEach(previousLastWordAndRhymeScheme => {
            //lastWords[paragraphCounter].forEach(previousLastWordAndRhymeScheme => {
            previousLastWord = previousLastWordAndRhymeScheme[0];
            previousLastWordRhymeScheme = previousLastWordAndRhymeScheme[1];

            if (wordsRhyme(previousLastWord, lastWord)) {
                rhymeFound = true;
                rhymeFoundScheme = previousLastWordRhymeScheme;
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
                wordIsRhyme = wordsRhyme(word, lastWord);
            }

            let cssClasses = wordCssClass;
            if (wordIsRhyme) {
                cssClasses = cssClasses + " " + rhymeCssClass;
            }
            //issue with replacing text multiple times, as you might hit 'span' or 'class', so chunk through rather than replace all
            var pos = unescapedLinePart.indexOf(word);
            markedUpLine = markedUpLine + escapeHtml(unescapedLinePart.substring(0, pos)) + "<span class=\"" + cssClasses + "\">" + escapeHtml(word) + "</span>";
            unescapedLinePart = unescapedLinePart.substring(pos + word.length);
        });

        lines[i] = markedUpLine + escapeHtml(unescapedLinePart);// + markedEscapedUpEndOfLine;
    });
    displayElement.innerHTML = lines.join("\n");
}

function hightlightWordsInLine(line, word) {

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
