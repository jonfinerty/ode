"use strict";

class Word {

    constructor(string) {
      // todo: think about storing non standardise word and if stripping is needed?
      //const standardisedText = stripPunctuationFromWord(string).toLowerCase();
        if (string.length == 0) {
            console.log("WEIRD");
        } 

      const standardisedText = string.toLowerCase();
      let properties = null;
      if (standardisedText in wordDict) {
        properties = wordDict[standardisedText];
      }
      // try this out, if put in, need to check how highlighting works, and if need
      // to store the orginal text somewhere
      // else {
      //   standardisedText = standardisedText.replace(/(\')/g, "");
      //   if (standardisedText in wordDict) {
      //     properties = wordDict[standardisedText];
      //   }
      // }
  
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
        this.text = standardisedText;
        this.syllableCount = Math.floor(standardisedText.length / 4) + 1;
        this.firstStressedSyllableIndex = -1;
        this.secondStressedSyllableIndex = -1;
        this.rhymeGroupIds = [];
        this.frequency = 0;
        this.tags = ['u'];
      }
    }
  
    isProperNoun() {
      // some things are both a proper noun and other this
      // in this case we only the ones
      return (this.tags.length == 2 && this.tags.includes('n') && this.tags.includes('prop')) ||
             (this.tags.length == 1 && this.tags.includes('prop'));
    }
  
    rhymesWith(otherWord) {
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