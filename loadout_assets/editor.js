const PAGES = {
    PRIMARY: 0,
    SECONDARY: 1,
    HANDS: 2,
    BACKPACK: 3,
    VEST: 4,
    SHIRT: 5,
    PANTS: 6,
    STORAGE: 7
}
const tileSize = 32;
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
        this.pages = new Pages(25, 25);
        this.pages.addPage(PAGES.HANDS, 5, 3, "Hands", tileSize, true);
        this.pages.addPage(PAGES.BACKPACK, 8, 5, "Backpack", tileSize, true);
        this.pages.addPage(PAGES.VEST, 5, 4, "Vest", tileSize, true);
        this.pages.addPage(PAGES.SHIRT, 6, 3, "Shirt", tileSize, true);
        this.pages.addPage(PAGES.PANTS, 4, 3, "Pants", tileSize, true);
        this.pages.addItem(3, new Item(31340, 1, 0, 4, 2, 0, "SCAR-L STD", "shoots", tileSize, 3));
        this.pages.addItem(2, new Item(31902, 1, 2, 2, 2, 0, "Anti-tank Mine", "blows up", tileSize, 2));
        this.pages.addItem(1, new Item(1440, 1, 1, 3, 3, 0, "Industrial Gas Can", "5000 fuel", tileSize, 1));
        this.pages.addItem(4, new Item(31903, 2, 1, 2, 2, 0, "Anti-tank Mine", "blows up", tileSize, 4));
        document.getElementById("canvas-container").appendChild(this.canvas);
        this.context = this.canvas.getContext("2d");
        this.interval = setInterval(tickInt, 0.1);
        this.context.font = '14px Segoe UI';
        this.updateScale();
        this.tick();
    },
    updateScale: function () 
    {
        this.canvas.width = window.innerWidth - 40;
        this.canvas.height = window.innerHeight - this.header.clientHeight - this.footer.clientHeight - 40;
        if (this.pages == null)
            console.warn("Pages is null");
        else
            this.pages.updateScale();
    },
    tick: function ()
    {
        if (!this.invalidated) return;
        var nextTick = new Date().getTime();
        var deltaTime = (nextTick - this.lastTick) / 1000.0;
        this.time += deltaTime;
        this.lastTick = nextTick;
        this.ticks++;
        tick(this.context, deltaTime, this.time, this.ticks, this.canvas);
        this.invalidated = false;
    },
    clearCanvas: function ()
    {
        this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
    },
    inputConsumed: true,
    onClick: function (x, y)
    {
        this.inputConsumed = false;
        this.pages.onClick(x, y);

        if (this.inputConsumed)
            this.tick();
    },
    onMouseMoved: function (x, y)
    {
        this.pages.onMouseMoved(x, y);
        this.tick();
    },
    time: 0.0,
    lastTick: 0,
    ticks: 0,
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
function tick(ctx, deltaTime, realtime, ticks, canvas)
{
    if (!ctx)
    {
        console.error("2D Canvas Context is null!!");
        return;
    }
    Program.clearCanvas();
    ctx.textAlign = 'right';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(deltaTime.toString() + " - " + realtime.toString() + " - " + ticks.toString(), Program.canvas.width - 5, 20);
    ctx.fillText("FPS: " + Math.round((1 / deltaTime)).toString(), Program.canvas.width - 5, 30);
    ctx.strokeRect(0, 0, canvas.width, canvas.height);
    Program.pages.render(ctx);
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
const clickedCellColor = "#880000";
const hoveredCellColor = "#1f1f5f";
function InventoryCell(page = 0, posX = 0, posY = 0, tileSize = 128, notation = "A1", coordX = 0, coordY = 0)
{
    this.page = page;
    this.coordX = coordX;
    this.coordY = coordY;
    this.notation = notation;
    this.tileSize = tileSize;
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
        roundedRectPath(ctx, this.posX, this.posY, this.tileSize, this.tileSize, this.radius);
        ctx.globalAlpha = 0.5;
        ctx.fillStyle = this.color;
        ctx.fill();
        ctx.globalAlpha = 1.0;
        ctx.strokeStyle = "#000000";
        ctx.stroke();
    } 
}
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
    this.getCellAtCoords = function (x, y)
    {
        for (var i = 0; i < this.pages.length; i++)
        {
            var cell = this.pages[i].page.getCellByCoords(x, y);
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
                if (cell.color == defaultCellColor || cell.color == hoveredCellColor)
                    cell.color = clickedCellColor;
                else cell.color = hoveredCellColor;
                Program.inputConsumed = true;
                Program.invalidate();
                break;
            }
        }
    }
    this.onMouseMoved = function(x, y)
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
                    if (cell.color != clickedCellColor)
                    {
                        cell.color = hoveredCellColor;
                        Program.invalidate();
                    }
                    if (this.hoveredCell != null && this.hoveredCell.notation != cell.notation && this.hoveredCell.color != clickedCellColor)
                    {
                        this.hoveredCell.color = defaultCellColor;
                        Program.invalidate();
                    }
                    this.hoveredCell = cell;
                    return true;
                }
            }
        }
        if (this.hoveredCell != null && this.hoveredCell.color != clickedCellColor)
        {
            this.hoveredCell.color = defaultCellColor;
            Program.invalidate();
            this.hoveredCell = null;
        }
        return false;
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
    this.addItem = function (page, item)
    {
        if (this.pages.length <= page)
        {
            console.warn(`Tried to add item with out of range page: ${page}.`);
            return false;
        }
        return this.pages[page].page.addItem(item);
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
        item.x = x;
        item.y = y;
        item.rotation = rotation;
        item.sizes = item.getSizes(item.rotation);
        item.pendingRotation = item.rotation;
        item.pendingSizes = item.sizes;
        if (item.page != page)
        {
            for (var i = 0; i < this.pages[item.page].page.items.length; i++)
            {
                var l_item = this.pages[item.page].page.items[i];
                if (l_item.x == item.x && l_item.y == item.y) this.pages[item.page].page.items.splice(i, 1);
            }
            this.pages[page].page.items.push(item);
        }
        item.page = page;
        return true;
    }
    this.verifyMove = function (item, x, y, rotation, page, sizes)
    {
        var bottomX = x + sizes.width;
        var bottomY = y + sizes.height;
        if (!(this.checkCoords(page, x, y) && this.checkCoords(page, bottomX - 1, bottomY - 1)))
            return false;
        for (var x1 = x; x1 < bottomX; x1++)
        {
            for (var y1 = y; y1 < bottomY; y1++)
            {
                if (this.pages[page].page.cells[x1][y1].occupied)
                {
                    console.log("Item blocked");
                    var bottomX2 = item.x + item.sizes.width;
                    var bottomY2 = item.y + item.sizes.height;
                    var found = false;
                    lbl2: // allow collision with self
                    for (var x2 = item.x; x2 < bottomX2; x2++)
                    {
                        for (var y2 = item.y; y2 < bottomY2; y2++)
                        {
                            if (this.pages[item.page].page.cells[x2][y2] == this.pages[page].page.cells[x1][y1])
                            {
                                found = true;
                                break lbl2;
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
        return this.pages.length > page && this.pages[page].page.cells.length > x && this.pages[page].page.cells[x].length > y;
    }
    this.addPage = function (page = {
        page: 0,
        pageID: 0,
        posX: 0,
        posY: 0,
        sizeX: 1,
        sizeY: 1,
        title: "",
        tileSize: 128
    }, holdUpdate = false)
    {
        this.pages.push({ page: page, column: 0, row: 0 });
        if (!holdUpdate)
            this.updateScale();
    }
    this.addPage = function (pageID = 0, sizeX = 1, sizeY = 1, title = "Page", tileSize = 128, holdUpdate = false)
    {
        this.pages.push({ page: new Page(this.pages.length, pageID, this.posX, this.posY, sizeX, sizeY, title, tileSize), column: 0, row: 0 });
        if (!holdUpdate)
            this.updateScale();
    }
}
function Page(page = 0, pageID = 0, posX = 0, posY = 0, sizeX = 4, sizeY = 3, title = "PAGE", tileSize = 128)
{
    this.page = page;
    this.pageID = pageID;
    this.posX = posX;
    this.posY = posY;
    this.tileSize = tileSize;
    this.sizeX = sizeX;
    this.sizeY = sizeY;
    this.title = title;
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
        ctx.fillText(this.title, this.titlePosX + this.titleSizeX / 2, this.posY + this.titleSizeY / 2 - 8.5);
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
    })
    {
        if (item == null)
        {
            console.warn(`Tried to add undefined item to page ${this.title}`);
            return;
        }
        this.items.push(item);
        Program.invalidate();
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
    this.getCellByCoords = function (x = 0, y = 0)
    {
        if (x < this.posX || x > this.gridSizeX) return false;
        if (y < this.gridStartY || y > this.gridStartY + this.gridSizeY) return false;
        var cell = this.cells[Math.floor((x - this.posX) / (this.tileSize + margin))];
        if (cell == null) return false;
        else
        {
            cell = cell[Math.floor((y - this.gridStartY) / (this.tileSize + margin))];
            if (cell == null) return false;
            else return cell;
        }
    }
    this.changeTransform = function (tileSize = -1, posX = -1, posY = -1, sizeX = -1, sizeY = -1)
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
const itemIconPrefix = "../loadout_assets/Items/";
const previewColor = "#ffffff";
const previewColorBad = "#ffaaaa";
const pickedColor = "#f0a0a0";
const placedColor = "#000000";
function Item(id = 0, x = 0, y = 0, sizeX = 1, sizeY = 1, rotation = 0, name = "#NAME", description = "#DESC", tileSize = 128, page = 0)
{
    this.id = id;
    this.x = x;
    this.y = y;
    this.page = page;
    this.sizeX = sizeX;
    this.sizeY = sizeY;
    this.rotation = rotation;
    this.pendingRotation = rotation;
    this.name = name;
    this.radius = getRadius(radius);
    this.description = description;
    this.tileSize = tileSize;
    this.isPicked = false;
    this.pickedLocationX = 0;
    this.pickedOffsetX = 0;
    this.pickedLocationY = 0;
    this.pickedOffsetY = 0;
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
        var bottomX = this.x + this.sizes.width;
        var bottomY = this.y + this.sizes.height;
        if (!(Program.pages.checkCoords(this.page, 0, 0) && Program.pages.checkCoords(this.page, bottomX - 1, bottomY - 1))) return;
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
        var bottomX = this.x + this.sizes.width;
        var bottomY = this.y + this.sizes.height;
        if (!Program.pages.checkCoords(this.page, 0, 0)) return;
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
            this.renderPreview(ctx, this.pickedLocationX + this.pickedOffsetX, this.pickedLocationY + this.pickedOffsetY);
            this.renderAt(ctx, this.pickedLocationX + this.pickedOffsetX - this.tileSize / 2,
                this.pickedLocationY + this.pickedOffsetY - this.tileSize / 2, pickedColor, 0.75, this.pendingRotation, this.pendingSizes);
            if (!Program.pages.checkCoords(this.page, this.x, this.y))
                return;
            var cell = Program.pages.pages[this.page].page.cells[this.x][this.y];
            this.renderAt(ctx, cell.posX, cell.posY, pickedColor, 0.25, this.rotation, this.sizes);
        }
        else
        {
            if (!Program.pages.checkCoords(this.page, this.x, this.y))
                return;
            var cell = Program.pages.pages[this.page].page.cells[this.x][this.y];
            this.renderAt(ctx, cell.posX, cell.posY, placedColor, 1, this.rotation, this.sizes);
        }
    }
    this.renderPreview = function (ctx, x, y)
    {
        var cell = Program.pages.getCellAtCoords(x, y);
        if (!cell)
            return;
        var valid = Program.pages.verifyMove(this, cell.coordX, cell.coordY, this.pendingRotation, cell.page, this.sizes);
        roundedRectPath(ctx, cell.posX, cell.posY, cell.tileSize * this.pendingSizes.width, cell.tileSize * this.pendingSizes.height, this.radius);
        ctx.globalAlpha = 0.5;
        ctx.fillStyle = valid ? previewColor : previewColorBad;
        ctx.fill();
        ctx.globalAlpha = 1.0;
        ctx.strokeStyle = "#000000";
        ctx.stroke();
    }
    this.renderAt = function (ctx, x, y, color, opacity = 1, rot = 0, sizes = { width: 1, height: 1 })
    {
        if (this.icon == null)
        {
            this.getIcon();
        }
        if (this.icon != null && this.icon.onload == null)
        {
            if (rot == 0 || rot > 3 || rot < 0)
            {
                if (opacity != 1)
                    ctx.globalAlpha = opacity;
                ctx.drawImage(this.icon, x, y, this.tileSize * this.sizeX, this.tileSize * this.sizeY);
            }
            else
            {
                var rotation;
                var width = this.tileSize * this.sizeX;
                var height = this.tileSize * this.sizeY;
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
                ctx.drawImage(this.icon, dx, dy, width, height);
                ctx.rotate(-rotation);
                ctx.translate(-x, -y);
            }
        }
        roundedRectPath(ctx, x, y, this.tileSize * sizes.width, this.tileSize * sizes.height, this.radius);
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
        this.pickedLocationX = x;
        this.pickedLocationY = y;
        Program.invalidate();
        return true;
    }
    this.onClick = function (x, y, c, page)
    {
        if (this.isPicked)
        {
            var cell = Program.pages.getCellAtCoords(this.pickedLocationX + this.pickedOffsetX, this.pickedLocationY + this.pickedOffsetY);
            // trash item?
            if (!cell) return;
            Program.inputConsumed = true;
            var moved = false;
            this.clearOccupiedFromSlots();
            if (this.x != cell.coordX || this.y != cell.coordY || this.pendingRotation != this.rotation)
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
                if (!Program.pages.checkCoords(this.page, this.x, this.y))
                    return;
                var cell = Program.pages.pages[this.page].page.cells[this.x][this.y];
                this.pickedLocationX = x;
                this.pickedOffsetX = cell.posX - x + this.tileSize / 2;
                this.pickedLocationY = y;
                this.pickedOffsetY = cell.posY - y + this.tileSize / 2;
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
function keyPress(event)
{
    if (event.keyCode === 82) // r
    {
        Program.pages.propogateRotate();
    }
    else if (event.keyCode === 84) // t
    {
        sendData({ kitName: "usrif2" }, "GetKit");
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