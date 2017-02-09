using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Web;
using System.Web.Optimization;

namespace PdfExtractor.Web
{
    public class BundleConfig
    {
        private static void RegisterWpdBundle(BundleCollection bundles)
        {
            bundles.Add(new ScriptBundle("~/bundles/wpd_tweaked").Include(
                "~/Scripts/wpd/javascript_tweaked/*.js",
                "~/Scripts/wpd/javascript_tweaked/core/*.js",
                "~/Scripts/wpd/javascript_tweaked/core/AEalgos/*.js",
                "~/Scripts/wpd/javascript_tweaked/core/axes/*.js",
                "~/Scripts/wpd/javascript_tweaked/widgets/*.js",
                "~/Scripts/wpd/javascript_tweaked/tools/*.js",
                "~/Scripts/wpd/javascript_tweaked/services/*.js",
                "~/Scripts/wpd/javascript_tweaked/browser/*.js"
            ));
        }

        // For more information on bundling, visit http://go.microsoft.com/fwlink/?LinkId=301862
        public static void RegisterBundles(BundleCollection bundles)
        {
            bundles.Add(new ScriptBundle("~/bundles/jquery").Include(
                        //"~/Scripts/jquery-{version}.js"
                        "~/Scripts/viewer-poc/web/jquery-3.1.0.min.js"
                        ));

            bundles.Add(new ScriptBundle("~/bundles/jqueryval").Include(
                        "~/Scripts/jquery.validate*"));

            bundles.Add(new ScriptBundle("~/bundles/jquery-ui").Include(
                        "~/Scripts/jquery.mousewheel.min.js",
                        "~/Scripts/jquery-ui-1.12.1.only-spinner/jquery-ui.js"));
            bundles.Add(new StyleBundle("~/Scripts/jquery-ui-1.12.1.only-spinner/bundle").Include(
                        "~/Scripts/jquery-ui-1.12.1.only-spinner/*.css"));

            // Use the development version of Modernizr to develop with and learn from. Then, when you're
            // ready for production, use the build tool at http://modernizr.com to pick only the tests you need.
            bundles.Add(new ScriptBundle("~/bundles/modernizr").Include(
                        "~/Scripts/modernizr-*"));

            bundles.Add(new ScriptBundle("~/bundles/bootstrap").Include(
                      "~/Scripts/bootstrap.js",
                      "~/Scripts/respond.js"));

            bundles.Add(new StyleBundle("~/Content/css").Include(
                      "~/Content/bootstrap.css",
                      "~/Content/site.css"));

            //bundles.Add(new ScriptBundle("~/bundles/pdfjsold").Include(
            //    "~/Scripts/viewer-poc/web/pdf.js",
            //    "~/Scripts/viewer-poc/web/pdf.worker.js",
            // // "~/Scripts/viewer-poc/web/viewer.js",
            //    "~/Scripts/dviewer-poc/web/debugger.js",
            //    "~/Scripts/viewer-poc/web/l10n.js"
            //    ));

            bundles.Add(new ScriptBundle("~/bundles/pdfjs").Include(
                "~/Scripts/viewer-poc/web/pdf.js",
             // "~/Scripts/viewer-poc/web/pdf.worker.js",
                "~/Scripts/viewer-poc/web/compatibility.js",
                "~/Scripts/viewer-poc/web/spatialhash.js",
                "~/Scripts/viewer-poc/web/debugger.js",
                "~/Scripts/viewer-poc/web/l10n.js",
                "~/Scripts/viewer-poc/web/viewer.js"
                ));
            bundles.Add(new ScriptBundle("~/bundles/pdfjsviewer").Include(
                ));
            bundles.Add(new StyleBundle("~/Content/pdfstyle").Include(
                "~/Scripts/viewer-poc/web/viewer.css"
                ));

            RegisterWpdBundle(bundles);
        }
    }
}
