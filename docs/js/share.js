"use strict";


function shareClicked(event) {
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
  
    let shareText = document.querySelector("#input").value.trimEnd();

    shareText += ""

    const shareData = {
      files: [imageFile],
      title: getTitle(),
      text: document.querySelector("#input").value
    }
  
    // todo: override, desktop share is garbage
    if (!navigator.canShare(shareData)) {
      // can't native share image
    }
    else if (navigator.canShare(shareData)) {
      navigator.share(shareData);
    }
  }