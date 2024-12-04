//User can give us bad roll data so we return either the roll or a fake roll for a bad string
export async function CreateRollFromUserString(userDiceString, defaultDiceString) {
    let roll;
    try {
      roll = await new Roll(userDiceString).roll({ async: true });
    } catch {
      console.log("Windrose | Bad value of [" + userDiceString + "] was ignored");
  
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

  export function createChatRoll(content) {
    ChatMessage.create({
      user: game.user._id,
      speaker: ChatMessage.getSpeaker(),
      content,
      sound: CONFIG.sounds.dice,
      type: CONST.CHAT_MESSAGE_TYPES.ROLL,
      rollMode: game.settings.get("core", "rollMode"),
    })
  }