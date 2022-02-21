"use strict";

let autocompleteSpan = null;

function isCursorAtEndOfLine() {
    const inputElement = document.querySelector("#input");
    const selectionPoint = inputElement.selectionStart;
    const textPastCursor = inputElement.value.substring(selectionPoint);

    // if first instance of a non-whitespace char is before a newline
    const firstNonWhitespaceCharIndex = textPastCursor.search(/\S/);
    const firstNewLineIndex = textPastCursor.indexOf('\n');
    if (firstNewLineIndex == -1) {
        return firstNonWhitespaceCharIndex == -1;
    } else {
        return firstNonWhitespaceCharIndex > firstNewLineIndex
    }
}

function getInputLineNumberOfCursor() {
    const inputElement = document.querySelector("#input");
    const selectionPoint = inputElement.selectionStart;
    const textUpToCursor = inputElement.value.substring(0, selectionPoint);

    return textUpToCursor.split(/\n/g).length - 1;
}

function getPoemLineNumberOfCursor() {
    const inputElement = document.querySelector("#input");
    const selectionPoint = inputElement.selectionStart;
    const textUpToCursor = inputElement.value.substring(0, selectionPoint);

    // whitespace with atleast 1 newline
    return textUpToCursor.trimStart().split(/\s*\n+\s*/g).length - 1;
}

function isAutocompleteShowing() {
    return autocompleteSpan != null;
}

function hideAutocomplete() {
    autocompleteSpan?.remove();
    autocompleteSpan = null;
}

function nextAutocompleteSuggestion() {
    if (autocompleteSpan == null) {
        return
    }
    const rhymeRootString = autocompleteSpan.dataset.rhymeRoot;
    let rhymeIndex = parseInt(autocompleteSpan.dataset.rhymeIndex);
    const preferredSyllables = autocompleteSpan.dataset.preferredSyllables;
    const rhymes = getStringRhymes(rhymeRootString, preferredSyllables);
     
    // i.e. there's a next one to go to
    if (rhymeIndex + 1 < rhymes.length) {
        rhymeIndex += 1;
        autocompleteSpan.innerText = " " + rhymes[rhymeIndex];
        autocompleteSpan.dataset.rhymeIndex = rhymeIndex;
    }

}

function previousAutocompleteSuggestion() {
    if (autocompleteSpan == null) {
        return
    }
    const rhymeRootString = autocompleteSpan.dataset.rhymeRoot;
    let rhymeIndex = parseInt(autocompleteSpan.dataset.rhymeIndex);
    const preferredSyllables = autocompleteSpan.dataset.preferredSyllables;
    const rhymes = getStringRhymes(rhymeRootString, preferredSyllables);

    // i.e. there's a next one to go to
    if (rhymeIndex - 1 >= 0) {
        rhymeIndex -= 1;
        autocompleteSpan.innerText = " " + rhymes[rhymeIndex];
        autocompleteSpan.dataset.rhymeIndex = rhymeIndex;
    }

}

function showAutocomplete() {
    autocompleteSpan?.remove();
    autocompleteSpan = null;

    const inputElement = document.querySelector("#input");
    const displayElement = document.querySelector("#display");

    const currentPoemLineNumber = getPoemLineNumberOfCursor();
    const currentInputLineNumber = getInputLineNumberOfCursor();
    const isBlankLine = document.querySelector(".word[data-input-line-number=\"" + currentInputLineNumber + "\"]") == null;

    const previousLineSyllableCount = getSyllableCountOfPoemLine(currentPoemLineNumber - 1);
    const currentLineSyllableCount = isBlankLine ? 0 : getSyllableCountOfPoemLine(currentPoemLineNumber);

    const preferredSyllables = previousLineSyllableCount - currentLineSyllableCount;

    const previousLastWordSpan = document.querySelector(".last-word[data-poem-line-number=\"" + (currentPoemLineNumber - 1) + "\"]");

    const precedingSpan = document.querySelector(".last-word[data-input-line-number=\"" + currentInputLineNumber + "\"]");

    autocompleteSpan = createAutocompleteSpan(previousLastWordSpan.innerText, preferredSyllables);
    if (precedingSpan) {
        displayElement.insertBefore(autocompleteSpan, precedingSpan.nextSibling);
        return;
    }

    // text node has to start from a word boundary
    // so get end of input text (up to selection) from last word boundary, thats then before the new span and (text node - this prefix) is after
    const textNode = previousLastWordSpan.nextSibling;
    const selectionPoint = inputElement.selectionStart;
    const textUpToCursor = inputElement.value.substring(0, selectionPoint);
    const whiteSpaceGroups = textUpToCursor.split(/\w+/g);
    const textPastLastWord = whiteSpaceGroups[whiteSpaceGroups.length-1];

    displayElement.insertBefore(autocompleteSpan, textNode);
    displayElement.insertBefore(document.createTextNode(textPastLastWord), autocompleteSpan);
    textNode.textContent = textNode.textContent.substring(textPastLastWord.length);
}

function createAutocompleteSpan(rhymeRoot, preferredSyllables) {
    var rhymes = getStringRhymes(rhymeRoot, preferredSyllables);

    var text = rhymes.length ? rhymes[0] : "No rhymes found"
    
    autocompleteSpan = document.createElement("span");
    autocompleteSpan.id = "autocomplete";
    autocompleteSpan.innerText = " " + text;
    autocompleteSpan.dataset.rhymeRoot = rhymeRoot;
    autocompleteSpan.dataset.rhymeIndex = 0;
    autocompleteSpan.dataset.preferredSyllables = preferredSyllables;
    return autocompleteSpan;
}
