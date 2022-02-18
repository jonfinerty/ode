
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

// oh no. make more efficient?
document.getElementById('grid-container').addEventListener('mousemove', function(e) {
    var x = e.clientX;
    var y = e.clientY;

    // if we're in the same ol' word, just shortcut;
    if (currentHoveredWord) {
        let boundaries = currentHoveredWord.getBoundingClientRect();
        var insideX = x >= boundaries.left && x <= boundaries.right;
        var insideY = y >= boundaries.top && y <= boundaries.bottom;
        if (insideX && insideY) {
            return;
        }
    }

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
            if (currentHoveredWord != wordSpan) {
                currentHoveredWord = wordSpan;
                lastWordToBeHovered = wordSpan;
                onHoverWordChanged(currentHoveredWord);
            }
            return;
        } 
    }
    if (currentHoveredWord) {
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
    return !suggestionsContainer.classList.contains("hidden");
}

function hideRhymeSuggestions() {
    var suggestionsContainer = document.querySelector('#rhyme-suggestions-container');
    suggestionsContainer.classList.add("hidden");
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