"use strict";

class Word {

    constructor(string) {

        const properties = getBestFitWordProperties(string);

        if (properties) {
            this.isKnownWord = true;
            this.text = string;
            this.syllableCount = properties[0];
            this.firstStressedSyllableIndex = properties[1];
            this.secondStressedSyllableIndex = properties[2];
            this.rhymeGroupIds = properties[3];
            this.frequency = properties[4];
            this.tags = properties[5];
        } else {
            this.isKnownWord = false;
            this.text = string;
            this.syllableCount = Math.floor(string.length / 4) + 1;
            this.firstStressedSyllableIndex = -1;
            this.secondStressedSyllableIndex = -1;
            this.rhymeGroupIds = [];
            this.frequency = 0;
            this.tags = ['u'];
        }
    }

    isParticle() {
        return this.tags.includes('p');
    }

    isJustProperNoun() {
        return (this.tags.length == 2 && this.tags.includes('n') && this.tags.includes('prop')) ||
            (this.tags.length == 1 && this.tags.includes('prop'));
    }

    isUnknownType() {
        return this.tags.length == 1 && this.tags.includes('u');
    }

    rhymesWith(otherWord) {
        // controversial time!
        const thisText = standardiseText(this.text);
        const otherText = standardiseText(otherWord.text);
        if (thisText == otherText) {
            return false;
        }

        return this.rhymeGroupIds.some(rhymeGroupId => otherWord.rhymeGroupIds.includes(rhymeGroupId));
    }

    getDisplaySyllables() {
        const syllableArray = [];

        for (var i = 0; i < this.syllableCount; i++) {
            if (i == this.firstStressedSyllableIndex || i == this.secondStressedSyllableIndex) {
                syllableArray.push('●');
            } else {
                this.isKnownWord ? syllableArray.push('○') : syllableArray.push('?')
            }
        }

        return syllableArray;
    }
}

function standardiseText(text) {
    return text.replace(/’/g, "'").toLowerCase(); 
}

// to: think about rhyme groups and the 'x'less variants
function getBestFitWordProperties(string) {
    let standardisedText = standardiseText(string);

    if (standardisedText in wordDict) {
        return wordDict[standardisedText];
    }

    const aposSLessWord = standardisedText.replace(/(\'s)$/g, "");
    if (aposSLessWord in wordDict) {
        return wordDict[aposSLessWord];
    }

    const aposLessWord = standardisedText.replace(/(\')/g, "");
    if (aposLessWord in wordDict) {
        return wordDict[aposLessWord];
    }

    const llLessWord =  standardisedText.replace(/(\'ll)$/g, "");
    if (llLessWord in wordDict) {
        return wordDict[llLessWord];
    }

    const dLessWord =  standardisedText.replace(/(\'d)$/g, "");
    if (dLessWord in wordDict) {
        return wordDict[dLessWord];
    }

    const veLessWord =  standardisedText.replace(/(\'ve)$/g, "");
    if (veLessWord in wordDict) {
        return wordDict[veLessWord];
    }

    const sLessWord = standardisedText.replace(/s$/g, "");
    if (sLessWord in wordDict) {
        return wordDict[sLessWord];
    }

    const esLessWord = standardisedText.replace(/es$/g, "");
    if (esLessWord in wordDict) {
        return wordDict[esLessWord];
    }

    const ingLessWord = standardisedText.replace(/ing$/g, "");
    if (ingLessWord in wordDict) {
        let ingWordProps = wordDict[ingLessWord];
        return [
            ingWordProps[0] + 1,
            ingWordProps[1],
            ingWordProps[2],
            ingWordProps[3],
            ingWordProps[4],
            ingWordProps[5]
        ];
    }

    const edLessWord = standardisedText.replace(/ed$/g, "");
    if (edLessWord in wordDict) {
        let edWordProps = wordDict[edLessWord];
        return [
            edWordProps[0] + 1,
            edWordProps[1],
            edWordProps[2],
            edWordProps[3],
            edWordProps[4],
            edWordProps[5]
        ];
    }

    return null;
}