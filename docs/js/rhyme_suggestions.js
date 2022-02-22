"use strict";

let rhymeIndex = {};
let currentHoveredWordSpan = null;
let rhymeSuggestionWordSpanAnchor = null;
let rhymeSuggestionTimeout = null;

function buildRhymeIndex() {
    for (var key in wordDict) {
        const word = new Word(key);
        word.rhymeGroupIds.forEach(rhymeGroupId => {
            const rhymeGroup = rhymeIndex[rhymeGroupId];
            if (rhymeGroup) {
                rhymeIndex[rhymeGroupId].push(word.text);
            } else {
                rhymeIndex[rhymeGroupId] = [word.text];
            }
        });
    }
}

document.getElementById('rhyme-suggestions-container').addEventListener('mouseenter', function (e) {
    clearTimeout(rhymeSuggestionTimeout);
});

function onRhymeSuggestionsKeydown(event) {
    switch (event.key) {
        case "Down": // IE/Edge specific value
        case "ArrowDown":
            break;
        case "Up": // IE/Edge specific value
        case "ArrowUp":
            break;
        default:
            hideRhymeSuggestions();
            document.querySelector("#input").focus();
    }
}

// make more efficient
function viewPortCoordinatesToWordSpan(x, y) {

    // menu covers words
    // const menuBoundaries = document.querySelector('#menu').getBoundingClientRect();
    // const insideMenuX = x >= menuBoundaries.left && x <= menuBoundaries.right;
    // const insideMenuY = y >= menuBoundaries.top && y <= menuBoundaries.bottom;
    // if (insideMenuX && insideMenuY) {
    //     return;
    // }

    // maybe don't look this up every move?
    const wordSpans = document.querySelectorAll(".word");
    for (let i = 0; i < wordSpans.length; i++) {
        const wordSpan = wordSpans[i];
        const boundaries = wordSpan.getBoundingClientRect();
        const insideX = x >= boundaries.left && x <= boundaries.right;
        if (!insideX) {
            continue;
        }
        const insideY = y >= boundaries.top && y <= boundaries.bottom;
        if (insideY) {
            return wordSpan;
        }
    }

    return null;
}

function documentCoordinatesToWordSpan(x, y) {
    return viewPortCoordinatesToWordSpan(x - window.scrollX, y - window.scrollY);
}

// oh no. make more efficient?
document.addEventListener('mousemove', function (event) {
    const x = event.clientX;
    const y = event.clientY;

    const wordSpan = viewPortCoordinatesToWordSpan(x, y);
    //wordSpan can be null, when no word is under x,y
    if (wordSpan != currentHoveredWordSpan) {
        currentHoveredWordSpan = wordSpan;
        onHoveredWordSpanChanged(currentHoveredWordSpan);
    }
});

// can be null
function onHoveredWordSpanChanged(wordSpan) {
    clearTimeout(rhymeSuggestionTimeout);
    if (!wordSpan) {
        return;
    }
    rhymeSuggestionTimeout = setTimeout((scopedWordSpan) => {
        showRhymeSuggestions(scopedWordSpan);
    }, 1500, wordSpan);
}

function rhymeSuggestionsShowing() {
    const suggestionsContainer = document.querySelector('#rhyme-suggestions-container');
    return !suggestionsContainer.classList.contains("hidden");
}

function hideRhymeSuggestions() {
    const suggestionsContainer = document.querySelector('#rhyme-suggestions-container');
    suggestionsContainer.classList.add("hidden");
}

function getWordSpanAtCursor() {
    // if cursor at end of line
    var xy = getCursorDocumentXY();
    // nudge left and right for cursor at end or beginning of word
    return documentCoordinatesToWordSpan(xy.x + 3, xy.y + 2) || documentCoordinatesToWordSpan(xy.x - 3, xy.y + 2);
}

function showRhymeSuggestionsAtCursor() {

    const wordSpan = getWordSpanAtCursor();

    if (wordSpan != null) {
        showRhymeSuggestions(wordSpan);
    }
}

function rerenderRhymeSuggestions() {
    if (rhymeSuggestionsShowing()) {
        showRhymeSuggestions(rhymeSuggestionWordSpanAnchor);
    }
}

function showRhymeSuggestions(wordSpan) {
    hideAutocomplete();

    rhymeSuggestionWordSpanAnchor = wordSpan;
    const wordSpanPos = wordSpan.getBoundingClientRect();
    let rhymeCssClass = null;
    for (let i = 0; i < wordSpan.classList.length; i++) {
        const className = wordSpan.classList[i];
        if (className.startsWith('rhyme-')) {
            rhymeCssClass = className;
        }
    }
    const rhymes = getStringRhymes(wordSpan.innerText);
    if (rhymes.length == 0) {
        rhymes.push("No rhymes found");
    }

    const suggestionsContainer = document.querySelector('#rhyme-suggestions-container');

    suggestionsContainer.style.left = window.scrollX + wordSpanPos.right + 20 + 'px';
    suggestionsContainer.style.top = window.scrollY + wordSpanPos.y - 20 + 'px';
    suggestionsContainer.classList.remove("hidden");

    const suggestions = document.querySelector("#rhyme-suggestions");
    removeClassesByPrefix(suggestions, "rhyme-");
    if (rhymeCssClass) {
        suggestions.classList.add(rhymeCssClass);
    }
    suggestions.innerHTML = rhymes.map(r => { return "<span>" + r + "</span>" }).join("<br>");
    suggestions.scrollTop = 0;

    const isMobileBrowser = navigator.userAgent.indexOf("Mobi") != -1;
    if (!isMobileBrowser) {
        suggestions.focus();
    }
}

function getStringRhymes(inputString, preferredSyllableCount, syllableStressIndexes) {
    const word = new Word(inputString);
    const rhymingWords = [];

    const rhymeGroupIds = word.rhymeGroupIds;
    rhymeGroupIds.forEach(rhymeGroupId => {
        const rhymeGroupStrings = rhymeIndex[rhymeGroupId] || [];
        rhymeGroupStrings.forEach(rhymingString => {
            var rhymingWord = new Word(rhymingString);
            if (!word.matches(rhymingString)) {
                rhymingWords.push(rhymingWord);
            }
        });
    });

    rhymingWords.sort(getRhymeSortComparator(preferredSyllableCount, word, syllableStressIndexes));

    const sortedFiltedRhymingStrings = rhymingWords.map(word => {
        return word.text;
    });

    return sortedFiltedRhymingStrings;
}

function getRhymeSortComparator(preferredSyllableCount, inputWord, syllableStressIndexes) {
    return function (word1, word2) {
        // if - then word1 goes first
        // if + then word2 goes first

        // proper nouns last
        // then particles
        // then freq
        if (syllableStressIndexes != null) {
            const word1MatchesStress = doesWordMatchStresses(word1, syllableStressIndexes);
            const word2MatchesStress = doesWordMatchStresses(word2, syllableStressIndexes);
            if (word1MatchesStress && !word2MatchesStress) {
                return -1;
            }
            if (!word1MatchesStress && word2MatchesStress) {
                return 1;
            }
        }

        if (preferredSyllableCount) {
            if (word1.syllableCount == preferredSyllableCount && word2.syllableCount != preferredSyllableCount) {
                return -1;
            }
            if (word1.syllableCount != preferredSyllableCount && word2.syllableCount == preferredSyllableCount) {
                return 1;
            }
        }

        if (word1.isJustProperNoun() && !word2.isJustProperNoun()) {
            return 1;
        }
        if (!word1.isJustProperNoun() && word2.isJustProperNoun()) {
            return -1;
        }

        if (word1.isParticle() && !word2.isParticle()) {
            return 1;
        }
        if (!word1.isParticle() && word2.isParticle()) {
            return -1;
        }

        // prefer words which don't just end with the same suffix e.g. "time" and "wartime"
        if (word1.sharesEnding(inputWord) && !word2.sharesEnding(inputWord)) {
            return 1;
        }
        if (!word1.sharesEnding(inputWord) && word2.sharesEnding(inputWord)) {
            return -1;
        }

        // bias towards words longer than 2 letters
        if (word1.text.length > 2 && word2.text.length <= 2) {
            return -1;
        }
        if (word1.text.length <= 2 && word2.text.length > 2) {
            return 1;
        }

        return word2.frequency - word1.frequency;
    }
}

function doesWordMatchStresses(word, stressedIndexes) {
    let matches = true;
    stressedIndexes.forEach(stressedIndex => {
        if (word.firstStressedSyllableIndex != stressedIndex && word.secondStressedSyllableIndex != stressedIndex) {
            matches = false;
        }
    });

    return matches;
}

function removeClassesByPrefix(element, prefix) {
    for (let i = element.classList.length - 1; i >= 0; i--) {
        if (element.classList[i].startsWith(prefix)) {
            element.classList.remove(element.classList[i]);
        }
    }
}

function getCursorDocumentXY() {
    const inputElement = document.querySelector("#input");
    const displayElement = document.querySelector("#display");
    const {
        offsetLeft: inputX,
        offsetTop: inputY,
    } = inputElement
    const preElement = document.createElement('pre')
    const copyStyle = getComputedStyle(displayElement)
    for (const prop of copyStyle) {
        preElement.style[prop] = copyStyle[prop]
    }

    const inputValue = inputElement.value
    const selectionPoint = inputElement.selectionStart;
    const textContent = inputValue.substring(0, selectionPoint);
    preElement.innerHTML = textContent;

    const span = document.createElement('span')

    span.textContent = '.';
    preElement.appendChild(span)
    document.body.appendChild(preElement)

    const { offsetLeft: spanX, offsetTop: spanY } = span;
    const { offsetLeft: mirrorDivX, offsetTop: mirrorDivY } = preElement;

    document.body.removeChild(preElement)
    return {
        x: inputX + spanX - mirrorDivX,
        y: inputY + spanY - mirrorDivY
    }
}