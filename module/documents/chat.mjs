import { createChatRoll } from "../helpers/rolls.mjs";

export function addChatListeners(html) {
  html.on("click", ".btn-selectSwing", onSelectSwing);
}

async function onSelectSwing(event) {
  // let total = card.dataset.rolltotal;

  // let swingID;

  // //check for a swing and remove it, then set new swing.
  // for (const element of actor.items) {
  //   if (element.type == "color") {
  //     if (element.system.isSwing) {
  //       swingID = element.id;
  //      await element.update({ "system.isSwing": false });
  //     }
  //   }
  // }

  // if (swingID && selectedColor.id == swingID) {
  //   await actor.update({
  //     "system.currentSwingColor": null,
  //     "system.currentSwingValue": null,
  //     "system.currentSwingName": null,
  //   });
  //   ChatMessage.create({
  //     user: game.user._id,
  //     content: "Swing dropped.",
  //     speaker: ChatMessage.getSpeaker(),
  //     type: CONST.CHAT_MESSAGE_TYPES.ROLL,
  //     rollMode: game.settings.get("core", "rollMode"),
  //   });
  //   return;
  // } else {
  //   let obj = {};

  //   await selectedColor.update({
  //     "system.isSwing": true,
  //     "system.swingValue": rollVal,
  //   });
  //   if (selectedColor.system.internalName) {
  //     if (actor.system.currentSwingColor !== selectedColor.system.hexColor) {
  //       obj["system.currentSwingColor"] = selectedColor.system.hexColor;
  //     }
  //     if (actor.system.currentSwingValue !== rollVal) {
  //       obj["system.currentSwingValue"] = rollVal;
  //     }
  //     if (actor.system.currentSwingName !== selectedColor.system.internalName) {
  //       obj["system.currentSwingName"] = selectedColor.system.internalName;
  //     }
  //   } else {
  //     if (actor.system.currentSwingColor !== selectedColor.system.hexColor) {
  //       obj["system.currentSwingColor"] = selectedColor.system.hexColor;
  //     }
  //     if (actor.system.currentSwingValue !== rollVal) {
  //       obj["system.currentSwingValue"] = rollVal;
  //     }
  //     if (actor.system.currentSwingName !== selectedColor.name) {
  //       obj["system.currentSwingName"] = selectedColor.name;
  //     }
  //   }
  //   await actor.update(obj);
  // }
  let actor;
  if (event.currentTarget.dataset.tokenId != "") {
    // gets an instanced actor via token, for npcs
    actor = canvas.tokens.get(event.currentTarget.dataset.tokenId).actor;
  } else {
    // gets the actor document via id
    actor = game.actors.get(event.currentTarget.dataset.ownerId);
  }

  const selectedColor = actor.items.get(event.currentTarget.dataset.itemId);

  if (actor.system.swing.id && selectedColor.id == actor.system.swing.id) {
    await actor.dropSwing()
    createChatRoll("Swing dropped.");
    return;
  }

  // if character has Aura and Aura remaining, increase Swing by 1
  const swingValue =
    actor.system.autoAuraSwing &&
    actor.system.aura &&
    actor.system.aura.value > 0
      ? parseInt(event.currentTarget.dataset.rollval) + 1
      : parseInt(event.currentTarget.dataset.rollval);

  await actor.setSwing(event.currentTarget.dataset.itemId, swingValue);

  let chatContent = "I locked in to " + selectedColor.system.displayName;
  if (event.currentTarget.dataset.isrecover) {
    chatContent += "!";
  } else {
    chatContent += " [+" + parseInt(selectedColor.system.value) + "]!";
  }
  createChatRoll(chatContent);
}
