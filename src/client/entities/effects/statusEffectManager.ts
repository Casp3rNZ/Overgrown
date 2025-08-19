import { StatusEffect, StatusEffectTarget } from "./statusEffectsITF";
// not in use yet
export class StatusEffectManager {
    private effects: StatusEffect[] = [];
    constructor(private target: StatusEffectTarget) {}

    add(effect: StatusEffect): void {
        effect.onApply(this.target);
        this.effects.push(effect);
    }

    update(delta: number) {
        for (const effect of this.effects) {
            effect.onUpdate(this.target, delta);
            effect.elapsed += delta;
        }
        this.effects = this.effects.filter(effect => {
            if (effect.isExpired()) {
                effect.onRemove(this.target);
                return false;
            }
            return true;
        });
    }

    remove(name: string): void {
        this.effects = this.effects.filter(effect => effect.name != name);
    }

    has(name: string): boolean {
        return this.effects.some(effect => effect.name == name);
    }
}