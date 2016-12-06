using System;
using System.Collections.Generic;
using System.Drawing;
using System.Linq;
using System.Web;
using System.Web.Mvc;
using Newtonsoft.Json;
using Newtonsoft.Json.Serialization;
using static System.Web.Hosting.HostingEnvironment;

namespace PdfExtractor.Web.Controllers
{
    public class SettingsController : Controller
    {
        private string _settingsFilePath;

        public class Coord
        {
            public float X { get; set; }
            public float Y { get; set; }
        }

        public class DocumentInfo
        {
            public string Filename { get; set; }
            public Coord DataEntryPopupPosition { get; set; }
        }

        public class Settings
        {
            public string Name { get; set; }
            public List<DocumentInfo> Documents { get; set; }
        }
        private string SettingsFilePath
        {
            get {
                if (string.IsNullOrEmpty(_settingsFilePath))
                {
                    _settingsFilePath = MapPath("~/App_Data/Settings.json");
                }
                return _settingsFilePath;
            }
        }

        [HttpPost]
        public JsonResult Get()
        {
            var json = System.IO.File.ReadAllText(SettingsFilePath);

            var pt = JsonConvert.SerializeObject(new Coord{X = 100, Y = 200});

            var jss = new JsonSerializerSettings { ContractResolver = new CamelCasePropertyNamesContractResolver() };
            var settings = JsonConvert.DeserializeObject<Settings>(json, jss);

            var json2 = JsonConvert.SerializeObject(settings, Formatting.Indented, jss);


            return Json(json2);
        }

        [HttpPost]
        public void Set()
        {
            var jss = new JsonSerializerSettings { ContractResolver = new CamelCasePropertyNamesContractResolver() };
            var json = Request.Form[0];
            var settings = JsonConvert.DeserializeObject<Settings>(json, jss);
            var settingsStr = JsonConvert.SerializeObject(settings, Formatting.Indented, jss);

            System.IO.File.WriteAllText(SettingsFilePath, settingsStr);
        }
    }
}