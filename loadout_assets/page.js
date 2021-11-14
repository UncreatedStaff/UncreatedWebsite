import { NotImplementedException, Radius, TextMeasurement, roundedRectPath, onImageLoad, getScale, roundedRect } from "./util.js";
import { PAGES, Program, PAGEORDER } from "./editor.js";
import * as C from "./const.js";
/** @typedef {import('./editor.js').ItemData} ItemData */

export class Pages
{
    /** @type {number} */
    posX;
    /** @type {number} */
    posY;
    /** @type {Cell} */
    hoveredCell;
    /** @type {Page[]} */
    pages;
    /** @type {Item} */
    pickedItem;
    /** @type {Map<number | string, HTMLImageElement>} */
    iconCache;

    /**
     * @param {number} posX 
     * @param {number} posY 
     */
    constructor(posX, posY)
    {
        this.posX = posX;
        this.posY = posY;
        this.pages = [];
        this.iconCache = new Map();
    }
    /**
     * Calculate columns and rows where pages should reside and set their position properly.
     */
    updateScale()
    {
        if (this.pages.length === 0) return;
        if (this.pages.length === 1)
        {
            this.pages[0].updateDims();
            this.pages[0].changeTransform(null, this.posX, this.posY, null, null);
            this.pages[0].column = 0;
            this.pages[0].row = 0;
            this.pages[0].columnX = this.pages[0].gridSizeX;
            return;
        }
        let canvHeight = Program.canvas.height;
        var column = 0;
        var row = 0;
        var maxWidth = 0;
        var widthOffset = 0;
        var total = this.posX;
        for (var i = 0; i < this.pages.length; i++)
            this.pages[i].updateDims();
        for (var i = 0; i < this.pages.length; i++)
        {
            var height = this.pages[i].pageSizeY;
            var width = this.pages[i].titleWidth ? Math.max(this.pages[i].gridSizeX, this.pages[i].titleWidth) : this.pages[i].gridSizeX;
            if (height + total > canvHeight)
            {
                total = height + C.heightMarginBetweenPages;
                var theight = this.posY;
                column++;
                row = 1;
                this.pages[i].columnX = this.pages[i].gridSizeX;
                for (var j = i; j < this.pages.length; j++)
                {
                    this.pages[j].changeTransform(null, this.posX + widthOffset + maxWidth + (column === 1 ? C.widthMarginBetweenPages : 0), theight, null, null);
                    this.pages[j].row = j;
                    this.pages[j].column = column;
                    theight = this.pages[j].posY + this.pages[j].pageSizeY + C.heightMarginBetweenPages;
                }
                widthOffset += maxWidth + C.widthMarginBetweenPages + (column === 1 ? C.widthMarginBetweenPages : 0);
                maxWidth = width;
            }
            else
            {
                var newy = row === 0 || i === 0 ? this.posY : this.pages[i - 1].posY + this.pages[i - 1].pageSizeY + C.heightMarginBetweenPages;
                this.pages[i].changeTransform(null, column === 0 ? this.posX : null, newy, null, null);
                this.pages[i].column = column;
                this.pages[i].row = row;
                row++;
                if (maxWidth < width) maxWidth = width;
                total += height + C.heightMarginBetweenPages;
                if (this.pages.length <= i + 1 || (i >= 0 && this.pages[i + 1].pageSizeY + total > canvHeight))
                {
                    // set the previous pages in this column to the newly found max width on the last page in the column
                    for (var j = i - 1; j >= 0 && this.pages[j].column === this.pages[i].column; j--)
                        this.pages[j].columnX = maxWidth;
                }
                this.pages[i].columnX = maxWidth;
            }
        }
    }
    /**
     * Gets the cell at the given canvas relative position.
     * @param {number} x X position in canvas coordinates.
     * @param {number} y Y position in canvas coordinates.
     * @param {boolean} round Should it round to the closest square or floor to the square.
     * @returns {Cell | boolean} Cell at position or false if not found
     */
    getCellFromPosition(x, y, round = false)
    {
        for (var i = 0; i < this.pages.length; i++)
        {
            var cell = this.pages[i].getCellFromPosition(x, y, round);
            if (cell) return cell;
        }
        return false;
    }
    /**
     * Render background and foreground of pages and items.
     * @param {CanvasRenderingContext2D} ctx 
     */
    render(ctx)
    {
        for (var i = 0; i < this.pages.length; i++)
        {
            this.pages[i].renderBackground(ctx);
        }
        for (var i = 0; i < this.pages.length; i++)
        {
            this.pages[i].renderForeground(ctx);
        }
        if (this.pickedItem != null)
        {
            this.pickedItem.render(ctx);
        }
    }
    /**
     * @param {number} x Mouse Position X
     * @param {number} y Mouse Position Y
     */
    onClick(x, y)
    {
        if (this.pickedItem != null)
        {
            this.pickedItem.onClick(x, y);
            if (Program.mouseBtn1Consumed) return;
        }
        pages:
        for (var i = 0; i < this.pages.length; i++)
        {
            /** @type {Cell} */
            let cell = this.pages[i].getCellFromPosition(x, y, false);
            if (cell)
            {
                for (var j = 0; j < this.pages[i].items.length; j++)
                {
                    var item = this.pages[i].items[j];
                    if (!item.isPicked && cell.coordX >= item.x && cell.coordY >= item.y && cell.coordX < item.x + item.sizes.width && cell.coordY < item.y + item.sizes.height)
                    {
                        item.onClick(x, y);
                        if (Program.mouseBtn1Consumed)
                        {
                            Program.invalidate();
                            return;
                        }
                        else
                        {
                            break pages;
                        }
                    }
                }
            }
        }
    }
    /**
     * @param {number} x Mouse Position X
     * @param {number} y Mouse Position Y
     */
    onRightClick(x, y)
    {
        if (this.pickedItem) return;
        for (var i = 0; i < this.pages.length; i++)
        {
            /** @type {Cell} */
            let cell = this.pages[i].getCellFromPosition(x, y, false);
            if (cell)
            {
                for (var j = 0; j < this.pages[i].items.length; j++)
                {
                    var item = this.pages[i].items[j];
                    if (!item.isPicked && cell.coordX >= item.x && cell.coordY >= item.y && cell.coordX < item.x + item.sizes.width && cell.coordY < item.y + item.sizes.height)
                    {
                        Program.savedContextMenus[0].open(x, y, item, item.item.LocalizedName);
                        return;
                    }
                }
            }
        }
    }
    /**
     * @param {number} x Mouse Position X
     * @param {number} y Mouse Position Y
     */
    onMouseMoved(x, y)
    {
        if (this.pickedItem)
        {
            this.pickedItem.onMouseMoved(x, y);
        }
        for (var i = 0; i < this.pages.length; i++)
        {
            //console.log(i);
            if (x < this.pages[i].posX - C.tileSize / 2) break;
            if (y < this.pages[i].posY - C.tileSize / 2) continue;
            if (x > this.pages[i].posX + C.tileSize / 2 + this.pages[i].gridSizeX) continue;
            if (y > this.pages[i].posY + C.tileSize / 2 + this.pages[i].pageSizeY) continue;
            for (var t = 0; t < this.pages[i].items.length; t++)
            {
                if (this.pages[i].items[t].onMouseMoved(x, y)) break;
            }
            /** @type {Cell} */
            let cell = this.pages[i].getCellFromPosition(x, y);
            if (cell)
            {
                cell.displayColor = C.hoveredCellColor;
                if (this.hoveredCell !== cell)
                {
                    if (this.hoveredCell != null)
                        this.hoveredCell.displayColor = C.defaultCellColor;
                    this.hoveredCell = cell;
                    Program.invalidate();
                }
                Program.moveConsumed = true;
                return true;
            }
        }
        if (this.hoveredCell != null)
        {
            this.hoveredCell.displayColor = C.defaultCellColor;
            this.hoveredCell = null;
            Program.moveConsumed = true;
            Program.invalidate();
            return true;
        }
        return false;
    }
     /**
      * @param {KitData} kitdata 
      */
    loadKit(kitdata)
    {
        // clear item pages.
        for (var i = this.pages.length - 1; i >= 0; i--)
        {
            if (this.pages[i].type != 1 && this.pages[i].pageID != PAGES.HANDS)
            {
                this.pages.splice(i, 1);
            }
            else
            {
                this.pages[i].items.splice(0);
                this.pages[i].cells[0][0].occupied = false;
            }
        }
        for (var i = 0; i < kitdata.Kit.Clothes.length; i++)
        {
            if (kitdata.Kit.Clothes[i].ID === 0) continue;
            /** @type {number} */
            var pageID;
            /** @type {number} */
            var newPageID;
            if (kitdata.Kit.Clothes[i].type === 0) // shirt
            {
                pageID = PAGES.C_SHIRT;
                newPageID = PAGES.SHIRT;
            }
            else if (kitdata.Kit.Clothes[i].type === 1) // pants
            {
                pageID = PAGES.C_PANTS;
                newPageID = PAGES.PANTS;
            }
            else if (kitdata.Kit.Clothes[i].type === 2) // vest
            {
                pageID = PAGES.C_VEST;
                newPageID = PAGES.VEST;
            }
            else if (kitdata.Kit.Clothes[i].type === 3) // hat
            {
                pageID = PAGES.C_HAT;
                newPageID = NaN;
            }
            else if (kitdata.Kit.Clothes[i].type === 4) // mask
            {
                pageID = PAGES.C_MASK;
                newPageID = NaN;
            }
            else if (kitdata.Kit.Clothes[i].type === 5) // backpack
            {
                pageID = PAGES.C_BACKPACK;
                newPageID = PAGES.BACKPACK;
            }
            else if (kitdata.Kit.Clothes[i].type === 6) // glasses
            {
                pageID = PAGES.C_GLASSES;
                newPageID = NaN;
            }
            else continue;
            slotSearch:
            for (var p = 0; p < this.pages.length; p++)
            {
                if (this.pages[p].pageID == pageID)
                {
                    for (var d = 0; d < Program.DATA.items.length; d++)
                    {
                        if (Program.DATA.items[d] == null) continue;
                        if (Program.DATA.items[d].ItemID == kitdata.Kit.Clothes[i].ID)
                        {
                            var data = Program.DATA.items[d];
                            this.pages[p].addItem(new Item(data.ItemID, 0, 0, data.SizeX, data.SizeY, 0, p, data, false));
                            if (!isNaN(newPageID))
                            {
                                var newpage = this.addContainer(newPageID, data.Width, data.Height, data.LocalizedName, C.tileSize, true, null);
                                newpage.slotOwner = pageID;
                                this.pages[p].child = newPageID;
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
                if (this.pages[p].pageID == kititem.page)
                {
                    if (this.checkCoords(p, kititem.x, kititem.y))
                    {
                        if (!this.pages[p].addItem(new Item(kititem.ID, kititem.x, kititem.y, data.SizeX,
                            data.SizeY, kititem.rotation, p, data, false)))
                            console.warn(`${kititem.ID} failed to add ^^`);
                        break;
                    }
                }
            }
        }
        this.sortPages();
        this.updateScale();
        Program.invalidate();
    }
    /**
     * Add an item to its set page.
     * @param {Item} item 
     * @param {ItemModifierDelegate} mod 
     */
    addItem(item, mod)
    {
        if (this.pages.length <= item.page || item.page < 0)
        {
            console.warn(`Tried to add item with out of range page: ${page}.`);
            return false;
        }
        return this.pages[item.page].addItem(item, mod);
    }
    /**
     * Rotate the picked item by 90 degrees.
     */
    propogateRotate()
    {
        this.pickedItem?.rotateOnce();
    }
    /**
     * Move a placed or orphan item from one point to another. Updates all necessary values.
     * @param {Item} item
     * @param {number} x
     * @param {number} y
     * @param {number} rotation
     * @param {number} page
     * @param {Size} sizes
     */
    moveItem(item, x, y, rotation, page, sizes)
    {
        if (!this.verifyMove(item, x, y, rotation, page, sizes))
        {
            return false;
        }
        if (item.page !== page)
        {
            if (item.page < 0)
            {
                let pg = this.pages[page];
                item.x = x;
                item.y = y;
                item.page = page;
                console.log(item);
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
                    if (!isNaN(newPageID) && item.item.Width && item.item.Height)
                    {
                        var newpage = this.addContainer(newPageID, item.item.Width, item.item.Height, item.item.LocalizedName, true, null);
                        newpage.slotOwner = pg.pageID;
                        pg.child = newPageID;
                        this.sortPages();
                        this.updateScale();
                    }
                    return true;
                }
                else
                {
                    item.inSlot = false;
                    item.rotation = rotation;
                    item.tileSizeX = pg.tileSizeX;
                    item.tileSizeY = pg.tileSizeY;
                    item.sizes = item.getSizes(item.rotation);
                    item.pendingRotation = item.rotation;
                    item.pendingSizes = item.sizes;
                    return true;
                }
            }
            else
            {
                let pg = this.pages[page];
                let oldpg = this.pages[item.page];
                
                for (var i = 0; i < oldpg.items.length; i++) // clear from other page
                    if (oldpg.items[i].x == item.x && oldpg.items[i].y == item.y) oldpg.items.splice(i, 1);
                if (pg.type === 1)
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
                    if (!isNaN(newPageID) && item.item.Width && item.item.Height)
                    {
                        var newpage = this.addContainer(newPageID, item.item.Width, item.item.Height, item.item.LocalizedName, true, null);
                        newpage.slotOwner = pg.pageID;
                        pg.child = newPageID;
                        this.sortPages();
                        this.updateScale();
                    }
                    return true;
                }
                else
                {
                    item.tileSizeX = pg.tileSizeX;
                    item.tileSizeY = pg.tileSizeY;
                    item.page = page;
                    item.inSlot = false;
                    item.x = x;
                    item.y = y;
                    item.rotation = rotation;
                    item.sizes = item.getSizes(item.rotation);
                    item.pendingRotation = item.rotation;
                    item.pendingSizes = item.sizes;
                    item.page = page;
                    pg.items.push(item);
                    if (oldpg.type === 1 && oldpg.child && oldpg.child != pg.pageID)
                    {
                        for (var i = 0; i < this.pages.length; i++)
                        {
                            if (this.pages[i].pageID === oldpg.child)
                            {
                                if (page > i) page--;
                                this.pages.splice(i, 1);
                                oldpg.child = null;
                                this.updateScale();
                                this.sortPages();
                                break;
                            }
                        }
                    }
                    return true;
                }
            }
        }
        item.x = x;
        item.y = y;
        item.rotation = rotation;
        item.sizes = item.getSizes(item.rotation);
        item.pendingRotation = item.rotation;
        item.pendingSizes = item.sizes;
        return true;
    }
    /**
     * Check if a move is valid.
     * @param {Item} item
     * @param {number} x
     * @param {number} y
     * @param {number} rotation
     * @param {number} page
     * @param {Size} sizes
     * @returns {boolean} Valid move.
     */
    verifyMove(item, x, y, rotation, page, sizes)
    {
        if (!this.checkCoords(page, x, y))
            return false;
        if (item.page === page && item.x === x && item.y === y && item.rotation === rotation)
            return true;
        let dstPage = this.pages[page];
        if (dstPage.canEquip != null && typeof dstPage.canEquip === 'function' && !dstPage.canEquip(item)) return false;
        if (dstPage.type === 1) // is slot page
        {
            if (!dstPage.cells[x][y].occupied || (dstPage.items.length > 0 && dstPage.items[0] === item))
                return true;
            else return false;
        }
        if (item.page > 0 && dstPage.slotOwner && dstPage.slotOwner === this.pages[item.page].pageID)
            return false;
        let bottomX = x + sizes.width;
        let bottomY = y + sizes.height;
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
                                if (this.pages[item.page].cells[x2][y2] == dstPage.cells[x1][y1])
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
    /**
     * Verify that the given page, x, and y are in range of the available pages and their sizes.
     * @param {number} page 
     * @param {number} x 
     * @param {number} y 
     * @returns 
     */
    checkCoords(page, x, y)
    {
        return page >= 0 && x >= 0 && y >= 0 && this.pages.length > page && this.pages[page].cells.length > x && this.pages[page].cells[x].length > y;
    }
    /**
     * Add **ContainerPage** to the inventory.
     * @param {number} pageID 
     * @param {number} sizeX 
     * @param {number} sizeY 
     * @param {string} title 
     * @param {boolean} holdUpdate 
     * @param {CanContainItemDelegate} addConstraint 
     * @returns {ContainerPage}
     */
    addContainer(pageID, sizeX, sizeY, title, holdUpdate = false, addConstraint = null)
    {
        var page = new ContainerPage(this.pages.length, pageID, sizeX, sizeY, title, C.tileSize, holdUpdate, addConstraint);
        this.pages.push(page);
        if (!holdUpdate)
        {
            this.sortPages();
            this.updateScale();
        }
        return page;
    }

    /**
     * @param {number} pageID 
     * @param {string} title 
     * @param {number} tileMultX 
     * @param {number} tileMultY 
     * @param {boolean} holdUpdate 
     * @param {string} background 
     * @param {CanContainItemDelegate} addConstraint 
     * @returns {SlotPage}
     */
    addSlot(pageID, title, tileMultX, tileMultY, holdUpdate = false, background = 'none', addConstraint = null)
    {
        var page = new SlotPage(this.pages.length, pageID, tileMultX, tileMultY, title, addConstraint, background);
        this.pages.push(page);
        if (!holdUpdate)
        {
            this.sortPages();
            this.updateScale();
        }
        return page;
    }

    /**
     * Sorts pages based on PAGEORDER array and updates the necessary values, run updateScale afterwards.
     */
    sortPages()
    {
        var remaining = this.pages;
        this.pages = [];
        for (var i = 0; i < PAGEORDER.length; i++)
        {
            var pageID = PAGEORDER[i];

            for (var p = remaining.length - 1; p >= 0; p--)
            {
                if (remaining[p].pageID === pageID)
                {
                    var newIndex = this.pages.length;
                    this.pages.push(remaining[p]);
                    for (var x = 0; x < this.pages[newIndex].cells.length; x++)
                    {
                        for (var y = 0; y < this.pages[newIndex].cells[x].length; y++)
                        {
                            this.pages[newIndex].cells[x][y].page = newIndex;
                        }
                    }
                    for (var t = 0; t < this.pages[newIndex].items.length; t++)
                    {
                        this.pages[newIndex].items[t].page = newIndex;
                    }
                    this.pages[newIndex].page = newIndex;
                    remaining.splice(p, 1);
                }
            }
        }
        for (var i = 0; i < remaining.length; i++)
        {
            for (var x = 0; x < remaining[i].cells.length; x++)
            {
                for (var y = 0; y < remaining[i].cells[x].length; y++)
                {
                    remaining[i].cells[x][y].page = this.pages.length;
                }
            }
            for (var x = 0; x < remaining[i].items.length; x++)
            {
                remaining[i].items[x].page = this.pages.length;
            }
            this.pages.push(remaining[i]);
        }
    }
    /**
     * Get the cell at the given page and coordinates.
     * @param {number} page 
     * @param {number} x 
     * @param {number} y 
     * @returns {Cell | boolean} A cell if it's found, otherwise false
     */
    cell(page, x, y)
    {
        return this.checkCoords(page, x, y) ? this.pages[page].cells[x][y] : false;
    }
}

/**
 * Abstract page class
 */
export class Page
{
    /**
     * @callback CanContainItemDelegate
     * @param {Item} Item Deciding item
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
    /** @type {number} */
    column;
    /** @type {number} */
    row;
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
     */
    updateDims()
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
            if (!this.items[i].isPicked)
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

    /**
     * Modify various transform values of the page and update all variables accordingly.
     * @abstract
     * @param {number} tileSizeX Tile size X of the cells.
     * @param {number} posX Position X
     * @param {number} posY Position Y
     * @param {number} sizeX Cell count X 
     * @param {number} sizeY Cell count Y
     * @param {number} tileSizeY Tile size Y of the cells.
     */
    changeTransform(tileSizeX = -1, posX = -1, posY = -1, sizeX = -1, sizeY = -1, tileSizeY = -1)
    {
        throw new NotImplementedException(this.changeTransform, this);
    }
    /**
     * @param {string} title
     */
    changeTitle(title)
    {
        throw new NotImplementedException(this.changeTitle, this);
    }
}

export class ContainerPage extends Page
{
    /** @type {number} */
    textYOffset;
    /** @type {number} */
    gridStartY;
    /** @type {Radius} */
    titleRadius;
    /** @type {number} */
    slotOwner;
    /** @type {number} */
    titleWidth;
    
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
    constructor(page, pageID, sizeX, sizeY, title, tileSize, canEquip = () => true)
    {
        super(0, page, pageID, sizeX, sizeY, title, tileSize, tileSize, canEquip);
        this.titleRadius = new Radius(C.titleRadius);
        this.cells = [];
        for (var x = 0; x < this.sizeX; x++)
        {
            this.cells.push([]);
            for (var y = 0; y < this.sizeY; y++)
            {
                this.cells[x].push(new InventoryCell(this.page, x, y));
            }
        }
        this.titleWidth = 0;
        this.updateDims();
    }
    /**
     * Renders the background of the page (cells). Items will be rendered later.
     * @param {CanvasRenderingContext2D} ctx Rendering Context
     */
    renderBackground(ctx)
    {
        ctx.globalAlpha = 0.5;
        ctx.fillStyle = "#0f0f0f";
        roundedRect(ctx, this.posX, this.posY, this.columnX, C.titleSize, this.titleRadius, true, false);
        ctx.globalAlpha = 1.0;
        ctx.textAlign = 'center';
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold ' + C.pageTitleFontSize.toString() + 'px Segoe UI';
        ctx.fillText(this.title, this.posX + this.columnX / 2, this.posY + (C.titleSize - 2 * this.textYOffset), this.size);
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
                if (this.canEquip == null || typeof this.canEquip !== 'function' || this.canEquip(item))
                {
                    if (mod != null)
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
                else return false;
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

    updateDims()
    {
        this.gridSizeX = this.sizeX * (this.tileSizeX + C.margin);
        this.gridSizeY = this.sizeY * (this.tileSizeY + C.margin);
        this.gridStartY = this.posY + C.titleToGridDistance + C.titleSize;
        this.pageSizeY = this.gridSizeY + C.titleToGridDistance + C.titleSize;
        var txt = new TextMeasurement(Program.context, this.title, C.pageTitleFontSize);
        this.textYOffset = txt.up;
        this.titleWidth = txt.width;
    }
    /**
     * Modify various transform values of the page and update all variables accordingly.
     * @param {number} tileSize Tile size (square) of the cells.
     * @param {number} posX Position X
     * @param {number} posY Position Y
     * @param {number} sizeX Cell count X 
     * @param {number} sizeY Cell count Y
     * @param {number} tileSizeY Not used for container pages.
     */
    changeTransform(tileSizeX = -1, posX = -1, posY = -1, sizeX = -1, sizeY = -1, tileSizeY = -1)
    {
        tileSizeY = tileSizeX;
        var tileSizeChange = tileSizeX != null && tileSizeX > -1 && tileSizeX != this.tileSizeX;
        if (!tileSizeX || tileSizeX <= 0) tileSizeX = this.tileSizeX;
        else if (tileSizeChange) 
        {
            this.tileSizeX = tileSizeX;
            this.tileSizeY = tileSizeX;
        }
        var xChange = posX != null && posX > -1 && posX != this.posX;
        if (posX === null || posX < 0) posX = this.posX;
        else if (xChange) this.posX = posX;
        var yChange = posY != null && posY > -1 && posY != this.posY;
        if (posY == null || posY < 0) posY = this.posY;
        else if (yChange)
        {
            this.posY = posY;
            this.gridStartY = this.posY + C.titleToGridDistance + C.titleSize;
        }
        var sizeYChange = sizeY != null && sizeY >= 0 && this.sizeY != sizeY;
        var sizeXChange = sizeX != null && sizeX >= 0 && this.sizeX != sizeX;
        if (sizeXChange)
        {
            if (this.sizeX < sizeX)
            {
                for (var x = this.sizeX; x < sizeX; x++)
                {
                    var cells = [];
                    for (var y = 0; y < this.sizeY; y++)
                    {
                        cells.push(new InventoryCell(this.page, x, y));
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
                    this.cells[x] = null
                }
                this.cells.splice(sizeX);
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
                        cells.push(new InventoryCell(this.page, x, y));
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
                    cells[x].splice(sizeY);
                }
            }
            this.sizeY = sizeY;
        }
        if (xChange)
        {
            for (var x = 0; x < this.sizeX; x++)
            {
                var xpos = this.posX + (x * (this.tileSizeX + C.margin));
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
                var ypos = this.gridStartY + (y * (this.tileSizeY + C.margin));
                for (var x = 0; x < this.sizeX; x++)
                {
                    this.cells[x][y].posY = ypos;
                }
            }
        }
        if (tileSizeChange || xChange || yChange || sizeXChange || sizeYChange) Program.invalidate();
    }
    /**
     * @param {string} title
     */
    changeTitle(title)
    {
        if (this.title === title) return;
        this.title = title;
        let txt = new TextMeasurement(ctx, this.title, C.pageTitleFontSize);
        this.textYOffset = txt.height;
        this.titleWidth = txt.width;
        Program.pages.updateScale();
        Program.invalidate();
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
     * @param {number} tileMultX
     * @param {number} tileMultY
     * @param {string} title
     * @param {CanContainItemDelegate} canEquip
     * @param {string} background Background image path
     */
    constructor(page, pageID, tileMultX, tileMultY, title, canEquip = null, background = 'none')
    {
        super(1, page, pageID, 1, 1, title, tileMultX * C.tileSize, tileMultY * C.tileSize, canEquip);
        this.backgroundIconSrc = background;
        this.cells = [[new SlotCell(this.page, tileMultX, tileMultY, this.backgroundIconSrc)]];
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
            if (this.canEquip(item))
            {
                if (mod != null)
                    mod(item);
                item.x = 0;
                item.y = 0;
                item.rotation = 0;
                item.inSlot = true;
                item.tileSizeX = this.tileSizeX;
                item.tileSizeY = this.tileSizeY;
                item.isOrphan = false;
                this.cells[0][0].occupied = true;
                this.items.push(item);
                Program.invalidate();
                return item;
            }
            else return false;
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
    updateDims()
    {
        this.gridSizeX = this.tileSizeX;
        this.gridSizeY = this.tileSizeY;
        this.pageSizeY = this.tileSizeY;
    }
    /**
     * Modify various transform values of the page and update all variables accordingly.
     * @param {number} tileSize Tile size X of the slot.
     * @param {number} posX Position X
     * @param {number} posY Position Y
     * @param {number} sizeX Not used for slot cells.
     * @param {number} sizeY Not used for slot cells.
     * @param {number} tileSizeY Tile size Y of the slot.
     */
    changeTransform(tileSizeX = -1, posX = -1, posY = -1, sizeX = -1, sizeY = -1, tileSizeY = -1)
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
            this.cells[0][0].posX = posX;
        }
        var yChange = posY != null && posY > -1 && posY != this.posY;
        if (posY == null) posY = this.posY;
        else if (yChange)
        {
            this.posY = posY;
            this.cells[0][0].posY = this.posY;
        }
        if (tileSizeXChange || tileSizeYChange || xChange || yChange) Program.invalidate();
    }
    /**
     * @param {string} title
     */
    changeTitle(title)
    {
        return;
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
        roundedRectPath(ctx, this.posX, this.posY, this.tileSizeX, this.tileSizeY, C.SLOT_RADIUS);
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
        for (var i = 0; i < Program.pages.pages[this.page].items.length; i++)
        {
            var item = Program.pages.pages[this.page].items[i];
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
    constructor(page, sizeMultX, sizeMultY, background = 'none')
    {
        super(page, sizeMultX * C.tileSize, sizeMultY * C.tileSize, 0, 0);
        this.type = 1;
        this.backgroundIconSrc = C.statIconPrefix + background;
        this.#dontRequestImage = false;
        if (this.background && this.background !== 'none')
            this.getIcon();
    }
    /**
     * @returns {boolean} Occupied state
     */
    checkOccupied()
    {
        return Program.pages !== null && Program.pages.pages.length <= this.page && Program.pages[this.page].items.length > 0;
    }
    /**
     * Request background icon if it exists
     * @returns {void}
     */
    getIcon()
    {
        if (this.#dontRequestImage || this.backgroundIconSrc === null || this.backgroundIconSrc === "none") return;
        if (!Program.pages.pages[this.page]) return;
        var id = Program.pages.pages[this.page].pageID;
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
        ctx.fillStyle = this.occupied ? C.occupiedCellColor : this.displayColor;
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
        this.isPicked = false;
        this.item = itemData;
        this.isOrphan = orphan;
        this.sizes = this.getSizes(this.rotation);
        this.pendingRotation = this.rotation;
        this.pendingSizes = this.getSizes(this.pendingRotation);
        this.#pickedLocationX = 0;
        this.#pickedLocationY = 0;
        this.#pickedOffsetX = 0;
        this.#pickedOffsetY = 0;
        this.#deleteClicks = 0;
        this.#lastClickTime = 0;
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
            Program.pages.pages[this.page].cells[0][0].occupied = true;
        }
        else
        {
            let bottomX = this.x + this.sizes.width;
            let bottomY = this.y + this.sizes.height;
            let page = Program.pages.pages[this.page];
            if (page.checkCoords(this.x, this.y) && page.checkCoords(bottomX - 1, bottomY - 1))
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
            Program.pages.pages[this.page].cells[0][0].occupied = false;
        }
        else
        {
            let bottomX = this.x + this.sizes.width;
            let bottomY = this.y + this.sizes.height;
            let page = Program.pages.pages[this.page];
            if (page.checkCoords(this.x, this.y) && page.checkCoords(bottomX - 1, bottomY - 1))
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
            this.#icon = new Image(this.sizeX * 512, this.sizeY * 512);
            this.#icon.id = this.id.toString();
            this.#icon.onload = onImageLoad;
            this.#icon.src = C.itemIconPrefix + this.id.toString() + (Program.webp ? ".webp" : ".png");
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
        let page = Program.pages.pages[this.page];
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
                if (Program.pages.pages[i].pageID === page.child)
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
        if (this.#icon == null && !this.#dontRequestImage)
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
            width = (this.tileSizeX + C.margin) * this.sizeX;
            height = (this.tileSizeY + C.margin) * this.sizeY;
        }
        if (this.#icon != null && this.#icon.onload == null)
        {
            if (rot == 0 || rot > 3 || rot < 0)
            {
                if (opacity != 1)
                    ctx.globalAlpha = opacity;
                try
                {
                    ctx.drawImage(this.#icon, x, y, width, height);
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
                    ctx.drawImage(this.#icon, dx, dy, width, height);
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
            width = (this.tileSizeX + C.margin) * sizes.width;
            height = (this.tileSizeY + C.margin) * sizes.height;
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
        var valid = Program.pages.verifyMove(this, cell.coordX, cell.coordY, this.pendingRotation, cell.page, this.pendingSizes);
        var single = cell.type == 1;
        roundedRectPath(ctx, cell.posX, cell.posY, single ? cell.tileSizeX : cell.tileSizeX * this.pendingSizes.width, single ? cell.tileSizeY : cell.tileSizeY * this.pendingSizes.height, C.SLOT_RADIUS);
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
            var cell = Program.pages.getCellFromPosition(xo, yo, C.roundPlacement);
            this.renderPreview(ctx, cell);
            this.renderAt(ctx, xo, yo, C.pickedColor, 0.75, this.pendingRotation, cell, this.inSlot, this.pendingSizes, true);
            cell = Program.pages.cell(this.page, this.x, this.y);
            if (cell)
                this.renderAt(ctx, cell.posX, cell.posY, C.pickedColor, 0.25, this.rotation, cell, this.inSlot, this.sizes);
        }
        else
        {
            var cell = Program.pages.cell(this.page, this.x, this.y);
            if (!cell)
                return;
            this.renderAt(ctx, cell.posX, cell.posY, C.placedColor, 1, this.rotation, cell, this.inSlot, this.sizes);
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
        console.log("Clicked: ");
        console.log(this);
        if (this.isPicked)
        {
            /** @type {Cell} */
            var cell = Program.pages.getCellFromPosition(this.#pickedLocationX + this.#pickedOffsetX, this.#pickedLocationY + this.#pickedOffsetY, C.roundPlacement);
            if (!cell)
            {
                cell = Program.pages.getCellFromPosition(this.#pickedLocationX + this.#pickedOffsetX, this.#pickedLocationY + this.#pickedOffsetY, !C.roundPlacement);
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
            if (!this.isOrphan)
                this.clearOccupiedFromSlots();
            if (this.page != cell.page || this.x != cell.coordX || this.y != cell.coordY || this.pendingRotation != this.rotation)
                moved = Program.pages.moveItem(this, cell.coordX, cell.coordY, this.pendingRotation, cell.page, this.pendingSizes);
            else moved = true;
            if (moved)
            {
                this.isPicked = false;
                this.isOrphan = false;
                this.applyOccupiedToSlots();
                Program.pages.pickedItem = null;
            }
            Program.invalidate();
        }
        else
        {
            if (Program.pages.pickedItem != null)
            {
                console.log("Item already picked");
                return;
            }
            else
            {
                /** @type {Cell} */
                var cell = Program.pages.pages[this.page].cell(this.x, this.y);
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
    /**
     * Change the pick offset.
     * @param {number} x 
     * @param {number} y 
     * @param {boolean} isRelative False sets the values, true adds to them
     */
    offsetPick(x, y, isRelative = false)
    {
        if (x)
            this.#pickedOffsetX = isRelative ? this.#pickedOffsetX + x : x;
        if (y)
            this.#pickedOffsetY = isRelative ? this.#pickedOffsetY + y : y;
    }
}