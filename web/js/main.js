let rhymeIndex = {};

setupTabCapture();
buildRhymeIndex();
loadState();
revealContent();

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
  var flashPreventerElement = document.getElementById('flash-preventer');
  flashPreventerElement.classList.add('fade');
}

function onInputUpdated() {
  updateHeights();
  updateDisplayText();
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
  
  // each is [word, rhymeIndex]
  let paragraphCounter = 0;
  let rhymeSchemeCounter = 0;
  let lastWords = [[]];
  let lines = text.split("\n");
  lines.forEach((line, i) => {
    let words = line.trim().split(/\s+/);
    console.log(words);
    if (words[0] == '') {
      paragraphCounter++;
      rhymeSchemeCounter = 0;
      lastWords[paragraphCounter] = [];
      return;
    }

    let lastWord = words[words.length-1];
    let rhymeScheme = null;
    let rhymeFound = false;
    let rhymeFoundScheme = null;

    lastWords[paragraphCounter].forEach(previousLastWordAndRhymeScheme => {
      previousLastWord = previousLastWordAndRhymeScheme[0];
      previousLastWordRhymeScheme = previousLastWordAndRhymeScheme[1];
      if (!wordDict[previousLastWord]) {
        return;
      }

      let rhymeGroups = wordDict[previousLastWord][3];
      rhymeGroups.forEach(rhymeId => {
        // todo remove punctuation from lastword
        if (rhymeIndex[rhymeId].includes(lastWord)) {
          rhymeFound = true;
          rhymeFoundScheme = previousLastWordRhymeScheme;
        }
      });
    })
    
    if (rhymeFound) {
      lastWords[paragraphCounter].push([lastWord,rhymeFoundScheme]);
      rhymeScheme = rhymeFoundScheme;
    } else {
      lastWords[paragraphCounter].push([lastWord,rhymeSchemeCounter]);
      rhymeScheme = rhymeSchemeCounter;
      rhymeSchemeCounter++;
    }
    
    var pos = line.lastIndexOf(lastWord);
    let markedUpLine = line.substring(0,pos) + "<span class=\"last-word-"+rhymeScheme+"\">" + lastWord + "</span>" + line.substring(pos+lastWord.length)
    lines[i] = markedUpLine;
    display_element.innerHTML = lines.join("\n");
  });
  
}

function updateMetre() {
  let input_element = document.querySelector("#input")
  let text = input_element.value;
  let metre = "";

  let lines = text.split("\n");
  lines.forEach(line => {
    var lineSyllableCount = 0;
    var lineMetre = "";
    let words = line.split(/(?:,|\.|\?| |:|;|-|—)+/);

    words.forEach(word => {
      word = word.trim();
      if (word.length === 0) {
        return;
      }
      let wordProps = get_word_props(word)

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

function get_word_props(text) {
  text = text.toLowerCase();
  text = text.replace("’", "'");
  text = text.replace(/(\"|<|>|{|}|\[|\]|\(|\)|\!)+/g, "")
  if (text in wordDict) {
    return wordDict[text];
  }

  text = text.replace(/(\')/g,"");
  if (text in wordDict) {
    return wordDict[text];
  }

  sLessText = text.replace(/s$/g,"");
  if (sLessText in wordDict) {
    return wordDict[sLessText];
  }
  
  esLessText = text.replace(/es$/g,"");
  if (esLessText in wordDict) {
    return wordDict[esLessText];
  }
  
  ingLessText = text.replace(/ing$/g,"");
  if (ingLessText in wordDict) {
    let ingWordProps = wordDict[ingLessText];
    return [ingWordProps[0]+1, ingWordProps[1], ingWordProps[2]];
  }
  
  edLessText = text.replace(/ed$/g,"");
  if (edLessText in wordDict) {
    return wordDict[edLessText];
  }

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
