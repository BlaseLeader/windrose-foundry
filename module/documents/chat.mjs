export function addChatListeners(html) {
  html.on("click", ".btn-selectSwing", onSelectSwing);
}

function onSelectSwing(event) {
  const card = event.currentTarget;
  let actor;
  if (card.dataset.tokenId != "") {
    //This gets an instanced actor via token. (for npcs)
    actor = canvas.tokens.get(card.dataset.tokenId).actor;
  } else {
    //This get the actor document via id.
    actor = game.actors.get(card.dataset.ownerId);
  }
  let color = actor.items.get(card.dataset.itemId);
  let total = card.dataset.rolltotal;
  let rollVal = card.dataset.rollval;

  //check for a swing and remove it, then set new swing.
  for (const element of actor.items) {
    if (element.type == "color") {
      if (element.system.isSwing) {
        element.update({ "system.isSwing": false });
      }
    }
  }

  console.log();
  color.update({ "system.isSwing": true, "system.swingValue": rollVal });

  console.log("chat old vals", actor.system.currentSwingColor, actor.system.currentSwingValue, actor.system.currentSwingName)
  console.log("chat new vals", color.system.hexColor, rollVal, color.system.internalName || color.name);
  let obj = {};

  // actor.update produces some strange results if you change it with values matching what it already had (maybe intended and im dumb)
  // either way this gets around that
  if (color.system.internalName) {
    if (actor.system.currentSwingColor !== color.system.hexColor) {
      obj["system.currentSwingColor"] = color.system.hexColor;
    }
    if (actor.system.currentSwingValue !== rollVal) {
      obj["system.currentSwingValue"] = rollVal;
    }
    if (actor.system.currentSwingName !== color.system.internalName) {
      obj["system.currentSwingName"] = color.system.internalName;
    }

    console.log(obj)
    actor.update(obj);
  } else {
    if (actor.system.currentSwingColor !== color.system.hexColor) {
      obj["system.currentSwingColor"] = color.system.hexColor;
    }
    if (actor.system.currentSwingValue !== rollVal) {
      obj["system.currentSwingValue"] = rollVal;
    }
    if (actor.system.currentSwingName !== color.name) {
      obj["system.currentSwingName"] = color.name;
    }

    console.log(obj)
    actor.update(obj);
  }

  console.log(actor);
  let chatContent = "Locked in to " + color.system.displayName;
  if (card.dataset.isrecover) {
    chatContent += ".";
  } else {
    chatContent += " [+" + parseInt(color.system.value) + "].";
  }
  ChatMessage.create({
    user: game.user._id,
    content: chatContent,
    speaker: ChatMessage.getSpeaker(),
  });
}
