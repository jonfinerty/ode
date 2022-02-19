const placeholderPoem = poems[Math.floor(Math.random() * poems.length)];
let mode = "input"; // |"about"|"placeholder";

window.addEventListener('resize', () => {
  //explicit dont rerender display as we need the same spans to anchor suggestions to
  time(updateHeights);
  time(updateWidth);
  time(updateMetre);
  time(() => {
    if (rhymeSuggestionsShowing()) {
      showRhymeSuggestions(lastWordToBeHovered);
    }
  });
});

window.addEventListener('hashchange', () => {
  if (window.location.hash == "#about") {
    aboutClicked();
  } else {
    backClicked();
  }
});

setupInputEvents();
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
  const pastedText = (event.clipboardData || window.clipboardData).getData('text');
  // prevent double paste
  if (mode == "placeholder") {
    event.preventDefault();
  }
  event.data = pastedText;
  onInputUpdated(event);
}

function onInputUpdated(event) {
  const inputElement = document.querySelector("#input");
  if (inputElement.value.length == 0 && mode == 'about') {
    backClicked();
    return;
  }

  hideRhymeSuggestions();
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
  hideRhymeSuggestions();

  if (mode == "placeholder") {
    const inputElement = document.querySelector("#input");
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
  const inputElement = document.querySelector('#input');
  inputElement.focus();
}

function setupPlaceholderText() {
  const inputElement = document.querySelector("#input");
  if (inputElement.value.trim().length == 0) {
    setMode("placeholder");
    inputElement.value = placeholderPoem;
    inputElement.selectionEnd = 0;

    const displayElement = document.querySelector('#display');
    displayElement.classList.add('placeholder');

    const metreElement = document.querySelector('#metre');
    metreElement.classList.add('placeholder');
  }
}

function removePlaceholderText(stringToReplaceWith) {
  const displayElement = document.querySelector('#display');
  if (displayElement.classList.contains('placeholder')) {
    displayElement.classList.remove('placeholder');

    const metreElement = document.querySelector('#metre');
    metreElement.classList.remove('placeholder');

    const inputElement = document.querySelector('#input');
    inputElement.value = stringToReplaceWith;

    setMode("input");
  }
}

function setupInputEvents() {
  const inputElement = document.querySelector("#input");
  inputElement.onkeydown = function (event) {

    if (event.key === "Escape" || event.key === "Esc") {
      if (rhymeSuggestionsShowing()) {
        hideRhymeSuggestions();
      } else if (mode == "about") {
        backClicked();
      }
      return;
    }

    hideRhymeSuggestions();

    if (event.ctrlKey && event.key === ' ') {
      showRhymeSuggestionsAtCursor();
    }

    if (event.keyCode === 9 || event.which === 9) {
      event.preventDefault();
      const element = this;
      const tabStartPos = element.selectionStart;
      const tabEndPos = element.selectionEnd;
      element.value = element.value.substring(0, tabStartPos) + "\t" + element.value.substring(tabEndPos);
      element.selectionEnd = tabStartPos + 1;
      onInputUpdated();
    }
  }
}

function loadState() {
  const storage = window.localStorage;
  const title = storage.getItem('title');
  const titleElement = document.querySelector("#title");
  if (title) {
    titleElement.innerText = title;
  } else {
    titleElement.innerText = "Ode";
  }

  const content = storage.getItem('content');
  const inputElement = document.querySelector("#input");
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

  const storage = window.localStorage;

  const titleElement = document.querySelector("#title");
  const text = titleElement.innerText;
  storage.setItem('title', text);

  const inputElement = document.querySelector("#input");
  const content = inputElement.value;
  storage.setItem('content', content);
}

function revealContent() {
  const flashPreventerElement = document.getElementById('flash-preventer');
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
  const startTime = performance.now();
  func(...params);
  const endTime = performance.now();
  console.log(`Function ${func.name} took ${endTime - startTime}ms to run`);
}

function updateHeights() {
  const input_element = document.querySelector("#input")
  const display_element = document.querySelector("#display");
  const metre_element = document.querySelector("#metre");

  input_element.style.height = "";
  const newHeight = input_element.scrollHeight + "px";
  input_element.style.height = newHeight;
  display_element.height = newHeight;
  metre_element.height = newHeight;
}

function updateWidth() {
  const inputElement = document.querySelector("#input")
  const displayElement = document.querySelector("#display");
  const metreElement = document.querySelector("#metre");
  inputElement.style.width = displayElement.clientWidth + "px";
  metreElement.style.width = displayElement.clientWidth + "px";
}

function splitTextToLines(text) {
  return text.split("\n");
}

function splitLineToWords(line) {
  const strings = line.match(/'?’?\w[\w'’]*/g);
  if (!strings) {
    return [];
  }

  const words = [];
  strings.forEach(string => {
    //blackmagic to remove >pairs< of apostrophes
    words.push(new Word(string.replace(/^['’](.+(?=['’]$))['’]$/, '$1')));
  });

  return words;
}

function stripPunctuationFromString(string) {
  // todo: keep non-enclosing ' (i.e 'here' -> here, but 'bout -> 'bout, nothin' -> nothin')
  string = string.replace(/’/g, "'");
  //todo: improve this regex
  //text = text.replace(/(\"|<|>|{|}|\[|\]|\(|\)|\!)+/g, "")
  return string.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()<>\|"“”]/g, "");
}

function aboutClicked() {
  hideRhymeSuggestions();
  saveState();

  const inputElement = document.querySelector("#input");
  const titleElement = document.querySelector("#title");
  const gridElement = document.querySelector("#grid-container");
  const shareMenuItem = document.querySelector("#menu-item-share");
  const aboutMenuItem = document.querySelector("#menu-item-about");
  const backMenuItem = document.querySelector("#menu-item-back");

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
  hideRhymeSuggestions();
  setMode("input");
  const inputElement = document.querySelector("#input");
  const titleElement = document.querySelector("#title");
  const gridElement = document.querySelector("#grid-container");
  const shareMenuItem = document.querySelector("#menu-item-share");
  const aboutMenuItem = document.querySelector("#menu-item-about");
  const backMenuItem = document.querySelector("#menu-item-back");

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
  hideRhymeSuggestions();
}

function setMode(newMode) {
  //console.log("setting mode to "+mode);
  mode = newMode;
}
