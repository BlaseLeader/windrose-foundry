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
  let selectedColor = actor.items.get(card.dataset.itemId);
  let total = card.dataset.rolltotal;
  let rollVal = card.dataset.rollval;
  let swingID;

  //check for a swing and remove it, then set new swing.
  for (const element of actor.items) {
    if (element.type == "color") {
      if (element.system.isSwing) {
        swingID = element.id;
        element.update({ "system.isSwing": false });
      }
    }
  }

  //foundry cannot update the same thing twice in quick succession, has strangeness occur, I suspect due to database locking?
  //so this has to done like this, yuck
  if (swingID && selectedColor.id == swingID) {
    // if swing clicked matches existing swing, clear swing
    actor.update({
      "system.currentSwingColor": null,
      "system.currentSwingValue": null,
      "system.currentSwingName": "none",
    });
    ChatMessage.create({
      user: game.user._id,
      content: "Swing dropped.",
      speaker: ChatMessage.getSpeaker(),
    });
    return;
  } else {
    let obj = {};

    selectedColor.update({
      "system.isSwing": true,
      "system.swingValue": rollVal,
    });
    if (selectedColor.system.internalName) {
      if (actor.system.currentSwingColor !== selectedColor.system.hexColor) {
        obj["system.currentSwingColor"] = selectedColor.system.hexColor;
      }
      if (actor.system.currentSwingValue !== rollVal) {
        obj["system.currentSwingValue"] = rollVal;
      }
      if (actor.system.currentSwingName !== selectedColor.system.internalName) {
        obj["system.currentSwingName"] = selectedColor.system.internalName;
      }
    } else {
      if (actor.system.currentSwingColor !== selectedColor.system.hexColor) {
        obj["system.currentSwingColor"] = selectedColor.system.hexColor;
      }
      if (actor.system.currentSwingValue !== rollVal) {
        obj["system.currentSwingValue"] = rollVal;
      }
      if (actor.system.currentSwingName !== selectedColor.name) {
        obj["system.currentSwingName"] = selectedColor.name;
      }
    }
    actor.update(obj);
  }

  let chatContent = "I locked in to " + selectedColor.system.displayName;
  if (card.dataset.isrecover) {
    chatContent += "!";
  } else {
    chatContent += " [+" + parseInt(selectedColor.system.value) + "]!";
  }
  ChatMessage.create({
    user: game.user._id,
    content: chatContent,
    speaker: ChatMessage.getSpeaker(),
  });
}
