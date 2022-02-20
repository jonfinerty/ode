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
    setupPlaceholderText();
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

function onInputClicked() {
  hideRhymeSuggestions();

  if (mode == "placeholder") {
    const inputElement = document.querySelector("#input");
    inputElement.selectionEnd = 0;
  }
}

function onTitleUpdated() {
  const titleElement = document.querySelector('#title');
  titleElement.classList.remove(".placeholder");
  console.log("here");
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

    const titleElement = document.querySelector('#title');
    if (getTitle() == "Ode") {
      titleElement.classList.add('placeholder');
    }

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
  const title = storage.getItem('title') || "Ode";

  setTitle(title);

  const content = storage.getItem('content');
  const inputElement = document.querySelector("#input");
  inputElement.value = content

  if (content && title == "Ode") {
    const inputElement = document.querySelector("#title");
    inputElement.classList.add("placeholder");
  }
}

function getTitle() {
  const titleElement = document.querySelector("#title");
  return titleElement.innerText;
}

function setTitle(text) {
  const titleElement = document.querySelector("#title");
  titleElement.innerText = text;
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
  console.time(measureName);
  func(...params);
  console.timeEnd(measureName);
  timeIndent--;
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
    string = string.replace(/^['’](.+(?=['’]$))['’]$/, '$1')
    words.push(new Word(string));
  });

  return words;
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


  html2canvas(document.querySelector("#poem"))
    .then(canvas => {
      const img = canvas.toDataURL("image/png");
      const imageFile = dataURLToImageFile(getTitle() + ".png", img);
      shareImage(imageFile);
    });
}

function dataURLToImageFile(filename, dataURL) {
  const dataURLParts = dataURL.split(',');
  const mimeType = dataURLParts[0].match(/:(.*?);/)[1];
  const decodedData = atob(dataURLParts[1]);
  let dataLength = decodedData.length;
  const uInt8Array = new Uint8Array(dataLength);

  while (dataLength--) {
    uInt8Array[dataLength] = decodedData.charCodeAt(dataLength);
  }

  return new File([uInt8Array], filename, { type: mimeType });
}

function shareImage(imageFile) {

  const shareData = {
    files: [imageFile],
    title: getTitle(),
    text: 'Poem text?'
  }

  // todo: override, desktop share is garbage
  if (!navigator.canShare(shareData)) {
    // can't native share image
  }
  else if (navigator.canShare(shareData)) {
    navigator.share(shareData);
  }
}

function setMode(newMode) {
  //console.log("setting mode to "+mode);
  mode = newMode;
}

let pendingUpdate = false;
function viewportHandler() {
  if (pendingUpdate) {
    return;
  }
  pendingUpdate = true;

  requestAnimationFrame(() => {
    pendingUpdate = false;
    updateMenuPosition();
  });
}

function updateMenuPosition() {
  const menu = document.querySelector("#menu");
  const viewport = window.visualViewport;
  // bottom and right count from bottom right corner (i.e. bottom right corner of page is 0,0)
  const bottom = (window.innerHeight - (viewport.offsetTop + viewport.height));
  const right = (window.innerWidth - (viewport.offsetLeft + viewport.width));
  // console.log(bottom, right);
  menu.style.bottom = bottom + "px";
  menu.style.right = right + "px";
}

window.visualViewport.addEventListener('scroll', viewportHandler);
window.visualViewport.addEventListener('resize', viewportHandler);
