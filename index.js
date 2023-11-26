/* 
* Preloading
*/
this.addEventListener("DOMContentLoaded", preloadImages, true);
console.log("hello")
var loadedImages = 0;
var imagePathArray = new Array(
    "./images/player/jump_0.png",
    "./images/player/stand1_0.png",
    "./images/player/stand1_1.png",
    "./images/player/stand1_2.png",
    "./images/player/walk1_0.png",
    "./images/player/walk1_1.png",
    "./images/player/walk1_2.png",
    "./images/player/walk1_3.png",
    "./images/codingSign.png",
    "./images/climbingSign.png",
    "./images/grass1.png"
);

var imageCache = {};

function preloadImages(e) {
    for (var i = 0; i < imagePathArray.length; i++) {
        var tempImage = new Image();
        tempImage.addEventListener("load", trackProgress, true);
        tempImage.src = imagePathArray[i];
        imageCache[imagePathArray[i]] = tempImage;
    }
};

function trackProgress() {
    loadedImages++;
    if (loadedImages == imagePathArray.length) {
        window.requestAnimationFrame(loop);
    }
};

/*
* Game Variables
*/
let canvas = document.querySelector('canvas');
const c = canvas.getContext("2d");

c.canvas.width = window.innerWidth;
c.canvas.height = window.innerHeight;

const JumpHeight = 20; 
const Gravity = 1.5;
const AnimationTimeBuffer = 30;

var FrameCount = 0;

/*
*Background, Map, Floor
*/
var tileSheet = new Image();
tileSheet.src = "./images/tiles.png";

const Bg0 = {
    width: 1984,
    height: 1088,
    image: new Image(),
    locations: [],
    currentMaxLocationIndex: 0,
    moveRate: .3,
};

const Bg1 = {
    width: 1984,
    height: 1088,
    image: new Image(),
    locations: [],
    currentMaxLocationIndex: 0,
    moveRate: 1,
    color: "203 240 255"
};

const Map = {
    tsize: 64,
    cols: 888,
    rows: 2,
    tiles: [],
    getTile: function (col, row) {
        return this.tiles[row * Map.cols + col];
    }
};

const Floor = {
    height: c.canvas.height > Bg0.height ? Bg0.height - (1.5 * Map.tsize) : c.canvas.height - (1.5 * Map.tsize),
    rightX: 0,
    leftX: 0,
};

if  (c.canvas.height > Bg0.height) {
    Map.rows = Math.ceil((c.canvas.height - Floor.height) / Map.tsize);
}

Map.tiles = new Array(Map.cols * Map.rows);
Map.tiles.fill(0, 0, Map.cols);
Map.tiles.fill(1, Map.cols);

Map.length = Map.cols * Map.tsize;

var numBgImages = Math.ceil(Map.length / Bg0.width) + 1;
Bg0.locations = Array.from({length: numBgImages}, (_, index) => index * Bg0.width);
Bg0.currentMaxLocationIndex = Bg0.locations.length - 1;
Bg0.image.src = "./images/bg_0.png";

Bg1.locations = Array.from({length: numBgImages}, (_, index) => index * Bg1.width);
Bg1.currentMaxLocationIndex = Bg1.locations.length - 1;
Bg1.image.src = "./images/bg_1.png";

/*
* Player
*/
const PlayerStates = {
    Idle: 0,
    Jumping: 1,
    Walking: 2
};

const Player = {
    x: Map.length / 2,
    xVelocity: 0,
    y: 0,
    yVelocity: 0,
    height: 160,
    width: 94,
    image: new Image(),
    state: PlayerStates.Jumping,
    idleSpriteFrame: 0,
    idleSpriteFrameIsIncreasing: true,
    walkSpriteFrame: 0,
    isGoingToTheRight: true
};

/*
* Camera
*/
function Camera(map, width, height) {
    this.x = 0;
    this.y = 0;
    this.width = width;
    this.height = height;
    this.minX = 0;
    this.maxX = map.cols * map.tsize - width;
};

Camera.prototype.follow = function(player) {
    this.following = player;
};

Camera.prototype.update = function() {
    this.following.screenX = this.width / 2;
    this.x = this.following.x - this.width / 2;

    this.x = Math.max(this.minX, Math.min(this.x, this.maxX));

    if (this.following.x < this.width / 2 ||
    this.following.x > this.maxX + this.width / 2) {
        this.following.screenX = this.following.x - this.x;
    }
};

const camera = new Camera(Map, c.canvas.width, c.canvas.height);
camera.follow(Player);

/*
* Controller
*/
let userInputIsAllowed = true;

const Controller = {
    left: false,
    right: false,
    up: false,
    userInputRegistered: false,

    keyListener: function(event) {
        let keyState = (event.type == "keydown");
        switch (event.keyCode) {
            case 37: // left arrow
                Controller.left = keyState;
                break;
            case 38: // up arrow
                Controller.up = keyState;
                break;
            case 39: // right arrow
                Controller.right = keyState;
                break;
        }
    }
};

/*
* Mouse
*/
const Mouse = {
    x: 0,
    y: 0
};

/*
* Foreground and Background Objects
*/
var backgroundObjects = [];
var foregroundObjects = [];

/*
* Image Objects
*/
function imageObject(x, y, img) {
    this.x = x;
    this.y = y;
    this.image = img;
    this.draw = (context) => {context.drawImage(this.image, Math.floor(this.x - camera.x), Math.floor(this.y));};
}

const signWidth = 219;
const signHeight = 200;

const codingSignImage = new Image();
codingSignImage.src = "./images/codingSign.png";
const climbingSignImage = new Image();
climbingSignImage.src = "./images/climbingSign.png";
let codingSign = new imageObject(Map.cols * Map.tsize / 2 + 500 - signWidth, Floor.height - signHeight, codingSignImage);
let climbingSign = new imageObject(Map.cols * Map.tsize / 2 - 500, Floor.height - signHeight, climbingSignImage);
backgroundObjects.push(codingSign, climbingSign);

/*
* Text
*/
const FontHeadingLevels = {
    H1 : {value: c.canvas.width <= 500 ? 80 : 100},
    H2 : {value: c.canvas.width <= 500 ? 40 : 50},
    P : {value: c.canvas.width <= 500 ? 25 : 30}
}

function Text(words, x, y, fontSize) {
    this.words = words;
    this.x = x;
    this.y = y;
    this.fontSize = fontSize;
    this.isVisible = true;
    this.draw = drawText;
}

function TextBubble(text, x, y, minX, maxX) {
    this.x = x;
    this.y = y;
    this.text = text;
    this.fontSize = FontHeadingLevels.P;
    this.maxLineWidth = c.canvas.width / 1.3;
    this.leading = 10;
    this.colors1 = ["#000000", "#98A4CA", "#A9ACCB", "#C9D7F2", "#ECEFF8"];
    this.colors2 = ["#000000", "#AFB5CF", "#CCD5E7", "#ECEFF8"];
    this.minX = minX,
    this.maxX = maxX,
    this.draw = drawTextBubble;
}

const cornerImage = new Image();
const triangleImage = new Image();

cornerImage.src = "./images/DialogCorners.png"
triangleImage.src = "./images/DialogTriangle.png";

TextBubble.prototype.cornerImage = cornerImage;
TextBubble.prototype.triangleImage = triangleImage;

const codingStory = [
    "Welcome to my website! I'm a 25-year-old software engineer passionate about using code to bring ideas to life.",
    "Here are some of my recent projects. You can hover over them with your mouse to learn more.",
    "If I am talking too slowly, feel free to use the scroll wheel.",
    "Let me tell you a little bit about myself:",
    "I like tinkering and building, climbing, night walks, manga, and adventure.",
    "Dislikes include: loud places, Atlanta traffic, social media that makes you look at your phone too much, and alfredo pasta (too cheesy)",
    "I graduated suma cum laude from Georgia Tech with a B.S. in Computational Media and Chinese in 2021.",
    "After graduating, I worked at Microsoft for two years as a software engineer in the M365 organization.",
    "I got a glimpse at what software engineering inside Big Tech is like.",
    "I was developing the skills to become a better engineer, like monitoring service health telemetry during on call rotations, or tracking code changes through the scheduled cycles of the CI/CD pipeline. I wrote production code in C#, NodeJS, React, and TypeScript (among others) while using TDD to ensure requirements were satisfied. Equally as important, I was also learning how to work and communicate effectively in an agile team full of really knowledgable people.",
    "At the start of 2023, I made a big bet on myself: I took a hiatus from my software career to focus on being a professional athelete and try to make the US climbing team.",
    "It turns out that climbing is pretty hard. And I learned that I perform best when there's a balance between my coding and climbing, which I talk about more in the climbing section.",
    "I also wanted to see what the world outside of Big Tech looked like.",
    "So, \"Hello World!\" 😁 If you are hiring, I am actively searching for my next software engineering role.",
    "Thanks for getting to know me a little.",
];

const textBubbleArray = [];
let startX = Map.length / 2 + 500;
let endX;
const ReadingSpeedPixelsPerCharacter =  7;
const grassMarkerImage = new Image();
grassMarkerImage.src = "./images/grass1.png";

for (let i = 0; i < codingStory.length; i++) {
    if (i == codingStory.length - 1) {
        endX = startX + 500 - ((startX + 500) % Map.tsize);
        Floor.rightX = startX + 500 - ((startX + 500) % Map.tsize);
    } else {
        endX = startX + codingStory[i].length * ReadingSpeedPixelsPerCharacter;
    }
    textBubbleArray.push(new TextBubble(codingStory[i], Player.x, Player.y,  startX, endX));
    foregroundObjects.push(new imageObject(startX, Floor.height - 55, grassMarkerImage));
    startX = endX;
}

const climbingStory = [
    "👊 what's up! I've been climbing for 11 years and I love it.",
    "Right now, I'm mainly training for indoor competitions with a focus on hard single-pitch lead routes, but I also enjoy lowball to highball boulders and dabble in buildering. I've even done some speed climbing on the 15 meter IFSC wall (6.52 seconds).",
    "Whether it's standing on the podium at Nationals, or standing on top of V12s outside, my climbing achievements always teach me how to think outside of the box, push myself to accomplish the epic, and find balance in life.",
    "I started climbing in my first year of high school. I was kind of a nerdy kid. OK, not kind of, I was pretty nerdy.",
    "My main hobby was playing Call of Duty, and I was shy. So I wasn't exactly the picture of a fit, confident athlete back then.",
    "One day in 2012, a friend of my mom's suggested that I should try out climbing, and also mentioned that her daughter climbed at what was at the time the nation's largest climbing gym, Stone Summit. So I went.",
    "When I was on the wall, and not freaking out about the height, my mind could find a focus where I didn't think about anything else except what I was holding on to. I would no longer dwell on what happened earlier that day, and I was free from the stress of tomorrow.",
    "After switching out my punch pass for a membership, I joined a youth team at the gym and started training with them.",
    "It was a fine balance to chase grades both in the climbing gym and in school. My time had to be handled more carefully, and I sacrificed the gaming, among other activities that competed for my time.",
    "The implicit agreement with my parents was that they would keep sending me to the gym as long as I performed at school.",
    "Little did I know back then that they were setting the framework of how I would approach balancing climbing with the rest of my life while in college, and in developing my professional career.",
    "In 2020, I made my first open Nationals final in Dallas, Texas during the Combined Open Invitational. It was a challenging competition requiring mastery in three climbing disciplines: speed, lead and bouldering. The winner would go on to take a ticket that sent them to the 2020 Olympics.",
    "Although I didn't win that ticket, I felt like I broke through a barrier in my climbing. I was also pushing through one of my most challenging years as a Junior and an RA at the Georgia Institute of Technology.",
    "It's funny how my best competition result so far is at the 2022 US Open Nationals, when I was working full-time as a software engineer at Microsoft. I got 3rd in bouldering and 4th in lead 😁.",
    "It seems like the formula for success in my climbing and my career requires balance. So I'm trying to continue my Hannah Montana lifestyle to this day. I moved to Salt Lake City in 2023 to train to make the US Team and I'm actively looking for my next move in my software engineering career.",
    "But when I'm not training for competitions or grinding LeetCode, I love getting some fresh air outside and climbing on real rocks. Especially sandstone.",
    "Thanks for getting to know me a little."
];

startX = Map.length / 2 - 500;
for (let i = 0; i < climbingStory.length; i++) {
    if (i == climbingStory.length - 1) {
        endX = startX - 500 - ((startX - 500) % Map.tsize);
        Floor.leftX = startX - 500 - ((startX - 500) % Map.tsize);
    } else {
        endX = startX - climbingStory[i].length * ReadingSpeedPixelsPerCharacter;
    }
    textBubbleArray.push(new TextBubble(climbingStory[i], Player.x, Player.y,  endX, startX));
    foregroundObjects.push(new imageObject(startX, Floor.height - 55, grassMarkerImage));
    startX = endX;
}

cutOffFloorEdgesInMap(c);

const welcomeText = new Text("Hey! I'm Luke.", Map.cols * Map.tsize / 2, c.canvas.height / 2, FontHeadingLevels.H1);
const pressArrowKeysText = new Text("USE ARROW KEYS TO MOVE", welcomeText.x, welcomeText.y + 70, FontHeadingLevels.H2);
pressArrowKeysText.isVisible = false;

const UserGuidance = setInterval(() => {
    if (!Controller.userInputRegistered) {
        pressArrowKeysText.isVisible = !pressArrowKeysText.isVisible;
    } else {
        pressArrowKeysText.isVisible = false;
        clearInterval(UserGuidance);
    }
}, 1500);

pressArrowKeysText.draw = (c, text) => {
    if (pressArrowKeysText.isVisible) {
        drawText(c, text);
    }
}

var welcomeTextArray = [welcomeText, pressArrowKeysText];

// Animation to mitigate FOUT and fade in 
var canShowText = false;
const fontInterval = setInterval(() => {
    if (document.fonts.check("12px 'Handjet'")) {
        canShowText = true;
        animateText = true;
        clearInterval(fontInterval);
    }
}, 100);

const fontTimeout = setTimeout(() => {
    canShowText = true;
    animateText = true;
}, 1000);

var animateText = false;
var textAlpha = 0;

const likesImage = new Image();
likesImage.src = "./images/likes.png";
const instagramImage = new Image();
instagramImage.src = "./images/ig.png";
const gtImage = new Image();
gtImage.src = "./images/gt.png";

let likes = new imageObject((textBubbleArray[4].minX + textBubbleArray[4].maxX) / 2 - likesImage.width / 2 , 300, likesImage);
let instagram = new imageObject((textBubbleArray[5].minX + textBubbleArray[5].maxX) / 2 - instagramImage.width / 2, 300, instagramImage);
let gt = new imageObject((textBubbleArray[6].minX + textBubbleArray[6].maxX) / 2 - 150, 300, gtImage);
backgroundObjects.push(likes, instagram, gt);

const CircleRadius = 100;
const CircleCenter = {x: (textBubbleArray[7].minX + textBubbleArray[7].maxX) / 2 , y: 300 };
let rect1 = {x: CircleCenter.x + Math.cos(0) , y: CircleCenter.y + Math.sin(0), angle:0, color:"243 83 37"};
let rect2 = {x: CircleCenter.x + Math.cos(0) , y: CircleCenter.y + Math.sin(1), angle: Math.PI / 2, color:"129 188 6"};
let rect3 = {x: CircleCenter.x + Math.cos(-1) , y: CircleCenter.y + Math.sin(0), angle: Math.PI, color:"5 166 240"};
let rect4 = {x: CircleCenter.x + Math.cos(-1) , y: CircleCenter.y + Math.sin(-1), angle: Math.PI * 3/2, color:"255 186 8"};
let microsoftRectangles = [rect1, rect2, rect3, rect4];

/*
* Project Demos
*/
function projectDemo(x, y, img, headerText, text, link) {
    this.x = x;
    this.y = y;
    this.width;
    this.height;
    this.image = img;
    this.headerText = headerText;
    this.text = text;
    this.link = link;
    this.fontSize = FontHeadingLevels.P;
    this.maxLineWidth = 600;
    this.leading = 10;
    this.colors1 = ["#000000", "#98A4CA", "#A9ACCB", "#C9D7F2", "#ECEFF8"];
    this.colors2 = ["#000000", "#AFB5CF", "#CCD5E7", "#ECEFF8"];
    this.draw = drawProjectDemo;
    this.detectMouseHover = detectMouseHover;
}

let lamboChaseImage = new Image();
lamboChaseImage.src = "./images/lamboChaseProj.png";
let lamboChaseDemo = new projectDemo(textBubbleArray[1].maxX - 300, 25, lamboChaseImage, "Lambo Chase GBA", "GameBoy Advance game written in C.", "https://youtu.be/cMJ9Ia6SovY");

let websiteProjImage = new Image();
websiteProjImage.src = "./images/websiteProj.png";
let websiteDemo = new projectDemo(lamboChaseDemo.x + 300, 25, websiteProjImage, "Personal website", "Coded in vanilla JS using the Canvas API.", "https://lukemuehring.github.io/"); 

let emojiTextImage = new Image();
emojiTextImage.src = "./images/emojiTextProj.png";
let emojiTextDemo = new projectDemo(websiteDemo.x + 300, 25, emojiTextImage, "Emoji Text", "Converts text to emoji.", "./emojiText/emojiText.html");

var demos = new Array();
demos.push(websiteDemo, emojiTextDemo, lamboChaseDemo);

/*
* Animation Loop
*/
const loop = function() {
    /*
    * Responsive Scaling
    */
    if (window.innerWidth != c.canvas.width || window.innerHeight != c.canvas.height) {
        handleCanvasResize(c);
    }

    /*
    * Controller Input
    */
    if (Player.y > Floor.height && userInputIsAllowed) {
        userInputIsAllowed = false;
        setTimeout(() => {
            Player.x = Map.length / 2;
            Player.y = 0;
            Player.xVelocity = 0;
            Player.yVelocity = 0;
            userInputIsAllowed = true;
        }, 1000);
    }

    if ((Controller.up || Controller.left || Controller.right) && userInputIsAllowed) {
        Controller.userInputRegistered = true;
        if (Controller.up && Player.state != PlayerStates.Jumping) {
            Player.yVelocity -= JumpHeight;
        }
        if (Controller.left) {
            Player.xVelocity -= .5;
        }
    
        if (Controller.right) {
            Player.xVelocity += .5;
        }
    }

    /*
    * Gravity and Friction
    */
    Player.yVelocity += Gravity;
    Player.x += Player.xVelocity;
    Player.y += Player.yVelocity;

    Player.xVelocity *= .9;

    // If the xVelocity is close enough to 0, we set it to 0 for animation purposes.
    if (Player.xVelocity <= 0.2 && Player.xVelocity >= -0.2) {
        Player.xVelocity = 0;
    }
    Player.yVelocity += .9;

    /*
    * Floor Collision
    */
    if (Player.y > Floor.height && Player.x < Floor.rightX && Player.x > Floor.leftX) {
        Player.y = Floor.height;
        Player.yVelocity = 0;
    }

    Player.x = Math.max(0, Math.min(Player.x, Map.cols * Map.tsize));

    camera.update();

    /*
    * Background Draw
    */
    c.save();
    c.fillStyle = "rgb(" + Bg1.color + ")";
    c.fillRect(0,0,c.canvas.width,c.canvas.height);
    c.restore();

    drawBackground(c, Bg0);
    drawBackground(c, Bg1);

    /*
    * Background Object Draw
    */
    for (let i = 0; i < backgroundObjects.length; i++) {
        c.drawImage(backgroundObjects[i].image, Math.floor(backgroundObjects[i].x - camera.x), Math.floor(backgroundObjects[i].y));
    }

    drawRotatingMicrosoftLogo(c, microsoftRectangles);

    /*
    * Demos Draw
    */
    c.save();
    if (animateText) {
        c.globalAlpha = 100 * textAlpha ** 3;
        textAlpha += .01;
        if (c.globalAlpha >= 1) {
            animateText = false;
        }
    }

    for (let i = 0; i < demos.length; i++) {
        demos[i].draw(c);
        if (demos[i].detectMouseHover(demos[i].x, demos[i].y, demos[i].width, demos[i].height)) {
            // draw transparent rectangle for demo
            drawHoverBox(c, demos[i].x, demos[i].y, demos[i].width, demos[i].height, demos[i].colors1.length);
        }
    }

    /*
    * Text Draw
    */
    for (let i = 0; i < welcomeTextArray.length; i++) {
        welcomeTextArray[i].draw(c,welcomeTextArray[i]);
    }

    for (let i = 0; i < textBubbleArray.length; i++) {
        if (textBubbleArray[i].minX < Player.x && textBubbleArray[i].maxX > Player.x) {
            textBubbleArray[i].draw(c);
        }
    }
    c.restore();

    /*
    * Player Draw
    */
    drawPlayer(c);

    /*
    * Foreground Object Draw
    */
    for (let i = 0; i < foregroundObjects.length; i++) {
        foregroundObjects[i].draw(c);
    }
    

    /*
    * Floor Draw
    */
    var startCol = Math.floor(camera.x / Map.tsize);
    var endCol = startCol + (camera.width / Map.tsize) + 2;
    var offsetX = -camera.x + startCol * Map.tsize;

    for (let column = startCol; column < endCol; column++) {
        for (let row = 0; row < Map.rows; row++) {
            const tile = Map.getTile(column, row);
            const x = (column - startCol) * Map.tsize + offsetX;
            const y = row * Map.tsize;

            c.drawImage(
                tileSheet, // image
                tile * Map.tsize, // source x
                0, // source y
                Map.tsize, // source width
                Map.tsize, // source height
                Math.floor(x),  // target x
                y + Floor.height, // target y
                Map.tsize, // target width
                Map.tsize // target height
            );
        }
    }

    /*
    * Animation
    */
    window.requestAnimationFrame(loop);
    FrameCount++;
    if (FrameCount >= Number.MAX_SAFE_INTEGER) {
        FrameCount = 0;
    }
};

function handleCanvasResize(context) {
    context.canvas.width = window.innerWidth;
    context.canvas.height = window.innerHeight;

    camera.width = window.innerWidth;
    camera.height = window.innerHeight;

    resizeMap(context);

    for (let i = 0; i < textBubbleArray.length; i++) {
        textBubbleArray[i].maxLineWidth = context.canvas.width / 1.3;
    } 

    FontHeadingLevels.H1.value = context.canvas.width <= 500 ? 80 : 100;
    FontHeadingLevels.H2.value = context.canvas.width <= 500 ? 40 : 50;
    FontHeadingLevels.P.value = context.canvas.width <= 500 ? 25 : 30;
}

function resizeMap(context) {
    if (context.canvas.height >= (Floor.height + Map.tsize * 1.5)) {
        Map.rows = Math.ceil((context.canvas.height - Floor.height) / Map.tsize);
    } else {
        Map.rows = 2;
    }
    
    Map.tiles = new Array(Map.cols * Map.rows);
    Map.tiles.fill(0, 0, Map.cols);
    Map.tiles.fill(1, Map.cols);
    
    Map.length = Map.cols * Map.tsize;

    cutOffFloorEdgesInMap(context);

}

function cutOffFloorEdgesInMap(context) {
    let row = 0;
    let rightEndX = textBubbleArray[codingStory.length - 1].maxX;
    for (let j = Math.floor(rightEndX / Map.tsize); j < Map.tiles.length; j += Map.cols) {
        row++;
        Map.tiles.fill(2,j, Map.cols * row);
    }

    let leftEndX = textBubbleArray[textBubbleArray.length - 1].minX;

    let endTile = Math.floor(leftEndX / Map.tsize);
    for (let j = 0; j < Map.rows; j++) {
        Map.tiles.fill(2, j * Map.cols, j * Map.cols + endTile);
    }
}


function drawPlayer(context) {
    if (Player.y < Floor.height) {
        Player.state = PlayerStates.Jumping;
    } else if ((Player.xVelocity <= -1 || Player.xVelocity) >= 1 && Player.y != PlayerStates.Jumping) {
        Player.state = PlayerStates.Walking;
        Player.isGoingToTheRight = Player.xVelocity > 0;
    } else {
        Player.state = PlayerStates.Idle;
    }

    
    switch(Player.state) {
        case PlayerStates.Jumping:
            Player.image = imageCache["./images/player/jump_0.png"];
            break;
        case PlayerStates.Walking:
            if (FrameCount % (AnimationTimeBuffer / 5) == 0) {
                Player.walkSpriteFrame = (Player.walkSpriteFrame + 1) % 4;
            }
            Player.image = imageCache["./images/player/walk1_" + Player.walkSpriteFrame + ".png"];
            break;
        case PlayerStates.Idle:
            if (FrameCount % AnimationTimeBuffer == 0 && Player.xVelocity == 0) {
                if (Player.idleSpriteFrame == 2)
                {
                    idle_sprite_frame_is_increasing = false;
                } else if (Player.idleSpriteFrame == 0) {
                    idle_sprite_frame_is_increasing = true;
                }

                if (idle_sprite_frame_is_increasing) {
                    Player.idleSpriteFrame = (Player.idleSpriteFrame + 1);
                } else {
                    Player.idleSpriteFrame = (Player.idleSpriteFrame - 1);
                }
                Player.image = imageCache["./images/player/stand1_" + Player.idleSpriteFrame + ".png"];
            }
            break;
    }

    if (Player.isGoingToTheRight) {
        drawFlippedImage(
            c, 
            Player.image,
            Player.screenX - Player.width / 2,
            Player.y - Player.image.naturalHeight
        );
    } else {
        c.drawImage(
            Player.image,
            Player.screenX - Player.width / 2,
            Player.y - Player.image.naturalHeight);
    }
}

function drawBackground(context, background) {
    for (i = 0; i < background.locations.length; i++) { 
        if (background.locations[i] + background.width < 0) {
            background.locations[i] = background.locations[background.currentMaxLocationIndex] + background.width;
            background.currentMaxLocationIndex = i;
        }

        background.locations[i] -= background.moveRate;

        context.drawImage(background.image, background.locations[i], 0);  
    }
}

function drawRotatingMicrosoftLogo(context, microsoftRectangles) {
    context.save();
    for (let i = 0; i < microsoftRectangles.length; i++) {
        microsoftRectangles[i].angle+=.01;
        microsoftRectangles[i].x = CircleCenter.x + Math.cos(microsoftRectangles[i].angle) * CircleRadius;
        microsoftRectangles[i].y = CircleCenter.y + Math.sin(microsoftRectangles[i].angle) * CircleRadius;
        context.fillStyle = "rgb(" + microsoftRectangles[i].color + ")";
        context.fillRect(Math.floor(microsoftRectangles[i].x - camera.x), Math.floor(microsoftRectangles[i].y), 100, 100);
    }
    context.restore();
}

function drawText(context, text) {
    if (!canShowText) {
        return;
    }
    
    context.font = getFont(text.fontSize.value);
    context.fillText(text.words, text.x - camera.x - context.measureText(text.words).width / 2, text.y);
}

function drawTextBubble(context) {
    if (!canShowText) {
        return;
    }
    context.font = getFont(this.fontSize.value);

    const {whiteBoxHeight, whiteBoxWidth, linesOfTextArray} = getLinesOfText(context, this.text, this.fontSize.value, this.leading, this.maxLineWidth);
    let lines = {
        header: null,
        paragraphText: linesOfTextArray
    };

    let paddingBetweenDialogAndPlayer = 10;

    this.x = Player.screenX;
    this.y = Player.y - Player.image.naturalHeight - whiteBoxHeight - paddingBetweenDialogAndPlayer;

    drawWhiteBoxWithTextAndImage(context, this.x, this.y, whiteBoxHeight, whiteBoxWidth, lines, null, this.fontSize.value, this.leading, this.colors1, this.colors2);

    if (!Player.isGoingToTheRight) {
        context.drawImage(this.triangleImage, this.x, this.y + whiteBoxHeight);  
    } else {
        drawFlippedImage(context, this.triangleImage, this.x, this.y + whiteBoxHeight);
    }
}

function drawProjectDemo(context) {
    if (!canShowText) {
        return;
    }
    context.font = getFont(this.fontSize.value);

    const paragraphLines = getLinesOfText(context, this.text, this.fontSize.value, this.leading, this.image.width);
    const whiteBoxHeight1 = paragraphLines.whiteBoxHeight
    const whiteBoxWidth1 = paragraphLines.whiteBoxWidth
    const paragraphText = paragraphLines.linesOfTextArray;

    const headerLines = getLinesOfText(context, this.headerText, this.fontSize.value, this.leading, this.image.width);
    const whiteBoxHeight2 = headerLines.whiteBoxHeight;
    const whiteBoxWidth2 = headerLines.whiteBoxWidth
    const header = headerLines.linesOfTextArray;
    
    let lines = {
        header: header,
        paragraphText: paragraphText
    };

    const {width: demoWidth, height: demoHeight} = drawWhiteBoxWithTextAndImage(context, this.x - camera.x, this.y, whiteBoxHeight1 + whiteBoxHeight2, Math.max(whiteBoxWidth1, whiteBoxWidth2), lines, this.image, this.fontSize.value, this.leading, this.colors1, this.colors2);
    this.width = demoWidth;
    this.height = demoHeight;
}

function detectMouseHover(x, y, width, height) {
    if (Mouse.x >= x - width / 2 - camera.x && Mouse.x <= x + width / 2 - camera.x) {
        if (Mouse.y >= y && Mouse.y < y + height) {
            this.hover = true;
            return true;
        }
    } else {
        this.hover = false;
        return false;
    }
}

function drawHoverBox(context, x, y, width, height, borderLength) {
    context.save();
    context.fillStyle = "rgb(0 0 0 / .5)";
    context.fillRect(Math.floor(x - camera.x) - width / 2, Math.floor(y - camera.y - borderLength), width, height + borderLength * 2);

    context.fillStyle = "white";
    let fontSize = FontHeadingLevels.P;
    context.font = getFont(fontSize);

    let textX = Math.floor(x - camera.x - context.measureText("demo").width / 2);
    let textY = Math.floor(y + height / 2);
    let padding = Math.floor(fontSize / 10);
    context.fillText("demo", textX, textY);

    context.strokeStyle = "white";
    context.beginPath();
    context.moveTo(textX, textY + padding);
    context.lineTo(textX + context.measureText("demo").width, textY + padding);
    context.stroke();
    context.restore();
}

function getLinesOfText(context, text, fontSize, leading, maxLineWidth) {
    let words = text.split(" ");
    let linesOfTextArray = new Array();
    let i = 0;
    let currentMaxLineWidth = 0;
    while (i < words.length) {
        let currentLine = "";
        let currentLineWidth = context.measureText(currentLine).width;

        // In case the window gets scaled so small that you can't fit one word under the maxLineWidth
        if (currentLineWidth + context.measureText(words[i]).width > maxLineWidth) {
            maxLineWidth = currentLineWidth + context.measureText(words[i]).width;
        }

        while (currentLineWidth + context.measureText(words[i]).width <= maxLineWidth && i < words.length) {
            currentLine += words[i] + " ";
            currentLineWidth = context.measureText(currentLine).width;
            i++;
        }

        linesOfTextArray.push(currentLine);

        if (currentMaxLineWidth < currentLineWidth) {
            currentMaxLineWidth = currentLineWidth;
        }
    }

    let whiteBoxHeight = (fontSize + leading) * linesOfTextArray.length;
    let whiteBoxWidth = Math.ceil(currentMaxLineWidth);

    return {
        whiteBoxHeight: whiteBoxHeight,
        whiteBoxWidth: whiteBoxWidth,
        linesOfTextArray: linesOfTextArray   
    };
}

function drawWhiteBoxWithTextAndImage(context, x, y, whiteBoxHeight, whiteBoxWidth, lines, image, fontSize, leading, colors1, colors2) {
    const ElementPadding = 10;

    if (image !== null) {
        whiteBoxHeight += image.height + ElementPadding;
        if (whiteBoxWidth < image.width) {
            whiteBoxWidth = image.width + ElementPadding * 2;
        }
    }

    if (lines.header != null) {
        var HeaderFontSize = fontSize + 8;
        whiteBoxHeight += ElementPadding;

        // for the paragraph text
        whiteBoxHeight += ElementPadding;
    }

    whiteBoxHeight = Math.floor(whiteBoxHeight);
    whiteBoxWidth = Math.floor(whiteBoxWidth);

    context.fillStyle = "white";
    context.fillRect(Math.floor(x - whiteBoxWidth / 2), Math.floor(y), whiteBoxWidth, whiteBoxHeight);

    if (lines.header !== null) {
        context.fillStyle = "black";
        var HeaderSpacing = HeaderFontSize + ElementPadding + (lines.header.length - 1) * (leading + HeaderFontSize);

        context.font = "bold " + getFont(HeaderFontSize);
        for (let i = 0; i < lines.header.length; i++) {
            context.fillText(lines.header[i], Math.floor(x - whiteBoxWidth / 2 + ElementPadding), Math.floor(y + HeaderFontSize + i * (leading + HeaderFontSize) + ElementPadding));
        }
    }

    if (image !== null) {
        context.drawImage(image, Math.floor(x - whiteBoxWidth / 2 + ElementPadding), Math.floor(y + ElementPadding + HeaderSpacing));
    }

    // Drawing the text in the white box
    context.fillStyle = "black";
    context.font = getFont(fontSize);
    let linesOfTextArray = lines.paragraphText;
    for (let i = 0; i < linesOfTextArray.length; i++) {
        if (image !== null) {
            context.fillText(linesOfTextArray[i], Math.floor(x - whiteBoxWidth / 2 + ElementPadding), Math.floor(y + fontSize + i * (leading + fontSize) + image.height  + HeaderSpacing + ElementPadding));
        } else {
            context.fillText(linesOfTextArray[i], Math.floor(x - whiteBoxWidth / 2 + ElementPadding / 3), Math.floor(y + fontSize + i * (leading + fontSize)));
        }
    }

    // Drawing the borders of the white box
    // Top and Bottom
    for (let i = 0; i < colors1.length; i++) {
        context.fillStyle = colors1[i];
        context.fillRect(Math.floor(x - whiteBoxWidth / 2), Math.floor(y - colors1.length + i), whiteBoxWidth, 1);
        context.fillRect(Math.floor(x - whiteBoxWidth / 2), Math.floor(y + whiteBoxHeight - i + colors1.length - 1), whiteBoxWidth, 1);
    }

    // Left and Right
    for (let i = 0; i < colors2.length; i++) {
        context.fillStyle = colors2[i];
        context.fillRect(Math.floor(x - whiteBoxWidth / 2 - colors2.length + i), Math.floor(y), 1, whiteBoxHeight);
        context.fillRect(Math.floor(x + whiteBoxWidth / 2 + colors2.length - 1 - i), Math.floor(y), 1, whiteBoxHeight);
    }

    // Drawing the corners
    context.drawImage(
        cornerImage, // image
        0, // source x
        0, // source y
        4, // source width
        5, // source height
        Math.floor(x - whiteBoxWidth / 2 - colors2.length),  // target x
        Math.floor(y - colors1.length), // target y
        4, // target width
        5 // target height
    );

    context.drawImage(
        cornerImage,
        4,
        0,
        4,
        5,
        Math.floor(x - whiteBoxWidth / 2 - colors2.length),
        Math.floor(y + whiteBoxHeight),
        4,
        5
    );

    context.drawImage(
        cornerImage,
        8,
        0,
        4,
        5,
        Math.floor(x + whiteBoxWidth / 2),
        Math.floor(y - colors1.length),
        4,
        5
    );

    context.drawImage(
        cornerImage,
        12,
        0,
        4,
        5,
        Math.floor(x + whiteBoxWidth / 2),
        Math.floor(y + whiteBoxHeight),
        4,
        5
    );

    context.fillStyle = "black"; 

    return {
        width: whiteBoxWidth + 2 * colors2.length,
        height: whiteBoxHeight
    }
}

function drawFlippedImage(context, image, x, y) {
    context.save();
    context.translate(x+image.width/2,0);
    context.scale(-1,1);
    context.translate(-(x+image.width/2),0);
    context.drawImage(image, x, y);
    context.restore();
};

function getFont(fontSize) {
    if (document.fonts.check("12px 'Handjet'")) {
        return fontSize + "px 'Handjet'";
    } else if (document.fonts.check("12px 'Arial Narrow'")){
        return (fontSize - 8) + "px 'Arial Narrow'";
    } else {
        return (fontSize - 8) + "px sans-serif";
    }
}

function scrollPlayer(event) {
    event.preventDefault();
    if (userInputIsAllowed) {
        Player.xVelocity += event.deltaY * .1;
    }
}

function updateMousePosition(event) {
    if (Mouse.x != event.clientX) {
        Mouse.x = event.clientX;
    }
    if (Mouse.y != event.clientY) {
        Mouse.y = event.clientY;
    }
}

function sendToLink(event) {
    console.log("click detected");
    for (let i = 0; i < demos.length; i++) {
        if (demos[i].hover) {
            window.open(demos[i].link,"_blank");
            return;
        }
    }
}

const ongoingTouches = [];

function copyTouch({ identifier, clientX, clientY }) {
    return { identifier, clientX, clientY };
}

function ongoingTouchIndexById(idToFind) {
    for (let i = 0; i < ongoingTouches.length; i++) {
      const id = ongoingTouches[i].identifier;
  
      if (id === idToFind) {
        return i;
      }
    }
    return -1; // not found
}
  
function handleTouchStart(evt) {
    const touches = evt.changedTouches;
    Mouse.x = touches[0].clientX;
    Mouse.y = touches[0].clientY;
    
    for (let i = 0; i < touches.length; i++) {
      ongoingTouches.push(copyTouch(touches[i]));
    }
}

function handleTouchMove(evt) {
    evt.preventDefault();
    const touches = evt.changedTouches;
  
    for (let i = 0; i < touches.length; i++) {
      const idx = ongoingTouchIndexById(touches[i].identifier);
  
      if (idx >= 0) {
        if (userInputIsAllowed) {
            Player.xVelocity += .3 * (ongoingTouches[idx].clientX - touches[i].clientX);  
        }
        ongoingTouches.splice(idx, 1, copyTouch(touches[i])); // swap in the new touch record
      } else {
        console.log(("can't figure out which touch to continue"));
      }
    }
 }

 function handleTouchEnd(evt) {
    const touches = evt.changedTouches;
  
    for (let i = 0; i < touches.length; i++) {
      let idx = ongoingTouchIndexById(touches[i].identifier);
  
      if (idx >= 0) {
        ongoingTouches.splice(idx, 1); // remove it; we're done
      } else {
        console.log("can't figure out which touch to end");
      }
    }
}

function handleTouchCancel(evt) {
    evt.preventDefault();
    const touches = evt.changedTouches;
  
    for (let i = 0; i < touches.length; i++) {
      let idx = ongoingTouchIndexById(touches[i].identifier);
      ongoingTouches.splice(idx, 1); // remove it; we're done
    }
}

window.addEventListener("keydown", Controller.keyListener)
window.addEventListener("keyup", Controller.keyListener);
window.addEventListener("wheel", scrollPlayer, {passive: false});
window.addEventListener("mousemove", updateMousePosition);
window.addEventListener("click", sendToLink);
window.addEventListener("touchstart", handleTouchStart);
window.addEventListener("touchend", handleTouchEnd);
window.addEventListener("touchcancel", handleTouchCancel);
window.addEventListener("touchmove", handleTouchMove);

/* CREDITS
 * Free - Adventure Pack - Grassland by Anokolisa
 * 
 */

/*  TODO
* mobile version
* refactor 🤣
*/