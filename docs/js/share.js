"use strict";

function shareClicked(event) {
    mixpanel.track('About clicked');
    event?.stopPropagation();
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
  
    const poemText = document.querySelector("#input").value.trimEnd();

    const shareData = {
      files: [imageFile],
      title: getTitle(),
      text: poemText
    }
  
    if (false && supportsNativeShare(shareData)) {
      navigator.share(shareData);
    } else {
      if (navigator.clipboard) {
        const data = [new ClipboardItem({ [imageFile.type]: imageFile })]
        navigator.clipboard.write(data).then(function () {
          // image copied to clipboard
          setShareMessage("poem copied");
        }, function (err) {
          copyTextToClipboard(poemText);
        })
      } else {
        fallbackCopyTextToClipboard(poemText);
      }
    }
  }

  function supportsNativeShare(shareData) {
    const isMobileBrowser = navigator.userAgent.indexOf("Mobi") != -1;
    return isMobileBrowser && navigator.canShare(shareData);
  }

function fallbackCopyTextToClipboard(text) {
  var textArea = document.createElement("textarea");
  textArea.value = text;
  
  // Avoid scrolling to bottom
  textArea.style.top = "0";
  textArea.style.left = "0";
  textArea.style.position = "fixed";

  document.body.appendChild(textArea);
  textArea.focus();
  textArea.select();

  try {
    var successful = document.execCommand('copy');
    var msg = successful ? 'successful' : 'unsuccessful';
    if (successful) {
      setShareMessage("poem copied to clipboard");
    }
  } catch (err) {
    console.error('Fallback: Oops, unable to copy', err);
  }

  document.body.removeChild(textArea);
}

function copyTextToClipboard(text) {
  if (!navigator.clipboard) {
    fallbackCopyTextToClipboard(text);
    return;
  }

  navigator.clipboard.writeText(text).then(function() {
    setShareMessage("poem copied to clipboard");
  }, function(err) {
    console.error('Async: Could not copy text: ', err);
  });
}

function setShareMessage(message) {
  const shareMenuItem = document.querySelector("#menu-item-share");
  shareMenuItem.innerText = message;

  setTimeout(() => {
    const shareMenuItem = document.querySelector("#menu-item-share");
    shareMenuItem.innerText = "share";    
  }, 3000);
}