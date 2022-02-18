

function updateMetre() {
    let metreFontSize = getCanvasFont(document.querySelector("#metre"));
    let displayFontSize = getCanvasFont(document.querySelector("#display"));
    let metreCharacterSize = getTextWidth("●", metreFontSize);
    let input_element = document.querySelector("#input")
    let text = input_element.value;
    let metre = "";
    let syllablesOutput = "";

    let lines = splitTextToLines(text);
    lines.forEach(line => {
        var lineSyllableCount = 0;
        var lineMetre = "";
        let words = splitLineToWords(line);

        let runningTextLength = 0;
        let runningMetreLength = 0;
        words.forEach(word => {
            let wordProps = getWordProps(word);
            let wordIndex = line.indexOf(word);
            let precedingWhitespaceAndPunctuation = line.substring(0, wordIndex);
            let precedingSize = getTextWidth(precedingWhitespaceAndPunctuation, displayFontSize);

            runningTextLength += precedingSize;

            //how many spaces to get up to runningTextLength from runningMetreLength
            let spacesNeeded = Math.floor((Math.max(0, runningTextLength - runningMetreLength) / metreCharacterSize) + 0.4); //favour an extra space
            lineMetre += "&nbsp;".repeat(spacesNeeded);
            runningMetreLength += spacesNeeded * metreCharacterSize;

            let wordSize = getTextWidth(word, displayFontSize);
            runningTextLength += wordSize;
            let metreCharactersNeeded = Math.floor(wordSize / metreCharacterSize);
            let syllableArray = [];
            if (wordProps) {
                let syllableCount = wordProps[0];
                lineSyllableCount += syllableCount;
                for (var i = 0; i < syllableCount; i++) {
                    if (i == wordProps[1] || i == wordProps[2]) {
                        syllableArray.push('●');
                    } else {
                        syllableArray.push('○');
                    }
                }
            } else {
                syllableArray = ['?'];
                lineSyllableCount++;
                if (word.length > 4) {
                    syllableArray.push('?');
                    lineSyllableCount++;
                }
                if (word.length > 8) {
                    syllableArray.push('?');
                    lineSyllableCount++;
                }
            }
            let wordMetre = distributeEvenly(syllableArray, metreCharactersNeeded);
            lineMetre += wordMetre
            runningMetreLength += (metreCharactersNeeded * metreCharacterSize);

            while ((runningTextLength - runningMetreLength) > 0) {
                lineMetre += "&nbsp;"
                runningMetreLength += metreCharacterSize;
            }

            line = line.substring(wordIndex + word.length);
        });

        if (lineSyllableCount == 0) {
            syllablesOutput += '<br>';
        } else {
            syllablesOutput += lineSyllableCount + '<br>';
        }
        metre = metre + lineMetre + '<br>';
    })

    let metreElement = document.querySelector("#metre");
    metreElement.innerHTML = metre;
    let syllablesElement = document.querySelector("#syllables");
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
        let leap = Math.floor(characterCount / syllables.length);
        for (let i = 0; i < characterCount; i++) {
            if (i % leap == Math.floor(leap / 2) && syllableIndex < syllables.length) {
                output += syllables[syllableIndex];
                syllableIndex++;
            } else {
                output += "&nbsp;";
            }
        }
    } else {
        let leap = Math.floor(characterCount / (characterCount - syllables.length))
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
