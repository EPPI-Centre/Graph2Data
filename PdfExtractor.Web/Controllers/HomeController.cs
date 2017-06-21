using System;
using System.Collections.Generic;
using System.Dynamic;
using System.IO;
using System.Linq;
using System.Text;
using System.Web;
using System.Web.Mvc;
using Microsoft.Azure; // Namespace for CloudConfigurationManager
using Microsoft.WindowsAzure.Storage; // Namespace for CloudStorageAccount
using Microsoft.WindowsAzure.Storage.Blob;
using Newtonsoft.Json;
// Namespace for Blob storage types
using Newtonsoft.Json.Linq;

namespace PdfExtractor.Web.Controllers
{
    public class HomeController : Controller
    {
        private readonly string[] _pdfPaths = new[] {
            // 0
            "An Algorithm for Identifying, Extracting and Converting Document Image Table Structures into LaTeX Format.pdf",

            // 1
            "BMJ 2011 Olesen.pdf",

            // 2
            "Eur Heart J 2012 LaHaye.pdf",

            // 3
            "J Thromb Haemost 2011 Olesen.pdf",

            // 4
            "Report_Data types_UI dev_2-converted to pdf.pdf",

            // 5
            "Some text from LibreOffice Draw and Inkscape.pdf",

            // 6
            "Some text from LibreOffice Draw.pdf",

            // 7
            "stroke-and-systemic-embolism-prevention-nonvalvular-atrial-fibrillation-apixaban-bristolmyers-squibb-and-pfizer2.pdf",

            // 8
            @"Graphs_from_Hugh\Bar chart 2.pdf",

            // 9
            @"Graphs_from_Hugh\Bar chart.pdf",

            // 10
            @"Graphs_from_Hugh\From Hugh.docx",

            // 11
            @"Graphs_from_Hugh\MIxed mages.pdf",

            // 12
            @"Graphs_from_Hugh\ROC curves.pdf",

            // 13
            @"Graphs_from_Hugh\ROC curves2.pdf",

            // 14
            @"Graphs_from_Hugh\box plot.pdf",

            // 15
            @"Graphs_from_Hugh\pie chart.pdf",

            // 16
            @"Graphs_from_Hugh\ppv npv chart.pdf",

            // 17
            @"Graphs_from_Hugh\scatter plot.pdf",

            // 18
            @"Graphs_from_Fala\Graphs.pdf",

            //19
            @"Graphs_from_Fala\Graphs_130317.pdf"

        };

        public ActionResult Index()
        {
            return View();
        }

        public ActionResult About()
        {
            ViewBag.Message = "Your application description page.";

            return View();
        }

        public ActionResult Contact()
        {
            ViewBag.Message = "Your contact page.";

            return View();
        }

        public ActionResult Pdf()
        {
            var filePath = HttpContext.Server.MapPath(Path.Combine(
                "~/Content/Docs/Input",
                _pdfPaths[19]
            ));
            //var fileStream = System.IO.File.OpenRead(filePath);
            //return new FileStreamResult(fileStream, "application/pdf");
            return File(filePath, "application/pdf");
        }

        public ActionResult PdfTest()
        {
            dynamic model = new ExpandoObject();
            model.PdfPath = "./pdf";
            return View(model);
        }
        public ActionResult PdfTest2()
        {
            dynamic model = new ExpandoObject();
            model.PdfPath = "./pdf";
            return View(model);
        }

        public ActionResult PdfSandbox()
        {
            dynamic model = new ExpandoObject();
            model.PdfPath = "~/Home/pdf";
            return View(model);
        }

        public ActionResult ChartSandbox()
        {
            return View();
        }

        public ActionResult SelectionRectangleSandbox()
        {
            return View();
        }

        [HttpPost]
        public JsonResult SaveJSON(string jsonData, double durationMilliSeconds)
        {
            if (string.IsNullOrEmpty(jsonData)) throw new ArgumentException("jsonData");
            if (durationMilliSeconds <= 0) throw new ArgumentException("durationSeconds");

            var deserialisedObject = JsonConvert.DeserializeObject(jsonData);
            var jObject = JObject.FromObject(deserialisedObject);
            jObject.Add("timeToCompleteInMilliSeconds", durationMilliSeconds);

            var storageAccount = CloudStorageAccount.Parse(CloudConfigurationManager.GetSetting("StorageConnectionString"));
            var blobClient = storageAccount.CreateCloudBlobClient();

            // Retrieve a reference to a container.
            var container = blobClient.GetContainerReference("submissions");
            // Create the container if it doesn't already exist.
            container.CreateIfNotExists();
            container.SetPermissions(new BlobContainerPermissions { PublicAccess = BlobContainerPublicAccessType.Blob });

            // Retrieve reference to a blob named "myblob".
            var blockBlob = container.GetBlockBlobReference(string.Format("submission-{0}.json", DateTime.Now.ToString("dd-MM-yyyy-HH-mm-ss")));
            blockBlob.UploadText(jObject.ToString());

            return Json(true);
        }

        /// <summary>
        /// currently exposed at: /Home/ListBlobs
        /// </summary>
        /// <returns></returns>
        public ActionResult ListBlobs()
        {
            var stringBuilder = new StringBuilder();
            CloudStorageAccount storageAccount = CloudStorageAccount.Parse(
                CloudConfigurationManager.GetSetting("StorageConnectionString"));

            // Create the blob client.
            CloudBlobClient blobClient = storageAccount.CreateCloudBlobClient();

            // Retrieve reference to a previously created container.
            CloudBlobContainer container = blobClient.GetContainerReference("submissions");

            // Loop over items within the container and output the length and URI.
            foreach (IListBlobItem item in container.ListBlobs(null, false))
            {
                if (item.GetType() == typeof(CloudBlockBlob))
                {
                    CloudBlockBlob blob = (CloudBlockBlob)item;

                    stringBuilder.AppendFormat("Block blob of length {0}: {1}<br/>", blob.Properties.Length, blob.Uri);
                }
                else if (item.GetType() == typeof(CloudPageBlob))
                {
                    CloudPageBlob pageBlob = (CloudPageBlob)item;

                    stringBuilder.AppendFormat("Page blob of length {0}: {1}<br/>", pageBlob.Properties.Length, pageBlob.Uri);
                }
                else if (item.GetType() == typeof(CloudBlobDirectory))
                {
                    CloudBlobDirectory directory = (CloudBlobDirectory)item;

                    stringBuilder.AppendFormat("Directory: {0}<br/>", directory.Uri);
                }
            }
            return Content(stringBuilder.ToString());
        }

    }
}