import { NotImplementedException, Radius, TextMeasurement, roundedRectPath, onImageLoad, getScale, roundedRect, CenteredTextData } from "./util.js";
import { PAGES, Program, PAGEORDER } from "./editor.js";
import * as C from "./const.js";
/** @typedef {import('./editor.js').ItemData} ItemData */

export class AttachmentEditor
{
    /**
     * @typedef _gun
     * @property {number[]} MagazineCalibers
     * @property {number[]} AttachmentCalibers
     * @property {number} Firerate
     * @property {number} ShootAction EAction
     * @property {boolean} DeleteEmptyMagaines
     * @property {number} Bursts
     * @property {number} FireRates EFireRate
     * @property {boolean} IsTurret
     * @property {number} SpreadADS
     * @property {number} SpreadHipfire
     * @property {number} SpreadSprint
     * @property {number} SpreadCrouch
     * @property {number} SpreadProne
     * @property {number} RecoilADS
     * @property {boolean} UseRecoilADS
     * @property {number} RecoilMinX
     * @property {number} RecoilMinY
     * @property {number} RecoilMaxX
     * @property {number} RecoilMaxY
     * @property {number} RecoverX
     * @property {number} RecoverY
     * @property {number} RecoilSprint
     * @property {number} RecoilCrouch
     * @property {number} RecoilProne
     * @property {number} ShakeMinX
     * @property {number} ShakeMinY
     * @property {number} ShakeMinZ
     * @property {number} ShakeMaxX
     * @property {number} ShakeMaxY
     * @property {number} ShakeMaxZ
     * @property {number} BallisticSteps
     * @property {number} BallisticTravel
     * @property {number} BallisticDrop
     * @property {number} BallisticForce
     * @property {number} ProjectileLifespan
     * @property {boolean} PenetrateBuildables
     * @property {number} ReloadTime
     * @property {number} HammerTime
     * @property {number} AlertRadius
     * @property {number} RangefinderRange
     * @property {boolean} HeadshotInstakill
     * @property {boolean} InfiniteAmmo
     * @property {number} AmmoPerShot
     * @property {number} FireDelay
     * @property {boolean} CanChangeMagazines
     * @property {boolean} SprintAiming
     * @property {boolean} CanJam
     * @property {number} MaxQualityToJam
     * @property {number} JamMaxChance
     * @property {number} GunshotRolloffDistance
     * @property {number} DefaultSight
     * @property {number} DefaultGrip
     * @property {number} DefaultBarrel
     * @property {number} DefaultMagazine
     * @property {number} UnloadStepTime
     * @property {number} ReloadStepTime
     * @property {boolean} HasSight
     * @property {boolean} HasTactical
     * @property {boolean} HasGrip
     * @property {boolean} HasBarrel
     * 
     * @typedef {ItemData & _gun} GunData
     * 
     * @typedef _attachment T = 9
     * @property {number[]} Calibers
     * @property {number} RecoilX
     * @property {number} RecoilY
     * @property {number} Spread
     * @property {number} Shake
     * @property {number} Damage
     * @property {number} Firerate
     * @property {number} BallisticDamageMultiplier
     * 
     * @typedef {ItemData & _attachment} AttachmentData
     * 
     * @typedef _sight T = 10
     * @prop {number} Vision ELightingVision
     * @prop {number} Zoom
     * @prop {boolean} Holographic
     * 
     * @typedef {AttachmentData & _sight} SightData
     * 
     * @typedef _tactical T = 12
     * @property {boolean} Laser
     * @property {boolean} Light
     * @property {boolean} Rangefinder
     * @property {boolean} Melee
     * @property {number} SpotlightRange
     * @property {number} SpotlightAngle
     * @property {number} SpotlightIntensity
     * @property {number} SpotlightColorR
     * @property {number} SpotlightColorG
     * @property {number} SpotlightColorB
     * 
     * @typedef {AttachmentData & _tactical} TacticalData
     * 
     * @typedef _grip T = 11
     * @property {boolean} Bipod
     * 
     * @typedef {AttachmentData & _grip} GripData
     * 
     * @typedef _barrel T = 13
     * @property {boolean} Braked
     * @property {boolean} Silenced
     * @property {number} Volume
     * @property {number} UsageDurability
     * @property {number} BallisticDrop
     * @property {number} GunshotRolloffDistanceMultiplier
     * 
     * @typedef {AttachmentData & _barrel} BarrelData
     * 
     * @typedef EnvironmentDamage
     * @property {number} BarricadeDamage
     * @property {number} StructureDamage
     * @property {number} VehicleDamage
     * @property {number} AnimalDamage
     * @property {number} ZombieDamage
     * @property {number} PlayerDamage
     * @property {number} ResourceDamage
     * @property {number} ObjectDamage
     * 
     * @typedef _magazine T = 2
     * @property {number} Pellets
     * @property {number} DurabilityOnHit
     * @property {number} ProjectileDamageMultiplier
     * @property {number} ProjectileBlastRadiusMultiplier
     * @property {number} ProjectileLaunchForceMultiplier
     * @property {number} ExplosiveRange
     * @property {number} PlayerDamage
     * @property {EnvironmentDamage} EnvironmentDamage
     * @property {number} Speed
     * @property {boolean} IsExplosive
     * @property {boolean} CanBeEmpty
     * 
     * @typedef {AttachmentData & _magazine} MagazineData
     */
    /** @type {GunData} */
    itemData;
    /** @type {SightData} */
    sight;
    /** @type {TacticalData} */
    tactical;
    /** @type {GripData} */
    grip;
    /** @type {BarrelData} */
    barrel;
    /** @type {number} */
    #previewSizeX;
    /** @type {number} */
    #previewSizeY;
    /** @type {number} */
    #previewPosX;
    /** @type {number} */
    #previewPosY;
    /** @type {number} */
    #cellSize;
    /** @type {MagazineData} */
    magazine;
    /** @type {SightData[]} */
    availableSights;
    /** @type {TacticalData[]} */
    availableTacticals;
    /** @type {GripData[]} */
    availableGrips;
    /** @type {BarrelData[]} */
    availableBarrels;
    /** @type {MagazineData[]} */
    availableMagazines;
    /** @type {boolean} */
    isOpen;
    /** @type {HTMLImageElement} */
    #itemPreview;
    /** @type {boolean} */
    #dontRequestImage;
    /** @type {ItemSlot} */
    #slots;
    /** @type {number} */
    #text;
    /** @type {number} */
    defaultSight;
    constructor()
    {
        this.availableSights = [];
        this.availableTacticals = [];
        this.availableGrips = [];
        this.availableBarrels = [];
        this.availableMagazines = [];
        this.isOpen = false;
        this.#slots = [ 
            new ItemSlot("sight", this),
            new ItemSlot("tactical", this),
            new ItemSlot("grip", this),
            new ItemSlot("barrel", this),
            new ItemSlot("magazine", this)
        ];
    }
    invalidatePreview()
    {
        this.#itemPreview = null;
        this.#dontRequestImage = false;
    }
    /**
     * Loads an item.
     * @param {GunData} itemData 
     */
    loadItem(itemData)
    {
        this.itemData = itemData;
        this.isOpen = itemData !== undefined;
        var defSight = this.#bytesToNumber(itemData.DefaultState, 0);
        this.updateAttachments(defSight);
        if (this.isOpen)
        {
            this.setAttachmentsFromState(itemData.DefaultState);
        }
        this.updateDims();
    }
    /**
     * @param {Uint8Array} state
     */
    setAttachmentsFromState(state)
    {
        this.sight = this.#bytesToNumber(state, 0);
        this.tactical = this.#bytesToNumber(state, 2);
        this.grip = this.#bytesToNumber(state, 4);
        this.barrel = this.#bytesToNumber(state, 6);
        this.magazine = this.#bytesToNumber(state, 8);
        this.#loadSettings();
    }
    #loadSettings()
    {
        for (var i = 0; i < this.#slots.length; i++)
        {
            this.#slots[i].loadFrom();
        }
    }
    /**
     * @param {Uint8Array} state
     * @param {number} index
     */
    #bytesToNumber(state, index)
    {
        return state[index + 1] * 256 + state[index];
    }
    /**
     * @param {number} id Item ID
     * @returns {boolean} Can the attachment be put on the gun.
     */
    isValid(id)
    {
        if (this.itemData.T !== 1) return false;
        if (id <= 0) return true;
        for (var i = 0; i < Program.DATA.items.length; i++)
        {
            if (Program.DATA.items[i].ItemID === id)
            {
                return this.isValidData(Program.DATA.items[i]);
            }
        }
        return false;
    }
    /**
     * @param {AttachmentData} itemData Attachment Data
     * @returns {boolean} Can the attachment be put on the gun.
     */
    isValidData(itemData)
    {
        if (!this.itemData) return false;
        if (this.itemData.T !== 1) return false;
        if (itemData == null) return true;
        if (itemData.T === 10 && !this.itemData.HasSight) return false;
        if (itemData.T === 12 && !this.itemData.HasTactical) return false;
        if (itemData.T === 11 && !this.itemData.HasGrip) return false;
        if (itemData.T === 13 && !this.itemData.HasBarrel) return false;
        if (!itemData.Calibers) return false;
        if (itemData.Calibers.length === 0) return true;
        var calibers = itemData.T === 2 ? this.itemData.MagazineCalibers : this.itemData.AttachmentCalibers;
        for (var i = 0; i < itemData.Calibers.length; i++)
        {
            for (var j = 0; j < calibers.length; j++)
            {
                if (itemData.Calibers[i] === calibers[j]) return true;
            }
        }
        return false;
    }

    /**
     * @param {number} defaultSight 
     */
    updateAttachments(defaultSight = 0)
    {
        this.availableSights.splice(0);
        this.availableTacticals.splice(0);
        this.availableGrips.splice(0);
        this.availableBarrels.splice(0);
        this.availableMagazines.splice(0);
        for (var i = 0; i < Program.DATA.items.length; i++)
        {
            /** @type {AttachmentData} */
            let item = Program.DATA.items[i];
            if (item.Name.includes("Iron_Sight") && item.ItemID !== defaultSight) continue;
            if (item.BallisticDamageMultiplier !== undefined) // is attachment data
            {
                if (this.isValidData(item))
                {
                    if (item.T === 10) this.availableSights.push(item);
                    else if (item.T === 12) this.availableTacticals.push(item);
                    else if (item.T === 11) this.availableGrips.push(item);
                    else if (item.T === 13) this.availableBarrels.push(item);
                    else if (item.T === 2 ) this.availableMagazines.push(item);
                }
            }
        }
        this.#slots[0].loadItems(this.availableSights);
        this.#slots[1].loadItems(this.availableTacticals);
        this.#slots[2].loadItems(this.availableGrips);
        this.#slots[3].loadItems(this.availableBarrels);
        this.#slots[4].loadItems(this.availableMagazines);
    }

    /** @type {string}*/
    get path()
    {
        if (this.itemData)
        {
            var sight = (this.sight != undefined ? this.sight : 0).toString();
            var tactical = (this.tactical != undefined ? this.tactical : 0).toString();
            var grip = (this.grip != undefined ? this.grip : 0).toString();
            var barrel = (this.barrel != undefined ? this.barrel : 0).toString();
            var magazine = (this.magazine != undefined ? this.magazine : 0).toString();
            return `${this.itemData.ItemID.toString()}/${sight}_${tactical}_${grip}_${barrel}_${magazine}`;
        }
        return undefined;
    }
    updateDims()
    {
        this.#previewSizeX = Program.canvas.width / 4;
        this.#previewSizeY = this.#previewSizeX / this.itemData.SizeX * this.itemData.SizeY;
        this.#previewPosX = (Program.canvas.width - this.#previewSizeX) / 2;
        this.#previewPosY = (Program.canvas.height - this.#previewSizeY) / 5;
        this.#cellSize = this.#previewSizeX / this.itemData.SizeX;
        if (this.#previewPosY < 5) this.#previewPosY = 5;
        var st = Program.canvas.width * 0.1;
        var ct = Program.canvas.width * 0.8 / 5;
        var ht = Program.canvas.height * 2.25 / 3;
        for (var i = 0; i < this.#slots.length; i++)
        {
            var slot = this.#slots[i];
            slot.posX = st + ct * i;
            slot.posY = ht;
            slot.updateDims();
        }
        Program.context.font = "bold " + C.attachmentPreviewUnavailableSize.toString() + "px Segoe UI";
        this.#text = CenteredTextData.centerTextHeight(Program.context, "Preview Unavailable", this.#previewSizeY, C.attachmentPreviewUnavailableSize);
    }
    /**
     * @param {CanvasRenderingContext2D} ctx Rendering Context
     */
    render(ctx)
    {
        if (!this.#itemPreview && !this.#dontRequestImage)
            this.getPreview(false);
        if (this.itemData)
        {
            for (var x = 0; x < this.itemData.SizeX; x++)
            {
                for (var y = 0; y < this.itemData.SizeY; y++)
                {
                    roundedRectPath(ctx, this.#previewPosX + this.#cellSize * x, 
                        this.#previewPosY + this.#cellSize * y, 
                        this.#cellSize, this.#cellSize, C.SLOT_RADIUS);
                    ctx.globalAlpha = 0.5;
                    ctx.fillStyle = C.occupiedCellColor;
                    ctx.fill();
                    ctx.globalAlpha = 1.0;
                    ctx.strokeStyle = "#000000";
                    ctx.stroke();
                }
            }
            if (this.#itemPreview && !this.#dontRequestImage)
            {
                try
                {
                    ctx.drawImage(this.#itemPreview, this.#previewPosX, this.#previewPosY, this.#previewSizeX, this.#previewSizeY);
                }
                catch
                {
                    this.#dontRequestImage = true;
                }
            }
            else
            {
                ctx.font = "bold " + C.attachmentPreviewUnavailableSize.toString() + "px Segoe UI";
                ctx.textAlign = "center";
                ctx.fillStyle = "#ffffff";
                ctx.fillText("Preview Unavailable", this.#previewPosX + this.#previewSizeX / 2, this.#previewPosY + this.#text);
            }
        }
        for (var i = 0; i < this.#slots.length; i++)
        {
            this.#slots[i].render(ctx);
        }
    }

    /**
     * Request item preview
     * @param {boolean} n Is new icon (disabled dont request image)
     * @returns {void}
     */
    getPreview(n)
    {
        if (this.#dontRequestImage && n) this.#dontRequestImage = false;
        var id = this.path;
        if (this.#dontRequestImage || id === undefined) return;
        this.#itemPreview = Program.pages.iconCache.get(id);
        if (!this.#itemPreview)
        {
            this.#itemPreview = new Image(this.itemData.SizeX * C.attachmentIconSizeMult, this.itemData.SizeY * C.attachmentIconSizeMult);
            this.#itemPreview.id = id;
            this.#itemPreview.onload = onImageLoad;
            this.#itemPreview.src = C.attachmentIconPrefix + id + ".png";
            Program.pages.iconCache.set(id, this.#itemPreview);
        }
    }

    /**
     * @param {number} x 
     * @param {number} y 
     */
    onMouseMoved(x, y)
    {
        for (var i = 0; i < this.#slots.length; i++)
        {
            this.#slots[i].onMouseMoved(x, y);
        }
    }

    /**
     * @param {number} x 
     * @param {number} y 
     */
    onClick(x, y)
    {
        for (var i = 0; i < this.#slots.length; i++)
            if (this.#slots[i].onClick(x, y)) return;
    }
}

class ItemSlot
{
    /** @type {AttachmentEditor} */
    owner;
    /** @type {ItemIcon} */
    middle;
    /** @type {ItemIcon[]} */
    icons;
    /** @type {AttachmentData[]} */
    items;
    /** @type {number} */
    posX;
    /** @type {number} */
    posY;
    /** @type {number} */
    itemDistance;
    /** @type {ItemData} */
    selectedItem;
    /**
     * grip | barrel | tactical | sight | magazine 
     * @type {string} */ 
    type;
    /**
     * @param {string} type grip | barrel | tactical | sight | magazine
     * @param {AttachmentEditor}
     */
    constructor(type, owner)
    {
        this.type = type;
        this.owner = owner;
        this.middle = new ItemIcon(this);
        this.icons = [];
        this.items = [];
        this.middle.load(this.type);
    }
    updateDims()
    {
        var angleDif = 2 * Math.PI / this.icons.length;
        this.middle.posX = this.posX - this.middle.width / 2;
        this.middle.posY = this.posY - this.middle.height / 2;
        for (var i = 0; i < this.icons.length; i++)
        {
            this.icons[i].posX = this.posX + (Math.cos(i * angleDif) * itemDistance) - this.icons[i].width / 2;
            this.icons[i].posY = this.posY + (Math.sin(i * angleDif) * itemDistance) - this.icons[i].height / 2;
        }
    }
    /**
     * @param {CanvasRenderingContext2D} ctx 
     */
    render(ctx)
    {
        this.middle.render(ctx);
        for (var i = 0; i < this.icons.length; i++)
            this.icons[i].render(ctx);
    }
    /**
     * @param {AttachmentData[]} items
     */
    loadItems(items)
    {
        this.items = items;
        this.middle.load(this.type);
        for (var i = 0; i < this.items.length; i++)
        {
            var item = this.icons[i];
            if (!item)
            {
                item = new ItemIcon(this);
                item.type = this.type;
            }
            item.index = i;
            item.load(items[i]);
            item.disabled = false;
            this.icons.push(item);
        }
    }
    /**
     * @param {number} x 
     * @param {number} y 
     */
    onMouseMoved(x, y)
    {
        if (x > this.middle.posX && x < this.middle.posX + this.middle.width && y > this.middle.posY && y < this.middle.posY + this.middle.height)
        {
            if (!this.middle.hovered)
            {
                this.middle.displayColor = C.hoveredCellColor;
                this.middle.hovered = true;
                Program.moveConsumed = true;
                Program.invalidate();
            }
        }
        else if (this.middle.hovered)
        {
            this.middle.displayColor = C.defaultCellColor;
            this.middle.hovered = false;
            Program.moveConsumed = true;
            Program.invalidate();
        }
        for (var i = 0; i < this.icons.length; i++)
        {
            var icon = this.icons[i];
            if (x > icon.posX && x < icon.posX + icon.width && y > icon.posY && y < icon.posY + icon.height)
            {
                if (!icon.hovered)
                {
                    icon.displayColor = C.hoveredCellColor;
                    icon.hovered = true;
                    Program.moveConsumed = true;
                    Program.invalidate();
                }
            }
            else if (icon.hovered)
            {
                icon.displayColor = C.defaultCellColor;
                icon.hovered = false;
                Program.moveConsumed = true;
                Program.invalidate();
            }
        }
    }
    #setType(val)
    {
        switch (this.type)
        {
            case "sight":
                this.owner.sight = val;
                break;
            case "tactical":
                this.owner.tactical = val;
                break;
            case "grip":
                this.owner.grip = val;
                break;
            case "barrel":
                this.owner.barrel = val;
                break;
            case "magazine":
                this.owner.magazine = val;
                break;
        }
    }
    loadFrom()
    {
        var val = 0;
        switch (this.type)
        {
            case "sight":
                val = this.owner.sight;
                break;
            case "tactical":
                val = this.owner.tactical;
                break;
            case "grip":
                val = this.owner.grip;
                break;
            case "barrel":
                val = this.owner.barrel;
                break;
            case "magazine":
                val = this.owner.magazine;
                break;
        }
        if (val === 0)
        {
            if (this.middle.occupied)
            {
                for (var i = 0; i < this.icons.length; i++)
                {
                    if (this.icons[i].index === this.middle.index)
                    {
                        this.icons[i].disabled = false;
                        break;
                    }
                }
                this.middle.load(Program.DATA.items[item]);
            }
        }
        else
        {
            for (var item = 0; item < Program.DATA.items.length; item++)
            {
                if (Program.DATA.items[item].ItemID === val)
                {
                    var index = 0;
                    for (; index < this.items.length; index++)
                        if (this.items[index].ItemID === val)
                            break;
                    if (index === 0)
                    {
                        index = this.items.length;
                        this.items.push(Program.DATA.items[item]);
                        var icon = new ItemIcon(this);
                        icon.index = index;
                        icon.type = this.type;
                        icon.disabled = true;
                        icon.load(Program.DATA.items[item]);
                    }
                    else
                    {
                        for (var i = 0; i < this.icons.length; i++)
                        {
                            if (this.icons[i].index === index)
                            {
                                this.icons[i].disabled = true;
                                break;
                            }
                        }
                    }
                    if (this.middle.occupied)
                    {
                        for (var i = 0; i < this.icons.length; i++)
                        {
                            if (this.icons[i].index === this.middle.index)
                            {
                                this.icons[i].disabled = false;
                                break;
                            }
                        }
                    }
                    this.middle.load(Program.DATA.items[item]);
                    break;
                }
            }
        }
    }
    /**
     * @param {number} x 
     * @param {number} y 
     */
    onClick(x, y)
    {
        if (x > this.middle.posX && x < this.middle.posX + this.middle.width && y > this.middle.posY && y < this.middle.posY + this.middle.height)
        {
            var own = this.icons[this.middle.index];
            if (own)
                own.disabled = false;
            this.middle.load(this.type);
            this.#setType(undefined);
            Program.mouseBtn1Consumed = true;
            return true;
        }
        for (var i = 0; i < this.icons.length; i++)
        {
            var icon = this.icons[i];
            if (x > icon.posX && x < icon.posX + icon.width && y > icon.posY && y < icon.posY + icon.height)
            {
                var old = this.icons[this.middle.index];
                if (old)
                    old.disabled = false;
                var it = this.items[icon.index] ?? this.type
                this.middle.load(it);
                this.#setType(it);
                icon.disabled = true;
                Program.mouseBtn1Consumed = true;
                return true;
            }
        }
        return false;
    }
}

const imgSize = 512;
class ItemIcon
{
    /** @type {ItemSlot} */
    #owner;
    /** @type {string} */
    #src;
    /** @type {number} */
    #id;
    /** @type {number} */
    index;
    /** @type {HTMLImageElement} */
    #icon;
    /** @type {number} */
    sizeX;
    /** @type {number} */
    sizeY;
    /** @type {number} */
    posX;
    /** @type {number} */
    posY;
    /** @type {number} */
    width;
    /** @type {number} */
    height;
    /** @type {boolean} */
    #dontRequestImage;
    /** @type {boolean} */
    disabled;
    /** @type {boolean} */
    occupied;
    /** @type {string} */
    displayColor;
    /** @type {boolean} */
    hovered;
    /**
     * @param {ItemSlot} owner 
     */
    constructor(owner)
    {
        this.#owner = owner;
        this.sizeX = 2;
        this.sizeY = 2;
        this.posX = 0;
        this.posY = 0;
        this.width = C.tileSize * 2;
        this.height = C.tileSize * 2;
        this.#dontRequestImage = false;
        this.displayColor = C.defaultCellColor;
        this.hovered = false;
        this.index = 0;
    }
    /**
     * Request item preview
     * @returns {void}
     */
    #getIcon()
    {
        if (this.#dontRequestImage || this.#id === undefined || this.#src === undefined) return;
        this.#icon = Program.pages.iconCache.get(this.#id);
        if (!this.#icon)
        {
            this.#icon = new Image(this.sizeX * imgSize, this.sizeY * imgSize);
            this.#icon.id = this.#id;
            this.#icon.onload = onImageLoad;
            this.#icon.src = this.#src;
            Program.pages.iconCache.set(this.#id, this.#icon);
        }
    }
    /**
     * @param {string | ItemData} itemData item data or (grip | barrel | tactical | sight | magazine)
     */
    load(itemData)
    {
        if (itemData === undefined)
        {
            this.#src = undefined;
            this.#id = undefined;
            this.sizeX = 2;
            this.sizeY = 2;
            this.width = C.tileSize * 2;
            this.height = C.tileSize * 2;
            this.occupied = false;
        }
        else if (typeof itemData === 'string')
        {
            this.sizeX = 2;
            this.sizeY = 2;
            this.width = C.tileSize * 2;
            this.height = C.tileSize * 2;
            this.occupied = false;
            switch (itemData)
            {
                case "grip":
                    this.#src = C.statIconPrefix + "grip.svg";
                    this.#id = PAGES.C_GRIP;
                    this.#getIcon();
                    break;
                case "barrel":
                    this.#src = C.statIconPrefix + "barrel.svg";
                    this.#id = PAGES.C_BARREL;
                    this.#getIcon();
                    break;
                case "tactical":
                    this.#src = C.statIconPrefix + "tactical.svg";
                    this.#id = PAGES.C_TACTICAL;
                    this.#getIcon();
                    break;
                case "sight":
                    this.#src = C.statIconPrefix + "sight.svg";
                    this.#id = PAGES.C_SIGHT;
                    this.#getIcon();
                    break;
                case "magazine":
                    this.#src = C.statIconPrefix + "ammo.svg";
                    this.#id = PAGES.C_MAGAZINE;
                    this.#getIcon();
                    break;
                default:
                    this.#src = undefined;
                    this.#id = undefined;
                    break;
            }
        }
        else if (itemData.ItemID)
        {
            this.#src = C.itemIconPrefix + itemData.ItemID.toString() + (Program.webp ? ".webp" : ".png");
            this.#id = itemData.ItemID;
            this.sizeX = itemData.SizeX;
            this.sizeY = itemData.SizeY;
            this.width = C.tileSize * this.sizeX;
            this.height = C.tileSize * this.sizeY;
            this.#getIcon();
            this.occupied = true;
        }
        else
        {
            this.#src = undefined;
            this.#id = undefined;
            this.sizeX = 2;
            this.sizeY = 2;
            this.width = C.tileSize * 2;
            this.height = C.tileSize * 2;
            this.occupied = false;
        }
        Program.invalidate();
        this.#owner.owner.invalidatePreview();
    }
    /**
     * @param {CanvasRenderingContext2D} ctx
     */
    render(ctx)
    {
        if (!this.#dontRequestImage && this.#icon === null)
            this.#getIcon();
        if (this.occupied)
        {
            this.#renderCells(ctx, this.posX, this.posY);
        }
        else
        {
            roundedRectPath(ctx, this.posX, this.posY, this.width, this.height, C.SLOT_RADIUS);
            ctx.globalAlpha = 0.5;
            ctx.fillStyle = this.disabled ? C.disabledCellColor : this.displayColor;
            ctx.fill();
            ctx.globalAlpha = 1.0;
            ctx.strokeStyle = "#000000";
            ctx.stroke();
        }
        if (this.#icon)
        {
            try
            {
                if (!this.occupied)
                    ctx.globalAlpha = 0.03;
                ctx.drawImage(this.#icon, this.posX, this.posY, this.width, this.height);
                ctx.globalAlpha = 1.0;
            }
            catch
            {
                this.#dontRequestImage = true;
            }
        }
    }

    /**
     * @param {CanvasRenderingContext2D} ctx
     * @param {number} x
     * @param {number} y
     */
    #renderCells(ctx, posX, posY)
    {
        for (var x = 0; x < this.sizeX; x++)
        {
            for (var y = 0; y < this.sizeY; y++)
            {
                roundedRectPath(ctx, posX + x * C.tileSize, posY + y * C.tileSize, C.tileSize, C.tileSize, C.SLOT_RADIUS);
                ctx.globalAlpha = 0.5;
                ctx.fillStyle = this.occupied ? C.occupiedCellColor : this.displayColor;
                ctx.fill();
                ctx.globalAlpha = 1.0;
                ctx.strokeStyle = "#000000";
                ctx.stroke();
            }
        }
    }
}