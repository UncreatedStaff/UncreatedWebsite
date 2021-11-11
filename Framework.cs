using Newtonsoft.Json;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;
using Uncreated.Networking.Encoding.IO;
using Uncreated.Warfare;

namespace Uncreated.Website
{
    public struct PostResponse
    {
        public static readonly PostResponse NULL = new PostResponse(false, null);
        public bool Success;
        public object State;
        [JsonConstructor]
        public PostResponse(bool Success, object State)
        {
            this.Success = Success;
            this.State = State;
        }
        public static PostResponse As<T>(object state)
        {
            if (state is T o)
                return new PostResponse(true, o);
            else return NULL;
        }
        public static PostResponse As<T>(T state)
        {
            return new PostResponse(true, state);
        }
    }
    public struct KitData
    {
        //public ItemData[] ItemData;
        public JSKitData Kit;
        [JsonConstructor]
        public KitData(Kit kit)
        {
            this.Kit = new JSKitData(kit);
        }
    }
    public struct StartupData
    {
        public ItemData[] items;

        public StartupData(ItemData[] items)
        {
            this.items = items;
        }
    }
    public struct JSKitData
    {
        public readonly string Name;
        public readonly EClass Class;
        public readonly EBranch Branch;
        public readonly ulong Team;
        public readonly ushort Cost;
        public readonly ushort RequiredLevel;
        public readonly ushort TicketCost;
        public readonly bool IsPremium;
        public readonly float PremiumCost;
        public readonly bool IsLoadout;
        public readonly float TeamLimit;
        public readonly float Cooldown;
        public readonly bool ShouldClearInventory;
        public readonly JSKitItem[] Items;
        public readonly JSKitClothing[] Clothes;
        public readonly ulong[] AllowedUsers;
        public JSKitData(Kit k)
        {
            this.Name = k.Name;
            this.Class = k.Class;
            this.Branch = k.Branch;
            this.Team = k.Team;
            this.Cost = k.Cost;
            this.RequiredLevel = k.RequiredLevel;
            this.TicketCost = k.TicketCost;
            this.IsPremium = k.IsPremium;
            this.PremiumCost = k.PremiumCost;
            this.IsLoadout = k.IsLoadout;
            this.TeamLimit = k.TeamLimit;
            this.Cooldown = k.Cooldown;
            this.ShouldClearInventory = k.ShouldClearInventory;
            this.Items = new JSKitItem[k.Items.Count];
            for (int i = 0; i < k.Items.Count; i++)
                this.Items[i] = new JSKitItem(k.Items[i]);
            this.Clothes = new JSKitClothing[k.Clothes.Count];
            for (int i = 0; i < k.Clothes.Count; i++)
                this.Clothes[i] = new JSKitClothing(k.Clothes[i]);
            this.AllowedUsers = k.AllowedUsers.ToArray();
        }
    }
    public struct JSKitItem
    {
        public readonly ushort ID;
        public readonly byte x;
        public readonly byte y;
        public readonly byte rotation;
        public readonly byte quality;
        public readonly string metadata;
        public readonly byte amount;
        public readonly byte page;
        public JSKitItem(KitItem i)
        {
            this.ID = i.ID;
            this.x = i.x;
            this.y = i.y;
            this.rotation = i.rotation;
            this.quality = i.quality;
            this.metadata = System.Text.Encoding.ASCII.GetString(Convert.FromBase64String(i.metadata));
            this.amount = i.amount;
            this.page = i.page;
        }
    }
    public struct JSKitClothing
    {
        public readonly ushort ID;
        public readonly byte quality;
        public readonly string metadata;
        public readonly EClothingType type;
        public JSKitClothing(KitClothing c)
        {
            this.ID = c.ID;
            this.quality = c.quality;
            this.metadata = System.Text.Encoding.ASCII.GetString(Convert.FromBase64String(c.state));
            this.type = c.type;
        }
    }
    public class CachedRegistry : Dictionary<ushort, ItemData>
    {
        public static readonly string STORAGE_LOCATION = Environment.GetEnvironmentVariable("APPDATA") + @"\Uncreated\ASP\DataCache\Items\";
        private static readonly RawByteIO<ItemData> IO = new RawByteIO<ItemData>(ItemData.Read, ItemData.Write, null);
        public CachedRegistry() : base() 
        {
            if (!System.IO.Directory.Exists(STORAGE_LOCATION))
                System.IO.Directory.CreateDirectory(STORAGE_LOCATION);
        }
        public new void Add(ushort ID, ItemData data)
        {
            if (data == null) return;
            base.Add(ID, data);
            CacheItem(data);
        }
        public void AddOrUpdate(ushort ID, ItemData data)
        {
            if (data == null) return;
            if (ContainsKey(ID))
                this[ID] = data;
            else 
                base.Add(ID, data);
            CacheItem(data);
        }
        private void CacheItem(ItemData data)
        {
            IO.WriteTo(data, STORAGE_LOCATION + data.ItemID.ToString() + ".dat");
        }
        public ItemData GetItemData(ushort ID)
        {
            if (TryGetValue(ID, out ItemData rtn)) return rtn;
            if (IO.ReadFrom(STORAGE_LOCATION + ID.ToString() + ".dat", out rtn))
                Add(ID, rtn);
            return rtn;
        }
    }
}