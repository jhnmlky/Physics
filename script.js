const reset = document.getElementById("reset");
const mass = document.getElementById("mass");
const size = document.getElementById("size");
const velx = document.getElementById("velx");
const vely = document.getElementById("vely");
const fps = document.getElementById("fps");
const gravity = document.getElementById("gravity");
const gravDir = document.getElementById("direction");
const labelSpeed = document.getElementById("label-speed");
const speed = document.getElementById("speed");
const drag = document.getElementById("drag");
const bounce = document.getElementById("bounce");
const box = document.getElementById("box");

// ANIMATION
const pixelMeter = 50;
let FPS = 60;

// BALL
let m = 1;
let dia = 50;
let velX = 0;
let velY = 0;

// BALLS
const balls = [];

// ENVIRONMENT
let g = 9.81;
let gVec = { x: 0, y: 1 };
let dt = 1 / FPS;
let d = 0.1;
let b = 0.8

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

function handleBallCollisions() {
    for (let i = 0; i < balls.length; i++) {
        for (let j = i + 1; j < balls.length; j++) {
            const ballA = balls[i];
            const ballB = balls[j];

            const dx = ballB.pos.x - ballA.pos.x;
            const dy = ballB.pos.y - ballA.pos.y;

            const distance = Math.sqrt(dx * dx + dy * dy);
            const minDistance = ballA.radius + ballB.radius;

            if (distance >= minDistance || distance === 0) {
                if (distance === 0) {
                    ballA.pos.x -= minDistance / 2;
                    ballB.pos.x += minDistance / 2;
                }
                continue;
            }

            const nx = dx / distance;
            const ny = dy / distance;

            const overlap = minDistance - distance;

            ballA.pos.x -= nx * overlap / 2;
            ballA.pos.y -= ny * overlap / 2;

            ballB.pos.x += nx * overlap / 2;
            ballB.pos.y += ny * overlap / 2;

            const relativeVelX = ballB.vel.x - ballA.vel.x;
            const relativeVelY = ballB.vel.y - ballA.vel.y;
            const relativeVel = relativeVelX * nx + relativeVelY * ny;
            if (relativeVel > 0) {
                continue;
            }

            const impulse = -(1 + b) * relativeVel / (1 / ballA.mass + 1 / ballB.mass);
            ballA.vel.x -= impulse * nx / ballA.mass;
            ballA.vel.y -= impulse * ny / ballA.mass;
            ballB.vel.x += impulse * nx / ballB.mass;
            ballB.vel.y += impulse * ny / ballB.mass;
        }
    }
}

async function calcPhy() {
    const right = box.clientWidth;
    const bottom = box.clientHeight;

    const gX = gVec.x;
    const gY = gVec.y;

    for (let i = 0; i < balls.length; i++) {
        const dragForceX = -balls[i].vel.x * d;
        const dragForceY = -balls[i].vel.y * d;

        const gravForceX = balls[i].mass * g * gVec.x;
        const gravForceY = balls[i].mass * g * gVec.y;

        const forceX = gravForceX + dragForceX;
        const forceY = gravForceY + dragForceY;

        const accelX = forceX / balls[i].mass;
        const accelY = forceY / balls[i].mass;

        balls[i].vel.x += accelX * dt;
        balls[i].vel.y += accelY * dt;

        balls[i].pos.x += balls[i].vel.x * dt;
        balls[i].pos.y += balls[i].vel.y * dt;

        const x = balls[i].pos.x * pixelMeter;
        const y = balls[i].pos.y * pixelMeter;

        if (x + balls[i].pxRad > right) {
            balls[i].pos.x = (right - balls[i].pxRad) / pixelMeter;
            balls[i].vel.x = -balls[i].vel.x * b;
        }

        if (x - balls[i].pxRad < 0) {
            balls[i].pos.x = balls[i].pxRad / pixelMeter;
            balls[i].vel.x = -balls[i].vel.x * b;
        }

        if (y + balls[i].pxRad > bottom) {
            balls[i].pos.y = (bottom - balls[i].pxRad) / pixelMeter;
            balls[i].vel.y = -balls[i].vel.y * b;
        }

        if (y - balls[i].pxRad < 0) {
            balls[i].pos.y = balls[i].pxRad / pixelMeter;
            balls[i].vel.y = -balls[i].vel.y * b;
        }

        if (gX !== 0) {
            const wall = gX > 0 ? balls[i].pos.x * pixelMeter + balls[i].pxRad >= right
                    : balls[i].pos.x * pixelMeter - balls[i].pxRad <= 0;
            if (wall && Math.abs(balls[i].vel.x) < 0.1) {
                balls[i].vel.x = 0;
            }
        }

        if (gY !== 0) {
            const wall = gY > 0 ? balls[i].pos.y * pixelMeter + balls[i].pxRad >= bottom
                    : balls[i].pos.y * pixelMeter - balls[i].pxRad <= 0;
            if (wall && Math.abs(balls[i].vel.y) < 0.1) {
                balls[i].vel.y = 0;
            }
        }
    }

    for (let i = 0; i < 3; i++) {
        handleBallCollisions();
    }
}

async function renderEnv() {
    for (let i = 0; i < balls.length; i++) {
        const el = document.querySelector(`#ball-${i}`);
        el.classList.remove("hidden");
        el.style.top = (balls[i].pos.y * pixelMeter) + 'px';
        el.style.left = (balls[i].pos.x * pixelMeter) + 'px';
    }
}

async function startAnim() {
    while (balls.length > 0) {
        await calcPhy();
        await renderEnv();
        await delay(1000 / FPS);
    }
}

function addBall(event) {
    const boxRect = box.getBoundingClientRect();
    const ball = {
        pos: {
            x: (event.clientX - boxRect.left) / pixelMeter,
            y: (event.clientY - boxRect.top) / pixelMeter
        },
        vel: { x: velX, y: velY },
        mass: m,
        size: dia,
        pxRad: dia / 2,
        radius: (dia / 2) / pixelMeter
    };
    balls.push(ball);
    const el = document.createElement('div');
    el.id = `ball-${balls.length - 1}`;
    el.classList.add("ball");
    el.classList.add("hidden");
    el.style.height = dia + 'px';
    el.style.width = dia + 'px';
    box.appendChild(el);
    balls.length == 1 && startAnim();
}

function resetEnv() {
    balls.length = 0;
    document.querySelectorAll('.ball').forEach(el => el.remove());
}

function setSize(event) {
    if (event.target.min && -event.target.value > -event.target.min) {
        event.target.value = event.target.min;
    }
    if (+event.target.value > Math.min(box.offsetWidth, box.offsetHeight) * 0.5) {
        event.target.value = Math.min(box.offsetWidth, box.offsetHeight) * 0.5;
    }
    dia = +event.target.value;
}

function setFPS(event) {
    FPS = +event.target.value;
    dt = +speed.value / FPS;
}

function setGravity(dir) {
    switch (dir) {
        case "top":
            gVec = { x: 0, y: -1 };
            break;
        case "right":
            gVec = { x: 1, y: 0 };
            break;
        case "bottom":
            gVec = { x: 0, y: 1 };
            break;
        case "left":
            gVec = { x: -1, y: 0 };
            break;
    }
}

reset.addEventListener('click', () => resetEnv());

mass.addEventListener('change', e => { m = +e.target.value });

size.addEventListener('change', e => setSize(e));

velx.addEventListener('change', e => { velX = +e.target.value });

vely.addEventListener('change', e => { velY = +e.target.value });

fps.addEventListener('change', e => setFPS(e));

gravity.addEventListener('change', e => { g = +e.target.value });

gravDir.addEventListener('change', e => setGravity(e.target.value));

speed.addEventListener('change', e => { dt = +e.target.value / FPS });

speed.addEventListener('input', e => { labelSpeed.textContent = 'Speed: ' + e.target.value });

drag.addEventListener('change', e => { d = +e.target.value });

bounce.addEventListener('change', e => { b = +e.target.value });

box.addEventListener('click', e => addBall(e));