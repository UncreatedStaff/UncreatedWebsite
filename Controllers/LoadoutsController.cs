using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Linq;
using System.Web;
using System.Web.Mvc;

namespace UCWebsite.Controllers
{
    public class LoadoutsController : Controller
    {
        public static readonly Kit[] Kits = new Kit[]
        {
            new Kit() { Name = "usrif1", Team = 1 },
            new Kit() { Name = "usrif2", Team = 1 },
            new Kit() { Name = "usrif3", Team = 1 },
            new Kit() { Name = "rurif1", Team = 2 },
            new Kit() { Name = "rurif2", Team = 2 },
            new Kit() { Name = "rurif3", Team = 2 }
        };
        // GET: Loadouts
        public ActionResult Editor()
        {
            Debug.WriteLine("Requesting Editor");
            return View();
        }
        [HttpGet]
        public JsonResult GetKit(string kitName)
        {
            Debug.WriteLine("Requesting kit: " + kitName);
            return Json(Kits.FirstOrDefault(x => x.Name == kitName) ?? Kits[0]);
        }
        [HttpPost]
        public JsonResult GetKit(string kitName, int dummy = 0)
        {
            Debug.WriteLine("Requesting kit2: " + kitName);
            return Json(Kits.FirstOrDefault(x => x.Name == kitName) ?? Kits[0]);
        }
    }
}
namespace UCWebsite
{
    public class Kit
    {
        public string Name { get; set; }
        public ulong Team { get; set; }
    }
}