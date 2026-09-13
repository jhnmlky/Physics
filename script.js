const reset = document.getElementById("reset");
const mass = document.getElementById("mass");
const size = document.getElementById("size");
const velx = document.getElementById("velx");
const vely = document.getElementById("vely");
const friction = document.getElementById("friction");
const fps = document.getElementById("fps");
const gravity = document.getElementById("gravity");
const gravDir = document.getElementById("direction");
const labelSpeed = document.getElementById("label-speed");
const speed = document.getElementById("speed");
const drag = document.getElementById("drag");
const bounce = document.getElementById("bounce");
const frictionW = document.getElementById("frictionW");
const box = document.getElementById("box");

// ANIMATION
const pixelMeter = 50;
let FPS = 60;

// BALL
let m = 1;
let dia = 50;
let velX = 0;
let velY = 0;
let fric = 0.5;

// BALLS
const balls = [];

// ENVIRONMENT
let g = 9.81;
let gVec = { x: 0, y: 1 };
let dt = 1 / FPS;
let d = 0.1;
let b = 0.8;
let fricW = 0.5;

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

function getContactVelocity(ball, rx, ry) {
    return {
        x: ball.vel.x - ball.angularVel * ry,
        y: ball.vel.y + ball.angularVel * rx
    };
}

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

            const contactAX = ballA.pos.x + nx * ballA.radius;
            const contactAY = ballA.pos.y + ny * ballA.radius;

            const contactBX = ballB.pos.x - nx * ballB.radius;
            const contactBY = ballB.pos.y - ny * ballB.radius;

            const rAX = contactAX - ballA.pos.x;
            const rAY = contactAY - ballA.pos.y;

            const rBX = contactBX - ballB.pos.x;
            const rBY = contactBY - ballB.pos.y;

            const velA = getContactVelocity(ballA, rAX, rAY);
            const velB = getContactVelocity(ballB, rBX, rBY);

            const relativeVelX = velB.x - velA.x;
            const relativeVelY = velB.y - velA.y;

            const relativeNormalVel = relativeVelX * nx + relativeVelY * ny;

            if (relativeNormalVel > 0) {
                continue;
            }

            const crossAN = rAX * ny - rAY * nx;
            const crossBN = rBX * ny - rBY * nx;

            const normalDenominator = 1 / ballA.mass + 1 / ballB.mass +
                (crossAN * crossAN) / ballA.inertia + (crossBN * crossBN) / ballB.inertia;

            const normalImpulse = -(1 + b) * relativeNormalVel / normalDenominator;

            ballA.vel.x -= normalImpulse * nx / ballA.mass;
            ballA.vel.y -= normalImpulse * ny / ballA.mass;

            ballB.vel.x += normalImpulse * nx / ballB.mass;
            ballB.vel.y += normalImpulse * ny / ballB.mass;

            ballA.angularVel -= crossAN * normalImpulse / ballA.inertia;
            ballB.angularVel += crossBN * normalImpulse / ballB.inertia;

            const tx = -ny;
            const ty = nx;

            const newVelA = getContactVelocity(ballA, rAX, rAY);
            const newVelB = getContactVelocity(ballB, rBX, rBY);

            const newRelativeVelX = newVelB.x - newVelA.x;
            const newRelativeVelY = newVelB.y - newVelA.y;

            const relativeTangentVel = newRelativeVelX * tx + newRelativeVelY * ty;

            const crossAT = rAX * ty - rAY * tx;
            const crossBT = rBX * ty - rBY * tx;

            const tangentDenominator = 1 / ballA.mass + 1 / ballB.mass +
                (crossAT * crossAT) / ballA.inertia + (crossBT * crossBT) / ballB.inertia;

            let frictionImpulse = -relativeTangentVel / tangentDenominator;

            const friction = Math.sqrt(ballA.friction * ballB.friction);

            const maxFrictionImpulse = friction * Math.abs(normalImpulse);

            frictionImpulse = Math.max(-maxFrictionImpulse, Math.min(frictionImpulse, maxFrictionImpulse));

            ballA.vel.x -= frictionImpulse * tx / ballA.mass;
            ballA.vel.y -= frictionImpulse * ty / ballA.mass;

            ballB.vel.x += frictionImpulse * tx / ballB.mass;
            ballB.vel.y += frictionImpulse * ty / ballB.mass;

            ballA.angularVel -= crossAT * frictionImpulse / ballA.inertia;
            ballB.angularVel += crossBT * frictionImpulse / ballB.inertia;
        }
    }
}

function handleWallCollision(ball, nx, ny) {
    const tx = -ny;
    const ty = nx;

    const normalVel = ball.vel.x * nx + ball.vel.y * ny;

    if (normalVel >= 0) {
        return;
    }

    const normalImpulse = -(1 + b) * normalVel * ball.mass;

    ball.vel.x += normalImpulse * nx / ball.mass;
    ball.vel.y += normalImpulse * ny / ball.mass;

    const rx = -nx * ball.radius;
    const ry = -ny * ball.radius;

    const contactVel = getContactVelocity(ball, rx, ry);

    const tangentVel = contactVel.x * tx + contactVel.y * ty;

    const crossT = rx * ty - ry * tx;

    const denominator = 1 / ball.mass + (crossT * crossT) / ball.inertia;

    let frictionImpulse = -tangentVel / denominator;

    const friction = Math.sqrt(ball.friction * fricW);

    const maxFrictionImpulse = friction * Math.abs(normalImpulse);

    frictionImpulse = Math.max(-maxFrictionImpulse, Math.min(frictionImpulse, maxFrictionImpulse));

    ball.vel.x += frictionImpulse * tx / ball.mass;
    ball.vel.y += frictionImpulse * ty / ball.mass;

    ball.angularVel += crossT * frictionImpulse / ball.inertia;
}

function handleWallCollisions(ball) {
    const right = box.clientWidth;
    const bottom = box.clientHeight;

    const x = ball.pos.x * pixelMeter;
    const y = ball.pos.y * pixelMeter;

    if (x + ball.pxRad > right) {
        ball.pos.x = (right - ball.pxRad) / pixelMeter;
        handleWallCollision(ball, -1, 0);
    }

    if (x - ball.pxRad < 0) {
        ball.pos.x = ball.pxRad / pixelMeter;
        handleWallCollision(ball, 1, 0);
    }

    if (y + ball.pxRad > bottom) {
        ball.pos.y = (bottom - ball.pxRad) / pixelMeter;
        handleWallCollision(ball, 0, -1);
    }

    if (y - ball.pxRad < 0) {
        ball.pos.y = ball.pxRad / pixelMeter;
        handleWallCollision(ball, 0, 1);
    }
}

function calculateForces(ball) {
    const gravForceX = ball.mass * g * gVec.x;
    const gravForceY = ball.mass * g * gVec.y;

    const dragForceX = -ball.vel.x * d;
    const dragForceY = -ball.vel.y * d;

    const forceX = gravForceX + dragForceX;
    const forceY = gravForceY + dragForceY;

    const accelX = forceX / ball.mass;
    const accelY = forceY / ball.mass;

    const angularDrag = -ball.angularVel * d;
    const angularAccel = angularDrag / ball.inertia;

    return { x: accelX, y: accelY, angular: angularAccel };
}

function updateVelocity(ball, x, y) {
    ball.vel.x += x * dt;
    ball.vel.y += y * dt;
}

function updateAngularVelocity(ball, accel) {
    ball.angularVel += accel * dt;
}

function updatePosition(ball) {
    ball.pos.x += ball.vel.x * dt;
    ball.pos.y += ball.vel.y * dt;
}

function updateAngle(ball) {
    ball.angle += ball.angularVel * dt;
}

async function calcPhy() {
    for (const ball of balls) {
        const forces = calculateForces(ball);
        updateVelocity(ball, forces.x, forces.y);
        updateAngularVelocity(ball, forces.angular);
        updatePosition(ball);
        updateAngle(ball);
    }

    for (const ball of balls) {
        handleWallCollisions(ball);
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
        el.style.transform = `translate(-50%, -50%) rotate(${balls[i].angle}rad)`;
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
    const radius = (dia / 2) / pixelMeter;
    const ball = {
        pos: {
            x: (event.clientX - boxRect.left) / pixelMeter,
            y: (event.clientY - boxRect.top) / pixelMeter
        },
        vel: { x: velX, y: velY },
        mass: m,
        size: dia,
        pxRad: dia / 2,
        radius: radius,
        friction: fric,
        angle: 0,
        angularVel: 0,
        inertia: 0.5 * m * radius ** 2
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

friction.addEventListener('change', e => { fric = +e.target.value });

fps.addEventListener('change', e => setFPS(e));

gravity.addEventListener('change', e => { g = +e.target.value });

gravDir.addEventListener('change', e => setGravity(e.target.value));

speed.addEventListener('change', e => { dt = +e.target.value / FPS });

speed.addEventListener('input', e => { labelSpeed.textContent = 'Speed: ' + e.target.value });

drag.addEventListener('change', e => { d = +e.target.value });

bounce.addEventListener('change', e => { b = +e.target.value });

frictionW.addEventListener('change', e => { fricW = +e.target.value });

box.addEventListener('click', e => addBall(e));