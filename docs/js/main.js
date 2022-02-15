let rhymeIndex = {};

setupTabCapture();
buildRhymeIndex();
loadState();
setupPlaceholderText();
revealContent();

function setupPlaceholderText() {
  var inputElement = document.querySelector("#input");
  if (inputElement.value.trim().length == 0) {
    let randomPoem = poems[Math.floor(Math.random() * poems.length)];
    inputElement.value = randomPoem;
    onInputUpdated();
    inputElement.value = "";
    saveState(); // todo: this is a bit janky because onInputUpdated is re-saving the placeholder
    var displayElement = document.querySelector('#display');
    displayElement.classList.add('placeholder');
    
    var metreElement = document.querySelector('#metre');
    metreElement.classList.add('placeholder');
  }
}

function removePlaceholderText() {
  var displayElement = document.querySelector('#display');
  displayElement.classList.remove('placeholder');
  
  var metreElement = document.querySelector('#metre');
  metreElement.classList.remove('placeholder');
}

function setupTabCapture() {
  var inputElement = document.querySelector("#input");
  inputElement.onkeydown = function(e){
    if(e.keyCode === 9 || e.which === 9){
      e.preventDefault();
      var element = this;
      var tabStartPos = element.selectionStart;
      var tabEndPos = element.selectionEnd;
      element.value = element.value.substring(0,tabStartPos) + "\t" + element.value.substring(tabEndPos);
      element.selectionEnd = tabStartPos+1; 
      onInputUpdated();
    }
  }
}

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

function loadState() {
  let storage = window.localStorage;
  let title = storage.getItem('title');
  if (title) {
    let titleElement = document.querySelector("#title");
    titleElement.innerText = title;
  }

  let content = storage.getItem('content');
  if (content) {
    let inputElement = document.querySelector("#input");
    inputElement.value = content
    onInputUpdated();
  }
}

function saveState() {
  let storage = window.localStorage;

  let titleElement = document.querySelector("#title");
  let text = titleElement.innerText;
  storage.setItem('title',text);

  let inputElement = document.querySelector("#input");
  let content = inputElement.value;
  storage.setItem('content',content);
}

function revealContent() {
  // todo: maybe slow down, maybe wait for font?
  var flashPreventerElement = document.getElementById('flash-preventer');
  flashPreventerElement.classList.add('fade');
}

function onInputUpdated() {
  removePlaceholderText();
  updateHeights();
  updateDisplayText();
  updateWidth();
  updateMetre();
  saveState();
}

function onTitleUpdated() {
  saveState();
}

function updateHeights() {
  let input_element = document.querySelector("#input")
  let display_element = document.querySelector("#display");
  let metre_element = document.querySelector("#metre");

  input_element.style.height = "";
  let newHeight = input_element.scrollHeight + 20 + "px";
  input_element.style.height = newHeight;
  display_element.height = newHeight;
  metre_element.height = newHeight;
}

function updateWidth() {
  let inputElement = document.querySelector("#input")
  let displayElement = document.querySelector("#display");
  let metreElement = document.querySelector("#metre");
  inputElement.style.width = displayElement.clientWidth + 20 + "px"; // extra 20 so not to have a scrollbar sneak in
  inputElement.style.paddingLeft = "20px"
  metreElement.style.width = displayElement.clientWidth + 40 + "px"; // extra 40 to offset the syllable counts to the left
}

function updateDisplayText(){
  let input_element = document.querySelector("#input")
  let display_element = document.querySelector("#display");
  let text = input_element.value;
  display_element.innerText = text;
  updateHighlighting()
}

function updateHighlighting(){
  let display_element = document.querySelector("#display")
  let text = display_element.innerText;
  
  let paragraphCounter = 0;
  let rhymeSchemeCounter = 0;
  // each is [word, rhymeIndex]
  let lastWords = [[]];
  let lines = splitTextToLines(text);
  lines.forEach((line, i) => {
    let words = splitLineToWords(line);
    if (words.length == 0) {
      paragraphCounter++;
      rhymeSchemeCounter = 0;
      lastWords[paragraphCounter] = [];
      return;
    }

    let lastWord = words[words.length-1];
    let lastWordWithoutPunctuation = stripPunctuationFromWord(lastWord);
    let rhymeScheme = null;
    let rhymeFound = false;
    let rhymeFoundScheme = null;

    lastWords[paragraphCounter].forEach(previousLastWordAndRhymeScheme => {
      previousLastWord = previousLastWordAndRhymeScheme[0];
      previousLastWordRhymeScheme = previousLastWordAndRhymeScheme[1];
      let previousWordProps = getWordProps(previousLastWord);
      if (!previousWordProps) {
        return;
      }

      let rhymeGroups = previousWordProps[3];
      console.log(previousLastWord);
      console.log(previousWordProps);
      rhymeGroups.forEach(rhymeId => { 
        if (rhymeIndex[rhymeId].includes(lastWordWithoutPunctuation)) {
          rhymeFound = true;
          rhymeFoundScheme = previousLastWordRhymeScheme;
        }
      });
    })
    
    if (rhymeFound) {
      lastWords[paragraphCounter].push([lastWordWithoutPunctuation,rhymeFoundScheme]);
      rhymeScheme = rhymeFoundScheme;
    } else {
      lastWords[paragraphCounter].push([lastWordWithoutPunctuation,rhymeSchemeCounter]);
      rhymeScheme = rhymeSchemeCounter;
      rhymeSchemeCounter++;
    }
    
    var pos = line.lastIndexOf(lastWord);
    let markedUpLine = line.substring(0,pos) + "<span class=\"last-word-"+rhymeScheme+"\">" + lastWord + "</span>" + line.substring(pos+lastWord.length)
    lines[i] = markedUpLine;
    display_element.innerHTML = lines.join("\n");
  }); 
}

function splitTextToLines(text) {
  return text.split("\n");
}

function splitLineToWords(line) {
  // todo looping through the strip function seems excessive, to deal with > visitor," < case
  return line.trim().split(/(?:,|\.|\?| |:|;|-|—)+/).filter(w => stripPunctuationFromWord(w) !== '');
}

function stripPunctuationFromWord(word) {
  // todo: keep non-enclosing ' (i.e 'here' -> here, but 'bout -> 'bout, nothin' -> nothin')
  word = word.toLowerCase();
  word = word.replace("’", "'");
  //todo: improve this regex
  //text = text.replace(/(\"|<|>|{|}|\[|\]|\(|\)|\!)+/g, "")
  return word.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()<>\|"“”]/g,"");
}

function updateMetre() {
  let input_element = document.querySelector("#input")
  let text = input_element.value;
  let metre = "";

  let lines = splitTextToLines(text);
  lines.forEach(line => {
    var lineSyllableCount = 0;
    var lineMetre = "";
    let words = splitLineToWords(line);

    words.forEach(word => {
      word = word.trim();
      if (word.length === 0) {
        return;
      }
      let wordProps = getWordProps(word)

      if (wordProps == null)
      {
        lineSyllableCount += 1; // guess its one?
        lineMetre += "&nbsp;".repeat(word.length) + "?" + "&nbsp;".repeat(word.length)
        return;
      }
     
      let syllableCount = wordProps[0];
      lineSyllableCount += syllableCount; // guess its one?

      let firstStressedSyllable = wordProps[1];
      let secondStressedSyllable = wordProps[2];
      let wordMetre = "";
      let extraSpaces = word.length - syllableCount
      if (extraSpaces > 0) {
        wordMetre += "&nbsp;".repeat(extraSpaces);
      }
      for (var i = 0; i < syllableCount; i++) {
        if (i === firstStressedSyllable || i === secondStressedSyllable) {
          wordMetre += "&nbsp;●&nbsp;"
        } else {
          wordMetre += "&nbsp;○&nbsp;"
        }
      }
      if (extraSpaces > 0) {
        wordMetre += "&nbsp;".repeat(extraSpaces);
      }
      lineMetre += wordMetre;
      
    });

    if (lineSyllableCount == 0) {
      metre = metre + '<br>';
    } else {
      metre = metre + lineSyllableCount + ' ' + lineMetre + '<br>';
    }
  })

  let metre_element = document.querySelector("#metre");
  metre_element.innerHTML = metre;
}

function getWordProps(text) {
  let word = stripPunctuationFromWord(text);
  if (word in wordDict) {
    return wordDict[word];
  }

  word = word.replace(/(\')/g,"");
  if (word in wordDict) {
    return wordDict[word];
  }

  // sLessWord = word.replace(/s$/g,"");
  // if (sLessWord in wordDict) {
  //   return wordDict[sLessWord];
  // }
  
  // esLessWord = word.replace(/es$/g,"");
  // if (esLessWord in wordDict) {
  //   return wordDict[esLessWord];
  // }
  
  // ingLessWord = word.replace(/ing$/g,"");
  // if (ingLessWord in wordDict) {
  //   let ingWordProps = wordDict[ingLessWord];
  //   return [ingWordProps[0]+1, ingWordProps[1], ingWordProps[2]];
  // }
  
  // edLessWord = word.replace(/ed$/g,"");
  // if (edLessWord in wordDict) {
  //   let edWordProps = wordDict[edLessWord];
  //   return [edWordProps[0]+1, edWordProps[1], edWordProps[2]];
  // }

  return null;
}

function sync_scroll(element) {
  /* Scroll result to scroll coords of event - sync with textarea */
  let result_element = document.querySelector("#display");
  let metre_element = document.querySelector("#metre");
  // Get and set x and y
  result_element.scrollTop = element.scrollTop;
  result_element.scrollLeft = element.scrollLeft;
  metre_element.scrollTop = element.scrollTop;
  metre_element.scrollLeft = element.scrollLeft;
}
