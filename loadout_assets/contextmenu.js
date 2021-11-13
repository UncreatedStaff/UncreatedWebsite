import { Program } from "./editor.js";
import { Radius, TextMeasurement, NotImplementedException, roundedRect, CenteredTextData } from "./util.js";
import * as C from "./const.js";

export class ContextMenu
{
    /** @type {string} */
    title;
    /** @type {boolean} */
    isOpen;
    /** @type {ContextWidget[]} */
    widgets;
    /** @type {*} */
    parent;
    /** @type {number} */
    posX;
    /** @type {number} */
    posY;
    /** @type {number} */
    width;
    /** @type {number} */
    height;
    /** @type {number} */
    margin;
    /** @type {Radius} */
    radiusTop;
    /** @type {number} */
    radiusBottom;
    /** @type {boolean} */
    #up;
    /** @type {boolean} */
    #left;
    /** @type {number} */
    #titleHeight;
    /**
     * @param {string} title 
     * @param {ContextWidget[]} widgets 
     */
    constructor(title, widgets)
    {
        this.title = title;
        this.widgets = widgets;
        for (var i = 0; i < this.widgets.length; i++)
        {
            this.widgets[i].owner = this;
        }
        this.posX = 0;
        this.posY = 0;
        this.width = 0;
        this.height = 0;
        this.margin = 4;
        this.radiusTop = new Radius(C.radius, C.radius, 0, 0);
        this.radiusBottom = new Radius(0, 0, C.radius, C.radius);
        this.#up = false;
        this.#left = false;
        this.#titleHeight = 0;
    }

    /**
     * @param {CanvasRenderingContext2D} ctx 
     * @param {number} x 
     * @param {number} y 
     */
    updateDims(ctx, x, y)
    {
        this.posX = x;
        this.posY = y;
        ctx.font = "bold " + C.ctxMenuFontSize.toString() + "px Segoe UI";
        this.width = this.margin * 2;
        var measure;
        var highest = C.ctxMinWidth;
        this.height = 0;
        if (this.title.length > 0)
        {
            this.height = this.title && this.title.length > 0 ? C.ctxMenuHeaderSize : 0;
            measure = new TextMeasurement(ctx, this.title, C.ctxMenuFontSize);
            if (measure.width > C.ctxMinWidth) highest = measure.width + this.margin * 2;
            this.#titleHeight = CenteredTextData.centerTextHeight(ctx, this.title, C.ctxMenuHeaderSize, C.ctxMenuFontSize);
        }
        ctx.font = C.ctxMenuFontSize.toString() + "px Segoe UI";
        for (var i = 0; i < this.widgets.length; i++)
        {
            this.widgets[i].updateDims(ctx, x, y);
            if (!this.widgets[i].enabled) continue;
            this.height += this.widgets[i].height;
            if (highest < this.widgets[i].minWidth) highest = this.widgets[i].minWidth;
        }
        this.width += highest;
        this.#up = this.posY + this.height > Program.canvas.height;
        this.#left = this.posX + this.width > Program.canvas.width;
    }

    /**
     * @param {CanvasRenderingContext2D} ctx 
     */
    render(ctx)
    {
        var px = this.#left ? this.posX - this.width : this.posX;
        var py = this.#up ? this.posY - this.height : this.posY;
        ctx.strokeStyle = "#000000";
        if (this.title && this.title.length > 0)
        {
            ctx.font = "bold " + C.ctxMenuFontSize.toString() + "px Segoe UI";
            ctx.fillStyle = C.ctxMenuBackground;
            roundedRect(ctx, px, py, this.width, C.ctxMenuHeaderSize, this.radiusTop, true, true);
            ctx.fillStyle = C.ctxMenuText;
            ctx.textAlign = 'center';
            ctx.fillText(this.title, px + this.width / 2, py + this.#titleHeight);
        }
        ctx.font = C.ctxMenuFontSize.toString() + "px Segoe UI";
        ctx.textAlign = 'left';
        var posy = C.ctxMenuHeaderSize;
        for (var i = 0; i < this.widgets.length; i++)
        {
            if (!this.widgets[i].enabled) continue;
            this.widgets[i].renderAt(ctx, px, py + posy, this.width, this.widgets[i].height, i === 0, i === this.widgets.length - 1);
            posy += this.widgets[i].height;
        }
    }

    /**
     * Close the menu
     */
    close()
    {
        this.isOpen = false;
        Program.contextMenu = null;
        this.parent = null;
        Program.invalidate();
    }

    /**
     * Open the menu
     * @param {*} parent "Owner" of the menu. Functions will use this on event executions.
     */
    open(x, y, parent, title)
    {
        if (title)
            this.title = title;
        this.parent = parent;
        for (var i = 0; i < this.widgets.length; i++)
            this.widgets[i].updateEnabled();
        this.updateDims(Program.context, x, y);
        this.isOpen = true;
        Program.mouseBtn2Consumed = true;
        Program.contextMenu = this;
        Program.invalidate();
    }

    onClick(x, y)
    {
        var px = this.#left ? this.posX - this.width : this.posX;
        var py = this.#up ? this.posY - this.height : this.posY;
        if (x < px || x > px + this.width || y < py || y > py + this.height)
        {
            this.close();
            Program.mouseBtn1Consumed = true;
        }
        else if (y > py + C.ctxMenuHeaderSize)
        {
            var offX = x - px;
            var offY = y - py - C.ctxMenuHeaderSize;
            var posy = 0;
            for (var i = 0; i < this.widgets.length; i++)
            {
                if (!this.widgets[i].enabled) continue;
                posy += this.widgets[i].height;
                if (offY < posy)
                {
                    this.widgets[i].onClick(offX, offY);
                    break;
                }
            }
        }
    }
    onMouseMove(x, y)
    {
        var px = this.#left ? this.posX - this.width : this.posX;
        var py = this.#up ? this.posY - this.height : this.posY;
        if (!(x < px || x > px + this.width || y < py || y > py + this.height) && y > py + C.ctxMenuHeaderSize)
        {
            var offY = y - py - C.ctxMenuHeaderSize;
            var posy = 0;
            for (var i = 0; i < this.widgets.length; i++)
            {
                if (!this.widgets[i].enabled) continue;
                posy += this.widgets[i].height;
                if (offY < posy && offY > posy - this.widgets[i].height)
                {
                    if (!this.widgets[i].mouseIn)
                    {
                        this.widgets[i].mouseIn = true;
                        this.widgets[i].onMouseIn();
                    }
                }
                else if (this.widgets[i].mouseIn)
                {
                    this.widgets[i].mouseIn = false;
                    this.widgets[i].onMouseOut();
                }
            }
        }
        else
        {
            for (var i = 0; i < this.widgets.length; i++)
            {
                if (this.widgets[i].mouseIn)
                {
                    this.widgets[i].mouseIn = false;
                    this.widgets[i].onMouseOut();
                }
            }
        }
    }
}

/**
 * Abstract context widget class
 * @abstract
 */
export class ContextWidget
{
    /**
     * @callback ContextWidgetFilter
     * @param {ContextMenu} owner
     * @returns {boolean} Should display
     */
    /** @type {number} */
    minWidth;
    /** @type {ContextWidgetFilter} */
    filter;
    /** @type {ContextMenu} */
    owner;
    /** @type {number} */
    height;
    /** @type {boolean} */
    mouseIn;
    /** @type {boolean} */
    enabled;
    /**
     * @param {ContextWidgetFilter} displayFilter 
     */
    constructor(displayFilter)
    {
        this.filter = displayFilter;
        this.minWidth = 0;
        this.height = C.ctxButtonHeight;
        this.mouseIn = false;
    }
    /**
     * @abstract
     * @param {CanvasRenderingContext2D} ctx
     * @param {number} x
     * @param {number} y
     */
    updateDims(ctx, x, y)
    {
        throw new NotImplementedException(this.updateDims, this);
    }
    updateEnabled()
    {
        this.enabled = !(this.owner && this.filter && typeof this.filter === 'function' && !this.filter(this.owner));
    }
    /**
     * @abstract
     * @param {CanvasRenderingContext2D} ctx
     * @param {number} x
     * @param {number} y
     * @param {number} w
     * @param {number} h
     * @param {boolean} isFirst
     * @param {boolean} isLast
     */
    renderAt(ctx, x, y, w, h, isFirst, isLast)
    {
        throw new NotImplementedException(this.renderAt, this);
    }

    /**
     * @param {number} x
     * @param {number} y
     */
    onClick(x, y)
    {
        return;
    }

    onMouseIn()
    {
        return;
    }

    onMouseOut()
    {
        return;
    }
}

export class ContextButton extends ContextWidget
{
    /** @type {string} */
    text;
    
    /** @type {number} */
    textY;

    /** @type {ContextButtonCallback} */
    callback;

    /**
     * @callback ContextButtonCallback
     * @param {ContextButton} button
     * @returns {boolean} Should close menu
     */
    /**
     * @param {string} text 
     * @param {ContextButtonCallback} callback 
     * @param {ContextWidgetFilter} displayFilter
     */
    constructor(text, callback, displayFilter)
    {
        super(displayFilter);
        this.text = text;
        this.callback = callback;
    }

    /**
     * @param {CanvasRenderingContext2D} ctx
     * @param {number} x
     * @param {number} y
     */
    updateDims(ctx, x, y)
    {
        this.minWidth = TextMeasurement.width(ctx, this.text) + this.owner.margin * 2;
        this.textY = CenteredTextData.centerTextHeight(ctx, this.text, this.height, C.ctxMenuFontSize);
    }
    /**
     * @param {CanvasRenderingContext2D} ctx
     * @param {number} x
     * @param {number} y
     * @param {number} w
     * @param {number} h
     * @param {boolean} isFirst
     * @param {boolean} isLast
     */
    renderAt(ctx, x, y, w, h, isFirst, isLast)
    {
        ctx.fillStyle = this.mouseIn ? C.ctxButtonHoverBackground : C.ctxMenuBackground;
        ctx.strokeStyle = "#000000";
        if (isFirst)
        {
            roundedRect(ctx, x, y, w, h, this.owner.radiusTop, true, true);
        }
        else if (isLast)
        {
            roundedRect(ctx, x, y, w, h, this.owner.radiusBottom, true, true);
        }
        else
        {
            ctx.fillRect(x, y, w, h);
            ctx.strokeRect(x, y, w, h);
        }
        ctx.fillStyle = C.ctxMenuText;
        ctx.fillText(this.text, x + this.owner.margin, y + this.textY);
    }
    onMouseIn()
    {
        Program.invalidate();
    }
    onMouseOut()
    {
        Program.invalidate();
    }
    /**
     * @param {number} x
     * @param {number} y
     */
    onClick(x, y)
    {
        if (this.callback == undefined || typeof this.callback !== 'function')
        {
            this.owner.close();
            Program.mouseBtn1Consumed = true;
        }
        else
        {
            if (this.callback(this)) this.owner.close();
            Program.mouseBtn1Consumed = true;
        }
    }
}