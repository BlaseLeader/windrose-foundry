import {
  onManageActiveEffect,
  prepareActiveEffectCategories,
} from "../helpers/effects.mjs";

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
    }

    // Prepare NPC data and items.
    if (actorData.type == "npc") {
      this._prepareItems(context);
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
    // html.find('.item-igniteButton').click(this._onIgnite.bind(this));
    html.find(".item-testRollButton").click(this._onRollToDyeTest.bind(this));

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

  // Igniting Function
  // async _onIgnite(event) {
  //   let actor = this.actor;
  //   let color;

  //   //Get Locked Color
  //   for (const element of actor.items) {
  //     if(element.type==="color")
  //     {
  //       if(element.system.isSwing)
  //       {
  //         color = element;
  //         element.update({'system.isSwing':false, 'system.locked':true});
  //         actor.update({'system.currentSwingName':"none"});
  //       }
  //     }
  //   };

  //   let message = "";
  //   if(color)
  //   {
  //     message = "Ignited " + color.system.displayName +". It is now locked out.";
  //   }
  //   else
  //   {
  //     message = "Cannot ignite. Not locked in to a color";
  //   }

  //   ChatMessage.create({
  //     user: game.user._id,
  //     speaker: ChatMessage.getSpeaker(),
  //     content: message
  //     }
  //   );
  // }

  async _onSetSwing(event) {
    let actor = this.actor;
    let colorArray = [];

    //Get Color Array
    for (const element of actor.items) {
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

    //Dialogue Options
    let userInput = await SetSwingBonusDialogue(colorArray);
    if (userInput.cancelled) {
      return;
    }
    let swing = userInput.swing;
    let selectedColorID = userInput.selectedColor;

    let color = actor.items.get(selectedColorID);
    // console.log("initial color", color)
    let colorName = "";
    if (color) {
      colorArray.forEach((element) => {
        if (element.system.isSwing && element.id != color.id) {
          element.update({ "system.isSwing": false });
        }
      });
      color.update({ "system.isSwing": true, "system.swingValue": swing });
      if (color.system.internalName != "") {
        actor.update({ "system.currentSwingName": color.system.internalName });
      } else {
        actor.update({ "system.currentSwingName": color.name });
      }
      colorName = color.name;
      // console.log("end color", color)
      // issue is that displayName is never set
    } else {
      system.log("Error: Color not found");
      return;
    }

    ChatMessage.create({
      user: game.user._id,
      speaker: ChatMessage.getSpeaker(),
      content: `${actor.name} set their Swing to ${colorName} [${swing}]`,
    });
    return;
  }

  async _onRollToDyeTest(event) {
    // show dialogue to user, and end here if they cancel
    const userInput = await GetDyeBonusDialogue(
      this.actor.system.globalDyeBonus
    );
    if (userInput.cancelled) {
      return;
    }

    console.log(userInput);
    console.log(event);
    console.log(this.actor);
  }

  async _onRollToDye(event) {
    let actor = this.actor;
    let colorArray = [];
    let colorWoundArray = [];
    let colorLockArray = [];
    let colorRollArray = [];
    let total = 0;
    let attVal = 0;
    let attColor = "";

    //Dialogue Options
    const userInput = await GetDyeBonusDialogue(actor.system.globalDyeBonus);
    if (userInput.cancelled) {
      return;
    }

    var formulaRoll;
    formulaRoll = await CreateRollFromUserString(userInput.bonuses, "0");
    total += formulaRoll.total;
    colorRollArray.push(formulaRoll);

    //One dice for every color
    for (const element of actor.items) {
      if (element.type === "color") {
        if (element.system.disabled) {
        } else if (element.system.wounded) {
          colorWoundArray.push(element);
        } else if (element.system.locked) {
          colorLockArray.push(element);

          //Unlock dice that get rolled as locked.
          if (actor.system.autoUnlock) {
            let item = this.actor.items.get(element._id);
            item.update({ "system.locked": false });
          }
        } else {
          let obj = {};
          obj.colorItem = element;
          var roll;
          if (element.system.isSwing) {
            roll = await CreateRollFromUserString(
              element.system.swingValue,
              "0"
            );
            // total+=parseInt(element.system.value);
            attVal = parseInt(element.system.value);
            attColor = element.system.hexColor;
          } else {
            roll = await CreateRollFromUserString(
              element.system.diceSize + "+" + element.system.value,
              "1d6"
            );
          }
          obj.roll = roll;
          total += roll.total;
          colorArray.push(obj);
          colorRollArray.push(roll);
        }
      }
    }
    var formulaString = "";
    if (formulaRoll.total >= 0) {
      formulaString = "+" + formulaRoll.total;
    } else {
      formulaString = "-" + formulaRoll.total;
    }

    //For npcs which can have multiple sheets, if this is a token sheet grab the token id so we can use that instead of actor id.
    let tokenId = "";
    if (actor.isToken) {
      tokenId = actor.token.id;
    }

    let ownerID = actor.id;
    // let finalTotalNoAtt = total-attVal; No longer needed
    let cardData = {
      colorArray: colorArray,
      colorWoundArray: colorWoundArray,
      colorLockArray: colorLockArray,
      ownerId: ownerID,
      tokenId: tokenId,
      attVal: attVal,
      formulaRoll: formulaRoll,
      formulaString: formulaString,
      attColor: attColor,
      finalTotal: total,
      unlockedADie: colorLockArray.length > 0 && actor.system.autoUnlock,
    };
    let chatContent = await renderTemplate(
      this.chatTemplate["rollToDye"],
      cardData
    );

    colorRollArray = cleanseDice(colorRollArray);

    ChatMessage.create({
      user: game.user._id,
      speaker: ChatMessage.getSpeaker(),
      content: chatContent,
      rolls: colorRollArray, //passing this for dice so nice.
      sound: CONFIG.sounds.dice,
      type: CONST.CHAT_MESSAGE_TYPES.ROLL,
    });
    return;
  }

  async _onRollToRecover(event) {
    let actor = this.actor;
    let colorArray = [];
    let colorWoundArray = [];
    let colorLockArray = [];
    let colorRollArray = [];
    let total = 0;
    let attVal = 0;
    let attColor = "";

    //Dialogue Options
    let userInput = await GetRecoverBonusDialogue(
      actor.system.globalRecoverBonus
    );
    if (userInput.cancelled) {
      return;
    }
    let bonuses = userInput.bonuses + 1;

    var formulaRoll;
    formulaRoll = await CreateRollFromUserString(bonuses, "0");
    total += formulaRoll.total;
    colorRollArray.push(formulaRoll);

    //One dice for every color
    for (const element of actor.items) {
      if (element.type === "color") {
        if (element.system.disabled) {
          // if disabled, do nothing
        } else if (element.system.wounded) {
          // if wounded, add to array and otherwise do nothing
          colorWoundArray.push(element);
        } else {
          // otherwise, unlock locked dice
          if (element.system.locked) {
            //add to the lock array to render in the chat as locked

            colorLockArray.push(element);

            //Unlock dice that get rolled as locked.
            if (actor.system.autoUnlock) {
              let item = this.actor.items.get(element._id);
              item.update({ "system.locked": false });
            }
            continue; // skip rolling
          }

          let obj = {};
          obj.colorItem = element;
          // total += parseInt(element.system.value); instead add attVal to the roll and add the roll
          attVal += parseInt(element.system.value);
          var roll = await CreateRollFromUserString(
            element.system.diceSize + "+" + element.system.value,
            "1d6"
          );
          obj.roll = roll;
          total += roll.total;
          colorArray.push(obj);
          colorRollArray.push(roll);
        }
      }
      console.log(element);
    }

    var formulaString = "";
    if (formulaRoll.total >= 0) {
      formulaString = "+" + formulaRoll.total;
    } else {
      formulaString = "-" + formulaRoll.total;
    }

    let tokenId = "";
    if (actor.isToken) {
      tokenId = actor.token.id;
    }

    let ownerID = this.actor.id;
    let cardData = {
      colorArray: colorArray,
      colorWoundArray: colorWoundArray,
      ownerId: ownerID,
      tokenId: tokenId,
      formulaRoll: formulaRoll,
      formulaString: formulaString,
      // attVal: attVal,
      attColor: attColor,
      finalTotal: total,
      // add lock and didUnlock to template
      colorLockArray,
      didUnlock: colorLockArray.length > 0 && actor.system.autoUnlock,
    };

    let chatContent = await renderTemplate(
      this.chatTemplate["rollToRecover"],
      cardData
    );

    colorRollArray = cleanseDice(colorRollArray);

    ChatMessage.create({
      user: game.user._id,
      speaker: ChatMessage.getSpeaker(),
      content: chatContent,
      rolls: colorRollArray, //passing this for dice so nice.
      sound: CONFIG.sounds.dice,
      type: CONST.CHAT_MESSAGE_TYPES.ROLL,
    });

    // update HP on a recover roll if flag set to do so
    if (actor.system.autoHealRecover) {
      let hpUpdateValue =
        total > actor.system.health.value ? actor.system.health.max : total; // update rolled value or max hp, whichever is lower
      actor.update({ "system.health.value": hpUpdateValue });
      ChatMessage.create({
        user: game.user._id,
        speaker: ChatMessage.getSpeaker(),
        content: "Set my HP to " + hpUpdateValue + "!",
      });
    }

    return;
  }

  async _onRollToDo(event) {
    let actor = this.actor;
    let colorRoll;
    let total = 0;
    let attVal = 0;
    let attColor = "";
    let rollArray = [];
    let colorArray = [];
    //Get Color Array
    let colorDefaultBonus = "";
    for (const element of actor.items) {
      if (element.type === "color") {
        if (!(element.system.disabled || element.system.wounded)) {
          colorArray.push(element);
          if (element.system.isSwing) {
            colorDefaultBonus = element.system.globalBonus;
          }
        }
      }
    }
    if (colorDefaultBonus == "0") colorDefaultBonus = "";
    if (
      colorDefaultBonus &&
      actor.system.globalDoBonus &&
      actor.system.globalDoBonus != "0" &&
      actor.system.globalDoBonus.charAt(0) != "-"
    )
      colorDefaultBonus += "+";
    if (actor.system.globalDoBonus && actor.system.globalDoBonus != "0")
      colorDefaultBonus += actor.system.globalDoBonus;
    //Dialogue Options
    let userInput = await GetDoBonusDialogue(colorArray, colorDefaultBonus);
    if (userInput.cancelled) {
      return;
    }
    let bonuses = userInput.bonuses;
    let selectedColorID = userInput.selectedColor;

    var formulaRoll;
    formulaRoll = await CreateRollFromUserString(bonuses, "0");
    total += formulaRoll.total;
    rollArray.push(formulaRoll);

    //Get color info
    let color;
    if (selectedColorID == "wild") {
      //Roll wild option
      colorRoll = await new Roll("1d6").roll({ async: true });

      //create a fake color for the chat message
      color = {};
      color.system = {};
      color.system.isSwing = false;
      color.system.displayName = "Wild";
      attColor = "#d3d3d3";
    } else {
      color = actor.items.get(selectedColorID);
      //If this is the swing, set the swing die.
      if (color.system.isSwing) {
        colorRoll = await CreateRollFromUserString(
          color.system.swingValue,
          "0"
        );
      } else {
        //Not the swing so we roll the color's die instead
        colorRoll = await CreateRollFromUserString(
          color.system.diceSize,
          "1d6"
        );
      }
      total += parseInt(color.system.value);
      attVal = parseInt(color.system.value);
      attColor = color.system.hexColor;
    }
    rollArray.push(colorRoll);

    var d20Roll = await new Roll("1d20").roll({ async: true });

    total += colorRoll.total + d20Roll.total;
    rollArray.push(d20Roll);

    let ownerID = this.actor.id;

    var formulaString = "";
    if (formulaRoll.total >= 0) {
      formulaString = "+" + formulaRoll.total;
    } else {
      formulaString = "-" + formulaRoll.total;
    }

    let cardData = {
      color: color,
      colorRoll: colorRoll,
      d20Roll: d20Roll,
      ownerId: ownerID,
      attVal: attVal,
      formulaRoll: formulaRoll,
      formulaString: formulaString,
      attColor: attColor,
      finalTotal: total,
    };
    let chatContent = await renderTemplate(
      this.chatTemplate["rollToDo"],
      cardData
    );

    //Dice so nice cleanser
    rollArray = cleanseDice(rollArray);

    ChatMessage.create({
      user: game.user._id,
      speaker: ChatMessage.getSpeaker(),
      content: chatContent,
      rolls: rollArray, //passing this for dice so nice.
      sound: CONFIG.sounds.dice,
      type: CONST.CHAT_MESSAGE_TYPES.ROLL,
    });
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
   * currently this is just 10 exp per 10ft. of speed, but debating whether this should scale.
   */
  async _onSpendXpOnSpeed(event) {
    let currentXP = this.actor.system.attributes.experience.value;

    console.log(this.actor);

    if (currentXP >= 10) {
      this.actor.update({
        "system.attributes.experience.value": currentXP - 10,
        "system.attributes.speed.value": this.actor.system.attributes.speed.value + 10,
      });

      console.log(this.actor);
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
        item.update({ "system.isSwing": false });
        this.actor.update({ "system.currentSwingName": "none" });
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
      item.update({ "system.isSwing": false });
      this.actor.update({ "system.currentSwingName": "none" });
    }

    CreateAutomatedMessage(this.actor, "Swing Dropped");
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
        item.update({ "system.isSwing": false });
        this.actor.update({ "system.currentSwingName": "none" });
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
    selectedColor: form.attribute.value,
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
//User can give us bad roll data so we return either the roll or a fake roll for a bad string
async function CreateRollFromUserString(userDiceString, defaultDiceString) {
  let roll;
  try {
    roll = await new Roll(userDiceString).roll({ async: true });
  } catch {
    console.log("Bad value of " + roll + " was ignored");

    //If we are given a default, roll that instead (for empty strings from migrations)
    if (!!defaultDiceString) {
      userDiceString = defaultDiceString;
    } else {
      userDiceString = "0";
    }
    roll = await new Roll(userDiceString).roll({ async: true });
  }
  return roll;
}
function CreateAutomatedMessage(actor, message) {
  if (!actor.system.automatedMessaging) return;
  ChatMessage.create({
    user: game.user._id,
    speaker: ChatMessage.getSpeaker(),
    content: message,
  });
}
