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
const PAGEORDER = [ PAGES.HANDS, PAGES.BACKPACK, PAGES.VEST, PAGES.SHIRT, PAGES.PANTS, PAGES.PRIMARY, PAGES.SECONDARY,
                    PAGES.C_BACKPACK, PAGES.C_VEST, PAGES.C_SHIRT, PAGES.C_PANTS, PAGES.C_HAT, PAGES.C_MASK, PAGES.C_GLASSES ];
const tileSize = 32;
document.body.onload = startEditor;
function startEditor() {
    Program.start();
}
const Program = {
    canvas: null,
    context: null,
    header: null,
    start: function () 
    {
        document.onkeydown = keyPress;
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
        this.popup = null;
        document.getElementById("canvas-container").appendChild(this.canvas);
        this.context = this.canvas.getContext("2d");
        this.savedPopups =
            [
            new Popup("Preload Kit", "Start your loadout off with a kit that's already in-game. To use someone's loadout, type <their Steam64 ID>_<a-z in the order they were made> (for example 76561198267927009_a).",
                [new PopupButton("LOAD", 13, loadKit), new PopupButton("CANCEL", 27, closePopup)],
                [new PopupTextbox("Kit ID", 0, "usrif1")]),
            new Popup("Connection Error", "It seems like the server is not connected the the web server properly. If there isn't planned matenence on the server, contact one of the Directors to check on this for you.",
                [new PopupButton("CLOSE", 13, navigateToHomePage)])
            ];
        this.pages = new Pages(25, 25);
        this.pages.addSlot(PAGES.PRIMARY, "Primary", tileSize * 6, tileSize * 4, true, (item) => item.item.SlotType == 1 || item.item.SlotType == 2 || item.item.SlotType == 4);
        this.pages.addSlot(PAGES.SECONDARY, "Secondary", tileSize * 6, tileSize * 4, true, (item) => item.item.SlotType == 2 || item.item.SlotType == 4);
        this.pages.addSlot(PAGES.C_HAT, "Hat", tileSize * 4, tileSize * 4, true, (item) => item.item.T == 50);
        this.pages.addSlot(PAGES.C_GLASSES, "Glasses", tileSize * 4, tileSize * 4, true, (item) => item.item.T == 49);
        this.pages.addSlot(PAGES.C_MASK, "Mask", tileSize * 4, tileSize * 4, true, (item) => item.item.T == 51);
        this.pages.addSlot(PAGES.C_SHIRT, "Shirt", tileSize * 4, tileSize * 4, true, (item) => item.item.T == 47);
        this.pages.addSlot(PAGES.C_VEST, "Vest", tileSize * 4, tileSize * 4, true, (item) => item.item.T == 48);
        this.pages.addSlot(PAGES.C_BACKPACK, "Backpack", tileSize * 4, tileSize * 4, true, (item) => item.item.T == 45);
        this.pages.addSlot(PAGES.C_PANTS, "Pants", tileSize * 4, tileSize * 4, true, (item) => item.item.T == 46);
        this.pages.addPage(PAGES.HANDS, 5, 3, "Hands", tileSize, true);
        this.pages.sortPages();
        this.dictionary = new Dictionary();
        this.interval = setInterval(tickInt, 0.1);
        this.updateScale();
        this.tick();
        var response = call({}, "PingWarfare").done(() =>
        {
            if (!response.responseJSON.State)
            {
                Program.popup?.close();
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
                        Program.popup?.close();
                        Program.popup = Program.savedPopups[1];
                        Program.popup.open();
                    }
                    else
                    {
                        Program.DATA = response.responseJSON.State;
                        this.onMouseMoved(0, 0);
                        if (!Program.moveConsumed)
                            Program.invalidate();
                    }
                });
            }
        });
    },
    updateScale: function () 
    {
        this.canvas.width = window.innerWidth - 40;
        this.canvas.height = window.innerHeight - this.header.clientHeight - this.footer.clientHeight - 40;
        if (this.pages == null)
            console.warn("Pages is null");
        else
            this.pages.updateScale();
        if (this.popup != null)
            this.popup.updateDims(this.context);
        if (this.dictionary)
            this.dictionary.updateDims(this.context);
    },
    tick: function ()
    {
        if (!this.invalidated) return;
        var nextTick = new Date().getTime();
        this.deltaTime = (nextTick - this.lastTick) / 1000.0;
        this.time += this.deltaTime;
        this.lastTick = nextTick;
        this.ticks++;
        this.invalidated = tick(this.context, this.deltaTime, this.time, this.ticks, this.canvas);
    },
    clearCanvas: function ()
    {
        this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
    },
    inputConsumed: true,
    onClick: function (x, y)
    {
        if (this.isLoading) return;
        this.inputConsumed = false;
        if (Program.popup != null && Program.popup.consumeKeys)
            Program.popup.onClick(x, y);
        else
        {
            this.pages.onClick(x, y);
        }
        if (!this.inputConsumed && this.dictionary)
        {
            this.dictionary.onClick(x, y);
        }
        if (this.inputConsumed)
            this.tick();
    },
    moveConsumed: true,
    onMouseMoved: function (x, y)
    {
        if (this.isLoading) return;
        this.moveConsumed = false;
        if (Program.popup != null && Program.popup.consumeKeys)
            Program.popup.onMouseMoved(x, y);
        else
        {
            this.pages.onMouseMoved(x, y);
        }
        if (!this.moveConsumed && this.dictionary)
        {
            this.dictionary.onMouseMoved(x, y);
        }
        if (this.moveConsumed)
            this.tick();
    },
    time: 0.0,
    lastTick: 0,
    ticks: 0,
    deltaTime: 0,
    pages: null,
    invalidated: true,
    invalidate: function ()
    {
        this.invalidated = true;
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
function loadKit(btn)
{
    var response = call({}, "PingWarfare").done(() =>
    {
        if (!response.responseJSON.State)
        {
            console.log("Not connected to warfare.")
            Program.popup.close();
            Program.popup = Program.savedPopups[1];
            Program.popup.open();
            return;
        }
        var kitname = btn.owner.textboxes[0];
        if (kitname == null || kitname.text.length == 0) kitname = "usrif2";
        else kitname = btn.owner.textboxes[0].text;
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
                console.log("Failed to receive kit info");
            }
        });
    });
}
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
        var center = centerText(ctx, "Loading...", canvas.clientWidth, canvas.clientHeight, 28);
        ctx.fillText("Loading...", center.width, center.height, canvas.clientWidth);
    }
    Program.pages.render(ctx);
    var loop = false;
    if (!this.isLoading && Program.popup != null)
        loop |= Program.popup.render(ctx, deltaTime, realtime);
    if (!this.isLoading && Program.dictionary != null)
        loop |= Program.dictionary.render(ctx, deltaTime, realtime);
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
const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
const radius = 2;
const margin = 0;
const titleRadius = 16;
const titleSize = 40;
const titleToGridDistance = 20;
const heightMarginBetweenPages = 20;
const widthMarginBetweenPages = 10;
const defaultCellColor = "#0f0f0f";
const hoveredCellColor = "#1f1f5f";
const occupiedCellColor = "#0b0b0b";
function Pages(posX = 0, posY = 0)
{
    this.posX = posX;
    this.hoveredCell = null;
    this.posY = posY;
    this.pages = [];
    this.pickedItem = null;
    this.updateScale = function ()
    {
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
                    this.pages[j].page.changeTransform(null, this.posX + widthOffset + maxWidth + (column == 1 ? widthMarginBetweenPages : 0), tHeight, null, null);
                    this.pages[j].row = j;
                    this.pages[j].column = column;
                    tHeight = this.pages[j].page.nextY();
                }
                widthOffset += maxWidth + widthMarginBetweenPages + (column == 1 ? widthMarginBetweenPages : 0);
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
        for (var i = 0; i < this.pages.length; i++)
        {
            this.pages[i].page.renderForeground(ctx);
        }
    }
    this.onClick = function (x, y)
    {
        if (x < this.posX || y < this.posY) return;
        for (var i = 0; i < this.pages.length; i++)
        {
            var cell = this.pages[i].page.getCellByCoords(x, y);
            if (cell)
            {
                if (this.pickedItem != null)
                {
                    this.pickedItem.onClick(x, y, cell, i);
                    if (Program.inputConsumed) return;
                }
                for (var j = 0; j < this.pages[i].page.items.length; j++)
                {
                    var item = this.pages[i].page.items[j];
                    if (!item.isPicked && cell.coordX >= item.x && cell.coordY >= item.y && cell.coordX < item.x + item.sizes.width && cell.coordY < item.y + item.sizes.height)
                    {
                        item.onClick(x, y, cell, i);
                        if (Program.inputConsumed) return;
                    }
                }
                if (Program.inputConsumed)
                    Program.invalidate();
                break;
            }
        }
    }
    this.onMouseMoved = function (x, y)
    {
        this.pickedItem?.onMouseMoved(x, y);
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
                    cell.color = hoveredCellColor;
                    if (this.hoveredCell != null && this.hoveredCell != cell)
                    {
                        this.hoveredCell.color = defaultCellColor;
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
            this.hoveredCell.color = defaultCellColor;
            this.hoveredCell = null;
            Program.moveConsumed = true;
            Program.invalidate();
        }
        return false;
    }
    this.loadKit = function (kitdata = { Kit: { Items: [], Clothes: [] }})
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
                            console.log(`${kititem.ID} failed to add ^^`);
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
    }
    this.propogateRotate = function ()
    {
        for (var p = 0; p < this.pages.length; p++)
        {
            for (var i = 0; i < this.pages[p].page.items.length; i++)
            {
                if (this.pages[p].page.items[i].isPicked)
                {
                    this.pages[p].page.items[i].rotateOnce();
                    return;
                }
            }
        }
    }
    this.iconCache = new Map();
    this.moveItem = function (item, x, y, rotation, page, sizes)
    {
        if (!this.verifyMove(item, x, y, rotation, page, sizes))
        {
            return false;
        }
        if (item.page != page)
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
                {
                    newPageID = PAGES.SHIRT;
                }
                else if (pg.pageID === PAGES.C_PANTS) // pants
                {
                    newPageID = PAGES.PANTS;
                }
                else if (pg.pageID === PAGES.C_VEST) // vest
                {
                    newPageID = PAGES.VEST;
                }
                else if (pg.pageID === PAGES.C_BACKPACK) // backpack
                {
                    newPageID = PAGES.BACKPACK;
                }
                if (!isNaN(newPageID))
                {
                    var newpage = this.addPage(newPageID, item.item.Width, item.item.Height, item.item.LocalizedName, tileSize, true, null);
                    console.log(newpage);
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
                    console.log("removing");
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
        if (dstPage.slotOwner && dstPage.slotOwner == this.pages[item.page].page.pageID)
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
                    var bottomX2 = item.x + item.sizes.width;
                    var bottomY2 = item.y + item.sizes.height;
                    var found = false;
                    if (!item.inSlot)
                    {
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
                    var page = remaining[p].page;
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
}
function SlotPage(page = 0, pageID = 0, posX = 0, posY = 0, title = "PAGE", tileSizeX = 128, tileSizeY = 128, canEquip = (item) => true)
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
    this.titleSizeY = titleSize;
    this.gridStartY = this.posY + this.titleSizeY + titleToGridDistance;
    this.totalHeight = function ()
    {
        return this.titleSizeY + titleToGridDistance + this.tileSizeY + heightMarginBetweenPages;
    }
    this.nextY = function ()
    {
        return this.gridStartY + this.tileSizeY + heightMarginBetweenPages;
    }
    this.nextX = function ()
    {
        return this.posX + this.tileSizeX;
    }
    this.cells = [[new SlotCell(this.page, this.posX, this.gridStartY, this.tileSizeX, this.tileSizeY)]];
    this.renderBackground = function (ctx)
    {
        ctx.globalAlpha = 0.5;
        ctx.fillStyle = "#0f0f0f";
        roundedRect(ctx, this.titlePosX, this.posY, this.titleSizeX, this.titleSizeY, titleRadius, true, false);
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
            this.items.push(item);
            Program.invalidate();
            return item;
        }
        else
        {
            console.warn(`Tried to add and item to an invalid spot.`);
            return false;
        }
        this.items.push(item);
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
            this.gridStartY = this.posY + this.titleSizeY + titleToGridDistance;
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
        return this.sizeY * (this.tileSize + margin);
    }
    this.gridSizeX = function ()
    {
        return this.sizeX * (this.tileSize + margin);
    }
    this.getNotation = function (x, y)
    {
        return this.title + "!" + alphabet[x] + (y + 1).toString();
    }
    this.titlePosX = this.posX;
    this.titleSizeX = this.gridSizeX();
    this.titleSizeY = titleSize;
    this.gridStartY = this.posY + this.titleSizeY + titleToGridDistance;
    this.totalHeight = function ()
    {
        return this.titleSizeY + titleToGridDistance + this.sizeY * (this.tileSize + margin) + heightMarginBetweenPages;
    }
    this.nextY = function ()
    {
        return this.gridStartY + this.sizeY * (this.tileSize + margin) + heightMarginBetweenPages;
    }
    this.nextX = function ()
    {
        return this.posX + this.sizeX * (this.tileSize + margin);
    }
    for (var x = 0; x < this.sizeX; x++)
    {
        var cells = [];
        var xpos = this.posX + (x * (this.tileSize + margin));
        for (var y = 0; y < this.sizeY; y++)
        {
            cells.push(new InventoryCell(this.page, xpos, this.gridStartY + (y * (this.tileSize + margin)), this.tileSize, this.getNotation(x, y), x, y));
        }
        this.cells.push(cells);
    }
    this.renderBackground = function (ctx)
    {
        ctx.globalAlpha = 0.5;
        ctx.fillStyle = "#0f0f0f";
        roundedRect(ctx, this.titlePosX, this.posY, this.titleSizeX, this.titleSizeY, titleRadius, true, false);
        ctx.globalAlpha = 1.0;
        ctx.textAlign = 'center';
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 17px Segoe UI';
        ctx.fillText(this.title, this.titlePosX + this.titleSizeX / 2, this.posY + this.titleSizeY / 2 + 5.5);
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
    }, itemChange = (item) => {})
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
            if (this.items[i].page == page && this.items[i].x == x && this.items[i].y == y)
            {
                this.items[i].dispose();
                this.items[i].splice(i, 1);
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
            var cell = this.cells[Math.floor((x - this.posX) / (this.tileSize + margin))];
            if (cell == null)
                cell = this.cells[Math.round((x - this.posX) / (this.tileSize + margin))];
            if (cell == null)
                cell = this.cells[Math.ceil((x - this.posX) / (this.tileSize + margin))];
            if (cell == null) return false;
            var cell2 = cell[Math.floor((y - this.gridStartY) / (this.tileSize + margin))];
            if (cell2 == null)
                cell2 = cell[Math.round((y - this.gridStartY) / (this.tileSize + margin))];
            if (cell2 == null)
                cell2 = cell[Math.ceil((y - this.gridStartY) / (this.tileSize + margin))];
            if (cell2 == null) return false;
            return cell2;
        }
        else
        {
            var cell = this.cells[Math.floor((x - this.posX) / (this.tileSize + margin))];
            if (cell == null) return false;
            cell = cell[Math.floor((y - this.gridStartY) / (this.tileSize + margin))];
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
            this.gridStartY = this.posY + this.titleSizeY + titleToGridDistance;
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
                var xpos = this.posX + (x * (this.tileSize + margin));
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
                var ypos = this.gridStartY + (y * (this.tileSize + margin));
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
    this.radius = getRadius(radius);
    this.color = defaultCellColor;
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
        ctx.fillStyle = this.occupied ? occupiedCellColor : this.color;
        ctx.fill();
        ctx.globalAlpha = 1.0;
        ctx.strokeStyle = "#000000";
        ctx.stroke();
    }
}
function SlotCell(page = 0, posX = 0, posY = 0, tileSizeX = 128, tileSizeY = 128)
{
    this.type = 1;
    this.page = page;
    this.coordX = 0;
    this.coordY = 0;
    this.notation = "A1";
    this.tileSizeX = tileSizeX;
    this.tileSizeY = tileSizeY;
    this.posX = posX;
    this.posY = posY;
    this.radius = getRadius(radius);
    this.color = defaultCellColor;
    this.occupied = false;
    this.checkOccupied = function ()
    {
        if (!Program.pages.checkCoords(this.page, 0, 0)) return false;
        if (Program.pages.pages[this.page].page.items.length < 1) return false;
        else return true;
    }
    this.render = function (ctx)
    {
        roundedRectPath(ctx, this.posX, this.posY, this.tileSizeX, this.tileSizeY, this.radius);
        ctx.globalAlpha = 0.5;
        ctx.fillStyle = this.occupied ? occupiedCellColor : this.color;
        ctx.fill();
        ctx.globalAlpha = 1.0;
        ctx.strokeStyle = "#000000";
        ctx.stroke();
    }
}
const itemIconPrefix = "../loadout_assets/Items/";
const previewColor = "#ffffff";
const previewColorBad = "#ffaaaa";
const pickedColor = "#f0a0a0";
const placedColor = "#000000";
function Item(id = 0, x = 0, y = 0, sizeX = 1, sizeY = 1, rotation = 0, name = "#NAME", description = "#DESC", page = 0, itemData = null)
{
    this.id = id;
    this.x = x;
    this.y = y;
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
    this.radius = getRadius(radius);
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
    this.render = function (ctx)
    {
        if (this.isPicked)
        {
            var xo = this.pickedLocationX + this.pickedOffsetX;
            var yo = this.pickedLocationY + this.pickedOffsetY;
            var cell = Program.pages.getCellAtCoords(xo, yo, true);
            this.renderPreview(ctx, xo, yo, cell);
            this.renderAt(ctx, xo, yo, pickedColor, 0.75, this.pendingRotation, cell, this.inSlot, this.pendingSizes, true);
            cell = Program.pages.cell(this.page, this.x, this.y);
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
            var ratio = (this.sizeX > this.sizeY ? Math.max(this.tileSizeX, this.tileSizeY) : Math.min(this.tileSizeX, this.tileSizeY)) / Math.max(this.sizeX, this.sizeY);
            width = this.sizeX * ratio;
            height = this.sizeY * ratio;
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
                catch
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
                // fix
                try
                {
                    ctx.drawImage(this.icon, dx, dy, width, height);
                }
                catch
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
    this.onMouseMoved = function (x, y)
    {
        if (!this.isPicked) return false;
        Program.moveConsumed = true;
        this.pickedLocationX = x;
        this.pickedLocationY = y;
        Program.invalidate();
        return true;
    }
    this.onClick = function (x, y, c, page)
    {
        if (this.isPicked)
        {
            var cell = Program.pages.getCellAtCoords(this.pickedLocationX + this.pickedOffsetX, this.pickedLocationY + this.pickedOffsetY, true);
            // trash item?
            if (!cell) return;
            Program.inputConsumed = true;
            var moved = false;
            this.clearOccupiedFromSlots();
            if (this.page != cell.page || this.x != cell.coordX || this.y != cell.coordY || this.pendingRotation != this.rotation)
                moved = Program.pages.moveItem(this, cell.coordX, cell.coordY, this.pendingRotation, page, this.pendingSizes);
            if (moved)
            {
                this.isPicked = false;
                this.applyOccupiedToSlots();
                Program.pages.pickedItem = null;
                Program.invalidate();
            } else
            {
                this.isPicked = false;
                this.applyOccupiedToSlots();
                Program.pages.pickedItem = null;
                Program.invalidate();
            }
        }
        else
        {
            if (Program.pages.pickedItem != null)
            {
                console.log("item already picked up.");
                // switch item first
            }
            else
            {
                var cell = Program.pages.cell(this.page, this.x, this.y);
                if (!cell) return;
                this.pickedLocationX = x;
                this.pickedOffsetX = this.inSlot ? 0 : (cell.posX - x + tileSize / 2);
                this.pickedLocationY = y;
                this.pickedOffsetY = this.inSlot ? 0 : (cell.posY - y + tileSize / 2);
                Program.inputConsumed = true;
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
}
function onImageLoad()
{
    if (Program.pages == null)
    {
        console.warn("Images are loading too quickly, must be loaded after pages is defined in program.");
        return;
    }
    for (let [key, value] of Program.pages.iconCache)
    {
        if (value.onload == onImageLoad)
        {
            value.onload = null;
        }
    }
    Program.invalidate();
}
function roundedRectPath(ctx, x = 0, y = 0, width = 128, height = 128, radius = { tl: 4, tr: 4, br: 4, bl: 4 })
{
    ctx.beginPath();
    ctx.moveTo(x + radius.tl, y);
    ctx.lineTo(x + width - radius.tr, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius.tr);
    ctx.lineTo(x + width, y + height - radius.br);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius.br, y + height);
    ctx.lineTo(x + radius.bl, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius.bl);
    ctx.lineTo(x, y + radius.tl);
    ctx.quadraticCurveTo(x, y, x + radius.tl, y);
    ctx.closePath();
}
function getRadius(radius = 4)
{
    if (!radius) radius = { tl: 4, tr: 4, bl: 4, br: 4 };
    else if (typeof radius === 'number') radius = { tl: radius, tr: radius, bl: radius, br: radius };
    return radius;
}
function getRadius2(tl = 4, tr = 4, bl = 4, br = 4)
{
    return { tl: tl, tr: tr, bl: bl, br: br };
}
function roundedRect(ctx, x = 0, y = 0, width = 128, height = 128, radius, fill = false, stroke = true)
{
    if (!(stroke || fill)) return;
    radius = getRadius(radius);
    roundedRectPath(ctx, x, y, width, height, radius);
    if (fill)
        ctx.fill();
    if (stroke)
        ctx.stroke();
}
function PopupButton(text = null, keyShortcut = 0, onPress = function (btn) { })
{
    this.text = text;
    this.onClick = onPress;
    this.shortcut = keyShortcut;
    this.owner = null;
    this.mouseOver = false;
    this.radius = 4;
    this.posX = 0;
    this.posY = 0;
    this.width = 0;
    this.height = 0;
    this.mouseInside = function (x, y)
    {
        return x > this.posX && x < this.posX + this.width && y > this.posY && y < this.posY + this.height;
    }
    this.updateDims = function (ctx, w, h)
    {
        ctx.font = 'bold ' + popupButtonTextSize.toString() + 'px Segoe UI';
        ctx.textAlign = 'center';
        this.center = centerText(ctx, this.text, w, h).height;
    }
    this.renderAt = function (ctx, x = 0, y = 0, w = 0, h = 0)
    {
        this.posX = x;
        this.posY = y;
        this.width = w;
        this.height = h;
        ctx.fillStyle = this.mouseOver ? popupAccent3 : popupAccent1;
        ctx.strokeStyle = popupAccent2;
        ctx.strokeWeight = 3;
        roundedRect(ctx, x, y, w, h, this.radius, true, true);
        ctx.strokeWeight = 1;
        ctx.fillStyle = "#ffffff";
        ctx.font = 'bold ' + popupButtonTextSize.toString() + 'px Segoe UI';
        ctx.textAlign = 'center';
        ctx.fillText(this.text, x + w / 2, y + this.center, w - this.radius);
    }
}
const blinkTime = 1.5;
function PopupTextbox(placeholderText = "...", limitMode = 0, defaultText = "")
{
    this.isFocused = false;
    this.placeholderText = placeholderText;
    this.limitMode = limitMode;
    this.defaultText = defaultText;
    this.cursorPosition = 0;
    this.cursorTime = 0;
    this.text = "";
    this.posX = 0;
    this.posY = 0;
    this.width = 0;
    this.height = 0;
    this.blinkProgress = 0;
    this.mouseInside = function (x, y)
    {
        return x > this.posX && x < this.posX + this.width && y > this.posY && y < this.posY + this.height;
    }
    this.clear = function ()
    {
        this.text = "";
        this.cursorPosition = 0;
    }
    this.updateDims = function (ctx, w, h)
    {
        ctx.font = popupTextboxTextSize.toString() + 'px Segoe UI';
        ctx.textAlign = 'left';
        this.center = centerText(ctx, this.text, w, h).height;
        var txtHeight = ctx.measureText("W");
        this.btm = txtHeight.actualBoundingBoxDescent ? txtHeight.actualBoundingBoxDescent : 0;
        this.top = txtHeight.actualBoundingBoxAscent ? txtHeight.actualBoundingBoxAscent : 10;
    }
    this.owner = null;
    this.renderAt = function (ctx, x = 0, y = 0, w = 0, h = 0)
    {
        this.posX = x;
        this.posY = y;
        this.width = w;
        this.height = h;
        ctx.fillStyle = this.isFocused ? popupAccent1 : popupAccent2;
        ctx.strokeStyle = "#000000";
        ctx.strokeWeight = 3;
        ctx.fillRect(x, y, w, h);
        ctx.strokeRect(x, y, w, h);
        ctx.strokeWeight = 1;
        if (this.text.length == 0)
        {
            ctx.fillStyle = "#afafaf";
            ctx.font = popupTextboxTextSize.toString() + 'px Segoe UI';
            ctx.textAlign = 'left';
            ctx.fillText(this.placeholderText, x + this.owner.margin / 2, y + this.center, w - this.owner.margin * 2);
        }
        else
        {
            ctx.fillStyle = "#ffffff";
            ctx.font = popupTextboxTextSize.toString() + 'px Segoe UI';
            ctx.textAlign = 'left';
            ctx.fillText(this.text, x + this.owner.margin / 2, y + this.center, w - this.owner.margin * 2);
            if (this.isFocused)
            {
                this.blinkProgress += Program.deltaTime;
                if (this.blinkProgress > blinkTime || isNaN(this.blinkProgress)) this.blinkProgress = 0;
                if (this.blinkProgress > blinkTime / 2)
                {
                    var txtWidth = ctx.measureText(this.text.substring(0, this.cursorPosition));
                    ctx.beginPath();
                    ctx.moveTo(x + this.owner.margin / 2 + txtWidth.width + 1, y + this.center - this.top - 1);
                    ctx.lineTo(x + this.owner.margin / 2 + txtWidth.width + 1, y + this.center + this.btm + 1);
                    ctx.strokeStyle = "#ffffff";
                    ctx.strokeWeight = 2;
                    ctx.stroke();
                    ctx.strokeWeight = 1;
                }
            }
        }
    }
    this.keyPress = function (event)
    {
        if (event.keyCode === 8) //bksp
        {
            if (event.ctrlKey)
            {
                if (this.cursorPosition === this.text.length)
                {
                    var i
                    for (i = this.text.length - 1; i >= 0; i--)
                        if (this.text[i] == " ") break;
                    if (i > 0)
                        this.text = this.text.substring(0, i);
                    else
                        this.text = "";
                    this.cursorPosition = i < 0 ? 0 : i;
                }
                else
                {
                    var i
                    for (i = this.cursorPosition - 1; i >= 0; i--)
                        if (this.text[i] == " ") break;
                    if (i > 0)
                        this.text = this.text.substring(0, i) + this.text.substring(this.cursorPosition, this.text.length);
                    else
                        this.text = this.text.substring(this.cursorPosition, this.text.length);
                    this.cursorPosition = i < 0 ? 0 : i;
                }
            }
            else
            {
                if (this.cursorPosition === this.text.length)
                {
                    this.text = this.text.substring(0, this.text.length - 1);
                }
                else
                {
                    this.text = this.text.substring(0, this.cursorPosition - 1) + this.text.substring(this.cursorPosition, this.text.length);
                }
                if (this.cursorPosition > 0)
                    this.cursorPosition--;
            }
        } // a-z, _, ' ', 0-9
        else if ((event.keyCode >= 65 && event.keyCode <= 90) || event.keyCode === 173 || event.keyCode === 32 || (event.keyCode >= 48 && event.keyCode <= 57) || event.keyCode == 190 || event.keyCode == 188)
        {
            if (this.cursorPosition === this.text.length || this.text.length == 0)
                this.text += event.key;
            else if (this.cursorPosition === 0)
                this.text = event.key + this.text;
            else
                this.text = this.text.substring(0, this.cursorPosition) + event.key + this.text.substring(this.cursorPosition, this.text.length);
            this.cursorPosition++;
        } else if (event.keyCode === 37) // <-
        {
            if (this.cursorPosition > 0)
                this.cursorPosition--;
        }
        else if (event.keyCode === 39) // ->
        {
            if (this.cursorPosition < this.text.length)
                this.cursorPosition++;
        }
    }
}
const popupAnimTimeSec = 0.3;
const popupBkgrTransparency = 0.375;
const popupHeaderHeight = 40;
const popupTextboxHeight = 65;
const popupButtonHeight = 80;
const popupDescLineSpacing = 4;
const popupDescTextSize = 16;
const popupTitleTextSize = 20;
const popupButtonTextSize = 16;
const popupTextboxTextSize = 16;
const popupAccent1 = "#9264cd";
const popupAccent2 = "#532c87";
const popupAccent3 = "#bb9fe0";
const popupBackground = "#0d0d0d";
const expConst = 2.1899243665;
function Popup(title = "TITLE", message = "", buttons = [new PopupButton("OK", 13), new PopupButton("ESC", 27)], textboxes = [], darkenBackground = true)
{
    this.title = title;
    this.message = message;
    this.wrappedMessage = null;
    this.margin = 16;
    this.buttons = buttons;
    for (var i = 0; i < this.buttons.length; i++)
    {
        this.buttons[i].owner = this;
    }
    this.textboxes = textboxes;
    for (var i = 0; i < this.textboxes.length; i++)
    {
        this.textboxes[i].clear();
        this.textboxes[i].owner = this;
        if (i == 0) this.textboxes[0].isFocused = true;
    }
    this.darkenBackground = darkenBackground;
    this.consumeKeys = false;
    this.isOpen = false;
    this.willAnimate = false;
    this.isAnimating = false;
    this.radius = getRadius(16);
    this.headerRadius = getRadius2(16, 16, 0, 0);
    this.inited = false;
    this.updateDims = function (ctx)
    {
        this.width = Program.canvas.width / 3;
        this.posX = Program.canvas.width / 2 - this.width / 2;
        this.startPosY = Program.canvas.height * 1.05;
        ctx.font = popupDescTextSize.toString() + 'px Segoe UI';
        ctx.textAlign = 'left';
        this.wrappedMessage = wrapText(ctx, this.message, this.width - this.margin * 2, popupDescTextSize);
        this.textHeight = 0;
        for (var i = 0; i < this.wrappedMessage.length; i++)
            this.textHeight += this.wrappedMessage[i].height + popupDescLineSpacing;
        this.height = popupHeaderHeight + this.margin + this.textHeight + this.margin + (this.margin + popupTextboxHeight) * this.textboxes.length + (this.buttons.length == 0 ? 0 : popupButtonHeight + this.margin);
        this.finalPosY = Program.canvas.height / 2 - this.height / 2;
        ctx.font = 'bold ' + popupTitleTextSize + 'px Segoe UI';
        ctx.textAlign = 'left';
        this.titleYoffset = centerText(ctx, this.title, this.width, popupHeaderHeight, popupTitleTextSize).height;
        this.buttonWidth = ((this.width - this.margin) / this.buttons.length) - this.margin;
        for (var i = 0; i < this.buttons.length; i++)
            this.buttons[i].updateDims(ctx, this.buttonWidth, popupButtonHeight);
        for (var i = 0; i < this.textboxes.length; i++)
            this.textboxes[i].updateDims(ctx, this.width - this.margin * 2, popupTextboxHeight);
        this.inited = true;
    }
    this.open = function ()
    {
        this.animState = true;
        this.willAnimate = true;
        this.consumeKeys = true;
        this.inited = false;
        Program.invalidate();
    }
    this.close = function ()
    {
        this.animState = false;
        this.willAnimate = true;
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
                    return false;
                }
                else
                {
                    this.renderAt(ctx, this.posX, this.lerp(), this.currentAnimAlpha);
                    this.currentAnimAlpha += dt / popupAnimTimeSec;
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
                    this.currentAnimAlpha -= dt / popupAnimTimeSec;
                    return true;
                }
            }
        }
        else if (this.isOpen)
        {
            this.renderAt(ctx, this.posX, this.finalPosY, 1.0);
        }
        if (!this.isAnimating)
        {
            for (var i = 0; i < this.textboxes.length; i++)
            {
                if (this.textboxes[i].isFocused) return true;
            }
        }
        return this.isAnimating;
    }
    this.exp = function (alpha)
    {
        return Math.pow(expConst, Math.pow(expConst, 0.5 * alpha) * alpha - 1) - Math.pow(expConst, -1);
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
            ctx.globalAlpha = bkgrAlpha * popupBkgrTransparency;
            ctx.fillStyle = "#000000";
            ctx.fillRect(0, 0, Program.canvas.width, Program.canvas.height);
        }
        ctx.globalAlpha = 1.0;
        if (y >= Program.canvas.height) return;
        ctx.fillStyle = popupBackground;
        ctx.strokeStyle = popupAccent1;
        roundedRect(ctx, x, y, this.width, this.height, this.radius, true, true);
        ctx.strokeStyle = "#000000";
        ctx.fillStyle = popupAccent1;
        roundedRect(ctx, x, y, this.width, popupHeaderHeight, this.headerRadius, true, false);
        ctx.fillStyle = "#ffffff";
        ctx.font = 'bold ' + popupTitleTextSize + 'px Segoe UI';
        ctx.textAlign = 'left';
        var ypos = y + popupHeaderHeight;
        ctx.fillText(this.title, x + this.margin, y + this.titleYoffset, this.width - this.margin * 2);
        ctx.font = popupDescTextSize.toString() + 'px Segoe UI';
        ypos += this.margin;
        for (var i = 0; i < this.wrappedMessage.length; i++)
        {
            ypos += this.wrappedMessage[i].height;
            ctx.fillText(this.wrappedMessage[i].text, x + this.margin, ypos, this.width - this.margin * 2);
            if (i != this.wrappedMessage.length - 1) ypos += popupDescLineSpacing;
        }
        for (var i = 0; i < this.textboxes.length; i++)
        {
            ypos += this.margin;
            this.textboxes[i].renderAt(ctx, x + this.margin, ypos, this.width - this.margin * 2, popupTextboxHeight);
            ypos += popupTextboxHeight;
        }
        ypos += this.margin;
        if (this.buttons.length == 0) return;
        var xpos = x + this.margin;
        for (var i = 0; i < this.buttons.length; i++)
        {
            this.buttons[i].renderAt(ctx, xpos, ypos, this.buttonWidth, popupButtonHeight);
            xpos += this.margin + this.buttonWidth;
        }
    }
    this.onClose = function ()
    {
        Program.popup = null;
        this.consumeKeys = false;
    }
    this.currentAnimAlpha = 0.0;
    this.animState = false; //false = closing, true = opening
    this.keyPress = function (event)
    {
        for (var b = 0; b < this.buttons.length; b++)
        {
            if (this.buttons[b].keyCode == event.keyCode && this.buttons[b].onPress != null)
            {
                this.buttons[b].onPress(this.buttons[b]);
                Program.inputConsumed = true;
                return;
            }
        }
        for (var i = 0; i < this.textboxes.length; i++)
        {
            if (this.textboxes[i].isFocused)
            {
                this.textboxes[i].keyPress(event);
                Program.invalidate();
                Program.inputConsumed = true;
            }
        }
        if (event.keyCode == 27) // esc
        {
            this.close();
        }
    }
    this.onClick = function (x, y)
    {
        for (var i = 0; i < this.buttons.length; i++)
        {
            if (this.buttons[i].mouseInside(x, y))
            {
                Program.inputConsumed = true;
                this.buttons[i].onClick(this.buttons[i]);
                return;
            }
        }
        for (var i = 0; i < this.textboxes.length; i++)
        {
            if (this.textboxes[i].mouseInside(x, y))
            {
                Program.inputConsumed = true;
                this.textboxes[i].isFocused = true;
                Program.invalidate();
                return;
            }
            else
            {
                this.textboxes[i].isFocused = false;
            }
        }
        Program.invalidate();
    }
    this.onMouseMoved = function (x, y)
    {
        for (var i = 0; i < this.buttons.length; i++)
        {
            if (this.buttons[i].mouseOver)
            {
                if (!this.buttons[i].mouseInside(x, y))
                {
                    this.buttons[i].mouseOver = false;
                    Program.moveConsumed = true;
                }
            }
            else
            {
                if (this.buttons[i].mouseInside(x, y))
                {
                    this.buttons[i].mouseOver = true;
                    Program.moveConsumed = true;
                }
            }
        }
        if (Program.moveConsumed)
            Program.invalidate();
    }
}
function openKitWindow()
{
    Program.popup = Program.savedPopups[0];
    if (Program.popup.isOpen || Program.popup.isAnimating) return;
    Program.popup.open();
}
function keyPress(event)
{
    if (Program.popup != null && Program.popup.consumeKeys)
        Program.popup.keyPress(event);
    else if (Program.dictionary && Program.dictionary.consumeKeys)
        Program.dictionary.keyPress(event);
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
        console.log(event);
        if (Program.dictionary)
            Program.dictionary.open();
    }
}
function wrapText(ctx, text = "", maxWidth = 280, lineHeightDefault = 14)
{
    var words = text.split(" ");
    var width = 0;
    if (words.length == 1) return text;
    var lines = [];
    var line = "";
    var size;
    var canUseAdvHeight;
    for (var i = 0; i < words.length; i++)
    {
        size = ctx.measureText(words[i]);
        canUseAdvHeight = size.actualBoundingBoxAscent && size.actualBoundingBoxDescent;
        if (size.width + width > maxWidth)
        {
            lines.push({ text: line, height: canUseAdvHeight ? size.actualBoundingBoxAscent + size.actualBoundingBoxDescent : lineHeightDefault });
            width = size.width;
            line = words[i];
        }
        else
        {
            if (i != 0) line += " ";
            line += words[i];
            width += size.width;
        }
    }
    if (width > 0)
        lines.push({ text: line, height: canUseAdvHeight ? size.actualBoundingBoxAscent + size.actualBoundingBoxDescent : lineHeightDefault });
    return lines;
}
function centerText(ctx, text, width, height, backupHeight = 17)
{
    var size = ctx.measureText(text);
    var h = size.actualBoundingBoxAscent && size.actualBoundingBoxDescent ? size.actualBoundingBoxAscent + size.actualBoundingBoxDescent : backupHeight;
    return { width: width / 2 - size.width / 2, height: height / 2 + h / 2 };
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
        return $.ajax({
            type: "POST",
            url: "/Loadouts/" + handler,
            contentType: 'application/json; charset=utf-8',
            dataType: "json",
            data: JSON.stringify(data ?? new Object()),
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

function DictionaryEntry(itemId = 0, itemData = null)
{

}

const dictionaryAnimTimeSec = 0.2;
const dictionaryAccent1 = "#9264cd";
const dictionaryAccent2 = "#532c87";
const dictionaryAccent3 = "#bb9fe0";
const dictionaryBackground = "#0d0d0d";
const dictionaryBkgrTransparency = 0.2;
const dictionaryTitleTextSize = 20;
const dictionaryHeaderSize = 40;
function Filter(name = "", predicate = (itemData) => true)
{
    this.enabled = false;
    this.name = name;
    this.predicate = predicate;
    this.posX = 0;
    this.posY = 0;
    this.width = 0;
    this.height = 0;
    this.index = 0;
    this.renderAt = function (ctx, x, y, w, h)
    {
        this.posX = x;
        this.posY = y;
        this.width = w;
        this.height = h;
    }
}
function Dictionary()
{
    this.gridSizeX = 8;
    this.gridSizeY = 50;
    this.width = 5;
    this.items = [];
    this.activeItems = [];
    this.activeFilters = [];
    this.filters = [
        new Filter("Weapon", (i) => i.T === 1 || i.T === 3 || i.T === 40),
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
    for (var i = 0; i < this.filters.length; i++) this.filters[i].index = i;
    this.render = function (ctx)
    {

    }
    this.updateFilters = function ()
    {
        this.activeItems.slice();
        for (var i = 0; i < this.items.length; i++)
            for (var f = 0; f < this.filters.length; f++)
                if (this.activeFilters[f].enabled && this.activeFilters[f].predicate(this.items[i]))
                    this.activeItems.push(this.items[i]);
    }
    this.title = "Item Database";
    this.margin = 16;
    this.darkenBackground = true;
    this.consumeKeys = false;
    this.isOpen = false;
    this.willAnimate = false;
    this.isAnimating = false;
    this.radius = getRadius2(16, 0, 16, 0);
    this.headerRadius = getRadius2(16, 0, 0, 0);
    this.inited = false;
    this.updateDims = function (ctx)
    {
        this.width = Program.canvas.width / 2;
        this.startPosX = Program.canvas.width * 1.05;
        this.finalPosX = Program.canvas.width - this.width;
        this.posY = 0;
        this.height = Program.canvas.height;
        ctx.font = 'bold ' + dictionaryTitleTextSize + 'px Segoe UI';
        ctx.textAlign = 'left';
        this.titleYoffset = centerText(ctx, this.title, this.width, dictionaryHeaderSize, dictionaryTitleTextSize).height;
        this.inited = true;
    }
    this.open = function ()
    {
        this.animState = true;
        this.willAnimate = true;
        this.consumeKeys = true;
        this.inited = false;
        Program.invalidate();
    }
    this.close = function ()
    {
        this.animState = false;
        this.willAnimate = true;
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
                    this.isAnimating = false;
                    this.isOpen = true;
                    this.willAnimate = false;
                    this.renderAt(ctx, this.finalPosX, this.posY, 1.0);
                    return false;
                }
                else
                {
                    this.renderAt(ctx, this.lerp(), this.posY, this.currentAnimAlpha);
                    this.currentAnimAlpha += dt / dictionaryAnimTimeSec;
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
                    this.currentAnimAlpha -= dt / dictionaryAnimTimeSec;
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
        return Math.pow(expConst, Math.pow(expConst, 0.5 * alpha) * alpha - 1) - Math.pow(expConst, -1);
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
            ctx.globalAlpha = bkgrAlpha * dictionaryBkgrTransparency;
            ctx.fillStyle = "#000000";
            ctx.strokeWeight = 0;
            ctx.fillRect(0, 0, Program.canvas.width, Program.canvas.height);
        }
        ctx.globalAlpha = 1.0;
        if (y >= Program.canvas.width) return;
        ctx.fillStyle = dictionaryBackground;
        ctx.strokeStyle = dictionaryAccent1;
        ctx.strokeWeight = 1;
        roundedRect(ctx, x, y, this.width, this.height, this.radius, true, true);
        ctx.strokeStyle = "#000000";
        ctx.fillStyle = dictionaryAccent1;
        roundedRect(ctx, x, y, this.width, dictionaryHeaderSize, this.headerRadius, true, false);
        ctx.fillStyle = "#ffffff";
        ctx.font = 'bold ' + dictionaryTitleTextSize + 'px Segoe UI';
        ctx.textAlign = 'left';
        var ypos = y + dictionaryHeaderSize;
        ctx.fillText(this.title, x + this.margin, y + this.titleYoffset, this.width - this.margin * 2);
    }
    this.onClose = function ()
    {
        this.consumeKeys = false;
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

    }
}