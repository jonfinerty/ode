
let rhymeIndex = {};
let currentHoveredWord = null;
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
        showRhymeSuggestions(word.innerText);    
    }, 1000, wordSpan);
}

function showRhymeSuggestions(word) {
    let rhymes = getWordRhymes(word);
    var suggestions = document.querySelector("#rhyme-suggestions");
    suggestions.innerText = rhymes.join(" ");
}

function getWordRhymes(inputWord) {
    var wordProps = getWordProps(inputWord);
    var rhymeGroups = wordProps[3]
    var rhymingWords = [];
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
    // todo order, dedup
    return rhymingWords;
}