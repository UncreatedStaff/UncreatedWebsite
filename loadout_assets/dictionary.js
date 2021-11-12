import { Program, blacklistedItems } from "./editor.js";
import { Radius, CenteredTextData, TextMeasurement, roundedRectPath, getScale, roundedRect, roundedArrow, onImageLoad } from "./util.js";
import { Item } from "./page.js";
import * as C from "./const.js";

export class Dictionary
{
    /** @type {number} */
    gridSizeX;
    /** @type {number} */
    gridSizeY;
    /** @type {number} */
    gridStartY;
    /** @type {number} */
    width;
    /** @type {number} */
    height;
    /** @type {ItemData[]} */
    items;
    /** @type {number} */
    #currentPage;
    /** @type {number} */
    #currentAnimAlpha;
    /** @type {ItemData[]} */
    #activeItems;
    /** @type {DictionaryEntry[]} */
    entries;
    /** @type {Filter[]} */
    activeFilters;
    /** @type {Filter} */
    persistantFilter;
    /** @type {Filter[]} */
    filters;
    /** @type {number} */
    maxItems;
    /** @type {string} */
    title;
    /** @type {number} */
    margin;
    /** @type {number} */
    #startPosX;
    /** @type {number} */
    finalPosX;
    /** @type {number} */
    #footerStartY;
    /** @type {number} */
    #titleYoffset;
    /** @type {number} */
    #filterSectionHeight;
    /** @type {number} */
    #itemWidth;
    /** @type {number} */
    #gridHeight;
    /** @type {number} */
    #backX;
    /** @type {number} */
    #nextX;
    /** @type {number} */
    #buttonY;
    /** @type {number} */
    posY;
    /** @type {boolean} */
    #darkenBackground;
    /** @type {boolean} */
    consumeKeys;
    /** @type {boolean} */
    isOpen;
    /** @type {boolean} */
    #willAnimate;
    /** @type {boolean} */
    #isAnimating;
    /** @type {boolean} */
    #animState;
    /** @type {Radius} */
    #radius;
    /** @type {Radius} */
    #buttonRadius;
    /** @type {Radius} */
    #headerRadius;
    /** @type {Radius} */
    #footerRadius;
    /** @type {boolean} */
    #inited;
    /** @type {boolean} */
    #nextHovered;
    /** @type {boolean} */
    #backHovered;
    constructor()
    {
        this.gridSizeX = 8;
        this.gridSizeY = 50;
        this.width = 5;
        this.items = [];
        this.#currentPage = 0;
        this.#activeItems = [];
        this.entries = [];
        this.activeFilters = [];
        this.persistantFilter = new Filter("DEFAULT", (i) =>
            i.T !== 28 && i.T !== 35 && i.LocalizedName !== "#NAME" && !blacklistedItems.includes(i.ItemID) && (isNaN(Number(i.LocalizedName)) || !isNaN(Number(i.Name))) && (i.T != 1 || !i.IsTurret));
        this.filters = [
            new Filter("Weapon", (i) => (i.T === 1 || i.T === 3 || i.T === 40) && i.ItemID > 30000),
            new Filter("Explosive", (i) => (i.T === 3 && i.Explosive) || i.T === 18 || (i.T === 8 && i.Explosive) || i.T === 31),
            new Filter("Medical", (i) => i.T === 42),
            new Filter("Consumable", (i) => (i.T === 14 && i.T !== 42) || i.T === 41 || i.T === 43 || (i.T === 19 && (i.Food.Clean > 0 || i.Water.Clean > 0))),
            new Filter("Throwable", (i) => i.T === 3),
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
        this.title = "Item Database";
        this.margin = 16;
        this.#darkenBackground = true;
        this.consumeKeys = false;
        this.isOpen = false;
        this.#willAnimate = false;
        this.#isAnimating = false;
        this.#radius = new Radius(16, 0, 16, 0);
        this.#buttonRadius = new Radius(4);
        this.#headerRadius = new Radius(16, 0, 0, 0);
        this.#footerRadius = new Radius(0, 0, 16, 0);
        this.#inited = false;
        this.#backHovered = false;
        this.#nextHovered = false;
        this.updateDims(Program.context);
    }
    /**
     * @param {CanvasRenderingContext2D} ctx 
     */
    updateDims(ctx)
    {
        this.width = Program.canvas.width / 2;
        this.#startPosX = Program.canvas.width * 1.05;
        this.finalPosX = Program.canvas.width - this.width;
        this.posY = 0;
        this.height = Program.canvas.height;
        this.#footerStartY = this.height - C.dictionaryFooterSize;
        ctx.font = 'bold ' + C.dictionaryTitleTextSize.toString() + 'px Segoe UI';
        ctx.textAlign = 'left';
        this.#titleYoffset = CenteredTextData.centerTextHeight(ctx, this.title + " - " + this.#activeItems.length + " Items Visible", C.dictionaryHeaderSize, C.dictionaryTitleTextSize);
        if (this.filters.length > 0)
        {
            this.#filterSectionHeight = (Program.canvas.height / 48 + this.margin / 2) * Math.ceil(this.filters.length / C.dictionaryFilterColumns);
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
        this.gridStartY = C.dictionaryHeaderSize + this.margin + this.#filterSectionHeight + this.margin;
        this.#itemWidth = (this.width - this.margin * (2 + C.dictionaryItemColumns)) / (C.dictionaryItemColumns);
        this.#gridHeight = this.height - C.dictionaryHeaderSize - C.dictionaryFooterSize - this.margin * 2 - this.#filterSectionHeight;
        for (var i = 0; i < this.maxItems; i++)
        {
            var entry = this.entries[i];
            if (!entry)
            {
                entry = new DictionaryEntry(0, null, this);
                entry.index = i;
                this.entries.push(entry);
            }
            entry.width = this.#itemWidth;
            entry.height = (this.#gridHeight / C.dictionaryItemRows) - this.margin;
            entry.posX = this.margin + (i % C.dictionaryItemColumns) * (this.#itemWidth + this.margin);
            entry.posY = C.dictionaryHeaderSize + this.margin + this.#filterSectionHeight + this.margin + ((entry.height + this.margin) * Math.floor(i / C.dictionaryItemColumns));
            entry.updateDims();
        }
        this.#backX = this.width / 2 - C.dictionaryButtonSize - this.margin / 2;
        this.#nextX = this.width / 2 + this.margin / 2;
        this.#buttonY = this.#footerStartY + (C.dictionaryFooterSize - C.dictionaryButtonSize) / 2;
        this.#inited = true;
    }

    open()
    {
        this.#animState = true;
        this.#willAnimate = true;
        this.#inited = false;
        Program.invalidate();
    }
    close()
    {
        this.#animState = false;
        this.#willAnimate = true;
        this.consumeKeys = false;
        for (var e = 0; e < this.entries.length; e++)
        {
            this.entries[e].isHovered = false;
            this.entries[e].firstHover = false;
            this.entries[e].hoverProgress = 0;
        }
        Program.invalidate();
    }
    /**
     * @param {CanvasRenderingContext2D} ctx 
     * @param {number} dt 
     * @param {number} rt 
     */
    render(ctx, dt, rt)
    {
        if (!this.#inited)
            this.updateDims(ctx);
        if (this.#willAnimate)
        {
            this.#willAnimate = false;
            this.#isAnimating = true;
            if (this.#animState)
            {
                this.#currentAnimAlpha = 0;
                this.renderAt(ctx, this.#startPosX, this.posY, 0.0);
            }
            else
            {
                this.#currentAnimAlpha = 1;
                this.renderAt(ctx, this.finalPosX, this.posY, 1.0);
            }
            return true;
        }
        else if (this.#isAnimating)
        {
            if (this.#animState)
            {
                if (this.#currentAnimAlpha >= 1.0)
                {
                    this.#currentAnimAlpha = 1;
                    this.consumeKeys = true;
                    this.#isAnimating = false;
                    this.isOpen = true;
                    this.#willAnimate = false;
                    this.renderAt(ctx, this.finalPosX, this.posY, 1.0);
                    return false;
                }
                else
                {
                    this.renderAt(ctx, this.#lerp(), this.posY, this.#currentAnimAlpha);
                    this.#currentAnimAlpha += dt / C.dictionaryAnimTimeSec;
                    return true;
                }
            }
            else
            {
                if (this.#currentAnimAlpha <= 0)
                {
                    this.#currentAnimAlpha = 0;
                    this.#isAnimating = false;
                    this.isOpen = false;
                    this.#willAnimate = false;
                    this.onClose();
                    return false;
                }
                else
                {
                    this.renderAt(ctx, this.#lerp(), this.posY, this.#currentAnimAlpha);
                    this.#currentAnimAlpha -= dt / C.dictionaryAnimTimeSec;
                    return true;
                }
            }
        }
        else if (this.isOpen)
        {
            this.renderAt(ctx, this.finalPosX, this.posY, 1.0);
        }
        return this.#isAnimating;
    }
    #exp(alpha)
    {
        return Math.pow(C.expConst, Math.pow(C.expConst, 0.5 * alpha) * alpha - 1) - Math.pow(C.expConst, -1);
    }
    #lerp()
    {
        if (this.#animState)
            return (this.#startPosX - this.finalPosX) * (1 - (this.#exp(this.#currentAnimAlpha))) + this.finalPosX;
        else
            return (this.#startPosX - this.finalPosX) * (this.#exp(1 - this.#currentAnimAlpha)) + this.finalPosX;
    }
    renderAt(ctx, x, y, bkgrAlpha)
    {
        if (this.#darkenBackground && bkgrAlpha > 0)
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
        roundedRect(ctx, x, y, this.width, this.height, this.#radius, true, true);
        ctx.strokeStyle = "#000000";
        ctx.fillStyle = C.dictionaryAccent1;
        roundedRect(ctx, x, y, this.width, C.dictionaryHeaderSize, this.#headerRadius, true, false);
        ctx.fillStyle = "#ffffff";
        ctx.font = 'bold ' + C.dictionaryTitleTextSize.toString() + 'px Segoe UI';
        ctx.textAlign = 'left';
        ctx.fillText(this.title + " - " + this.#activeItems.length + " Items Visible", x + this.margin, y + this.#titleYoffset, this.width - this.margin * 2);
        ctx.fillStyle = "#333333";
        ctx.fillRect(x + 1, y + C.dictionaryHeaderSize, this.width - 2, this.#filterSectionHeight + this.margin * 1.25);
        for (var i = 0; i < this.filters.length; i++)
            this.filters[i].render(ctx, x, y);
        for (var i = 0; i < this.entries.length; i++)
            this.entries[i].render(ctx, x, y);
        ctx.fillStyle = C.dictionaryAccent1;
        roundedRect(ctx, x, this.#footerStartY, this.width, C.dictionaryFooterSize, this.#footerRadius, true, false);
        ctx.fillStyle = this.#currentPage === 0 ? C.dictionaryAccent4Disabled : (this.#backHovered ? C.dictionaryAccent3 : C.dictionaryAccent2);
        roundedArrow(ctx, x + this.#backX, this.#buttonY, C.dictionaryButtonSize, C.dictionaryButtonSize, this.#buttonRadius, true, false, true);
        ctx.fillStyle = (this.#currentPage + 1) * this.maxItems >= this.#activeItems.length ? C.dictionaryAccent4Disabled : (this.#nextHovered ? C.dictionaryAccent3 : C.dictionaryAccent2);
        roundedArrow(ctx, x + this.#nextX, this.#buttonY, C.dictionaryButtonSize, C.dictionaryButtonSize, this.#buttonRadius, true, false, false);
    }
    onClose()
    {

    }
    /**
     * @param {KeyboardEvent} event 
     */
    keyPress(event)
    {
        if (event.keyCode === 27) // esc
        {
            if (this.isOpen)
            {
                this.close();
                Program.keyConsumed = true;
            }
        }
        else if (event.keyCode === 37)
        {
            if (this.pageBack()) Program.keyConsumed = true;
        }
        else if (event.keyCode === 39)
        {
            if (this.pageNext()) Program.keyConsumed = true;
        }
        else
        {
            return false;
        }
        return true;
    }
    /**
     * Move to the next page
     * @returns {boolean} True if the page was changed, else false.
     */
    pageNext()
    {
        if ((this.#currentPage + 1) * this.maxItems < this.#activeItems.length)
        {
            this.#currentPage++;
            this.loadItems();
            Program.invalidate();
            return true;
        }
        return false;
    }
    /**
     * Move to the previous page
     * @returns {boolean} True if the page was changed, else false.
     */
    pageBack()
    {
        if (this.#currentPage > 0)
        {
            this.#currentPage--;
            this.loadItems();
            Program.invalidate();
            return true;
        }
        return false;
    }

    /**
     * @param {number} x
     * @param {number} y
     */
    onClick(x, y)
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
            if (x > this.finalPosX + this.#backX - C.dictionaryButtonSize / 2 && x < this.finalPosX + this.#backX + C.dictionaryButtonSize && y > this.#buttonY && y < this.#buttonY + C.dictionaryButtonSize)
            {
                this.pageBack();
                Program.mouseBtn1Consumed = true;
                return;
            }
            else if (x > this.finalPosX + this.#nextX && x < this.finalPosX + this.#nextX + C.dictionaryButtonSize * 1.5 && y > this.#buttonY && y < this.#buttonY + C.dictionaryButtonSize)
            {
                this.pageNext();
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

    
    /**
     * @param {number} x
     * @param {number} y
     */
    onMouseMoved(x, y)
    {
        if (!this.consumeKeys || this.#isAnimating) return;
        if (x > this.finalPosX + this.#backX - C.dictionaryButtonSize / 2 && x < this.finalPosX + this.#backX + C.dictionaryButtonSize && y > this.#buttonY && y < this.#buttonY + C.dictionaryButtonSize)
        {
            this.#backHovered = true;
            this.#nextHovered = false;
            Program.moveConsumed = true;
            Program.invalidate();
        }
        else if (x > this.finalPosX + this.#nextX && x < this.finalPosX + this.#nextX + C.dictionaryButtonSize * 1.5 && y > this.#buttonY && y < this.#buttonY + C.dictionaryButtonSize)
        {
            this.#nextHovered = true;
            this.#backHovered = false;
            Program.moveConsumed = true;
            Program.invalidate();
        }
        else if (this.#nextHovered || this.#backHovered)
        {
            this.#nextHovered = false;
            this.#backHovered = false;
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
                {
                    this.entries[e].isHovered = false;
                    Program.invalidate();
                }
            }
        }
    }

    /**
     * Updates the Dictionary with Dictionary.items array
     */
    loadItems()
    {
        if ((this.#currentPage + 1) * this.maxItems >= this.#activeItems.length)
        {
            this.#currentPage = Math.floor((this.#activeItems.length === 0 ? 0 : this.#activeItems.length - 1) / this.maxItems);
        }
        var e = 0;
        for (var i = this.#currentPage * this.maxItems; i < (this.#currentPage + 1) * this.maxItems; i++)
        {
            if (this.#activeItems[i])
            {
                this.entries[e].itemID = this.#activeItems[i].ItemID;
                this.entries[e].itemData = this.#activeItems[i];
                this.entries[e].icon = null;
                this.entries[e].dontRequestImage = false;
                this.entries[e].updateDims();
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
    
    /**
     * Sync filter selections with item list.
     * @param {boolean} bypass Bypass active filters
     * @returns {void}
     */
     updateFilters(bypass = false)
     {
         this.#activeItems.splice(0);
         if (this.activeFilters.length === 0 && !bypass)
         {
             for (var i = 0; i < this.items.length; i++)
             {
                 if (this.persistantFilter.predicate(this.items[i]))
                     this.#activeItems.push(this.items[i]);
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
             if (!this.persistantFilter.predicate(this.items[i]))
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
                 this.#activeItems.push(this.items[i]);
         }
         this.loadItems();
         this.updateDims(Program.context);
     }
}

export class DictionaryEntry
{
    /** @type {number} */
    itemID;
    /** @type {string} */
    #text;
    /** @type {ItemData} */
    itemData;
    /** @type {number} */
    index;
    /** @type {number} */
    posX;
    /** @type {number} */
    posY;
    /** @type {Radius} */
    #tileradius;
    /** @type {boolean} */
    isHovered;
    /** @type {HTMLImageElement} */
    icon;
    /** @type {boolean} */
    dontRequestImage;
    /** @type {number} */
    #hoverProgress;
    /** @type {number} */
    width;
    /** @type {number} */
    height;
    /** @type {Radius} */
    radius;
    /** @type {Dictionary} */
    owner;
    /** @type {number} */
    margin;
    /** @type {boolean} */
    #firstHover;
    /** @type {TextMeasurement} */
    #textmeasure;
    /**
     * @param {number} itemID 
     * @param {ItemData} itemData 
     * @param {Dictionary} owner 
     */
    constructor(itemID, itemData, owner)
    {
        this.itemID = itemID;
        this.itemData = itemData;
        this.owner = owner;
        this.index = 0;
        this.posX = 0;
        this.posY = 0;
        this.#hoverProgress = 0;
        this.#tileradius = C.SLOT_RADIUS;
        this.isHovered = false;
        this.icon = null;
        this.dontRequestImage = false;
        this.#text = itemData == null ? itemID.toString() : (itemData.LocalizedName ?? (itemData.Name ?? itemID.toString()));
        this.margin = this.owner == null ? 8 : this.owner.margin / 2;
        this.radius = new Radius(12);
        this.updateDims();
    }
    getIcon()
    {
        if (this.dontRequestImage) return;
        this.icon = Program.pages.iconCache.get(this.itemID);
        if (!this.icon && this.itemData)
        {
            this.icon = new Image(this.itemData.sizeX * 512, this.itemData.sizeY * 512);
            this.icon.id = this.itemID.toString();
            this.icon.onload = onImageLoad;
            this.icon.src = C.itemIconPrefix + this.itemID.toString() + ".png";
            Program.pages.iconCache.set(this.itemID, this.icon);
        }
    }

    #onHoverComplete()
    {
        this.owner?.close();
        if (Program.wiki)
        {
            Program.wiki.loadItem(this.itemData);
            Program.wiki.reopenToDictionary = true;
            Program.wiki.open();
        }
    }
    updateDims()
    {
        Program.context.font = "bold " + C.dictionaryEntryTitleTextSize.toString() + "px Segoe UI";
        this.#text = TextMeasurement.truncateLetters(Program.context, 
            this.itemData == null ? this.itemID.toString() : (
            this.itemData.LocalizedName == null || this.itemData.LocalizedName.length === 0 ?
           (this.itemData.Name == null || this.itemData.Name.length === 0 ? 
            this.itemID.toString() : this.itemData.Name) : 
            this.itemData.LocalizedName), this.width - this.margin * 2);
            if (this.#text === "...") this.#text = ""; 
        this.#textmeasure = new TextMeasurement(Program.context, this.#text, C.dictionaryEntryTitleTextSize);
    }
    /**
     * @param {CanvasRenderingContext2D} ctx 
     * @param {number} x 
     * @param {number} y 
     */
    render(ctx, x, y)
    {
        if (this.itemData)
        {
            if (this.isHovered && !this.#firstHover)
            {
                this.#hoverProgress += Program.deltaTime / C.dictionaryEntryHoverSpeed;
                if (this.#hoverProgress >= 1)
                {
                    this.#onHoverComplete();
                    this.#hoverProgress = 0;
                }
                Program.invalidateAfter();
            }
            else if (this.#hoverProgress > 0)
            {
                this.#hoverProgress = 0;
                Program.invalidateAfter();
            }
            else
            {
                this.#firstHover = false;
            }
            if (this.icon == null && !this.dontRequestImage)
            {
                this.getIcon();
            }
            if (this.#hoverProgress <= 0)
            {
                ctx.fillStyle = C.dictionaryBackgroundAccent;
            } 
            else
            {
                var gradient = ctx.createLinearGradient(x + this.posX, y + this.posY + this.height, x + this.posX, y + this.posY);
                if (this.#hoverProgress < 0.95)
                {
                    gradient.addColorStop(1, C.dictionaryBackgroundAccent);
                    gradient.addColorStop(this.#hoverProgress < 0.85 ? this.#hoverProgress + 0.15 : 1, C.dictionaryBackgroundAccent);
                }
                else
                    gradient.addColorStop(1, C.dictionaryBackgroundAccentHovered);
                gradient.addColorStop(this.#hoverProgress, C.dictionaryBackgroundAccentHovered);
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
            ctx.fillText(this.#text, x + this.posX + this.margin, posy + this.#textmeasure.height);
            posy += this.#textmeasure.height + this.margin;
            var pw = w - this.margin * 2;
            var ph = h - this.margin * 6;
            var scale = getScale(pw, ph, this.itemData.SizeX, this.itemData.SizeY);
            if (scale > 0)
            {
                var pw2 = this.itemData.SizeX * scale;
                var ph2 = this.itemData.SizeY * scale;
                var px = posx;
                var py = posy;
                py += (ph - ph2) / 2;
                px += (pw - pw2) / 2;
                for (var x = 0; x < this.itemData.SizeX; x++)
                {
                    for (var y = 0; y < this.itemData.SizeY; y++)
                    {
                        roundedRectPath(ctx, px + x * scale, py + y * scale, scale, scale, this.#tileradius);
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
        }
        else
        {
            ctx.strokeStyle = C.dictionaryBackgroundAccent;
            ctx.strokeWeight = 4;
            ctx.fillStyle = C.dictionaryEntryEmpty;
            roundedRect(ctx, x + this.posX, y + this.posY, this.width, this.height, this.radius, true, true);
            ctx.strokeWeight = 1;
        }
    }

    /**
     * @param {number} x 
     * @param {number} y 
     */
    onHover(x, y)
    {
        if (!this.isHovered)
            this.#firstHover = true;
    }

    /**
     * @param {number} x 
     * @param {number} y 
     */
    onClick(x, y)
    {
        if (!this.itemData) return;
        if (Program.pages.pickedIteem != null)
            Program.pages.pickedItm.isPicked = false;
        Program.pages.pickedItem = new Item(this.itemID, -1, -1, this.itemData.SizeX, this.itemData.SizeY, 0, -1, this.itemData, true);
        Program.pages.pickedItem.isPicked = true;
        Program.pages.pickedItem.onMouseMoved(x, y);
        Program.pages.pickedItem.tileSizeX = C.tileSize;
        Program.pages.pickedItem.tileSizeY = C.tileSize;
        Program.pages.pickedItem.offsetPick(Program.pages.pickedItem.tileSizeX * Program.pages.pickedItem.sizeX * -0.5, 
                                            Program.pages.pickedItem.tileSizeY * Program.pages.pickedItem.sizeY * -0.5, false);
        Program.invalidate();
        Program.dictionary.close();
    }
}

export class Filter
{
    /**
     * @callback FilterPredicate
     * @param {ItemData} itemData
     * @returns {boolean}
     */
    /** @type {boolean} */
    enabled;
    /** @type {string} */
    name;
    /** @type {FilterPredicate} */
    predicate;
    /** @type {number} */
    posX;
    /** @type {number} */
    posY;
    /** @type {number} */
    width;
    /** @type {number} */
    height;
    /** @type {number} */
    index;
    /** @type {Radius} */
    fullRadius;
    /** @type {Radius} */
    enabledRadius;
    /** @type {number} */
    found;
    /** @type {Dictionary} */
    owner;
    /** @type {number} */
    x;
    /** @type {number} */
    y;
    /**
     * @param {string} name 
     * @param {FilterPredicate} predicate 
     */
    constructor(name, predicate)
    {
        this.enabled = false;
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
    }
    /**
     * @param {CanvasRenderingContext2D} ctx 
     * @param {number} xOffset 
     * @param {number} yOffset 
     */
    render(ctx, xOffset, yOffset)
    {
        this.x = xOffset + this.posX;
        this.y = yOffset + this.posY;
        if (this.enabled)
            ctx.strokeStyle = C.dictionaryAccent1;
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
    onClick()
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
    /**
     * @param {number} x 
     * @param {number} y 
     * @returns {boolean}
     */
    mouseInside(x, y)
    {
        return x > this.x && x < this.x + this.width && y > this.y && y < this.y + this.height;
    }
    countItems()
    {
        if (!this.owner) return;
        this.found = 0;
        for (var i = 0; i < this.owner.items.length; i++)
        {
            if (this.owner.persistantFilter.predicate(this.owner.items[i]) && this.predicate(this.owner.items[i])) this.found++;
        }
    }
}