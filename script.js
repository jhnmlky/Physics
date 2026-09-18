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
const threshold = 0.05;

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
let gVec = vec(0, 1);
let dt = 1 / FPS;
let d = 0.1;
let b = 0.8;
let fricW = 0.5;

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

function createWalls() {
    const width = box.clientWidth / pixelMeter;
    const height = box.clientHeight / pixelMeter;

    return [
        { pos: vec(0, 0), normal: vec(1, 0) },
        { pos: vec(width, 0), normal: vec(-1, 0) },
        { pos: vec(0, 0), normal: vec(0, 1) },
        { pos: vec(0, height), normal: vec(0, -1) }
    ];
}

function vec(x = 0, y = 0) {
    return { x, y };
}

function add(a, b) {
    return vec(a.x + b.x, a.y + b.y);
}

function sub(a, b) {
    return vec(a.x - b.x, a.y - b.y);
}

function mul(v, scalar) {
    return vec(v.x * scalar, v.y * scalar);
}

function dot(a, b) {
    return a.x * b.x + a.y * b.y;
}

function magnitude(v) {
    return Math.sqrt(v.x * v.x + v.y * v.y);
}

function normalize(v) {
    const length = magnitude(v);
    return vec(v.x / length, v.y / length);
}

function cross(a, b) {
    return a.x * b.y - a.y * b.x;
}

function perpendicular(v) {
    return vec(-v.y, v.x);
}

function getContactVelocity(ball, r) {
    const rotationalVelocity = vec(-ball.angularVel * r.y, ball.angularVel * r.x);
    return add(ball.vel, rotationalVelocity);
}

function handleBallCollision(ballA, ballB) {
    const delta = sub(ballB.pos, ballA.pos);
    const distance = magnitude(delta);
    const combinedRadius = ballA.radius + ballB.radius;

    if (distance >= combinedRadius) {
        return;
    }

    if (distance === 0) {
        return;
    }

    const normal = normalize(delta);
    const tangent = perpendicular(normal);
    const penetration = combinedRadius - distance;

    const invMassA = 1 / ballA.mass;
    const invMassB = 1 / ballB.mass;
    const totalInvMass = invMassA + invMassB;

    const correctionA = penetration * (invMassA / totalInvMass);
    const correctionB = penetration * (invMassB / totalInvMass);

    ballA.pos = sub(ballA.pos, mul(normal, correctionA));
    ballB.pos = add(ballB.pos, mul(normal, correctionB));

    const rA = mul(normal, ballA.radius);
    const rB = mul(normal, -ballB.radius);

    const contactVelocityA = getContactVelocity(ballA, rA);
    const contactVelocityB = getContactVelocity(ballB, rB);
    const relativeVelocity = sub(contactVelocityB, contactVelocityA);
    const normalVelocity = dot(relativeVelocity, normal);

    if (normalVelocity >= 0) {
        return;
    }

    const normalImpulse = -(1 + b) * normalVelocity / (1 / ballA.mass + 1 / ballB.mass);

    ballA.vel = sub(ballA.vel, mul(normal, normalImpulse / ballA.mass));
    ballB.vel = add(ballB.vel, mul(normal, normalImpulse / ballB.mass));

    const tangentVelocity = dot(relativeVelocity, tangent);
    const rACrossT = cross(rA, tangent);
    const rBCrossT = cross(rB, tangent);

    const denominator = 1 / ballA.mass + 1 / ballB.mass + (rACrossT *
        rACrossT) / ballA.inertia + (rBCrossT * rBCrossT) / ballB.inertia;
    let frictionImpulse = -tangentVelocity / denominator;
    const friction = Math.sqrt(ballA.friction * ballB.friction);
    const maxFrictionImpulse = friction * Math.abs(normalImpulse);
    frictionImpulse = Math.max(-maxFrictionImpulse,
        Math.min(frictionImpulse, maxFrictionImpulse));

    ballA.vel = sub(ballA.vel, mul(tangent, frictionImpulse / ballA.mass));
    ballB.vel = add(ballB.vel, mul(tangent, frictionImpulse / ballB.mass));
    ballA.angularVel -= rACrossT * frictionImpulse / ballA.inertia;
    ballB.angularVel += rBCrossT * frictionImpulse / ballB.inertia;
}

function handleBallCollisions() {
    for (let i = 0; i < balls.length; i++) {
        for (let j = i + 1; j < balls.length; j++) {
            handleBallCollision(balls[i], balls[j]);
        }
    }
}

function handleWallResponse(ball, normal) {
    const tangent = perpendicular(normal);
    const normalVelocity = dot(ball.vel, normal);

    if (normalVelocity >= 0) {
        return;
    }

    if (Math.abs(normalVelocity) < threshold) {
        ball.vel = sub(ball.vel, mul(normal, normalVelocity));
        return;
    }

    const normalImpulse = -(1 + b) * normalVelocity * ball.mass;

    ball.vel = add(ball.vel, mul(normal, normalImpulse / ball.mass));

    const r = mul(normal, -ball.radius);
    const contactVelocity = getContactVelocity(ball, r);
    const tangentVelocity = dot(contactVelocity, tangent);
    const rCrossT = cross(r, tangent);

    const denominator = 1 / ball.mass + (rCrossT * rCrossT) / ball.inertia;
    let frictionImpulse = -tangentVelocity / denominator;
    const friction = Math.sqrt(ball.friction * fricW);
    const maxFrictionImpulse = friction * Math.abs(normalImpulse);
    frictionImpulse = Math.max(-maxFrictionImpulse,
        Math.min(frictionImpulse, maxFrictionImpulse));

    ball.vel = add(ball.vel, mul(tangent, frictionImpulse / ball.mass));
    ball.angularVel += rCrossT * frictionImpulse / ball.inertia;
}

function handleWallCollision(ball, wall) {
    const difference = sub(ball.pos, wall.pos);
    const distance = dot(difference, wall.normal);

    if (distance >= ball.radius) {
        return;
    }

    const penetration = ball.radius - distance;

    ball.pos = add(ball.pos, mul(wall.normal, penetration));

    handleWallResponse(ball, wall.normal);
}

function calculateForces(ball) {
    const grav = mul(gVec, g);

    const gravForce = mul(grav, ball.mass);
    const dragForce = mul(ball.vel, -d);
    const force = add(gravForce, dragForce);

    const acceleration = mul(force, 1 / ball.mass);

    const angularDrag = -ball.angularVel * d;
    const angularAccel = angularDrag / ball.inertia;

    return { accel: acceleration, angular: angularAccel };
}

function updateVelocity(ball, accel) {
    ball.vel = add(ball.vel, mul(accel, dt));
}

function updateAngularVelocity(ball, accel) {
    ball.angularVel += accel * dt;
    if (Math.abs(ball.angularVel) < threshold) {
        ball.angularVel = 0;
    }
}

function updatePosition(ball) {
    ball.pos = add(ball.pos, mul(ball.vel, dt));
}

function updateAngle(ball) {
    ball.angle += ball.angularVel * dt;
}

async function calcPhy() {
    const walls = createWalls();
    for (const ball of balls) {
        const forces = calculateForces(ball);
        updateVelocity(ball, forces.accel);
        updateAngularVelocity(ball, forces.angular);
        updatePosition(ball);
        updateAngle(ball);

        for (const wall of walls) {
            handleWallCollision(ball, wall);
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
        pos: vec((event.clientX - boxRect.left) / pixelMeter,
            (event.clientY - boxRect.top) / pixelMeter),
        vel: vec(velX, velY),
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
            gVec = vec(0, -1);
            break;
        case "right":
            gVec = vec(1, 0);
            break;
        case "bottom":
            gVec = vec(0, 1);
            break;
        case "left":
            gVec = vec(-1, 0);
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