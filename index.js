let canvas = document.querySelector('canvas')

var canvasWidth = window.innerWidth;
var canvasHeight = window.innerHeight;

const c = canvas.getContext("2d");

c.canvas.width = canvasWidth;
c.canvas.height = canvasHeight;

const JUMP_HEIGHT = 20; 
const GRAVITY = 1.5;

const player = {
    height: 32,
    width: 32,
    isJumping: true,
    x: 0,
    xVelocity: 0,
    y: 0,
    yVelocity: 0
};

const floor = {
    height: canvasHeight - 100,
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
    if (controller.up && !player.isJumping) {
        player.yVelocity -= JUMP_HEIGHT;
        player.isJumping = true;
    }

    if (controller.left) {
        player.xVelocity -= .5;
    }

    if (controller.right) {
        player.xVelocity += .5;
    }

    // Gravity and Friction
    player.yVelocity += GRAVITY;
    player.x += player.xVelocity;
    player.y += player.yVelocity;

    player.xVelocity *= .9;
    player.yVelocity += .9;

    // Collision with floor
    if (player.y > floor.height - player.height - JUMP_HEIGHT) {
        player.isJumping = false;
        player.y = floor.height - player.height - JUMP_HEIGHT;
        player.yVelocity = 0;
    }

    // Background Fill
    c.fillStyle = "red";
    c.fillRect(0,0, canvasWidth, canvasHeight);

    // Player Fill
    c.fillStyle = "blue";
    c.beginPath();
    c.rect(player.x, player.y, player.width, player.height);
    c.fill();

    // Floor Fill
    c.strokeStyle = "#2E2532";
    c.lineWidth = 30;
    c.beginPath();
    c.moveTo(0, floor.height);
    c.lineTo(canvasWidth, floor.height);
    c.stroke();

    // Animation
    window.requestAnimationFrame(loop);
};

window.addEventListener("keydown", controller.keyListener)
window.addEventListener("keyup", controller.keyListener);
window.requestAnimationFrame(loop);