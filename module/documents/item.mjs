/**
 * Extend the basic Item with some very simple modifications.
 * @extends {Item}
 */
export class WindroseItem extends Item {
  /**
   * Augment the basic Item data model with additional dynamic data.
   */
  prepareData() {
    // As with the actor class, items are documents that can have their data
    // preparation methods overridden (such as prepareBaseData()).
    super.prepareData();
 
    if (this.type === 'color') { this.img = "systems/windrose/assets/color_icon.png" }
    if (this.type === 'gift') { this.img = "systems/windrose/assets/gift_icon.png" }
  }
  //Override all the flags used by the character sheet when a new item is created.
  _preCreate(doc, data, options, user){
    super._preCreate(doc, data, options, user);
  }
  _preCreate(data, options, user){
    if(data.type=="color")
    {
      this.updateSource({
      "system.wounded": false,
      "system.locked": false,
      "system.expanded": false,
      "system.isSwing": false,
      "system.swingValue": 0,
      "system.disabled": 0
      })
    }
    if(data.type=="gift")
    {
      this.updateSource({
        "system.isPrimary":false,
        "system.isEquipped":false,
        "system.expanded":false})
    }
    super._preCreate(data, options, user);

  }
  /**
   * Prepare a data object which is passed to any Roll formulas which are created related to this Item
   * @private
   */
   getRollData() {
    // If present, return the actor's roll data.
    if ( !this.actor ) return null;
    const rollData = this.actor.getRollData();
    // Grab the item's system data as well.
    rollData.item = foundry.utils.deepClone(this.system);

    return rollData;
  }
  /**
   * Handle clickable rolls.
   * @param {Event} event   The originating click event
   * @private
   */
  async roll() {
    const item = this;

    // Initialize chat data.
    const speaker = ChatMessage.getSpeaker({ actor: this.actor });
    let label = `[${item.type}] ${item.name}`;
    let content = item.system.description ?? ''
    if(item.type == 'gift')
    {
        if(item.system.isPrimary)
        {
          label += ` {Primary}`;
          content = item.system.primaryDescription+'\n\n'+ content;
        }
    }
    //replace this with a color square template in the future
    if(item.type == 'color')
    {
      label = `[${item.type}] ${item.system.displayName} (${item.system.value})`;
    }

    // If there's no roll data, send a chat message.
    if (!this.system.formula) {
      ChatMessage.create({
        speaker: speaker,
        type: CONST.CHAT_MESSAGE_TYPES.ROLL,
        rollMode: game.settings.get("core", "rollMode"),
        flavor: label,
        content: content
      });
    }
    // Otherwise, create a roll and send a chat message from it.
    else {
      // Retrieve roll data.
      const rollData = this.getRollData();

      // Invoke the roll and submit it to chat.
      const roll = new Roll(rollData.item.formula, rollData);
      // If you need to store the value first, uncomment the next line.
      // let result = await roll.roll({async: true});
      roll.toMessage({
        speaker: speaker,
        type: CONST.CHAT_MESSAGE_TYPES.ROLL,
        rollMode: game.settings.get("core", "rollMode"),
        flavor: label,
      });
      return roll;
    }
  }
}
