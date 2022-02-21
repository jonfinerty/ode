"use strict";

// todo, blank lines don't increase the line counter
// can only be triggered at the end of the line
function showRhymeAutocomplete(lineNumber) {

    if (lineNumber == 0) {
        return;
    }

    const previousLineSyllableCount = getSyllableCountOfLine(lineNumber-1);
    const currentLineSyllableCount = getSyllableCountOfLine(lineNumber);

    
    const missingSyllables = previousLineSyllableCount - currentLineSyllableCount;

    const previousLastWord = document.querySelector(".last-word[data-line-number=\""+ (lineNumber-1) +"\"]");

    console.log(previousLastWord);
    var rhymes = getStringRhymes(previousLastWord.innerText, missingSyllables);
    console.log(rhymes);


    // put metre information in dom

    // insert special span at end of line with suggestion

    // tab uses it, 

    // control space triggers / cycles it
}

function addAutocompleteSpanAtCursorPosition(text) {
    // go through text of input
    const inputElement = document.querySelector("#input");
    const displayElement = document.querySelector("#display");
    const selectionPoint = inputElement.selectionStart;
    const textUpToCursor = inputElement.value.substr(0, selectionPoint);

    // todo: only trigger at EoL
    // will break if I number lines ignoring blanks
    // will need to change it to be \n+ regex
    const lineNumber = textUpToCursor.split("\n").length-1;

    const previousLineSyllableCount = getSyllableCountOfLine(lineNumber-1);
    const currentLineSyllableCount = getSyllableCountOfLine(lineNumber);

    
    const missingSyllables = previousLineSyllableCount - currentLineSyllableCount;

    const previousLastWord = document.querySelector(".last-word[data-line-number=\""+ (lineNumber-1) +"\"]");

    var rhymes = getStringRhymes(previousLastWord.innerText, missingSyllables);

    const precedingSpan = document.querySelector(".last-word[data-line-number=\""+ lineNumber +"\"]");
    const autocompleteSpan = document.createElement("span");
    autocompleteSpan.classList.add("autocomplete");
    autocompleteSpan.innerText = " " + rhymes[0];
    displayElement.insertBefore(autocompleteSpan, precedingSpan.nextSibling)
}

