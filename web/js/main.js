
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
    let words = line.split(" ");
    words.forEach(word => {
      if (word in wordDict) {
        let wordProps = wordDict[word];
        let syllableCount = wordProps[0];
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
        metre += wordMetre;
      }
    });

    metre += '<br>';
  })
  
  let metre_element = document.querySelector("#metre");
  metre_element.innerHTML = metre;
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
