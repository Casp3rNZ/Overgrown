import { handleCollisions } from "./collision.js";

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
    rotationY: number;
    correction?: { position: { x: number; y: number; z: number; } };
}

export interface PlayerInput {
    forward: boolean;
    backward: boolean;
    left: boolean;
    right: boolean;
    jump: boolean;
    rotationY: number;
}

const WALK_SPEED = 6.6;      // Max walking speed
const MAX_SPEED = 15;        // Maximum speed
const ACCELERATION = 5;      // Ground acceleration
const AIR_ACCELERATION = 7;  // Air acceleration
const FRICTION_GROUND = 3;   // Ground friction
const FRICTION_AIR = 0.5;    // Air friction
const JUMP_FORCE = 4.5;     // Jump force
const GRAVITY = 15.24;       // Gravity
const MAX_AIR_STRAFES = 10;  // Maximum air strafes
const STRAFE_ANGLE_CHANGE = 0.5; // Air strafe angle change rate

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

export function simulatePlayerMovement(state: PlayerState, input: PlayerInput, dt: number, otherPlayers?: { [id: string]: PlayerState }) {
    // Update ground state
    checkGroundContact(state);

    // Handle jumping
    handleJumping(state, input.jump, dt);

    // Calculate movement direction based on rotation
    calculateWishDirection(state, input);

    // Apply movement physics
    applyMovementPhysics(state, dt);

    // Apply gravity
    if (!state.isGrounded) {
        state.velocity.y -= GRAVITY * dt;
    }

    // Apply velocity to position
    state.position.x += state.velocity.x * dt;
    state.position.y += state.velocity.y * dt;
    state.position.z += state.velocity.z * dt;

    // Handle collisions if otherPlayers is provided
    if (otherPlayers) {
        const collisionCorrection = handleCollisions(state, otherPlayers);
        if (collisionCorrection) {
            state.position = collisionCorrection.position;
            state.correction = collisionCorrection;
        }
    }

    // Ground collision check
    if (state.position.y <= 0) {
        state.position.y = 0;
        state.velocity.y = 0;
        state.isGrounded = true;
        state.consecutiveJumps = 0;
    }
}

function checkGroundContact(state: PlayerState): void {
    const groundThreshold = 0.15;
    state.isGrounded = state.position.y <= groundThreshold;
    
    if (state.isGrounded) {
        state.consecutiveJumps = 0;
    }
}

function handleJumping(state: PlayerState, jumpPressed: boolean, dt: number): void {
    // Queue jump if pressed right before landing
    if (jumpPressed && !state.jumpQueued) {
        state.jumpQueued = true;
        setTimeout(() => {
            state.jumpQueued = false;
        }, 200); // Jump buffer window
    }

    // Execute jump
    if ((state.isGrounded || state.consecutiveJumps < MAX_AIR_STRAFES) && state.jumpQueued) {
        state.velocity.y = JUMP_FORCE;
        state.isGrounded = false;
        state.jumpQueued = false;
        state.lastJumpTime = Date.now();
        state.consecutiveJumps++;
        
        // Apply initial strafe push if in air
        if (state.consecutiveJumps > 1) {
            applyAirStrafing(state, dt);
        }
    }
}

function calculateWishDirection(state: PlayerState, input: PlayerInput): void {
    // Get forward vector based on rotation
    const forward = {
        x: Math.sin(input.rotationY),
        y: 0,
        z: Math.cos(input.rotationY)
    };

    // Get right vector based on rotation
    const right = {
        x: Math.sin(input.rotationY + Math.PI/2),
        y: 0,
        z: Math.cos(input.rotationY + Math.PI/2)
    };

    // Calculate wish direction based on input
    state.wishDirection = { x: 0, y: 0, z: 0 };
    
    if (input.forward) {
        state.wishDirection.x += forward.x;
        state.wishDirection.z += forward.z;
    }
    if (input.backward) {
        state.wishDirection.x -= forward.x;
        state.wishDirection.z -= forward.z;
    }
    if (input.left) {
        state.wishDirection.x -= right.x;
        state.wishDirection.z -= right.z;
    }
    if (input.right) {
        state.wishDirection.x += right.x;
        state.wishDirection.z += right.z;
    }

    // Normalize wish direction
    const length = Math.sqrt(
        state.wishDirection.x * state.wishDirection.x +
        state.wishDirection.z * state.wishDirection.z
    );
    
    if (length > 0) {
        state.wishDirection.x /= length;
        state.wishDirection.z /= length;
    }
}

function applyMovementPhysics(state: PlayerState, dt: number): void {
    // Apply friction
    if (state.isGrounded) {
        const speed = Math.sqrt(
            state.velocity.x * state.velocity.x +
            state.velocity.z * state.velocity.z
        );
        
        if (speed > 0) {
            const control = speed < WALK_SPEED ? WALK_SPEED : speed;
            const drop = control * FRICTION_GROUND * dt;
            const scale = Math.max(speed - drop, 0) / speed;
            state.velocity.x *= scale;
            state.velocity.z *= scale;
        }
    }

    // Calculate acceleration
    const acceleration = state.isGrounded ? ACCELERATION : AIR_ACCELERATION;
    const currentSpeed = state.velocity.x * state.wishDirection.x + 
                        state.velocity.z * state.wishDirection.z;
    const addSpeed = Math.max(0, MAX_SPEED - currentSpeed);

    // Apply acceleration
    if (state.wishDirection.x !== 0 || state.wishDirection.z !== 0) {
        const accel = acceleration * dt * MAX_SPEED;
        const accelSpeed = Math.min(accel, addSpeed);
        state.velocity.x += state.wishDirection.x * accelSpeed;
        state.velocity.z += state.wishDirection.z * accelSpeed;

        // Air strafing mechanics
        if (!state.isGrounded) {
            applyAirStrafing(state, dt);
        }
    }

    // Limit horizontal speed
    const horizontalSpeed = Math.sqrt(
        state.velocity.x * state.velocity.x +
        state.velocity.z * state.velocity.z
    );
    
    if (horizontalSpeed > MAX_SPEED) {
        const scale = MAX_SPEED / horizontalSpeed;
        state.velocity.x *= scale;
        state.velocity.z *= scale;
    }
}

function applyAirStrafing(state: PlayerState, dt: number): void {
    // Only apply air strafing if moving and trying to change direction
    if ((state.wishDirection.x !== 0 || state.wishDirection.z !== 0) && 
        (state.velocity.x !== 0 || state.velocity.z !== 0)) {
        
        // Calculate angle between velocity and wish direction
        const horizontalVel = { x: state.velocity.x, y: 0, z: state.velocity.z };
        const dot = horizontalVel.x * state.wishDirection.x + 
                   horizontalVel.z * state.wishDirection.z;
        const cross = horizontalVel.x * state.wishDirection.z - 
                     horizontalVel.z * state.wishDirection.x;
        const angle = Math.atan2(cross, dot);

        // Adjust strafe angle based on movement
        state.strafeAngle += Math.sign(angle) * STRAFE_ANGLE_CHANGE * dt;
        state.strafeAngle = Math.max(-Math.PI/4, Math.min(Math.PI/4, state.strafeAngle));

        // Apply strafe force
        const strafeDir = {
            x: Math.sin(state.strafeAngle),
            y: 0,
            z: Math.cos(state.strafeAngle)
        };

        const strafeForce = 0.5 * AIR_ACCELERATION * dt;
        state.velocity.x += strafeDir.x * strafeForce;
        state.velocity.z += strafeDir.z * strafeForce;
    }
}