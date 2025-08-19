export interface StatusEffect {
    name: string;
    duration: number;
    elapsed: number;
    isExpired(): boolean;
    onApply: (target: StatusEffectTarget) => void;
    onUpdate: (target: StatusEffectTarget, delta: number) => void;
    onRemove: (target: StatusEffectTarget) => void;
}

export interface StatusEffectTarget {
    addStatusEffect(effect: StatusEffect): void;
    removeStatusEffect(name: string): void;
    hasStatusEffect(name: string): boolean;
    triggerStatusVisualEffect(name: string): void;
    // getStatusEffects(): StatusEffect[];
}