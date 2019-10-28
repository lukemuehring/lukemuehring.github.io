const testWrapper = document.querySelector(".test-wrapper");
const inputBox = document.querySelector("#test-area");
const outputText = document.querySelector("#output-text p");
const clearButton = document.querySelector("#clearButton");
const copyButton = document.querySelector("#copyButton");

var emojiArr = [
            0x1F170, //A
            0x1F171, //B
            0x262A, //C
            0x21A9, //D
            0x1F549, //E
            0x1F38F, //F
            0x24D6, //G
            0x2653, //H
            0x2139, //I
            0x1F5FE, //J
            0x1F1F0, //K
            0x1F552, //L
            0x24C2, //M
            0x2651, //N
            0x1F17E, //O
            0x1F17F, //P
            0x264C, //Q
            0x00AE, //R
            0x1F4B2, //S
            0x271D, //T
            0x26CE, //U
            0x270C, //V
            0x3030, //W
            0x274C, //X
            0x1F4B9, //Y
            0x1F4A4, //Z
           ];

function toUTF16(codePoint) {
  var TEN_BITS = parseInt('1111111111', 2);
  function u(codeUnit) {
    return '\\u'+codeUnit.toString(16).toUpperCase();
  }

  if (codePoint <= 0xFFFF) {
    return u(codePoint);
  }
  codePoint -= 0x10000;

  // Shift right to get to most significant 10 bits
  var leadSurrogate = 0xD800 + (codePoint >> 10);

  // Mask to get least significant 10 bits
  var tailSurrogate = 0xDC00 + (codePoint & TEN_BITS);

  return u(leadSurrogate) + u(tailSurrogate);
}
function fancyCount2(str){
  const joiner = "\u{200D}";
  const split = str.split(joiner);
  let count = 0;

  for(const s of split){
    //removing the variation selectors
    const num = Array.from(s.split(/[\ufe00-\ufe0f]/).join("")).length;
    count += num;
  }

  //assuming the joiners are used appropriately
  return count / split.length;
}

//! Need to figure out how to replace keypress with keydown.
function updateInput(e, current) {
    //e is the event object
    //current is the DOM element that the eventObject is attached to, in this case the input box.
    
    //@@@ Take into account multiple word special cases like OK, 1234, ATM, GO and UP.
    //@@@ Be able to delete spaces
    //@@@ Alternate emojis by using a modifier key like SHIFT
    
    var thisKey = e.key;
    console.log(thisKey);
    currentCode = thisKey.charCodeAt(0);
    console.log("charCode "+ currentCode);
    if ((currentCode - 97) >= 0 && (currentCode - 97) <= 26) {
        var updatedValue = emojiArr[currentCode - 97]; //-65 so that A is indexing at 0
        outputText.innerHTML = outputText.innerHTML.concat(String.fromCodePoint(updatedValue));  
    } else if (thisKey == "Backspace") {
        var currentText = outputText.innerText;
//        var lastChar = currentText.charAt(currentText.length - 1);
//        var lengthOfLastChar = fancyCount2(lastChar);
//        console.log("lastChar " + lastChar);
//        console.log("length of the char " + lengthOfLastChar);
        if (currentText.length > 4) {
            if (currentText.substring(currentText.length-6) == "&nbsp;") {
                outputText.innerHTML = outputText.innerHTML.substring(0, outputText.innerHTML.length - 7);
            } 
        }
         //We subtract the length by 2 since each emoji is a surrogate pair of length 2
        //@@@ this is buggy since some emojis are two characters long and some are 1
        outputText.innerHTML = outputText.innerHTML.substring(0, outputText.innerHTML.length - 2);
    } else if (thisKey == " ") {
        console.log("space pressed");
//        outputText.innerHTML += "&nbsp;";    
    } else {
        outputText.innerHTML += thisKey;
    }
}

//! Backspace and Space do not work as expected.
function updateSpacing(e, current) {
    
}

function deleteText() {
    outputText.innerHTML = "";
    //HOW TO MAKE INNER TEXT DELETE AS WELL?
    inputBox.innerText = "";
    
}

function copyText() {
    const el = document.createElement('textarea');
    el.value = outputText.innerText;
    document.body.appendChild(el);
    el.select();
    el.setSelectionRange(0, 99999);
    document.execCommand("copy");
    document.body.removeChild(el);
}

inputBox.addEventListener("keydown", function(e) { updateInput(e, this);}, false);
inputBox.addEventListener("keydown", function(e) {updateSpacing(e, this);}, false);

clearButton.addEventListener("click", deleteText, false);
copyButton.addEventListener("click", copyText, false);

