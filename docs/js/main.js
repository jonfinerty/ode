let rhymeIndex = {};
let placeholderPoem = poems[Math.floor(Math.random() * poems.length)];
let mode = "input"; // |"about";

window.addEventListener('resize', function() {
    render();
}, true);

setupTabCapture();
buildRhymeIndex();
waitForFontToLoad(() => {
  loadState();
  setupPlaceholderText();
  render();
  revealContent();
  focusInput();
});

function onInputUpdated() {
  time(() => {
    removePlaceholderText();
    render();
    saveState();
  });

  // html2canvas(document.querySelector("#grid-container"))
  // .then(canvas => {
  //   console.log("HERE")
  //   var img = canvas.toDataURL("image/png");
  //   window.open(img);
  //   console.log(img);
  // }); 
}

function onTitleUpdated() {
  saveState();
}

function render() {
  updateHeights();
  updateDisplayText();
  updateWidth();
  updateMetre();
}

function focusInput() {
  var inputElement = document.querySelector('#input');
  inputElement.focus();
}

function setupPlaceholderText() {
  var inputElement = document.querySelector("#input");
  if (inputElement.value.trim().length == 0) {
    mode = "placeholder";
    console.log("Setting mode to placeholder");
    inputElement.value = placeholderPoem;
    inputElement.selectionEnd = 0;
    
    var displayElement = document.querySelector('#display');
    displayElement.classList.add('placeholder');
    
    var metreElement = document.querySelector('#metre');
    metreElement.classList.add('placeholder');
  }
}

function removePlaceholderText() {
  var displayElement = document.querySelector('#display');
  if (displayElement.classList.contains('placeholder')) {
    displayElement.classList.remove('placeholder');

    var metreElement = document.querySelector('#metre');
    metreElement.classList.remove('placeholder');

    var inputElement = document.querySelector('#input');
    inputElement.value = "";

    mode = "input"    
    console.log("Setting mode to input");
  }
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
  console.log("loading state");
  let storage = window.localStorage;
  let title = storage.getItem('title');
  let titleElement = document.querySelector("#title");
  if (title) {
    titleElement.innerText = title;
  } else {
    titleElement.innerText = "Ode";
  }

  let content = storage.getItem('content');
  console.log(content.substring(0,20));
  let inputElement = document.querySelector("#input");
  if (content) {
    inputElement.value = content
  } else {
    inputElement.value = content
  }
}

function saveState() {
  if (mode == "about" || mode == "placeholder") {
    return;
  }

  console.log("saving state");

  let storage = window.localStorage;

  let titleElement = document.querySelector("#title");
  let text = titleElement.innerText;
  storage.setItem('title', text);

  let inputElement = document.querySelector("#input");
  let content = inputElement.value;
  console.log(content.substring(0,20));
  storage.setItem('content', content);
}

function revealContent() {
  var flashPreventerElement = document.getElementById('flash-preventer');
  flashPreventerElement.classList.add('fade');
}

function waitForFontToLoad(then) {  
  if (document.fonts) {
    document.fonts.load('64px "Libre Baskerville"').then(() => {
      console.log("loaded");
      then();
    })
  } else {
    console.log("font wait api not available");
    then();
  }
}

function time(func) {
  var startTime = performance.now();
  func();
  var endTime = performance.now();
  console.log(`Took ${endTime - startTime}ms to render`);
}

function updateHeights() {
  let input_element = document.querySelector("#input")
  let display_element = document.querySelector("#display");
  let metre_element = document.querySelector("#metre");

  input_element.style.height = "";
  let newHeight = input_element.scrollHeight + "px";
  input_element.style.height = newHeight;
  display_element.height = newHeight;
  metre_element.height = newHeight;
}

function updateWidth() {
  let inputElement = document.querySelector("#input")
  let displayElement = document.querySelector("#display");
  let metreElement = document.querySelector("#metre");
  inputElement.style.width = displayElement.clientWidth + "px"; 
  metreElement.style.width = displayElement.clientWidth + "px"; 
}

function escapeHtml(text) {
  var map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };

  return text.replace(/[&<>"']/g, function(char) { return map[char]; });
}

function updateDisplayText() {
  let inputElement = document.querySelector("#input");
  let displayElement = document.querySelector("#display")
  let text = inputElement.value;
  
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
      rhymeGroups.forEach(rhymeId => { 
        if (rhymeIndex[rhymeId].includes(lastWord.toLowerCase())) {
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
    let markedUpLine = escapeHtml(line.substring(0,pos)) + "<span class=\"last-word-"+rhymeScheme+"\">" + escapeHtml(lastWord) + "</span>" + escapeHtml(line.substring(pos+lastWord.length));
    lines[i] = markedUpLine;
  });
  displayElement.innerHTML = lines.join("\n"); 
}

function splitTextToLines(text) {
  return text.split("\n");
}

function splitLineToWords(line) {
  words = line.match(/'?’?\w[\w'’]*/g);
  if (!words) {
    words = [];
  }

  words.forEach((word, index) => {
    //blackmagic to remove >pairs< of apostrophes
    words[index] = word.replace(/^['’](.+(?=['’]$))['’]$/, '$1');
  });

  return words;
}

function stripPunctuationFromWord(word) {
  // todo: keep non-enclosing ' (i.e 'here' -> here, but 'bout -> 'bout, nothin' -> nothin')
  word = word.replace(/’/g, "'");
  //todo: improve this regex
  //text = text.replace(/(\"|<|>|{|}|\[|\]|\(|\)|\!)+/g, "")
  return word.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()<>\|"“”]/g,"");
}

function distributeEvenly(syllables, characterCount) { // syllables = ['●','○'] or ['?']
  let syllableIndex = 0;
  let output = "";
  if (syllables.length >= characterCount) {
    return syllables.join('');
  } else if (syllables.length <= Math.floor(characterCount / 2)) {
    let leap = Math.floor(characterCount / syllables.length);
    for (let i=0; i<characterCount; i++) {
      if (i%leap == Math.floor(leap/2) && syllableIndex < syllables.length) {
        output+=syllables[syllableIndex];
        syllableIndex++;
      } else {
        output += "&nbsp;";
      }
    }
  } else {
    let leap = Math.floor(characterCount / (characterCount-syllables.length))
    for (let i=0; i<characterCount; i++) {
      if (i%leap == Math.floor(leap/2) || syllableIndex >= syllables.length) {
        output += "&nbsp;";
      } else {
        output+=syllables[syllableIndex];
        syllableIndex++;
      }
    }
  }
  return output;
}

function updateMetre() {
  let metreFontSize = getCanvasFont(document.querySelector("#metre"));
  let displayFontSize = getCanvasFont(document.querySelector("#display"));
  let metreCharacterSize = getTextWidth("●", metreFontSize);
  let input_element = document.querySelector("#input")
  let text = input_element.value;
  let metre = "";
  let syllablesOutput = "";

  let lines = splitTextToLines(text);
  lines.forEach(line => {
    var lineSyllableCount = 0;
    var lineMetre = "";
    let words = splitLineToWords(line);

    let runningTextLength = 0;
    let runningMetreLength = 0;
    words.forEach(word => {
      let wordProps = getWordProps(word);
      let wordIndex = line.indexOf(word);
      let precedingWhitespaceAndPunctuation = line.substring(0, wordIndex);
      let precedingSize = getTextWidth(precedingWhitespaceAndPunctuation, displayFontSize);

      runningTextLength += precedingSize;
      
      //how many spaces to get up to runningTextLength from runningMetreLength
      let spacesNeeded = Math.floor((Math.max(0, runningTextLength - runningMetreLength) / metreCharacterSize) + 0.4); //favour an extra space
      lineMetre += "&nbsp;".repeat(spacesNeeded);
      runningMetreLength += spacesNeeded * metreCharacterSize;

      let wordSize = getTextWidth(word, displayFontSize);
      runningTextLength += wordSize;
      let metreCharactersNeeded = Math.floor(wordSize / metreCharacterSize);
      let syllableArray = [];
      if (wordProps) {
        let syllableCount = wordProps[0];
        lineSyllableCount += syllableCount;
        for (var i=0; i<syllableCount; i++) {
          if (i == wordProps[1] || i == wordProps[2]) {
            syllableArray.push('●');
          } else {
            syllableArray.push('○');
          }
        }
      } else {
        syllableArray = ['?'];
        lineSyllableCount++;
        if (word.length > 4) {
          syllableArray.push('?');
          lineSyllableCount++;
        }
        if (word.length > 8) {
          syllableArray.push('?');
          lineSyllableCount++;
        }
      }
      let wordMetre = distributeEvenly(syllableArray, metreCharactersNeeded);
      lineMetre += wordMetre
      runningMetreLength += (metreCharactersNeeded * metreCharacterSize);

      while((runningTextLength - runningMetreLength) > 0) {
        lineMetre += "&nbsp;"
        runningMetreLength += metreCharacterSize;
      }

      line = line.substring(wordIndex+word.length);
    });

    if (lineSyllableCount == 0) {
      syllablesOutput += '<br>';
    } else {
      syllablesOutput += lineSyllableCount + '<br>';
    }
    metre = metre + lineMetre + '<br>';
  })

  let metreElement = document.querySelector("#metre");
  metreElement.innerHTML = metre;
  let syllablesElement = document.querySelector("#syllables");
  syllablesElement.innerHTML = syllablesOutput;
}

function getWordProps(text) {
  let word = stripPunctuationFromWord(text);
  word = word.toLowerCase();
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


function getTextWidth(text, font) {
  // re-use for better performance
  const canvas = getTextWidth.canvas || (getTextWidth.canvas = document.createElement("canvas"));
  const context = canvas.getContext("2d");
  context.font = font;
  const metrics = context.measureText(text);
  return metrics.width;
}

function getCssStyle(element, prop) {
    return window.getComputedStyle(element, null).getPropertyValue(prop);
}

function getCanvasFont(el = document.body) {
  const fontWeight = getCssStyle(el, 'font-weight') || 'normal';
  const fontSize = getCssStyle(el, 'font-size') || '16px';
  const fontFamily = getCssStyle(el, 'font-family') || 'Times New Roman';
  return `${fontWeight} ${fontSize} ${fontFamily}`;
}

function aboutClicked() {
  saveState();

  let inputElement = document.querySelector("#input");
  let titleElement = document.querySelector("#title");
  let gridElement = document.querySelector("#grid-container");
  let shareMenuItem = document.querySelector("#menu-item-share");
  let aboutMenuItem = document.querySelector("#menu-item-about");
  let backMenuItem = document.querySelector("#menu-item-back");

  shareMenuItem.classList.add("hidden");
  aboutMenuItem.classList.add("hidden");
  backMenuItem.classList.remove("hidden");
  gridElement.classList.add("fade-out");
  titleElement.classList.add("fade-out");

  setTimeout(() => {
    removePlaceholderText();
    mode = "about";
    console.log("setting mode to about")
    inputElement.value = aboutPoem;
    titleElement.innerText = 'About Ode';
    render();
    gridElement.classList.remove("fade-out");
    titleElement.classList.remove("fade-out");
  }, 500);
}

function backClicked() {
  mode = "input";
  console.log("setting mode to input");
  let inputElement = document.querySelector("#input");
  let titleElement = document.querySelector("#title");
  let gridElement = document.querySelector("#grid-container");
  let shareMenuItem = document.querySelector("#menu-item-share");
  let aboutMenuItem = document.querySelector("#menu-item-about");
  let backMenuItem = document.querySelector("#menu-item-back");

  shareMenuItem.classList.remove("hidden");
  aboutMenuItem.classList.remove("hidden");
  backMenuItem.classList.add("hidden");
  gridElement.classList.add("fade-out");
  titleElement.classList.add("fade-out");

  setTimeout(() => {
    loadState();
    render();
    inputElement.focus();
    gridElement.classList.remove("fade-out");
    titleElement.classList.remove("fade-out");
  }, 500);
}

function shareClicked() {
  console.log("SHARE!");
}