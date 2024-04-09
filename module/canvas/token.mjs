import * as Swing from "../helpers/swing.mjs"
export class TokenWindrose extends Token {
  constructor(...args) {
    super(...args);
  }
    
  /** @inheritdoc */
    async _draw(){
        await super._draw();
        const textElement = new PIXI.Text();
          var swing = this.actor.getSwing();
          if (swing) {
            Swing.setColoredSwing(
              this.document,
              swing.swingValue,
              swing.swingColor,
              textElement
            );
          } else {
            Swing.setColorless(this.document, textElement);
          }
    }
}
