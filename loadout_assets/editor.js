import * as C from "./const.js";
import { Radius, WrappedLine, CenteredTextData, roundedRect, roundedRectPath, TextMeasurement, onImageLoad, getScale, asciiToUint8Array, supportsWebp } from "./util.js";
import { Popup, PopupButton, PopupTextbox, DualSelectWidget, PopupWidget } from "./popup.js";
import { Page, SlotPage, ContainerPage, SlotCell, InventoryCell, Item, Pages } from "./page.js";
import { Dictionary, Filter } from "./dictionary.js";
import { Wiki } from "./wiki.js";
import { ContextMenu, ContextButton } from "./contextmenu.js";
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
export const blacklistedItems = [1522, 33301, 33300, 36058, 36059, 38311, 38351, 38353, 38355, 38357, 38359, 38361, 38363, 33302, 38317, 38319, 38343, 38344, 38404, 20002, ];
export var DEFAULT_FILTER;
document.body.onload = startEditor;
/**
 * @typedef {Object} StartupData
 * @property {ItemData[]} items
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
 * @property {Uint8Array} DefaultState Default state of the item
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
    /** @type {boolean} */
    webp = true
    /** @type {HTMLCanvasElement} **/
    canvas = null;
    /** @type {CanvasRenderingContext2D} **/
    context = null;
    /** @type {ContextMenu} **/
    contextMenu = null;
    /** @type {ContextMenu[]} **/
    savedContextMenus = null;
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
    keyConsumed = false;
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
    /** @type {boolean} **/
    mouseIsOutside = true;
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
        document.onmouseout = mouseLeave;
        window.onresize = resizeInt;
        this.webp = supportsWebp();
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
                    [new DualSelectWidget("USA", "RUSSIA")], true),
                new Popup("Test popup", "For testing", 
                    [new PopupButton("truncate", -1, onTruncateClick)], [new PopupTextbox("Text", 0), new PopupTextbox("Width")],
                    [new TruncateTestWidget()]
                )
            ];
        DEFAULT_FILTER = new Filter("DEFAULT", (i) =>
            i.T !== 28 && 
            i.T !== 35 && 
            i.LocalizedName !== "#NAME" && 
            !blacklistedItems.includes(i.ItemID) && 
            (isNaN(Number(i.LocalizedName)) || !isNaN(Number(i.Name))) && 
            (i.T != 1 || !i.IsTurret) &&
            (!i.Name.includes("Kiosk"))
            );
        this.savedContextMenus =
        [
            new ContextMenu("Item",
            [
                new ContextButton("Delete", disposeItem),
                new ContextButton("Edit Attachment", editAttachments, (owner) => owner.parent && owner.parent.item && owner.parent.item.T === 1)
            ])
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
                        for (var i = 0; i < Program.DATA.items.length; i++)
                        {
                            if (Program.DATA.items[i] == null)
                            {
                                Program.DATA.items.splice(i, 1);
                                i--;
                            }
                            else
                            {
                                Program.DATA.items[i].DefaultState = asciiToUint8Array(Program.DATA.items[i].DefaultState);
                            }
                        }
                        this.onMouseMoved(-127, -127);
                        Program.dictionary.items = Program.DATA.items;
                        for (var i = 0; i < Program.dictionary.filters.length; i++)
                        {
                            Program.dictionary.filters[i].countItems();
                        }
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
        if (this.contextMenu && this.contextMenu.isOpen)
            this.contextMenu.onClick(x, y);
        if (!this.mouseBtn1Consumed && Program.popup != null && Program.popup.consumeKeys && Program.popup.isOpen)
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
        this.mouseIsOutside = false;
        if (this.isLoading) return;
        this.moveConsumed = false;
        if (this.contextMenu && this.contextMenu.isOpen)
            this.contextMenu.onMouseMove(x, y);
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
        if (this.pages)
            this.pages.onRightClick(x, y);
        if (this.mouseBtn2Consumed)
        {
            event.stopPropagation();
            event.preventDefault();
        }
        else if (this.contextMenu)
        {
            this.contextMenu.close();
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


function mouseLeave()
{
    Program.onMouseMoved(-127, -127);
    Program.mouseIsOutside = true;
}

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
 * @param {PopupButton} btn 
 */
function onTruncateClick(btn)
{
    Program.context.font = "17px Segoe UI";
    Program.context.textAlign = "left";
    Program.context.fillStyle = "#ffffff";
    var width = parseInt(btn.owner.textboxes[1].text);
    var text = btn.owner.textboxes[0].text;
    var widget = btn.owner.widgets[0];
    widget.load(TextMeasurement.truncateLetters(Program.context, text, width, "..."), width);
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
    if (Program.contextMenu && Program.contextMenu.isOpen)
    {
        Program.contextMenu.render(ctx);
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
    if (btn.owner && btn.owner.parent && btn.owner.parent.dispose)
    {
        btn.owner.parent.dispose();
        return true;
    }
    else return false;
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
    else if (event.keyCode === 65) // shift + a
    {
        if (event.shiftKey)
        {
            if (Program.dictionary)
                Program.dictionary.open();
        }
        else
        {
            if (Program.popup != null && (Program.popup.isOpen || Program.popup.isAnimating)) return;
            Program.popup = Program.savedPopups[3];
            Program.popup.open();
        }
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

class TruncateTestWidget extends PopupWidget
{
    /** @type {Radius} */
    radius;
    /** @type {string} */
    text;
    /** @type {number} */
    maxWidth;
    /** @type {number} */
    lineHeight;
    constructor()
    {
        super();
        this.defaultHeight = 70;
        this.radius = new Radius(12);
        this.lineHeight = 20;
        this.type = 999;
        this.consumeKeys = false;
    }
    /**
     * @param {number} x Mouse Position X
     * @param {number} y Mouse Position Y 
     */
    onClick (x, y)
    {
        return;
    }
    /**
     * Reset to default position
     */
    reset ()
    {
        this.unload();
    }
    /**
     * @param {CanvasRenderingContext2D} ctx Rendering Context
     * @param {number} w Width
     * @param {number} h Height
     */
    updateDims (ctx, w, h)
    {
        super.updateDims(ctx, w, h);
        ctx.font = "17px Segoe UI";
    }
    /**
     * Render the popup widget at its current position.
     * @param {CanvasRenderingContext2D} ctx Rendering Context
     * @param {number} x
     * @param {number} y
     * @param {number} w Width
     * @param {number} h Height
     */
    renderAt (ctx, x, y, w, h)
    {
        super.renderAt(ctx, x, y, w, h);
        ctx.fillStyle = C.popupAccent1;
        roundedRect(ctx, x, y, w, h, this.radius, true, false);
        if (this.text && this.maxWidth)
        {
            ctx.strokeStyle = C.popupBackground;
            ctx.beginPath();
            ctx.moveTo(x + ((w - this.maxWidth) / 2), y + ((h - this.lineHeight) / 2));
            ctx.lineTo(x + ((w - this.maxWidth) / 2), y + (h / 2));
            ctx.lineTo(x + ((w + this.maxWidth) / 2), y + (h / 2));
            ctx.lineTo(x + ((w + this.maxWidth) / 2), y + ((h - this.lineHeight) / 2));
            ctx.stroke();
            ctx.font = "17px Segoe UI";
            ctx.textAlign = "left";
            ctx.fillStyle = "#ffffff";
            ctx.fillText(this.text, x + (w - this.maxWidth) / 2, y + (h - this.lineHeight - 6) / 2);
        }
        else
        {
            ctx.font = "bold 17px Segoe UI";
            ctx.textAlign = "center";
            ctx.fillStyle = "#ffffff";
            ctx.fillText("No text loaded", x + w / 2, y + CenteredTextData.centerTextHeight(ctx, "No text loaded", this.height, 17));
        }
    }

    load(text, width)
    {
        this.text = text;
        this.maxWidth = width;
        Program.invalidate();
    }
    unload()
    {
        this.text = undefined;
        this.maxWidth = undefined;
        Program.invalidate();
    }
}