import * as C from "./const.js";
import { Radius, WrappedLine, CenteredTextData, roundedRect, TextMeasurement } from "./util.js";
import { Program } from "./editor.js";
/** @typedef {import('./editor.js').ItemData} ItemData */

/**
 * Customizable popup message.
 */
export class Popup
{
    /** @type {string} */
    title;
    /** @type {string} */
    message;
    /** @type {PopupButton[]} */
    buttons;
    /** @type {PopupTextbox[]} */
    textboxes;
    /** @type {PopupWidget[]} */
    widgets;
    /** @type {boolean} */
    darkenBackground;
    /** @type {boolean} */
    consumeKeys;
    /** @type {boolean} */
    isOpen;
    /** @type {boolean} */
    #willAnimate;
    /** @type {boolean} */
    #isAnimating;
    /** @type {Radius} */
    #radius;
    /** @type {Radius} */
    #headerRadius;
    /** @type {number} */
    margin;
    /** @type {boolean} */
    #inited;
    /** @type {boolean} false: closing, true: opening */
    #animState;
    /** @type {number} */
    #currentAnimAlpha;
    /** @type {number} */
    width;
    /** @type {number} */
    height;
    /** @type {number} */
    posX;
    /** @type {number} */
    #startPosY;
    /** @type {number} */
    #finalPosY;
    /** @type {WrappedLine[]} */
    #wrappedMessage;
    /** @type {number} */
    #titleYoffset;
    /** @type {number} */
    #textHeight;
    /** @type {number} */
    #buttonWidth;
    /**
     * 
     * @param {string} title 
     * @param {string} message 
     * @param {PopupButton[]} buttons 
     * @param {PopupTextbox[]} textboxes 
     * @param {PopupWidget[]} widgets 
     * @param {boolean} darkenBackground 
     */
    constructor(title, message, buttons = null, textboxes = null, widgets = null, darkenBackground = true)
    {
        this.title = title;
        this.message = message;
        this.darkenBackground = darkenBackground;
        this.buttons = buttons ?? [];
        this.textboxes = textboxes ?? [];
        this.widgets = widgets ?? [];
        for (var i = 0; i < this.buttons.length; i++)
            this.buttons[i].owner = this;
        for (var i = 0; i < this.textboxes.length; i++)
            this.textboxes[i].owner = this;
        for (var i = 0; i > this.widgets.length; i++)
            this.widgets[i].owner = this;
        this.reset();
        this.#radius = new Radius(16);
        this.#headerRadius = new Radius(16, 16, 0, 0);
        this.#inited = false;
        this.#animState = false;
        this.#currentAnimAlpha = 0.0;
        this.margin = 16;
    }
    reset()
    {
        for (var i = 0; i < this.textboxes.length; i++)
        {
            this.textboxes[i].clear();
            if (i == 0) this.textboxes[0].isFocused = true;
        }
        for (var i = 0; i < this.widgets.length; i++)
        {
            this.widgets[i].reset();
        }
    }
    /**
     * @param {CanvasRenderingContext2D} ctx 
     */
    updateDims(ctx)
    {
        this.width = Program.canvas.width / 3;
        this.posX = Program.canvas.width / 2 - this.width / 2;
        this.#startPosY = Program.canvas.height * 1.05;
        ctx.font = C.popupDescTextSize.toString() + 'px Segoe UI';
        ctx.textAlign = 'left';
        this.#wrappedMessage = WrappedLine.wrapText(ctx, this.message, this.width - this.margin * 2, C.popupDescTextSize);
        this.#textHeight = 0;
        for (var i = 0; i < this.#wrappedMessage.length; i++)
            this.#textHeight += this.#wrappedMessage[i].height + C.popupDescLineSpacing;
        var wh = 0;
        for (var i = 0; i < this.widgets.length; i++)
            if (!isNaN(this.widgets[i].defaultHeight))
                wh += this.widgets[i].defaultHeight;
        this.height = C.popupHeaderHeight + this.margin + this.#textHeight + this.margin + (this.margin + C.popupTextboxHeight) * this.textboxes.length + this.margin + wh + (this.buttons.length == 0 ? 0 : C.popupButtonHeight + this.margin);
        this.#finalPosY = Program.canvas.height / 2 - this.height / 2;
        ctx.font = 'bold ' + C.popupTitleTextSize.toString() + 'px Segoe UI';
        ctx.textAlign = 'left';
        this.#titleYoffset = CenteredTextData.centerTextHeight(ctx, this.title, C.popupHeaderHeight, C.popupTitleTextSize);
        this.#buttonWidth = ((this.width - this.margin) / this.buttons.length) - this.margin;
        for (var i = 0; i < this.buttons.length; i++)
            this.buttons[i].updateDims(ctx, this.#buttonWidth, C.popupButtonHeight);
        for (var i = 0; i < this.widgets.length; i++)
            this.widgets[i].updateDims(ctx, this.width - this.margin * 2, this.widgets[i].defaultHeight);
        for (var i = 0; i < this.textboxes.length; i++)
            this.textboxes[i].updateDims(ctx, this.width - this.margin * 2, C.popupTextboxHeight);
        this.inited = true;
    }
    /**
     * Begin the open animation.
     */
    open()
    {
        this.reset();
        this.#animState = true;
        this.#willAnimate = true;
        this.consumeKeys = true;
        this.#inited = false;
        Program.invalidate();
    }
    /**
     * Begin the close animation.
     */
    close()
    {
        this.#animState = false;
        this.#willAnimate = true;
        Program.invalidate();
    }
    /**
     * Render the popup at its current position.
     * @param {CanvasRenderingContext2D} ctx Rendering Context
     * @param {number} dt DeltaTime
     * @returns {boolean} True if the next frame should render.
     */
    render(ctx, dt)
    {
        if (!this.#inited)
            this.updateDims(ctx);
        if (this.#willAnimate)
        {
            this.#willAnimate = false;
            this.#isAnimating = true;
            if (this.#animState)
            {
                this.#currentAnimAlpha = 0.0;
                this.#renderAt(ctx, this.posX, this.#startPosY, 0.0);
            }
            else
            {
                this.#currentAnimAlpha = 1.0;
                this.#renderAt(ctx, this.posX, this.#finalPosY, 1.0);
            }
            return true;
        }
        else if (this.#isAnimating)
        {
            if (this.#animState)
            {
                if (this.#currentAnimAlpha >= 1.0)
                {
                    this.#currentAnimAlpha = 1.0;
                    this.#isAnimating = false;
                    this.isOpen = true;
                    this.#willAnimate = false;
                    this.#renderAt(ctx, this.posX, this.#finalPosY, 1.0);
                    return false;
                }
                else
                {
                    this.#renderAt(ctx, this.posX, this.#lerp(), this.#currentAnimAlpha);
                    this.#currentAnimAlpha += dt / C.popupAnimTimeSec;
                    return true;
                }
            }
            else
            {
                if (this.#currentAnimAlpha <= 0)
                {
                    this.#currentAnimAlpha = 0.0;
                    this.#isAnimating = false;
                    this.isOpen = false;
                    this.#willAnimate = false;
                    this.#onClose();
                    return false;
                }
                else
                {
                    this.#renderAt(ctx, this.posX, this.#lerp(), this.#currentAnimAlpha);
                    this.#currentAnimAlpha -= dt / C.popupAnimTimeSec;
                    return true;
                }
            }
        }
        else if (this.isOpen)
        {
            this.#renderAt(ctx, this.posX, this.#finalPosY, 1.0);
        }
        if (!this.#isAnimating)
        {
            for (var i = 0; i < this.textboxes.length; i++)
            {
                if (this.textboxes[i].isFocused) return true;
            }
        }
        return this.#isAnimating;
    }
    /**
     * @returns {number} current Y position based on animation state
     */
    #lerp()
    {
        if (this.#animState)
            return (this.#startPosY - this.#finalPosY) * (1 - (this.#exp(this.#currentAnimAlpha))) + this.#finalPosY;
        else
            return (this.#startPosY - this.#finalPosY) * (this.#exp(1 - this.#currentAnimAlpha)) + this.#finalPosY;
    }
    /**
     * @param {number} alpha 0-1 decimal representing animation progress 
     * @returns {number} adjusted progress
     */
    #exp(alpha)
    {
        return Math.pow(C.expConst, Math.pow(C.expConst, 0.5 * alpha) * alpha - 1) - Math.pow(C.expConst, -1);
    }
    /**
     * Render the popup at its current position.
     * @param {CanvasRenderingContext2D} ctx Rendering Context
     * @param {number} x
     * @param {number} y
     * @param {number} bkgrAlpha
     */
    #renderAt(ctx, x, y, bkgrAlpha)
    {
        if (bkgrAlpha > 0)
        {
            ctx.globalAlpha = bkgrAlpha * C.popupBkgrTransparency;
            ctx.fillStyle = "#000000";
            ctx.fillRect(0, 0, Program.canvas.width, Program.canvas.height);
        }
        ctx.globalAlpha = 1.0;
        if (y >= Program.canvas.height) return;
        ctx.fillStyle = C.popupBackground;
        ctx.strokeStyle = C.popupAccent1;
        roundedRect(ctx, x, y, this.width, this.height, this.#radius, true, true);
        ctx.strokeStyle = "#000000";
        ctx.fillStyle = C.popupAccent1;
        roundedRect(ctx, x, y, this.width, C.popupHeaderHeight, this.#headerRadius, true, false);
        ctx.fillStyle = "#ffffff";
        ctx.font = 'bold ' + C.popupTitleTextSize.toString() + 'px Segoe UI';
        ctx.textAlign = 'left';
        var ypos = y + C.popupHeaderHeight;
        ctx.fillText(this.title, x + this.margin, y + this.#titleYoffset, this.width - this.margin * 2);
        ctx.font = C.popupDescTextSize.toString() + 'px Segoe UI';
        ypos += this.margin;
        for (var i = 0; i < this.#wrappedMessage.length; i++)
        {
            ypos += this.#wrappedMessage[i].height;
            ctx.fillText(this.#wrappedMessage[i].text, x + this.margin, ypos, this.width - this.margin * 2);
            if (i != this.#wrappedMessage.length - 1) ypos += C.popupDescLineSpacing;
        }
        for (var i = 0; i < this.textboxes.length; i++)
        {
            ypos += this.margin;
            this.textboxes[i].renderAt(ctx, x + this.margin, ypos, this.width - this.margin * 2, C.popupTextboxHeight);
            ypos += C.popupTextboxHeight;
        }
        for (var i = 0; i < this.widgets.length; i++)
        {
            ypos += this.margin;
            this.widgets[i].renderAt(ctx, x + this.margin, ypos, this.width - this.margin * 2, this.widgets[i].defaultHeight);
            ypos += this.widgets[i].defaultHeight;
        }
        ypos += this.margin;
        if (this.buttons.length == 0) return;
        var xpos = x + this.margin;
        for (var i = 0; i < this.buttons.length; i++)
        {
            this.buttons[i].renderAt(ctx, xpos, ypos, this.#buttonWidth, C.popupButtonHeight);
            xpos += this.margin + this.#buttonWidth;
        }
    }
    #onClose()
    {
        Program.popup = null;
        this.consumeKeys = false;
    }
    /**
     * @param {KeyboardEvent} event 
     */
    keyPress(event)
    {
        for (var b = 0; b < this.buttons.length; b++)
        {
            if (this.buttons[b].keyCode == event.keyCode && this.buttons[b].onPress != null)
            {
                this.buttons[b].onPress(this.buttons[b]);
                Program.mouseBtn1Consumed = true;
                return;
            }
        }
        if (event.keyCode === 27) // esc
        {
            this.close();
            return;
        }
        else if (event.keyCode === 192) // tab
        {
            console.log("run");
            if (this.textboxes.length > 1)
            {
                console.log(this.textboxes);
                for (var i = 0; i < this.textboxes[i].length; i++)
                {
                    console.log(i);
                    if (this.textboxes[i].isFocused && this.textboxes.length > i + 1)
                    {
                        this.textboxes[i].isFocused = false;
                        this.textboxes[i + 1].isFocused = true;
                        console.log(i)
                        Program.invalidate();
                        return;
                    }
                }
            }
        }
        for (var i = 0; i < this.textboxes.length; i++)
        {
            if (this.textboxes[i].isFocused)
            {
                this.textboxes[i].keyPress(event);
                Program.invalidate();
                return;
            }
        }
        for (var i = 0; i < this.widgets.length; i++)
        {
            if (this.widgets[i].consumeKeys)
            {
                if (this.widgets[i].onKeyPress(event)) break;
            }
        }
    }
    /**
     * @param {number} x Click position X
     * @param {number} y Click position Y
     * @returns 
     */
    onClick(x, y)
    {
        for (var i = 0; i < this.buttons.length; i++)
        {
            if (this.buttons[i].isMouseInside(x, y))
            {
                Program.mouseBtn1Consumed = true;
                this.buttons[i].onClick(this.buttons[i]);
                return;
            }
        }
        for (var i = 0; i < this.widgets.length; i++)
        {
            if (x > this.widgets[i].posX && x < this.widgets[i].posX + this.widgets[i].width
                && y > this.widgets[i].posY && y < this.widgets[i].posY + this.widgets[i].height)
            {
                Program.mouseBtn1Consumed = true;
                this.widgets[i].onClick(x - this.widgets[i].posX, y - this.widgets[i].posY);
                Program.invalidate();
                return;
            }
        }
        for (var i = 0; i < this.textboxes.length; i++)
        {
            if (this.textboxes[i].isMouseInside(x, y))
            {
                Program.mouseBtn1Consumed = true;
                this.textboxes[i].isFocused = true;
                Program.invalidate();
            }
            else
            {
                this.textboxes[i].isFocused = false;
            }
        }
        Program.invalidate();
    }
    /**
     * @param {number} x Mouse position X
     * @param {number} y Mouse position Y
     * @returns 
     */
    onMouseMoved(x, y)
    {
        for (var i = 0; i < this.buttons.length; i++)
        {
            if (this.buttons[i].mouseOver)
            {
                if (!this.buttons[i].isMouseInside(x, y))
                {
                    this.buttons[i].mouseOver = false;
                    Program.moveConsumed = true;
                }
            }
            else
            {
                if (this.buttons[i].isMouseInside(x, y))
                {
                    this.buttons[i].mouseOver = true;
                    Program.moveConsumed = true;
                }
            }
        }
        for (var i = 0; i < this.widgets.length; i++)
        {
            if (x > this.widgets[i].posX && x < this.widgets[i].posX + this.widgets[i].width
                && y > this.widgets[i].posY && y < this.widgets[i].posY + this.widgets[i].height)
            {
                Program.moveConsumed = true;
                this.widgets[i].onMouseMoved(x - this.widgets[i].posX, y - this.widgets[i].posY);
                return;
            } else if (this.widgets[i].type == 2)
            {
                this.widgets[i].hovered = 0;
            }
        }
        if (Program.moveConsumed)
            Program.invalidate();
    }
}

/**
 * Button for popup messages.
 */
export class PopupButton
{
    /**
     * @callback ButtonEvent
     * @param {PopupButton} caller Button
     * @param {Popup} owner Owner
     * @returns {void}
     */

    /** @type {Popup} */
    owner;

    /** @type {string} */
    text;
    /** @type {Function} */
    onClick;
    /** @type {number} */
    shortcut;
    /** @type {boolean} */
    mouseOver;
    /** @type {Radius} */
    #radius;
    /** @type {number} */
    posX;
    /** @type {number} */
    posY;
    /** @type {number} */
    width;
    /** @type {number} */
    height;
    /** @type {number} */
    #center;

    /**
     * @param {string} text 
     * @param {number} keyShortcut 
     * @param {ButtonEvent} onClick 
     */
    constructor(text, keyShortcut, onClick)
    {
        this.text = text;
        this.shortcut = keyShortcut;
        this.onClick = onClick;
        this.#radius = new Radius(4);
        this.mouseOver = false;
        this.posX = 0;
        this.posY = 0;
        this.width = 0;
        this.height = 0;
    }
    /**
     * @param {number} x Mouse position X
     * @param {number} y Mouse position Y
     */
    isMouseInside(x, y)
    {
        return x > this.posX && x < this.posX + this.width && y > this.posY && y < this.posY + this.height;
    }

    /**
     * @param {CanvasRenderingContext2D} ctx 
     * @param {number} w Width
     * @param {number} h Height
     */
    updateDims(ctx, w, h)
    {
        ctx.font = 'bold ' + C.popupButtonTextSize.toString() + 'px Segoe UI';
        ctx.textAlign = 'center';
        this.#center = CenteredTextData.centerTextHeight(ctx, this.text, h, C.popupButtonTextSize);
    }
    /**
     * Render the popup button at its current position.
     * @param {CanvasRenderingContext2D} ctx Rendering Context
     * @param {number} x
     * @param {number} y
     * @param {number} w Width
     * @param {number} h Height
     */
    renderAt(ctx, x, y, w, h)
    {
        this.posX = x;
        this.posY = y;
        this.width = w;
        this.height = h;
        ctx.fillStyle = this.mouseOver ? C.popupAccent3 : C.popupAccent1;
        ctx.strokeStyle = C.popupAccent2;
        ctx.strokeWeight = 3;
        roundedRect(ctx, x, y, w, h, this.#radius, true, true);
        ctx.strokeWeight = 1;
        ctx.fillStyle = "#ffffff";
        ctx.font = 'bold ' + C.popupButtonTextSize.toString() + 'px Segoe UI';
        ctx.textAlign = 'center';
        ctx.fillText(this.text, x + w / 2, y + this.#center, w - this.#radius.tl - this.#radius.tr);
    }
}

/**
 * Textbox for popup messages.
 */
export class PopupTextbox
{
    /** @type {Popup} */
    owner;

    /** @type {boolean} */
    isFocused;
    /** @type {string} */
    placeholderText;
    /** @type {number} */
    limitMode;
    /** @type {number} */
    #cursorPosition;
    /** @type {string} */
    text;
    /** @type {number} */
    posX;
    /** @type {number} */
    posY;
    /** @type {number} */
    width;
    /** @type {number} */
    height;
    /** @type {number} */
    #blinkProgress;
    /** @type {number} */
    #center;
    /** @type {number} */
    #btm;
    /** @type {number} */
    #top;

    /**
     * @param {string} placeholderText 
     * @param {number} limitMode 0: all text, 1: numbers only
     * @param {string} defaultText 
     */
    constructor(placeholderText = "", limitMode = 0, defaultText = "")
    {
        this.isFocused = false;
        this.placeholderText = placeholderText;
        this.limitMode = limitMode;
        this.text = defaultText;
        this.#cursorPosition = 0;
        this.posX = 0;
        this.posY = 0;
        this.width = 0;
        this.height = 0;
        this.#blinkProgress = 0;
        this.#center = 0;
    }

    /**
     * @param {number} x Mouse position X
     * @param {number} y Mouse position Y
     */
    isMouseInside(x, y)
    {
        return x > this.posX && x < this.posX + this.width && y > this.posY && y < this.posY + this.height;
    }
    clear()
    {
        this.text = "";
        this.#cursorPosition = 0;
    }
    /**
     * @param {CanvasRenderingContext2D} ctx Rendering Context
     * @param {number} w Width
     * @param {number} h Height
     */
    updateDims(ctx, w, h)
    {
        ctx.font = C.popupTextboxTextSize.toString() + 'px Segoe UI';
        ctx.textAlign = 'left';
        this.#center = CenteredTextData.centerTextHeight(ctx, this.text, h, C.popupTextboxTextSize);
        var txtHeight = ctx.measureText("W");
        this.#btm = txtHeight.actualBoundingBoxDescent ? txtHeight.actualBoundingBoxDescent : 0;
        this.#top = txtHeight.actualBoundingBoxAscent ? txtHeight.actualBoundingBoxAscent : C.popupTextboxTextSize;
    }
    /**
     * Render the popup textbox at its current position.
     * @param {CanvasRenderingContext2D} ctx Rendering Context
     * @param {number} x
     * @param {number} y
     * @param {number} w Width
     * @param {number} h Height
     */
    renderAt(ctx, x, y, w, h)
    {
        this.posX = x;
        this.posY = y;
        this.width = w;
        this.height = h;
        ctx.fillStyle = this.isFocused ? C.popupAccent1 : C.popupAccent2;
        ctx.strokeStyle = "#000000";
        ctx.strokeWeight = 3;
        ctx.fillRect(x, y, w, h);
        ctx.strokeRect(x, y, w, h);
        ctx.strokeWeight = 1;
        if (this.text.length == 0)
        {
            ctx.fillStyle = "#afafaf";
            ctx.font = C.popupTextboxTextSize.toString() + 'px Segoe UI';
            ctx.textAlign = 'left';
            ctx.fillText(this.placeholderText, x + this.owner.margin / 2, y + this.#center, w - this.owner.margin * 2);
        }
        else
        {
            ctx.fillStyle = "#ffffff";
            ctx.font = C.popupTextboxTextSize.toString() + 'px Segoe UI';
            ctx.textAlign = 'left';
            ctx.fillText(this.text, x + this.owner.margin / 2, y + this.#center, w - this.owner.margin * 2);   
        }
        if (this.isFocused)
        {
            this.#blinkProgress += Program.deltaTime;
            if (this.#blinkProgress > C.blinkTime || isNaN(this.#blinkProgress)) this.#blinkProgress = 0;
            if (this.#blinkProgress > C.blinkTime / 2)
            {
                var txtWidth = ctx.measureText(this.text.substring(0, this.#cursorPosition));
                ctx.beginPath();
                ctx.moveTo(x + this.owner.margin / 2 + txtWidth.width + 1, y + this.center - this.#top - 1);
                ctx.lineTo(x + this.owner.margin / 2 + txtWidth.width + 1, y + this.center + this.#btm + 1);
                ctx.strokeStyle = "#ffffff";
                ctx.strokeWeight = 2;
                ctx.stroke();
                ctx.strokeWeight = 1;
            }
        }
    }
    /**
     * 
     * @param {KeyboardEvent} event 
     */
    keyPress(event)
    {
        if (event.keyCode === 8) //bksp
        {
            if (event.ctrlKey)
            {
                if (this.#cursorPosition === this.text.length)
                {
                    var i
                    for (i = this.text.length - 1; i >= 0; i--)
                        if (this.text[i] == " ") break;
                    if (i > 0)
                        this.text = this.text.substring(0, i);
                    else
                        this.text = "";
                    this.#cursorPosition = i < 0 ? 0 : i;
                }
                else
                {
                    var i
                    for (i = this.#cursorPosition - 1; i >= 0; i--)
                        if (this.text[i] == " ") break;
                    if (i > 0)
                        this.text = this.text.substring(0, i) + this.text.substring(this.#cursorPosition, this.text.length);
                    else
                        this.text = this.text.substring(this.#cursorPosition, this.text.length);
                    this.#cursorPosition = i < 0 ? 0 : i;
                }
            }
            else
            {
                if (this.#cursorPosition === this.text.length)
                {
                    this.text = this.text.substring(0, this.text.length - 1);
                }
                else
                {
                    this.text = this.text.substring(0, this.#cursorPosition - 1) + this.text.substring(this.#cursorPosition, this.text.length);
                }
                if (this.#cursorPosition > 0)
                    this.#cursorPosition--;
            }
        }
        else if (event.keyCode === 65 && event.ctrlKey)
        {
            if (event.preventDefault)
                event.preventDefault();
            if (event.stopPropagation)
                event.stopPropagation();
        }
        // a-z, _, ' ', 0-9
        else if ((this.limitMode == 1 && event.keyCode >= 48 && event.keyCode <= 57) || (this.limitMode != 1 && ((event.keyCode >= 65 && event.keyCode <= 90) || event.keyCode === 173 || event.keyCode === 32 || (event.keyCode >= 48 && event.keyCode <= 57) || event.keyCode == 190 || event.keyCode == 188)))
        {
            if (this.#cursorPosition === this.text.length || this.text.length == 0)
                this.text += event.key;
            else if (this.cursorPosition === 0)
                this.text = event.key + this.text;
            else
                this.text = this.text.substring(0, this.#cursorPosition) + event.key + this.text.substring(this.#cursorPosition, this.text.length);
            this.#cursorPosition++;
        } else if (event.keyCode === 37) // <-
        {
            if (this.#cursorPosition > 0)
                this.#cursorPosition--;
        }
        else if (event.keyCode === 39) // ->
        {
            if (this.#cursorPosition < this.text.length)
                this.#cursorPosition++;
        }
    }
}

/**
 * Abstract widget for popup messages.
 */
export class PopupWidget
{
    /** @type {Popup} */
    owner;
    /** @type {number} Type of Popup Widget */
    type;
    /** @type {number} */
    defaultHeight;
    /** @type {number} */
    width;
    /** @type {number} */
    height;
    /** @type {number} */
    posX;
    /** @type {number} */
    posY;
    /** @type {boolean} */
    consumeKeys;
    /** @type {boolean} */
    #inited;
    /**
     * @param {number} x Mouse Position X
     * @param {number} y Mouse Position Y 
     */
    onMouseMoved (x, y)
    {
        return;
    }
    /**
     * @param {number} x Mouse Position X
     * @param {number} y Mouse Position Y 
     */
    onClick (x, y)
    {
        return;
    }
    /**
     * Reset to default position
     */
    reset ()
    {
        return;
    }
    /**
     * @param {CanvasRenderingContext2D} ctx Rendering Context
     * @param {number} w Width
     * @param {number} h Height
     */
    updateDims (ctx, w, h)
    {
        this.width = w;
        this.height = h;
        this.#inited = true;
        return;
    }
    /**
     * Render the popup widget at its current position.
     * @param {CanvasRenderingContext2D} ctx Rendering Context
     * @param {number} x
     * @param {number} y
     * @param {number} w Width
     * @param {number} h Height
     */
    renderAt (ctx, x, y, w, h)
    {
        if (!this.#inited)
            this.updateDims(ctx, w, h);
        else
        {
            this.width = w;
            this.height = h;
        }
        this.posX = x;
        this.posY = y;
        return;
    }
    constructor()
    {
        this.defaultHeight = 60;
    }
}

/**
 * Two button selection panel for popup messages. Extends PopupWidget.
 * ~ TYPE 2 ~
 */
export class DualSelectWidget extends PopupWidget
{
    /** @type {string} */
    leftText;
    /** @type {string} */
    rightText;
    /** @type {number} 0 = none, 1 = left, 2 = right */
    hovered;
    /** @type {number} 0 = none, 1 = left, 2 = right */
    selected;
    /** @type {number} */
    #radius;
    /** @type {Radius} */
    #leftButtonRadius;
    /** @type {Radius} */
    #rightButtonRadius;
    /** @type {TextMeasurement} */
    #ltm;
    /** @type {TextMeasurement} */
    #rtm;
    /**
     * @param {string} leftText Text on left button selection.
     * @param {string} rightText Text on right button selection.
     */
    constructor(leftText, rightText)
    {
        super();
        this.type = 2;
        this.leftText = leftText;
        this.rightText = rightText;
        this.#radius = 4;
        this.#leftButtonRadius = new Radius(this.#radius, 0, this.#radius, 0);
        this.#rightButtonRadius = new Radius(0, this.#radius, 0, this.#radius);
        this.defaultHeight = 60;
    }
    /**
     * Reset to default position
     */
    reset()
    {
        super.reset();
        this.selected = 0;
        this.hovered = 0;
    }
    /**
     * @param {CanvasRenderingContext2D} ctx Rendering Context
     * @param {number} w Width
     * @param {number} h Height
     */
    updateDims(ctx, w, h)
    {
        super.updateDims(ctx, w, h);
        this.#ltm = new TextMeasurement(ctx, this.leftText, C.popupButtonTextSize);
        this.#rtm = new TextMeasurement(ctx, this.rightText, C.popupButtonTextSize);
    }
    /**
     * Render the popup widget at its current position.
     * @param {CanvasRenderingContext2D} ctx Rendering Context
     * @param {number} x
     * @param {number} y
     * @param {number} w Width
     * @param {number} h Height
     */
    renderAt (ctx, x, y, w, h)
    {
    super.renderAt(ctx, x, y, w, h);
    ctx.fillStyle = this.selected == 1 ? C.popupAccent3 : (this.hovered == 1 ? C.popupAccent4 : C.popupAccent2);
    ctx.strokeStyle = C.popupBackground;
    roundedRect(ctx, x, y, this.width / 2, this.height, this.#leftButtonRadius, true, true);
    ctx.fillStyle = this.selected == 2 ? C.popupAccent3 : (this.hovered == 2 ? C.popupAccent4 : C.popupAccent2);
    roundedRect(ctx, x + this.width / 2, y, this.width / 2, this.height, this.#rightButtonRadius, true, true);
    ctx.fillStyle = "#ffffff";
    ctx.font = 'bold ' + C.popupButtonTextSize.toString() + 'px Segoe UI';
    ctx.textAlign = 'center';
    ctx.fillText(this.leftText, x + this.width / 4, y + this.height / 2 + this.#ltm.height / 2, this.width / 2);
    ctx.fillText(this.rightText, x + this.width * 3 / 4, y + this.height / 2 + this.#rtm.height / 2, this.width / 2);
    }
    onMouseMoved(x, y)
    {
        if (x < this.width / 2)
            this.hovered = 1;
        else
            this.hovered = 2;
        Program.invalidate();
    }
    onClick(x, y)  
    {
        if (x < this.width / 2)
            this.selected = this.selected == 1 ? 0 : 1;
        else
            this.selected = this.selected == 2 ? 0 : 2;
    }
}