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
  console.log("newAura", newAura)
  tokenDoc.setFlag("token-auras", "aura1", newAura);
}

export function createSwingValue(tokenDoc, swingVal, swingColor, textElement) {
  textElement.name = tokenDoc.id;
  textElement.text = swingVal;
  textElement.x = tokenDoc.x;
  textElement.y = tokenDoc.y;
  textElement.visible = false;
  textElement.alpha = 1;
  textElement.isMask = true;
//   textElement.style.fill = swingColor;
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
  tokenDoc.layer.addChild(textElement);
}

export function hideSwingAura(tokenDoc) {
  //set aura
  const aura = tokenDoc.getFlag("token-auras", "aura1");
  aura.colour = "#FFFFFF";
  aura.opacity = 0;
  // auras.push(newAura);
  tokenDoc.setFlag("token-auras", "aura1", aura);
}
