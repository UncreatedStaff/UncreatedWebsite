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
        this.tr = tr ? tr : tl;
        this.bl = bl ? bl : tl;
        this.br = br ? br : tr;
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