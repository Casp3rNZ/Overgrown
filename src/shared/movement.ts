export interface PlayerState {
    position: { x: number; y: number; z: number; };
    velocity: { x: number; y: number; z: number; };
    moveDirection: { x: number; y: number; z: number; };
    wishDirection: { x: number; y: number; z: number; };
    isGrounded: boolean;
    lastJumpTime: number;
    jumpQueued: boolean;
    friction: number;
    strafeAngle: number;
    consecutiveJumps: number;
}

export interface PlayerInput {
    forward: boolean;
    backward: boolean;
    left: boolean;
    right: boolean;
    jump: boolean;
    rotationY: number;
}

const WALK_SPEED = 6.6;
const MAX_SPEED = 15;
const ACCELERATION = 35;
const AIR_ACCELERATION = 7;
const FRICTION_GROUND = 2;
const FRICTION_AIR = 0.5;
const JUMP_FORCE = 5;
const GRAVITY = 15.0;
const MAX_AIR_STRAFES = 10;
const STRAFE_ANGLE_CHANGE = 0.5;

function vec3(x = 0, y = 0, z = 0) {
    return { x, y, z };
}
function length(v: { x: number; y: number; z: number; }) {
    return Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
}
function normalize(v: { x: number; y: number; z: number; }) {
    const len = length(v);
    if (len > 0) {
        v.x /= len;
        v.y /= len;
        v.z /= len;
    }
    return v;
}
function dot(a: { x: number; y: number; z: number; }, b: { x: number; y: number; z: number; }) {
    return a.x * b.x + a.y * b.y + a.z * b.z;
}
function scale(v: { x: number; y: number; z: number; }, s: number) {
    return { x: v.x * s, y: v.y * s, z: v.z * s };
}
function add(a: { x: number; y: number; z: number; }, b: { x: number; y: number; z: number; }) {
    return { x: a.x + b.x, y: a.y + b.y, z: a.z + b.z };
}
function sub(a: { x: number; y: number; z: number; }, b: { x: number; y: number; z: number; }) {
    return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z };
}
function clamp(val: number, min: number, max: number) {
    return Math.max(min, Math.min(max, val));
}

export function simulatePlayerMovement(state: PlayerState, input: PlayerInput, dt: number) {
    // Calculate wish direction based on input and rotationY (yaw)
    const yaw = input.rotationY;
    const forward = { 
        x: Math.sin(yaw), 
        y: 0, 
        z: Math.cos(yaw) 
    };

    const right = { 
        x: Math.cos(yaw), 
        y: 0, 
        z: -Math.sin(yaw) 
    };

    let wishDir = vec3();
    if (input.forward) {
        wishDir.x += forward.x;
        wishDir.z += forward.z;
    }
    if (input.backward) {
        wishDir.x -= forward.x;
        wishDir.z -= forward.z;
    }
    if (input.left) {
        wishDir.x -= right.x;
        wishDir.z -= right.z;
    }
    if (input.right) {
        wishDir.x += right.x;
        wishDir.z += right.z;
    }
    normalize(wishDir);

    // Friction
    const friction = state.isGrounded ? FRICTION_GROUND : FRICTION_AIR;
    const speed = Math.sqrt(state.velocity.x * state.velocity.x + state.velocity.z * state.velocity.z);
    if (speed > 0) {
        const control = speed < WALK_SPEED ? WALK_SPEED : speed;
        const drop = control * friction * dt;
        const newSpeed = Math.max(0, speed - drop);
        if (speed > 0) {
            state.velocity.x *= newSpeed / speed;
            state.velocity.z *= newSpeed / speed;
        }
    }

    // Acceleration
    const acceleration = state.isGrounded ? ACCELERATION : AIR_ACCELERATION;
    const currentSpeed = dot(state.velocity, wishDir);
    const addSpeed = clamp(MAX_SPEED - currentSpeed, 0, MAX_SPEED);
    if (length(wishDir) > 0) {
        const accel = acceleration * dt;
        const accelSpeed = Math.min(addSpeed, accel);
        state.velocity.x += wishDir.x * accelSpeed;
        state.velocity.z += wishDir.z * accelSpeed;
    }

    // Gravity
    if (!state.isGrounded) {
        state.velocity.y -= GRAVITY * dt;
    }

    // Jumping
    if (input.jump && state.isGrounded) {
        state.velocity.y = JUMP_FORCE;
        state.isGrounded = false;
        state.consecutiveJumps++;
        state.lastJumpTime = Date.now();
    }

    // Update position
    state.position.x += state.velocity.x * dt;
    state.position.y += state.velocity.y * dt;
    state.position.z += state.velocity.z * dt;

    // Simple ground collision (y=0 is ground)
    if (state.position.y <= 0) {
        state.position.y = 0;
        state.velocity.y = 0;
        state.isGrounded = true;
        state.consecutiveJumps = 0;
    }

}