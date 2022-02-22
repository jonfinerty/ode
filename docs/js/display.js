"use strict";

let lineCount = 0;

function renderDisplay() {
    const inputElement = document.querySelector("#input");
    const displayElement = document.querySelector("#display")
    const text = inputElement.value;

    let previousLineWordCount = 0; // because of how we cope with multiple blank lines
    let stanzaCounter = 0;
    let lineCounter = 0; 
    let wordCounter = 0
    const lines = splitTextToLines(text);
    lineCount = lines.length;

    lines.forEach((line, lineIndex) => {
        const words = splitLineToWords(line);

        if (words.length == 0) {
            if (previousLineWordCount != 0) {
                stanzaCounter++;
            }
            previousLineWordCount = words.length;
            return;
        }

        previousLineWordCount = words.length;
        
        let processedLine = "";
        let remainingUnprocessedLine = line;
        words.forEach((word, wordIndex) => {
            const wordStringPos = remainingUnprocessedLine.indexOf(word.text);
            let cssClasses = "class=\"word";
            if (wordIndex == 0) {
                cssClasses += " first-word";
            }
            if (wordIndex == words.length-1) {
                cssClasses += " last-word";
            }

            cssClasses += "\"";

            // might be too much?
            const dataAttributes = 
            "data-input-line-number=\"" + lineIndex + "\"" +
            " data-poem-line-number=\"" + lineCounter + "\"" +
            " data-stanza-number=\"" + stanzaCounter +"\"" +
            " data-word-number=\"" + wordCounter + "\"" +
            " data-line-word-number=\"" + wordIndex +"\"";

            let wordSpan = "<span " + dataAttributes + " " + cssClasses+ ">" + escapeHtml(word.text) + "</span>"

            if (mode == "about" && word.text.toLowerCase() == "tweet") {
                wordSpan = "<a class=\"tweet\" href=\"#\">" + wordSpan + "</a>";
            }

            processedLine = processedLine + escapeHtml(remainingUnprocessedLine.substring(0, wordStringPos)) + wordSpan;
            remainingUnprocessedLine = remainingUnprocessedLine.substring(wordStringPos + word.text.length);
            wordCounter++;
        });

        lines[lineIndex] = processedLine + escapeHtml(remainingUnprocessedLine);
        lineCounter++;
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
