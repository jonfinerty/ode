
let rhymeIndex = {};
let currentHoveredWord = null;
let lastWordToBeHovered = null;
let hoverTimeout = null;

function buildRhymeIndex() {
    for (var word in wordDict) {
        var wordProps = wordDict[word];
        if (wordProps[3]) {
            wordProps[3].forEach(rhymeGroup => {
                var rhyme = rhymeIndex[rhymeGroup];
                if (rhyme) {
                    rhymeIndex[rhymeGroup].push(word);
                } else {
                    rhymeIndex[rhymeGroup] = [word];
                }
            });
        }
    }
}

document.getElementById('rhyme-suggestions-container').addEventListener('mouseenter', function(e) {
    clearTimeout(hoverTimeout);
});

// make more efficient
function coordinatesToWordSpan(x, y) {
    // maybe don't look this up every move?
    let wordSpans = document.querySelectorAll(".word");
    for (var i=0; i<wordSpans.length; i++) {
        let wordSpan = wordSpans[i];
        let boundaries = wordSpan.getBoundingClientRect();
        var insideX = x >= boundaries.left && x <= boundaries.right;
        if (!insideX) {
            continue;
        }
        var insideY = y >= boundaries.top && y <= boundaries.bottom;
        if (insideY) {
            return wordSpan;
        } 
    }

    return null;
}

// oh no. make more efficient?
document.getElementById('grid-container').addEventListener('mousemove', function(event) {
    var x = event.clientX;
    var y = event.clientY;

    // if we're in the same ol' word, just shortcut;
    if (currentHoveredWord) {
        let boundaries = currentHoveredWord.getBoundingClientRect();
        var insideX = x >= boundaries.left && x <= boundaries.right;
        var insideY = y >= boundaries.top && y <= boundaries.bottom;
        if (insideX && insideY) {
            return;
        }
    }

    var wordSpan = coordinatesToWordSpan(x, y);
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
    var suggestionsContainer = document.querySelector('#rhyme-suggestions-container');
    console.log(!suggestionsContainer.classList.contains("hidden"))
    return !suggestionsContainer.classList.contains("hidden");
}

function hideRhymeSuggestions() {
    var suggestionsContainer = document.querySelector('#rhyme-suggestions-container');
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
    let wordSpanPos = wordSpan.getBoundingClientRect();
    let rhymeCssClass = null;
    for (let i = 0; i<wordSpan.classList.length; i++) {
        const className = wordSpan.classList[i];
        if (className.startsWith('rhyme-')) {
            rhymeCssClass = className;
        }
    }
    let rhymes = getWordRhymes(wordSpan.innerText);
    if (rhymes.length == 0) {
        return;
    }
    var suggestionsContainer = document.querySelector('#rhyme-suggestions-container');
    suggestionsContainer.style.left = wordSpanPos.right + 20 +'px';
    suggestionsContainer.style.top = wordSpanPos.top -20 +'px';
    suggestionsContainer.classList.remove("hidden");

    var suggestions = document.querySelector("#rhyme-suggestions");
    removeClassesByPrefix(suggestions, "rhyme-");
    if (rhymeCssClass) {
        suggestions.classList.add(rhymeCssClass);
    }
    suggestions.innerHTML = rhymes.map(r => {return "<span>" + r + "</span>"}).join("<br>");
    suggestions.scrollTop = 0;
}

function getWordRhymes(inputWord) {
    var wordProps = getWordProps(inputWord);
    var rhymingWords = [];

    if (!wordProps) {
        return rhymingWords;
    }

    var rhymeGroups = wordProps[3]
    rhymeGroups.forEach(rhymeGroup => {
        rhymeGroupWords = rhymeIndex[rhymeGroup];
        rhymeGroupWords.forEach(rhymingWord => {
            var rhymingWordProps = getWordProps(rhymingWord);
            rhymingWords.push([rhymingWord,rhymingWordProps]);
        });
    });

    rhymingWords.sort((w1,w2) => {
        let w1Props = w1[1];
        let w2Props = w2[1];
        return w2Props[4] - w1Props[4];
    });

    rhymingWords = rhymingWords.map(w => {
        return w[0]
    }).filter((word, index, list) => {
        return list.indexOf(word) == index && word != inputWord; // remove dups and the given word
    });

    return rhymingWords;
}

function removeClassesByPrefix(element, prefix)
{
    for(var i = element.classList.length - 1; i >= 0; i--) {
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