using Microsoft.Owin;
using Owin;

[assembly: OwinStartupAttribute(typeof(PdfExtractor.Web.Startup))]
namespace PdfExtractor.Web
{
    public partial class Startup
    {
        public void Configuration(IAppBuilder app)
        {
            ConfigureAuth(app);
        }
    }
}
