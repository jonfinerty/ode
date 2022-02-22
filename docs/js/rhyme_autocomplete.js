"use strict";

let autocompleteSpan = null;

function isCursorAtEndOfLine() {
    const inputElement = document.querySelector("#input");
    const selectionPoint = inputElement.selectionStart;

    // cursor needs to either be starting a new line or have a gap after a word
    const textBeforeCursor = inputElement.value.substring(0, selectionPoint);
    const isPrecedingCharWhitespace = /\s/.test(textBeforeCursor.charAt(textBeforeCursor.length - 1))
    if (selectionPoint == 0 || !isPrecedingCharWhitespace) {
        return false;
    }

    // if first instance of a non-whitespace char is before a newline
    const textPastCursor = inputElement.value.substring(selectionPoint);
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

function fillInAutoComplete() {
    if (autocompleteSpan == null) {
        return
    }

    const rhymeRootString = autocompleteSpan.dataset.rhymeRoot;
    const rhymeIndex = parseInt(autocompleteSpan.dataset.rhymeIndex);
    const preferredSyllables = autocompleteSpan.dataset.preferredSyllables;
    const stressIndexes = getSyllableStressIndexes();
    const rhymes = getStringRhymes(rhymeRootString, preferredSyllables, stressIndexes);

    const currentSuggestion = rhymes[rhymeIndex];

    const inputElement = document.querySelector("#input");
    const selectionPoint = inputElement.selectionStart;
    const textUpToCursor = inputElement.value.substring(0, selectionPoint);
    const textBeyondCursor = inputElement.value.substring(selectionPoint);

    inputElement.value = textUpToCursor + currentSuggestion + textBeyondCursor;
    inputElement.selectionEnd = selectionPoint + currentSuggestion.length;
    onInputUpdated();
}

function nextAutocompleteSuggestion() {
    if (autocompleteSpan == null) {
        return
    }
    const rhymeRootString = autocompleteSpan.dataset.rhymeRoot;
    let rhymeIndex = parseInt(autocompleteSpan.dataset.rhymeIndex);
    const preferredSyllables = autocompleteSpan.dataset.preferredSyllables;
    const stressIndexes = getSyllableStressIndexes();
    const rhymes = getStringRhymes(rhymeRootString, preferredSyllables, stressIndexes);
     
    // i.e. there's a next one to go to
    if (rhymeIndex + 1 < rhymes.length) {
        rhymeIndex += 1;
        autocompleteSpan.innerText = rhymes[rhymeIndex];
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
    const stressIndexes = getSyllableStressIndexes();
    const rhymes = getStringRhymes(rhymeRootString, preferredSyllables,stressIndexes);

    // i.e. there's a next one to go to
    if (rhymeIndex - 1 >= 0) {
        rhymeIndex -= 1;
        autocompleteSpan.innerText = rhymes[rhymeIndex];
        autocompleteSpan.dataset.rhymeIndex = rhymeIndex;
    }

}

function showAutocomplete() {
    autocompleteSpan?.remove();
    autocompleteSpan = null;

    if (getPoemLineNumberOfCursor() == 0) {
        return;
    }

    const inputElement = document.querySelector("#input");
    const displayElement = document.querySelector("#display");

    const currentPoemLineNumber = getPoemLineNumberOfCursor();
    const currentInputLineNumber = getInputLineNumberOfCursor();

    const previousLastWordSpan = document.querySelector(".last-word[data-poem-line-number=\"" + (currentPoemLineNumber - 1) + "\"]");
    const precedingSpan = document.querySelector(".last-word[data-input-line-number=\"" + currentInputLineNumber + "\"]");

    const rhymeTarget = getRhymeTarget(currentPoemLineNumber, currentInputLineNumber);
    autocompleteSpan = createAutocompleteSpan(rhymeTarget);
    
    // text node has to start from a word boundary
    // so get end of input text (up to selection) from last word boundary, thats then before the new span and (text node - this prefix) is after
    const textNode = precedingSpan ? precedingSpan.nextSibling : previousLastWordSpan.nextSibling;
    const selectionPoint = inputElement.selectionStart;
    const textUpToCursor = inputElement.value.substring(0, selectionPoint);
    const whiteSpaceGroups = textUpToCursor.split(/\w+/g);
    const textPastLastWord = whiteSpaceGroups[whiteSpaceGroups.length-1];

    displayElement.insertBefore(autocompleteSpan, textNode);
    displayElement.insertBefore(document.createTextNode(textPastLastWord), autocompleteSpan);
    textNode.textContent = textNode.textContent.substring(textPastLastWord.length);
}

function getRhymeTarget(currentPoemLineNumber, currentInputLineNumber) {

    const isBlankLine = document.querySelector(".word[data-input-line-number=\"" + currentInputLineNumber + "\"]") == null;

    // first previous non rhymed word, up to 4 lines back, if all rhymed, then just the previous one
    const rhymeWindow = 4;
    let targetPoemLine = currentPoemLineNumber - 1;
    for (let poemLineIndex = currentPoemLineNumber-1; poemLineIndex > Math.max(0,(currentPoemLineNumber-rhymeWindow)); poemLineIndex--) {
        // check if last word is a rhyme
        if (document.querySelector(".rhyme.last-word[data-poem-line-number=\""+poemLineIndex+"\"]") == null) {
            targetPoemLine = poemLineIndex;
            break;
        }
    }

    const rhymeTargetLineSyllableCount = getSyllableCountOfPoemLine(targetPoemLine);
    const currentLineSyllableCount = isBlankLine ? 0 : getSyllableCountOfPoemLine(currentPoemLineNumber);

    const missingSyllableCount = rhymeTargetLineSyllableCount - currentLineSyllableCount;

    const lineSyllableStresses = getSyllableStressIndexesOfLine(targetPoemLine);
    const targetSyllableStresses = lineSyllableStresses.filter(stressIndex => stressIndex >= currentLineSyllableCount).map(stressIndex => stressIndex - currentLineSyllableCount);

    const targetLineRhymeSpan = document.querySelector(".last-word[data-poem-line-number=\"" + targetPoemLine + "\"]");

    return {
        rhymeRoot: targetLineRhymeSpan.innerText,
        syllableCount: missingSyllableCount,
        syllableStressIndexes: targetSyllableStresses
    }
}

function getSyllableStressIndexesOfLine(poemLine) {
    const lineWords = document.querySelectorAll(".word[data-poem-line-number=\""+poemLine+"\"]");
    const syllableStresses = [];
    let syllableCount = 0;
    for (let i = 0; i < lineWords.length; i++) {
        const wordSpan = lineWords[i];
        const word = new Word(wordSpan.innerText);
        if (word.firstStressedSyllableIndex != -1) {
            syllableStresses.push(word.firstStressedSyllableIndex - syllableCount);
        }
        if (word.secondStressedSyllableIndex != -1) {
            syllableStresses.push(word.secondStressedSyllableIndex - syllableCount);
        }
        syllableCount += word.syllableCount;
    }

    return syllableStresses;
}

function createAutocompleteSpan(rhymeTarget) {
    const {rhymeRoot, syllableCount, syllableStressIndexes} = rhymeTarget;
    var rhymes = getStringRhymes(rhymeRoot, syllableCount, syllableStressIndexes);

    var text = rhymes.length ? rhymes[0] : "No rhymes found"
    
    autocompleteSpan = document.createElement("span");
    autocompleteSpan.id = "autocomplete";
    autocompleteSpan.innerText = text;
    autocompleteSpan.dataset.rhymeRoot = rhymeRoot;
    autocompleteSpan.dataset.rhymeIndex = 0;
    autocompleteSpan.dataset.preferredSyllables = syllableCount;
    autocompleteSpan.dataset.syllableStressIndexes = syllableStressIndexes
    return autocompleteSpan;
}

function getSyllableStressIndexes() {
    return autocompleteSpan.dataset.syllableStressIndexes.split(',').map(s => parseInt(s));
}
