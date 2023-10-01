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
    "./images/tiles.png"
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

let canvas = document.querySelector('canvas')

var canvas_width = window.innerWidth;
var canvas_height = window.innerHeight;

const c = canvas.getContext("2d");

c.canvas.width = canvas_width;
c.canvas.height = canvas_height;

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
    y_velocity: 0
};

player.image.src = "./images/player/stand1_0.png";

var tiles = new Image();
tiles.src = "./images/tiles.png";

var map = {
    cols: 24,
    rows: 5,
    tsize: 64,
    tiles: [
        0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
        1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1,
        1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1,
        1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1,
        1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1
    ],
    getTile: function (col, row) {
        return this.tiles[row * map.cols + col];
    }
}

const floor = {
    height: canvas_height - 100,
    color: "white"
}

const controller = {
    left: false,
    right: false,
    up: false,

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

    //**********Background Fill**********
    c.fillStyle = "pink";
    c.fillRect(0,0, canvas_width, canvas_height);

    //**********Player Draw********** 
    // console.log("natural height height" + player.image.naturalHeight);
    switch(player.state) {
        case STATES.Jumping:
            //code
            player.image.src = "./images/player/jump_0.png";
            break;
        case STATES.Walking:
            if (frame_count % (ANIMATION_TIME_BUFFER / 5) == 0) {
                player.walk_sprite_frame = (player.walk_sprite_frame + 1) % 4;
                // console.log("walking animation frame change to: " + player.walk_sprite_frame);
            }
            player.image.src = "./images/player/walk1_" + player.walk_sprite_frame + ".png";

            //code
            break;
        case STATES.Idle:
            // idle
            // console.log(player.x_velocity);
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
        drawFlippedImage(c, player.image, player.x, player.y - player.image.naturalHeight);
    } else {
        c.drawImage(player.image, player.x, player.y - player.image.naturalHeight);
    }

    // Floor Fill
    // c.strokeStyle = floor.color;
    // c.lineWidth = 30;
    // c.beginPath();
    // c.moveTo(0, floor.height);
    // c.lineTo(canvas_width, floor.height);
    // c.stroke();

    for (let column = 0; column < map.cols; column++) {
        for (let row = 0; row < map.rows; row++) {
            const tile = map.getTile(column, row);
            const x = column * map.tileSize;
            const y = row * map.tileSize;
            c.drawImage(
                tiles, // image
                tile * map.tsize, // source x
                0, // source y
                map.tsize, // source width
                map.tsize, // source height
                column * map.tsize,  // target x
                row * map.tsize + floor.height, // target y
                map.tsize, // target width
                map.tsize // target height
            );
        }
    }

    // Animation
    window.requestAnimationFrame(loop);
    frame_count++;

    // console.log("player state:" + player.state);
};



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
// window.requestAnimationFrame(loop);

/** CREDITS **
 * Free - Adventure Pack - Grassland by Anokolisa
 * 
 */
