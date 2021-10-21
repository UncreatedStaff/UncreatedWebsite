using Newtonsoft.Json;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;
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
}