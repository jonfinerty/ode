"use strict";

let rhymeCounter = 1;
// thoughts 
// 1 - last word highlighting
// 2 - mid same line highlighting
// 3 - EXPERIMENT, mid line + prev line highting

function applyRhymeHighlighting() {
    rhymeCounter = 1;

    // last word rhyming
    const lastWordSpans = document.querySelectorAll(".last-word");

    // rhymes work like a sliding window
    const maximumDistance = 12;
    highlightListOfWordSpansWithRhymes(lastWordSpans, true, maximumDistance);

    // mid line rhyming
    for (let i = 0; i < lineCount; i++) {
        // "[data-foo='1']"
        const lineAndPreviousLineWordSpans = document.querySelectorAll("[data-line-number='" + (i - 1) + "'],[data-line-number='" + i + "']");
        highlightListOfWordSpansWithRhymes(lineAndPreviousLineWordSpans, false);
    }
}

function highlightListOfWordSpansWithRhymes(spans, includeParticlesAndUnknown, maximumDistance) {

    if (!maximumDistance) {
        maximumDistance = spans.length;
    }

    spans.forEach((span1, index) => {
        const word1 = new Word(span1.innerText);

        if (!includeParticlesAndUnknown && (word1.isParticle() || word1.isUnknownType())) {
            return;
        }

        for (let i = index + 1; i < Math.min(index+maximumDistance,spans.length); i++) {
            const span2 = spans[i];
            const word2 = new Word(span2.innerText);

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