import * as C from "./const.js";
import { Popup, PopupButton, PopupTextbox, DualSelectWidget, PopupWidget } from "./popup.js";
import { Radius, WrappedLine, CenteredTextData, roundedRect, roundedRectPath, TextMeasurement, onImageLoad, getScale } from "./util.js";

/*jshint esversion: 6 */
const PAGES = Object.freeze({
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
const PAGEORDER = [PAGES.HANDS, PAGES.BACKPACK, PAGES.VEST, PAGES.SHIRT, PAGES.PANTS, PAGES.PRIMARY, PAGES.SECONDARY,
PAGES.C_BACKPACK, PAGES.C_VEST, PAGES.C_SHIRT, PAGES.C_PANTS, PAGES.C_HAT, PAGES.C_MASK, PAGES.C_GLASSES];
const blacklistedItems = [1522];
document.body.onload = startEditor;
function startEditor()
{
    Program.start();
}
/**
 * @typedef {Object} StartupData
 * @property {ItemData[]} items
 */
/**
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
 */
export const Program = {
    /** @type {HTMLCanvasElement} **/
    canvas: null,
    /** @type {CanvasRenderingContext2D} **/
    context: null,
    /** @type {HTMLElement} **/
    header: null,
    /** @type {Wiki} **/
    wiki: null,
    /** @type {URLSearchParams} **/
    url: null,
    /** @type {Popup} **/
    popup: null,
    /** @type {Popup[]} **/
    savedPopups: null,
    /** @type {Dictionary} **/
    dictionary: null,
    /** @type {StartupData} **/
    DATA: null,
    /** @type {boolean} **/
    isLoading: false,
    start: function () 
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
        console.log(deleteButton);
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
        attachmentButton = new ContextButton("Edit Attachments", editAttachments);
        deleteButton = new ContextButton("Dispose", disposeItem);
        this.pages = new Pages(25, 25);
        this.pages.addSlot(PAGES.PRIMARY, "Primary", C.tileSize * 6, C.tileSize * 4, true, "primary.svg", (item) => item.item.SlotType == 1 || item.item.SlotType == 2 || item.item.SlotType == 4);
        this.pages.addSlot(PAGES.SECONDARY, "Secondary", C.tileSize * 6, C.tileSize * 4, true, "secondary.svg", (item) => item.item.SlotType == 2 || item.item.SlotType == 4);
        this.pages.addSlot(PAGES.C_HAT, "Hat", C.tileSize * 4, C.tileSize * 4, true, "hat.svg", (item) => item.item.T == 50);
        this.pages.addSlot(PAGES.C_GLASSES, "Glasses", C.tileSize * 4, C.tileSize * 4, true, "glasses.svg", (item) => item.item.T == 49);
        this.pages.addSlot(PAGES.C_MASK, "Mask", C.tileSize * 4, C.tileSize * 4, true, "mask.svg", (item) => item.item.T == 51);
        this.pages.addSlot(PAGES.C_SHIRT, "Shirt", C.tileSize * 4, C.tileSize * 4, true, "shirt.svg", (item) => item.item.T == 47);
        this.pages.addSlot(PAGES.C_VEST, "Vest", C.tileSize * 4, C.tileSize * 4, true, "vest.svg", (item) => item.item.T == 48);
        this.pages.addSlot(PAGES.C_BACKPACK, "Backpack", C.tileSize * 4, C.tileSize * 4, true, "backpack.svg", (item) => item.item.T == 45);
        this.pages.addSlot(PAGES.C_PANTS, "Pants", C.tileSize * 4, C.tileSize * 4, true, "pants.svg", (item) => item.item.T == 46);
        this.pages.addPage(PAGES.HANDS, 5, 3, "Hands", C.tileSize, true);
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
    },
    updateScale: function () 
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
    },
    tick: function ()
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
    },
    clearCanvas: function ()
    {
        this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
    },
    mouseBtn1Consumed: false,
    mouseBtn2Consumed: false,
    onClick: function (x, y)
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
    },
    moveConsumed: true,
    onMouseMoved: function (x, y)
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
    },
    time: 0.0,
    bounds: null,
    onContextMenu: function (event)
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
    },
    lastTick: 0,
    ticks: 0,
    deltaTime: 0,
    invalidateTimeRemaining: 0,
    pages: null,
    invalidated: true,
    invalidatedAfter: false,
    invalidate: function ()
    {
        this.invalidated = true;
    },
    invalidateNext: function (seconds)
    {
        if (this.invalidateTimeRemaining >= seconds) return;
        this.invalidateTimeRemaining = seconds;
    },
    invalidateAfter: function ()
    {
        this.invalidatedAfter = true;
    }
}
function resizeInt()
{
    if (Program)
    {
        Program.updateScale();
        Program.invalidate();
        Program.tick();
    }
}
function tickInt()
{
    if (Program)
        Program.tick();
}
function onClick(e)
{
    if (Program)
    {
        var bounds = Program.canvas.getBoundingClientRect();
        Program.onClick(e.clientX - bounds.left, e.clientY - bounds.top);
    }
}
function onMouseMove(e)
{
    if (Program)
    {
        var bounds = Program.canvas.getBoundingClientRect();
        Program.onMouseMoved(e.clientX - bounds.left, e.clientY - bounds.top);
    }
}
function loadKitBtn(btn)
{
    var kitname = btn.owner.textboxes[0];
    if (kitname == null || kitname.text.length == 0) return false;
    else kitname = btn.owner.textboxes[0].text;
    return loadKit(kitname);
}
function loadKit(kitname)
{
    var response = call({}, "PingWarfare").done(() =>
    {
        if (!response.responseJSON.State)
        {
            console.warn("Not connected to warfare.")
            Program.popup.close();
            Program.popup = Program.savedPopups[1];
            Program.popup.open();
            return;
        }
        var kitinfo = call({ kitName: kitname }, "GetKit").done(() =>
        {
            if (kitinfo.responseJSON.Success)
            {
                kitinfo = kitinfo.responseJSON.State;
                console.log("Loading kit " + kitinfo.Kit.Name);
                if (Program.popup != null) Program.popup.close();
                Program.pages.loadKit(kitinfo);
            } else
            {
                console.warn("Failed to receive kit info");
            }
        });
    });
    return response;
}
/**
 * 
 * @param {PopupButton} btn 
 */
function saveKit(btn)
{
    console.log(btn);
}
/**
 * 
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
function navigateToHomePage()
{
    window.location.href = "../";
}
function closePopup(btn)
{
    if (btn.owner) btn.owner.close();
    else if (Program.popup) Program.popup.close();
}
function contextOverride(event)
{
    Program.onContextMenu(event);
}
var attachmentButton = null;
var deleteButton = null;
function Pages(posX = 0, posY = 0)
{
    this.posX = posX;
    this.hoveredCell = null;
    this.posY = posY;
    this.pages = [];
    this.contextMenu = null;
    this.pickedItem = null;
    this.updateScale = function ()
    {
        if (this.contextMenu)
            this.contextMenu.updateDims(Program.context, this.contextMenu.posX, this.contextMenu.posY);
        if (this.pages.length == 0) return;
        if (this.pages.length == 1)
        {
            this.pages[0].page.changeTransform(null, this.posX, this.posY, null, null);
            this.pages[0].column = 0;
            this.pages[0].row = 0;
            return;
        }
        var canvHeight = Program.canvas.height;
        var column = 0;
        var row = 0;
        var maxWidth = 0;
        var widthOffset = 0;
        var total = this.posX;
        for (var i = 0; i < this.pages.length; i++)
        {
            var height = this.pages[i].page.totalHeight();
            var width = this.pages[i].page.gridSizeX();
            if (height + total > canvHeight)
            {
                total = height;
                var tHeight = this.posY;
                column++;
                row = 1;
                for (var j = i; j < this.pages.length; j++)
                {
                    this.pages[j].page.changeTransform(null, this.posX + widthOffset + maxWidth + (column == 1 ? C.widthMarginBetweenPages : 0), tHeight, null, null);
                    this.pages[j].row = j;
                    this.pages[j].column = column;
                    tHeight = this.pages[j].page.nextY();
                }
                widthOffset += maxWidth + C.widthMarginBetweenPages + (column == 1 ? C.widthMarginBetweenPages : 0);
                maxWidth = width;
            }
            else
            {
                var newy = row == 0 || i == 0 ? this.posY : this.pages[i - 1].page.nextY();
                this.pages[i].page.changeTransform(null, column == 0 ? this.posX : null, newy, null, null);
                this.pages[i].column = column;
                this.pages[i].row = row;
                row++;
                if (maxWidth < width) maxWidth = width;
                total += height;
            }
        }
    }
    this.getCellAtCoords = function (x, y, round = false)
    {
        for (var i = 0; i < this.pages.length; i++)
        {
            var cell = this.pages[i].page.getCellByCoords(x, y, round);
            if (cell) return cell;
        }
        return false;
    }
    this.render = function (ctx)
    {
        for (var i = 0; i < this.pages.length; i++)
        {
            this.pages[i].page.renderBackground(ctx);
        }
        if (this.pickedItem != null && this.pickedItem.isOrphan)
            this.pickedItem.render(ctx);
        for (var i = 0; i < this.pages.length; i++)
        {
            this.pages[i].page.renderForeground(ctx);
        }
        if (this.contextMenu)
            this.contextMenu.render(ctx);
    }
    this.onClick = function (x, y)
    {
        if (this.contextMenu)
        {
            this.contextMenu = null;
            Program.mouseBtn1Consumed = true;
            return;
        }
        if (x < this.posX || y < this.posY) return;
        if (this.pickedItem != null)
        {
            this.pickedItem.onClick(x, y);
            if (Program.mouseBtn1Consumed) return;
        }
        for (var i = 0; i < this.pages.length; i++)
        {
            var cell = this.pages[i].page.getCellByCoords(x, y);
            if (cell)
            {
                for (var j = 0; j < this.pages[i].page.items.length; j++)
                {
                    var item = this.pages[i].page.items[j];
                    if (!item.isPicked && cell.coordX >= item.x && cell.coordY >= item.y && cell.coordX < item.x + item.sizes.width && cell.coordY < item.y + item.sizes.height)
                    {
                        item.onClick(x, y);
                        if (Program.mouseBtn1Consumed) return;
                    }
                }
                if (Program.mouseBtn1Consumed)
                    Program.invalidate();
                break;
            }
        }
    }
    this.onMouseMoved = function (x, y)
    {
        if (this.pickedItem)
            this.pickedItem.onMouseMoved(x, y);
        if (x > this.posX && y > this.posY)
        {
            for (var i = 0; i < this.pages.length; i++)
            {
                var cell = this.pages[i].page.getCellByCoords(x, y);
                for (var t = 0; t < this.pages[i].page.items.length; t++)
                {
                    if (this.pages[i].page.items[t].onMouseMoved(x, y)) break;
                }
                if (cell)
                {
                    cell.color = C.hoveredCellColor;
                    if (this.hoveredCell != null && this.hoveredCell != cell)
                    {
                        this.hoveredCell.color = C.defaultCellColor;
                    }
                    this.hoveredCell = cell;
                    Program.moveConsumed = true;
                    Program.invalidate();
                    return true;
                }
            }
        }
        if (this.hoveredCell != null)
        {
            this.hoveredCell.color = C.defaultCellColor;
            this.hoveredCell = null;
            Program.moveConsumed = true;
            Program.invalidate();
        }
        return false;
    }
    this.loadKit = function (kitdata = { Kit: { Items: [], Clothes: [] } })
    {
        // clear item pages.
        for (var i = this.pages.length - 1; i >= 0; i--)
        {
            if (this.pages[i].page.type != 1 && this.pages[i].page.pageID != PAGES.HANDS)
            {
                this.pages.splice(i, 1);
            }
            else
            {
                this.pages[i].page.items.splice(0);
            }
        }
        for (var i = 0; i < kitdata.Kit.Clothes.length; i++)
        {
            if (kitdata.Kit.Clothes[i].ID == 0) continue;
            var pageID;
            var newPageID;
            if (kitdata.Kit.Clothes[i].type == 0) // shirt
            {
                pageID = PAGES.C_SHIRT;
                newPageID = PAGES.SHIRT;
            }
            else if (kitdata.Kit.Clothes[i].type == 1) // pants
            {
                pageID = PAGES.C_PANTS;
                newPageID = PAGES.PANTS;
            }
            else if (kitdata.Kit.Clothes[i].type == 2) // vest
            {
                pageID = PAGES.C_VEST;
                newPageID = PAGES.VEST;
            }
            else if (kitdata.Kit.Clothes[i].type == 3) // hat
            {
                pageID = PAGES.C_HAT;
                newPageID = NaN;
            }
            else if (kitdata.Kit.Clothes[i].type == 4) // mask
            {
                pageID = PAGES.C_MASK;
                newPageID = NaN;
            }
            else if (kitdata.Kit.Clothes[i].type == 5) // backpack
            {
                pageID = PAGES.C_BACKPACK;
                newPageID = PAGES.BACKPACK;
            }
            else if (kitdata.Kit.Clothes[i].type == 6) // glasses
            {
                pageID = PAGES.C_GLASSES;
                newPageID = NaN;
            }
            else continue;
            slotSearch:
            for (var p = 0; p < this.pages.length; p++)
            {
                if (this.pages[p].page.pageID == pageID)
                {
                    for (var d = 0; d < Program.DATA.items.length; d++)
                    {
                        if (Program.DATA.items[d] == null) continue;
                        if (Program.DATA.items[d].ItemID == kitdata.Kit.Clothes[i].ID)
                        {
                            var data = Program.DATA.items[d];
                            this.pages[p].page.addItem(new Item(data.ItemID, 0, 0, data.SizeX, data.SizeY, 0, data.LocalizedName, data.LocalizedDescription, p, data));
                            if (!isNaN(newPageID))
                            {
                                var newpage = this.addPage(newPageID, data.Width, data.Height, data.LocalizedName, tileSize, true, null);
                                newpage.page.slotOwner = pageID;
                                this.pages[p].page.pageChild = newPageID;
                            }
                            break slotSearch;
                        }
                    }
                }
            }
        }
        for (var i = 0; i < kitdata.Kit.Items.length; i++)
        {
            var kititem = kitdata.Kit.Items[i];
            var data;
            for (var d = 0; d < Program.DATA.items.length; d++)
            {
                if (Program.DATA.items[d] == null) continue;
                if (Program.DATA.items[d].ItemID == kititem.ID)
                {
                    data = Program.DATA.items[d];
                    break;
                }
            }
            for (var p = 0; p < this.pages.length; p++)
            {
                if (this.pages[p].page.pageID == kititem.page)
                {
                    if (this.checkCoords(p, kititem.x, kititem.y))
                    {
                        if (!this.pages[p].page.addItem(new Item(kititem.ID, kititem.x, kititem.y, data.SizeX,
                            data.SizeY, kititem.rotation, data.LocalizedName, data.LocalizedDescription, p, data)))
                            console.warn(`${kititem.ID} failed to add ^^`);
                        break;
                    }
                }
            }
        }
        this.sortPages();
        Program.updateScale();
        Program.invalidate();
    }
    this.removeItem = function (page = 0, x = 0, y = 0)
    {
        if (this.pages.length <= page)
        {
            console.warn(`Tried to remove item with out of range page: ${page}.`);
            return false;
        }
        return this.pages[page].page.removeItem(x, y);
    }
    this.addItem = function (item, itemChange = (item) => { })
    {
        if (this.pages.length <= item.page)
        {
            console.warn(`Tried to add item with out of range page: ${page}.`);
            return false;
        }
        return this.pages[item.page].page.addItem(item, itemChange);
    };
    this.propogateRotate = function ()
    {
        if (this.pickedItem != null)
            this.pickedItem.rotateOnce();
    }
    this.iconCache = new Map();
    this.moveItem = function (item, x, y, rotation, page, sizes)
    {
        if (!this.verifyMove(item, x, y, rotation, page, sizes))
            return false;
        if (item.page != page)
        {
            if (item.page < 0)
            {
                var pg = this.pages[page].page;
                item.x = x;
                item.y = y;
                item.page = page;
                item.isOrphan = false;
                pg.items.push(item);
                if (pg.type === 1)
                {
                    item.inSlot = true;
                    item.rotation = 0;
                    item.tileSizeX = pg.tileSizeX;
                    item.tileSizeY = pg.tileSizeY;
                    item.sizes = item.getSizes(0);
                    item.pendingRotation = 0;
                    item.pendingSizes = item.sizes;
                    item.page = page;
                    if (!item.item) return true;
                    var newPageID = NaN;
                    if (pg.pageID == PAGES.C_SHIRT) // shirt
                        newPageID = PAGES.SHIRT;
                    else if (pg.pageID === PAGES.C_PANTS) // pants
                        newPageID = PAGES.PANTS;
                    else if (pg.pageID === PAGES.C_VEST) // vest
                        newPageID = PAGES.VEST;
                    else if (pg.pageID === PAGES.C_BACKPACK) // backpack
                        newPageID = PAGES.BACKPACK;
                    if (!isNaN(newPageID))
                    {
                        var newpage = this.addPage(newPageID, item.item.Width, item.item.Height, item.item.LocalizedName, tileSize, true, null);
                        newpage.page.slotOwner = pg.pageID;
                        pg.pageChild = newPageID;
                        this.sortPages();
                        this.updateScale();
                    }
                    return true;
                }
                else
                {
                    item.inSlot = false;
                    item.rotation = rotation;
                    item.tileSizeX = pg.tileSize;
                    item.tileSizeY = pg.tileSize;
                    item.sizes = item.getSizes(item.rotation);
                    item.pendingRotation = item.rotation;
                    item.pendingSizes = item.sizes;
                    return true;
                }
            }
            else
            {
                var pg = this.pages[page].page;
                var oldpg = this.pages[item.page].page;
                for (var i = 0; i < oldpg.items.length; i++) // clear from other page
                {
                    var l_item = oldpg.items[i];
                    if (l_item.x == item.x && l_item.y == item.y) oldpg.items.splice(i, 1);
                }
                if (pg.type === 1) // slot
                {
                    item.x = x;
                    item.y = y;
                    item.tileSizeX = pg.tileSizeX;
                    item.tileSizeY = pg.tileSizeY;
                    item.inSlot = true;
                    item.rotation = 0;
                    item.sizes = item.getSizes(0);
                    item.pendingRotation = 0;
                    item.pendingSizes = item.sizes;
                    item.page = page;
                    pg.items.push(item);
                    if (!item.item) return true;
                    var newPageID = NaN;
                    if (pg.pageID == PAGES.C_SHIRT) // shirt
                        newPageID = PAGES.SHIRT;
                    else if (pg.pageID === PAGES.C_PANTS) // pants
                        newPageID = PAGES.PANTS;
                    else if (pg.pageID === PAGES.C_VEST) // vest
                        newPageID = PAGES.VEST;
                    else if (pg.pageID === PAGES.C_BACKPACK) // backpack
                        newPageID = PAGES.BACKPACK;
                    if (!isNaN(newPageID))
                    {
                        var newpage = this.addPage(newPageID, item.item.Width, item.item.Height, item.item.LocalizedName, tileSize, true, null);
                        newpage.page.slotOwner = pg.pageID;
                        pg.pageChild = newPageID;
                        this.sortPages();
                        this.updateScale();
                    }
                    return true;
                }
                else // page
                {
                    item.tileSizeX = pg.tileSize;
                    item.tileSizeY = pg.tileSize;
                    item.page = page;
                    item.inSlot = false;
                    pg.items.push(item);
                    if (oldpg.type === 1 && oldpg.pageChild && oldpg.pageChild != pg.pageID)
                    {
                        for (var i = 0; i < this.pages.length; i++)
                        {
                            if (this.pages[i].page.pageID === oldpg.pageChild)
                            {
                                if (page > i) page--;
                                this.pages.splice(i, 1);
                                oldpg.pageChild = null;
                                this.updateScale();
                                this.sortPages();
                                break;
                            }
                        }
                    }
                }
            }
        }
        item.x = x;
        item.y = y;
        item.rotation = rotation;
        item.sizes = item.getSizes(item.rotation);
        item.pendingRotation = item.rotation;
        item.pendingSizes = item.sizes;
        item.page = page;
        return true;
    }
    this.verifyMove = function (item, x, y, rotation, page, sizes)
    {
        if (!this.checkCoords(page, x, y))
            return false;
        var dstPage = this.pages[page].page;
        if (dstPage.canEquip != null && !dstPage.canEquip(item)) return false; // check validate method
        if (dstPage.type == 1) // is slot
        {
            if (!dstPage.cells[x][y].occupied || (dstPage.items.length > 0 && dstPage.items[0] === item))
                return true;
            else return false;
        }
        // trying to move an item to its page
        if (item.page > 0 && dstPage.slotOwner && dstPage.slotOwner == this.pages[item.page].page.pageID)
        {
            return false;
        }
        var bottomX = x + sizes.width;
        var bottomY = y + sizes.height;
        if (!this.checkCoords(page, bottomX - 1, bottomY - 1))
            return false;
        // checks every cell within the item's bounds to see if it is occupied.
        for (var x1 = x; x1 < bottomX; x1++)
        {
            for (var y1 = y; y1 < bottomY; y1++)
            {
                if (dstPage.cells[x1][y1].occupied)
                {
                    if (item.isOrphan)
                        return false;
                    var found = false;
                    if (!item.inSlot)
                    {
                        var bottomX2 = item.x + item.sizes.width;
                        var bottomY2 = item.y + item.sizes.height;
                        lbl2: // allow collision with self (checks for each of the cells in items current position to see if they equal the cell being checked)
                        for (var x2 = item.x; x2 < bottomX2; x2++)
                        {
                            for (var y2 = item.y; y2 < bottomY2; y2++)
                            {
                                if (this.pages[item.page].page.cells[x2][y2] == dstPage.cells[x1][y1])
                                {
                                    found = true;
                                    break lbl2;
                                }
                            }
                        }
                    }
                    if (!found)
                        return false;
                }
            }
        }
        return true;
    }
    this.checkCoords = function (page, x, y)
    {
        return page >= 0 && x >= 0 && y >= 0 && this.pages.length > page && this.pages[page].page.cells.length > x && this.pages[page].page.cells[x].length > y;
    }
    this.addPage = function (page = {
        page: 0,
        pageID: 0,
        posX: 0,
        posY: 0,
        sizeX: 1,
        sizeY: 1,
        title: "",
        tileSize: 128,
        canEquip: (item) => true
    }, holdUpdate = false)
    {
        var page = { page: page, column: 0, row: 0 };
        this.pages.push(page);
        if (!holdUpdate)
            this.updateScale();
        return page;
    }
    this.addPage = function (pageID = 0, sizeX = 1, sizeY = 1, title = "PAGE", tileSize = 128, holdUpdate = false, addConstraint = (item) => true)
    {
        var page = { page: new Page(this.pages.length, pageID, this.posX, this.posY, sizeX, sizeY, title, tileSize, addConstraint), column: 0, row: 0 };
        this.pages.push(page);
        if (!holdUpdate)
            this.updateScale();
        return page;
    }
    this.addSlot = function (pageID = 0, title = "PAGE", tileSizeX = 128, tileSizeY = 128, holdUpdate = false, addConstraint = (item) => true)
    {
        this.pages.push({ page: new SlotPage(this.pages.length, pageID, this.posX, this.posY, title, tileSizeX, tileSizeY, addConstraint), column: 0, row: 0 });
        if (!holdUpdate)
            this.updateScale();
    }
    this.sortPages = function ()
    {
        var remaining = this.pages;
        this.pages = [];
        for (var i = 0; i < PAGEORDER.length; i++)
        {
            var pageID = PAGEORDER[i];

            for (var p = remaining.length - 1; p >= 0; p--)
            {
                if (remaining[p].page.pageID === pageID)
                {
                    var newIndex = this.pages.length;
                    this.pages.push(remaining[p]);
                    for (var x = 0; x < this.pages[newIndex].page.cells.length; x++)
                    {
                        for (var y = 0; y < this.pages[newIndex].page.cells[x].length; y++)
                        {
                            this.pages[newIndex].page.cells[x][y].page = newIndex;
                        }
                    }
                    for (var t = 0; t < this.pages[newIndex].page.items.length; t++)
                    {
                        this.pages[newIndex].page.items[t].page = newIndex;
                    }
                    this.pages[newIndex].page.page = newIndex;
                    remaining.splice(p, 1);
                }
            }
        }
        for (var i = 0; i < remaining.length; i++)
        {
            for (var x = 0; x < remaining[i].page.cells.length; x++)
            {
                for (var y = 0; y < remaining[i].page.cells[x].length; y++)
                {
                    remaining[i].page.cells[x][y].page = this.pages.length;
                }
            }
            for (var x = 0; x < remaining[i].page.items.length; x++)
            {
                remaining[i].page.items[x].page = this.pages.length;
            }
            this.pages.push(remaining[i]);
        }
    }
    this.cell = function (page, x, y)
    {
        if (!this.checkCoords(page, x, y)) return false;
        else return this.pages[page].page.cells[x][y];
    }
    this.onRightClick = function (x, y)
    {
        if (this.pickedItem != null)
        {
            Program.mouseBtn2Consumed = true;
            return;
        }
        if (this.contextMenu)
            this.contextMenu = null;
        p:
        for (var p = 0; p < this.pages.length; p++)
        {
            var pg = this.pages[p].page;
            for (var i = 0; i < pg.items.length; i++)
            {
                var item = pg.items[i];
                var bounds = item.isPointInside(x, y);
                if (bounds)
                {
                    var btns = [];
                    if (item.item && item.item.T === 1)
                        btns.push(attachmentButton);

                    btns.push(deleteButton);
                    this.contextMenu = new ContextMenu("Item", btns);
                    this.contextMenu.item = item;
                    this.contextMenu.updateDims(Program.context, x, y);
                    Program.mouseBtn2Consumed = true;
                    Program.invalidate();
                    break p;
                }
            }
        }
    }
}
function editAttachments(btn)
{
    if (btn.owner && btn.owner.item)
    {
        return true;
    }
    else return false;
}
function disposeItem(btn)
{
    if (btn.owner && btn.owner.item)
    {
        btn.owner.item.delete();
        return true;
    }
    else return false;
}
function SlotPage(page = 0, pageID = 0, posX = 0, posY = 0, title = "PAGE", tileSizeX = 128, tileSizeY = 128, background = "none", canEquip = (item) => true)
{
    this.type = 1;
    this.page = page;
    this.pageID = pageID;
    this.posX = posX;
    this.posY = posY;
    this.canEquip = canEquip;
    this.tileSizeX = tileSizeX;
    this.tileSizeY = tileSizeY;
    this.sizeX = 1;
    this.sizeY = 1;
    this.title = title;
    this.items = [];
    this.radius = new Radius(C.titleRadius);
    this.backgroundIconSrc = background;
    this.pageChild = null;
    this.gridSizeY = function ()
    {
        return this.tileSizeY;
    }
    this.gridSizeX = function ()
    {
        return this.tileSizeX;
    }
    this.getNotation = function (x, y)
    {
        return this.title + "!A1";
    }
    this.titlePosX = this.posX;
    this.titleSizeX = this.tileSizeX;
    this.titleSizeY = C.titleSize;
    this.gridStartY = this.posY + this.titleSizeY + C.titleToGridDistance;
    this.totalHeight = function ()
    {
        return this.titleSizeY + C.titleToGridDistance + this.tileSizeY + C.heightMarginBetweenPages;
    }
    this.nextY = function ()
    {
        return this.gridStartY + this.tileSizeY + C.heightMarginBetweenPages;
    }
    this.nextX = function ()
    {
        return this.posX + this.tileSizeX;
    }
    this.cells = [[new SlotCell(this.page, this.posX, this.gridStartY, this.tileSizeX, this.tileSizeY, this.backgroundIconSrc)]];
    this.renderBackground = function (ctx)
    {
        ctx.globalAlpha = 0.5;
        ctx.fillStyle = "#0f0f0f";
        roundedRect(ctx, this.titlePosX, this.posY, this.titleSizeX, this.titleSizeY, this.radius, true, false);
        ctx.globalAlpha = 1.0;
        ctx.textAlign = 'center';
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 17px Segoe UI';
        ctx.fillText(this.title, this.titlePosX + this.titleSizeX / 2, this.posY + this.titleSizeY / 2 + 5.5);
        this.cells[0][0].render(ctx);
    }
    this.renderForeground = function (ctx)
    {
        for (var i = 0; i < this.items.length; i++)
        {
            this.items[i].render(ctx);
        }
    }
    this.addItem = function (item = {
        id: 0,
        x: 0,
        y: 0,
        sizeX: 1,
        sizeY: 1,
        rotation: 0,
        name: "#NAME",
        description: "#DESC",
        tileSize: 128,
        page: 0
    }, itemChange = (item) => { })
    {
        if (this.items.length > 0)
        {
            console.warn(`Can't have more than one item in slot ${this.title}.`)
        }
        if (item == null)
        {
            console.warn(`Tried to add undefined item to page ${this.title}.`);
            return false;
        }
        if (Program.pages.checkCoords(this.page, item.x, item.y))
        {
            item.inSlot = true;
            item.tileSizeX = this.tileSizeX;
            item.tileSizeY = this.tileSizeY;
            itemChange(item);
            this.cells[0][0].occupied = true;
            this.items.push(item);
            Program.invalidate();
            return item;
        }
        else
        {
            console.warn(`Tried to add and item to an invalid spot.`);
            return false;
        }
    }
    this.removeItem = function ()
    {
        if (this.items.length < 1) return false;
        this.items[0].inSlot = false;
        this.items.splice(0, 1);
        return true;
    }
    this.getCellByCoords = function (x, y, round = false)
    {
        if (x < this.posX || x > this.posX + this.tileSizeX) return false;
        if (y < this.gridStartY || y > this.gridStartY + this.tileSizeY) return false;
        return this.cells[0][0];
    }
    this.changeTransform = function (tileSizeX = -1, posX = -1, posY = -1, sizeX = -1, sizeY = -1, tileSizeY = -1)
    {
        var tileSizeXChange = tileSizeX != null && tileSizeX > -1 && tileSizeX != this.tileSizeX;
        if (!tileSizeX) tileSizeX = this.tileSizeX;
        else if (tileSizeXChange) this.tileSizeY = tileSizeY;
        var tileSizeYChange = tileSizeY != null && tileSizeY > -1 && tileSizeY != this.tileSizeY;
        if (!tileSizeY) tileSizeY = this.tileSizeY;
        else if (tileSizeYChange) this.tileSizeY = tileSizeY;
        var xChange = posX != null && posX > -1 && posX != this.posX;
        if (posX == null) posX = this.posX;
        else if (xChange)
        {
            this.posX = posX;
            this.titlePosX = posX;
            this.cells[0][0].posX = posX;
        }
        var yChange = posY != null && posY > -1 && posY != this.posY;
        if (posY == null) posY = this.posY;
        else if (yChange)
        {
            this.posY = posY;
            this.gridStartY = this.posY + this.titleSizeY + C.titleToGridDistance;
            this.cells[0][0].posY = this.gridStartY;
        }
        if (tileSizeXChange || tileSizeYChange || xChange || yChange) Program.invalidate();
    }
    this.changeTitle = function (title = "")
    {
        if (this.title == title) return;
        this.title = title;
        Program.invalidate();
    }
}
function Page(page = 0, pageID = 0, posX = 0, posY = 0, sizeX = 4, sizeY = 3, title = "PAGE", tileSize = 128, canEquip = (item) => true)
{
    this.type = 0;
    this.page = page;
    this.canEquip = canEquip;
    this.pageID = pageID;
    this.posX = posX;
    this.posY = posY;
    this.tileSize = tileSize;
    this.sizeX = sizeX;
    this.sizeY = sizeY;
    this.title = title;
    this.slotOwner = null;
    this.cells = [];
    this.items = [];
    this.gridSizeY = function ()
    {
        return this.sizeY * (this.tileSize + C.margin);
    }
    this.gridSizeX = function ()
    {
        return this.sizeX * (this.tileSize + C.margin);
    }
    this.getNotation = function (x, y)
    {
        return this.title + "!" + C.alphabet[x] + (y + 1).toString();
    }
    this.titlePosX = this.posX;
    this.titleSizeX = this.gridSizeX();
    this.titleSizeY = C.titleSize;
    this.gridStartY = this.posY + this.titleSizeY + C.titleToGridDistance;
    this.totalHeight = function ()
    {
        return this.titleSizeY + C.titleToGridDistance + this.sizeY * (this.tileSize + C.margin) + C.heightMarginBetweenPages;
    }
    this.nextY = function ()
    {
        return this.gridStartY + this.sizeY * (this.tileSize + C.margin) + C.heightMarginBetweenPages;
    }
    this.nextX = function ()
    {
        return this.posX + this.sizeX * (this.tileSize + C.margin);
    }
    for (var x = 0; x < this.sizeX; x++)
    {
        var cells = [];
        var xpos = this.posX + (x * (this.tileSize + C.margin));
        for (var y = 0; y < this.sizeY; y++)
        {
            cells.push(new InventoryCell(this.page, xpos, this.gridStartY + (y * (this.tileSize + C.margin)), this.tileSize, this.getNotation(x, y), x, y));
        }
        this.cells.push(cells);
    }
    this.renderBackground = function (ctx)
    {
        ctx.globalAlpha = 0.5;
        ctx.fillStyle = "#0f0f0f";
        roundedRect(ctx, this.titlePosX, this.posY, this.titleSizeX, this.titleSizeY, C.titleRadius, true, false);
        ctx.globalAlpha = 1.0;
        ctx.textAlign = 'center';
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 17px Segoe UI';
        ctx.fillText(this.title, this.titlePosX + this.titleSizeX / 2, this.posY + this.titleSizeY / 2 + 5.5, this.titleSizeX);
        for (var x = 0; x < this.sizeX; x++)
        {
            if (!this.cells[x]) continue;
            for (var y = 0; y < this.sizeY; y++)
            {
                if (!this.cells[y]) continue;
                this.cells[x][y].render(ctx);
            }
        }
    }
    this.renderForeground = function (ctx)
    {
        for (var i = 0; i < this.items.length; i++)
        {
            this.items[i].render(ctx);
        }
    }
    this.addItem = function (item = {
        id: 0,
        x: 0,
        y: 0,
        sizeX: 1,
        sizeY: 1,
        rotation: 0,
        name: "#NAME",
        description: "#DESC",
        tileSize: 128,
        page: 0
    }, itemChange = (item) => { })
    {
        if (item == null)
        {
            console.warn(`Tried to add undefined item to page ${this.title}`);
            return false;
        }
        if (Program.pages.checkCoords(this.page, item.x, item.y))
        {
            item.tileSizeX = this.cells[item.x][item.y].tileSizeX;
            item.tileSizeY = this.cells[item.x][item.y].tileSizeY;
            item.inSlot = false;
            itemChange(item);
            this.items.push(item);
            Program.invalidate();
            return item;
        }
        else
        {
            console.warn(`Tried to add and item to an invalid spot: ${this.page} (${this.title}), x: ${item.x}, y: ${item.y}.`);
            return false;
        }
    }
    this.removeItem = function (x = 0, y = 0)
    {
        for (var i = 0; i < this.items.length; i++)
        {
            if (this.items[i].page == this.page && this.items[i].x == x && this.items[i].y == y)
            {
                this.items[i].dispose();
                this.items.splice(i, 1);
                return true;
            }
        }
        return false;
    }
    this.getCellByCoords = function (x = 0, y = 0, round = false)
    {
        if (x < this.posX || x > this.posX + this.gridSizeX) return false;
        if (y < this.gridStartY || y > this.gridStartY + this.gridSizeY) return false;
        if (round)
        {
            var cell = this.cells[Math.round((x - this.posX) / (this.tileSize + C.margin))];
            if (cell == null)
                cell = this.cells[Math.floor((x - this.posX) / (this.tileSize + C.margin))];
            if (cell == null)
                cell = this.cells[Math.ceil((x - this.posX) / (this.tileSize + C.margin))];
            if (cell == null) return false;
            var cell2 = cell[Math.round((y - this.gridStartY) / (this.tileSize + C.margin))];
            if (cell2 == null)
                cell2 = cell[Math.floor((y - this.gridStartY) / (this.tileSize + C.margin))];
            if (cell2 == null)
                cell2 = cell[Math.ceil((y - this.gridStartY) / (this.tileSize + C.margin))];
            if (cell2 == null) return false;
            return cell2;
        }
        else
        {
            var cell = this.cells[Math.floor((x - this.posX) / (this.tileSize + C.margin))];
            if (cell == null) return false;
            cell = cell[Math.floor((y - this.gridStartY) / (this.tileSize + C.margin))];
            if (cell == null) return false;
            else return cell;
        }
    }
    this.changeTransform = function (tileSize = -1, posX = -1, posY = -1, sizeX = -1, sizeY = -1, tileSizeY = -1)
    {
        var tileSizeChange = tileSize != null && tileSize > -1 && tileSize != this.tileSize;
        if (!tileSize) tileSize = this.tileSize;
        else if (tileSizeChange) this.tileSize = tileSize;
        var xChange = posX != null && posX > -1 && posX != this.posX;
        if (posX == null) posX = this.posX;
        else if (xChange)
        {
            this.posX = posX;
            this.titlePosX = posX;
        }
        var yChange = posY != null && posY > -1 && posY != this.posY;
        if (posY == null) posY = this.posY;
        else if (yChange)
        {
            this.posY = posY;
            this.gridStartY = this.posY + this.titleSizeY + C.titleToGridDistance;
        }
        var sizeYChange = sizeY != null && sizeY > -1 && (cells.length > 0 && cells[0].length != sizeY);
        var sizeXChange = sizeX != null && sizeX > -1 && cells.length != sizeX;
        if (sizeXChange)
        {
            if (this.sizeX < sizeX)
            {
                for (var x = this.sizeX; x < sizeX; x++)
                {
                    var cells = [];
                    for (var y = 0; y < this.sizeY; y++)
                    {
                        cells.push(new InventoryCell(this.page, x, y, tileSize, tileSize, this.getNotation(x, y), x, y));
                    }
                    this.cells.push(cells);
                }
            }
            else
            {
                for (var x = sizeX; x < this.sizeX; x++)
                {
                    for (var y = 0; y < this.sizeY; y++)
                    {
                        cells[x][y] = null;
                    }
                    cells[x] = null
                }
                cells.slice(0, sizeX);
            }
            this.sizeX = sizeX;
        }
        if (sizeYChange)
        {
            if (this.sizeY < sizeY)
            {
                for (var x = 0; x < this.sizeX; x++)
                {
                    var cells = [];
                    for (var y = this.sizeY; y < sizeY; y++)
                    {
                        cells.push(new InventoryCell(this.page, x, y, tileSize, tileSize, this.getNotation(x, y), x, y));
                    }
                    this.cells.push(cells);
                }
            }
            else
            {
                for (var x = 0; x < this.sizeX; x++)
                {
                    for (var y = sizeY; y < this.sizeY; y++)
                    {
                        cells[x][y] = null;
                    }
                    cells[x].slice(0, sizeY);
                }
            }
            this.sizeY = sizeY;
        }
        if (xChange)
        {
            for (var x = 0; x < this.sizeX; x++)
            {
                var xpos = this.posX + (x * (this.tileSize + C.margin));
                for (var y = 0; y < this.sizeY; y++)
                {
                    this.cells[x][y].posX = xpos;
                }
            }
        }
        if (yChange)
        {
            for (var y = 0; y < this.sizeY; y++)
            {
                var ypos = this.gridStartY + (y * (this.tileSize + C.margin));
                for (var x = 0; x < this.sizeX; x++)
                {
                    this.cells[x][y].posY = ypos;
                }
            }
        }
        if (tileSizeChange || xChange || yChange || sizeXChange || sizeYChange) Program.invalidate();
    }
    this.changeTitle = function (title = "")
    {
        if (this.title == title) return;
        this.title = title;
        Program.invalidate();
    }
}
function InventoryCell(page = 0, posX = 0, posY = 0, tileSize = 128, notation = "A1", coordX = 0, coordY = 0)
{
    this.type = 0;
    this.page = page;
    this.coordX = coordX;
    this.coordY = coordY;
    this.notation = notation;
    this.tileSizeX = tileSize;
    this.tileSizeY = tileSize;
    this.posX = posX;
    this.posY = posY;
    this.radius = new Radius(C.radius);
    this.color = C.defaultCellColor;
    this.occupied = false;
    this.checkOccupied = function ()
    {
        if (Program.pages == null || Program.pages.pages == null || Program.pages.pages[this.page] == null) return false;
        for (var i = 0; i < Program.pages.pages[this.page].page.items.length; i++)
        {
            var item = Program.pages.pages[this.page].page.items[i];
            if (item.x === this.coordX && item.y === this.coordY) return true;
            var bottomX = item.x + item.sizes.width;
            var bottomY = item.y + item.sizes.height;
            if (this.coordX > item.x && this.coordX < bottomX && this.coordY > item.y && this.coordY < bottomY) return true;
        }
        return false;
    }
    this.render = function (ctx)
    {
        roundedRectPath(ctx, this.posX, this.posY, this.tileSizeX, this.tileSizeY, this.radius);
        ctx.globalAlpha = 0.5;
        ctx.fillStyle = this.occupied ? C.occupiedCellColor : this.color;
        ctx.fill();
        ctx.globalAlpha = 1.0;
        ctx.strokeStyle = "#000000";
        ctx.stroke();
    }
}
function SlotCell(page = 0, posX = 0, posY = 0, tileSizeX = 128, tileSizeY = 128, background = "none")
{
    this.type = 1;
    this.page = page;
    this.coordX = 0;
    this.coordY = 0;
    this.notation = "A1";
    this.tileSizeX = tileSizeX;
    this.tileSizeY = tileSizeY;
    this.backgroundIconSrc = C.statIconPrefix + background;
    this.background = null;
    this.posX = posX;
    this.posY = posY;
    this.radius = new Radius(C.radius);
    this.color = C.defaultCellColor;
    this.occupied = false;
    this.getIcon = function ()
    {
        if (this.dontRequestImage || this.backgroundIconSrc === null || this.backgroundIconSrc === "none") return;
        if (!Program.pages.pages[this.page]) return;
        var id = Program.pages.pages[this.page].page.pageID * -1;
        this.background = Program.pages.iconCache.get(id);
        if (!this.background)
        {
            this.background = new Image(this.tileSizeX, this.tileSizeY);
            this.background.id = id;
            this.background.onload = onImageLoad;
            this.background.src = this.backgroundIconSrc;
            Program.pages.iconCache.set(this.background.id, this.background);
        }
    }
    this.getIcon();
    this.checkOccupied = function ()
    {
        if (!Program.pages.checkCoords(this.page, 0, 0)) return false;
        if (!Program.pages.pages[this.page]) return false;
        if (Program.pages.pages[this.page].page.items.length < 1) return false;
        else return true;
    }
    this.render = function (ctx)
    {
        if (!this.occupied && this.background == null && !this.dontRequestImage)
        {
            this.getIcon();
        }
        roundedRectPath(ctx, this.posX, this.posY, this.tileSizeX, this.tileSizeY, this.radius);
        ctx.globalAlpha = 0.5;
        ctx.fillStyle = this.occupied ? occupiedCellColor : this.color;
        ctx.fill();
        if (!this.occupied && this.background != null)
        {
            ctx.globalAlpha = 0.03;
            ctx.drawImage(this.background, this.posX, this.posY, this.tileSizeX, this.tileSizeY);
        }
        ctx.globalAlpha = 1.0;
        ctx.strokeStyle = "#000000";
        ctx.stroke();
    }
}
function Item(id = 0, x = 0, y = 0, sizeX = 1, sizeY = 1, rotation = 0, name = "#NAME", description = "#DESC", page = 0, itemData = null, orphan = false)
{
    this.id = id;
    this.x = x;
    this.y = y;
    this.isOrphan = orphan;
    this.item = itemData;
    this.page = page;
    this.isWeapon = false;
    this.isSecondary = false;
    this.clothingType = PAGES.C_NONE;
    this.sizeX = sizeX;
    this.sizeY = sizeY;
    this.rotation = rotation;
    this.pendingRotation = rotation;
    this.name = name;
    this.radius = new Radius(C.radius);
    this.description = description;
    this.tileSizeX = 0;
    this.tileSizeY = 0;
    this.isPicked = false;
    this.pickedLocationX = 0;
    this.pickedOffsetX = 0;
    this.pickedLocationY = 0;
    this.pickedOffsetY = 0;
    this.inSlot = false;
    this.dontRequestImage = false;
    this.getSizes = function (rotation)
    {
        if (rotation % 2 == 1)
        {
            return {
                width: this.sizeY,
                height: this.sizeX
            };
        } else
        {
            return {
                width: this.sizeX,
                height: this.sizeY
            };
        }
    }
    this.sizes = this.getSizes(this.rotation);
    this.pendingSizes = this.getSizes(this.rotation);
    this.applyOccupiedToSlots = function ()
    {
        if (this.inSlot)
        {
            var cell = Program.pages.cell(this.page, this.x, this.y);
            if (cell)
                cell.occupied = true;
            return;
        }
        var bottomX = this.x + this.sizes.width;
        var bottomY = this.y + this.sizes.height;
        if (!(Program.pages.checkCoords(this.page, this.x, this.y) && Program.pages.checkCoords(this.page, bottomX - 1, bottomY - 1))) return;
        for (var x = this.x; x < bottomX; x++)
        {
            for (var y = this.y; y < bottomY; y++)
            {
                Program.pages.pages[this.page].page.cells[x][y].occupied = true;
            }
        }
    }
    if (!this.isOrphan)
        this.applyOccupiedToSlots();
    this.clearOccupiedFromSlots = function ()
    {
        if (this.inSlot)
        {
            var cell = Program.pages.cell(this.page, this.x, this.y);
            if (cell)
                cell.occupied = false;
            return;
        }
        var bottomX = this.x + this.sizes.width;
        var bottomY = this.y + this.sizes.height;
        if (!(Program.pages.checkCoords(this.page, this.x, this.y) && Program.pages.checkCoords(this.page, bottomX - 1, bottomY - 1))) return;
        for (var x = this.x; x < bottomX; x++)
        {
            for (var y = this.y; y < bottomY; y++)
            {
                Program.pages.pages[this.page].page.cells[x][y].occupied = false;
            }
        }
    }
    this.getIcon = function ()
    {
        if (this.dontRequestImage) return;
        this.icon = Program.pages.iconCache.get(this.id);
        if (!this.icon)
        {
            this.icon = new Image(sizeX * 512, sizeY * 512);
            this.icon.id = this.id.toString();
            this.icon.onload = onImageLoad;
            this.icon.src = itemIconPrefix + this.id.toString() + ".png";
            Program.pages.iconCache.set(this.id, this.icon);
        }
    }
    this.getIcon();
    this.delete = function ()
    {
        this.clearOccupiedFromSlots();
        if (this.isPicked)
        {
            Program.pages.pickedItem = null;
            this.isPicked = false;
        }
        if (this.page < 0)
        {
            Program.invalidate();
            return;
        }
        for (var i = 0; i < Program.pages.pages[this.page].page.items.length; i++)
        {
            var item = Program.pages.pages[this.page].page.items[i];
            if (item.x == this.x && item.y == this.y)
            {
                Program.pages.pages[this.page].page.items.splice(i, 1);
                break;
            }
        }
        this.inSlot = false;
        var oldpg = Program.pages.pages[this.page].page;
        if (oldpg.type === 1)
        {
            for (var i = 0; i < Program.pages.pages.length; i++)
            {
                if (Program.pages.pages[i].page.pageID === oldpg.pageChild)
                {
                    Program.pages.pages.splice(i, 1);
                    oldpg.pageChild = null;
                    Program.pages.updateScale();
                    Program.pages.sortPages();
                    break;
                }
            }
        }
        Program.invalidate();
    }
    this.render = function (ctx)
    {
        if (this.isPicked)
        {
            var xo = this.pickedLocationX + this.pickedOffsetX;
            var yo = this.pickedLocationY + this.pickedOffsetY;
            var cell = Program.pages.getCellAtCoords(xo, yo, roundPlacement);
            this.renderPreview(ctx, xo, yo, cell);
            this.renderAt(ctx, xo, yo, pickedColor, 0.75, this.pendingRotation, cell, this.inSlot, this.pendingSizes, true);
            cell = Program.pages.cell(this.page, this.x, this.y);
            if (cell)
                this.renderAt(ctx, cell.posX, cell.posY, pickedColor, 0.25, this.rotation, cell, this.inSlot, this.sizes);
        }
        else
        {
            var cell = Program.pages.cell(this.page, this.x, this.y);
            if (!cell)
                return;
            this.renderAt(ctx, cell.posX, cell.posY, placedColor, 1, this.rotation, cell, this.inSlot, this.sizes);
        }
    }
    this.renderPreview = function (ctx, x, y, cell)
    {
        var valid = Program.pages.verifyMove(this, cell.coordX, cell.coordY, this.pendingRotation, cell.page, this.pendingSizes);
        var single = cell.type == 1;
        roundedRectPath(ctx, cell.posX, cell.posY, single ? cell.tileSizeX : cell.tileSizeX * this.pendingSizes.width, single ? cell.tileSizeY : cell.tileSizeY * this.pendingSizes.height, this.radius);
        ctx.globalAlpha = 0.5;
        ctx.fillStyle = valid ? previewColor : previewColorBad;
        ctx.fill();
        ctx.globalAlpha = 1.0;
        ctx.strokeStyle = "#000000";
        ctx.stroke();
    }
    this.renderAt = function (ctx, x, y, color, opacity = 1, rot = 0, cell = null, drawSize1Tile = false, sizes = null, showRotateIfInSlot = false)
    {
        if (this.icon == null && !this.dontRequestImage)
        {
            this.getIcon();
        }
        var width;
        var height;
        if (drawSize1Tile)
        {
            var scale = getScale(this.tileSizeX, this.tileSizeY, this.sizeX, this.sizeY);
            width = this.sizeX * scale;
            height = this.sizeY * scale;
            if (cell != null)
            {
                if (width > height)
                {
                    y += (this.tileSizeY - height) / 2;
                } else
                {
                    x += (this.tileSizeX - width) / 2;
                }
            }
            if (!showRotateIfInSlot)
                rot = 0;
        } else
        {
            width = (this.tileSizeX + margin) * this.sizeX;
            height = (this.tileSizeY + margin) * this.sizeY;
        }
        if (this.icon != null && this.icon.onload == null)
        {
            if (rot == 0 || rot > 3 || rot < 0)
            {
                if (opacity != 1)
                    ctx.globalAlpha = opacity;
                try
                {
                    ctx.drawImage(this.icon, x, y, width, height);
                }
                catch (ex)
                {
                    this.dontRequestImage = true;
                }
            }
            else
            {
                var rotation;
                var dx;
                var dy;
                if (rot == 1)
                {
                    rotation = Math.PI / 2; // 90°
                    dx = 0;
                    dy = -height;
                }
                else if (rot == 2)
                {
                    rotation = Math.PI; // 180°
                    dx = -width;
                    dy = -height;
                }
                else
                {
                    rotation = 3 * Math.PI / 2; // 270°
                    dx = -width;
                    dy = 0;
                }
                ctx.translate(x, y);
                ctx.rotate(rotation);
                if (opacity != 1)
                    ctx.globalAlpha = opacity;
                try
                {
                    ctx.drawImage(this.icon, dx, dy, width, height);
                }
                catch (ex)
                {
                    this.dontRequestImage = true;
                }
                ctx.rotate(-rotation);
                ctx.translate(-x, -y);
            }
        }
        if (!this.inSlot && sizes != null && sizes.width != 0 && sizes.height != 0)
        {
            width = (this.tileSizeX + margin) * sizes.width;
            height = (this.tileSizeY + margin) * sizes.height;
        }
        else if (showRotateIfInSlot && this.pendingRotation % 2 != 0)
        {
            var temp = width;
            width = height;
            height = temp;
        }
        roundedRectPath(ctx, x, y, width, height, this.radius);
        ctx.globalAlpha = opacity * 0.5;
        ctx.fillStyle = color;
        ctx.fill();
        ctx.globalAlpha = opacity;
        ctx.strokeStyle = "#000000";
        ctx.stroke();
        if (opacity != 1)
            ctx.globalAlpha = 1.0;
    }
    this.getBounds = function ()
    {
        var rtn = { x: 0, y: 0, width: 0, height: 0 };
        if (this.page < 0 || this.page > Program.pages.pages.length) return rtn;
        var cell = Program.pages.cell(this.page, this.x, this.y);
        if (!cell) return rtn;
        rtn.x = cell.posX;
        rtn.y = cell.posY;
        if (this.inSlot)
        {
            var scale = Math.min(this.tileSizeX, this.tileSizeY) / Math.max(this.sizeX, this.sizeY);
            rtn.width = this.sizeX * scale;
            rtn.height = this.sizeY * scale;
        }
        else
        {
            rtn.width = this.sizeX * this.tileSizeX;
            rtn.height = this.sizeY * this.tileSizeY;
        }
        return rtn;
    }
    this.onMouseMoved = function (x, y)
    {
        if (!this.isPicked) return false;
        Program.moveConsumed = true;
        this.pickedLocationX = x;
        this.pickedLocationY = y;
        Program.invalidate();
        return true;
    }
    this.deleteClicks = 0;
    this.lastClickTime = 0;
    this.onClick = function (x, y)
    {
        if (this.isPicked)
        {
            var cell = Program.pages.getCellAtCoords(this.pickedLocationX + this.pickedOffsetX, this.pickedLocationY + this.pickedOffsetY, roundPlacement);
            if (!cell)
            {
                cell = Program.pages.getCellAtCoords(this.pickedLocationX + this.pickedOffsetX, this.pickedLocationY + this.pickedOffsetY, !roundPlacement);
                if (!cell)
                {
                    // double click
                    if (this.deleteClicks == 0 || Program.time - this.lastClickTime > 0.2)
                    {
                        this.deleteClicks = 1;
                        this.lastClickTime = Program.time;
                    }
                    else
                        this.delete();
                    return;
                }
            }
            Program.mouseBtn1Consumed = true;
            var moved = false;
            this.clearOccupiedFromSlots();
            if (this.page != cell.page || this.x != cell.coordX || this.y != cell.coordY || this.pendingRotation != this.rotation)
                moved = Program.pages.moveItem(this, cell.coordX, cell.coordY, this.pendingRotation, cell.page, this.pendingSizes);
            if (moved)
            {
                this.isPicked = false;
                this.isOrphan = false;
                this.applyOccupiedToSlots();
                Program.pages.pickedItem = null;
                Program.invalidate();
            } else
            {
                this.isPicked = false;
                this.isOrphan = false;
                this.applyOccupiedToSlots();
                Program.pages.pickedItem = null;
                Program.invalidate();
            }
        }
        else
        {
            if (Program.pages.pickedItem != null)
            {
                console.warn("item already picked up.");
                // switch item first
            }
            else
            {
                var cell = Program.pages.cell(this.page, this.x, this.y);
                if (!cell) return;
                this.pickedLocationX = x;
                this.pickedLocationY = y;
                if (this.inSlot)
                {
                    var ratio = (this.sizeX > this.sizeY ? Math.max(this.tileSizeX, this.tileSizeY) : Math.min(this.tileSizeX, this.tileSizeY)) / Math.max(this.sizeX, this.sizeY);
                    if (x == cell.posX) this.pickedOffsetX = 0;
                    else
                    {
                        this.pickedOffsetX = (x - cell.posX) / (this.sizeX * ratio);
                        if (this.pickedOffsetX > 1) this.pickedOffsetX = 1;
                        this.pickedOffsetX *= C.tileSize * this.sizeX * -1;
                    }
                    if (y == cell.posY) this.pickedOffsetY = 0;
                    else
                    {
                        this.pickedOffsetY = (y - cell.posY) / (this.sizeY * ratio);
                        if (this.pickedOffsetY > 1) this.pickedOffsetY = 1;
                        this.pickedOffsetY *= C.tileSize * this.sizeY * -1;
                    }
                }
                else
                {
                    this.pickedOffsetX = cell.posX - x + (this.tileSizeX / 3.0) * ((this.sizeX - 1.0) / 3);
                    this.pickedOffsetY = cell.posY - y + (this.tileSizeY / 3.0) * ((this.sizeY - 1.0) / 3);
                }
                Program.mouseBtn1Consumed = true;
                Program.pages.pickedItem = this;
                this.isPicked = true;
                Program.invalidate();
            }
        }
    }
    this.rotateOnce = function ()
    {
        if (this.isPicked)
        {
            this.pendingRotation = (this.pendingRotation + 1) % 4;
            this.pendingSizes = this.getSizes(this.pendingRotation);
        }
        else
        {
            this.rotation = (this.rotation + 1) % 4;
            this.pendingRotation = this.rotation;
            this.sizes = this.getSizes(this.rotation);
            this.pendingSizes = this.getSizes(this.rotation);
        }
        Program.invalidate();
    }
    this.dispose = function ()
    {
        this.clearOccupiedFromSlots();
        if (Program.pages.pickedItem == this) Program.pages.pickedItem = null;
    }
    this.isPointInside = function (x, y)
    {
        var bounds = this.getBounds();
        if (x > bounds.x && x < bounds.x + bounds.width && y > bounds.y && y < bounds.y + bounds.height)
            return bounds;
        else return false;
    }
}
function roundedArrow(ctx, x = 0, y = 0, width = 128, height = 128, radius, fill = false, stroke = true, left = true)
{
    if (!(stroke || fill)) return;
    radius = new Radius(radius);
    if (left)
    {
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + width - radius.tr, y);
        ctx.quadraticCurveTo(x + width, y, x + width, y + radius.tr);
        ctx.lineTo(x + width, y + height - radius.br);
        ctx.quadraticCurveTo(x + width, y + height, x + width - radius.br, y + height);
        ctx.lineTo(x, y + height);
        ctx.lineTo(x - width / 2, y + height / 2);
        ctx.lineTo(x, y);
        ctx.closePath();
    } else
    {
        ctx.beginPath();
        ctx.moveTo(x + radius.tl, y);
        ctx.lineTo(x + width, y);
        ctx.lineTo(x + 3 * width / 2, y + height / 2);
        ctx.lineTo(x + width, y + height);
        ctx.lineTo(x + radius.bl, y + height);
        ctx.quadraticCurveTo(x, y + height, x, y + height - radius.bl);
        ctx.lineTo(x, y + radius.tl);
        ctx.quadraticCurveTo(x, y, x + radius.tl, y);
        ctx.closePath();
    }
    if (fill)
        ctx.fill();
    if (stroke)
        ctx.stroke();
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
        Program.pages.pickedItem = new Item(this.itemID, -1, -1, this.itemData.SizeX, this.itemData.SizeY, 0, this.itemData.LocalizedName, this.itemData.LocalizedDescription, -1, this.itemData);
        Program.pages.pickedItem.isPicked = true;
        Program.pages.pickedItem.isOrphan = true;
        Program.pages.pickedItem.pickedLocationX = x;
        Program.pages.pickedItem.pickedLocationY = y;
        Program.pages.pickedItem.tileSizeX = tileSize;
        Program.pages.pickedItem.tileSizeY = tileSize;
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
        var len1 = m(ctx, sizeTxt, popupDescTextSize);
        var len2 = m(ctx, typeTxt, popupDescTextSize);
        var len3 = m(ctx, rarityTxt, popupDescTextSize);
        var xpos = this.posX + this.margin;
        ypos += this.margin;
        if (!onlyCalc)
        {
            var img = new Image(imageSize, imageSize);
            img.src = C.statIconPrefix + "SizeX.svg";
            ctx.drawImage(img, xpos, ypos, imageSize, imageSize);
            ctx.fillText(sizeTxt, xpos + imageSize + this.margin / 2, ypos + imageSize - (imageSize / 2 - len1.height / 2));
        }
        ypos += imageSize;
        ypos += this.margin;
        ypos += len2.height;
        if (!onlyCalc)
        {
            ctx.fillText(typeTxt, xpos, ypos);
        }
        ypos += this.margin;
        ypos += len3.height;
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
function m(ctx, text, defaultHeight = 14)
{
    var ms = ctx.measureText(text);
    return {
        width: ms.width,
        height: ms.actualBoundingBoxAscent && ms.actualBoundingBoxDescent ? ms.actualBoundingBoxAscent + ms.actualBoundingBoxDescent : defaultHeight,
        up: ms.actualBoundingBoxAscent ? ms.actualBoundingBoxAscent : defaultHeight,
        down: ms.actualBoundingBoxDescent ? ms.actualBoundingBoxDescent : 0,
        raw: ms
    };
}
const validClasses = []
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
}
function onSuccessSend(response, textStatus = "", jqXHR)
{
    console.log(`Successfully posted: ${textStatus}.`);
    console.log(response);
}
function onSendError(jqXHR, textStatus = "", errorThrown)
{
    console.error(`Failed to post: ${textStatus}.`);
    console.error(errorThrown);
}
function call(data, handler, response = onSuccessSend, error = onSendError)
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
    }
}

function openKitWindow()
{
    if (Program.popup != null && (Program.popup.isOpen || Program.popup.isAnimating)) return;
    Program.popup = Program.savedPopups[0];
    Program.popup.open();
}
function openSaveWindow()
{
    if (Program.popup != null && (Program.popup.isOpen || Program.popup.isAnimating)) return;
    Program.popup = Program.savedPopups[2];
    Program.popup.open();
}