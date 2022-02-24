"use strict";

function getSyllableCountOfPoemLine(lineNumber) {
    var element = document.querySelector(".syllable-count[data-poem-line-number=\"" + lineNumber + "\"]");
    return parseInt(element?.innerText) || 0;
}

function updateMetre() {
    const metreSpaceSize = getTextMetreWidth(" ");
    const input_element = document.querySelector("#input")
    const text = input_element.value;
    let metre = "";
    let syllablesOutput = "";

    let stanzaCounter = 0;
    let lineCounter = 0;
    let previousLineSyllableCount = 0; // because of how we cope with multiple blank lines

    let lines = splitTextToLines(text);
    lines.forEach(line => {
        var lineSyllableCount = 0;
        var lineMetre = "";
        const words = splitLineToWords(line);

        let remainingLine = line;
        let processedLine = "";

        words.forEach(word => {
            const wordIndex = remainingLine.indexOf(word.text);
            const precedingWhitespaceAndPunctuation = remainingLine.substring(0, wordIndex);
            processedLine += precedingWhitespaceAndPunctuation;
            let runningTextLength = getTextDisplayWidth(processedLine);
            let currentMetreLength = getTextMetreWidth(lineMetre);
            const spacesNeeded = Math.floor((Math.max(0, runningTextLength - currentMetreLength) / metreSpaceSize) + 0.3); //err towards a space
            lineMetre += " ".repeat(spacesNeeded);
            currentMetreLength = getTextMetreWidth(lineMetre);

            processedLine += word.text;
            runningTextLength = getTextDisplayWidth(processedLine);
            const metreCharactersNeeded = Math.floor((runningTextLength - currentMetreLength) / metreSpaceSize);

            const wordSyllables = word.getDisplaySyllables();
            const wordMetre = distributeEvenly(wordSyllables, metreCharactersNeeded);
            lineMetre += wordMetre;

            remainingLine = remainingLine.substring(wordIndex + word.text.length);

            lineSyllableCount += word.syllableCount;
        });

        if (lineSyllableCount == 0) {
            syllablesOutput += '<br>';
            if (previousLineSyllableCount != 0) {
                stanzaCounter++;
            }
        } else {
            syllablesOutput += "<span class=\"syllable-count\" data-poem-line-number=\"" + lineCounter + "\" data-stanza-number=\"" + stanzaCounter + "\">" + lineSyllableCount + '</span><br>';
            lineCounter++;
        }
        metre = metre + lineMetre.replace(/ /g, "&nbsp;") + '<br>';
        previousLineSyllableCount = lineSyllableCount;
    })

    const metreElement = document.querySelector("#metre");
    metreElement.innerHTML = metre;
    const syllablesElement = document.querySelector("#syllables");
    syllablesElement.innerHTML = syllablesOutput;
}

function getTextDisplayWidth(text) {
    const measurer = document.querySelector("#display-text-measurer");
    measurer.innerText = text;
    return measurer.getBoundingClientRect().width;
}

function getTextMetreWidth(text) {
    const measurer = document.querySelector("#metre-text-measurer");
    measurer.innerText = text;
    return measurer.getBoundingClientRect().width;
}

function distributeEvenly(syllables, characterCount) { // syllables = ['●','○'] or ['?']
    let syllableIndex = 0;
    let output = "";
    if (syllables.length >= characterCount) {
        return syllables.join('');
    } else if (syllables.length <= Math.floor(characterCount / 2)) {
        const leap = Math.floor(characterCount / syllables.length);
        for (let i = 0; i < characterCount; i++) {
            if (i % leap == Math.floor(leap / 2) && syllableIndex < syllables.length) {
                output += syllables[syllableIndex];
                syllableIndex++;
            } else {
                output += " ";
            }
        }
    } else {
        const leap = Math.floor(characterCount / (characterCount - syllables.length))
        for (let i = 0; i < characterCount; i++) {
            if (i % leap == Math.floor(leap / 2) || syllableIndex >= syllables.length) {
                output += " ";
            } else {
                output += syllables[syllableIndex];
                syllableIndex++;
            }
        }
    }
    return output;
}
