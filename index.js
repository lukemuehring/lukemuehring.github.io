// Preloading Images
this.addEventListener("DOMContentLoaded", preloadImages, true);

var loadedImages = 0;
var imageArray = new Array(
    "./images/player/jump_0.png",
    "./images/player/stand1_0.png",
    "./images/player/stand1_1.png",
    "./images/player/stand1_2.png",
    "./images/player/walk1_0.png",
    "./images/player/walk1_1.png",
    "./images/player/walk1_2.png",
    "./images/player/walk1_3.png",
);

function preloadImages(e) {
    for (var i = 0; i < imageArray.length; i++) {
        var tempImage = new Image();
         
        tempImage.addEventListener("load", trackProgress, true);
        tempImage.src = imageArray[i];
    }
}

function trackProgress() {
    loadedImages++;
     
    if (loadedImages == imageArray.length) {
        window.requestAnimationFrame(loop);
    }
}

var rightKeyImage = new Image();
rightKeyImage.src = "./images/rightkey.png";

let canvas = document.querySelector('canvas')

var canvas_width = window.innerWidth;
var canvas_height = window.innerHeight;

const c = canvas.getContext("2d");

c.canvas.width = canvas_width;
c.canvas.height = canvas_height;

const HandjetFont = new FontFace("Handjet", "url(https://fonts.gstatic.com/s/handjet/v19/oY1n8eXHq7n1OnbQrOY_2FrEwYEMLlcdP1mCtZaLaTutCwcIhGZ0lGU0akFcO3XFHTmaYkImEQ.woff2)");
document.fonts.add(HandjetFont);
HandjetFont.load();

function Text(words, x, y, fontSize) {
    this.words = words;
    this.x = x;
    this.y = y;
    this.fontSize = fontSize;
    this.isVisible = true;
}

const welcomeText = new Text("Hey! I'm Luke.", canvas_width / 2, canvas_height / 2, 100);
const pressRightText = new Text("PRESS RIGHT", welcomeText.x, welcomeText.y + 70, 40);
pressRightText.isVisible = false;

// Game Variables
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

player.image.src = "./images/player/stand1_0.png";

var tiles = new Image();
tiles.src = "./images/tiles.png";

var map = {
    cols: 96,
    rows: 5,
    tsize: 64,
    tiles: [
        0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
        1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1,
        1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1,
        1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1,
        1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1,
        1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1,
        1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1,
        1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1,
        1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1,
    ],
    getTile: function (col, row) {
        return this.tiles[row * map.cols + col];
    }
}

const bg0 = {
    width: 1984,
    image: new Image(),
    locations : [],
    current_max_location_index : 0,
    move_rate: .3
}

const bg1 = {
    width: 1984,
    image: new Image(),
    locations : [],
    current_max_location_index : 0,
    move_rate: 1
}

var map_length = map.cols * map.tsize;
var num_images = Math.ceil(map_length / bg0.width) + 1;
bg0.locations = Array.from({length: num_images}, (v, i) => i * bg0.width);
bg0.current_max_location_index = bg0.locations.length - 1;
bg0.image.src = "./images/bg_0.png";

bg1.locations = Array.from({length: num_images}, (v, i) => i * bg1.width);
bg1.current_max_location_index = bg1.locations.length - 1;
bg1.image.src = "./images/bg_1.png";

const floor = {
    height: canvas_height - 100,
    color: "white"
}

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
    sprite.screenX = 0;
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

this.camera = new Camera(map, canvas_width, canvas_height);
player.x = this.camera.width / 2;
this.camera.follow(player);

const controller = {
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

const loop = function() {

    //**********Controller Input**********
    if (controller.up || controller.left || controller.right) {
        controller.user_input_registered = true;
        if (controller.up && !player.state == STATES.Jumping) {
            player.y_velocity -= JUMP_HEIGHT;
            player.state = STATES.Jumping;
        }

        if (controller.left) {
            player.x_velocity -= .5;
        }

        if (controller.right) {
            player.x_velocity += .5;
        }
    }
        

    //**********Gravity and Friction**********
    player.y_velocity += GRAVITY;
    player.x += player.x_velocity;
    player.y += player.y_velocity;

    player.x_velocity *= .9;

    // If the xVelocity is close enough to 0, we set it to 0 for animation purposes.
    if (player.x_velocity <= 0.2 && player.x_velocity >= -0.2) {
        player.x_velocity = 0;
    }
    player.y_velocity += .9;

    //**********Collision with floor and Walking + Idle animations**********
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

    player.x = Math.max(0, Math.min(player.x, map.cols * map.tsize - player.width));
    
    this.camera.update();

    //**********Background Fill**********
    // Image looping behavior
    drawBackground(c, bg0);
    drawBackground(c, bg1);

    drawText(c, welcomeText);

    if (!controller.user_input_registered && frame_count > 100) {
        if (frame_count % 60 == 0 ) {
            pressRightText.isVisible = !pressRightText.isVisible;
        }
        if (pressRightText.isVisible) {
            drawText(c, pressRightText);
            c.drawImage(
                rightKeyImage,
                pressRightText.x + 65,
                pressRightText.y - rightKeyImage.height + 8);
        }
    }

    //**********Player Draw********** 
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

    // Floor draw
    var startCol = Math.floor(this.camera.x / map.tsize);
    var endCol = startCol + (this.camera.width / map.tsize) + 2;
    var offsetX = -this.camera.x + startCol * map.tsize;

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

    // Animation
    window.requestAnimationFrame(loop);
    frame_count++;
};

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
    context.font = text.fontSize + "px Handjet";
    context.fillText(text.words, text.x - this.camera.x - context.measureText(text).width / 2, text.y);
}

function drawFlippedImage(context, image, x, y) {
    context.save();
    context.translate(x+player.image.width/2,0);
    context.scale(-1,1);
    context.translate(-(x+player.image.width/2),0);
    context.drawImage(image, x, y);
    context.restore();
};

window.addEventListener("keydown", controller.keyListener)
window.addEventListener("keyup", controller.keyListener);

/** CREDITS **
 * Free - Adventure Pack - Grassland by Anokolisa
 * 
 */
