/* 
* Preloading
*/
this.addEventListener("DOMContentLoaded", preloadImages, true);

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

var canvas_width = window.innerWidth;
var canvas_height = window.innerHeight;

const c = canvas.getContext("2d");

c.canvas.width = canvas_width;
c.canvas.height = canvas_height;

const JUMP_HEIGHT = 20; 
const GRAVITY = 1.5;
const ANIMATION_TIME_BUFFER = 30;

const STATES = {
    Idle: 0,
    Jumping: 1,
    Walking: 2
};

var frame_count = 0;

const player = {
    height: 160,
    width: 94,
    image: new Image(),
    state: STATES.Jumping,
    idle_sprite_frame: 0,
    idle_sprite_frame_is_increasing: true,
    walk_sprite_frame: 0,
    is_going_to_the_right: true,
    x: 0,
    x_velocity: 0,
    y: 0,
    y_velocity: 0,
};

var tiles = new Image();
tiles.src = "./images/tiles.png";

var map = {
    cols: 888,
    rows: 2,
    tsize: 64,
    tiles: [],
    getTile: function (col, row) {
        return this.tiles[row * map.cols + col];
    }
};

map.tiles = new Array(map.cols * map.rows);
map.tiles.fill(0, 0, map.cols);
map.tiles.fill(1, map.cols);

const bg0 = {
    width: 1984,
    image: new Image(),
    locations : [],
    current_max_location_index : 0,
    move_rate: .3,
    draw_rate: 5
};

const bg1 = {
    width: 1984,
    image: new Image(),
    locations : [],
    current_max_location_index : 0,
    move_rate: 1,
    draw_rate: 10
};

var map_length = map.cols * map.tsize;
var num_bg_images = Math.ceil(map_length / bg0.width) + 1;
bg0.locations = Array.from({length: num_bg_images}, (_, index) => index * bg0.width);
bg0.current_max_location_index = bg0.locations.length - 1;
bg0.image.src = "./images/bg_0.png";

bg1.locations = Array.from({length: num_bg_images}, (_, index) => index * bg1.width);
bg1.current_max_location_index = bg1.locations.length - 1;
bg1.image.src = "./images/bg_1.png";

const floor = {
    height: canvas_height - 100,
    rightX: 0,
    leftX: 0
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

Camera.prototype.follow = function(sprite) {
    this.following = sprite;
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

var camera = new Camera(map, canvas_width, canvas_height);
player.x = map.cols * map.tsize / 2;
camera.follow(player);

var playerInputIsAllowed = true;
var controller = {
    left: false,
    right: false,
    up: false,
    user_input_registered: false,

    keyListener: function(event) {
        let key_state = (event.type == "keydown") ? true : false;
        switch (event.keyCode) {
            case 37: // left arrow
                controller.left = key_state;
                break;
            case 38: // up arrow
                controller.up = key_state;
                break;
            case 39: // right arrow
                controller.right = key_state;
                break;
        }
    }
};

/*
* Mouse
*/
var mouse = {
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
let codingSign = new imageObject(map.cols * map.tsize / 2 + 500 - signWidth, floor.height - signHeight, codingSignImage);
let climbingSign = new imageObject(map.cols * map.tsize / 2 - 500, floor.height - signHeight, climbingSignImage);
backgroundObjects.push(codingSign, climbingSign);

/*
* Text
*/
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
    this.fontSize = 30;
    this.maxLineWidth = 600;
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
    "I graduated suma cum laude from Georgia Tech with a BA in Computational Media and Chinese in 2021.",
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
let startX = map_length / 2 + 500;
let endX;
const ReadingSpeedPixelsPerCharacter =  7;
const grass1Image = new Image();
grass1Image.src = "./images/grass1.png";

for (let i = 0; i < codingStory.length; i++) {
    if (i == codingStory.length - 1) {
        endX = startX + 500 - ((startX + 500) % map.tsize);
        floor.rightX = startX + 500 - ((startX + 500) % map.tsize);
        let row = 0;
        for (let j = Math.floor(endX / map.tsize); j < map.tiles.length; j += map.cols) {
            row++;
            map.tiles.fill(2,j, map.cols * row);
        }
    } else {
        endX = startX + codingStory[i].length * ReadingSpeedPixelsPerCharacter;
    }
    textBubbleArray.push(new TextBubble(codingStory[i], player.x, player.y,  startX, endX));
    foregroundObjects.push(new imageObject(startX, floor.height - 55, grass1Image));
    startX = endX;
}

const climbingStory = [
    "👊 what's up! I've been climbing for 11 years and I love it.",
    "Right now, I'm mainly training for indoor competitions with a focus on hard single-pitch lead routes, but I also enjoy lowball to highball boulders and dabble in buildering. I've even done some speed climbing on the 15 meter IFSC wall (6.52 seconds).",
    "Whether it's standing on the podium at Nationals, or standing on top of V12s outside, my climbing achievements always teach me how to think outside of the box, push myself to accomplish the epic, and find balance in life.",
    "I started climbing in my first year of high school. I was kind of a nerdy kid. OK, not kind of, I was pretty nerdy. I always got all As, but I never really got A girl's phone number",
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

startX = map_length / 2 - 500;
for (let i = 0; i < climbingStory.length; i++) {
    if (i == climbingStory.length - 1) {
        endX = startX - 500 - ((startX - 500) % map.tsize);
        floor.leftX = startX - 500 - ((startX - 500) % map.tsize);
        let endTile = Math.floor(endX / map.tsize);
        for (let j = 0; j < map.rows; j ++) {
            map.tiles.fill(2, j * map.cols, j * map.cols + endTile);
        }
    } else {
        endX = startX - climbingStory[i].length * ReadingSpeedPixelsPerCharacter;
    }
    textBubbleArray.push(new TextBubble(climbingStory[i], player.x, player.y,  endX, startX));
    foregroundObjects.push(new imageObject(startX, floor.height - 55, grass1Image));
    startX = endX;
}

const welcomeText = new Text("Hey! I'm Luke.", map.cols * map.tsize / 2, canvas_height / 2, 100);
const pressArrowKeysText = new Text("USE ARROW KEYS TO MOVE", welcomeText.x, welcomeText.y + 70, 40);
pressArrowKeysText.isVisible = false;
pressArrowKeysText.draw = (c, text) => {
    if (!controller.user_input_registered && frame_count > 10) {
        if (frame_count % 60 == 0 ) {
            pressArrowKeysText.isVisible = !pressArrowKeysText.isVisible;
        }
        if (pressArrowKeysText.isVisible) {
            drawText(c, text);
        }
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
instagramImage.src = "./images/instagram.png";
const gtImage = new Image();
gtImage.src = "./images/gt.png";

let likes = new imageObject((textBubbleArray[4].minX + textBubbleArray[4].maxX) / 2 - likesImage.width / 2 , 300, likesImage);
let instagram = new imageObject((textBubbleArray[5].minX + textBubbleArray[5].maxX) / 2 - instagramImage.width / 2, 300, instagramImage);
let gt = new imageObject((textBubbleArray[6].minX + textBubbleArray[6].maxX) / 2 - 150, 300, gtImage);
backgroundObjects.push(likes, instagram, gt);

const CircleRadius = 100;
const CircleCenter = {x: (textBubbleArray[7].minX + textBubbleArray[7].maxX) / 2 , y: 300 };
let microsoftRectangle1 = {x: CircleCenter.x + Math.cos(0) , y: CircleCenter.y + Math.sin(0), angle:0, color:"243 83 37"};
let microsoftRectangle2 = {x: CircleCenter.x + Math.cos(0) , y: CircleCenter.y + Math.sin(1), angle: Math.PI / 2, color:"129 188 6"};
let microsoftRectangle3 = {x: CircleCenter.x + Math.cos(-1) , y: CircleCenter.y + Math.sin(0), angle: Math.PI, color:"5 166 240"};
let microsoftRectangle4 = {x: CircleCenter.x + Math.cos(-1) , y: CircleCenter.y + Math.sin(-1), angle: Math.PI * 3/2, color:"255 186 8"};
let microsoftRectangles = [microsoftRectangle1, microsoftRectangle2, microsoftRectangle3, microsoftRectangle4];

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
    this.fontSize = 30;
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
    * Controller Input
    */
    if (player.y > floor.height && playerInputIsAllowed) {
        playerInputIsAllowed = false;
        setTimeout(() => {
            player.x = map_length / 2;
            player.y = 0;
            player.x_velocity = 0;
            player.y_velocity = 0;
            playerInputIsAllowed = true;
        }, 1000);
    }

    if ((controller.up || controller.left || controller.right) && playerInputIsAllowed) {
        controller.user_input_registered = true;
        if (controller.up && player.state != STATES.Jumping) {
            player.y_velocity -= JUMP_HEIGHT;
        }
        if (controller.left) {
            player.x_velocity -= .5;
        }
    
        if (controller.right) {
            player.x_velocity += .5;
        }
    }

    /*
    * Gravity and Friction
    */
    player.y_velocity += GRAVITY;
    player.x += player.x_velocity;
    player.y += player.y_velocity;

    player.x_velocity *= .9;

    // If the xVelocity is close enough to 0, we set it to 0 for animation purposes.
    if (player.x_velocity <= 0.2 && player.x_velocity >= -0.2) {
        player.x_velocity = 0;
    }
    player.y_velocity += .9;

    /*
    * Floor Collision
    */
    if (player.y > floor.height && player.x < floor.rightX && player.x > floor.leftX) {
        player.y = floor.height;
        player.y_velocity = 0;
    }

    player.x = Math.max(0, Math.min(player.x, map.cols * map.tsize));

    camera.update();

    /*
    * Background Draw
    */
    drawBackground(c, bg0);
    drawBackground(c, bg1);

    /*
    * Background Object Draw
    */
    for (let i = 0; i < backgroundObjects.length; i++) {
        c.drawImage(backgroundObjects[i].image, Math.floor(backgroundObjects[i].x - camera.x), Math.floor(backgroundObjects[i].y));
    }

    // if (frame_count % 10 == 0) {
        drawRotatingMicrosoftLogo(c, microsoftRectangles);
    // }

    /*
    * Demos Draw
    */
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
    c.save();
    if (animateText) {
        c.globalAlpha = 100 * textAlpha ** 3;
        textAlpha += .01;
        if (c.globalAlpha >= 1) {
            animateText = false;
        }
    }

    for (let i = 0; i < welcomeTextArray.length; i++) {
        welcomeTextArray[i].draw(c,welcomeTextArray[i]);
    }

    for (let i = 0; i < textBubbleArray.length; i++) {
        if (textBubbleArray[i].minX < player.x && textBubbleArray[i].maxX > player.x) {
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
    var startCol = Math.floor(camera.x / map.tsize);
    var endCol = startCol + (camera.width / map.tsize) + 2;
    var offsetX = -camera.x + startCol * map.tsize;

    for (let column = startCol; column < endCol; column++) {
        for (let row = 0; row < map.rows; row++) {
            const tile = map.getTile(column, row);
            const x = (column - startCol) * map.tsize + offsetX;
            const y = row * map.tsize;

            c.drawImage(
                tiles, // image
                tile * map.tsize, // source x
                0, // source y
                map.tsize, // source width
                map.tsize, // source height
                Math.floor(x),  // target x
                y + floor.height, // target y
                map.tsize, // target width
                map.tsize // target height
            );
        }
    }

    /*
    * Animation
    */
    window.requestAnimationFrame(loop);
    frame_count++;
    if (frame_count >= Number.MAX_SAFE_INTEGER) {
        frame_count = 0;
    }
};

function drawPlayer(context) {
    if (player.y < floor.height) {
        player.state = STATES.Jumping;
    } else if ((player.x_velocity <= -1 || player.x_velocity) >= 1 && player.y != STATES.Jumping) {
        player.state = STATES.Walking;
        player.is_going_to_the_right = player.x_velocity > 0;
    } else {
        player.state = STATES.Idle;
    }

    
    switch(player.state) {
        case STATES.Jumping:
            player.image = imageCache["./images/player/jump_0.png"];
            break;
        case STATES.Walking:
            if (frame_count % (ANIMATION_TIME_BUFFER / 5) == 0) {
                player.walk_sprite_frame = (player.walk_sprite_frame + 1) % 4;
            }
            player.image = imageCache["./images/player/walk1_" + player.walk_sprite_frame + ".png"];
            break;
        case STATES.Idle:
            if (frame_count % ANIMATION_TIME_BUFFER == 0 && player.x_velocity == 0) {
                if (player.idle_sprite_frame == 2)
                {
                    idle_sprite_frame_is_increasing = false;
                } else if (player.idle_sprite_frame == 0) {
                    idle_sprite_frame_is_increasing = true;
                }

                if (idle_sprite_frame_is_increasing) {
                    player.idle_sprite_frame = (player.idle_sprite_frame + 1);
                } else {
                    player.idle_sprite_frame = (player.idle_sprite_frame - 1);
                }
                player.image = imageCache["./images/player/stand1_" + player.idle_sprite_frame + ".png"];
            }
            break;
    }

    if (player.is_going_to_the_right) {
        drawFlippedImage(
            c, 
            player.image,
            player.screenX - player.width / 2,
            player.y - player.image.naturalHeight
        );
    } else {
        c.drawImage(
            player.image,
            player.screenX - player.width / 2,
            player.y - player.image.naturalHeight);
    }
}

function drawBackground(context, background) {
    for (i = 0; i < background.locations.length; i++) { 
        if (background.locations[i] + background.width < 0) {
            background.locations[i] = background.locations[background.current_max_location_index] + background.width;
            background.current_max_location_index = i;
        }

        background.locations[i] -= background.move_rate;

        context.drawImage(background.image, background.locations[i], 0);  
    }
}

function drawRotatingMicrosoftLogo(context, microsoftRectangles) {
    for (let i = 0; i < microsoftRectangles.length; i++) {
        microsoftRectangles[i].angle+=.01;
        microsoftRectangles[i].x = CircleCenter.x + Math.cos(microsoftRectangles[i].angle) * CircleRadius;
        microsoftRectangles[i].y = CircleCenter.y + Math.sin(microsoftRectangles[i].angle) * CircleRadius;
        context.fillStyle = "rgb(" + microsoftRectangles[i].color + ")";
        context.fillRect(Math.floor(microsoftRectangles[i].x - camera.x), Math.floor(microsoftRectangles[i].y), 100, 100);
    }
}

function drawText(context, text) {
    if (!canShowText) {
        return;
    }
    context.font = getFont(text.fontSize);
    context.fillText(text.words, text.x - camera.x - context.measureText(text.words).width / 2, text.y);
}

function drawTextBubble(context) {
    if (!canShowText) {
        return;
    }
    context.font = getFont(this.fontSize);

    const {whiteBoxHeight, whiteBoxWidth, linesOfTextArray} = getLinesOfText(context, this.text, this.fontSize, this.leading, this.maxLineWidth);
    let lines = {
        header: null,
        paragraphText: linesOfTextArray
    };

    let paddingBetweenDialogAndPlayer = 10;

    this.x = player.screenX;
    this.y = player.y - player.image.naturalHeight - whiteBoxHeight - paddingBetweenDialogAndPlayer;

    drawWhiteBoxWithTextAndImage(context, this.x, this.y, whiteBoxHeight, whiteBoxWidth, lines, null, this.fontSize, this.leading, this.colors1, this.colors2);

    context.drawImage(this.triangleImage, this.x, this.y + whiteBoxHeight);  
}

function drawProjectDemo(context) {
    if (!canShowText) {
        return;
    }
    context.font = getFont(this.fontSize);

    const paragraphLines = getLinesOfText(context, this.text, this.fontSize, this.leading, this.image.width);
    const whiteBoxHeight1 = paragraphLines.whiteBoxHeight
    const whiteBoxWidth1 = paragraphLines.whiteBoxWidth
    const paragraphText = paragraphLines.linesOfTextArray;

    const headerLines = getLinesOfText(context, this.headerText, this.fontSize, this.leading, this.image.width);
    const whiteBoxHeight2 = headerLines.whiteBoxHeight;
    const whiteBoxWidth2 = headerLines.whiteBoxWidth
    const header = headerLines.linesOfTextArray;
    
    let lines = {
        header: header,
        paragraphText: paragraphText
    };

    const {width: demoWidth, height: demoHeight} = drawWhiteBoxWithTextAndImage(context, this.x - camera.x, this.y, whiteBoxHeight1 + whiteBoxHeight2, Math.max(whiteBoxWidth1, whiteBoxWidth2), lines, this.image, this.fontSize, this.leading, this.colors1, this.colors2);
    this.width = demoWidth;
    this.height = demoHeight;
}

function detectMouseHover(x, y, width, height) {
    if (mouse.x >= x - width / 2 - camera.x && mouse.x <= x + width / 2 - camera.x) {
        if (mouse.y >= y && mouse.y < y + height) {
            this.hover = true;
            return true;
        }
    } else {
        this.hover = false;
        return false;
    }
}

function drawHoverBox(context, x, y, width, height, borderLength) {
    context.fillStyle = "rgb(0 0 0 / .5)";
    context.fillRect(Math.floor(x - camera.x) - width / 2, Math.floor(y - camera.y - borderLength), width, height + borderLength * 2);

    context.fillStyle = "white";
    let fontSize = 30;
    context.font = getFont(fontSize);

    let textX = Math.floor(x - camera.x - context.measureText("demo").width / 2);
    let textY = Math.floor(y + height / 2);
    let padding = Math.floor(fontSize / 10);
    context.fillText("demo", textX, textY);

    context.strokeStyle = "white";
    context.beginPath();
    context.moveTo(textX, textY + padding);
    context.lineTo(textX + context.measureText("demo").width, textY + padding);
    context.stroke()
}

function getLinesOfText(context, text, fontSize, leading, maxLineWidth) {
    let words = text.split(" ");
    let linesOfTextArray = new Array();
    let i = 0;
    let currentMaxLineWidth = 0;
    while (i < words.length) {
        let currentLine = "";
        let currentLineWidth = context.measureText(currentLine).width;
        while (currentLineWidth + context.measureText(words[i]).width < maxLineWidth && i < words.length) {
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
    context.translate(x+player.image.width/2,0);
    context.scale(-1,1);
    context.translate(-(x+player.image.width/2),0);
    context.drawImage(image, x, y);
    context.restore();
};

function getFont(fontSize) {
    if (document.fonts.check("12px 'Handjet'")) {
        return fontSize + "px 'Handjet'";
    } else if (document.fonts.check("12px 'Consolas'")){
        return fontSize + "px 'Consolas'";
    } else {
        return fontSize + "px sans-serif";
    }
}

function scrollPlayer(event) {
    event.preventDefault();
    if (playerInputIsAllowed) {
        player.x_velocity += event.deltaY * .1;
    }
}

function updateMousePosition(event) {
    if (mouse.x != event.clientX) {
        mouse.x = event.clientX;
    }
    if (mouse.y != event.clientY) {
        mouse.y = event.clientY;
    }
}

function sendToLink(event) {
    for (let i = 0; i < demos.length; i++) {
        if (demos[i].hover) {
            window.open(demos[i].link,"_blank");
            return;
        }
    }
}

window.addEventListener("keydown", controller.keyListener)
window.addEventListener("keyup", controller.keyListener);
window.addEventListener("wheel", scrollPlayer, {passive: false});
window.addEventListener("mousemove", updateMousePosition);
window.addEventListener("click", sendToLink);



/* CREDITS
 * Free - Adventure Pack - Grassland by Anokolisa
 * 
 */

/*  TODO
* fix map size
* mobile version
* optimize floor redraw - only redraw when player velocity is not 0
* optimize background redraw to only move every few frames
* snap draw calls to whole numbers and round using bitwise OR to 0: https://seblee.me/2011/02/html5-canvas-sprite-optimisation/
* refactor 🤣
*/