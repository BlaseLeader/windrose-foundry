export function setColoredSwing(tokenDoc, swingVal, swingColor, textElement) {
  this.createSwingValue(tokenDoc, swingVal, swingColor, textElement);

  this.createSwingAura(tokenDoc, swingColor);
}

export function createSwingAura(tokenDoc, swingColor) {
  //set aura
  const newAura = Auras.newAura();
  newAura.colour = swingColor;
  newAura.square = true;
  newAura.opacity = 0.5;
  newAura.permission = "all";
  // auras.push(newAura);
  newAura.distance = 0.5;
  tokenDoc.setFlag("token-auras", "aura1", newAura);
}

export function createSwingValue(tokenDoc, swingVal, swingColor, textElement) {
  textElement.name = tokenDoc.id;
  textElement.text = swingVal;
  textElement.x = tokenDoc.x;
  textElement.y = tokenDoc.y;
  textElement.visible = false;
  textElement.alpha = 0.5;
  textElement.isMask = true;

  textElement.style.fontFamily = "Arial Black";
  textElement.style.fontSize = 500;
  textElement.style.fill = swingColor;

  textElement.width = tokenDoc.object.w;
  textElement.height = tokenDoc.object.h;
  textElement.resolution = 2;

  tokenDoc.layer.addChild(textElement);
}

export function setColorless(tokenDoc, textElement) {
  this.hideSwingValue(tokenDoc, textElement);

  this.hideSwingAura(tokenDoc);
}

export function hideSwingValue(tokenDoc, textElement) {
  textElement.text = null;
  textElement.name = tokenDoc.id;
  textElement.x = tokenDoc.x;
  textElement.y = tokenDoc.y;
  textElement.visible = false;
  textElement.alpha = 0;
  textElement.isMask = true;

  textElement.style.fontFamily = "Arial Black";
  textElement.style.fontSize = 500;

  textElement.width = tokenDoc.object.w;
  textElement.height = tokenDoc.object.h;
  textElement.resolution = 2;

  tokenDoc.layer.addChild(textElement);
}

export function hideSwingAura(tokenDoc) {
  //set aura
  let aura = tokenDoc.getFlag("token-auras", "aura1");
  aura.colour = "#FFFFFF";
  aura.opacity = 0;
  // auras.push(newAura);
  tokenDoc.setFlag("token-auras", "aura1", aura);
}

export function GetSwingValue(actor) {
  return actor.system.currentSwingValue;
}

export async function DropSwing(actor) {
  for (let element of actor.items) {
    if (element.type === "color" && element.system.isSwing) {
      await element.update({ "system.isSwing": false });
    }
  }
  await actor.update({
    "system.currentSwingValue": null,
    "system.currentSwingColor": null,
    "system.currentSwingName": "none",
  });
}
