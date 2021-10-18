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

namespace UCWebsite.Controllers
{
    public class LoadoutsController : Controller
    {
        // GET: Loadouts
        public ActionResult Editor()
        {
            Debug.WriteLine("Requesting Editor");
            return View();
        }
        [HttpPost]
        public async Task<JsonResult> GetKit(string kitName)
        {
            Debug.WriteLine("Requesting kit: " + kitName);
            NetTask.Response response = await RequestKit.Request(ReceiveKit, Program.NetClient.connection, kitName);
            if (response.Responded)
            {
                if (response.Parameters.Length > 0)
                    return Json(PostResponse.As<Kit>(response.Parameters[0]));
                return Json(PostResponse.NULL);
            }
            return Json(PostResponse.NULL);
        }
        [HttpPost]
        public async Task<JsonResult> GetItems()
        {
            NetTask.Response response = await RequestAllItemInfos.Request(ReceiveKit, Program.NetClient.connection);
            if (response.Responded)
            {
                if (response.Parameters.Length > 0)
                    return Json(PostResponse.As<ItemData[]>(response.Parameters[0]));
                return Json(PostResponse.NULL);
            }
            return Json(PostResponse.NULL);
        }
        [HttpPost]
        public async Task<JsonResult> GetItem(ushort item)
        {
            NetTask.Response response = await RequestItemInfo.Request(SendItemInfo, Program.NetClient.connection, item);
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
        internal static void ReceiveItemInfo(in IConnection connection, ItemData data) { }
        internal static readonly NetCall<ushort[]> RequestItemInfos = new NetCall<ushort[]>(1121);
        internal static readonly NetCallRaw<ItemData[]> SendItemInfos = new NetCallRaw<ItemData[]>(1122, ItemData.ReadMany, ItemData.WriteMany);
        [NetCall(ENetCall.FROM_SERVER, 1122)]
        internal static void ReceiveItemInfos(in IConnection connection, ItemData[] data) { }
        internal static readonly NetCall RequestAllItemInfos = new NetCall(1123);
    }
}
namespace UCWebsite
{
    public struct PostResponse
    {
        public static readonly PostResponse NULL = new PostResponse(false, null);
        public bool Success;
        public object State;
        [JsonConstructor]
        public PostResponse(bool success, object state)
        {
            Success = success;
            State = state;
        }
        public static PostResponse As<T>(object state) where T : class
        {
            if (state is T o)
                return new PostResponse(true, o);
            else return NULL;
        }
    }
}