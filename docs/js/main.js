let placeholderPoem = poems[Math.floor(Math.random() * poems.length)];
let mode = "input"; // |"about"|"placeholder";

window.addEventListener('resize', () => {
  render();
});

window.addEventListener('hashchange', () => {
  if (window.location.hash == "#about") {
    aboutClicked();
  } else {
    backClicked();
  }
});

// on text area click AND placeholder
// set cursor to 0

setupTabCapture();
time(buildRhymeIndex);
waitForFontToLoad(() => {
  if (window.location.hash == "#about") {
    aboutClicked();
  } else {
    loadState();
    setupPlaceholderText();
  }
  render();
  revealContent();
  focusInput();
});

function onInputPasted(event) {
  let pastedText = (event.clipboardData || window.clipboardData).getData('text');
  // prevent double paste
  if (mode == "placeholder") {
    event.preventDefault();
  }
  event.data = pastedText;
  onInputUpdated(event);
}

function onInputUpdated(event) {
  var inputElement = document.querySelector("#input");
  if (inputElement.value.length == 0 && mode == 'about') {
    backClicked();
    return;
  }
  removePlaceholderText(event.data);
  render();
  saveState();

  // html2canvas(document.querySelector("#grid-container"))
  // .then(canvas => {
  //   console.log("HERE")
  //   var img = canvas.toDataURL("image/png");
  //   window.open(img);
  //   console.log(img);
  // }); 
}

function onInputClicked() {
  if (mode == "placeholder") {
    var inputElement = document.querySelector("#input");
    inputElement.selectionEnd = 0;
  }
}

function onTitleUpdated() {
  saveState();
}

function render() {
  updateHeights();
  time(updateDisplayText);
  updateWidth();
  time(updateMetre);
}

function focusInput() {
  var inputElement = document.querySelector('#input');
  inputElement.focus();
}

function setupPlaceholderText() {
  var inputElement = document.querySelector("#input");
  if (inputElement.value.trim().length == 0) {
    setMode("placeholder");
    inputElement.value = placeholderPoem;
    inputElement.selectionEnd = 0;

    var displayElement = document.querySelector('#display');
    displayElement.classList.add('placeholder');

    var metreElement = document.querySelector('#metre');
    metreElement.classList.add('placeholder');
  }
}

function removePlaceholderText(stringToReplaceWith) {
  var displayElement = document.querySelector('#display');
  if (displayElement.classList.contains('placeholder')) {
    displayElement.classList.remove('placeholder');

    var metreElement = document.querySelector('#metre');
    metreElement.classList.remove('placeholder');

    var inputElement = document.querySelector('#input');
    inputElement.value = stringToReplaceWith;

    setMode("input");
  }
}

function setupTabCapture() {
  var inputElement = document.querySelector("#input");
  inputElement.onkeydown = function (e) {
    if (e.keyCode === 9 || e.which === 9) {
      e.preventDefault();
      var element = this;
      var tabStartPos = element.selectionStart;
      var tabEndPos = element.selectionEnd;
      element.value = element.value.substring(0, tabStartPos) + "\t" + element.value.substring(tabEndPos);
      element.selectionEnd = tabStartPos + 1;
      onInputUpdated();
    }
  }
}

function loadState() {
  let storage = window.localStorage;
  let title = storage.getItem('title');
  let titleElement = document.querySelector("#title");
  if (title) {
    titleElement.innerText = title;
  } else {
    titleElement.innerText = "Ode";
  }

  let content = storage.getItem('content');
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

  let storage = window.localStorage;

  let titleElement = document.querySelector("#title");
  let text = titleElement.innerText;
  storage.setItem('title', text);

  let inputElement = document.querySelector("#input");
  let content = inputElement.value;
  storage.setItem('content', content);
}

function revealContent() {
  var flashPreventerElement = document.getElementById('flash-preventer');
  flashPreventerElement.classList.add('fade');
}

function waitForFontToLoad(then) {
  if (document.fonts) {
    document.fonts.load('64px "Libre Baskerville"').then(() => {
      then();
    })
  } else {
    console.log("font wait api not available");
    then();
  }
}

function time(func, ...params) {
  var startTime = performance.now();
  func(...params);
  var endTime = performance.now();
  console.log(`Function ${func.name} took ${endTime - startTime}ms to run`);
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
  return word.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()<>\|"“”]/g, "");
}

function getWordProps(text) {
  let word = stripPunctuationFromWord(text);
  word = word.toLowerCase();
  if (word in wordDict) {
    return wordDict[word];
  }

  word = word.replace(/(\')/g, "");
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
    setMode("about");
    titleElement.innerText = 'About Ode';
    inputElement.value = aboutPoem;
    render();
    gridElement.classList.remove("fade-out");
    titleElement.classList.remove("fade-out");
  }, 500);
}

function backClicked() {
  setMode("input");
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
}

function setMode(newMode) {
  //console.log("setting mode to "+mode);
  mode = newMode;
}