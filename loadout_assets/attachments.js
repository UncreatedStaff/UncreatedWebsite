import { NotImplementedException, Radius, TextMeasurement, roundedRectPath, onImageLoad, getScale, roundedRect, CenteredTextData, WebImage, getData } from "./util.js";
import { PAGES, Program, PAGEORDER } from "./editor.js";
import * as C from "./const.js";

const blacklistedAttachments = [ 38335, 1301, 354, 350, 117 ];
const unpicturedAttachments = [ 1301, 354, 350, 117, 1167, 1002 ];

const lockedItems = [ 
    {
        id: 355,
        locked: [ "barrel" ]
    },
    {
        id: 353,
        locked: [ "barrel" ]
    },
    {
        id: 356,
        locked: [ "barrel" ]
    },
    {
        id: 357,
        locked: [ "barrel" ]
    },
    {
        id: 346,
        locked: [ "barrel" ]
    },
    {
        id: 116,
        locked: [ "barrel" ]
    }
];
const byteMax = 0b11111111;
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
     * @property {number} DefaultTactical
     * @property {number} UnloadStepTime
     * @property {number} ReloadStepTime
     * @property {boolean} HasSight
     * @property {boolean} HasTactical
     * @property {boolean} HasGrip
     * @property {boolean} HasBarrel
     * 
     * @typedef {import("./editor.js").ItemData & _gun} GunData
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
     * @typedef {import("./editor.js").ItemData & _attachment} AttachmentData
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
    /** @type {import("./page.js").Item} */
    item;
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
    tileSize;
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
    /** @type {WebImage} */
    #preview;
    /** @type {ItemSlot[]} */
    #slots;
    /** @type {number} */
    #text;
    /** @type {number} */
    defaultSight;
    /** @type {number} */
    itemDistance;
    /** @type {number} */
    #panelX;
    /** @type {number} */
    #panelY;
    /** @type {number} */
    #panelWidth;
    /** @type {number} */
    #panelHeight;
    /** @type {Radius} */
    #panelRadius;
    /** @type {DataPanel} */
    #panel;
    constructor()
    {
        this.#preview = new WebImage();
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
        this.defaultSight = 0;
        this.itemDistance = 120;
        this.tileSize = C.tileSize;
        this.#panelRadius = new Radius(12);
        this.#panel = new DataPanel(this.itemData, this);
    }
    invalidatePreview()
    {
        if (this.itemData)
        {
            var id = this.path;
            this.#preview.replace(id, C.attachmentIconPrefix + id + ".png", 
                this.itemData.SizeX * C.attachmentIconSizeMult, this.itemData.SizeY * C.attachmentIconSizeMult);
        }
        else
            this.#preview.replace();
    }
    close()
    {
        this.loadItem(undefined);
    }
    /**
     * Loads an item.
     * @param {import("./page.js").Item} itemData 
     */
    loadItem(itemData)
    {
        var wasOpen = this.isOpen;
        this.isOpen = itemData !== undefined;
        if (this.isOpen)
        {
            this.itemData = itemData.item;
            this.item = itemData;
            for (var i = 0; i < this.#slots.length; i++)
            {
                this.#slots[i].locked = false;
                switch (this.#slots[i].type)
                {
                    case "sight":
                        this.#slots[i].locked = !this.itemData.HasSight;
                        break;
                    case "tactical":
                        this.#slots[i].locked = !this.itemData.HasTactical;
                        break;
                    case "grip":
                        this.#slots[i].locked = !this.itemData.HasGrip;
                        break;
                    case "barrel":
                        this.#slots[i].locked = !this.itemData.HasBarrel;
                        break;
                }
                if (!this.#slots[i].locked)
                {
                    this.#slots[i].middle.displayColor = C.defaultCellColor;
                    for (var l = 0; l < lockedItems.length; l++)
                    {
                        if (this.itemData.ItemID === lockedItems[i].id)
                        {
                            if (lockedItems[l].locked.includes(this.#slots[i].type)) 
                            {
                                this.#slots[i].locked = true;
                                this.#slots[i].middle.displayColor = C.lockedCellColor;
                            }
                            break;
                        }
                    }
                }
                else this.#slots[i].middle.displayColor = C.lockedCellColor;
            }
            this.defaultSight = itemData.state[0] | (itemData.state[1] << 8);
            if (!this.isValid(this.defaultSight)) this.defaultSight = this.itemData.DefaultSight;
            this.updateAttachments(this.defaultSight);
            this.sight = this.defaultSight;
            this.tactical = itemData.state[2] | (itemData.state[3] << 8);
            if (!this.isValid(this.tactical)) this.tactical = this.itemData.DefaultTactical;
            this.grip = itemData.state[4] | (itemData.state[5] << 8);
            if (!this.isValid(this.grip)) this.grip = this.itemData.DefaultGrip;
            this.barrel = itemData.state[6] | (itemData.state[7] << 8);
            if (!this.isValid(this.barrel)) this.barrel = this.itemData.DefaultBarrel;
            this.magazine = itemData.state[8] | (itemData.state[9] << 8);
            if (!this.isValid(this.magazine)) this.magazine = this.itemData.DefaultMagazine;
            this.#loadSettings();
        }
        else if (wasOpen)
        {
            var firerate = (this.itemData.FireRates & 0b1000 ? 2 : (this.itemData.FireRates & 0b0100 ? 3 : (this.itemData.FireRates & 0b0010 ? 1 : 0)));
            var state = new Uint8Array([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, firerate, 0, 100, 100, 100, 100, 100]);
            if (this.sight && this.sight > 0)
            {
                state[0] = this.sight & byteMax;
                state[1] = (this.sight >> 8) & byteMax;
            }
            if (this.tactical && this.tactical > 0)
            {
                state[2] = this.tactical & byteMax;
                state[3] = (this.tactical >> 8) & byteMax;
            }
            if (this.grip && this.grip > 0)
            {
                state[4] = this.grip & byteMax;
                state[5] = (this.grip >> 8) & byteMax;
            }
            if (this.barrel && this.barrel > 0)
            {
                state[6] = this.barrel & byteMax;
                state[7] = (this.barrel >> 8) & byteMax;
            }
            if (this.magazine && this.magazine > 0)
            {
                state[8] = this.magazine & byteMax;
                state[9] = (this.magazine >> 8) & byteMax;
            }
            if (this.magazine && this.magazine > 0)
            {
                for (var i = 0; i < Program.DATA.items.length; i++)
                {
                    if (Program.DATA.items[i].ItemID === this.magazine)
                    {
                        state[10] = Program.DATA.items[i].Amount & byteMax;
                        break;
                    }
                }
            }
            if (this.tactical && this.tactical > 0)
            {
                for (var i = 0; i < Program.DATA.items.length; i++)
                {
                    if (Program.DATA.items[i].ItemID === this.magazine)
                    {
                        /** @type {TacticalData} */
                        var b = Program.DATA.items[i];
                        state[12] = (b.Laser || b.Light || b.Rangefinder) & byteMax;
                        break;
                    }
                }
            }
            this.item.setAttachments(state, this.#preview.failed ? undefined : this.#preview.id, this.#preview.source);
            this.item = undefined;
            this.itemData = undefined;
        }
        this.updateDims();
    }
    #loadSettings()
    {
        for (var i = 0; i < this.#slots.length; i++)
        {
            this.#slots[i].loadFrom();
        }
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
            if ((item.Name.includes("Iron_Sight") && item.ItemID !== defaultSight) || 
            (blacklistedAttachments.includes(item.ItemID) && this.itemData && 
            ![this.itemData.DefaultSight, this.itemData.DefaultTactical, 
                this.itemData.DefaultGrip, this.itemData.DefaultBarrel, 
                this.itemData.DefaultMagazine].includes(item.ItemID))) continue;
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
        if (!this.#slots[0].locked)
            this.#slots[0].loadItems(this.availableSights);
        if (!this.#slots[1].locked)
            this.#slots[1].loadItems(this.availableTacticals);
        if (!this.#slots[2].locked)
            this.#slots[2].loadItems(this.availableGrips);
        if (!this.#slots[3].locked)
            this.#slots[3].loadItems(this.availableBarrels);
        if (!this.#slots[4].locked)
            this.#slots[4].loadItems(this.availableMagazines);
    }

    /** @type {string}*/
    get path()
    {
        var sight = (this.sight != undefined && !unpicturedAttachments.includes(this.sight) ? this.sight : 0).toString();
        var tactical = (this.tactical != undefined && !unpicturedAttachments.includes(this.tactical) ? this.tactical : 0).toString();
        var grip = (this.grip != undefined && !unpicturedAttachments.includes(this.grip) ? this.grip : 0).toString();
        var barrel = (this.barrel != undefined && !unpicturedAttachments.includes(this.barrel) ? this.barrel : 0).toString();
        var magazine = (this.magazine != undefined && !unpicturedAttachments.includes(this.magazine) ? this.magazine : 0).toString();
        return `${this.itemData.ItemID.toString()}/${sight}_${tactical}_${grip}_${barrel}_${magazine}`;
    }
    updateDims()
    {
        if (!this.itemData) return;
        this.tileSize = Program.canvas.width / 64;
        this.#panelX = Program.canvas.width / 8;
        this.#panelY = Program.canvas.height / 8;
        this.#panelWidth = Program.canvas.width * 0.75;
        this.#panelHeight = Program.canvas.height * 0.35;
        var scale = getScale(this.#panelWidth / 3, this.#panelHeight / 3, this.itemData.SizeX, this.itemData.SizeY);
        this.#previewSizeX = this.itemData.SizeX * scale;
        this.#previewSizeY = this.itemData.SizeY * scale;
        this.#previewPosX = this.#panelX + 16;
        this.#previewPosY = this.#panelY + 16;
        this.#cellSize = scale;
        if (this.#previewPosY < 5) this.#previewPosY = 5;
        var ht = Program.canvas.height * 2.25 / 3;
        this.itemDistance = Program.canvas.width / (12 * C.itemDistanceMultiplier);
        for (var i = 0; i < this.#slots.length; i++)
        {
            var slot = this.#slots[i];
            slot.posX = Program.canvas.width / 6 * (i + 1);
            slot.posY = ht;
            slot.updateDims();
        }
        Program.context.font = "bold " + (this.itemData.SizeX * C.attachmentPreviewUnavailableSize).toString() + "px Segoe UI";
        this.#text = CenteredTextData.centerTextHeight(Program.context, "Preview Unavailable", this.#previewSizeY, C.attachmentPreviewUnavailableSize);
        this.#panel.updateDims(this.#previewPosX, this.#previewPosY, this.#previewSizeX, this.#previewSizeY, this.#panelX, this.#panelY, this.#panelWidth, this.#panelHeight);
    }
    /**
     * @param {CanvasRenderingContext2D} ctx Rendering Context
     */
    render(ctx)
    {
        Program.clearCanvas();
        if (this.itemData)
        {
            roundedRectPath(ctx, this.#panelX, this.#panelY, this.#panelWidth, this.#panelHeight, this.#panelRadius);
            ctx.globalAlpha = 0.2;
            ctx.fillStyle = C.defaultCellColor;
            ctx.fill();
            ctx.globalAlpha = 1.0;
            ctx.strokeStyle = "#000000";
            ctx.stroke();
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
            if (this.#preview.failed || !this.#preview.draw(ctx, this.#previewPosX, this.#previewPosY, this.#previewSizeX, this.#previewSizeY))
            {
                ctx.font = "bold " + (this.itemData.SizeX * C.attachmentPreviewUnavailableSize).toString() + "px Segoe UI";
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
    /** @type {boolean} */
    locked;
    /** @type {AttachmentData[]} */
    items;
    /** @type {number} */
    posX;
    /** @type {number} */
    posY;
    /** @type {number} */
    itemDistance;
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
        this.middle = new ItemIcon(this, true);
        this.icons = [];
        this.items = [];
        this.locked = false;
        this.middle.load(this.type);
    }
    updateDims()
    {
        var angleDif = 2 * Math.PI / (this.icons.length === 0 ? 1 : this.icons.length);
        this.middle.width = 2 * this.owner.tileSize;
        this.middle.height = 2 * this.owner.tileSize;
        this.middle.posX = this.posX - this.owner.tileSize;
        this.middle.posY = this.posY - this.owner.tileSize;
        if (!this.locked)
        {
            for (var i = 0; i < this.icons.length; i++)
            {
                this.icons[i].width = this.icons[i].sizeX * this.owner.tileSize;
                this.icons[i].height = this.icons[i].sizeY * this.owner.tileSize;
                this.icons[i].posX = this.posX + (Math.cos(ItemSlot.clampRad(Math.PI * 3 / 2 + i * angleDif)) * this.owner.itemDistance) - this.icons[i].width / 2;
                this.icons[i].posY = this.posY + (Math.sin(ItemSlot.clampRad(Math.PI * 3 / 2 + i * angleDif)) * this.owner.itemDistance) - this.icons[i].height / 2;
            }
        }
    }
    /**
     * Clamp between 0 and 2PI
     * @param {number} rad 
     */
    static clampRad(rad)
    {
        return rad % (2 * Math.PI);
    }
    /**
     * @param {CanvasRenderingContext2D} ctx 
     */
    render(ctx)
    {
        if (!this.locked)
        {
            for (var i = 0; i < this.icons.length; i++)
            {
                ctx.beginPath();
                ctx.moveTo(this.posX, this.posY);
                ctx.lineTo(this.icons[i].posX + this.icons[i].width / 2, this.icons[i].posY + this.icons[i].height / 2);
                ctx.strokeStyle = this.icons[i].disabled ? "#999999" : "#191919";
                ctx.lineWidth = this.icons[i].disabled ? Program.canvas.width / 426 : 0.5;
                ctx.stroke();
                ctx.lineWidth = 1;
                this.icons[i].render(ctx);
            }
        }
        this.middle.render(ctx);
    }
    /**
     * @param {AttachmentData[]} items
     */
    loadItems(items)
    {
        this.items = items;
        this.middle.load(this.type);
        if (this.locked) return;
        var i = 0;
        for (; i < this.items.length; i++)
        {
            var item = this.icons[i];
            if (!item)
            {
                item = new ItemIcon(this, false);
                item.type = this.type;
            }
            item.index = i;
            item.load(items[i]);
            item.disabled = false;
            this.icons.push(item);
        }
        if (this.icons.length > i)
            this.icons.splice(i);
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
            this.middle.displayColor = this.locked ? C.lockedCellColor : C.defaultCellColor;;
            this.middle.hovered = false;
            Program.moveConsumed = true;
            Program.invalidate();
        }
        if (this.locked) return;
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
                icon.displayColor = C.defaultCellColor;;
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
                this.middle.load(this.type);
                this.middle.index = -1;
            }
        }
        else
        {
            for (var item = 0; item < Program.DATA.items.length; item++)
            {
                if (Program.DATA.items[item].ItemID === val)
                {
                    var index = -1;
                    for (; index < this.items.length; index++)
                        if (index != -1 && this.items[index].ItemID === val)
                            break;
                    if (index === -1)
                    {
                        index = this.items.length;
                        this.items.push(Program.DATA.items[item]);
                        var icon = new ItemIcon(this, false);
                        icon.index = index;
                        icon.type = this.type;
                        icon.disabled = true;
                        icon.load(Program.DATA.items[item]);
                        this.icons.push(icon);
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
                    this.middle.index = index;
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
        if (this.locked) return;
        if (x > this.middle.posX && x < this.middle.posX + this.middle.width && y > this.middle.posY && y < this.middle.posY + this.middle.height)
        {
            if (this.middle.index === -1) return;
            for (var i = 0; i < this.icons.length; i++)
            {
                if (this.middle.index === this.icons[i].index)
                {
                    this.icons[i].disabled = false;
                    break;
                }
            }
            this.middle.index = -1;
            this.#setType(undefined);
            this.middle.load(this.type);
            Program.mouseBtn1Consumed = true;
            return true;
        }
        for (var i = 0; i < this.icons.length; i++)
        {
            var icon = this.icons[i];
            if (x > icon.posX && x < icon.posX + icon.width && y > icon.posY && y < icon.posY + icon.height)
            {
                for (var i = 0; i < this.icons.length; i++)
                {
                    if (this.middle.index === this.icons[i].index)
                    {
                        this.icons[i].disabled = false;
                        break;
                    }
                }
                var it = this.items[icon.index] ?? this.type;
                this.middle.index = icon.index;
                this.#setType(it.ItemID);
                this.middle.load(it);
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
    /** @type {number} */
    index;
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
    disabled;
    /** @type {boolean} */
    occupied;
    /** @type {string} */
    displayColor;
    /** @type {boolean} */
    hovered;
    /** @type {boolean} */
    useBestFit;
    /** @type {WebImage} */
    webImage;
    /**
     * @param {ItemSlot} owner
     * @param {boolean} middle
     */
    constructor(owner, middle)
    {
        this.#owner = owner;
        this.sizeX = 2;
        this.sizeY = 2;
        this.posX = 0;
        this.posY = 0;
        this.width = this.#owner.owner.tileSize * 2;
        this.height = this.#owner.owner.tileSize * 2;
        this.displayColor = this.#owner.locked ? C.lockedCellColor : C.defaultCellColor;
        this.hovered = false;
        this.index = 0;
        this.disabled = false;
        this.useBestFit = middle;
        this.webImage = new WebImage();
    }
    /**
     * @param {string | import("./editor.js").ItemData} itemData item data or (grip | barrel | tactical | sight | magazine)
     */
    load(itemData)
    {
        if (itemData === undefined)
        {
            this.sizeX = 2;
            this.sizeY = 2;
            this.webImage.replace(undefined, undefined, this.sizeX * imgSize, this.sizeY * imgSize);
            if (!this.useBestFit)
            {
                this.width = this.#owner.owner.tileSize * 2;
                this.height = this.#owner.owner.tileSize * 2;
            }
            this.occupied = false;
        }
        else if (typeof itemData === 'string')
        {
            this.sizeX = 2;
            this.sizeY = 2;
            if (!this.useBestFit)
            {
                this.width = this.#owner.owner.tileSize * 2;
                this.height = this.#owner.owner.tileSize * 2;
            }
            this.occupied = false;
            switch (itemData)
            {
                case "grip":
                    this.webImage.replace(PAGES.C_GRIP, C.statIconPrefix + "grip.svg", this.sizeX * imgSize, this.sizeY * imgSize);
                    break;
                case "barrel":
                    this.webImage.replace(PAGES.C_BARREL, C.statIconPrefix + "barrel.svg", this.sizeX * imgSize, this.sizeY * imgSize);
                    break;
                case "tactical":
                    this.webImage.replace(PAGES.C_TACTICAL, C.statIconPrefix + "tactical.svg", this.sizeX * imgSize, this.sizeY * imgSize);
                    break;
                case "sight":
                    this.webImage.replace(PAGES.C_SIGHT, C.statIconPrefix + "sight.svg", this.sizeX * imgSize, this.sizeY * imgSize);
                    break;
                case "magazine":
                    this.webImage.replace(PAGES.C_MAGAZINE, C.statIconPrefix + "ammo.svg", this.sizeX * imgSize, this.sizeY * imgSize);
                    break;
                default:
                    this.webImage.replace(undefined, undefined, this.sizeX * imgSize, this.sizeY * imgSize);
                    break;
            }
        }
        else if (itemData.ItemID)
        {
            this.sizeX = itemData.SizeX;
            this.sizeY = itemData.SizeY;
            this.webImage.replace(itemData.ItemID, C.itemIconPrefix + itemData.ItemID.toString() + (Program.webp ? ".webp" : ".png"),
                this.sizeX * imgSize, this.sizeY * imgSize);
            if (!this.useBestFit)
            {
                this.width = this.#owner.owner.tileSize * this.sizeX;
                this.height = this.#owner.owner.tileSize * this.sizeY;
            }
            this.occupied = true;
        }
        else
        {
            this.sizeX = 2;
            this.sizeY = 2;
            this.webImage.replace(undefined, undefined, this.sizeX * imgSize, this.sizeY * imgSize);
            if (!this.useBestFit)
            {
                this.width = this.#owner.owner.tileSize * 2;
                this.height = this.#owner.owner.tileSize * 2;
            }
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
        if (this.occupied && !this.useBestFit)
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
        if (!this.webImage.failed)
        {
            var w = this.width;
            var h = this.height
            var x = this.posX;
            var y = this.posY;
            if (!this.occupied)
                ctx.globalAlpha = 0.03;
            else if (this.useBestFit)
            {
                let scale = getScale(this.width, this.height, this.sizeX, this.sizeY);
                w = this.sizeX * scale;
                h = this.sizeY * scale;
                x += (this.width - w) / 2;
                y += (this.height - h) / 2;
            }
            this.webImage.draw(ctx, x, y, w, h);
            ctx.globalAlpha = 1.0;
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
                roundedRectPath(ctx, posX + x * this.#owner.owner.tileSize, posY + y * this.#owner.owner.tileSize, this.#owner.owner.tileSize, this.#owner.owner.tileSize, C.SLOT_RADIUS);
                ctx.globalAlpha = 0.5;
                ctx.fillStyle = this.disabled ? C.disabledCellColor : this.displayColor;
                ctx.fill();
                ctx.globalAlpha = 1.0;
                ctx.strokeStyle = "#000000";
                ctx.stroke();
            }
        }
    }
}
class DataPanel
{
    /** @type {import("./editor.js").ItemData}*/
    itemData;
    /** @type {AttachmentEditor}*/
    owner;
    /** @type {number}*/
    #picX;
    /** @type {number}*/
    #picY;
    /** @type {number}*/
    #picW;
    /** @type {number}*/
    #picH;
    /** @type {number}*/
    #posX;
    /** @type {number}*/
    #posY;
    /** @type {number}*/
    #width;
    /** @type {number}*/
    #height;
    /** @type {WebImage}*/
    #img;
    /** @type {SightData} */
    #sight;
    /** @type {TacticalData} */
    #tactical;
    /** @type {GripData} */
    #grip;
    /** @type {BarrelData} */
    #barrel;
    /** @type {MagazineData} */
    #magazine;
    /** @type {WebImage[]} */
    #allIcons;
    /** @type {SpreadGraph} */
    #recoil;
    /** @type {SpreadGraph} */
    #spread;
    /**
     * @param {import("./editor.js").ItemData} itemData
     * @param {AttachmentEditor} owner
     */
    constructor(itemData, owner)
    {
        this.itemData = itemData;
        this.owner = owner;
        this.#allIcons = 
        [ 
            new WebImage(PAGES.C_SIGHT, C.statIconPrefix + "sight.svg", 1024, 1024),
            new WebImage(PAGES.C_TACTICAL, C.statIconPrefix + "tactical.svg", 1024, 1024),
            new WebImage(PAGES.C_GRIP, C.statIconPrefix + "grip.svg", 1024, 1024),
            new WebImage(PAGES.C_BARREL, C.statIconPrefix + "barrel.svg", 1024, 1024),
            new WebImage(PAGES.C_MAGAZINE, C.statIconPrefix + "ammo.svg", 1024, 1024)
        ];
        for (var i = 0; i < this.#allIcons.length; i++)
            this.#allIcons[i].request();
    }

    updateDims(picX, picY, picW, picH, x, y, w, h)
    {
        this.#picX = picX;
        this.#picY = picY;
        this.#picW = picW;
        this.#picH = picH;
        this.#posX = x;
        this.#posY = y;
        this.#width = w;
        this.#height = h;
    }
    update()
    {
        this.#sight = getData(this.owner.sight);
        this.#tactical = getData(this.owner.tactical);
        this.#grip = getData(this.owner.grip);
        this.#barrel = getData(this.owner.barrel);
        this.#magazine = getData(this.owner.magazine);
        this.updateDims();
    }
    render(ctx)
    {

    }
}

/**
 * @typedef Point
 * @property {number} X
 * @property {number} Y
 */
class SpreadGraph
{
    /** @type {Point[]} */
    points;

    constructor()
    {

    }
}