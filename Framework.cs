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
        public Kit Kit;
        [JsonConstructor]
        public KitData(Kit kit)//(ItemData[] ItemData, Kit Kit)
        {
            //this.ItemData = ItemData;
            this.Kit = kit;
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