"use strict";

let rhymeCounter = 1;

function applyRhymeHighlighting() {
    rhymeCounter = 1;

    // last word rhyming
    const lastWordSpans = document.querySelectorAll(".last-word");

    // rhymes work like a sliding window

    // this looks like a bit of slow code, but turns out first access of the dom
    // (through iterating lastWordSpans) is significantly slower (10x) than
    // subsequent, clearly is built somewhere
    const maximumDistance = 12;
    highlightListOfWordSpansWithRhymes(lastWordSpans, true, maximumDistance);

    // mid line rhyming
    // todo, this line count is magic
    for (let i = 0; i < lineCount; i++) {
        // input line number to stop matching across paragraph breaks;
        const lineAndPreviousLineWordSpans = document.querySelectorAll("[data-input-line-number='" + (i - 1) + "'],[data-input-line-number='" + i + "']");
        highlightListOfWordSpansWithRhymes(lineAndPreviousLineWordSpans, false);
    }
}

function highlightListOfWordSpansWithRhymes(spans, includeParticlesAndUnknown, maximumDistance) {

    if (!maximumDistance) {
        maximumDistance = spans.length;
    }

    const spansAndWords = Array.from(spans, span => [span, new Word(span.innerText)]);

    spansAndWords.forEach((spanAndWord, index) => {
        const span1 = spanAndWord[0];
        const word1 = spanAndWord[1];
        if (!includeParticlesAndUnknown && (word1.isParticle() || word1.isUnknownType())) {
            return;
        }

        for (let i = index + 1; i < Math.min(index + maximumDistance, spans.length); i++) {
            const span2 = spans[i];
            const word2 = spansAndWords[i][1];

            if (!includeParticlesAndUnknown && (word2.isParticle() || word2.isUnknownType())) {
                continue;
            }

            if (word1.rhymesWith(word2)) {
                highlightWordSpansAsRhyming(span1, span2);
            }
        }
    })
}

// going to do a bad and make rhyming transitive, lets see what happens
function highlightWordSpansAsRhyming(span1, span2) {
    span1.classList.add("rhyme");
    span2.classList.add("rhyme");

    const span1RhymeScheme = getRhymeSchemeOfSpan(span1);
    const span2RhymeScheme = getRhymeSchemeOfSpan(span2)

    if (span1RhymeScheme) {
        span2.classList.add("rhyme-" + span1RhymeScheme);
    } else if (span2RhymeScheme) {
        span1.classList.add("rhyme-" + span2RhymeScheme);
    } else {
        //todo increase from 16 colours
        span1.classList.add("rhyme-" + (rhymeCounter % 16));
        span2.classList.add("rhyme-" + (rhymeCounter % 16));
        rhymeCounter++;
    }
}

function getRhymeSchemeOfSpan(span) {
    for (let i = 0; i < span.classList.length; i++) {
        const className = span.classList[i];
        if (className.startsWith('rhyme-')) {
            return parseInt(className.substring('rhyme-'.length));
        }
    }
}