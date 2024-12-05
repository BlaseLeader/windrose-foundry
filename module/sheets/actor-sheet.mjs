import {
  onManageActiveEffect,
  prepareActiveEffectCategories,
} from "../helpers/effects.mjs";
import { createChatRoll, CreateRollFromUserString } from "../helpers/rolls.mjs";

/**
 * Extend the basic ActorSheet with some very simple modifications
 * @extends {ActorSheet}
 */
export class WindroseActorSheet extends ActorSheet {
  /** @override */
  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      classes: ["windrose", "sheet", "actor"],
      template: "systems/windrose/templates/actor/actor-sheet.html",
      width: 600,
      height: 600,
      tabs: [
        {
          navSelector: ".sheet-tabs",
          contentSelector: ".sheet-body",
          initial: "features",
        },
      ],
    });
  }

  /** @override */
  get template() {
    return `systems/windrose/templates/actor/actor-${this.actor.type}-sheet.html`;
  }

  /* -------------------------------------------- */

  /** @override */
  getData() {
    // Retrieve the data structure from the base sheet. You can inspect or log
    // the context variable to see the structure, but some key properties for
    // sheets are the actor object, the data object, whether or not it's
    // editable, the items array, and the effects array.
    const context = super.getData();

    // Use a safe clone of the actor data for further operations.
    const actorData = this.actor.toObject(false);

    // Add the actor's data to context.data for easier access, as well as flags.
    context.system = actorData.system;
    context.flags = actorData.flags;

    // Prepare character data and items.
    if (actorData.type == "character") {
      this._prepareItems(context);
      this._prepareCharacterData(context);
      this._prepareSettings(context);
    }

    // Prepare NPC data and items.
    if (actorData.type == "npc") {
      this._prepareItems(context);
      this._prepareSettings(context);
    }
    // Add roll data for TinyMCE editors.
    context.rollData = context.actor.getRollData();

    // Prepare active effects
    context.effects = prepareActiveEffectCategories(this.actor.effects);

    return context;
  }

  /**
   * Organize and classify Items for Character sheets.
   *
   * @param {Object} actorData The actor to prepare.
   *
   * @return {undefined}
   */
  _prepareCharacterData(context) {}

  /**
   * Organize and classify Settings for Character sheets.
   *
   */
  _prepareSettings(context) {
    context.settings = {
      supportAction: game.settings.get("windrose", "supportAction"),
    };
  }
  /**
   * Organize and classify Items for Character sheets.
   *
   * @param {Object} actorData The actor to prepare.
   *
   * @return {undefined}
   */
  _prepareItems(context) {
    // Initialize containers.
    const gifts = [];
    const colors = [];
    context.system.xpToLevelHP = Math.floor(context.system.health.max / 10) + 2;
    // Iterate through items, allocating to containers
    for (let i of context.items) {
      i.img = i.img || DEFAULT_TOKEN;
      // Append to color
      if (i.type === "color") {
        colors.push(i);
        i.system.xpToLevel = (i.system.value + 1) * 10;
      }
      // Append to gift.
      else if (i.type === "gift") {
        gifts.push(i);
      }
    }

    // Assign and return
    //sorting array here for handlebars
    context.gifts = gifts
      .sort(function (a, b) {
        return a.system.isEquipped - b.system.isEquipped;
      })
      .sort(function (a, b) {
        return a.system.isPrimary - b.system.isPrimary;
      })
      .reverse();
    context.colors = colors.sort(function (a, b) {
      return a.system.disabled - b.system.disabled;
    });
  }

  /* -------------------------------------------- */

  /** @override */
  activateListeners(html) {
    super.activateListeners(html);

    // Render the item sheet for viewing/editing prior to the editable check.
    html.find(".item-edit").click((ev) => {
      const li = $(ev.currentTarget).parents(".item");
      const item = this.actor.items.get(li.data("itemId"));
      item.sheet.render(true);
    });

    // -------------------------------------------------------------
    // Everything below here is only needed if the sheet is editable
    if (!this.isEditable) return;

    // Add Inventory Item
    html.find(".item-create").click(this._onItemCreate.bind(this));

    //Lock a color
    html.find(".item-toggle-lock").click(this._onToggleLock.bind(this));

    html.find(".item-toggle-wound").click(this._onToggleWound.bind(this));

    html.find(".item-toggle-equip").click(this._onToggleEquipped.bind(this));

    html.find(".item-toggle-primary").click(this._onTogglePrimary.bind(this));
    html.find(".item-spendxp").click(this._onSpendXp.bind(this));
    html.find(".item-spendxponhp").click(this._onSpendXpOnHP.bind(this));
    html.find(".item-spendxponspeed").click(this._onSpendXpOnSpeed.bind(this));
    html.find(".item-remove-swing").click(this._onRemoveSwing.bind(this));

    //Toggle item expansion
    html.find(".item-toggle-expand").click(this._onToggleExpand.bind(this));

    html.find(".item-rollToDyeButton").click(this._onRollToDye.bind(this));
    html.find(".item-rollToDoButton").click(this._onRollToDo.bind(this));
    html
      .find(".item-rollToRecoverButton")
      .click(this._onRollToRecover.bind(this));
    html.find(".item-setSwingButton").click(this._onSetSwing.bind(this));
    html.find(".item-supportAction").click(this._onSupportAction.bind(this));

    // Delete Inventory Item
    html.find(".item-delete").click(this._onDelete.bind(this));

    // Active Effect management
    html
      .find(".effect-control")
      .click((ev) => onManageActiveEffect(ev, this.actor));

    // Rollable abilities.
    html.find(".rollable").click(this._onRoll.bind(this));

    // Drag events for macros.
    if (this.actor.isOwner) {
      let handler = (ev) => this._onDragStart(ev);
      html.find("li.item").each((i, li) => {
        if (li.classList.contains("inventory-header")) return;
        li.setAttribute("draggable", true);
        li.addEventListener("dragstart", handler, false);
      });
    }
  }
  /**
   * Chat message templates
   */
  chatTemplate = {
    rollToDo: "systems/windrose/templates/chat/roll-to-do-chat.html",
    rollToDye: "systems/windrose/templates/chat/roll-to-dye-chat.html",
    rollToRecover: "systems/windrose/templates/chat/roll-to-recover-chat.html",
  };

  async _onDelete(ev) {
    const li = $(ev.currentTarget).parents(".item");
    const item = this.actor.items.get(li.data("itemId"));

    let userInput = await CreateConfirmationDialogue();
    if (userInput.cancelled) {
      return;
    }

    item.delete();
    li.slideUp(200, () => this.render(false));
  }

  async _onSupportAction(event) {
    let colorArray = [];
    //Get Color Array
    for (const element of this.actor.items) {
      if (element.type === "color") {
        if (
          !(
            element.system.disabled ||
            element.system.wounded ||
            element.system.locked
          )
        ) {
          colorArray.push(element);
        }
      }
    }

    let userInput = await SupportActionDialogue(colorArray);
    if (userInput.cancelled) return;

    // todo: lockout die

    // todo: create pickup method
    console.log("Create Pickup", userInput.selectedColor);

    // hook to listen to unlock out die when it's expended?
  }

  async _onSetSwing(event) {
    const colorArray = this.actor.getActiveColors();

    const userInput = await SetSwingBonusDialogue(colorArray);
    if (userInput.cancelled) {
      return;
    }

    this.actor.setSwing(userInput.selectedColor, parseInt(userInput.swing));
    const color = fromUuidSync(
      `Actor.${this.actor.id}.Item.${userInput.selectedColor}`
    );

    createChatRoll(
      `${this.actor.name} set their Swing to ${
        color.system.displayName ?? color.system.name
      } [${userInput.swing}]`
    );
    return;
  }

  async _onRollToDye(event) {
    const userInput = await GetDyeBonusDialogue(
      this.actor.system.globalDyeBonus
    );
    if (userInput.cancelled) {
      return;
    }

    const userBonusesRoll = await CreateRollFromUserString(
      userInput.bonuses,
      "0"
    );

    const { colors, total } = await this.actor.rollToDye(userBonusesRoll.total);
    let cardData = {
      colors,
      ownerID: this.actor.id,
      tokenID: this.actor.isToken ? this.actor.token.id : "", //needed for NPCs picking up swing
      bonuses: {
        roll: userBonusesRoll,
        string:
          userBonusesRoll.total >= 0
            ? `+${userBonusesRoll.total}`
            : `-${userBonusesRoll.total}`,
      },
      unlockedADie: colors.locks.length > 0 && this.actor.system.autoUnlock,
      total,
    };

    let chatContent = await renderTemplate(
      this.chatTemplate["rollToDye"],
      cardData
    );

    createChatRoll(chatContent, this.actor);
    return;
  }

  async _onRollToRecover(event) {
    const userInput = await GetRecoverBonusDialogue(
      this.actor.system.globalDyeBonus + 1
    );
    if (userInput.cancelled) {
      return;
    }

    const userBonusesRoll = await CreateRollFromUserString(
      userInput.bonuses,
      "1"
    );

    const { colors, total } = await this.actor.rollToDye(userBonusesRoll.total);
    let hpUpdateValue;

    if (this.actor.system.autoHealRecover) {
      hpUpdateValue =
        total > this.actor.system.health.value
          ? this.actor.system.health.max
          : total; // update rolled value or max hp, whichever is lower
      this.actor.update({ "system.health.value": hpUpdateValue });
    }

    let cardData = {
      colors,
      ownerID: this.actor.id,
      tokenID: this.actor.isToken ? this.actor.token.id : "", //needed for NPCs picking up swing
      bonuses: {
        roll: userBonusesRoll,
        string:
          userBonusesRoll.total >= 0
            ? `+${userBonusesRoll.total}`
            : `-${userBonusesRoll.total}`,
      },
      total,
      didUnlock: colors.locks.length > 0 && actor.system.autoUnlock,
      recover: {
        active: this.actor.system.autoHealRecover,
        value: hpUpdateValue,
      },
    };

    let chatContent = await renderTemplate(
      this.chatTemplate["rollToRecover"],
      cardData
    );

    createChatRoll(chatContent);
    return;
  }

  async _onRollToDo(event) {
    const swing = this.actor.getSwing();
    const userInput = await GetDoBonusDialogue(
      this.actor.getActiveColors(),
      this.actor.system.globalDoBonus +
        (swing
          ? (swing.system.globalBonus <= 0 ? "" : "+") +
            swing.system.globalBonus
          : "")
    );
    if (userInput.cancelled) {
      return;
    }

    const userBonusesRoll = await CreateRollFromUserString(
      userInput.bonuses,
      "0"
    );

    const {
      d20,
      swing: rollSwing,
      total,
    } = await this.actor.rollToDo(
      userInput.selectedColor,
      userBonusesRoll.total
    );

    let cardData = {
      swing: rollSwing,
      attributeBonusesPresent:
        !!!rollSwing.isSwing && rollSwing.attributeBonus != 0,
      d20Roll: d20,
      ownerId: this.actor.id,
      bonuses: {
        roll: userBonusesRoll,
        string:
          userBonusesRoll.total >= 0
            ? `+${userBonusesRoll.total}`
            : `-${userBonusesRoll.total}`,
      },
      total,
    };

    let chatContent = await renderTemplate(
      this.chatTemplate["rollToDo"],
      cardData
    );

    createChatRoll(chatContent);
    return;
  }

  /**
   * Spend xp on an attribute
   * @param {Event} event   The originating click event
   * @private
   */
  async _onSpendXp(event) {
    const element = event.currentTarget;
    const itemId = element.closest(".item").dataset.itemId;
    const item = this.actor.items.get(itemId);

    let currentXP = this.actor.system.attributes.experience.value;
    let neededXP = (item.system.value + 1) * 10;

    if (currentXP >= neededXP) {
      currentXP -= neededXP;
      item.update({ "system.value": item.system.value + 1 });
      this.actor.update({ "system.attributes.experience.value": currentXP });
    }
  }
  /**
   * Spend xp on an hp
   * @param {Event} event   The originating click event
   * @private
   */
  async _onSpendXpOnHP(event) {
    let currentXP = this.actor.system.attributes.experience.value;
    let neededXP = Math.floor(this.actor.system.health.max / 10) + 2;

    if (currentXP >= neededXP) {
      currentXP -= neededXP;
      this.actor.update({
        "system.attributes.experience.value": currentXP,
        "system.health.max": this.actor.system.health.max + 1,
        "system.health.value": this.actor.system.health.value + 1,
      });
    }
  }

  /**
   * spend xp to increase speed
   * currently this is just 5 exp per 5ft. of speed, but debating whether this should scale.
   */
  async _onSpendXpOnSpeed() {
    const SPEED_COST = 5;
    const SPEED_BOUGHT = 5;
    let currentXP = this.actor.system.attributes.experience.value;

    if (currentXP >= SPEED_COST) {
      this.actor.update({
        "system.attributes.experience.value": currentXP - SPEED_COST,
        "system.attributes.speed.value":
          this.actor.system.attributes.speed.value + SPEED_BOUGHT,
      });
    }
  }
  /**
   * Toggle the lock status on an item
   * @param {Event} event   The originating click event
   * @private
   */
  async _onToggleLock(event) {
    const element = event.currentTarget;
    //const dataset = element.dataset;

    const itemId = element.closest(".item").dataset.itemId;
    const item = this.actor.items.get(itemId);
    if (item) {
      item.system.locked = !item.system.locked;
      item.update({ "system.locked": item.system.locked });
      if (item.system.locked && item.system.isSwing) {
        item.update({ "system.isSwing": false, "system.swingValue": null });
        this.actor.update({
          "system.swing.id": null,
          "system.currentSwingName": null,
          "system.currentSwingValue": null,
          "system.currentSwingColor": null,
        });
      }
    }
    let message = "";
    if (item.system.locked) {
      message = "Locked out " + item.system.displayName;
    } else {
      message = "Unlocked " + item.system.displayName;
    }
    CreateAutomatedMessage(this.actor, message);
  }

  /**
   * Toggle the primary status of a gift
   * @param {Event} event   The originating click event
   * @private
   */
  async _onTogglePrimary(event) {
    const element = event.currentTarget;
    //const dataset = element.dataset;

    const itemId = element.closest(".item").dataset.itemId;
    const item = this.actor.items.get(itemId);
    if (item) {
      item.system.isPrimary = !item.system.isPrimary;
      if (item.system.isPrimary) {
        item.system.isEquipped = true;
      }
      item.update({
        "system.isEquipped": item.system.isEquipped,
        "system.isPrimary": item.system.isPrimary,
      });
    }
  }
  /**
   * Drop the actor's swing.
   * @param {Event} event   The originating click event
   * @private
   */
  async _onRemoveSwing(event) {
    const element = event.currentTarget;
    //const dataset = element.dataset;

    const itemId = element.closest(".item").dataset.itemId;
    const item = this.actor.items.get(itemId);
    if (item) {
      item.update({ "system.isSwing": false, "system.swingValue": null });
      this.actor.update({
        "system.swing.id": null,
        "system.currentSwingName": null,
        "system.currentSwingValue": null,
        "system.currentSwingColor": null,
      });
    }

    CreateAutomatedMessage(this.actor, "Swing dropped.");
  }
  /**
   * Toggle the equip status of a gift
   * @param {Event} event   The originating click event
   * @private
   */
  async _onToggleEquipped(event) {
    const element = event.currentTarget;
    //const dataset = element.dataset;

    const itemId = element.closest(".item").dataset.itemId;
    const item = this.actor.items.get(itemId);
    if (item) {
      item.system.isEquipped = !item.system.isEquipped;
      if (!item.system.isEquipped) {
        item.system.isPrimary = false;
      }
      item.update({
        "system.isEquipped": item.system.isEquipped,
        "system.isPrimary": item.system.isPrimary,
      });
    }
  }

  /**
   * Toggle the expand status of a gift or attribute
   * @param {Event} event   The originating click event
   * @private
   */
  async _onToggleExpand(event) {
    const element = event.currentTarget;

    const itemId = element.closest(".item").dataset.itemId;
    const item = this.actor.items.get(itemId);
    if (item) {
      item.system.expanded = !item.system.expanded;
      item.update({ "system.expanded": item.system.expanded });
    }
  }

  /**
   * Toggle the wound status of an attribute
   * @param {Event} event   The originating click event
   * @private
   */
  async _onToggleWound(event) {
    const element = event.currentTarget;

    const itemId = element.closest(".item").dataset.itemId;
    const item = this.actor.items.get(itemId);
    if (item) {
      item.system.wounded = !item.system.wounded;
      item.update({ "system.wounded": item.system.wounded });
      if (item.system.wounded && item.system.isSwing) {
        item.update({ "system.isSwing": false, "system.swingValue": null });
        this.actor.update({
          "system.swing.id": null,
          "system.currentSwingName": null,
          "system.currentSwingValue": null,
          "system.currentSwingColor": null,
        });
      }
    }
    let message = "";
    if (item.system.wounded) {
      message = "Wounded " + item.system.displayName;
    } else {
      message = "Healed " + item.system.displayName;
    }
    CreateAutomatedMessage(this.actor, message);
  }
  /**
   * Handle creating a new Owned Item for the actor using initial data defined in the HTML dataset
   * @param {Event} event   The originating click event
   * @private
   */
  async _onItemCreate(event) {
    event.preventDefault();
    const header = event.currentTarget;
    // Get the type of item to create.
    const type = header.dataset.type;
    // Grab any data associated with this control.
    const data = duplicate(header.dataset);
    // Initialize a default name.
    const name = `New ${type.capitalize()}`;
    // Prepare the item object.
    const itemData = {
      name: name,
      type: type,
      system: data,
    };
    // Remove the type from the dataset since it's in the itemData.type prop.
    delete itemData.system["type"];

    // Finally, create the item!
    return await Item.create(itemData, { parent: this.actor });
  }

  /**
   * Handle clickable rolls.
   * @param {Event} event   The originating click event
   * @private
   */
  _onRoll(event) {
    event.preventDefault();
    const element = event.currentTarget;
    const dataset = element.dataset;

    // Handle item rolls.
    if (dataset.rollType) {
      if (dataset.rollType == "item") {
        const itemId = element.closest(".item").dataset.itemId;
        const item = this.actor.items.get(itemId);
        if (item) return item.roll();
      }
    }
    if (dataset.rollType) {
      if (dataset.rollType == "gift") {
        const itemId = element.closest(".item").dataset.itemId;
        const item = this.actor.items.get(itemId);
        if (item) return item.roll();
      }
    }
    if (dataset.rollType) {
      if (dataset.rollType == "color") {
        const itemId = element.closest(".item").dataset.itemId;
        const item = this.actor.items.get(itemId);
        if (item) return item.roll();
      }
    }

    // Handle rolls that supply the formula directly.
    if (dataset.roll) {
      let label = dataset.label ? `[ability] ${dataset.label}` : "";
      let roll = new Roll(dataset.roll, this.actor.getRollData());
      roll.toMessage({
        speaker: ChatMessage.getSpeaker({ actor: this.actor }),
        flavor: label,
        rollMode: game.settings.get("core", "rollMode"),
      });
      return roll;
    }
  }
}

function _processGetDoBonusDialogue(form) {
  return {
    bonuses: form.bonuses.value,
    selectedColor:
      form.attribute.value === "wild" ? null : form.attribute.value,
  };
}
async function GetDoBonusDialogue(colorArray, defaultBonus) {
  const template = "systems/windrose/templates/chat/roll-to-do-dialogue.html";
  if (!defaultBonus) defaultBonus = "0";
  const html = await renderTemplate(template, {
    colors: colorArray,
    defaultBonus: defaultBonus,
  });

  return new Promise((resolve) => {
    const data = {
      title: "Roll to Do",
      content: html,
      buttons: {
        normal: {
          label: "Roll",
          callback: (html) =>
            resolve(_processGetDoBonusDialogue(html[0].querySelector("form"))),
        },
        cancel: {
          label: "Cancel",
          callback: (html) => resolve({ cancelled: true }),
        },
      },
      default: "normal",
      close: () => resolve({ cancelled: true }),
    };

    new Dialog(data, null).render(true);
  });
}
function _processGetDyeBonusDialogue(form) {
  return {
    bonuses: form.bonuses.value,
  };
}
async function GetDyeBonusDialogue(defaultBonus) {
  const template = "systems/windrose/templates/chat/roll-to-dye-dialogue.html";
  if (!defaultBonus) defaultBonus = "0";
  const html = await renderTemplate(template, { defaultBonus: defaultBonus });

  return new Promise((resolve) => {
    const data = {
      title: "Roll to Dye",
      content: html,
      buttons: {
        normal: {
          label: "Roll",
          callback: (html) =>
            resolve(_processGetDyeBonusDialogue(html[0].querySelector("form"))),
        },
        cancel: {
          label: "Cancel",
          callback: (html) => resolve({ cancelled: true }),
        },
      },
      default: "normal",
      close: () => resolve({ cancelled: true }),
    };

    new Dialog(data, null).render(true);
  });
}

function _processGetRecoverBonusDialogue(form) {
  return {
    bonuses: form.bonuses.value,
  };
}

async function GetRecoverBonusDialogue(defaultBonus) {
  const template =
    "systems/windrose/templates/chat/roll-to-recover-dialogue.html";
  if (!defaultBonus) defaultBonus = "0";
  const html = await renderTemplate(template, { defaultBonus: defaultBonus });

  return new Promise((resolve) => {
    const data = {
      title: "Roll to Recover",
      content: html,
      buttons: {
        normal: {
          label: "Roll",
          callback: (html) =>
            resolve(
              _processGetRecoverBonusDialogue(html[0].querySelector("form"))
            ),
        },
        cancel: {
          label: "Cancel",
          callback: (html) => resolve({ cancelled: true }),
        },
      },
      default: "normal",
      close: () => resolve({ cancelled: true }),
    };

    new Dialog(data, null).render(true);
  });
}
function _processSetSwingDialogue(form) {
  return {
    swing: form.bonuses.value,
    selectedColor: form.attribute.value,
  };
}

function _processSupportActionDialogue(form) {
  return {
    selectedColor: form.attribute.value,
  };
}

async function SetSwingBonusDialogue(colorArray) {
  const template = "systems/windrose/templates/chat/set-swing-dialogue.html";
  const html = await renderTemplate(template, { colors: colorArray });

  return new Promise((resolve) => {
    const data = {
      title: "Set Swing",
      content: html,
      buttons: {
        normal: {
          label: "Set",
          callback: (html) =>
            resolve(_processSetSwingDialogue(html[0].querySelector("form"))),
        },
        cancel: {
          label: "Cancel",
          callback: (html) => resolve({ cancelled: true }),
        },
      },
      default: "normal",
      close: () => resolve({ cancelled: true }),
    };

    new Dialog(data, null).render(true);
  });
}

async function SupportActionDialogue(colorArray) {
  const template =
    "systems/windrose/templates/chat/support-action-dialogue.html";
  const html = await renderTemplate(template, { colors: colorArray });

  return new Promise((resolve) => {
    const data = {
      title: "Set Swing",
      content: html,
      buttons: {
        normal: {
          label: "Place",
          callback: (html) =>
            resolve(
              _processSupportActionDialogue(html[0].querySelector("form"))
            ),
        },
        cancel: {
          label: "Cancel",
          callback: (html) => resolve({ cancelled: true }),
        },
      },
      default: "normal",
      close: () => resolve({ cancelled: true }),
    };

    new Dialog(data, null).render(true);
  });
}

async function CreateConfirmationDialogue() {
  const template = "systems/windrose/templates/chat/confirmation-dialogue.html";
  const html = await renderTemplate(template, {});

  return new Promise((resolve) => {
    const data = {
      title: "Delete",
      content: html,
      buttons: {
        normal: {
          label: "Confirm",
          callback: (html) => resolve({ cancelled: false }),
        },
        cancel: {
          label: "Cancel",
          callback: (html) => resolve({ cancelled: true }),
        },
      },
      default: "normal",
      close: () => resolve({ cancelled: true }),
    };

    new Dialog(data, null).render(true);
  });
}
//Removes all rolls with no result values. Dice so nice fails if it's passed a roll with no dice results.
function cleanseDice(rollArray) {
  var diceSoNiceArray = [];
  rollArray.forEach((roll) => {
    let shouldAdd = false;
    roll.dice.forEach((dice) => {
      if (dice.results) {
        shouldAdd = true;
      }
    });
    if (shouldAdd) {
      diceSoNiceArray.push(roll);
    }
  });
  return diceSoNiceArray;
}

function CreateAutomatedMessage(actor, message) {
  if (!actor.system.automatedMessaging) return;
  ChatMessage.create({
    user: game.user._id,
    speaker: ChatMessage.getSpeaker(),
    content: message,
    type: CONST.CHAT_MESSAGE_TYPES.ROLL,
    rollMode: game.settings.get("core", "rollMode"),
  });
}
