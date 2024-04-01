/**
 * Extend the basic ItemSheet with some very simple modifications
 * @extends {ItemSheet}
 */
export class WindroseItemSheet extends ItemSheet {

  /** @override */
  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      classes: ["windrose", "sheet", "item"],
      width: 520,
      height: 480,
      tabs: [{ navSelector: ".sheet-tabs", contentSelector: ".sheet-body", initial: "description" }]
    });
  }

  /** @override */
  get template() {
    const path = "systems/windrose/templates/item";
    // Return a single sheet for all item types.
    // return `${path}/item-sheet.html`;

    // Alternatively, you could use the following return statement to do a
    // unique item sheet by type, like `weapon-sheet.html`.
    return `${path}/item-${this.item.type}-sheet.html`;
  }

  /* -------------------------------------------- */

  /** @override */
  getData() {
    // Retrieve base data structure.
    const context = super.getData();

    // Use a safe clone of the item data for further operations.
    const itemData = context.item;

    // Retrieve the roll data for TinyMCE editors.
    context.rollData = {};

    if (itemData.type == 'gift') {
      this._prepareItems(context);
    }

    let actor = this.object?.parent ?? null;
    if (actor) {
      context.rollData = actor.getRollData();
    }

    // Add the actor's data to context.data for easier access, as well as flags.
    context.system = itemData.system;
    context.flags = itemData.flags;

    return context;
  }

  _prepareItems(context) {
    // Initialize containers.
    const giftbonuses = [];

    // Iterate through items, allocating to containers
    for (let modID of this.item.system.modifierIDs) {
      // Append to gift.
      
      let actor = this.actor;
      let modifier = actor.items.get(modID)
      let color = actor.items.find(x => x._id === modifier.system.colorID);
      modifier.color = color;
      giftbonuses.push(modifier);
    }

    let colors = [];
    if(this.actor)
    {
      for (let i of this.actor.items) {
        // Append to color
        if (i.type === 'color') {
          colors.push(i);
        }
      }
    }

    // Assign and return
    //sorting array here for handlebars
    context.colors = colors;
    context.giftbonuses = giftbonuses.sort(function(a,b) {return a.system.disabled-b.system.disabled});
  }
  /* -------------------------------------------- */
  
  async _onItemCreate(event) {
    event.preventDefault();
    const header = event.currentTarget;
    // Get the type of item to create.
    const type = header.dataset.type;
    // Grab any data associated with this control.
    const data = duplicate(header.dataset);
    // Initialize a default name.
    const name = `New ${type.capitalize()}`;
    // Prepare the item object.
    const itemData = {
      name: name,
      type: type,
      system: data
    };
    // Remove the type from the dataset since it's in the itemData.type prop.
    delete itemData.system["type"];

    if(type === "giftbonus")
    {
      if(this.actor)
      {
        let color = this.actor.items.find(x => x.type === "color");
        if(color){
          itemData.system.colorID = color._id;
        }
      }
    }

    let item = await Item.create(itemData, {parent: this.actor});
    
    //Add item to bonuses array.
    if(type === "giftbonus")
    {
     let array = this.item.system.modifierIDs;
     array.push(item._id);
     this.item.update({"system.modifierIDs":array});
    }
    // Finally, create the item!
    return item;
  }
  async _onDelete(ev)
  {
    const li = $(ev.currentTarget).parents(".item");
        const item = this.actor.items.get(li.data("itemId"));
  
        let userInput = await CreateConfirmationDialogue();
        if(userInput.cancelled) {
          return;
        }
  
        if(item.type === "giftbonus")
        {
         let array = this.item.system.modifierIDs;
         array = array.filter(id => id !== item._id);
         this.item.update({"system.modifierIDs":array});
        }

        item.delete();
        li.slideUp(200, () => this.render(false));
  }

  /** @override */
  activateListeners(html) {
    super.activateListeners(html);

    // Everything below here is only needed if the sheet is editable
    if (!this.isEditable) return;
    html.find('.item-create').click(this._onItemCreate.bind(this));
    html.find('.item-delete').click(this._onDelete.bind(this));

  }
}

async function CreateConfirmationDialogue()
{
    const template = "systems/windrose/templates/chat/confirmation-dialogue.html";
    const html = await renderTemplate(template, {});

    return new Promise(resolve => {
        const data = {
            title: "Delete",
            content: html,
            buttons: {
                normal: {
                    label: "Confirm",
                    callback: html => resolve({cancelled:false})
                },
                cancel: {
                    label: "Cancel",
                    callback: html => resolve({cancelled:true})
                }
            },
            default:"normal",
            close: () => resolve({cancelled:true})
        }

        new Dialog(data,null).render(true);
    });
}