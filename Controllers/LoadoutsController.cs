using Newtonsoft.Json;
using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Linq;
using System.Threading.Tasks;
using System.Web;
using System.Web.Mvc;
using Uncreated;
using Uncreated.Networking;
using Uncreated.Warfare;

namespace Uncreated.Website.Controllers
{
    public class LoadoutsController : Controller
    {
        // GET: Loadouts
        public ActionResult Editor()
        {
            return View();
        }
        [HttpPost]
        public async Task<JsonResult> GetKit(string kitName)
        {
            NetTask.Response response = await RequestKit.Request(ReceiveKit, Program.NetClient.connection, kitName, 10000);
            if (response.Responded && response.Parameters.Length > 0 && response.Parameters[0] is Kit kit)
                return Json(PostResponse.As(new KitData(kit)));//(await ItemDataManager.GetKitItems(kit), kit)));
            else return Json(PostResponse.NULL);
        }
        [HttpPost]
        public async Task<JsonResult> PingWarfare()
        {
            NetTask.Response response = await SharedInvocations.RequestPingConnection
                .Request(SharedInvocations.RespondPingConnection, Program.NetClient.connection, "ucwarfare", 1000);
            if (response.Responded && response.Parameters.Length > 0 && response.Parameters[0] is bool status)
                return Json(status ? PostResponse.As(true) : new PostResponse(false, false));
            else return Json(PostResponse.NULL);
        }
        [HttpPost]
        public async Task<JsonResult> RequestStartupData()
        {
            if (ItemDataManager.ItemRegistry.Count > 0)
                return Json(PostResponse.As(new StartupData(ItemDataManager.ItemRegistry.Values.ToArray())));
            else
            {
                NetTask.Response response = await RequestAllItemInfos.Request(SendItemInfos, Program.NetClient.connection, 30000);
                if (response.Responded && response.Parameters.Length > 0 && response.Parameters[0] is ItemData[] arr)
                    return Json(PostResponse.As(new StartupData(arr)));
                return Json(PostResponse.NULL);
            }
        }
        [HttpPost]
        public async Task<JsonResult> GetItems()
        {
            NetTask.Response response = await RequestAllItemInfos.Request(SendItemInfos, Program.NetClient.connection, 60000);
            if (response.Responded && response.Parameters.Length > 0)
                return Json(PostResponse.As<ItemData[]>(response.Parameters[0]));
            return Json(PostResponse.NULL);
        }
        [HttpPost]
        public async Task<JsonResult> GetItem(ushort item)
        {
            NetTask.Response response = await RequestItemInfo.Request(SendItemInfo, Program.NetClient.connection, item, 10000);
            Debug.WriteLine(response.Responded);
            if (response.Responded)
            {
                if (response.Parameters.Length > 0)
                    return Json(PostResponse.As<ItemData>(response.Parameters[0]));
                return Json(PostResponse.NULL);
            }
            return Json(PostResponse.NULL);
        }
        [HttpPost]
        public async Task<JsonResult> GetKits(string[] kitNames)
        {
            Debug.WriteLine("Requesting kits: " + string.Join(", ", kitNames));
            NetTask.Response response = await RequestKits.Request(ReceiveKits, Program.NetClient.connection, kitNames);
            if (response.Responded)
            {
                if (response.Parameters.Length > 0)
                    return Json(PostResponse.As<Kit[]>(response.Parameters[0]));
                return Json(PostResponse.NULL);
            }
            return Json(PostResponse.NULL);
        }

        internal static readonly NetCall<string> RequestKit = new NetCall<string>(2100);
        internal static readonly NetCall<string[]> RequestKits = new NetCall<string[]>(2101);
        internal static readonly NetCallRaw<Kit> ReceiveKit = new NetCallRaw<Kit>(2102, Kit.Read, Kit.Write);
        [NetCall(ENetCall.FROM_SERVER, 2102)]
        internal static void ReceiveKitExec(in IConnection connection, Kit data) { }
        internal static readonly NetCallRaw<Kit[]> ReceiveKits = new NetCallRaw<Kit[]>(2103, Kit.ReadMany, Kit.WriteMany);
        [NetCall(ENetCall.FROM_SERVER, 2103)]
        internal static void ReceiveKitsExec(in IConnection connection, Kit[] data) { }


        internal static readonly NetCall<ushort> RequestItemInfo = new NetCall<ushort>(1119);
        internal static readonly NetCallRaw<ItemData> SendItemInfo = new NetCallRaw<ItemData>(1120, ItemData.Read, ItemData.Write);
        [NetCall(ENetCall.FROM_SERVER, 1120)]
        internal static void ReceiveItemInfo(in IConnection connection, ItemData data)
        {
            if (data == null) return;
            lock (ItemDataManager.ItemRegistry)
            {
                if (ItemDataManager.ItemRegistry.ContainsKey(data.ItemID))
                    ItemDataManager.ItemRegistry[data.ItemID] = data;
                else ItemDataManager.ItemRegistry.Add(data.ItemID, data);
            }
        }
        internal static readonly NetCall<ushort[]> RequestItemInfos = new NetCall<ushort[]>(1121);
        internal static readonly NetCallRaw<ItemData[]> SendItemInfos = new NetCallRaw<ItemData[]>(1122, ItemData.ReadMany, ItemData.WriteMany);
        [NetCall(ENetCall.FROM_SERVER, 1122)]
        internal static void ReceiveItemInfos(in IConnection connection, ItemData[] data) 
        {
            lock(ItemDataManager.ItemRegistry)
            {
                for (int i = 0; i < data.Length; i++)
                {
                    if (data[i] == null) continue;
                    if (ItemDataManager.ItemRegistry.ContainsKey(data[i].ItemID))
                        ItemDataManager.ItemRegistry[data[i].ItemID] = data[i];
                    else ItemDataManager.ItemRegistry.Add(data[i].ItemID, data[i]);
                }
            }
        }
        internal static readonly NetCall RequestAllItemInfos = new NetCall(1123);
    }
}