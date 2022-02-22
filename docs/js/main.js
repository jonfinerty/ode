"use strict";

const placeholderPoem = poems[Math.floor(Math.random() * poems.length)];
let mode = "input"; // |"about"|"placeholder";
let timeIndent = 0;

window.addEventListener('resize', () => {
  //explicit dont rerender display as we need the same spans to anchor suggestions to
  time(updateHeights);
  time(updateWidth);
  time(updateMetre);
  time(rerenderRhymeSuggestions);
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
updateMenuPosition();
waitForFontToLoad(() => {
  if (window.location.hash == "#about") {
    aboutClicked();
  } else {
    loadState();
  }
  render();
  updateMenuPosition();
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
  removePlaceholderText(event?.data);
  time(render);
  saveState();
}

function onTitleClicked(event) {
  event.stopPropagation();
}

function onRhymeSuggestionsClicked(event) {
  event.stopPropagation();
}

function onInputClicked(event) {
  event?.stopPropagation();

  hideRhymeSuggestions();

  const inputElement = document.querySelector("#input");

  if (mode == "placeholder") {
    if (inputElement.selectionEnd == inputElement.selectionStart) {
      inputElement.selectionEnd = 0;
    }
  } else if (mode == "about" && event) {
    const x = event.clientX;
    const y = event.clientY;

    const wordSpan = viewPortCoordinatesToWordSpan(x, y);
    if (wordSpan?.innerText?.toLowerCase() == "tweet") {
      window.open("https://twitter.com/intent/tweet?text=%40jonfinerty%20%23ode%20", '_blank').focus();
    }
  }

  inputElement.focus();
}

function onTitleUpdated() {
  const titleElement = document.querySelector('#title');
  titleElement.classList.remove("placeholder");
  saveState();
}

function render() {
  time(updateHeights);
  time(renderDisplay);
  time(applyRhymeHighlighting);
  time(updateWidth);
  time(updateMetre);
}

function focusInput() {
  const inputElement = document.querySelector('#input');
  inputElement.focus();
}

function showPlaceholderText() {
  setMode("placeholder");
  const inputElement = document.querySelector("#input");

  inputElement.value = placeholderPoem;
  inputElement.selectionEnd = 0;

  const displayElement = document.querySelector('#display');
  displayElement.classList.add('placeholder');

  const metreElement = document.querySelector('#metre');
  metreElement.classList.add('placeholder');
}

function removePlaceholderText(stringToReplaceWith) {
  const displayElement = document.querySelector('#display');
  if (displayElement.classList.contains('placeholder')) {
    displayElement.classList.remove('placeholder');

    const metreElement = document.querySelector('#metre');
    metreElement.classList.remove('placeholder');

    const inputElement = document.querySelector('#input');
    inputElement.value = stringToReplaceWith;

    const titleElement = document.querySelector('#title');
    if (getTitle() == "Ode") {
      titleElement.classList.add('placeholder');
    }

    setMode("input");
  }
}

let autocompleteTimeout = false;

function setupInputEvents() {
  const inputElement = document.querySelector("#input");
  inputElement.onkeydown = function (event) {

    clearTimeout(rhymeSuggestionTimeout);

    //todo tab fills in autocomplete
    if (isAutocompleteShowing()) {
      switch (event.key) {
        case "Down": // IE/Edge specific value
        case "ArrowDown":
          event.preventDefault();
          nextAutocompleteSuggestion();
          return;
        case "Up": // IE/Edge specific value
        case "ArrowUp":
          event.preventDefault();
          previousAutocompleteSuggestion();
          return;
        case "Tab":
        case "Enter":
          event.preventDefault();
          fillInAutoComplete();
          return;
        default:
          hideAutocomplete();
      }
    }

    if (event.key === "Escape" || event.key === "Esc") {
      if (rhymeSuggestionsShowing()) {
        hideRhymeSuggestions();
      } else if (isAutocompleteShowing()) {
        hideAutocomplete();
      } else if (mode == "about") {
        backClicked();
      }
      return;
    }

    hideRhymeSuggestions();

    if (event.ctrlKey && event.key === ' ') {
      if (isCursorAtEndOfLine()) {
        showAutocomplete();
      } else {
        showRhymeSuggestionsAtCursor();
      }
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

    clearTimeout(autocompleteTimeout);
    autocompleteTimeout = setTimeout(() => {
      if (isCursorAtEndOfLine() && !currentLineRhymes()) {
        showAutocomplete(false);
      }
    }, 2000);
  }
}

function loadState() {
  const storage = window.localStorage;
  const titleElement = document.querySelector("#title");
  const title = storage.getItem('title');
  if (title) {
    titleElement.innerText = title;
  } else {
    titleElement.innerText = "Ode";
    titleElement.classList.add("placeholder");
  }

  const content = storage.getItem('content');
  const inputElement = document.querySelector("#input");
  if (content) {
    inputElement.value = content;
    if (title == "Ode") {
      const titleElement = document.querySelector("#title");
      titleElement.classList.add("placeholder");
    }
  } else {
    showPlaceholderText();
  }
}

function getTitle() {
  const titleElement = document.querySelector("#title");
  return titleElement.innerText;
}

function saveState() {
  if (mode == "about") {
    return;
  }

  const storage = window.localStorage;
  storage.setItem('title', getTitle());

  if (mode == 'placeholder') {
    return;
  }

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
  timeIndent++;
  const measureName = "-".repeat(timeIndent - 1) + func.name;
  // console.time(measureName);
  func(...params);
  //console.timeEnd(measureName);
  timeIndent--;
}

function updateHeights() {
  const input_element = document.querySelector("#input")
  const display_element = document.querySelector("#display");
  const metre_element = document.querySelector("#metre");

  input_element.style.height = "1px";
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
    string = string.replace(/^['’](.+(?=['’]$))['’]$/, '$1')
    words.push(new Word(string));
  });

  return words;
}

function aboutClicked(event) {
  mixpanel.track('About clicked');
  event?.stopPropagation();
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
    titleElement.innerText = 'About Ode';
    titleElement.classList.remove("placeholder");
    removePlaceholderText();
    setMode("about");
    inputElement.value = aboutPoem;
    render();
    gridElement.classList.remove("fade-out");
    titleElement.classList.remove("fade-out");
  }, 500);
}

function backClicked(event) {
  mixpanel.track('Back clicked');
  event?.stopPropagation();
  hideRhymeSuggestions();
  location.hash = "";

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


function setMode(newMode) {
  mode = newMode;
}

function updateMenuPosition() {
  const menu = document.querySelector("#menu");
  const viewport = window.visualViewport;
  // bottom and right count from bottom right corner (i.e. bottom right corner of page is 0,0)
  const bottom = (window.innerHeight - (viewport.offsetTop + viewport.height));
  const right = (window.innerWidth - (viewport.offsetLeft + viewport.width));
  menu.style.bottom = bottom + "px";
  menu.style.right = right + "px";
}

window.visualViewport.addEventListener('scroll', updateMenuPosition);
window.visualViewport.addEventListener('resize', updateMenuPosition);
window.addEventListener('click', () => {
  onInputClicked();
});
