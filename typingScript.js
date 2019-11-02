const inputBox = document.querySelector("#test-area"); //input textarea
const outputText = document.querySelector("#output-text pre"); //output paragraph
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

var outputString;

//a function that takes in the unicode code point of a character, and returns the emoji at the corresponding emojiArr index if it's within bounds (a-z). If not within bounds, it returns -1.
function textToEmoji(currentCode) {
    //a-z
    if ((currentCode - 97) >= 0 && (currentCode - 97) <= 26) {
        return emojiArr[currentCode - 97];
    } else {
        return -1;
    }
}

function updateInput(e, current) {
    //e is the event object
    //current is the DOM element that the eventObject is attached to, in this case the input box.
    
    //@@@ Take into account multiple word special cases like OK, 1234, ATM, GO and UP.

    var currentText = inputBox.value; //the initial value of the textarea. Always one character behind...
    
    //Because of the one character behind behavior, we have to add on the key that triggered the event
    //First we make sure the key is a-z:
    var currentCode = e.key.charCodeAt(0);
    var updatedValue = textToEmoji(currentCode);
    if (updatedValue != -1) {
        currentText += e.key;
    } else {
        if (e.key == "Backspace") {
            currentText = currentText.substr(0, currentText.length - 1);
        }
    }
    
    currentText = currentText.toLowerCase();
    outputString = "";
    
    //Translating to Emoji
    let i = 0;
    while (i < currentText.length) {
        var updatedValue = textToEmoji(currentText.charAt(i).charCodeAt(0));
        if (updatedValue != -1) {
            outputString = outputString.concat(String.fromCodePoint(updatedValue));
        } else {
            outputString += currentText.charAt(i);
        }
        //Check for compound words 
        //Compound words of length: 3
        if (i < currentText.length - 2) {
            if (currentText.charAt(i) == 't' && currentText.charAt(i + 1) == 'o'&& currentText.charAt(i + 2) == 'p') {
                outputString = outputString.substr(0,outputString.length - 1); //Delete 1st char
                i = i + 2; //Skip the second and third char
                outputString = outputString.concat(String.fromCodePoint(0x1F51D));
            }
        }
        //Compound words of length: 2
        if (i < currentText.length - 1) {
            if (currentText.charAt(i) == 'w' && currentText.charAt(i + 1) == 'c') {
                outputString = outputString.substr(0,outputString.length - 1); //Delete 1st char
                i++; //Skip the second char
                outputString = outputString.concat(String.fromCodePoint(0x1F6BE));
            } else if (currentText.charAt(i) == 'o' && currentText.charAt(i + 1) == 'n') {
                outputString = outputString.substr(0,outputString.length - 2); //??? buggy idk why its 2
                i++; //Skip the second char
                outputString = outputString.concat(String.fromCodePoint(0x1F51B));
            } else if (currentText.charAt(i) == 'o' && currentText.charAt(i + 1) == 'k') {
                outputString = outputString.substr(0,outputString.length - 2); //??? buggy idk why its 2
                i++; //Skip the second char
                outputString = outputString.concat(String.fromCodePoint(0x1f197));
            } else if (currentText.charAt(i) == 'n' && currentText.charAt(i + 1) == 'g') {
                outputString = outputString.substr(0,outputString.length - 1); 
                i++; //Skip the second char
                outputString = outputString.concat(String.fromCodePoint(0x1f196));
            } else if (currentText.charAt(i) == 'a' && currentText.charAt(i + 1) == 'b') {
                outputString = outputString.substr(0,outputString.length - 2); //??? buggy idk why its 2
                i++; //Skip the second char
                outputString = outputString.concat(String.fromCodePoint(0x1f18e));
            }
        }
        i++;
    }
    console.log(outputString);
    outputText.innerHTML = outputString;
}

function deleteText() {
    outputText.innerHTML = "";
    //HOW TO MAKE INNER TEXT DELETE AS WELL?
//    <textarea id="test-area" name="textarea" rows="6" placeholder="Type here!"></textarea>  
//    const el = document.createElement('textarea');
//    el.id = "#test-area";
//    inputBox.parentNode.replaceChild(el, inputBox);
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

clearButton.addEventListener("click", deleteText, false);
copyButton.addEventListener("click", copyText, false);

