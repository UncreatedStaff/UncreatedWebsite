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


import { Program } from "./editor.js";

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
    /**
     * Truncate a string without splitting by words.
     * @param {CanvasRenderingContext2D} ctx 
     * @param {string} text Should be more than 1 letter long.
     * @param {number} maxWidth 
     * @returns {string} Truncated string
     */
    static truncateLetters(ctx, text, maxWidth, ending = "...")
    {
        if (text.length < 2) return text;
        var width = ctx.measureText(text).width;
        if (width <= maxWidth) return text;
        var endwidth = !ending || ending.length === 0 ? 0 : ctx.measureText(ending).width;
        for (var i = text.length - 1; i >= 0; i--)
        {
            if (i > 0 && text[i - 1] === " ") i--;
            let str = text.substring(0, i);
            width = ctx.measureText(str).width;
            if (width + endwidth < maxWidth)
            {
                return !ending || ending.length === 0 ? str : str + ending; 
            }
        }
        return ending ?? "";
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
    Program.invalidate();
    Program.invalidateAfter();
    Program.invalidateIn(0.2);
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
    return Math.min(outerX / innerX, outerY / innerY);
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

/**
 * https://stackoverflow.com/questions/5573096/detecting-webp-support
 * @returns {boolean}
 */
export function supportsWebp()
{
 var elem = document.createElement('canvas');

 if (!!(elem.getContext && elem.getContext('2d')))
 {
  // was able or not to get WebP representation
  return elem.toDataURL('image/webp').indexOf('data:image/webp') == 0;
 }
 else
 {
  // very old browser like IE 8, canvas not supported
  return false;
 }
}

export class WebImage
{
    /** @type {HTMLImageElement} */
    image;
    /** @type {string} */
    id;
    /** @type {string} */
    source;
    /** @type {boolean} */
    failed;
    /** @type {number} */
    sizeX;
    /** @type {number} */
    sizeY;
    /**
     * @param {string} id
     * @param {string} src
     * @param {number} sizeX
     * @param {number} sizeY
     */
    constructor(id, source, sizeX, sizeY)
    {
        this.failed = false;
        if (id === undefined || source === undefined || sizeX === undefined || sizeY === undefined)
            return;
        this.id = id;
        this.source = source;
        this.sizeX = sizeX;
        this.sizeY = sizeY;
        this.request();
    }

    request()
    {
        if (this.failed || this.id === undefined || this.source === undefined) return;
        this.image = Program.pages.iconCache.get(this.id);
        if (!this.image)
        {
            this.image = new Image(this.sizeX, this.sizeY);
            this.image.id = this.id;
            this.image.onload = onImageLoad;
            this.image.src = this.source;
            Program.pages.iconCache.set(this.id, this.image);
        }
    }

    replace(id, source, sizeX = undefined, sizeY = undefined)
    {
        this.id = id;
        this.source = source;
        if (sizeX) this.sizeX = sizeX;
        if (sizeY) this.sizeY = sizeY;
        this.image = undefined;
        this.failed = false;
        this.request();
    }

    /**
     * @param {CanvasRenderingContext2D} ctx
     * @param {number} x
     * @param {number} y
     * @param {number} w
     * @param {number} h
     * @returns {boolean} Successfully drawn image
     */
    draw(ctx, x, y, w, h)
    {
        if (this.failed) return false;
        if (!this.image)
            this.request();
        try
        {
            ctx.drawImage(this.image, x, y, w, h);
            return true;
        }
        catch
        {
            this.failed = true;
            Program.invalidateAfter();
            return false;
        }
    }

}
/**
 * Get item data from id.
 * @param {number} id
 * @returns {import("./editor.js").ItemData}
 */
export function getData(id)
{
    if (!id || id === 0) return undefined; 
    for (var i = 0; i < Program.DATA.items.length; i++)
    {
        if (Program.DATA.items[i].ItemID === id) return Program.DATA.items[i];
    }
    return undefined;
}