// Import document classes.
import { WindroseActor } from "./documents/actor.mjs";
import { WindroseItem } from "./documents/item.mjs";
// Import sheet classes.
import { WindroseActorSheet } from "./sheets/actor-sheet.mjs";
import { WindroseItemSheet } from "./sheets/item-sheet.mjs";
// Import helper/utility classes and constants.
import { preloadHandlebarsTemplates } from "./helpers/templates.mjs";
import { BOILERPLATE } from "./helpers/config.mjs";
import * as Swing from "./helpers/swing.mjs";

// import { Application, Assets, Sprite } from "pixi.js";

import * as Chat from "./documents/chat.mjs";

/* -------------------------------------------- */
/*  Init Hook                                   */
/* -------------------------------------------- */

Hooks.once("init", async function () {
  // Add utility classes to the global game object so that they're more easily
  // accessible in global contexts.
  game.windrose = {
    WindroseActor,
    WindroseItem,
    rollItemMacro,
  };

  // Add custom constants for configuration.
  CONFIG.BOILERPLATE = BOILERPLATE;

  /**
   * Set an initiative formula for the system
   * @type {String}
   */
  CONFIG.Combat.initiative = {
    formula: "1d20",
    decimals: 2,
  };

  // Define custom Document classes
  CONFIG.Actor.documentClass = WindroseActor;
  CONFIG.Item.documentClass = WindroseItem;

  // Register sheet application classes
  Actors.unregisterSheet("core", ActorSheet);
  Actors.registerSheet("windrose", WindroseActorSheet, { makeDefault: true });
  Items.unregisterSheet("core", ItemSheet);
  Items.registerSheet("windrose", WindroseItemSheet, { makeDefault: true });

  // Preload Handlebars templates.
  return preloadHandlebarsTemplates();
});

Hooks.on("renderChatLog", (app, html, data) => Chat.addChatListeners(html));

/* -------------------------------------------- */
/*  Handlebars Helpers                          */
/* -------------------------------------------- */

// If you need to add Handlebars helpers, here are a few useful examples:
Handlebars.registerHelper("concat", function () {
  var outStr = "";
  for (var arg in arguments) {
    if (typeof arguments[arg] != "object") {
      outStr += arguments[arg];
    }
  }
  return outStr;
});

Handlebars.registerHelper("toLowerCase", function (str) {
  return str.toLowerCase();
});

/* -------------------------------------------- */
/*  Ready Hook                                  */
/* -------------------------------------------- */

Hooks.once("ready", async function () {
  // Wait to register hotbar drop hook on ready so that modules could register earlier if they want to
  Hooks.on("hotbarDrop", (bar, data, slot) => createItemMacro(data, slot));
});

/* -------------------------------------------- */
/*  Hotbar Macros                               */
/* -------------------------------------------- */

/**
 * Create a Macro from an Item drop.
 * Get an existing item macro if one exists, otherwise create a new one.
 * @param {Object} data     The dropped data
 * @param {number} slot     The hotbar slot to use
 * @returns {Promise}
 */
async function createItemMacro(data, slot) {
  // First, determine if this is a valid owned item.
  if (data.type !== "Item") return;
  if (!data.uuid.includes("Actor.") && !data.uuid.includes("Token.")) {
    return ui.notifications.warn(
      "You can only create macro buttons for owned Items"
    );
  }
  // If it is, retrieve it based on the uuid.
  const item = await Item.fromDropData(data);

  // Create the macro command using the uuid.
  const command = `game.windrose.rollItemMacro("${data.uuid}");`;
  let macro = game.macros.find(
    (m) => m.name === item.name && m.command === command
  );
  if (!macro) {
    macro = await Macro.create({
      name: item.name,
      type: "script",
      img: item.img,
      command: command,
      flags: { "windrose.itemMacro": true },
    });
  }
  game.user.assignHotbarMacro(macro, slot);
  return false;
}

/**
 * Create a Macro from an Item drop.
 * Get an existing item macro if one exists, otherwise create a new one.
 * @param {string} itemUuid
 */
function rollItemMacro(itemUuid) {
  // Reconstruct the drop data so that we can load the item.
  const dropData = {
    type: "Item",
    uuid: itemUuid,
  };
  // Load the item from the uuid.
  Item.fromDropData(dropData).then((item) => {
    // Determine if the item loaded and if it's an owned item.
    if (!item || !item.parent) {
      const itemName = item?.name ?? itemUuid;
      return ui.notifications.warn(
        `Could not find item ${itemName}. You may need to delete and recreate this macro.`
      );
    }

    // Trigger the item roll
    item.roll();
  });
}

//
Hooks.on("hoverToken", async (object, controlled) => {
  if (controlled) {
    // on hover
    var swingValue = object.layer.getChildByName(object.id);
    swingValue.visible = true;
  } else {
    // on de-hover
    var swingValue = object.layer.getChildByName(object.id);
    swingValue.visible = false;
  }
});

// also need to figure out how to do this for already placed tokens (do on init?)
Hooks.on("createToken", async (doc, options, userId) => {
  const textElement = new PIXI.Text();
  var swing = doc.actor.getSwing();
  if (swing) {
    Swing.setColoredSwing(
      doc,
      swing.system.swingValue,
      swing.system.hexColor,
      textElement
    );
  } else {
    Swing.setColorless(doc, textElement);
  }
});

Hooks.on("canvasReady", async (canvas) => {
  await PIXI.Assets.load("https://pixijs.com/assets/bitmap-font/desyrel.xml");

  //loop through all tokens on canvas to update swings
  canvas.tokens.objects.children.forEach((token) => {
    let textElement = new PIXI.Text();
    let swing = token.actor.getSwing();

    //if character has an active swing, show it
    if (swing) {
      Swing.setColoredSwing(
        token.document,
        swing.system.swingValue,
        swing.system.hexColor,
        textElement
      );
    } else {
      Swing.setColorless(token.document, textElement);
    }
  });
});

Hooks.on("updateActor", async (doc, change) => {
  //get all tokens associated with the actor
  const tokens = doc.getActiveTokens();

  if (change.system.currentSwingValue === undefined && change.system.currentSwingColor === undefined)
  {
    return;
  }

  //loop through them and get their aura and swing, then assign them as appropriate
  for (let token of tokens) {
    var textElement = token.layer.getChildByName(token.id);
    if (change.system.currentSwingValue || change.system.currentSwingColor) {
      const swingVal = change.system.currentSwingValue
        ? change.system.currentSwingValue
        : doc.system.currentSwingValue;
      const swingColor = change.system.currentSwingColor
        ? change.system.currentSwingColor
        : doc.system.currentSwingColor;
      Swing.setColoredSwing(token.document, swingVal, swingColor, textElement);
    } else {
      Swing.setColorless(token.document, textElement);
    }
    // }
  };
});

Hooks.on("updateToken", async (doc, updatedValues) => {
  var swingVal = doc.layer.getChildByName(doc.id);
  if (updatedValues.width || updatedValues.height) {
    Swing.setColoredSwing(
      doc,
      doc.actor.system.currentSwingValue,
      doc.actor.system.currentSwingColor,
      swingVal
    );
  }
  swingVal.x = updatedValues.x ? updatedValues.x : doc.x;
  swingVal.y = updatedValues.y ? updatedValues.y : doc.y;
});

Hooks.on("deleteToken", async (doc) => {
  //cleanup
  doc.layer.getChildByName(doc.id).destroy();
});

// pulse roll
Hooks.on("updateCombat", async (doc, changes) => {
  if (changes.round) {

    for (let combatant of doc.combatants)
    {
      await Swing.DropSwing(combatant.actor)
    }

    doc.combatants.forEach((combatant) => {
      if (combatant.token.disposition === 1) {
        combatant.actor.sheet._onRollToDye(null, null, true);
      } else {
        combatant.actor.sheet._onRollToDye(null, "gmroll", true);
      }
    });
  }
});
