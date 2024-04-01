export function addChatListeners(html)
{
    html.on('click', '.btn-selectSwing', onSelectSwing);
}

function onSelectSwing(event)
{
    const card = event.currentTarget;
    let actor;
    if(card.dataset.tokenId != "")
    {
        //This gets an instanced actor via token. (for npcs)
        actor = canvas.tokens.get(card.dataset.tokenId).actor;
    }
    else
    {
        //This get the actor document via id.
        actor = game.actors.get(card.dataset.ownerId);
    }
    let color = actor.items.get(card.dataset.itemId);
    let total = card.dataset.rolltotal;
    let rollVal = card.dataset.rollval;

    //check for a swing and remove it, then set new swing.
    for (const element of actor.items) {
        if(element.type == "color")
        {
            if(element.system.isSwing) {
                element.update({'system.isSwing':false});
            }
        }
    }
    color.update({'system.isSwing':true,'system.swingValue':rollVal});
    if(color.system.internalName)
    {
        actor.update({'system.currentSwingName':color.system.internalName});
    }
    else
    {
        actor.update({'system.currentSwingName':color.name});
    }
    let chatContent = "Locked in to " + color.system.displayName;
    if(card.dataset.isrecover)
    {
        chatContent+= ".";
    }
    else
    {
        chatContent+= " [+"+parseInt(color.system.value)+"].";
    }
    ChatMessage.create({
        user: game.user._id,
        content: chatContent,
        speaker: ChatMessage.getSpeaker()
        });

}

