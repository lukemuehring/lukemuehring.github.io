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
}

function trackProgress() {
    loadedImages++;
    if (loadedImages == imagePathArray.length) {
        window.requestAnimationFrame(loop);
    }
}

/*
* Game Variables
*/
let canvas = document.querySelector('canvas')

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
}

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
    cols: 1000,
    rows: 2,
    tsize: 64,
    tiles: [],
    getTile: function (col, row) {
        return this.tiles[row * map.cols + col];
    }
}

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
}

const bg1 = {
    width: 1984,
    image: new Image(),
    locations : [],
    current_max_location_index : 0,
    move_rate: 1,
    draw_rate: 10
}

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
}

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
}

Camera.prototype.follow = function(sprite) {
    this.following = sprite;
}

Camera.prototype.update = function() {
    this.following.screenX = this.width / 2;
    this.x = this.following.x - this.width / 2;

    this.x = Math.max(this.minX, Math.min(this.x, this.maxX));

    if (this.following.x < this.width / 2 ||
    this.following.x > this.maxX + this.width / 2) {
        this.following.screenX = this.following.x - this.x;
    }
}

var camera = new Camera(map, canvas_width, canvas_height);
player.x = map.cols * map.tsize / 2;
camera.follow(player);

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
}

/*
* Image Objects
*/
function imageObject(x, y, img) {
    this.x = x;
    this.y = y;
    this.image = img;
}

const signWidth = 219;
const signHeight = 200;

const codingSignImage = new Image();
codingSignImage.src = "./images/codingSign.png";
const climbingSignImage = new Image();
climbingSignImage.src = "./images/climbingSign.png";
var codingSign = new imageObject(map.cols * map.tsize / 2 + 500 - signWidth, floor.height - signHeight, codingSignImage);
var climbingSign = new imageObject(map.cols * map.tsize / 2 - 500, floor.height - signHeight, climbingSignImage);

var backgroundObjects = [codingSign, climbingSign];
var foregroundObjects = [];

/*
* Text
*/
function Text(words, x, y, fontSize) {
    this.words = words;
    this.x = x;
    this.y = y;
    this.fontSize = fontSize;
    this.isVisible = true;
    this.writeFunction = drawText;
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
    "Here are some of my projects. You can hover over them with your mouse to learn more.",
    "By the way, if I am talking too slow, feel free to fly around with the scroll wheel.",
    "Growing up as a Gen Z, I have been immersed in technology since the moment I was born.",
    "My first coding experiences probably came from playing Halo CE in high school.",
    "I remember digging into member forums showing how to use the game's command line to include user-created maps and weapons, which were really buggy and really fun at the same time.",
    "So when it came time to choose a major in college, I figured I would do something related to technology. I was \"good with computers\".",
    "I changed my major a couple of times, but I ended up graduating with a B.S. in Computational Media from Georgia Tech in 2021.",
    "It's a relatively new major that I usually describe as an artsy CS degree with a focus on human interaction.",
    "After graduating, I worked at Microsoft for two years as a software engineer in the M365 organization.",
    "I got a glimpse at what software engineering inside Big Tech is like. It was fascinating to learn how all the different parts worked together like a big engine, and I slowly pieced together the bigger picture of how vast amounts of data enabled highly available customer experiences.",
    "I was developing the skills to become a better engineer, like monitoring service health telemetry during on call rotations, or tracking code changes through the scheduled cycles of the CI/CD pipeline.",
    "I wrote production code in C#, NodeJS, React, and TypeScript (among others) while using TDD to ensure requirements were satisfied. Equally as important, I was also learning how to work and communicate effectively in an agile team full of really knowledgable people.",
    "At the start of 2023, I made the decision to take a hiatus from my software career to focus on being a professional athelete. I also wanted to see the outside world of software companies outside of Big Tech",
    "So, Hello World! I am actively searching for my next software engineering role.",
    "Thanks for getting to know me a little.",
];

const textBubbleArray = [];
let startX = map_length / 2 + 500;
let endX;
const ReadingSpeedPixelsPerCharacter =  7;
const grass1Image = new Image();
grass1Image.src = "./images/grass1.png";

for (let i = 0; i < codingStory.length; i++) {
    endX = startX + codingStory[i].length * ReadingSpeedPixelsPerCharacter;
    textBubbleArray.push(new TextBubble(codingStory[i], player.x, player.y,  startX, endX));
    foregroundObjects.push(new imageObject(startX, floor.height - 64, grass1Image));
    startX = endX;
}

const climbingStory = [
    "👊 I like to spend pretty much all of my free time bouldering, lead climbing, getting outside and training for competitions.",
    "It's something that teaches me how to think outside of the box, push myself to accomplish epic goals, and find balance in life.",
    "I started climbing in my first year of high school, and I quickly began to realize that I really liked it.",
    "My mind could find a focus where I didn't think about anything else except what I was holding on to.",
    "I would no longer dwell on what happened earlier that day, and I was free from the stress of tomorrow.",
    "After switching out my punch pass for a membership, I joined a youth team at the Stone Summit climbing gym and started training for competitions.",
    "The competitions were a very good motive for me to keep pursuing mastery in climbing.",
    "The route setting was thought provoking, the competitive experience was both challenging and unique, and I got to know really cool and strong climbers across the states.",
    "As a result, I climbed more plastic than rock during my formative climbing years. I was definitely what you would call a \"gym rat\".",
    "But that didn't stop me from climbing outside when I could. Through some very humbling experiences, I rediscovered how fun, interesting, and challenging climbing could be outside of a gym.",
    "Now, I compete on the open circuit. My best result so far is at the 2022 US Nationals, when I got 3rd in bouldering and 4th in lead.",
    "I'm actually really proud of that!",
    "But when I'm not training for competitions, I love getting some fresh air outside and climbing on real rocks. Especially sandstone.",
    "Thanks for getting to know me a little."
];

startX = map_length / 2 - 500;
for (let i = 0; i < climbingStory.length; i++) {
    endX = startX - climbingStory[i].length * ReadingSpeedPixelsPerCharacter;
    textBubbleArray.push(new TextBubble(climbingStory[i], player.x, player.y,  endX, startX));
    foregroundObjects.push(new imageObject(startX, floor.height - 64, grass1Image));
    startX = endX;
}

const welcomeText = new Text("Hey! I'm Luke.", map.cols * map.tsize / 2, canvas_height / 2, 100);
const pressArrowKeysText = new Text("USE ARROW KEYS TO MOVE", welcomeText.x, welcomeText.y + 70, 40);
pressArrowKeysText.isVisible = false;
pressArrowKeysText.writeFunction = (c, text) => {
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

/*
* Animation Loop
*/
const loop = function() {
    /*
    * Controller Input
    */
    if (controller.up || controller.left || controller.right) {
        controller.user_input_registered = true;
        if (controller.up && !player.state == STATES.Jumping) {
            player.y_velocity -= JUMP_HEIGHT;
            player.state = STATES.Jumping;
        }

        if (controller.left) {
            player.x_velocity -= .5;
            if (controller.z) {
                player.x_velocity -= 5;
            }
        }

        if (controller.right) {
            player.x_velocity += .5;
            if (controller.z) {
                player.x_velocity += 5;
            }
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
    * Floor Collision and Player state
    */
    if (player.y > floor.height) {
        if ((controller.left || controller.right) && !controller.up) {
            player.state = STATES.Walking;
            player.is_going_to_the_right = controller.right;
        } else {
            player.state = STATES.Idle;
        }
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
        c.drawImage(backgroundObjects[i].image, backgroundObjects[i].x - camera.x, backgroundObjects[i].y);
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
        welcomeTextArray[i].writeFunction(c,welcomeTextArray[i]);
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
    switch(player.state) {
        case STATES.Jumping:
            player.image.src = "./images/player/jump_0.png";
            break;
        case STATES.Walking:
            if (frame_count % (ANIMATION_TIME_BUFFER / 5) == 0) {
                player.walk_sprite_frame = (player.walk_sprite_frame + 1) % 4;
            }
            player.image.src = "./images/player/walk1_" + player.walk_sprite_frame + ".png";
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
                player.image.src = "./images/player/stand1_" + player.idle_sprite_frame + ".png";
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

    /*
    * Foreground Object Draw
    */
        for (let i = 0; i < foregroundObjects.length; i++) {
            c.drawImage(foregroundObjects[i].image, foregroundObjects[i].x - camera.x, foregroundObjects[i].y);
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
    switch(player.state) {
        case STATES.Jumping:
            player.image.src = "./images/player/jump_0.png";
            break;
        case STATES.Walking:
            if (frame_count % (ANIMATION_TIME_BUFFER / 5) == 0) {
                player.walk_sprite_frame = (player.walk_sprite_frame + 1) % 4;
            }
            player.image.src = "./images/player/walk1_" + player.walk_sprite_frame + ".png";
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
                player.image.src = "./images/player/stand1_" + player.idle_sprite_frame + ".png";
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

    // Determining size of white box
    let words = this.text.split(" ");
    let lines = new Array();
    let i = 0;
    let currentMaxLineWidth = 0;
    while (i < words.length) {
        let currentLine = "";
        let currentLineWidth = context.measureText(currentLine).width;
        while (currentLineWidth + context.measureText(words[i]).width < this.maxLineWidth && i < words.length) {
            currentLine += words[i] + " ";
            currentLineWidth = context.measureText(currentLine).width;
            i++;
        }
        lines.push(currentLine);
        if (currentMaxLineWidth < currentLineWidth) {
            currentMaxLineWidth = currentLineWidth;
        }
    }

    let whiteBoxHeight = (this.fontSize + this.leading) * lines.length;
    let whiteBoxWidth = Math.ceil(currentMaxLineWidth);
    let paddingBetweenDialogAndPlayer = 10;

    this.x = player.screenX;
    this.y = player.y - player.image.naturalHeight - whiteBoxHeight - paddingBetweenDialogAndPlayer;

    context.fillStyle = "white";
    context.fillRect(this.x - whiteBoxWidth / 2, this.y, whiteBoxWidth, whiteBoxHeight);
    context.fillStyle = "black";

    // Drawing the text in the white box
    for (let i = 0; i < lines.length; i++) {
        context.fillText(lines[i], Math.round(this.x - whiteBoxWidth / 2), Math.round(this.y + this.fontSize + i * (this.leading + this.fontSize)));
    }

    // Drawing the borders of the white box
    for (let i = 0; i < this.colors1.length; i++) {
        context.fillStyle = this.colors1[i];
        context.fillRect(this.x - whiteBoxWidth / 2, this.y + whiteBoxHeight - i + this.colors1.length - 1, whiteBoxWidth, 1);
        context.fillRect(this.x - whiteBoxWidth / 2, this.y - this.colors1.length + i, whiteBoxWidth, 1);
    }

    for (let z = 0; z < this.colors2.length; z++) {
        context.fillStyle = this.colors2[z];
        context.fillRect(this.x - whiteBoxWidth / 2 - this.colors2.length + z, this.y, 1, whiteBoxHeight);
        context.fillRect(this.x + whiteBoxWidth / 2 + this.colors2.length - 1 - z, this.y, 1, whiteBoxHeight);
    }

    // Drawing the corners
    c.drawImage(
        this.cornerImage, // image
        0, // source x
        0, // source y
        4, // source width
        5, // source height
        Math.floor(this.x - whiteBoxWidth / 2 - this.colors2.length),  // target x
        Math.floor(this.y - this.colors1.length), // target y
        4, // target width
        5 // target height
    );

    c.drawImage(
        this.cornerImage,
        4,
        0,
        4,
        5,
        Math.floor(this.x - whiteBoxWidth / 2 - this.colors2.length),
        Math.floor(this.y + whiteBoxHeight),
        4,
        5
    );

    c.drawImage(
        this.cornerImage,
        8,
        0,
        4,
        5,
        Math.floor(this.x + whiteBoxWidth / 2),
        Math.floor(this.y - this.colors1.length),
        4,
        5
    );

    c.drawImage(
        this.cornerImage,
        12,
        0,
        4,
        5,
        Math.floor(this.x + whiteBoxWidth / 2),
        Math.floor(this.y + whiteBoxHeight),
        4,
        5
    );

    context.fillStyle = "black";

    context.drawImage(this.triangleImage, this.x, this.y + whiteBoxHeight);  
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
    console.log(event.deltaY);
    player.x += event.deltaY;
    player.state = STATES.Walking;
}

window.addEventListener("keydown", controller.keyListener)
window.addEventListener("keyup", controller.keyListener);
document.addEventListener("wheel", scrollPlayer, {passive: false});

/* CREDITS
 * Free - Adventure Pack - Grassland by Anokolisa
 * 
 */

/*  TODO
* pull out player draw to its own function and integrate animation with scrolling
* rewrite the climbing section to be less formal and more about climbing
* rewrite the coding section to be more personable and include more emotion 
* optimize floor redraw - only redraw when player velocity is not 0
* optimize background redraw to only move every few frames
* snap draw calls to whole numbers and round using bitwise OR to 0: https://seblee.me/2011/02/html5-canvas-sprite-optimisation/
*/