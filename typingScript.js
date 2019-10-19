const testWrapper = document.querySelector(".test-wrapper");
const inputBox = document.querySelector("#test-area");
const outputText = document.querySelector("#output-text p");
const convertButton = document.querySelector("#convert");

var emojiArr = [52];
emojiArr = [0x1F170, //A
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
//todo: instantiate proper values into this array

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

function updateInput(e, current) {
    //e is the event object
    //current is the DOM element that the eventObject is attached to, in this case the input box.
    
    //@@@Take into account multiple word special cases like OK, 1234, ATM, GO and UP.
    //@@@And check if the input is alphanumeric or a special symbol available. if not, just output that symbol.
    //@@@And check if backspace was entered.
    
    //Stores the uppercase Unicode keycode (a number that represents the character)
    var charEntered = String.fromCharCode(e.charCode);
    var currentCode = charEntered.toUpperCase().charCodeAt(0);
    
    if ((currentCode - 65) >= 0 && (currentCode - 65) <= 26) {
        var updatedValue = emojiArr[currentCode - 65]; //-65 so that A is indexing at 0
        outputText.innerHTML = outputText.innerHTML.concat(String.fromCodePoint(updatedValue));
    } else if (currentCode == 8) { //Backspace
        console.log("Backspace pressed.");
        outputText.innerHTML = outputText.innerHTML.substring(0, outPutText.innerHTML.length - 1)
    } else {
        console.log("other character entered: ");
        console.log(charEntered);
        
        outputText.innerHTML = "" + outputText.innerHTML + charEntered;
    }
    

    
    
    
    //Output the value
    
}

inputBox.addEventListener("keypress", function(e) { updateInput(e, this);}, false);
