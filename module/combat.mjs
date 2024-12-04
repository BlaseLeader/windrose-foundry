export class CombatWindrose extends Combat {
  constructor(...args) {
    super(...args);
  }

  async nextRound() {
    await super.nextRound();
    
  }
}
