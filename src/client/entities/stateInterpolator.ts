export class StateInterpolator {
    private states: Array<{
        position: { x: number; y: number; z: number };
        velocity: { x: number; y: number; z: number };
        rotationY?: number;
        timestamp: number;
        correction?: { position: { x: number; y: number; z: number } };
    }> = [];

    private readonly maxStates = 10; 
    // Keep last 10 states for interpolation
    // anything more seems a little off for 20tps

    public addState(state: { 
        position: { x: number; y: number; z: number }; 
        velocity: { x: number; y: number; z: number };
        rotationY?: number;
        correction?: { position: { x: number; y: number; z: number } };
    }) {
        this.states.push({
            position: { ...state.position },
            velocity: { ...state.velocity },
            rotationY: state.rotationY,
            correction: state.correction ? { position: { ...state.correction.position } } : undefined,
            timestamp: performance.now()
        });

        // Remove old states
        if (this.states.length > this.maxStates) {
            this.states.shift();
        }

        // If we received a correction, adjust all future states
        if (state.correction) {
            const correctionDelta = {
                x: state.correction.position.x - state.position.x,
                y: state.correction.position.y - state.position.y,
                z: state.correction.position.z - state.position.z
            };

            // Apply correction to all future states
            for (let i = this.states.length - 1; i >= 0; i--) {
                if (this.states[i].timestamp >= this.states[this.states.length - 1].timestamp) {
                    this.states[i].position.x += correctionDelta.x;
                    this.states[i].position.y += correctionDelta.y;
                    this.states[i].position.z += correctionDelta.z;
                }
            }
        }
    }

    public getInterpolatedState(interpolationDelay: number = 100): { 
        position: { x: number; y: number; z: number }; 
        velocity: { x: number; y: number; z: number };
        rotationY?: number 
    } | null {
        const now = performance.now();
        const targetTime = now - interpolationDelay;

        // Find the two states to interpolate between
        let olderState = null;
        let newerState = null;

        for (let i = this.states.length - 1; i >= 0; i--) {
            if (this.states[i].timestamp <= targetTime) {
                olderState = this.states[i];
                if (i < this.states.length - 1) {
                    newerState = this.states[i + 1];
                }
                break;
            }
        }

        if (!olderState || !newerState) {
            return null;
        }

        // Calculate interpolation factor
        const factor = (targetTime - olderState.timestamp) / 
                      (newerState.timestamp - olderState.timestamp);

        // Calculate the time delta between states
        const dt = (newerState.timestamp - olderState.timestamp) / 1000; // Convert to seconds

        // Calculate the expected position based on velocity and friction
        const expectedPosition = {
            x: olderState.position.x + olderState.velocity.x * dt * factor,
            y: olderState.position.y + olderState.velocity.y * dt * factor,
            z: olderState.position.z + olderState.velocity.z * dt * factor
        };

        // Calculate the actual interpolated position
        const interpolatedPosition = {
            x: olderState.position.x + (newerState.position.x - olderState.position.x) * factor,
            y: olderState.position.y + (newerState.position.y - olderState.position.y) * factor,
            z: olderState.position.z + (newerState.position.z - olderState.position.z) * factor
        };

        // Calculate the effective velocity that would result in the interpolated position
        const effectiveVelocity = {
            x: (interpolatedPosition.x - olderState.position.x) / (dt * factor),
            y: (interpolatedPosition.y - olderState.position.y) / (dt * factor),
            z: (interpolatedPosition.z - olderState.position.z) / (dt * factor)
        };

        return {
            position: interpolatedPosition,
            velocity: effectiveVelocity,
        };
    }
} 