
function update(textarea) {
    let text = textarea.value;
    let result_element = document.querySelector("#highlighting");
    let metre_element = document.querySelector("#metre");
    result_element.innerText = text;

    textarea.style.height = "";
    let newHeight = textarea.scrollHeight + 20 + "px";
    textarea.style.height = newHeight;
    result_element.height = newHeight;
    metre_element.height = newHeight;

    updateMetre(text);
  }

function updateMetre(text) {
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
      wordMetre += "&nbsp;".repeat(extraSpaces);
      for (var i = 0; i < syllableCount; i++) {
        if (i === firstStressedSyllable || i === secondStressedSyllable) {
          wordMetre += "&nbsp;●&nbsp;"
        } else {
          wordMetre += "&nbsp;○&nbsp;"
        }
      }
      wordMetre += "&nbsp;".repeat(extraSpaces);
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
  let result_element = document.querySelector("#highlighting");
  let metre_element = document.querySelector("#metre");
  // Get and set x and y
  result_element.scrollTop = element.scrollTop;
  result_element.scrollLeft = element.scrollLeft;
  metre_element.scrollTop = element.scrollTop;
  metre_element.scrollLeft = element.scrollLeft;
}
