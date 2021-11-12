import { Radius, WrappedLine, TextMeasurement, roundedRect, CenteredTextData } from "./util.js";
import { Program } from "./editor.js";
import * as C from "./const.js";
export const imageSize = 32;
export class Wiki
{
    /** @type {string} */
    title;
    /** @type {string} */
    message;
    /** @type {WrappedLine[]} */
    wrappedMessage;
    /** @type {number} */
    margin;
    /** @type {boolean} */
    darkenBackground;
    /** @type {boolean} */
    consumeKeys;
    /** @type {any[]} */
    fields;
    /** @type {HTMLImageElement[]} */
    icons;
    /** @type {boolean} */
    isOpen;
    /** @type {boolean} */
    reopenToDictionary;
    /** @type {boolean} */
    willAnimate;
    /** @type {boolean} */
    isAnimating;
    /** @type {Radius} */
    radius;
    /** @type {Radius} */
    headerRadius;
    /** @type {boolean} */
    inited;
    /** @type {ItemData} */
    currentItem;
    /** @type {number} */
    currentAnimAlpha;
    /** false = closing, true = opening
     * @type {boolean} */
    animState; 
    constructor()
    {
        this.title = "WIKI";
        this.message = "DESC";
        this.wrappedMessage = null;
        this.margin = 16;
        this.darkenBackground = true;
        this.consumeKeys = false;
        this.fields = [];
        this.icons = [];
        this.isOpen = false;
        this.reopenToDictionary = false;
        this.willAnimate = false;
        this.isAnimating = false;
        this.radius = new Radius(16);
        this.headerRadius = new Radius(16, 16, 0, 0);
        this.inited = false;
        this.currentItem = null;
        this.currentAnimAlpha = 0.0;
        this.animState = false; //false = closing, true = opening
    }
    /**
     * @param {CanvasRenderingContext2D} ctx 
     */
    updateDims(ctx)
    {
        this.width = Program.canvas.width / 1.5;
        this.posX = Program.canvas.width / 2 - this.width / 2;
        this.startPosY = Program.canvas.height * 1.05;
        ctx.font = C.popupDescTextSize.toString() + 'px Segoe UI';
        ctx.textAlign = 'left';
        this.wrappedMessage = WrappedLine.wrapText(ctx, this.message, this.width - this.margin * 2, C.popupDescTextSize);
        this.textHeight = 0;
        for(var i = 0; i < this.wrappedMessage.length; i++)
            this.textHeight += this.wrappedMessage[i].height + C.popupDescLineSpacing;
        this.height = C.popupHeaderHeight + this.margin + this.textHeight + this.margin + this.getContentHeight(ctx) + this.margin;
        this.finalPosY = Program.canvas.height / 2 - this.height / 2;
        ctx.font = 'bold ' + C.popupTitleTextSize.toString() + 'px Segoe UI';
        ctx.textAlign = 'left';
        this.titleYoffset = CenteredTextData.centerTextHeight(ctx, this.title, C.popupHeaderHeight, C.popupTitleTextSize);
        this.contentYStart = C.popupHeaderHeight + this.margin + this.textHeight + this.margin;
        this.inited = true;
    }
    open()
    {
        this.animState = true;
        this.willAnimate = true;
        this.inited = false;
        Program.invalidate();
    }
    close()
    {
        this.animState = false;
        this.willAnimate = true;
        this.consumeKeys = false;
        Program.invalidate();
        if(this.reopenToDictionary && Program.dictionary)
            Program.dictionary.open();
    }
    /**
     * @param {CanvasRenderingContext2D} ctx 
     * @param {number} dt Delta time
     * @param {number} rt Realtime
     */
    render(ctx, dt, rt)
    {
        if(!this.inited)
            this.updateDims(ctx);
        if(this.willAnimate)
        {
            this.willAnimate = false;
            this.isAnimating = true;
            if(this.animState)
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
        else if(this.isAnimating)
        {
            if(this.animState)
            {
                if(this.currentAnimAlpha >= 1.0)
                {
                    this.currentAnimAlpha = 1;
                    this.isAnimating = false;
                    this.isOpen = true;
                    this.willAnimate = false;
                    this.renderAt(ctx, this.posX, this.finalPosY, 1.0);
                    this.consumeKeys = true;
                    return false;
                }
                else
                {
                    this.renderAt(ctx, this.posX, this.#lerp(), this.currentAnimAlpha);
                    this.currentAnimAlpha += dt / C.popupAnimTimeSec;
                    return true;
                }
            }
            else
            {
                if(this.currentAnimAlpha <= 0)
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
                    this.renderAt(ctx, this.posX, this.#lerp(), this.currentAnimAlpha);
                    this.currentAnimAlpha -= dt / C.popupAnimTimeSec;
                    return true;
                }
            }
        }
        else if(this.isOpen)
        {
            this.renderAt(ctx, this.posX, this.finalPosY, 1.0);
        }
        return this.isAnimating;
    }
    /**
     * @param {number} alpha 
     * @returns {number}
     */
    #exp(alpha)
    {
        return Math.pow(C.expConst, Math.pow(C.expConst, 0.5 * alpha) * alpha - 1) - Math.pow(C.expConst, -1);
    }
    /**
     * @returns {number}
     */
    #lerp()
    {
        if(this.animState)
            return(this.startPosY - this.finalPosY) *(1 -(this.#exp(this.currentAnimAlpha))) + this.finalPosY;
        else
            return(this.startPosY - this.finalPosY) *(this.#exp(1 - this.currentAnimAlpha)) + this.finalPosY;
    }
    /**
     * @param {CanvasRenderingContext2D} ctx 
     * @param {number} x
     * @param {number} y
     * @param {number} bkgrAlpha
     */
    renderAt(ctx, x, y, bkgrAlpha)
    {
        if(bkgrAlpha > 0)
        {
            ctx.globalAlpha = bkgrAlpha * C.popupBkgrTransparency;
            ctx.fillStyle = "#000000";
            ctx.fillRect(0, 0, Program.canvas.width, Program.canvas.height);
        }
        ctx.globalAlpha = 1.0;
        if(y >= Program.canvas.height) return;
        ctx.fillStyle = C.wikiBackground;
        ctx.strokeStyle = C.popupAccent1;
        roundedRect(ctx, x, y, this.width, this.height, this.radius, true, true);
        ctx.strokeStyle = "#000000";
        ctx.fillStyle = C.popupAccent1;
        roundedRect(ctx, x, y, this.width, C.popupHeaderHeight, this.headerRadius, true, false);
        ctx.fillStyle = "#000000";
        ctx.font = 'bold ' + C.popupTitleTextSize.toString() + 'px Segoe UI';
        ctx.textAlign = 'left';
        var ypos = y + C.popupHeaderHeight;
        ctx.fillText(this.title, x + this.margin, y + this.titleYoffset, this.width - this.margin * 2);
        ctx.font = C.popupDescTextSize.toString() + 'px Segoe UI';
        ypos += this.margin;
        for(var i = 0; i < this.wrappedMessage.length; i++)
        {
            ypos += this.wrappedMessage[i].height;
            ctx.fillText(this.wrappedMessage[i].text, x + this.margin, ypos, this.width - this.margin * 2);
            if(i != this.wrappedMessage.length - 1) ypos += C.popupDescLineSpacing;
        }
        this.renderCustom(ctx, ypos);
    }
    onClose()
    {
    }
    /**
     * @param {KeyboardEvent} event 
     */
    keyPress(event)
    {
        if(event.keyCode == 27) // esc
        {
            this.close();
        }
    }
    onClick(x, y)
    {
        
    }
    onMouseMoved(x, y)
    {
        if(Program.moveConsumed)
            Program.invalidate();
    }
    loadItem(itemData)
    {
        this.currentItem = itemData;
        this.title = itemData.LocalizedName;
        this.message = itemData.LocalizedDescription;
        this.updateDims(Program.context);
        Program.invalidate();
    }
    getContentHeight(ctx)
    {
        if(this.currentItem === null) return;
        var type = this.currentItem.T;
        var ypos = this.renderBase(ctx, 0, this.currentItem.T === 0);
        switch(type) 
        {
            case 0:
            case 31:
            case 32:
            case 34:
            case 36:
            case 37:
            case 38:
            case 50:
                break;
            case 1: // gun
                ypos = this.renderGun(ctx, ypos, true, true);
                break;
            case 2: // magazine
                ypos = this.renderMagazine(ctx, ypos, true, true);
                break;
            case 3: // throwable
                ypos = this.renderThrowable(ctx, ypos, true, true);
                break;
            case 4: // clothing
                ypos = this.renderClothing(ctx, ypos, true, true);
                break;
            case 45:
            case 46:
            case 48:
            case 5: // storage clothing
                ypos = this.renderStorageClothing(ctx, ypos, true, true);
                break;
            case 6: // barricade
                ypos = this.renderBarricade(ctx, ypos, true, true);
                break;
            case 7: // structure
                ypos = this.renderStructure(ctx, ypos, true, true);
                break;
            case 8: // trap
                ypos = this.renderTrap(ctx, ypos, true, true);
                break;
            case 9: // attachment
                ypos = this.renderAttachment(ctx, ypos, true, true);
                break;
            case 10: // sight
                ypos = this.renderSight(ctx, ypos, true, true);
                break;
            case 11: // grip
                ypos = this.renderGrip(ctx, ypos, true, true);
                break;
            case 12: // tactical
                ypos = this.renderTactical(ctx, ypos, true, true);
                break;
            case 13: // barrel
                ypos = this.renderBarrel(ctx, ypos, true, true);
                break;
            case 41: // food
            case 42: // medical
            case 43: // water
            case 14: // consumable
                ypos = this.renderConsumable(ctx, ypos, true, true);
                break;
            case 15: // consumable
                ypos = this.renderUseable(ctx, ypos, true, true);
                break;
            case 16: // fuel
                ypos = this.renderFuel(ctx, ypos, true, true);
                break;
            case 17: // optic(binos)
                ypos = this.renderZoom(ctx, ypos, true, true);
                break;
            case 18: // charge
                ypos = this.renderCharge(ctx, ypos, true, true);
                break;
            case 19: // refill
                ypos = this.renderRefill(ctx, ypos, true, true);
                break;
            case 20: // map
                ypos = this.renderMap(ctx, ypos, true, true);
                break;
            case 21: // handcuff
                ypos = this.renderHandcuff(ctx, ypos, true, true);
                break;
            case 22: // beacon
                ypos = this.renderBeacon(ctx, ypos, true, true);
                break;
            case 23: // farm
                ypos = this.renderFarm(ctx, ypos, true, true);
                break;
            case 24: // generator
                ypos = this.renderGenerator(ctx, ypos, true, true);
                break;
            case 25: // library
                ypos = this.renderLibrary(ctx, ypos, true, true);
                break;
            case 26: // storage
                ypos = this.renderStorage(ctx, ypos, true, true);
                break;
            case 27: // tank
                ypos = this.renderTank(ctx, ypos, true, true);
                break;
            case 28: // workshop box
                ypos = this.renderWorkshopBox(ctx, ypos, true, true);
                break;
            case 50:
            case 29: // non-storage clothes
                ypos = this.renderGear(ctx, ypos, true, true);
                break;
            case 30: // cloud
                ypos = this.renderCloud(ctx, ypos, true, true);
                break;
            case 33: // fisher
                ypos = this.renderFisher(ctx, ypos, true, true);
                break;
            case 35: // workshop key
                ypos = this.renderKey(ctx, ypos, true, true);
                break;
            case 39: // tire
                ypos = this.renderTire(ctx, ypos, true, true);
                break;
            case 40: // melee
                ypos = this.renderMelee(ctx, ypos, true, true);
                break;
            case 44: // handcuff key
                ypos = this.renderHandcuffKey(ctx, ypos, true);
                break;
            case 47: // shirt
                ypos = this.renderShirt(ctx, ypos, true, true);
                break;
            case 49: // glasses
                ypos = this.renderGlasses(ctx, ypos, true, true);
                break;
            case 51: // mask
                ypos = this.renderMask(ctx, ypos, true, true);
                break;
        }
        return ypos;
    }
    renderCustom(ctx, ypos2)
    {
        var type = this.currentItem.T;
        var ypos = this.renderBase(ctx, ypos2, this.currentItem.T === 0);
        switch(type) 
        {
            case 0:
            case 31:
            case 32:
            case 34:
            case 36:
            case 37:
            case 38:
            case 50:
                break;
            case 1: // gun
                ypos = this.renderGun(ctx, ypos, true);
                break;
            case 2: // magazine
                ypos = this.renderMagazine(ctx, ypos, true);
                break;
            case 3: // throwable
                ypos = this.renderThrowable(ctx, ypos, true);
                break;
            case 4: // clothing
                ypos = this.renderClothing(ctx, ypos, true);
                break;
            case 45:
            case 46:
            case 48:
            case 5: // storage clothing
                ypos = this.renderStorageClothing(ctx, ypos, true);
                break;
            case 6: // barricade
                ypos = this.renderBarricade(ctx, ypos, true);
                break;
            case 7: // structure
                ypos = this.renderStructure(ctx, ypos, true);
                break;
            case 8: // trap
                ypos = this.renderTrap(ctx, ypos, true);
                break;
            case 9: // attachment
                ypos = this.renderAttachment(ctx, ypos, true);
                break;
            case 10: // sight
                ypos = this.renderSight(ctx, ypos, true);
                break;
            case 11: // grip
                ypos = this.renderGrip(ctx, ypos, true);
                break;
            case 12: // tactical
                ypos = this.renderTactical(ctx, ypos, true);
                break;
            case 13: // barrel
                ypos = this.renderBarrel(ctx, ypos, true);
                break;
            case 41: // food
            case 42: // medical
            case 43: // water
            case 14: // consumable
                ypos = this.renderConsumable(ctx, ypos, true);
                break;
            case 15: // consumable
                ypos = this.renderUseable(ctx, ypos, true);
                break;
            case 16: // fuel
                ypos = this.renderFuel(ctx, ypos, true);
                break;
            case 17: // optic(binos)
                ypos = this.renderZoom(ctx, ypos, true);
                break;
            case 18: // charge
                ypos = this.renderCharge(ctx, ypos, true);
                break;
            case 19: // refill
                ypos = this.renderRefill(ctx, ypos, true);
                break;
            case 20: // map
                ypos = this.renderMap(ctx, ypos, true);
                break;
            case 21: // handcuff
                ypos = this.renderHandcuff(ctx, ypos, true);
                break;
            case 22: // beacon
                ypos = this.renderBeacon(ctx, ypos, true);
                break;
            case 23: // farm
                ypos = this.renderFarm(ctx, ypos, true);
                break;
            case 24: // generator
                ypos = this.renderGenerator(ctx, ypos, true);
                break;
            case 25: // library
                ypos = this.renderLibrary(ctx, ypos, true);
                break;
            case 26: // storage
                ypos = this.renderStorage(ctx, ypos, true);
                break;
            case 27: // tank
                ypos = this.renderTank(ctx, ypos, true);
                break;
            case 28: // workshop box
                ypos = this.renderWorkshopBox(ctx, ypos, true);
                break;
            case 50:
            case 29: // non-storage clothes
                ypos = this.renderGear(ctx, ypos, true);
                break;
            case 30: // cloud
                ypos = this.renderCloud(ctx, ypos, true);
                break;
            case 33: // fisher
                ypos = this.renderFisher(ctx, ypos, true);
                break;
            case 35: // workshop key
                ypos = this.renderKey(ctx, ypos, true);
                break;
            case 39: // tire
                ypos = this.renderTire(ctx, ypos, true);
                break;
            case 40: // melee
                ypos = this.renderMelee(ctx, ypos, true);
                break;
            case 44: // handcuff key
                ypos = this.renderHandcuffKey(ctx, ypos, true);
                break;
            case 47: // shirt
                ypos = this.renderShirt(ctx, ypos, true);
                break;
            case 49: // glasses
                ypos = this.renderGlasses(ctx, ypos, true);
                break;
            case 51: // mask
                ypos = this.renderMask(ctx, ypos, true);
                break;
        }
        return ypos;
    }
    renderBase(ctx, ypos, final = false, onlyCalc = false)
    {
        var sizeTxt = `${this.currentItem.SizeX}x${this.currentItem.SizeY}`;
        var typeTxt = `${this.currentItem.Type}`;
        var rarityTxt = `${this.currentItem.Rarity}`;
        ctx.fillStyle = "#000000";
        ctx.font = C.popupDescTextSize.toString() + 'px Segoe UI';
        var len1 = TextMeasurement.height(ctx, sizeTxt, C.popupDescTextSize);
        var len2 = TextMeasurement.height(ctx, typeTxt, C.popupDescTextSize);
        var len3 = TextMeasurement.height(ctx, rarityTxt, C.popupDescTextSize);
        var xpos = this.posX + this.margin;
        ypos += this.margin;
        if(!onlyCalc)
        {
            var img = new Image(imageSize, imageSize);
            img.src = C.statIconPrefix + "SizeX.svg";
            ctx.drawImage(img, xpos, ypos, imageSize, imageSize);
            ctx.fillText(sizeTxt, xpos + imageSize + this.margin / 2, ypos + imageSize -(imageSize / 2 - len1 / 2));
        }
        ypos += imageSize;
        ypos += this.margin;
        ypos += len2;
        if(!onlyCalc)
        {
            ctx.fillText(typeTxt, xpos, ypos);
        }
        ypos += this.margin;
        ypos += len3;
        if(!onlyCalc)
        {
            ctx.fillText(rarityTxt, xpos, ypos);
        }
        ypos += this.margin;
        return ypos;
    }
    renderUseable(ctx, ypos, final = false, onlyCalc = false)
    {
        return ypos;
    }
    renderGun(ctx, ypos, final = false, onlyCalc = false)
    {
        return ypos;
    }
    renderAttachment(ctx, ypos, final = false, onlyCalc = false)
    {
        return ypos;
    }
    renderMagazine(ctx, ypos, final = false, onlyCalc = false)
    {
        return ypos;
    }
    renderThrowable(ctx, ypos, final = false, onlyCalc = false)
    {
        return ypos;
    }
    renderClothing(ctx, ypos, final = false, onlyCalc = false)
    {
        return ypos;
    }
    renderStorageClothing(ctx, ypos, final = false, onlyCalc = false)
    {
        return ypos;
    }
    renderBarricade(ctx, ypos, final = false, onlyCalc = false)
    {
        return ypos;
    }
    renderStructure(ctx, ypos, final = false, onlyCalc = false)
    {
        return ypos;
    }
    renderTrap(ctx, ypos, final = false, onlyCalc = false)
    {
        return ypos;
    }
    renderSight(ctx, ypos, final = false, onlyCalc = false)
    {
        return ypos;
    }
    renderGrip(ctx, ypos, final = false, onlyCalc = false)
    {
        return ypos;
    }
    renderTactical(ctx, ypos, final = false, onlyCalc = false)
    {
        return ypos;
    }
    renderBarrel(ctx, ypos, final = false, onlyCalc = false)
    {
        return ypos;
    }
    renderConsumable(ctx, ypos, final = false, onlyCalc = false)
    {
        return ypos;
    }
    renderFuel(ctx, ypos, final = false, onlyCalc = false)
    {
        return ypos;
    }
    renderZoom(ctx, ypos, final = false, onlyCalc = false)
    {
        return ypos;
    }
    renderCharge(ctx, ypos, final = false, onlyCalc = false)
    {
        return ypos;
    }
    renderRefill(ctx, ypos, final = false, onlyCalc = false)
    {
        return ypos;
    }
    renderMap(ctx, ypos, final = false, onlyCalc = false)
    {
        return ypos;
    }
    renderHandcuff(ctx, ypos, final = false, onlyCalc = false)
    {
        return ypos;
    }
    renderBeacon(ctx, ypos, final = false, onlyCalc = false)
    {
        return ypos;
    }
    renderFarm(ctx, ypos, final = false, onlyCalc = false)
    {
        return ypos;
    }
    renderGenerator(ctx, ypos, final = false, onlyCalc = false)
    {
        return ypos;
    }
    renderLibrary(ctx, ypos, final = false, onlyCalc = false)
    {
        return ypos;
    }
    renderStorage(ctx, ypos, final = false, onlyCalc = false)
    {
        return ypos;
    }
    renderTank(ctx, ypos, final = false, onlyCalc = false)
    {
        return ypos;
    }
    renderWorkshopBox(ctx, ypos, final = false, onlyCalc = false)
    {
        return ypos;
    }
    renderGear(ctx, ypos, final = false, onlyCalc = false)
    {
        return ypos;
    }
    renderCloud(ctx, ypos, final = false, onlyCalc = false)
    {
        return ypos;
    }
    renderFisher(ctx, ypos, final = false, onlyCalc = false)
    {
        return ypos;
    }
    renderKey(ctx, ypos, final = false, onlyCalc = false)
    {
        return ypos;
    }
    renderTire(ctx, ypos, final = false, onlyCalc = false)
    {
        return ypos;
    }
    renderMelee(ctx, ypos, final = false, onlyCalc = false)
    {
        return ypos;
    }
    renderHandcuffKey(ctx, ypos, final = false, onlyCalc = false)
    {
        return ypos;
    }
    renderShirt(ctx, ypos, final = false, onlyCalc = false)
    {
        return ypos;
    }
    renderGlasses(ctx, ypos, final = false, onlyCalc = false)
    {
        return ypos;
    }
    renderMask(ctx, ypos, final = false, onlyCalc = false)
    {
        return ypos;
    }
}