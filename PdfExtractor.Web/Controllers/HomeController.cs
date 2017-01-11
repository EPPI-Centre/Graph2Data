using System;
using System.Collections.Generic;
using System.Dynamic;
using System.IO;
using System.Linq;
using System.Web;
using System.Web.Mvc;

namespace PdfExtractor.Web.Controllers
{
    public class HomeController : Controller
    {
        private string _solutionFolder;
        private string _inputDocsPath;

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
            @"Graphs_from_Hugh\scatter plot.pdf"


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
                _pdfPaths[17]
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
    }
}