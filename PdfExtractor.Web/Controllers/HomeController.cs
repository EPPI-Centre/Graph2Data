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

        private string SolutionPath
        {
            get
            {
                if (_solutionFolder == null)
                {
                    var assemblyname = System.Reflection.Assembly.GetExecutingAssembly().GetName().Name;
                    using (var stream = System.Reflection.Assembly.GetExecutingAssembly().GetManifestResourceStream(assemblyname + ".solutionpath.txt"))
                    {
                        using (var sr = new StreamReader(stream))
                        {
                            _solutionFolder = sr.ReadToEnd().Trim();
                        }
                    }
                }
                return _solutionFolder;
            }
        }

        private string InputDocsPath
        {
            get
            {
                if (_inputDocsPath == null)
                {
                    _inputDocsPath = Path.Combine(SolutionPath, "docs", "Input");
                }
                return _inputDocsPath;
            }
        }

        public FileStreamResult Pdf()
        {
            var filePath = Path.Combine(InputDocsPath, "An Algorithm for Identifying, Extracting and Converting Document Image Table Structures into LaTeX Format.pdf");
            //var filePath = Path.Combine(InputDocsPath, "BMJ 2011 Olesen.pdf");
            //var filePath = Path.Combine(InputDocsPath, "Some text from LibreOffice Draw and Inkscape.pdf");
            var fileStream = System.IO.File.OpenRead(filePath);
            return new FileStreamResult(fileStream, "application/pdf");
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
            return View();
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