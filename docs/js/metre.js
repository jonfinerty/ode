"use strict";

function updateMetre() {
    const metreFontSize = getCanvasFont(document.querySelector("#metre"));
    const displayFontSize = getCanvasFont(document.querySelector("#display"));
    const metreCharacterSize = getTextWidth("●", metreFontSize);
    const input_element = document.querySelector("#input")
    const text = input_element.value;
    let metre = "";
    let syllablesOutput = "";

    let lines = splitTextToLines(text);
    lines.forEach(line => {
        var lineSyllableCount = 0;
        var lineMetre = "";
        const words = splitLineToWords(line);

        let runningTextLength = 0;
        let runningMetreLength = 0;
        words.forEach(word => {
            const wordIndex = line.indexOf(word.text);
            const precedingWhitespaceAndPunctuation = line.substring(0, wordIndex);
            const precedingSize = getTextWidth(precedingWhitespaceAndPunctuation, displayFontSize);

            runningTextLength += precedingSize;

            //how many spaces to get up to runningTextLength from runningMetreLength
            const spacesNeeded = Math.floor((Math.max(0, runningTextLength - runningMetreLength) / metreCharacterSize) + 0.4); //favour an extra space
            lineMetre += "&nbsp;".repeat(spacesNeeded);
            runningMetreLength += spacesNeeded * metreCharacterSize;

            const wordSize = getTextWidth(word.text, displayFontSize);
            runningTextLength += wordSize;
            const metreCharactersNeeded = Math.floor(wordSize / metreCharacterSize);

            const wordMetre = distributeEvenly(word.getDisplaySyllables(), metreCharactersNeeded);
            lineMetre += wordMetre
            runningMetreLength += (metreCharactersNeeded * metreCharacterSize);

            while ((runningTextLength - runningMetreLength) > 0) {
                lineMetre += "&nbsp;"
                runningMetreLength += metreCharacterSize;
            }

            line = line.substring(wordIndex + word.text.length);
        });

        if (lineSyllableCount == 0) {
            syllablesOutput += '<br>';
        } else {
            syllablesOutput += lineSyllableCount + '<br>';
        }
        metre = metre + lineMetre + '<br>';
    })

    const metreElement = document.querySelector("#metre");
    metreElement.innerHTML = metre;
    const syllablesElement = document.querySelector("#syllables");
    syllablesElement.innerHTML = syllablesOutput;
}

function getTextWidth(text, font) {
    // re-use for better performance
    const canvas = getTextWidth.canvas || (getTextWidth.canvas = document.createElement("canvas"));
    const context = canvas.getContext("2d");
    context.font = font;
    const metrics = context.measureText(text);
    return metrics.width;
}

function getCssStyle(element, prop) {
    return window.getComputedStyle(element, null).getPropertyValue(prop);
}

function getCanvasFont(el = document.body) {
    const fontWeight = getCssStyle(el, 'font-weight') || 'normal';
    const fontSize = getCssStyle(el, 'font-size') || '16px';
    const fontFamily = getCssStyle(el, 'font-family') || 'Times New Roman';
    return `${fontWeight} ${fontSize} ${fontFamily}`;
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
                output += "&nbsp;";
            }
        }
    } else {
        const leap = Math.floor(characterCount / (characterCount - syllables.length))
        for (let i = 0; i < characterCount; i++) {
            if (i % leap == Math.floor(leap / 2) || syllableIndex >= syllables.length) {
                output += "&nbsp;";
            } else {
                output += syllables[syllableIndex];
                syllableIndex++;
            }
        }
    }
    return output;
}
