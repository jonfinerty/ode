// $('img.badge').hover(function(){
//     window.mytimeout = setTimeout(function(){
//         $("h3.better").animate({"left": "125px"}, 1200);
//     }, 2000);
// }, function(){
//     clearTimeout(window.mytimeout);    
// });

let rhymeIndex = {};

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

document.querySelector("#display").addEventListener("mouseover", e => {
    if (e.target.classList.contains('word')) {
        console.log("hovered over word: "  +e.target.innerText);
    }
});

document.querySelector("#display").addEventListener("mouseleave", e => {
    if (e.target.classList.contains('word')) {
        console.log("left word: "  +e.target.innerText);
    }
});
