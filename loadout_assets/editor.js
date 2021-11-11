import * as C from "./const.js";
import { Popup, PopupButton, PopupTextbox, DualSelectWidget, PopupWidget } from "./popup.js";
import { Radius, WrappedLine, CenteredTextData, roundedRect, roundedRectPath, TextMeasurement, onImageLoad, getScale, asciiToUint8Array, roundedArrow } from "./util.js";
import { Page, SlotPage, ContainerPage, SlotCell, InventoryCell, Item, Pages } from "./page.js";
import '../packages/jQuery.3.6.0/Content/Scripts/jquery-3.6.0.js';

/*jshint esversion: 6 */
export const PAGES = Object.freeze({
    PRIMARY: 0,
    SECONDARY: 1,
    HANDS: 2,
    BACKPACK: 3,
    VEST: 4,
    SHIRT: 5,
    PANTS: 6,
    STORAGE: 7,
    C_NONE: -1,
    C_HAT: -2,
    C_GLASSES: -3,
    C_MASK: -4,
    C_SHIRT: -5,
    C_VEST: -6,
    C_BACKPACK: -7,
    C_PANTS: -8
});
// order to sort pages when calling Pages.sortPages();
export const PAGEORDER = [PAGES.HANDS, PAGES.BACKPACK, PAGES.VEST, PAGES.SHIRT, PAGES.PANTS, PAGES.PRIMARY, PAGES.SECONDARY,
PAGES.C_BACKPACK, PAGES.C_VEST, PAGES.C_SHIRT, PAGES.C_PANTS, PAGES.C_HAT, PAGES.C_MASK, PAGES.C_GLASSES];
export const blacklistedItems = [1522];
document.body.onload = startEditor;
/**
 * @typedef {Object} StartupData
 * @property {ItemData[]} Items
 * 
 * @typedef {Object} ItemData
 * @property {number} ItemID
 * @property {number} T Type
 * @property {string} ItemGUID
 * @property {string} Name
 * @property {string} LocalizedName
 * @property {string} LocalizedDescription
 * @property {number} SizeX
 * @property {number} SizeY
 * @property {number} ItemType EItemType
 * @property {number} Rarity EItemRarity
 * @property {number} SlotType ESlotType
 * @property {number} Amount Max ammo count
 * @property {boolean} SentryAggressive Will sentries shoot holder
 * 
 * @typedef {Object} KitData
 * @property {Kit} Kit
 * 
 * @typedef {Object} Kit
 * @property {string} Name
 * @property {KitItem[]} Items
 * @property {KitClothing[]} Clothes
 * @property {BigUint64Array} AllowedUsers
 * @property {number} Branch EBranch
 * @property {number} Class EClass
 * @property {number} Cooldown In seconds
 * @property {number} Cost [depricated]
 * @property {boolean} IsPremium
 * @property {boolean} IsLoadout
 * @property {number} PremiumCost
 * @property {number} RequiredLevel
 * @property {boolean} ShouldClearInventory
 * @property {number} Team 0: any, 1: US, 2: Russia
 * @property {number} TeamLimit 0-1 percent of team.
 * @property {number} TicketCost
 * 
 * @typedef {Object} KitItem
 * @property {number} ID
 * @property {number} x
 * @property {number} y
 * @property {number} rotation
 * @property {number} quality
 * @property {Uint8Array} metadata
 * @property {number} amount
 * @property {number} page
 * 
 * @typedef {Object} KitClothing
 * @property {number} ID
 * @property {number} quality
 * @property {Uint8Array} metadata
 * @property {number} type EClothingType
 */
function startEditor()
{
    Program.start();
}
export class PGRM
{
    /** @type {HTMLCanvasElement} **/
    canvas = null;
    /** @type {CanvasRenderingContext2D} **/
    context = null;
    /** @type {HTMLElement} **/
    header = null;
    /** @type {Wiki} **/
    wiki = null;
    /** @type {URLSearchParams} **/
    url = null;
    /** @type {Popup} **/
    popup = null;
    /** @type {Popup[]} **/
    savedPopups = null;
    /** @type {Dictionary} **/
    dictionary = null;
    /** @type {StartupData} **/
    DATA = null;
    /** @type {boolean} **/
    isLoading = false;
    /** @type {boolean} **/
    mouseBtn1Consumed = false;
    /** @type {boolean} **/
    mouseBtn2Consumed = false;
    /** @type {number} **/
    lastTick = 0;
    /** @type {number} **/
    ticks = 0;
    /** @type {number} **/
    deltaTime = 0;
    /** @type {number} **/
    invalidateTimeRemaining = 0;
    /** @type {Pages} **/
    pages = null;
    /** @type {boolean} **/
    invalidated = true;
    /** @type {boolean} **/
    invalidatedAfter = false;
    /** @type {number} **/
    time = 0.0;
    /** @type {DOMRect} **/
    bounds = null;
    /** @type {boolean} **/
    moveConsumed = true;
    /**
     * Begin all initialization.
     * @returns {void}
     */
    start() 
    {
        document.onkeydown = keyPress;
        document.oncontextmenu = contextOverride;
        window.onresize = resizeInt;
        this.canvas = document.createElement("canvas");
        this.header = document.getElementById("headerObj");
        this.footer = document.getElementById("footerObj");
        this.canvas.classList.add("canvas-container");
        if (this.canvas == null)
        {
            console.error("Failed to create canvas.");
            return;
        }
        this.canvas.addEventListener("click", onClick);
        this.canvas.addEventListener("mousemove", onMouseMove);
        this.bounds = this.canvas.getBoundingClientRect();
        this.popup = null;
        document.getElementById("canvas-container").appendChild(this.canvas);
        this.context = this.canvas.getContext("2d");
        this.savedPopups =
            [
                new Popup("Preload Kit", "Start your loadout off with a kit that's already in-game. To use someone's loadout, type <their Steam64 ID>_<a-z in the order they were made> (for example 76561198267927009_a).",
                    [new PopupButton("LOAD", 13, loadKitBtn), new PopupButton("CANCEL", 27, closePopup)],
                    [new PopupTextbox("Kit ID", 0, "usrif1")]),
                new Popup("Connection Error", "It seems like the server is not connected the the web server properly. If there isn't planned matenence on the server, contact one of the Directors to check on this for you.",
                    [new PopupButton("CLOSE", 13, navigateToHomePage)]),
                new Popup("Save Kit", "Fill in the below information to submit your kit for verification. Valid classes: Squadleader, Rifleman, Medic, Breacher, Automatic Rifleman, Grenadier, Machine Gunner, LAT, HAT, Marksman, Sniper, AP Rifleman, Combat Engineer, Crewman, or Pilot",
                    [new PopupButton("SAVE", 13, saveKit), new PopupButton("CANCEL", 27, closePopup)],
                    [new PopupTextbox("Username", 0, ""), new PopupTextbox("Steam64", 1, ""),
                    new PopupTextbox("Kit Name", 0, ""), new PopupTextbox("Class", 0, "")],
                    [new DualSelectWidget("USA", "RUSSIA")], true)
            ];
        
        this.pages = new Pages(25, 25);
        this.pages.addSlot(PAGES.PRIMARY, "Primary", 6, 4, true, "primary.svg", (item) => item.item.SlotType == 1 || item.item.SlotType == 2 || item.item.SlotType == 4);
        this.pages.addSlot(PAGES.SECONDARY, "Secondary", 6, 4, true, "secondary.svg", (item) => item.item.SlotType == 2 || item.item.SlotType == 4);
        this.pages.addSlot(PAGES.C_HAT, "Hat", 4, 4, true, "hat.svg", (item) => item.item.T == 50);
        this.pages.addSlot(PAGES.C_GLASSES, "Glasses", 4, 4, true, "glasses.svg", (item) => item.item.T == 49);
        this.pages.addSlot(PAGES.C_MASK, "Mask", 4, 4, true, "mask.svg", (item) => item.item.T == 51);
        this.pages.addSlot(PAGES.C_SHIRT, "Shirt", 4, 4, true, "shirt.svg", (item) => item.item.T == 47);
        this.pages.addSlot(PAGES.C_VEST, "Vest", 4, 4, true, "vest.svg", (item) => item.item.T == 48);
        this.pages.addSlot(PAGES.C_BACKPACK, "Backpack", 4, 4, true, "backpack.svg", (item) => item.item.T == 45);
        this.pages.addSlot(PAGES.C_PANTS, "Pants", 4, 4, true, "pants.svg", (item) => item.item.T == 46);
        this.pages.addContainer(PAGES.HANDS, 5, 3, "Hands", true);
        this.pages.sortPages();
        this.dictionary = new Dictionary();
        this.wiki = new Wiki();
        this.interval = setInterval(tickInt, 0.1);
        this.updateScale();
        this.tick();
        this.url = new URLSearchParams(window.location.search);
        var response = call({}, "PingWarfare").done(() =>
        {
            if (!response.responseJSON.State)
            {
                if (Program.popup)
                    Program.popup.close();
                Program.popup = Program.savedPopups[1];
                Program.popup.open();
            }
            else
            {
                this.isLoading = true;
                Program.invalidate();
                response = call({}, "RequestStartupData").done(() =>
                {
                    this.isLoading = false;
                    if (!(response.responseJSON.Success && response.responseJSON.State))
                    {
                        if (Program.popup)
                            Program.popup.close();
                        Program.popup = Program.savedPopups[1];
                        Program.popup.open();
                    }
                    else
                    {
                        Program.DATA = response.responseJSON.State;
                        this.onMouseMoved(-127, -127);
                        Program.dictionary.items = Program.DATA.items;
                        Program.dictionary.activeItems = Program.DATA.items.slice();
                        Program.dictionary.loadItems();
                        Program.dictionary.updateFilters(true);
                        if (!Program.moveConsumed)
                            Program.invalidate();
                        if (this.url.has("kit"))
                        {
                            var kitname = this.url.get("kit");
                            loadKit(kitname);
                        }
                    }
                });
            }
        });
    }
    /**
     * Runs everytime the window is resized.
     */
    updateScale() 
    {
        this.canvas.width = window.innerWidth - 40;
        this.canvas.height = window.innerHeight - this.header.clientHeight - this.footer.clientHeight - 40;
        this.bounds = this.canvas.getBoundingClientRect();
        if (this.pages == null)
            console.warn("Pages is null");
        else
            this.pages.updateScale();
        if (this.popup != null)
            this.popup.updateDims(this.context);
        if (this.dictionary)
            this.dictionary.updateDims(this.context);
        if (this.wiki)
            this.wiki.updateDims(this.context);
    }
    /**
     * Runs every tick.
     * @returns {void}
     */
    tick()
    {
        if (!this.invalidated && this.invalidateTimeRemaining <= 0) return;
        var nextTick = new Date().getTime();
        this.deltaTime = (nextTick - this.lastTick) / 1000.0;
        this.time += this.deltaTime;
        this.lastTick = nextTick;
        this.ticks++;
        if (this.invalidateTimeRemaining > 0)
        {
            this.invalidateTimeRemaining -= this.deltaTime;
            if (this.invalidateTimeRemaining < 0) this.invalidateTimeRemaining = 0;
        }
        this.invalidatedAfter = false;
        this.invalidated = tick(this.context, this.deltaTime, this.time, this.ticks, this.canvas) || this.invalidatedAfter;
    }
    /**
     * Clear the canvas
     */
    clearCanvas()
    {
        this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }
    /**
     * @param {number} x Mouse Position X
     * @param {number} y Mouse Position Y
     * @returns {void}
     */
    onClick(x, y)
    {
        if (this.isLoading) return;
        this.mouseBtn1Consumed = false;
        if (Program.popup != null && Program.popup.consumeKeys && Program.popup.isOpen)
        {
            Program.popup.onClick(x, y);
            this.mouseBtn1Consumed = true;
        }
        else if (this.dictionary && this.dictionary.isOpen)
        {
            this.dictionary.onClick(x, y);
            this.mouseBtn1Consumed = true;
        }
        else if (this.wiki && this.wiki.isOpen)
        {
            this.wiki.onClick(x, y);
            this.mouseBtn1Consumed = true;
        }
        if (!this.mouseBtn1Consumed)
            this.pages.onClick(x, y);
        if (this.mouseBtn1Consumed)
            this.tick();
    }
    /**
     * @param {number} x Mouse Position X
     * @param {number} y Mouse Position Y
     * @returns {void}
     */
    onMouseMoved(x, y)
    {
        if (this.isLoading) return;
        this.moveConsumed = false;
        if (Program.popup != null && Program.popup.consumeKeys)
            Program.popup.onMouseMoved(x, y);
        else if (this.pages)
            this.pages.onMouseMoved(x, y);
        if (!this.moveConsumed && this.dictionary)
            this.dictionary.onMouseMoved(x, y);
        if (!this.moveConsumed && this.wiki)
            this.wiki.onMouseMoved(x, y);
        if (this.moveConsumed)
            this.tick();
    }
    /**
     * On right click.
     * @param {MouseEvent} event 
     * @returns {void}
     */
    onContextMenu(event)
    {
        if (this.isLoading) return;
        this.mouseBtn2Consumed = false;
        if (event.clientX < this.bounds.left || event.clientX > this.bounds.right || event.clientY < this.bounds.top || event.clientY > this.bounds.bottom) return;
        var x = event.clientX - this.bounds.left;
        var y = event.clientY - this.bounds.top;
        console.log(Program);
        //if (this.pages)
        //    this.pages.onRightClick(x, y);
        if (this.mouseBtn2Consumed)
        {
            event.stopPropagation();
            event.preventDefault();
        }
    }
    /**
     * Tell the next tick to re-render. Use when visuals change.
     */
    invalidate()
    {
        this.invalidated = true;
    }
    /**
     * Tell the next *seconds* worth of ticks to re-render. Use for animations, etc.
     * @param {number} seconds 
     * @returns {void}
     */
    invalidateNext(seconds)
    {
        if (this.invalidateTimeRemaining >= seconds) return;
        this.invalidateTimeRemaining = seconds;
    }
    /**
     * Tell the next tick after the currently executing one to re-render. Use for continuing animations, etc.
     */
    invalidateAfter()
    {
        this.invalidatedAfter = true;
    }
}

/**
 * Instance of the web-app.
 * @constant
 */
export const Program = new PGRM();

/**
 * Called on window resize.
 */
function resizeInt()
{
    if (Program)
    {
        Program.updateScale();
        Program.invalidate();
        Program.tick();
    }
}
/**
 * Called on tick.
 */
function tickInt()
{
    if (Program)
        Program.tick();
}
/**
 * Called on click.
 * @param {MouseEvent} e
 */
function onClick(e)
{
    if (Program)
    {
        Program.onClick(e.clientX - Program.bounds.left, e.clientY - Program.bounds.top);
    }
}
/**
 * Called on mouse movement.
 * @param {MouseEvent} e
 */
function onMouseMove(e)
{
    if (Program)
    {
        Program.onMouseMoved(e.clientX - Program.bounds.left, e.clientY - Program.bounds.top);
    }
}
/**
 * PopupButton method to load a kit in the first textbox.
 * @param {PopupButton} btn
 */
function loadKitBtn(btn)
{
    var txt = btn.owner.textboxes[0];
    if (txt == null || txt.text.length == 0) return false;
    else return loadKit(btn.owner.textboxes[0].text);
}
/**
 * Load a kit by id name.
 * @param {string} kitname 
 * @returns 
 */
function loadKit(kitname)
{
    var kitinfo = call({ kitName: kitname }, "GetKit").done(() =>
    {
        if (kitinfo.responseJSON.Success)
        {
            /** @type {KitData} */
            let kit = kitinfo.responseJSON.State;
            console.log("Loading kit: " + kit.Kit.Name);
            for (var i = 0; i < kit.Kit.Items.length; i++)
                kit.Kit.Items[i].metadata = asciiToUint8Array(kit.Kit.Items[i].metadata);
            for (var i = 0; i < kit.Kit.Clothes.length; i++)
                kit.Kit.Clothes[i].metadata = asciiToUint8Array(kit.Kit.Clothes[i].metadata);
            if (Program.popup != null) Program.popup.close();
            Program.pages.loadKit(kit);
        }
        else
        {
            console.warn("Failed to receive kit info");
        }
    });
    return kitinfo;
}
/**
 * [WIP]
 * @param {PopupButton} btn
 */
function saveKit(btn)
{
    console.log(btn);
}
/**
 * Drawing logic
 * @param {CanvasRenderingContext2D} ctx 
 * @param {number} deltaTime 
 * @param {number} realtime 
 * @param {number} ticks 
 * @param {HTMLCanvasElement} canvas 
 * @returns Boolean deciding wheter the next tick should execute.
 */
function tick(ctx, deltaTime, realtime, ticks, canvas)
{
    if (!ctx)
    {
        console.error("2D Canvas Context is null!!");
        return;
    }
    Program.clearCanvas();
    if (Program.isLoading)
    {
        ctx.fillStyle = "#000000";
        ctx.globalAlpha = 0.4;
        ctx.fillRect(0, 0, canvas.clientWidth, canvas.clientHeight)
        ctx.globalAlpha = 1;
        ctx.fillStyle = "#ffffff";
        ctx.font = 'bold 28px Segoe UI';
        ctx.textAlign = 'center';
        var center = CenteredTextData.centerText(ctx, "Loading...", canvas.clientWidth, canvas.clientHeight, 28);
        ctx.fillText("Loading...", center.width, center.height, canvas.clientWidth);
    }
    Program.pages.render(ctx);
    var loop = false;
    if (!Program.isLoading)
    {
        if (Program.popup)
            loop |= Program.popup.render(ctx, deltaTime, realtime);
        if (Program.dictionary)
            loop |= Program.dictionary.render(ctx, deltaTime, realtime);
        if (Program.wiki)
            loop |= Program.wiki.render(ctx, deltaTime, realtime);
    }
    ctx.textAlign = 'right';
    ctx.fillStyle = '#ffffff';
    ctx.font = '10px Consolas';
    ctx.fillText(deltaTime.toString() + " - " + realtime.toString() + " - " + ticks.toString(), Program.canvas.width - 5, 20);
    ctx.fillText("FPS: " + Math.round((1 / deltaTime)).toString(), Program.canvas.width - 5, 30);
    ctx.strokeRect(0, 0, canvas.width, canvas.height);
    return loop;
}
/**
 * Takes the user back to the website homepage.
 */
function navigateToHomePage()
{
    window.location.href = "../";
}
/**
 * Closes the button's owner.
 * @param {PopupButton} btn 
 */
function closePopup(btn)
{
    if (btn.owner) btn.owner.close();
    else if (Program.popup) Program.popup.close();
}
/**
 * Called on right click.
 * @param {MouseEvent} event 
 */
function contextOverride(event)
{
    Program.onContextMenu(event);
}
/**
 * Opens the attachment editor from a context menu.
 * @param {ContextButton} btn 
 * @returns 
 */
function editAttachments(btn)
{
    if (btn.owner && btn.owner.item)
    {
        return true;
    }
    else return false;
}
/**
 * Deletes the item linked to the context button
 * @param {ContextButton} btn 
 * @returns {boolean} Was the item deleted.
 */
function disposeItem(btn)
{
    if (btn.owner && btn.owner.item)
    {
        btn.owner.item.delete();
        return true;
    }
    else return false;
}
function ContextMenu(title = "TITLE", buttons = [])
{
    this.title = title;
    this.buttons = buttons;
    for (var i = 0; i < this.buttons.length; i++)
        this.buttons[i].owner = this;
    this.posX = 0;
    this.posY = 0;
    this.width = 0;
    this.height = 0;
    this.margin = 4;
    this.radiusTop = new Radius(4, 4, 0, 0);
    this.radiusBottom = new Radius(0, 0, 4, 4);
    this.up = false;
    this.left = false;
    this.titleHeight = 0;
    this.updateDims = function (ctx, x, y)
    {
        this.posX = x;
        this.posY = y;
        ctx.font = C.ctxMenuFontSize.toString() + "px Segoe UI";
        this.width = this.margin;
        var measure;
        var highest = 0;
        this.height = 0;
        if (this.title.length > 0)
        {
            this.height = this.title.length > 0 ? C.ctxMenuHeaderSize : 0;
            measure = new TextMeasurement(ctx, this.title, C.ctxMenuFontSize);
            highest = measure.width;
            this.titleHeight = measure.up;
        }
        if (highest < C.ctxMinWidth) highest = C.ctxMinWidth;
        for (var i = 0; i < this.buttons.length; i++)
        {
            this.height += this.buttons[i].height;
            if (this.buttons[i].text)
            {
                measure = new TextMeasurement(ctx, this.buttons[i].text, C.ctxMenuFontSize);
                this.buttons[i].textHeight = measure.up;
                if (highest < measure.width)
                    highest = measure.width;
            }
        }
        this.width += highest + this.margin;
        this.up = this.posY + this.height > Program.canvas.height;
        this.left = this.posX + this.width > Program.canvas.width;
    }
    this.render = function (ctx)
    {
        var px = this.left ? this.posX - this.width : this.posX;
        var py = this.up ? this.posY - this.height : this.posY;
        ctx.fillStyle = "#888888";
        ctx.strokeStyle = "#000000";
        ctx.font = C.ctxMenuFontSize.toString() + "px bold Segoe UI";
        if (this.title.length > 0)
        {
            roundedRect(ctx, px, py, this.width, C.ctxMenuHeaderSize, this.radiusTop, true, true);
            ctx.fillStyle = "#ffffff";
            py += C.ctxMenuHeaderSize;
        }
        for (var i = 0; i < this.buttons.length; i++)
        {
            ctx.fillStyle = "#888888";
            if (i == this.buttons.length - 1)
            {
                roundedRect(ctx, px, py, this.width, this.buttons[i].height, this.radiusBottom, true, true);
            }
            else
            {
                ctx.fillRect(px, py, this.width, this.buttons[i].height);
                ctx.strokeRect(px, py, this.width, this.buttons[i].height);
            }
            ctx.fillStyle = "#ffffff";
            ctx.fillText(this.buttons[i].text, px + this.margin, py + this.buttons[i].textHeight);
            py += this.buttons[i].height;
        }
    }
}
function ContextButton(text = "BUTTON", callback)
{
    this.height = C.ctxButtonHeight;
    this.text = text;
    this.callback = callback;
    this.textHeight = 0;
}
function Filter(name = "", predicate = (itemData) => true)
{
    this.enabled = false;
    this.show = true;
    this.name = name;
    this.predicate = predicate;
    this.posX = 0;
    this.posY = 0;
    this.width = 0;
    this.height = 0;
    this.index = 0;
    this.fullRadius = new Radius(4);
    this.enabledRadius = new Radius(4, 0, 4, 0);
    this.found = 0;
    this.owner = null;
    this.x = 0;
    this.y = 0;
    this.render = function (ctx, xOffset, yOffset)
    {
        if (!this.show) return;
        this.x = xOffset + this.posX;
        this.y = yOffset + this.posY;
        if (this.enabled)
        {
            ctx.strokeStyle = C.dictionaryAccent1;
        }
        ctx.fillStyle = C.dictionaryFilterDisabled;
        ctx.strokeStyle = C.dictionaryBackground;
        ctx.strokeWeight = 3;
        roundedRect(ctx, xOffset + this.posX, yOffset + this.posY, this.width, this.height, this.fullRadius, true, !this.enabled);
        if (this.enabled)
        {
            ctx.fillStyle = this.enabled ? C.dictionaryFilterEnabled : C.dictionaryFilterDisabled;
            roundedRect(ctx, xOffset + this.posX, yOffset + this.posY, this.width / 6, this.height, this.enabledRadius, true, false);
            roundedRect(ctx, xOffset + this.posX, yOffset + this.posY, this.width, this.height, this.fullRadius, false, true);
        }
        ctx.strokeWeight = 1;
        ctx.fillStyle = C.dictionaryFilterDisabled;
        roundedRect(ctx, xOffset + this.posX + this.width / 16, yOffset + this.posY + this.height / 6, 7 * this.width / 8, 2 * this.height / 3, this.fullRadius, true, false);
        var fontSize = Math.round(Program.canvas.height / 75);
        ctx.font = fontSize.toString() + 'px Segoe UI';
        ctx.fillStyle = C.dictionaryFilterEnabled;
        ctx.textAlign = 'left';
        var center = CenteredTextData.centerText(ctx, this.name, 7 * this.width / 8, 2 * this.height / 3, fontSize);
        ctx.fillText(this.name, xOffset + this.posX + this.width / 16 + this.owner.margin / 3, yOffset + this.posY + this.height / 6 + center.height, 7 * this.width / 8);
        ctx.textAlign = 'right';
        ctx.fillText(this.found.toString(), xOffset + this.posX + 15 * this.width / 16 - this.owner.margin / 3, yOffset + this.posY + this.height / 6 + center.height);
    }
    this.onClick = function ()
    {
        this.enabled = !this.enabled;
        if (this.enabled)
            this.owner.activeFilters.push(this);
        else
        {
            for (var f = 0; f < this.owner.activeFilters.length; f++)
            {
                if (this.owner.activeFilters[f].index === this.index)
                {
                    this.owner.activeFilters.splice(f, 1);
                    break;
                }
            }
        }
        Program.invalidate();
    }
    this.mouseInside = function (x, y)
    {
        return x > this.x && x < this.x + this.width && y > this.y && y < this.y + this.height;
    }
}
function DictionaryEntry(itemID = 0, itemData = null, owner = null)
{
    this.itemID = itemID;
    this.itemData = itemData;
    this.index = 0;
    this.posX = 0;
    this.tileradius = new Radius(C.radius);
    this.isHovered = false;
    this.posY = 0;
    this.icon = null;
    this.dontRequestImage = false;
    this.hoverProgress = 0.0;
    this.getIcon = function ()
    {
        if (this.dontRequestImage) return;
        this.icon = Program.pages.iconCache.get(this.itemID);
        if (!this.icon)
        {
            this.icon = new Image(this.itemData.sizeX * 512, this.itemData.sizeY * 512);
            this.icon.id = this.itemID.toString();
            this.icon.onload = onImageLoad;
            this.icon.src = C.itemIconPrefix + this.itemID.toString() + ".png";
            Program.pages.iconCache.set(this.itemID, this.icon);
        }
    }
    this.width = 0;
    this.height = 0;
    this.radius = new Radius(12);
    this.owner = owner;
    this.margin = this.owner.margin / 2;
    this.firstHover = false;
    this.onHoverComplete = function ()
    {
        this.owner.close();
        Program.wiki.loadItem(this.itemData);
        Program.wiki.reopenToDictionary = true;
        Program.wiki.open();
    }
    this.render = function (ctx, x, y)
    {
        if (this.isHovered && !this.firstHover)
        {
            this.hoverProgress += Program.deltaTime / C.dictionaryEntryHoverSpeed;
            if (this.hoverProgress >= 1)
            {
                this.onHoverComplete();
                this.hoverProgress = 0;
            }
            Program.invalidateAfter();
        } else if (this.hoverProgress > 0)
        {
            this.hoverProgress = 0;
            Program.invalidateAfter();
        } else
        {
            this.firstHover = false;
            //Program.invalidateAfter();
        }
        if (this.itemData == null || this.itemID === 0)
        {
            ctx.strokeStyle = C.dictionaryAccent1;
            ctx.strokeWeight = 5;
            roundedRect(ctx, x + this.posX, y + this.posY, this.width, this.height, this.radius, false, true);
            ctx.strokeWeight = 1;
            return;
        }
        if (this.icon == null && !this.dontRequestImage)
        {
            this.getIcon();
        }
        if (this.hoverProgress <= 0)
        {
            ctx.fillStyle = C.dictionaryBackgroundAccent;
        } else
        {
            var gradient = ctx.createLinearGradient(x + this.posX, y + this.posY + this.height, x + this.posX, y + this.posY);
            if (this.hoverProgress < 0.95)
            {
                gradient.addColorStop(1, C.dictionaryBackgroundAccent);
                gradient.addColorStop(this.hoverProgress < 0.85 ? this.hoverProgress + 0.15 : 1, C.dictionaryBackgroundAccent);
            }
            else
                gradient.addColorStop(1, C.dictionaryBackgroundAccentHovered);
            gradient.addColorStop(this.hoverProgress, C.dictionaryBackgroundAccentHovered);
            gradient.addColorStop(0, C.dictionaryBackgroundAccentHovered);
            ctx.fillStyle = gradient;
        }
        ctx.strokeStyle = C.dictionaryAccent1;
        ctx.strokeWeight = 1;
        var posy = this.isHovered ? y + this.posY - C.dictionaryEntryHoverOffset : y + this.posY;
        var posx = this.isHovered ? x + this.posX - C.dictionaryEntryHoverOffset : x + this.posX;
        var w = this.isHovered ? this.width + C.dictionaryEntryHoverOffset * 2 : this.width;
        var h = this.isHovered ? this.height + C.dictionaryEntryHoverOffset * 2 : this.height;
        roundedRect(ctx, posx, posy, w, h, this.radius, true, true);
        posy += this.margin;
        posx += this.margin;
        ctx.font = "bold " + C.dictionaryEntryTitleTextSize.toString() + "px Segoe UI";
        ctx.textAlign = 'left';
        ctx.fillStyle = C.dictionaryBackgroundAccentOpposite;
        var height = TextMeasurement.height(ctx, this.itemData.LocalizedName, C.dictionaryEntryTitleTextSize);
        ctx.fillText(this.itemData.LocalizedName, x + this.posX + this.margin, posy + height, w - this.margin * 2);
        posy += height + this.margin;
        var pw = w - this.margin * 2;
        var ph = h - this.margin * 6;
        var scale = getScale(pw, ph, this.itemData.SizeX, this.itemData.SizeY);
        var pw2 = this.itemData.SizeX * scale;
        var ph2 = this.itemData.SizeY * scale;
        var py = posy, px = posx;
        if (pw2 > ph2)
        {
            py += (ph - ph2) / 2;
        }
        else
        {
            px += (pw - pw2) / 2;
        }
        for (var x = 0; x < this.itemData.SizeX; x++)
        {
            for (var y = 0; y < this.itemData.SizeY; y++)
            {
                roundedRectPath(ctx, px + x * scale, py + y * scale, scale, scale, this.tileradius);
                ctx.globalAlpha = 0.5;
                ctx.fillStyle = C.occupiedCellColor;
                ctx.fill();
                ctx.globalAlpha = 1.0;
                ctx.strokeStyle = "#000000";
                ctx.stroke();
            }
        }
        if (this.icon)
        {
            try
            {
                ctx.drawImage(this.icon, px, py, pw2, ph2);
            }
            catch (ex)
            {
                this.dontRequestImage = true;
            }
        }
        else
        {
            ctx.fillStyle = "#999999";
            ctx.fillRect(px, py, pw2, ph2);
        }
    }
    this.onHover = function (x, y) 
    {
        if (!this.isHovered)
            this.firstHover = true;
    }
    this.onClick = function (x, y)
    {
        if (Program.pages.pickedItem != null)
            Program.pages.pickedItem.isPicked = false;
        Program.pages.pickedItem = new Item(this.itemID, -1, -1, this.itemData.SizeX, this.itemData.SizeY, 0, -1, this.itemData, true);
        Program.pages.pickedItem.isPicked = true;
        Program.pages.pickedItem.pickedLocationX = x;
        Program.pages.pickedItem.pickedLocationY = y;
        Program.pages.pickedItem.tileSizeX = C.tileSize;
        Program.pages.pickedItem.tileSizeY = C.tileSize;
        Program.invalidate();
        Program.dictionary.close();
    }
}
function Dictionary()
{
    this.gridSizeX = 8;
    this.gridSizeY = 50;
    this.width = 5;
    this.items = [];
    this.currentPage = 0;
    this.activeItems = [];
    this.entries = [];
    this.activeFilters = [];
    this.defaultFilter = new Filter("DEFAULT", (i) =>
        i.T !== 28 && i.T !== 35 && i.LocalizedName !== "#NAME" && !blacklistedItems.includes(i.ItemID) && (isNaN(Number(i.LocalizedName)) || !isNaN(Number(i.Name))) && (i.T != 1 || !i.IsTurret));
    this.filters = [
        new Filter("Weapon", (i) => (i.T === 1 || i.T === 3 || i.T === 40) && i.ItemID > 30000),
        new Filter("Explosive", (i) => (i.T === 3 && i.Explosive) || i.T === 18 || (i.T === 8 && i.Explosive) || i.T === 31),
        new Filter("Medical", (i) => i.T === 42),
        new Filter("Consumable", (i) => (i.T === 14 && i.T !== 42) || i.T === 41 || i.T === 43 || (i.T === 19 && (i.Food.Clean > 0 || i.Water.Clean > 0))),
        new Filter("Throwable", (i) => i.T === 3),
        new Filter("Clothes", (i) => (i.T > 44 && i.T < 52) || i.T === 29 || i.T === 4 || i.T === 5),
        new Filter("Backpack", (i) => i.T === 45),
        new Filter("Pants", (i) => i.T === 46),
        new Filter("Shirt", (i) => i.T === 47),
        new Filter("Vest", (i) => i.T === 48),
        new Filter("Glasses", (i) => i.T === 49),
        new Filter("Hat", (i) => i.T === 50),
        new Filter("Mask", (i) => i.T === 51),
        new Filter("Traps", (i) => i.T === 8),
        new Filter("Attachments", (i) => i.T > 8 && i.T < 14),
        new Filter("Ammo", (i) => i.T === 2),
        new Filter("Sight", (i) => i.T === 10),
        new Filter("Grip", (i) => i.T === 11),
        new Filter("Tactical", (i) => i.T === 12),
        new Filter("Barrel", (i) => i.T === 13),
        new Filter("Buildable", (i) => i.T === 6 || i.T === 8 || i.T === 18 || (i.T > 21 && i.T < 28) || i.T === 7),
        new Filter("Barriade", (i) => i.T === 6 || i.T === 8 || i.T === 18 || (i.T > 21 && i.T < 28)),
        new Filter("Structure", (i) => i.T === 7)
    ];
    for (var i = 0; i < this.filters.length; i++)
    {
        this.filters[i].index = i;
        this.filters[i].owner = this;
    }
    this.maxItems = C.dictionaryItemColumns * C.dictionaryItemRows;
    this.updateFilters = function (bypass = false)
    {
        this.activeItems.splice(0);
        if (this.activeFilters.length === 0 && !bypass)
        {
            for (var i = 0; i < this.items.length; i++)
            {
                if (this.defaultFilter.predicate(this.items[i]))
                    this.activeItems.push(this.items[i]);
            }
            this.loadItems();
            this.updateDims(Program.context);
            return;
        }
        for (var f = 0; f < this.activeFilters.length; f++)
            this.activeFilters[f].found = 0;
        for (var i = 0; i < this.items.length; i++)
        {
            var match = false;
            if (!this.defaultFilter.predicate(this.items[i]))
                continue;
            for (var f = 0; f < this.activeFilters.length; f++)
            {
                if (this.activeFilters[f].enabled)
                {
                    if (this.activeFilters[f].predicate(this.items[i]))
                    {
                        this.activeFilters[f].found++;
                        match = true;
                    }
                }
            }
            if (match || bypass)
                this.activeItems.push(this.items[i]);
        }
        this.loadItems();
        this.updateDims(Program.context);
    }
    this.title = "Item Database";
    this.margin = 16;
    this.darkenBackground = true;
    this.consumeKeys = false;
    this.isOpen = false;
    this.willAnimate = false;
    this.isAnimating = false;
    this.radius = new Radius(16, 0, 16, 0);
    this.buttonRadius = new Radius(4);
    this.headerRadius = new Radius(16, 0, 0, 0);
    this.footerRadius = new Radius(0, 0, 16, 0);
    this.inited = false;
    this.updateDims = function (ctx)
    {
        this.width = Program.canvas.width / 2;
        this.startPosX = Program.canvas.width * 1.05;
        this.finalPosX = Program.canvas.width - this.width;
        this.posY = 0;
        this.height = Program.canvas.height;
        this.footerStartY = this.height - C.dictionaryFooterSize;
        ctx.font = 'bold ' + C.dictionaryTitleTextSize.toString() + 'px Segoe UI';
        ctx.textAlign = 'left';
        this.titleYoffset = CenteredTextData.centerTextHeight(ctx, this.title + " - " + this.activeItems.length + " Items Visible", C.dictionaryHeaderSize, C.dictionaryTitleTextSize);
        if (this.filters.length > 0)
        {
            this.filterSectionHeight = (Program.canvas.height / 48 + this.margin / 2) * Math.ceil(this.filters.length / C.dictionaryFilterColumns);
            var filterWidth = (this.width - this.margin * (2 + C.dictionaryFilterColumns)) / (C.dictionaryFilterColumns);
            for (var i = 0; i < this.filters.length; i++)
            {
                var filter = this.filters[i];
                filter.width = filterWidth;
                filter.height = Program.canvas.height / 48;
                filter.posX = this.margin + (i % C.dictionaryFilterColumns) * (filterWidth + this.margin);
                filter.posY = C.dictionaryHeaderSize + this.margin + ((Program.canvas.height / 48 + this.margin / 2) * Math.floor(i / C.dictionaryFilterColumns));
            }
        }
        this.gridStartY = C.dictionaryHeaderSize + this.margin + this.filterSectionHeight + this.margin;
        this.itemWidth = (this.width - this.margin * (2 + C.dictionaryItemColumns)) / (C.dictionaryItemColumns);
        this.gridHeight = this.height - C.dictionaryHeaderSize - C.dictionaryFooterSize - this.margin * 2 - this.filterSectionHeight;
        for (var i = 0; i < this.maxItems; i++)
        {
            var entry = this.entries[i];
            if (!entry)
            {
                entry = new DictionaryEntry(0, null, this);
                entry.index = i;
                this.entries.push(entry);
            }
            entry.width = this.itemWidth;
            entry.height = (this.gridHeight / C.dictionaryItemRows) - this.margin;
            entry.posX = this.margin + (i % C.dictionaryItemColumns) * (this.itemWidth + this.margin);
            entry.posY = C.dictionaryHeaderSize + this.margin + this.filterSectionHeight + this.margin + ((entry.height + this.margin) * Math.floor(i / C.dictionaryItemColumns));
        }
        this.backX = this.width / 2 - C.dictionaryButtonSize - this.margin / 2;
        this.nextX = this.width / 2 + this.margin / 2;
        this.buttonY = this.footerStartY + (C.dictionaryFooterSize - C.dictionaryButtonSize) / 2;
        this.inited = true;
    }
    this.open = function ()
    {
        this.animState = true;
        this.willAnimate = true;
        this.inited = false;
        Program.invalidate();
    }
    this.close = function ()
    {
        this.animState = false;
        this.willAnimate = true;
        this.consumeKeys = false;
        for (var e = 0; e < this.entries.length; e++)
        {
            this.entries[e].isHovered = false;
            this.entries[e].firstHover = false;
            this.entries[e].hoverProgress = 0;
        }
        Program.invalidate();
    }
    this.render = function (ctx, dt, rt)
    {
        if (!this.inited)
            this.updateDims(ctx);
        if (this.willAnimate)
        {
            this.willAnimate = false;
            this.isAnimating = true;
            if (this.animState)
            {
                this.currentAnimAlpha = 0;
                this.renderAt(ctx, this.startPosX, this.posY, 0.0);
            }
            else
            {
                this.currentAnimAlpha = 1;
                this.renderAt(ctx, this.finalPosX, this.posY, 1.0);
            }
            return true;
        }
        else if (this.isAnimating)
        {
            if (this.animState)
            {
                if (this.currentAnimAlpha >= 1.0)
                {
                    this.currentAnimAlpha = 1;
                    this.consumeKeys = true;
                    this.isAnimating = false;
                    this.isOpen = true;
                    this.willAnimate = false;
                    this.renderAt(ctx, this.finalPosX, this.posY, 1.0);
                    return false;
                }
                else
                {
                    this.renderAt(ctx, this.lerp(), this.posY, this.currentAnimAlpha);
                    this.currentAnimAlpha += dt / C.dictionaryAnimTimeSec;
                    return true;
                }
            }
            else
            {
                if (this.currentAnimAlpha <= 0)
                {
                    this.currentAnimAlpha = 0;
                    this.isAnimating = false;
                    this.isOpen = false;
                    this.willAnimate = false;
                    this.onClose();
                    return false;
                }
                else
                {
                    this.renderAt(ctx, this.lerp(), this.posY, this.currentAnimAlpha);
                    this.currentAnimAlpha -= dt / C.dictionaryAnimTimeSec;
                    return true;
                }
            }
        }
        else if (this.isOpen)
        {
            this.renderAt(ctx, this.finalPosX, this.posY, 1.0);
        }
        return this.isAnimating;
    }
    this.exp = function (alpha)
    {
        return Math.pow(C.expConst, Math.pow(C.expConst, 0.5 * alpha) * alpha - 1) - Math.pow(C.expConst, -1);
    }
    this.lerp = function ()
    {
        if (this.animState)
            return (this.startPosX - this.finalPosX) * (1 - (this.exp(this.currentAnimAlpha))) + this.finalPosX;
        else
            return (this.startPosX - this.finalPosX) * (this.exp(1 - this.currentAnimAlpha)) + this.finalPosX;
    }
    this.renderAt = function (ctx, x, y, bkgrAlpha)
    {
        if (bkgrAlpha > 0)
        {
            ctx.globalAlpha = bkgrAlpha * C.dictionaryBkgrTransparency;
            ctx.fillStyle = "#000000";
            ctx.strokeWeight = 0;
            ctx.fillRect(0, 0, Program.canvas.width, Program.canvas.height);
        }
        ctx.globalAlpha = 1.0;
        if (y >= Program.canvas.width) return;
        ctx.fillStyle = C.dictionaryBackground;
        ctx.strokeStyle = C.dictionaryAccent1;
        ctx.strokeWeight = 1;
        roundedRect(ctx, x, y, this.width, this.height, this.radius, true, true);
        ctx.strokeStyle = "#000000";
        ctx.fillStyle = C.dictionaryAccent1;
        roundedRect(ctx, x, y, this.width, C.dictionaryHeaderSize, this.headerRadius, true, false);
        ctx.fillStyle = "#ffffff";
        ctx.font = 'bold ' + C.dictionaryTitleTextSize.toString() + 'px Segoe UI';
        ctx.textAlign = 'left';
        ctx.fillText(this.title + " - " + this.activeItems.length + " Items Visible", x + this.margin, y + this.titleYoffset, this.width - this.margin * 2);
        ctx.fillStyle = "#333333";
        ctx.fillRect(x + 1, y + C.dictionaryHeaderSize, this.width - 2, this.filterSectionHeight + this.margin * 2);
        for (var i = 0; i < this.filters.length; i++)
            this.filters[i].render(ctx, x, y);
        for (var i = 0; i < this.entries.length; i++)
            this.entries[i].render(ctx, x, y);
        ctx.fillStyle = C.dictionaryAccent1;
        roundedRect(ctx, x, this.footerStartY, this.width, C.dictionaryFooterSize, this.footerRadius, true, false);
        ctx.fillStyle = this.currentPage === 0 ? C.dictionaryAccent4Disabled : (this.backHovered ? C.dictionaryAccent3 : C.dictionaryAccent2);
        roundedArrow(ctx, x + this.backX, this.buttonY, C.dictionaryButtonSize, C.dictionaryButtonSize, this.buttonRadius, true, false, true);
        ctx.fillStyle = (this.currentPage + 1) * this.maxItems >= this.activeItems.length ? C.dictionaryAccent4Disabled : (this.nextHovered ? C.dictionaryAccent3 : C.dictionaryAccent2);
        roundedArrow(ctx, x + this.nextX, this.buttonY, C.dictionaryButtonSize, C.dictionaryButtonSize, this.buttonRadius, true, false, false);

    }
    this.backHovered = false;
    this.nextHovered = false;
    this.onClose = function ()
    {
    }
    this.currentAnimAlpha = 0.0;
    this.animState = false; //false = closing, true = opening
    this.keyPress = function (event)
    {
        if (event.keyCode == 27) // esc
        {
            this.close();
        }
    }
    this.onClick = function (x, y)
    {
        var filterChange = false;
        for (var i = 0; i < this.filters.length; i++)
        {
            if (this.filters[i].mouseInside(x, y))
            {
                this.filters[i].onClick();
                filterChange = true;
                break;
            }
        }
        if (filterChange)
        {
            this.currentPage = 0;
            this.updateFilters();
        }
        else
        {
            if (x > this.finalPosX + this.backX - C.dictionaryButtonSize / 2 && x < this.finalPosX + this.backX + C.dictionaryButtonSize && y > this.buttonY && y < this.buttonY + C.dictionaryButtonSize)
            {
                if (this.currentPage > 0)
                {
                    this.currentPage--;
                    this.loadItems();
                    Program.invalidate();
                }
                Program.mouseBtn1Consumed = true;
                return;
            }
            else if (x > this.finalPosX + this.nextX && x < this.finalPosX + this.nextX + C.dictionaryButtonSize * 1.5 && y > this.buttonY && y < this.buttonY + C.dictionaryButtonSize)
            {
                if ((this.currentPage + 1) * this.maxItems < this.activeItems.length)
                {
                    this.currentPage++;
                    this.loadItems();
                    Program.invalidate();
                }
                Program.mouseBtn1Consumed = true;
                return;
            }
            else
            {
                for (var e = 0; e < this.entries.length; e++)
                {
                    if (x > this.finalPosX + this.entries[e].posX && x < this.finalPosX + this.entries[e].posX + this.entries[e].width &&
                        y > this.posY + this.entries[e].posY && y < this.posY + this.entries[e].posY + this.entries[e].height)
                    {
                        this.entries[e].onClick(x, y);
                        Program.mouseBtn1Consumed = true;
                        Program.invalidate();
                        break;
                    }
                }
            }
        }
    }
    this.loadItems = function ()
    {
        if ((this.currentPage + 1) * this.maxItems >= this.activeItems.length)
        {
            this.currentPage = Math.floor((this.activeItems.length === 0 ? 0 : this.activeItems.length - 1) / this.maxItems);
        }
        var e = 0;
        for (var i = this.currentPage * this.maxItems; i < (this.currentPage + 1) * this.maxItems; i++)
        {
            if (this.activeItems[i])
            {
                this.entries[e].itemID = this.activeItems[i].ItemID;
                this.entries[e].itemData = this.activeItems[i];
                this.entries[e].icon = null;
                this.entries[e].dontRequestImage = false;
            }
            else
            {
                this.entries[e].itemID = 0;
                this.entries[e].itemData = null;
                this.entries[e].icon = null;
                this.entries[e].dontRequestImage = false;
            }
            e++;
        }
    }
    this.onMouseMoved = function (x, y)
    {
        if (!this.consumeKeys || this.isAnimating) return;
        if (x > this.finalPosX + this.backX - C.dictionaryButtonSize / 2 && x < this.finalPosX + this.backX + C.dictionaryButtonSize && y > this.buttonY && y < this.buttonY + C.dictionaryButtonSize)
        {
            this.backHovered = true;
            this.nextHovered = false;
            Program.moveConsumed = true;
            Program.invalidate();
        }
        else if (x > this.finalPosX + this.nextX && x < this.finalPosX + this.nextX + C.dictionaryButtonSize * 1.5 && y > this.buttonY && y < this.buttonY + C.dictionaryButtonSize)
        {
            this.nextHovered = true;
            this.backHovered = false;
            Program.moveConsumed = true;
            Program.invalidate();
        }
        else if (this.nextHovered || this.backHovered)
        {
            this.nextHovered = false;
            this.backHovered = false;
            Program.invalidate();
        }
        for (var e = 0; e < this.entries.length; e++)
        {
            if (x > this.finalPosX + this.entries[e].posX && x < this.finalPosX + this.entries[e].posX + this.entries[e].width &&
                y > this.posY + this.entries[e].posY && y < this.posY + this.entries[e].posY + this.entries[e].height)
            {
                this.entries[e].onHover(x, y);
                this.entries[e].isHovered = true;
                Program.moveConsumed = true;
                Program.invalidate();
            } else
            {
                if (this.entries[e].isHovered)
                    Program.invalidate();
                this.entries[e].isHovered = false;
            }
        }
    }
}
function Wiki()
{
    this.title = "WIKI";
    this.message = "DESC";
    this.wrappedMessage = null;
    this.margin = 16;
    this.darkenBackground = true;
    this.consumeKeys = false;
    this.fields = [];
    this.icons = [];
    this.isOpen = false;
    this.reopenToDictionary = false;
    this.willAnimate = false;
    this.isAnimating = false;
    this.radius = new Radius(16);
    this.headerRadius = new Radius(16, 16, 0, 0);
    this.inited = false;
    this.currentItem = null;
    this.updateDims = function (ctx)
    {
        this.width = Program.canvas.width / 1.5;
        this.posX = Program.canvas.width / 2 - this.width / 2;
        this.startPosY = Program.canvas.height * 1.05;
        ctx.font = C.popupDescTextSize.toString() + 'px Segoe UI';
        ctx.textAlign = 'left';
        this.wrappedMessage = WrappedLine.wrapText(ctx, this.message, this.width - this.margin * 2, C.popupDescTextSize);
        this.textHeight = 0;
        for (var i = 0; i < this.wrappedMessage.length; i++)
            this.textHeight += this.wrappedMessage[i].height + C.popupDescLineSpacing;
        this.height = C.popupHeaderHeight + this.margin + this.textHeight + this.margin + this.getContentHeight(ctx) + this.margin;
        this.finalPosY = Program.canvas.height / 2 - this.height / 2;
        ctx.font = 'bold ' + C.popupTitleTextSize.toString() + 'px Segoe UI';
        ctx.textAlign = 'left';
        this.titleYoffset = CenteredTextData.centerTextHeight(ctx, this.title, C.popupHeaderHeight, C.popupTitleTextSize);
        this.contentYStart = C.popupHeaderHeight + this.margin + this.textHeight + this.margin;
        this.inited = true;
    }
    this.open = function ()
    {
        this.animState = true;
        this.willAnimate = true;
        this.inited = false;
        Program.invalidate();
    }
    this.close = function ()
    {
        this.animState = false;
        this.willAnimate = true;
        this.consumeKeys = false;
        Program.invalidate();
        if (this.reopenToDictionary && Program.dictionary)
            Program.dictionary.open();
    }
    this.render = function (ctx, dt, rt)
    {
        if (!this.inited)
            this.updateDims(ctx);
        if (this.willAnimate)
        {
            this.willAnimate = false;
            this.isAnimating = true;
            if (this.animState)
            {
                this.currentAnimAlpha = 0;
                this.renderAt(ctx, this.posX, this.startPosY, 0.0);
            }
            else
            {
                this.currentAnimAlpha = 1.0;
                this.renderAt(ctx, this.posX, this.finalPosY, 1.0);
            }
            return true;
        }
        else if (this.isAnimating)
        {
            if (this.animState)
            {
                if (this.currentAnimAlpha >= 1.0)
                {
                    this.currentAnimAlpha = 1;
                    this.isAnimating = false;
                    this.isOpen = true;
                    this.willAnimate = false;
                    this.renderAt(ctx, this.posX, this.finalPosY, 1.0);
                    this.consumeKeys = true;
                    return false;
                }
                else
                {
                    this.renderAt(ctx, this.posX, this.lerp(), this.currentAnimAlpha);
                    this.currentAnimAlpha += dt / C.popupAnimTimeSec;
                    return true;
                }
            }
            else
            {
                if (this.currentAnimAlpha <= 0)
                {
                    this.currentAnimAlpha = 0;
                    this.isAnimating = false;
                    this.isOpen = false;
                    this.willAnimate = false;
                    this.onClose();
                    return false;
                }
                else
                {
                    this.renderAt(ctx, this.posX, this.lerp(), this.currentAnimAlpha);
                    this.currentAnimAlpha -= dt / C.popupAnimTimeSec;
                    return true;
                }
            }
        }
        else if (this.isOpen)
        {
            this.renderAt(ctx, this.posX, this.finalPosY, 1.0);
        }
        return this.isAnimating;
    }
    this.exp = function (alpha)
    {
        return Math.pow(C.expConst, Math.pow(C.expConst, 0.5 * alpha) * alpha - 1) - Math.pow(C.expConst, -1);
    }
    this.lerp = function ()
    {
        if (this.animState)
            return (this.startPosY - this.finalPosY) * (1 - (this.exp(this.currentAnimAlpha))) + this.finalPosY;
        else
            return (this.startPosY - this.finalPosY) * (this.exp(1 - this.currentAnimAlpha)) + this.finalPosY;
    }
    this.renderAt = function (ctx, x, y, bkgrAlpha)
    {
        if (bkgrAlpha > 0)
        {
            ctx.globalAlpha = bkgrAlpha * C.popupBkgrTransparency;
            ctx.fillStyle = "#000000";
            ctx.fillRect(0, 0, Program.canvas.width, Program.canvas.height);
        }
        ctx.globalAlpha = 1.0;
        if (y >= Program.canvas.height) return;
        ctx.fillStyle = C.wikiBackground;
        ctx.strokeStyle = C.popupAccent1;
        roundedRect(ctx, x, y, this.width, this.height, this.radius, true, true);
        ctx.strokeStyle = "#000000";
        ctx.fillStyle = C.popupAccent1;
        roundedRect(ctx, x, y, this.width, C.popupHeaderHeight, this.headerRadius, true, false);
        ctx.fillStyle = "#000000";
        ctx.font = 'bold ' + C.popupTitleTextSize.toString() + 'px Segoe UI';
        ctx.textAlign = 'left';
        var ypos = y + C.popupHeaderHeight;
        ctx.fillText(this.title, x + this.margin, y + this.titleYoffset, this.width - this.margin * 2);
        ctx.font = C.popupDescTextSize.toString() + 'px Segoe UI';
        ypos += this.margin;
        for (var i = 0; i < this.wrappedMessage.length; i++)
        {
            ypos += this.wrappedMessage[i].height;
            ctx.fillText(this.wrappedMessage[i].text, x + this.margin, ypos, this.width - this.margin * 2);
            if (i != this.wrappedMessage.length - 1) ypos += C.popupDescLineSpacing;
        }
        this.renderCustom(ctx, ypos);
    }
    this.onClose = function ()
    {
    }
    this.currentAnimAlpha = 0.0;
    this.animState = false; //false = closing, true = opening
    this.keyPress = function (event)
    {
        if (event.keyCode == 27) // esc
        {
            this.close();
        }
    }
    this.onClick = function (x, y)
    {

    }
    this.onMouseMoved = function (x, y)
    {
        if (Program.moveConsumed)
            Program.invalidate();
    }
    this.loadItem = function (itemData)
    {
        this.currentItem = itemData;
        this.title = itemData.LocalizedName;
        this.message = itemData.LocalizedDescription;
        this.updateDims(Program.context);
        Program.invalidate();
    }
    this.getContentHeight = function (ctx)
    {
        if (this.currentItem === null) return;
        var type = this.currentItem.T;
        var ypos = this.renderBase(ctx, 0, this.currentItem.T === 0);
        switch (type) 
        {
            case 0:
            case 31:
            case 32:
            case 34:
            case 36:
            case 37:
            case 38:
            case 50:
                break;
            case 1: // gun
                ypos = this.renderGun(ctx, ypos, true, true);
                break;
            case 2: // magazine
                ypos = this.renderMagazine(ctx, ypos, true, true);
                break;
            case 3: // throwable
                ypos = this.renderThrowable(ctx, ypos, true, true);
                break;
            case 4: // clothing
                ypos = this.renderClothing(ctx, ypos, true, true);
                break;
            case 45:
            case 46:
            case 48:
            case 5: // storage clothing
                ypos = this.renderStorageClothing(ctx, ypos, true, true);
                break;
            case 6: // barricade
                ypos = this.renderBarricade(ctx, ypos, true, true);
                break;
            case 7: // structure
                ypos = this.renderStructure(ctx, ypos, true, true);
                break;
            case 8: // trap
                ypos = this.renderTrap(ctx, ypos, true, true);
                break;
            case 9: // attachment
                ypos = this.renderAttachment(ctx, ypos, true, true);
                break;
            case 10: // sight
                ypos = this.renderSight(ctx, ypos, true, true);
                break;
            case 11: // grip
                ypos = this.renderGrip(ctx, ypos, true, true);
                break;
            case 12: // tactical
                ypos = this.renderTactical(ctx, ypos, true, true);
                break;
            case 13: // barrel
                ypos = this.renderBarrel(ctx, ypos, true, true);
                break;
            case 41: // food
            case 42: // medical
            case 43: // water
            case 14: // consumable
                ypos = this.renderConsumable(ctx, ypos, true, true);
                break;
            case 15: // consumable
                ypos = this.renderUseable(ctx, ypos, true, true);
                break;
            case 16: // fuel
                ypos = this.renderFuel(ctx, ypos, true, true);
                break;
            case 17: // optic (binos)
                ypos = this.renderZoom(ctx, ypos, true, true);
                break;
            case 18: // charge
                ypos = this.renderCharge(ctx, ypos, true, true);
                break;
            case 19: // refill
                ypos = this.renderRefill(ctx, ypos, true, true);
                break;
            case 20: // map
                ypos = this.renderMap(ctx, ypos, true, true);
                break;
            case 21: // handcuff
                ypos = this.renderHandcuff(ctx, ypos, true, true);
                break;
            case 22: // beacon
                ypos = this.renderBeacon(ctx, ypos, true, true);
                break;
            case 23: // farm
                ypos = this.renderFarm(ctx, ypos, true, true);
                break;
            case 24: // generator
                ypos = this.renderGenerator(ctx, ypos, true, true);
                break;
            case 25: // library
                ypos = this.renderLibrary(ctx, ypos, true, true);
                break;
            case 26: // storage
                ypos = this.renderStorage(ctx, ypos, true, true);
                break;
            case 27: // tank
                ypos = this.renderTank(ctx, ypos, true, true);
                break;
            case 28: // workshop box
                ypos = this.renderWorkshopBox(ctx, ypos, true, true);
                break;
            case 50:
            case 29: // non-storage clothes
                ypos = this.renderGear(ctx, ypos, true, true);
                break;
            case 30: // cloud
                ypos = this.renderCloud(ctx, ypos, true, true);
                break;
            case 33: // fisher
                ypos = this.renderFisher(ctx, ypos, true, true);
                break;
            case 35: // workshop key
                ypos = this.renderKey(ctx, ypos, true, true);
                break;
            case 39: // tire
                ypos = this.renderTire(ctx, ypos, true, true);
                break;
            case 40: // melee
                ypos = this.renderMelee(ctx, ypos, true, true);
                break;
            case 44: // handcuff key
                ypos = this.renderHandcuffKey(ctx, ypos, true);
                break;
            case 47: // shirt
                ypos = this.renderShirt(ctx, ypos, true, true);
                break;
            case 49: // glasses
                ypos = this.renderGlasses(ctx, ypos, true, true);
                break;
            case 51: // mask
                ypos = this.renderMask(ctx, ypos, true, true);
                break;
        }
        return ypos;
    }
    this.renderCustom = function (ctx, ypos2)
    {
        var type = this.currentItem.T;
        var ypos = this.renderBase(ctx, ypos2, this.currentItem.T === 0);
        switch (type) 
        {
            case 0:
            case 31:
            case 32:
            case 34:
            case 36:
            case 37:
            case 38:
            case 50:
                break;
            case 1: // gun
                ypos = this.renderGun(ctx, ypos, true);
                break;
            case 2: // magazine
                ypos = this.renderMagazine(ctx, ypos, true);
                break;
            case 3: // throwable
                ypos = this.renderThrowable(ctx, ypos, true);
                break;
            case 4: // clothing
                ypos = this.renderClothing(ctx, ypos, true);
                break;
            case 45:
            case 46:
            case 48:
            case 5: // storage clothing
                ypos = this.renderStorageClothing(ctx, ypos, true);
                break;
            case 6: // barricade
                ypos = this.renderBarricade(ctx, ypos, true);
                break;
            case 7: // structure
                ypos = this.renderStructure(ctx, ypos, true);
                break;
            case 8: // trap
                ypos = this.renderTrap(ctx, ypos, true);
                break;
            case 9: // attachment
                ypos = this.renderAttachment(ctx, ypos, true);
                break;
            case 10: // sight
                ypos = this.renderSight(ctx, ypos, true);
                break;
            case 11: // grip
                ypos = this.renderGrip(ctx, ypos, true);
                break;
            case 12: // tactical
                ypos = this.renderTactical(ctx, ypos, true);
                break;
            case 13: // barrel
                ypos = this.renderBarrel(ctx, ypos, true);
                break;
            case 41: // food
            case 42: // medical
            case 43: // water
            case 14: // consumable
                ypos = this.renderConsumable(ctx, ypos, true);
                break;
            case 15: // consumable
                ypos = this.renderUseable(ctx, ypos, true);
                break;
            case 16: // fuel
                ypos = this.renderFuel(ctx, ypos, true);
                break;
            case 17: // optic (binos)
                ypos = this.renderZoom(ctx, ypos, true);
                break;
            case 18: // charge
                ypos = this.renderCharge(ctx, ypos, true);
                break;
            case 19: // refill
                ypos = this.renderRefill(ctx, ypos, true);
                break;
            case 20: // map
                ypos = this.renderMap(ctx, ypos, true);
                break;
            case 21: // handcuff
                ypos = this.renderHandcuff(ctx, ypos, true);
                break;
            case 22: // beacon
                ypos = this.renderBeacon(ctx, ypos, true);
                break;
            case 23: // farm
                ypos = this.renderFarm(ctx, ypos, true);
                break;
            case 24: // generator
                ypos = this.renderGenerator(ctx, ypos, true);
                break;
            case 25: // library
                ypos = this.renderLibrary(ctx, ypos, true);
                break;
            case 26: // storage
                ypos = this.renderStorage(ctx, ypos, true);
                break;
            case 27: // tank
                ypos = this.renderTank(ctx, ypos, true);
                break;
            case 28: // workshop box
                ypos = this.renderWorkshopBox(ctx, ypos, true);
                break;
            case 50:
            case 29: // non-storage clothes
                ypos = this.renderGear(ctx, ypos, true);
                break;
            case 30: // cloud
                ypos = this.renderCloud(ctx, ypos, true);
                break;
            case 33: // fisher
                ypos = this.renderFisher(ctx, ypos, true);
                break;
            case 35: // workshop key
                ypos = this.renderKey(ctx, ypos, true);
                break;
            case 39: // tire
                ypos = this.renderTire(ctx, ypos, true);
                break;
            case 40: // melee
                ypos = this.renderMelee(ctx, ypos, true);
                break;
            case 44: // handcuff key
                ypos = this.renderHandcuffKey(ctx, ypos, true);
                break;
            case 47: // shirt
                ypos = this.renderShirt(ctx, ypos, true);
                break;
            case 49: // glasses
                ypos = this.renderGlasses(ctx, ypos, true);
                break;
            case 51: // mask
                ypos = this.renderMask(ctx, ypos, true);
                break;
        }
        return ypos;
    }
    const imageSize = 32;
    this.renderBase = function (ctx, ypos, final = false, onlyCalc = false)
    {
        var sizeTxt = `${this.currentItem.SizeX}x${this.currentItem.SizeY}`;
        var typeTxt = `${this.currentItem.Type}`;
        var rarityTxt = `${this.currentItem.Rarity}`;
        ctx.fillStyle = "#000000";
        ctx.font = C.popupDescTextSize.toString() + 'px Segoe UI';
        var len1 = TextMeasurement.height(ctx, sizeTxt, C.popupDescTextSize);
        var len2 = TextMeasurement.height(ctx, typeTxt, C.popupDescTextSize);
        var len3 = TextMeasurement.height(ctx, rarityTxt, C.popupDescTextSize);
        var xpos = this.posX + this.margin;
        ypos += this.margin;
        if (!onlyCalc)
        {
            var img = new Image(imageSize, imageSize);
            img.src = C.statIconPrefix + "SizeX.svg";
            ctx.drawImage(img, xpos, ypos, imageSize, imageSize);
            ctx.fillText(sizeTxt, xpos + imageSize + this.margin / 2, ypos + imageSize - (imageSize / 2 - len1 / 2));
        }
        ypos += imageSize;
        ypos += this.margin;
        ypos += len2;
        if (!onlyCalc)
        {
            ctx.fillText(typeTxt, xpos, ypos);
        }
        ypos += this.margin;
        ypos += len3;
        if (!onlyCalc)
        {
            ctx.fillText(rarityTxt, xpos, ypos);
        }
        ypos += this.margin;
        return ypos;
    }
    this.renderUseable = function (ctx, ypos, final = false, onlyCalc = false)
    {
        return ypos;
    }
    this.renderGun = function (ctx, ypos, final = false, onlyCalc = false)
    {
        return ypos;
    }
    this.renderAttachment = function (ctx, ypos, final = false, onlyCalc = false)
    {
        return ypos;
    }
    this.renderMagazine = function (ctx, ypos, final = false, onlyCalc = false)
    {
        return ypos;
    }
    this.renderThrowable = function (ctx, ypos, final = false, onlyCalc = false)
    {
        return ypos;
    }
    this.renderClothing = function (ctx, ypos, final = false, onlyCalc = false)
    {
        return ypos;
    }
    this.renderStorageClothing = function (ctx, ypos, final = false, onlyCalc = false)
    {
        return ypos;
    }
    this.renderBarricade = function (ctx, ypos, final = false, onlyCalc = false)
    {
        return ypos;
    }
    this.renderStructure = function (ctx, ypos, final = false, onlyCalc = false)
    {
        return ypos;
    }
    this.renderTrap = function (ctx, ypos, final = false, onlyCalc = false)
    {
        return ypos;
    }
    this.renderSight = function (ctx, ypos, final = false, onlyCalc = false)
    {
        return ypos;
    }
    this.renderGrip = function (ctx, ypos, final = false, onlyCalc = false)
    {
        return ypos;
    }
    this.renderTactical = function (ctx, ypos, final = false, onlyCalc = false)
    {
        return ypos;
    }
    this.renderBarrel = function (ctx, ypos, final = false, onlyCalc = false)
    {
        return ypos;
    }
    this.renderConsumable = function (ctx, ypos, final = false, onlyCalc = false)
    {
        return ypos;
    }
    this.renderFuel = function (ctx, ypos, final = false, onlyCalc = false)
    {
        return ypos;
    }
    this.renderZoom = function (ctx, ypos, final = false, onlyCalc = false)
    {
        return ypos;
    }
    this.renderCharge = function (ctx, ypos, final = false, onlyCalc = false)
    {
        return ypos;
    }
    this.renderRefill = function (ctx, ypos, final = false, onlyCalc = false)
    {
        return ypos;
    }
    this.renderMap = function (ctx, ypos, final = false, onlyCalc = false)
    {
        return ypos;
    }
    this.renderHandcuff = function (ctx, ypos, final = false, onlyCalc = false)
    {
        return ypos;
    }
    this.renderBeacon = function (ctx, ypos, final = false, onlyCalc = false)
    {
        return ypos;
    }
    this.renderFarm = function (ctx, ypos, final = false, onlyCalc = false)
    {
        return ypos;
    }
    this.renderGenerator = function (ctx, ypos, final = false, onlyCalc = false)
    {
        return ypos;
    }
    this.renderLibrary = function (ctx, ypos, final = false, onlyCalc = false)
    {
        return ypos;
    }
    this.renderStorage = function (ctx, ypos, final = false, onlyCalc = false)
    {
        return ypos;
    }
    this.renderTank = function (ctx, ypos, final = false, onlyCalc = false)
    {
        return ypos;
    }
    this.renderWorkshopBox = function (ctx, ypos, final = false, onlyCalc = false)
    {
        return ypos;
    }
    this.renderGear = function (ctx, ypos, final = false, onlyCalc = false)
    {
        return ypos;
    }
    this.renderCloud = function (ctx, ypos, final = false, onlyCalc = false)
    {
        return ypos;
    }
    this.renderFisher = function (ctx, ypos, final = false, onlyCalc = false)
    {
        return ypos;
    }
    this.renderKey = function (ctx, ypos, final = false, onlyCalc = false)
    {
        return ypos;
    }
    this.renderTire = function (ctx, ypos, final = false, onlyCalc = false)
    {
        return ypos;
    }
    this.renderMelee = function (ctx, ypos, final = false, onlyCalc = false)
    {
        return ypos;
    }
    this.renderHandcuffKey = function (ctx, ypos, final = false, onlyCalc = false)
    {
        return ypos;
    }
    this.renderShirt = function (ctx, ypos, final = false, onlyCalc = false)
    {
        return ypos;
    }
    this.renderGlasses = function (ctx, ypos, final = false, onlyCalc = false)
    {
        return ypos;
    }
    this.renderMask = function (ctx, ypos, final = false, onlyCalc = false)
    {
        return ypos;
    }
}
const validClasses = []
/**
 * Send kit popup button callback. Sends the current inventory state to the server.
 * @param {PopupButton} btn 
 * @returns 
 */
function sendKit(btn)
{
    var popup = btn.owner;
    if (!popup)
    {
        console.log("No button owner");
        return false;
    }
    var username = popup.textboxes[0];
    var s64 = popup.textboxes[1];
    var kitname = popup.textboxes[2];
    var kitclass = popup.textboxes[3];
    if (!username || !s64 || !kitname || !kitclass) return false;
    if (username.text.length == 0 || s64.text.length !== 17 || kitname.text.length === 0 || kitclass.text.length === 0) return false;

    var kit = {
        PlayerName: username.text,
        Steam64: BigInt(s64.text),
        KitName: kitname.text,
        Class: kitclass.text,
        items: [],
        clothes: []
    }
    var req = call(kit, "VerifyKitData").done(() =>
    {
        if (req.responseJSON.Success && req.responseJSON.State && req.responseJSON.State.Valid)
        {
            for (var p = 0; p < Program.pages.pages.length; p++)
            {
                var page = Program.pages.pages[p].page;
                if (!page.isSlot || page.pageID === PAGES.PRIMARY || page.pageID === PAGES.SECONDARY)
                {
                    for (var i = 0; i < page.items.length; i++)
                    {
                        var item = page.items[i];
                        kit.items.push({ id: item.id, x: item.x, y: item.y, rotation: item.rotation, amount: item.itemData ? item.itemData.Amount : 1, page: item.pageID });
                    }
                }
                else
                {
                    var type = 0;
                    if (page.pageID === PAGES.C_PANTS)
                    {
                        type = 1;
                    }
                    else if (page.pageID === PAGES.C_VEST)
                    {
                        type = 2;
                    }
                    else if (page.pageID === PAGES.C_HAT)
                    {
                        type = 3;
                    }
                    else if (page.pageID === PAGES.C_MASK)
                    {
                        type = 4;
                    }
                    else if (page.pageID === PAGES.C_BACKPACK)
                    {
                        type = 5;
                    }
                    else if (page.pageID === PAGES.C_GLASSES)
                    {
                        type = 6;
                    }
                    else continue;
                    kit.clothes.push({ type: type, id: item.id });
                }
            }
            call(kit, "ConfirmKitData").done(() =>
            {
                if (req.responseJSON.Success && req.responseJSON.State)
                {

                    console.log(req.responseJSON.State.KitName + " submited for verification.");
                    if (window.history.replaceState)
                    {
                        window.history.replaceState(null, "", "Loadouts/Editor?kit=" + req.responseJSON.State.KitName);
                        if (Program.popup)
                            Program.popup.close();
                    }
                }
                else
                {
                    console.warn("Failed to verify kit.");
                }
            });
        }
        else
        {
            console.warn("Failed to verify kit data.");
        }
    });
}
/** @param {KeyboardEvent} event */
function keyPress(event)
{
    if (Program.popup != null && Program.popup.consumeKeys)
        Program.popup.keyPress(event);
    else if (Program.dictionary && Program.dictionary.consumeKeys)
        Program.dictionary.keyPress(event);
    else if (Program.wiki && Program.wiki.consumeKeys)
        Program.wiki.keyPress(event);
    else if (event.keyCode === 82) // r
    {
        Program.pages.propogateRotate();
    }
    else if (event.keyCode === 75) // k
    {
        openKitWindow();
    }
    else if (event.keyCode === 65 && event.shiftKey) // shift + a
    {
        if (Program.dictionary)
            Program.dictionary.open();
    }
    else if (event.keyCode === 83 && event.ctrlKey) // ctrl + s
    {
        openSaveWindow();
        if (event.preventDefault)
            event.preventDefault();
        if (event.stopPropagation)
            event.stopPropagation();
    }
    else
    {
        console.log(Program);
    }
}
/**
 * @param {JQuery.jqXHR} jqXHR
 * @param {string} textStatus
 * @param {Error} errorThrown
 */
function onSendError(jqXHR, textStatus = "", errorThrown)
{
    console.error(`Failed to post: ${textStatus}.`);
    console.error(errorThrown);
}
/**
 * @param {JQuery.jqXHR} response
 * @param {string} textStatus
 * @param {JQuery.jqXHR} jqXHR
 */
function onSendResponse(response, textStatus, jqXHR)
{
    console.info(`Post success: ${textStatus}.`);
    console.info(response);
}
/**
 * @callback AjaxSendError
 * @param {JQuery.jqXHR} jqXHR
 * @param {string} textStatus
 * @param {Error} errorThrown
 * 
 * @callback AjaxSendSuccess
 * @param {JQuery.jqXHR} response
 * @param {string} textStatus
 * @param {JQuery.jqXHR} jqXHR
 */
/**
 * @param {Object} data
 * @param {strign} handler
 * @param {AjaxSendSuccess} response
 * @param {AjaxSendError} error
 * @returns {JQuery.jqXHR}
 */
function call(data, handler, response = onSendResponse, error = onSendError)
{
    try
    {
        if (!data) data = new Object();
        return $.ajax({
            type: "POST",
            url: "/Loadouts/" + handler,
            contentType: 'application/json; charset=utf-8',
            dataType: "json",
            data: JSON.stringify(data),
            success: response,
            error: error
        });
    }
    catch (ex)
    {
        console.error(`Error posting "/${url}?handler=${handler}"`);
        console.error(data);
        console.error(ex);
        error(null, "Exception thrown", ex);
        return null;
    }
}

/**
 * Open the kit request popup.
 * @returns {void}
 */
function openKitWindow()
{
    if (Program.popup != null && (Program.popup.isOpen || Program.popup.isAnimating)) return;
    Program.popup = Program.savedPopups[0];
    Program.popup.open();
}
/**
 * Open the kit save popup.
 * @returns {void}
 */
function openSaveWindow()
{
    if (Program.popup != null && (Program.popup.isOpen || Program.popup.isAnimating)) return;
    Program.popup = Program.savedPopups[2];
    Program.popup.open();
}