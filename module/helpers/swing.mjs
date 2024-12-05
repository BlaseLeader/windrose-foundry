export const WILD_SWING = {
  color: "#d3d3d3",
  isSwing: false,
  displayName: "Wild",
  attributeBonus: 0,
};

export function setColoredSwingGraphic(tokenDoc, swingVal, swingColor, textElement) {
  this.createSwingValue(tokenDoc, swingVal, swingColor, textElement);

  // otherwise users without permission will be constantly attempting to alter the token
  if (tokenDoc.isOwner || game.user.isGM) {
    this.createSwingAura(tokenDoc, swingColor);
  }
}

export function createSwingAura(tokenDoc, swingColor) {
  const newAura = Auras.newAura();
  newAura.colour = swingColor;
  newAura.square = false;
  newAura.opacity = 0.5;
  newAura.permission = "all";
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

  textElement.style = {
    fontFamily: "Arial Black",
    fontSize: 500,
    fill: swingColor,
    stroke: "black",
    strokeThickness: 25,
  };

  textElement.width = tokenDoc.object.w;
  textElement.height = tokenDoc.object.h;
  textElement.resolution = 4;

  tokenDoc.layer.addChild(textElement);
}

export function setColorlessSwingGraphic(tokenDoc, textElement) {
  this.hideSwingValue(tokenDoc, textElement);

  if (tokenDoc.isOwner || game.user.isGM) {
    this.hideSwingAura(tokenDoc);
  }
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
  aura = aura ? aura : Auras.newAura();
  aura.colour = "#FFFFFF";
  aura.opacity = 0;
  // auras.push(newAura);
  tokenDoc.setFlag("token-auras", "aura1", aura);
}