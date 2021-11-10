import { Program, ItemData } from "./editor.js";
import { NotImplementedException, Radius, TextMeasurement, roundedRectPath, onImageLoad, getScale } from "./util.js";
import * as C from "./const.js";
/**
 * Abstract page class
 */
export class Page
{
    /**
     * @callback CanContainItemDelegate
     * @param {ItemData} Item Deciding item
     * @returns {boolean} Can the page contain the item
     */

    /**
     * @callback ItemModifierDelegate
     * @param {Item} Item Modified item
     * @returns {void}
     */

    /** @type {number} */
    type;
    /** Page index
     *  @type {number} 
     **/
    page;
    /**
     * Determines whether an item can be placed in the page's slot(s).
     * @type {CanContainItemDelegate}
     */
    canEquip;
    /** @type {number} */
    columnX;
    /**
     * Corresponds with Unturned's page IDs.
     * @type {number}
     */
    pageID;
    /** @type {number} */
    posX;
    /** @type {number} */
    posY;
    /** @type {number} */
    tileSizeX;
    /** @type {number} */
    tileSizeY;
    /** @type {number} */
    gridSizeX;
    /** @type {number} */
    gridSizeY;
    /** @type {number} */
    pageSizeY;
    /** 
     * Number of cells in the X direction
     * @type {number} */
    sizeX;
    /** 
     * Number of cells in the Y direction
     * @type {number} */
    sizeY;
    /** @type {string} */   
    title;
    /** @type {Cell[][]} */ 
    cells;
    /** @type {Item[]} */
    items;
    /**
     * @param {number} page
     * @param {number} type
     * @param {number} pageID
     * @param {number} posX
     * @param {number} posY
     * @param {number} sizeX
     * @param {number} sizeY
     * @param {string} title
     * @param {number} tileSizeX
     * @param {number} tileSizeY
     * @param {CanContainItemDelegate} canEquip
     */
    constructor(type, page, pageID, sizeX, sizeY, title, tileSizeX, tileSizeY, canEquip)
    {
        this.type = type;
        this.page = page;
        this.pageID = pageID;
        this.posX = 0;
        this.posY = 0;
        this.sizeX = sizeX;
        this.sizeY = sizeY;
        this.title = title;
        this.tileSizeX = tileSizeX;
        this.tileSizeY = tileSizeY;
        this.canEquip = canEquip;
        this.items = [];
    }
    /**
     * Renders the background of the page (cells). Items will be rendered later.
     * @abstract
     * @param {CanvasRenderingContext2D} ctx Rendering Context
     */
    renderBackground(ctx)
    {
        throw new NotImplementedException(this.renderBackground, this);
    }

    /**
     * @abstract
     * @param {CanvasRenderingContext2D} ctx Rendering Context
     * @param {number} x X Position
     * @param {number} y Y Position
     * @param {number} columnX Width of the widest page in the column
     */
    updateDims(ctx, x, y, columnX)
    {
        throw new NotImplementedException(this.updateDims, this);
    }

    /**
     * Renders the foreground of the page (items).
     * @param {CanvasRenderingContext2D} ctx Rendering Context
     */
    renderForeground(ctx)
    {
        for (var i = 0; i < this.items.length; i++)
        {
            this.items[i].render(ctx);
        }
    }

    /**
     * Add an item to the page.
     * @abstract
     * @param {Item} item
     * @param {ItemModifierDelegate} mod Apply changes to the item object before adding it. Nullable.
     * @returns {boolean | Item} The item if successful, else false.
     */
    addItem(item, mod)
    {
        throw new NotImplementedException(this.addItem, this);
    }

    /**
     * Check if a set of cell coordinates are within the cell range.
     * @param {number} x
     * @param {number} y
     * @returns {boolean} If the coords are valid.
     */
    checkCoords(x, y)
    {
        return this.cells.length !== 0 && this.cells[0].length !== 0 && x >= 0 && y >= 0 && Number.isInteger(x) && Number.isInteger(y) && x < this.cells.length && y < this.cells[x].length;
    }

    /**
     * Returns the cell at the specified coordinates.
     * @param {number} x
     * @param {number} y
     * @returns {Cell | boolean} The cell if the coordinates are valid, otherwise false.
     */
    cell(x, y)
    {
        return this.checkCoords(x, y) ? this.cells[x][y] : false;
    }
    /**
     * Removes an item from the page and properly disposes of it.
     * @param {Item} item
     * @returns {boolean} True if the item was found and removed, false otherwise.
     */
    removeItem(item)
    {
        for (var i = 0; i < this.items.length; i++)
        {
            if (this.items[i].x === item.x && this.items[i].y === item.y)
            {
                this.items[i].dispose();
                this.items.splice(i, 1);
                return true;
            }
        }
        return false;
    }
    /**
     * Gets the cell at the given canvas relative position.
     * @abstract
     * @param {number} x X position in canvas coordinates.
     * @param {number} y Y position in canvas coordinates.
     * @param {boolean} round Should it round to the closest square or floor to the square.
     * @returns {Cell | boolean} Cell at position or false if not found
     */
    getCellFromPosition(x, y, round)
    {
        throw new NotImplementedException(this.getCellFromPosition, this);
    }
}

export class Pages
{

}
export class ContainerPage extends Page
{
    /** @type {number} */
    maxSizeX;
    /** @type {number} */
    textYOffset;
    /** @type {number} */
    gridStartY;
    /** @type {Radius} */
    titleRadius;
    /**
     * @param {number} type
     * @param {number} page
     * @param {number} pageID
     * @param {number} sizeX
     * @param {number} sizeY
     * @param {string} title
     * @param {number} tileSize
     * @param {CanContainItemDelegate} canEquip
     */
    constructor(type, page, pageID, sizeX, sizeY, title, tileSize, canEquip = () => true)
    {
        super(type, page, pageID, sizeX, sizeY, title, tileSize, tileSize, canEquip);
        this.type = 0;
        this.titleRadius = new Radius(C.titleRadius);
        this.cells = [];
        var ts = Math.min(this.tileSizeX, this.tileSizeY);
        for (var x = 0; x < this.sizeX; x++)
        {
            this.cells.push([]);
            var xpos = this.posX + (x * (this.tileSizeX + C.margin));
            for (var y = 0; y < this.sizeY; y++)
            {
                this.cells[x].push(new InventoryCell(this.page, xpos, this.gridStartY + (y * (this.tileSizeY + C.margin)), ts, x, y));
            }
        }
    }
    /**
     * Renders the background of the page (cells). Items will be rendered later.
     * @param {CanvasRenderingContext2D} ctx Rendering Context
     */
    renderBackground(ctx)
    {
        ctx.globalAlpha = 0.5;
        ctx.fillStyle = "#0f0f0f";
        roundedRect(ctx, this.posX, this.posY, this.gridSizeX, C.titleSize, this.titleRadius, true, false);
        ctx.globalAlpha = 1.0;
        ctx.textAlign = 'center';
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold ' + C.pageTitleFontSize.toString() + 'px Segoe UI';
        ctx.fillText(this.title, this.posX + this.gridSizeX / 2, this.posY + this.textYOffset, this.size);
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

    /**
     * Gets the cell at the given canvas relative position.
     * @param {number} x X position in canvas coordinates.
     * @param {number} y Y position in canvas coordinates.
     * @param {boolean} round Should it round to the closest square or floor to the square.
     * @returns {InventoryCell | boolean} Cell at position or false if not found
     */
    getCellFromPosition(x, y, round)
    {
        if (x < this.posX || x > this.posX + this.gridSizeX) return false;
        if (y < this.gridStartY || y > this.gridStartY + this.gridSizeY) return false;
        if (round)
        {
            var cell = this.cells[Math.round((x - this.posX) / (this.tileSizeX + C.margin))];
            if (cell == null)
                cell = this.cells[Math.floor((x - this.posX) / (this.tileSizeX + C.margin))];
            if (cell == null)
                cell = this.cells[Math.ceil((x - this.posX) / (this.tileSizeX + C.margin))];
            if (cell == null) return false;
            var cell2 = cell[Math.round((y - this.gridStartY) / (this.tileSizeY + C.margin))];
            if (cell2 == null)
                cell2 = cell[Math.floor((y - this.gridStartY) / (this.tileSizeY + C.margin))];
            if (cell2 == null)
                cell2 = cell[Math.ceil((y - this.gridStartY) / (this.tileSizeY + C.margin))];
            if (cell2 == null) return false;
            return cell2;
        }
        else
        {
            var cell = this.cells[Math.floor((x - this.posX) / (this.tileSizeX + C.margin))];
            if (cell == null) return false;
            cell = cell[Math.floor((y - this.gridStartY) / (this.tileSizeY + C.margin))];
            if (cell == null) return false;
            else return cell;
        }
    }

    /**
     * Add an item to the page.
     * @param {Item} item
     * @param {ItemModifierDelegate} mod Apply changes to the item object before adding it. Nullable.
     * @returns {boolean | Item} The item if successful, else false.
     */
    addItem(item, mod)
    {
        if (item !== null)
        {
            if (this.checkCoords(item.x, item.y))
            {
                if (mod !== null)
                    mod(item);
                item.tileSizeX = this.tileSizeX;
                item.tileSizeY = this.tileSizeY;
                item.inSlot = false;
                if (!this.items.includes(item))
                    this.items.push(item);
                item.applyOccupiedToSlots();
                Program.invalidate();
                return item;
            }
            else
            {
                console.warn("Item added to invalid position");
                console.warn(item);
                return false;
            }
        }
        else
        {
            console.error("Item null in addItem.");
            return false;
        }
    }

    /**
     * @param {CanvasRenderingContext2D} ctx Rendering Context
     * @param {number} x X Position
     * @param {number} y Y Position
     * @param {number} columnX Width of the widest page in the column
     */
    updateDims(ctx, x, y, columnX)
    {
        this.maxSizeX = columnX;
        this.posX = x;
        this.posY = y;
        this.gridSizeX = this.sizeX * (this.tileSizeX + C.margin);
        this.gridSizeY = this.sizeY * (this.tileSizeY + C.margin);
        this.gridStartY = this.posY + C.titleToGridDistance + C.titleSize;
        this.pageSizeY = this.gridSizeY + C.titleToGridDistance + C.titleSize;
        this.textYOffset = TextMeasurement.height(ctx, this.title, C.pageTitleFontSize)
    }
}

export class SlotPage extends Page
{
    /** Child page **pageID**
     * @type {number} */
    child;
    /** @type {string} */
    backgroundIconSrc;

    /**
     * @param {number} type
     * @param {number} page
     * @param {number} pageID
     * @param {number} tileSizeX
     * @param {number} tileSizeY
     * @param {string} title
     * @param {CanContainItemDelegate} canEquip
     * @param {string} background Background image path
     */
    constructor(type, page, pageID, tileSizeX, tileSizeY, title, canEquip = null, background = 'none')
    {
        super(type, page, pageID, sizeX, sizeY, title, tileSizeX, tileSizeY, canEquip);
        this.type = 1;
        this.backgroundIconSrc = background;
        this.cells = [[new SlotCell(this.page, this.posX, this.gridStartY, this.tileSizeX, this.tileSizeY, this.backgroundIconSrc)]];
    }
    /**
     * Renders the background of the page (cells). Items will be rendered later.
     * @param {CanvasRenderingContext2D} ctx Rendering Context
     */
    renderBackground(ctx)
    {
        this.cells[0][0].render(ctx);
    }
    /**
     * Renders the foreground of the page (items).
     * @param {CanvasRenderingContext2D} ctx Rendering Context
     */
    renderForeground(ctx)
    {
        if (this.items.length > 0)
            this.items[0].render(ctx);
    }
    /**
     * Gets the cell at the given canvas relative position.
     * @param {number} x X position in canvas coordinates.
     * @param {number} y Y position in canvas coordinates.
     * @param {boolean} round Should it round to the closest square or floor to the square.
     * @returns {SlotCell | boolean} Cell at position or false if not found
     */
    getCellFromPosition(x, y, round)
    {
        if (round)
        {
            return  x > this.posX - C.widthMarginBetweenPages / 2 && 
                    x < this.posX + C.widthMarginBetweenPages / 2 + this.gridSizeX &&
                    y > this.posY - C.heightMarginBetweenPages / 2 &&
                    y < this.posY + C.heightMarginBetweenPages / 2 + this.gridSizeY ? 
                        this.cells[0][0] : false;
        }
        else
        {
            return  x > this.posX && 
                    x < this.posX + this.gridSizeX &&
                    y > this.posY &&
                    y < this.posY + this.gridSizeY ? 
                        this.cells[0][0] : false;
        }
    }

    /**
     * Add an item to the page.
     * @param {Item} item
     * @param {ItemModifierDelegate} mod Apply changes to the item object before adding it. Nullable.
     * @returns {boolean | Item} The item if successful, else false.
     */
    addItem(item, mod)
    {
        if (this.items.length > 0)
        {
            console.warn("Slot occupied.");
            return false;
        }
        if (item !== null)
        {
            if (mod !== null)
                mod(item);
            item.x = 0;
            item.y = 0;
            item.rotation = 0;
            item.inSlot = true;
            this.cells[0][0].occupied = true;
            this.items.push(item);
            Program.invalidate();
            return item;
        }
        else
        {
            console.error("Item null in addItem.");
            return false;
        }
    }

    /**
     * @param {CanvasRenderingContext2D} ctx Rendering Context
     * @param {number} x X Position
     * @param {number} y Y Position
     * @param {number} columnX Width of the widest page in the column
     */
    updateDims(ctx, x, y, columnX)
    {
        this.maxSizeX = columnX;
        this.posX = x;
        this.posY = y;
        this.gridSizeX = this.tileSizeX;
        this.gridSizeY = this.tileSizeY;
        this.pageSizeY = this.tileSizeY;
    }
}

export class Cell
{
    /** @type {number} */
    type;
    /** @type {string} */
    get notation()
    {
        return this.title + "!" + C.alphabet[this.coordX] + (this.coordX + 1).toString();
    }
    /** @type {boolean} */
    occupied;
    /** @type {number} */
    coordX;
    /** @type {number} */
    coordY;
    /** @type {number} */
    posX;
    /** @type {number} */
    posY;
    /** @type {number} */
    tileSizeX;
    /** @type {number} */
    tileSizeY;
    /** @type {number} */
    page;
    /** @type {string} */
    displayColor;
    /**
     * @param {number} page 
     * @param {number} posX 
     * @param {number} posY 
     * @param {number} tileSizeX 
     * @param {number} tileSizeY 
     * @param {number} coordX 
     * @param {number} coordY 
     */
    constructor(page, tileSizeX, tileSizeY, coordX, coordY)
    {
        this.page = page;
        this.posX = 0;
        this.posY = 0;
        this.tileSizeX = tileSizeX;
        this.tileSizeY = tileSizeY;
        this.coordX = coordX;
        this.coordY = coordY;
        this.displayColor = C.defaultCellColor;
        this.occupied = false;
        this.type = 0;
    }
    /**
     * @returns {boolean} Occupied state
     */
    checkOccupied()
    {
        throw new NotImplementedException(this.checkOccupied, this);
    }
    
    /**
     * @param {CanvasRenderingContext2D} ctx Rendering context
     */
    render(ctx)
    {
        roundedRectPath(ctx, this.posX, this.posY, this.tileSizeX, this.tileSizeY, this.radius);
        ctx.globalAlpha = 0.5;
        ctx.fillStyle = this.occupied ? C.occupiedCellColor : this.displayColor;
        ctx.fill();
        ctx.globalAlpha = 1.0;
        ctx.strokeStyle = "#000000";
        ctx.stroke();
    }
}

export class InventoryCell extends Cell
{
    /**
     * @param {number} page
     * @param {number} coordX
     * @param {number} coordY
     */
    constructor(page, coordX, coordY)
    {
        super(page, C.tileSize, C.tileSize, coordX, coordY);
    }
    /**
     * @returns {boolean} Occupied state
     */
    checkOccupied()
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
}

export class SlotCell extends Cell
{
    /** @type {boolean} */
    #dontRequestImage;
    /** @type {string} */
    backgroundIconSrc;
    /** @type {HTMLImageElement} */
    background;
    /**
     * @param {number} page 
     * @param {number} sizeMultX 
     * @param {number} sizeMultY 
     * @param {number} coordX 
     * @param {number} coordY
     * @param {string} background
     */
    constructor(page, sizeMultX, sizeMultY, coordX, coordY, background = 'none')
    {
        super(page, sizeMultX * C.tileSize, sizeMultY * C.tileSize, coordX, coordY);
        this.type = 1;
        this.backgroundIconSrc = C.statIconPrefix + background;
        if (this.background && this.background !== 'none')
            this.getIcon();
    }
    /**
     * @returns {boolean} Occupied state
     */
    checkOccupied()
    {
        return Program.pages !== null && Program.pages.pages.length <= this.page && Program.pages[this.page].page.items.length > 0;
    }
    /**
     * Request background icon if it exists
     * @returns {void}
     */
    getIcon()
    {
        if (this.#dontRequestImage || this.backgroundIconSrc === null || this.backgroundIconSrc === "none") return;
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
    render(ctx)
    {
        if (!this.occupied && this.background == null && !this.#dontRequestImage)
        {
            this.getIcon();
        }
        roundedRectPath(ctx, this.posX, this.posY, this.tileSizeX, this.tileSizeY, C.SLOT_RADIUS);
        ctx.globalAlpha = 0.5;
        ctx.fillStyle = this.occupied ? occupiedCellColor : this.color;
        ctx.fill();
        if (!this.occupied && this.background != null)
        {
            ctx.globalAlpha = 0.03;
            try
            {
                ctx.drawImage(this.background, this.posX, this.posY, this.tileSizeX, this.tileSizeY);
            }
            catch 
            {
                this.#dontRequestImage = true;
            }
        }
        ctx.globalAlpha = 1.0;
        ctx.strokeStyle = "#000000";
        ctx.stroke();
    }
}

export class Item
{
    /**
     * @typedef {Object} Size
     * @property {number} width
     * @property {number} height
     */

    /** @type {number} */
    id;
    /** @type {number} */
    x;
    /** @type {number} */
    y;
    /** True if the item is picked and not in a slot
     * @type {boolean} */
    isOrphan;
    /** @type {ItemData} */
    item;
    /** @type {number} */
    page;
    /** @type {number} */
    rotation;
    /** @type {number} */
    sizeX;
    /** @type {number} */
    sizeY;
    /** @type {number} */
    pendingRotation;
    /** @type {number} */
    tileSizeX;
    /** @type {number} */
    tileSizeY;
    /** @type {boolean} */
    isPicked;
    /** @type {boolean} */
    inSlot;
    /** @type {Size} */
    sizes;
    /** @type {Size} */
    pendingSizes;
    /** @type {boolean} */
    #dontRequestImage;
    /** @type {number} */
    #pickedLocationX;
    /** @type {number} */
    #pickedLocationY;
    /** @type {number} */
    #pickedOffsetX;
    /** @type {number} */
    #pickedOffsetY;
    /** @type {number} */
    #deleteClicks;
    /** @type {number} */
    #lastClickTime;
    /** @type {HTMLImageElement} */
    #icon;

    /**
     * @param {number} id Item ID
     * @param {number} x 
     * @param {number} y 
     * @param {number} sizeX 
     * @param {number} sizeY 
     * @param {number} rotation 0-3
     * @param {number} page 
     * @param {ItemData} itemData 
     * @param {boolean} orphan True if the item is picked and not in a slot
     */
    constructor(id, x, y, sizeX, sizeY, rotation, page, itemData, orphan = false)
    {
        this.id = id;
        this.x = x;
        this.y = y;
        this.sizeX = sizeX;
        this.sizeY = sizeY;
        this.rotation = rotation;
        this.page = page;
        this.item = itemData;
        this.isOrphan = orphan;
        this.sizes = this.getSizes(this.rotation);
        this.pendingRotation = this.rotation;
        this.pendingSizes = this.getSizes(this.pendingRotation);
        this.inSlot = false;
        if (!this.isOrphan)
            this.applyOccupiedToSlots();
        this.#getIcon();
    }
    /**
     * Get the size of an item with specified rotation.
     * @param {number} rotation 0-3 
     * @returns {Size}
     */
    getSizes(rotation)
    {
        if (rotation % 2 === 1)
        {
            return {
                width: this.sizeY,
                height: this.sizeX
            };
        }
        else
        {
            return {
                width: this.sizeX,
                height: this.sizeY
            };
        }
    }
    /**
     * Applies the occupied boolean to all the slots the item takes up.
     */
    applyOccupiedToSlots()
    {
        if (this.inSlot)
        {
            Program.pages.pages[this.page].page.cells[0][0].occupied = true;
        }
        else
        {
            let bottomX = this.x + this.sizes.width;
            let bottomY = this.y + this.sizes.height;
            let page = Program.pages.pages[this.page].page;
            if (page.checkCoords(this.x, this.y) && page.checkCoords(bottomX, bottomY))
            {
                for (var x = this.x; x < bottomX; x++)
                {
                    for (var y = this.y; y < bottomY; y++)
                    {
                        page.cells[x][y].occupied = true;
                    }
                }
            }
        }
    }
    /**
     * Clears the occupied boolean from all the slots the item takes up.
     */
    clearOccupiedFromSlots()
    {
        if (this.inSlot)
        {
            Program.pages.pages[this.page].page.cells[0][0].occupied = false;
        }
        else
        {
            let bottomX = this.x + this.sizes.width;
            let bottomY = this.y + this.sizes.height;
            let page = Program.pages.pages[this.page].page;
            if (page.checkCoords(this.x, this.y) && page.checkCoords(bottomX, bottomY))
            {
                for (var x = this.x; x < bottomX; x++)
                {
                    for (var y = this.y; y < bottomY; y++)
                    {
                        page.cells[x][y].occupied = false;
                    }
                }
            }
        }
    }

    /**
     * Begin a request for the item's icon.
     */
    #getIcon()
    {
        if (this.#dontRequestImage) return;
        this.#icon = Program.pages.iconCache.get(this.id);
        if (!this.#icon)
        {
            this.#icon = new Image(sizeX * 512, sizeY * 512);
            this.#icon.id = this.id.toString();
            this.#icon.onload = onImageLoad;
            this.#icon.src = C.itemIconPrefix + this.id.toString() + ".png";
            Program.pages.iconCache.set(this.id, this.#icon);
        }
    }

    /**
     * Delete item from existance. Performs all necessary cleanup including invalidation.
     */
    dispose()
    {
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
        this.clearOccupiedFromSlots();
        /** @type {Page | ContainerPage | SlotPage} */
        let page = Program.pages.pages[this.page].page;
        for (var i = 0; i < page.items.length; i++)
        {
            let item = page.items[i];
            if (item.x === this.x && item.y === this.y)
            {
                page.items.splice(i, 1);
                break;
            }
        }
        this.inSlot = false;
        // remove slot's page child if their item gets removed.
        if (page.type === 1 && page.child && page.child >= 0)
        {
            for (var i = 0; i < Program.pages.pages.length; i++)
            {
                if (Program.pages.pages[i].page.pageID === page.child)
                {
                    Program.pages.pages.splice(i, 1);
                    page.child = -1;
                    Program.pages.updateScale();
                    Program.pages.sortPages();
                    break;
                }
            }
        }
        Program.invalidate();
    }

    /**
     * Render icon at position.
     * @param {CanvasRenderingContext2D} ctx 
     * @param {number} x 
     * @param {number} y 
     * @param {string} color 
     * @param {number} opacity 
     * @param {number} rot 
     * @param {Cell} cell 
     * @param {boolean} drawSize1Tile draw for a slot
     * @param {Size} sizes 
     * @param {boolean} showRotateIfInSlot 
     */
    renderAt(ctx, x, y, color, opacity = 1, rot = 0, cell = null, drawSize1Tile = false, sizes = null, showRotateIfInSlot = false)
    {
        if (this.icon == null && !this.#dontRequestImage)
        {
            this.#getIcon();
        }
        var width;
        var height;
        if (drawSize1Tile)
        {
            let scale = getScale(this.tileSizeX, this.tileSizeY, this.sizeX, this.sizeY);
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
                    this.#dontRequestImage = true;
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
                    this.#dontRequestImage = true;
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
        roundedRectPath(ctx, x, y, width, height, C.SLOT_RADIUS);
        ctx.globalAlpha = opacity * 0.5;
        ctx.fillStyle = color;
        ctx.fill();
        ctx.globalAlpha = opacity;
        ctx.strokeStyle = "#000000";
        ctx.stroke();
        if (opacity != 1)
            ctx.globalAlpha = 1.0;
    }
    
    /**
     * Render icon at position.
     * @param {CanvasRenderingContext2D} ctx 
     * @param {Cell} cell
     */
    renderPreview(ctx, cell)
    {
        var valid = Program.pages.verifyMove(this, cell.coordX, cell.coordY, this.#pendingRotation, cell.page, this.#pendingSizes);
        var single = cell.type == 1;
        roundedRectPath(ctx, cell.posX, cell.posY, single ? cell.tileSizeX : cell.tileSizeX * this.#pendingSizes.width, single ? cell.tileSizeY : cell.tileSizeY * this.#pendingSizes.height, C.SLOT_RADIUS);
        ctx.globalAlpha = 0.5;
        ctx.fillStyle = valid ? C.previewColor : C.previewColorBad;
        ctx.fill();
        ctx.globalAlpha = 1.0;
        ctx.strokeStyle = "#000000";
        ctx.stroke();
    }

    render(ctx)
    {
        if (this.isPicked)
        {
            let xo = this.#pickedLocationX + this.#pickedOffsetX;
            let yo = this.#pickedLocationY + this.#pickedOffsetY;
            /** @type {Cell} */
            var cell = Program.pages.getCellAtCoords(xo, yo, roundPlacement);
            this.renderPreview(ctx, cell);
            this.renderAt(ctx, xo, yo, pickedColor, 0.75, this.#pendingRotation, cell, this.inSlot, this.#pendingSizes, true);
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
    /**
     * @typedef {Object} Bounds
     * @property {number} x
     * @property {number} y
     * @property {number} width
     * @property {number} height
     */
    /**
     * Get the bounds in canvas coordinates of the item's placed position.
     * @type {Bounds}
     */
    get Bounds()
    {
        var rtn = { x: 0, y: 0, width: 0, height: 0 };
        if (this.isOrphan) return rtn;
        if (this.page < 0 || this.page > Program.pages.pages.length) return rtn;
        var cell = Program.pages.cell(this.page, this.x, this.y);
        if (!cell) return rtn;
        rtn.x = cell.posX;
        rtn.y = cell.posY;
        if (this.inSlot)
        {
            let scale = getScale(this.tileSizeX, this.tileSizeY, this.sizeX, this.sizeY);
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
    /**
     * @param {number} x Mouse Position X
     * @param {number} y Mouse Position Y
     * @returns {boolean} Move consumed
     */
    onMouseMoved(x, y)
    {
        if (!this.isPicked) return false;
        Program.moveConsumed = true;
        this.#pickedLocationX = x;
        this.#pickedLocationY = y;
        Program.invalidate();
        return true;
    }
    /**
     * @param {number} x Mouse Position X
     * @param {number} y Mouse Position Y
     * @returns {void}
     */
    onClick(x, y)
    {
        if (this.isPicked)
        {
            /** @type {Cell} */
            var cell = Program.pages.getCellAtCoords(this.#pickedLocationX + this.#pickedOffsetX, this.#pickedLocationY + this.#pickedOffsetY, C.roundPlacement);
            if (!cell)
            {
                cell = Program.pages.getCellAtCoords(this.#pickedLocationX + this.#pickedOffsetX, this.#pickedLocationY + this.#pickedOffsetY, !C.roundPlacement);
                if (!cell)
                {
                    // double click
                    if (this.#deleteClicks == 0 || Program.time - this.#lastClickTime > 0.2)
                    {
                        this.#deleteClicks = 1;
                        this.#lastClickTime = Program.time;
                    }
                    else
                        this.dispose();
                    return;
                }
            }
            Program.mouseBtn1Consumed = true;
            var moved = false;
            this.clearOccupiedFromSlots();
            if (this.page != cell.page || this.x != cell.coordX || this.y != cell.coordY || this.pendingRotation != this.rotation)
                moved = Program.pages.moveItem(this, cell.coordX, cell.coordY, this.pendingRotation, cell.page, this.pendingSizes);
            this.isPicked = false;
            this.isOrphan = false;
            this.applyOccupiedToSlots();
            Program.pages.pickedItem = null;
            Program.invalidate();
        }
        else
        {
            if (Program.pages.pickedItem != null)
            {
                return;
            }
            else
            {
                /** @type {Cell} */
                var cell = Program.pages.pages[this.page].page.cell(this.page, this.x, this.y);
                if (!cell) return;
                this.#pickedLocationX = x;
                this.#pickedLocationY = y;
                if (this.inSlot)
                {
                    let ratio = getScale(this.tileSizeX, this.tileSizeY, this.sizeX, this.sizeY)
                    if (x == cell.posX) this.#pickedOffsetX = 0;
                    else
                    {
                        this.#pickedOffsetX = (x - cell.posX) / (this.sizeX * ratio);
                        if (this.#pickedOffsetX > 1) this.#pickedOffsetX = 1;
                        this.#pickedOffsetX *= C.tileSize * this.sizeX * -1;
                    }
                    if (y == cell.posY) this.#pickedOffsetY = 0;
                    else
                    {
                        this.#pickedOffsetY = (y - cell.posY) / (this.sizeY * ratio);
                        if (this.#pickedOffsetY > 1) this.#pickedOffsetY = 1;
                        this.#pickedOffsetY *= C.tileSize * this.sizeY * -1;
                    }
                }
                else
                {
                    this.#pickedOffsetX = cell.posX - x + (this.tileSizeX / 3.0) * ((this.sizeX - 1.0) / 3);
                    this.#pickedOffsetY = cell.posY - y + (this.tileSizeY / 3.0) * ((this.sizeY - 1.0) / 3);
                }
                Program.mouseBtn1Consumed = true;
                Program.pages.pickedItem = this;
                this.isPicked = true;
                Program.invalidate();
            }
        }
    }
    /**
     * Add one to the rotation and update the correct variables.
     */
    rotateOnce()
    {
        if (this.isPicked)
        {
            this.#pendingRotation = (this.#pendingRotation + 1) % 4;
            this.#pendingSizes = this.getSizes(this.#pendingRotation);
        }
        else
        {
            this.rotation = (this.rotation + 1) % 4;
            this.#pendingRotation = this.rotation;
            this.sizes = this.getSizes(this.rotation);
            this.#pendingSizes = this.getSizes(this.rotation);
        }
        Program.invalidate();
    }
    /**
     * @returns {Bounds | boolean} If the point in canvas coordinates is on the item, it's bounds, else false.
     * @param {number} x Position X
     * @param {number} y Position Y
     */
    isPointInside(x, y)
    {
        var bounds = this.getBounds();
        return x > bounds.x && x < bounds.x + bounds.width && y > bounds.y && y < bounds.y + bounds.height ? bounds : false;
    }
}