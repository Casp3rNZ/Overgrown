export class StateInterpolator {
    private states: Array<{
        position: { x: number; y: number; z: number };
        rotationY?: number;
        timestamp: number;
    }> = [];

    private readonly maxStates = 10; 
    // Keep last 10 states for interpolation
    // anything more seems a little off for 20tps

    public addState(state: { position: { x: number; y: number; z: number }; rotationY?: number }) {
        this.states.push({
            position: { ...state.position },
            rotationY: state.rotationY,
            timestamp: performance.now()
        });

        // Remove old states
        if (this.states.length > this.maxStates) {
            this.states.shift();
        }
    }

    public getInterpolatedState(interpolationDelay: number = 100): { position: { x: number; y: number; z: number }; rotationY?: number } | null {
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

        // Interpolate position
        const interpolatedState: { position: { x: number; y: number; z: number }; rotationY?: number } = {
            position: {
                x: olderState.position.x + (newerState.position.x - olderState.position.x) * factor,
                y: olderState.position.y + (newerState.position.y - olderState.position.y) * factor,
                z: olderState.position.z + (newerState.position.z - olderState.position.z) * factor
            }
        };

        // Interpolate rotation if both states have it
        if (olderState.rotationY !== undefined && newerState.rotationY !== undefined) {
            interpolatedState.rotationY = olderState.rotationY + (newerState.rotationY - olderState.rotationY) * factor;
        }
        return interpolatedState;
    }
} 