
let rhymeIndex = {};
let currentHoveredWord = null;
let lastWordToBeHovered = null;
let hoverTimeout = null;

function buildRhymeIndex() {
    for (var key in wordDict) {
        const word = new Word(key);
        word.rhymeGroupIds.forEach(rhymeGroupId => {
            const rhymeGroup = rhymeIndex[rhymeGroupId];
            if (rhymeGroup) {
                rhymeIndex[rhymeGroup].push(word.text);
            } else {
                rhymeIndex[rhymeGroup] = [word.text];
            }
        });
    }
}

document.getElementById('rhyme-suggestions-container').addEventListener('mouseenter', function(e) {
    clearTimeout(hoverTimeout);
});

// make more efficient
function coordinatesToWordSpan(x, y) {
    // maybe don't look this up every move?
    const wordSpans = document.querySelectorAll(".word");
    for (var i=0; i<wordSpans.length; i++) {
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

// oh no. make more efficient?
document.getElementById('grid-container').addEventListener('mousemove', function(event) {
    const x = event.clientX;
    const y = event.clientY;

    // if we're in the same ol' word, just shortcut;
    if (currentHoveredWord) {
        const boundaries = currentHoveredWord.getBoundingClientRect();
        const insideX = x >= boundaries.left && x <= boundaries.right;
        const insideY = y >= boundaries.top && y <= boundaries.bottom;
        if (insideX && insideY) {
            return;
        }
    }

    const wordSpan = coordinatesToWordSpan(x, y);
    if (wordSpan != currentHoveredWord) {
        currentHoveredWord = wordSpan;
        lastWordToBeHovered = wordSpan;
        onHoverWordChanged(currentHoveredWord);
    } else if (currentHoveredWord) {
        currentHoveredWord = null;
        onHoverWordChanged(currentHoveredWord);
    }
});

// can be null
function onHoverWordChanged(wordSpan) {
    clearTimeout(hoverTimeout);
    if (!wordSpan) {
        return;
    }
    hoverTimeout = setTimeout((word) => {
        showRhymeSuggestions(word);    
    }, 1000, wordSpan);
}

function rhymeSuggestionsShowing() {
<<<<<<< HEAD
    var suggestionsContainer = document.querySelector('#rhyme-suggestions-container');
    console.log(!suggestionsContainer.classList.contains("hidden"))
=======
    const suggestionsContainer = document.querySelector('#rhyme-suggestions-container');
>>>>>>> 1f4fe12b3f5f2c75dea25863e847853e72cc3233
    return !suggestionsContainer.classList.contains("hidden");
}

function hideRhymeSuggestions() {
    const suggestionsContainer = document.querySelector('#rhyme-suggestions-container');
    suggestionsContainer.classList.add("hidden");
}

function showRhymeSuggestionsAtCursor() {
    var xy = getCursorXY();
    // nudge left and right for cursor at end or beginning of word
    var wordspan = coordinatesToWordSpan(xy.x+3, xy.y+2) || coordinatesToWordSpan(xy.x-3, xy.y+2);
    if (wordspan != null) {
        showRhymeSuggestions(wordspan);
    }     
}

function showRhymeSuggestions(wordSpan) {
    const wordSpanPos = wordSpan.getBoundingClientRect();
    let rhymeCssClass = null;
    for (let i = 0; i<wordSpan.classList.length; i++) {
        const className = wordSpan.classList[i];
        if (className.startsWith('rhyme-')) {
            rhymeCssClass = className;
        }
    }
    const rhymes = getStringRhymes(wordSpan.innerText);
    if (rhymes.length == 0) {
        return;
    }
    const suggestionsContainer = document.querySelector('#rhyme-suggestions-container');
    suggestionsContainer.style.left = wordSpanPos.right + 20 +'px';
    suggestionsContainer.style.top = wordSpanPos.top -20 +'px';
    suggestionsContainer.classList.remove("hidden");

    const suggestions = document.querySelector("#rhyme-suggestions");
    removeClassesByPrefix(suggestions, "rhyme-");
    if (rhymeCssClass) {
        suggestions.classList.add(rhymeCssClass);
    }
    suggestions.innerHTML = rhymes.map(r => {return "<span>" + r + "</span>"}).join("<br>");
    suggestions.scrollTop = 0;
}

function getStringRhymes(inputString) {
    const word = getWord(inputString);
    const rhymingWords = [];

    if (!word) {
        return rhymingWords;
    }

    const rhymeGroupIds = word.rhymeGroupIds;
    rhymeGroupIds.forEach(rhymeGroupId => {
        rhymeGroupString = rhymeIndex[rhymeGroupId];
        rhymeGroupStrings.forEach(rhymingString => {
            var rhymingWord = new Word(rhymingString);
            rhymingWords.push(rhymingWord);
        });
    });

    rhymingWords.sort(rhymeSort);

    rhymingWords = rhymingWords.map(word => {
        return word.text;
    }).filter((word, index, list) => {
        return list.indexOf(word) == index && word != inputWord; // remove dups and the given word
    });

    return rhymingWords;
}

function rhymeSort(word1, word2) {

    // proper nouns last


    return word2.frequency - word1.frequency;
}

function removeClassesByPrefix(element, prefix) {
    for(let i = element.classList.length - 1; i >= 0; i--) {
        if(element.classList[i].startsWith(prefix)) {
            element.classList.remove(element.classList[i]);
        }
    }
}

function getCursorXY() {
    let inputElement = document.querySelector("#input");
    const {
      offsetLeft: inputX,
      offsetTop: inputY,
    } = inputElement

    const div = document.createElement('div')
    const copyStyle = getComputedStyle(inputElement)
    for (const prop of copyStyle) {
      div.style[prop] = copyStyle[prop]
    }

    const inputValue = input.value
    const selectionPoint = inputElement.selectionStart;
    const textContent = inputValue.substr(0, selectionPoint);
    div.innerHTML = textContent.replace(/\n/g, "<br>");;

    const span = document.createElement('span')

    span.textContent = inputValue.substr(selectionPoint) || '.'
    div.appendChild(span)
    document.body.appendChild(div)

    const { offsetLeft: spanX, offsetTop: spanY } = span;
    const { offsetLeft: mirrorDivX, offsetTop: mirrorDivY } = div;

    document.body.removeChild(div)
    return {
      x: inputX + spanX - mirrorDivX,
      y: inputY + spanY - mirrorDivY,
    }
  }