"use strict";

let rhymeCounter = 0;
let colourCount = 10;

function applyRhymeHighlighting() {
    rhymeCounter = 0;

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
        const word1IsEndOfLine = span1.classList.contains("last-word");
        if (!word1IsEndOfLine && (!includeParticlesAndUnknown && (word1.isParticle() || word1.isUnknownType()))) {
            return;
        }

        for (let i = index + 1; i < Math.min(index + maximumDistance, spans.length); i++) {
            const span2 = spans[i];
            const word2 = spansAndWords[i][1];

            const word2IsEndOfLine = span2.classList.contains("last-word");
            if (!word2IsEndOfLine && (!includeParticlesAndUnknown && (word2.isParticle() || word2.isUnknownType()))) {
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

    if (span1RhymeScheme != null && span2RhymeScheme != null) {
        //need to merge two rhyme groups
        const resultingRhymeScheme = Math.min(span1RhymeScheme, span2RhymeScheme);
        const rhymeSchemeToBeOverridden = Math.max(span1RhymeScheme, span2RhymeScheme);
        const elementsWithRhymeToBeUpdated = document.querySelectorAll(".rhyme-" + rhymeSchemeToBeOverridden);
        for (let i = 0; i < elementsWithRhymeToBeUpdated.length; i++) {
            const element = elementsWithRhymeToBeUpdated[i];
            element.classList.remove("rhyme-" + rhymeSchemeToBeOverridden);
            element.classList.add("rhyme-" + resultingRhymeScheme);
        }
    } else if (span1RhymeScheme != null) {
        span2.classList.add("rhyme-" + span1RhymeScheme);
    } else if (span2RhymeScheme != null) {
        span1.classList.add("rhyme-" + span2RhymeScheme);
    } else {
        //todo increase from 16 colours
        span1.classList.add("rhyme-" + (rhymeCounter % colourCount));
        span2.classList.add("rhyme-" + (rhymeCounter % colourCount));
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

    return null;
}

function currentLineRhymes() {
    const lineNumber = getInputLineNumberOfCursor();
    return document.querySelector(".rhyme.last-word[data-input-line-number=\"" + lineNumber + "\"]") != null;
}