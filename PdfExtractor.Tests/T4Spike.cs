using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text;
using NUnit.Framework;

namespace PdfExtractor.Tests
{
    [TestFixture]
    public class T4Spike
    {
        /*
cat javascript/*.js > combined.js
cat javascript/core/*.js >> combined.js
cat javascript/core/AEalgos/*.js >> combined.js
cat javascript/core/axes/*.js >> combined.js
cat javascript/widgets/*.js >> combined.js
cat javascript/tools/*.js >> combined.js
cat javascript/services/*.js >> combined.js
cat javascript/browser/*.js >> combined.js
*/

        public IEnumerable<string> FindFiles(IEnumerable<string> filePathPatterns)
        {
            var files = filePathPatterns
                .SelectMany(p =>
                {
                    var folder = Path.GetDirectoryName(p);
                    var filePattern = Path.GetFileName(p);
                    return Directory.GetFiles(folder, filePattern);
                });

            return files;
        }

        public string CombineFiles(IEnumerable<string> filePaths)
        {
            var content = filePaths.Aggregate(
                new StringBuilder(),
                (sb, p) =>
                {
                    sb.Append(File.ReadAllText(p));
                    return sb;
                }
            ).ToString();

            return content;
        }

        [Test]
        public void CanMergeFiles()
        {
            var patterns = new[] {
                "javascript/*.js",
                "javascript/core/*.js",
                "javascript/core/AEalgos/*.js",
                "javascript/core/axes/*.js",
                "javascript/widgets/*.js",
                "javascript/tools/*.js",
                "javascript/services/*.js",
                "javascript/browser/*.js"
            }
            .Select(p => 
                Path.Combine(@"N:\dev\PdfExtractor\PdfExtractor.Web\Scripts\WebPlotDigitizer", p)
            );
            var files = FindFiles(patterns);
            var content = CombineFiles(files);

            Assert.IsTrue(content != null);
            Assert.IsTrue(content.Length > 0);
        }
    }
}
