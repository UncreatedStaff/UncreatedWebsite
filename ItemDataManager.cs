using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using System.Web;
using Uncreated.Warfare;
using Uncreated.Networking;
using Uncreated.Website.Controllers;

namespace Uncreated.Website
{
    public static class ItemDataManager
    {
        public static Dictionary<ushort, ItemData> ItemRegistry = new Dictionary<ushort, ItemData>();
        public static async Task<ItemData> GetItem(ushort ID)
        {
            lock (ItemRegistry)
            {
                if (ItemRegistry.TryGetValue(ID, out ItemData itemData))
                    return itemData;
            }
            NetTask.Response response = await LoadoutsController.RequestItemInfo.Request(LoadoutsController.SendItemInfo, Program.NetClient.connection, ID, 10000);
            if (response.Responded && response.Parameters.Length > 0 && response.Parameters[0] is ItemData data)
                return data;
            else 
                return null;
        }
        public static async Task<ItemData[]> GetKitItems(Kit kit)
        {
            List<ushort> items = new List<ushort>(kit.Items.Count + kit.Clothes.Count + 20);
            for (int i = 0; i < kit.Clothes.Count; i++)
                if (!items.Contains(kit.Clothes[i].ID)) items.Add(kit.Clothes[i].ID);
            for (int i = 0; i < kit.Items.Count; i++)
            {
                if (!items.Contains(kit.Items[i].ID)) items.Add(kit.Items[i].ID);
                ushort[] attachments = GetAttachments(Convert.FromBase64String(kit.Items[i].metadata));
                for (int a = 0; a < attachments.Length; a++)
                    if (!items.Contains(attachments[a])) items.Add(attachments[a]);
            }
            List<ushort> toRequest = new List<ushort>(items.Count);
            ItemData[] rtn = new ItemData[items.Count];
            int pos = 0;
            lock (ItemRegistry)
            {
                for (int i = 0; i < items.Count; i++)
                {
                    if (ItemRegistry.TryGetValue(items[i], out ItemData data))
                    {
                        rtn[pos] = data;
                        pos++;
                    }
                    else
                    {
                        toRequest.Add(items[i]);
                    }
                }
            }
            if (toRequest.Count > 0)
            {
                NetTask.Response response = await LoadoutsController.RequestItemInfos.Request(
                    LoadoutsController.SendItemInfos, Program.NetClient.connection, toRequest.ToArray(), 30000);
                if (response.Responded && response.Parameters.Length > 0 && response.Parameters[0] is ItemData[] arr)
                {
                    int i = 0;
                    while (pos < items.Count && i < arr.Length)
                    {
                        rtn[pos] = arr[i];
                        i++;
                        pos++;
                    }
                    return rtn;
                } 
                else
                {
                    ItemData[] temp = rtn;
                    rtn = new ItemData[pos];
                    Array.Copy(temp, 0, rtn, 0, pos);
                    return rtn;
                }
            }
            else
            {
                return rtn;
            }
        }
        private static ushort[] GetAttachments(byte[] metadata)
        {
            if (metadata.Length == 18)
            {
                ushort[] items = new ushort[5];
                for (int i = 0; i < 5; i++)
                {
                    items[i] = BitConverter.ToUInt16(metadata, i * 2);
                }
                return items;
            }
            else return new ushort[0];
        }
    }
}