import { WILD_SWING } from "../helpers/swing.mjs";

/**
 * Extend the base Actor document by defining a custom roll data structure which is ideal for the Simple system.
 * @extends {Actor}
 */
export class WindroseActor extends Actor {
  /** @override */
  prepareData() {
    // Prepare data for the actor. Calling the super version of this executes
    // the following, in order: data reset (to clear active effects),
    // prepareBaseData(), prepareEmbeddedDocuments() (including active effects),
    // prepareDerivedData().
    super.prepareData();
  }

  async _preCreate(data, options, user) {
    if ((await super._preCreate(data, options, user)) === false) return false;

    // Configure prototype token settings
    const prototypeToken = {};
    if (this.type === "character")
      Object.assign(prototypeToken, { actorLink: true });
    this.updateSource({ prototypeToken });
  }
  //Create a new actor - When creating an actor set basics including tokenlink, bars, displays sight
  static async create(data, options = {}) {
    if (data.type === "character") {
      data.prototypeToken = mergeObject(data.prototypeToken || {}, {
        actorLink: true,
        disposition: 1,
        //displayName: CONST.TOKEN_DISPLAY_MODES.ALWAYS,
        //displayBars: CONST.TOKEN_DISPLAY_MODES.ALWAYS,
        sight: {
          enabled: true,
        },
        detectionModes: [
          {
            id: "basicSight",
            range: 30,
            enabled: true,
          },
        ],
      });
    }
    let actor = await super.create(data, options);
    return;
  }

  /** @override */
  prepareBaseData() {
    // Data modifications in this step occur before processing embedded
    // documents or derived data.
  }

  /**
   * @override
   * Augment the basic actor data with additional dynamic data. Typically,
   * you'll want to handle most of your calculated/derived data in this step.
   * Data calculated in this step should generally not exist in template.json
   * (such as ability modifiers rather than ability scores) and should be
   * available both inside and outside of character sheets (such as if an actor
   * is queried and has a roll executed directly from it).
   */
  prepareDerivedData() {
    const actorData = this;
    const systemData = actorData.system;
    const flags = actorData.flags.windrose || {};

    // Make separate methods for each Actor type (character, npc, etc.) to keep
    // things organized.
    this._prepareCharacterData(actorData);
    this._prepareNpcData(actorData);
  }

  /**
   * Prepare Character type specific data
   */
  _prepareCharacterData(actorData) {
    if (actorData.type !== "character") return;

    const systemData = actorData.system;
  }

  /**
   * Prepare NPC type specific data.
   */
  _prepareNpcData(actorData) {
    if (actorData.type !== "npc") return;

    const systemData = actorData.system;
  }

  /**
   * Override getRollData() that's supplied to rolls.
   */
  getRollData() {
    const data = super.getRollData();

    // Prepare character roll data.
    this._getCharacterRollData(data);
    this._getNpcRollData(data);

    return data;
  }

  /**
   * Prepare character roll data.
   */
  _getCharacterRollData(data) {
    if (this.type !== "character") return;

    // Copy the ability scores to the top level, so that rolls can use
    // formulas like `@str.mod + 4`.
    if (data.abilities) {
      for (let [k, v] of Object.entries(data.abilities)) {
        data[k] = foundry.utils.deepClone(v);
      }
    }

    // Add level for easier access, or fall back to 0.
    if (data.attributes.level) {
      data.lvl = data.attributes.level.value ?? 0;
    }
  }

  /**
   * Prepare NPC roll data.
   */
  _getNpcRollData(data) {
    if (this.type !== "npc") return;

    // Process additional NPC data here.
  }

  async setSwing(colorID, value) {
    this.items.forEach(async (element, index) => {
      if (element.type === "color") {
        if (element.id === colorID) {
          await element.update({
            "system.isSwing": true,
            "system.swingValue": value,
          });
          await this.update({ "system.swing.id": element.id });
        } else {
          await element.update({
            "system.isSwing": false,
            "system.swingValue": null,
          });
        }
      }
    });
    return;
  }

  async dropSwing() {
    this.items.forEach(async (element, index) => {
      if (element.type === "color") {
        await element.update({
          "system.isSwing": false,
          "system.swingValue": null,
        });
      }
    });
    this.update({
      "system.swing.id": null,
      "system.currentSwingName": null,
      "system.currentSwingValue": null,
      "system.currentSwingColor": null,
    });
    return;
  }

  getSwing() {
    return this.system.swing.id
      ? fromUuidSync(`Actor.${this.id}.Item.${this.system.swing.id}`)
      : null;
  }

  getActiveColors() {
    const colorArray = [];
    for (const element of this.items) {
      if (element.type === "color") {
        if (!(element.system.disabled || element.system.wounded)) {
          colorArray.push(element);
        }
      }
    }

    return colorArray;
  }

  getAllColors() {
    const colorArray = [];
    for (const element of this.items) {
      if (element.type === "color") {
        colorArray.push(element);
      }
    }
    return colorArray;
  }

  async rollToDo(colorID, bonuses) {
    const d20Roll = await new Roll("1d20").roll({ async: true });

    let swing = structuredClone(WILD_SWING);
    if (colorID) {
      const color = fromUuidSync(`Actor.${this.id}.Item.${colorID}`);
      swing.color = color.system.hexColor;
      swing.isSwing = color.system.isSwing; // if removing isSwing, replace with check against getSwing
      swing.displayName = color.system.displayName;
      swing.value = parseInt(color.system.swingValue); // assume is swing, will overwrite later if not
      swing.attributeBonus = color.system.value;
    }

    if (!!!swing.isSwing) {
      let swingRoll = await new Roll(`1d6+${swing.attributeBonus}`).roll({
        async: true,
      });
      swing.value = swingRoll.total;
    }
    return {
      d20: d20Roll.total,
      swing,
      total: d20Roll.total + swing.value + bonuses,
    };
  }

  async rollToDye(bonuses) {
    let colors = {
      attributes: this.getAllColors(),
      wounds: [],
      locks: [],
      rolls: [],
    };
    let total = 0;
    for (const attribute of colors.attributes) {
      if (!!attribute.system.disabled) {
        continue;
      } else if (!!attribute.system.wounded) {
        colors.wounds.push(attribute);
      } else if (!!attribute.system.locked) {
        colors.locks.push(attribute);

        if (actor.system.autoUnlock) {
          attribute.update({ "system.locked": false });
        }
      } else {
        if (!!attribute.system.isSwing) {
          colors.rolls.push({
            attribute,
            value: parseInt(attribute.system.swingValue),
          });
          total += parseInt(attribute.system.swingValue);
        } else {
          const roll = await new Roll(
            `${attribute.system.diceSize}+${attribute.system.value}`
          ).roll({ async: true });
          colors.rolls.push({
            attribute,
            value: roll.total,
          });
          total += roll.total;
        }
      }
    }

    total += bonuses;
    return {
      colors,
      total,
    };
  }
}
