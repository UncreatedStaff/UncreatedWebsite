import { Program } from "./editor.js";

export class Radius 
{
    /** @type {number} */
    tl;
    /** @type {number} */
    tr;
    /** @type {number} */
    bl;
    /** @type {number} */
    br;
    /**
     * Defaults to tl for all corners if only one is supplied.
     * @param {number} tl 
     * @param {number} tr Nullable
     * @param {number} bl Nullable
     * @param {number} br Nullable
     */
    constructor(tl, tr = null, bl = null, br = null) 
    {
        this.tl = tl;
        this.tr = tr !== null ? tr : tl;
        this.bl = bl !== null  ? bl : tl;
        this.br = br !== null  ? br : tl;
    }
}
export class WrappedLine 
{
    /** @type {string} */
    text;
    /** @type {number} */
    height;
    /**
     * @param {string} text 
     * @param {number} height 
     */
    constructor(text, height) 
    {
        this.text = text;
        this.height = height;
    }
    /**
     * @returns {WrappedLine[]} Array of WrappedLines, one for each line.
     * @param {CanvasRenderingContext2D} ctx 
     * @param {string} text 
     * @param {number} maxWidth 
     * @param {number} lineHeightDefault 
     */
    static wrapText(ctx, text, maxWidth, lineHeightDefault) 
    {
        var words = text.split(" ");
        var width = 0;
        var size;
        if (words.length === 1) 
        {
            size = ctx.measureText(text);
            console.log(words);
            var canUseAdvHeight = size.actualBoundingBoxAscent && size.actualBoundingBoxDescent;
            return new WrappedLine(text, canUseAdvHeight ? size.actualBoundingBoxAscent + size.actualBoundingBoxDescent : lineHeightDefault);
        }
        var lines = [];
        var line = "";
        var canUseAdvHeight;
        for (var i = 0; i < words.length; i++)
        {
            size = ctx.measureText(words[i]);
            if (canUseAdvHeight === undefined)
                canUseAdvHeight = size.actualBoundingBoxAscent && size.actualBoundingBoxDescent
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
}
export class CenteredTextData
{
    /** @type {number} */
    width;
    /** @type {number} */
    height;
    /**
     * @param {number} width 
     * @param {number} height 
     */
    constructor (width, height)
    {
        this.width = width;
        this.height = height;
    }
    /**
     * @param {CanvasRenderingContext2D} ctx 
     * @param {string} text 
     * @param {number} width 
     * @param {number} height 
     * @param {number} backupHeight 
     * @returns {CenteredTextData}
     */
    static centerText(ctx, text, width, height, backupHeight)
    {
        var size = ctx.measureText(text);
        var h = size.actualBoundingBoxAscent && size.actualBoundingBoxDescent ? size.actualBoundingBoxAscent + size.actualBoundingBoxDescent : backupHeight;
        return new CenteredTextData(width / 2 - size.width / 2, height / 2 + h / 2);
    }
    /**
     * @param {CanvasRenderingContext2D} ctx 
     * @param {string} text 
     * @param {number} height 
     * @param {number} backupHeight 
     * @returns {number} Height
     */
    static centerTextHeight(ctx, text, height, backupHeight)
    {
        var size = ctx.measureText(text);
        var h = size.actualBoundingBoxAscent && size.actualBoundingBoxDescent ? size.actualBoundingBoxAscent + size.actualBoundingBoxDescent : backupHeight;
        return height / 2 + h / 2;
    }
}
/**
 * Draws a rounded rectangle.
 * @param {CanvasRenderingContext2D} ctx 
 * @param {number} x 
 * @param {number} y 
 * @param {number} width 
 * @param {number} height 
 * @param {Radius} radius 
 * @param {boolean} fill 
 * @param {boolean} stroke 
 */
export function roundedRect(ctx, x, y, width, height, radius, fill, stroke)
{
    if (!(stroke || fill) || !radius) return;
    roundedRectPath(ctx, x, y, width, height, radius);
    if (fill)
        ctx.fill();
    if (stroke)
        ctx.stroke();
}
/**
 * Pathes out a rounded rectangle.
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} x
 * @param {number} y
 * @param {number} width
 * @param {number} height
 * @param {Radius} radius
 */
export function roundedRectPath(ctx, x, y, width, height, radius)
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

export class TextMeasurement
{
    /** @type {number} */
    width;
    /** @type {number} */
    height;
    /** @type {number} */
    up;
    /** @type {number} */
    down;
    /** @type {TextMetrics} */
    raw;
    /**
     * @param {CanvasRenderingContext2D} ctx
     * @param {string} text
     * @param {number} defaultHeight
     */
    constructor(ctx, text, defaultHeight = 14)
    {
        this.raw = ctx.measureText(text);
        this.width = this.raw.width;
        if (this.raw.actualBoundingBoxAscent)
        {
            this.up = this.raw.actualBoundingBoxAscent;
            this.down = this.raw.actualBoundingBoxDescent;
            this.height = this.up + this.down;
        }
        else
        {
            this.height = defaultHeight;
            this.up = defaultHeight;
            this.down = 0;
        }
    }

    /**
     * @param {CanvasRenderingContext2D} ctx 
     * @param {string} text 
     * @param {number} defaultHeight 
     * @returns {number}
     */
    static height(ctx, text, defaultHeight = 14)
    {
        var ms = ctx.measureText(text);
        return ms.actualBoundingBoxAscent ? ms.actualBoundingBoxAscent + ms.actualBoundingBoxDescent : defaultHeight;
    }
    /**
     * @param {CanvasRenderingContext2D} ctx 
     * @param {string} text 
     * @returns {number}
     */
    static width(ctx, text)
    {
        var ms = ctx.measureText(text);
        return ms.width;
    }
}

export class NotImplementedException extends Error
{
    /**
     * @callback AbstractMethod
     */

    /**
     * @param {AbstractMethod} method 
     */
    constructor(method, caller)
    {
        this.name = "NotImplementedException";
        this.message = "Abstract method, \"" + method.name + "\" in \"" + caller.constructor.name + "\" not implemented by extending class.";
    }
}
export function onImageLoad()
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
    Program.invalidateNext(0.2);
    Program.tick();
}

/**
 * Fit an inner rectangle into an outer one.
 * @param {number} outerX 
 * @param {number} outerY 
 * @param {number} innerX 
 * @param {number} innerY 
 * @returns {number} Decimal coefficient to multiply inner x and y by to fit into outer x and y.
 */
export function getScale(outerX, outerY, innerX, innerY)
{
    if (innerX > innerY)
    {
        return Math.max(outerX, outerY) / innerX;
    }
    else
    {
        return Math.min(outerX, outerY) / innerY;
    }
}

/**
 * @param {string} ascii 
 * @returns {Uint8Array}
 */
export function asciiToUint8Array(ascii)
{
    var arr = new Uint8Array(ascii.length);
    for (var i = 0; i < ascii.length; i++)
    {
        arr[i] = ascii.charCodeAt(i);
    }
    return arr;
}

/**
 * Draw the rounded arrow at the bottom of a dictionary page.
 * @param {CanvasRenderingContext2D} ctx 
 * @param {number} x 
 * @param {number} y 
 * @param {number} width 
 * @param {number} height 
 * @param {Radius} radius 
 * @param {number} fill 
 * @param {number} stroke 
 * @param {number} left Is facing left
 * @returns {void}
 */
export function roundedArrow(ctx, x = 0, y = 0, width = 128, height = 128, radius, fill = false, stroke = true, left = true)
{
    if (!(stroke || fill)) return;
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