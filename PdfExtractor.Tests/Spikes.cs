using System;
using System.Collections.Generic;
using System.IO;
using System.IO.Compression;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using NUnit.Framework;
using PdfSharp.Pdf;
using PdfSharp.Pdf.Advanced;
using PdfSharp.Pdf.IO;

namespace PdfExtractor.Tests
{
    [TestFixture]
    public class Spikes
    {
        private string InputDocFolderPath { get; set; }
        private string OutputDocFolderPath { get; set; }
        private InputFile[] InputDocPaths { get; set; }

        private enum Id
        {
            None,

            Bmi,
            EurHeart,
            JThromb,

            SomeTextFromLibreOfficeDraw
        }

        private class InputFile
        {
            public Id Id { get; set; }
            public string Path { get; set; }
        }

        private InputFile GetInputFile(Id id)
        {
            return InputDocPaths.First(f => f.Id == id);
        }

        [SetUp]
        public void Setup()
        {
            InputDocFolderPath = @"N:\dev\PdfExtractor\docs\Input";
            OutputDocFolderPath = @"N:\dev\PdfExtractor\docs\OUtput";
            InputDocPaths = new[]
            {
                new InputFile { Id = Id.Bmi,                         Path = @"BMJ 2011 Olesen.pdf" },
                new InputFile { Id = Id.EurHeart,                    Path = @"Eur Heart J 2012 LaHaye.pdf" },
                new InputFile { Id = Id.JThromb,                     Path = @"J Thromb Haemost 2011 Olesen.pdf" },
                new InputFile { Id = Id.SomeTextFromLibreOfficeDraw, Path = @"Some text from LibreOffice Draw.pdf" }
            }
            .Select(f => new InputFile { Id = f.Id, Path = Path.Combine(InputDocFolderPath, f.Path) })
            .ToArray();
        }

        [Test]
        public void CanCloneDoc()
        {
            var input = GetInputFile(Id.Bmi);
            var filename = Path.GetFileName(input.Path);
            var output = Path.Combine(OutputDocFolderPath, filename);
            output = Helpers.GetFirstAvailableIncrement(output);

            Helpers.CloneDoc(input.Path, output);

            Assert.IsTrue(File.Exists(output));
            File.Delete(output);
        }

        [Test]
        public void CanReadDocInfo()
        {
            var info = Helpers.GetDocumentInfo(GetInputFile(Id.Bmi).Path);

            Assert.IsTrue(info != null);
        }

        [Test]
        public void CanReadDoc()
        {
            var doc = Helpers.GetDocument(GetInputFile(Id.Bmi).Path);

            Assert.IsTrue(doc != null);
        }

        static void ExportImage(PdfDictionary image, ref int count)
        {
            string filter = image.Elements.GetName("/Filter");
            switch (filter)
            {
                //case "/DCTDecode":
                //    ExportJpegImage(image, ref count);
                //    break;

                case "/FlateDecode":
                    ExportAsPngImage(image, ref count);
                    break;
            }
        }

        static void ExportAsPngImage(PdfDictionary image, ref int count)
        {
            int width = image.Elements.GetInteger(PdfImage.Keys.Width);
            int height = image.Elements.GetInteger(PdfImage.Keys.Height);
            int bitsPerComponent = image.Elements.GetInteger(PdfImage.Keys.BitsPerComponent);

            // TODO: You can put the code here that converts vom PDF internal image format to a Windows bitmap
            // and use GDI+ to save it in PNG format.
            // It is the work of a day or two for the most important formats. Take a look at the file
            // PdfSharp.Pdf.Advanced/PdfImage.cs to see how we create the PDF image formats.
            // We don't need that feature at the moment and therefore will not implement it.
            // If you write the code for exporting images I would be pleased to publish it in a future release
            // of PDFsharp.
        }

        private static void DoExportImage(string input)
        {
            PdfDocument document = PdfReader.Open(input);

            int imageCount = 0;
            // Iterate pages
            foreach (var page in document.Pages)
            {
                // Get resources dictionary
                var resources = page.Elements.GetDictionary("/Resources");
                if (resources != null)
                {
                    // Get external objects dictionary
                    var xObjects = resources.Elements.GetDictionary("/XObject");
                    if (xObjects != null)
                    {
                        ICollection<PdfItem> items = xObjects.Elements.Values;
                        // Iterate references to external objects
                        foreach (PdfItem item in items)
                        {
                            PdfReference reference = item as PdfReference;
                            if (reference != null)
                            {
                                PdfDictionary xObject = reference.Value as PdfDictionary;
                                // Is external object an image?
                                if (xObject != null && xObject.Elements.GetString("/Subtype") == "/Image")
                                {
                                    ExportImage(xObject, ref imageCount);
                                }
                            }
                        }
                    }
                }
            }
            //System.Windows.Forms.MessageBox.Show(imageCount + " images exported.", "Export Images");
        }

        private PdfDocument OpenPdf(string path)
        {
            PdfDocument doc = null;
            try
            {
                doc = PdfReader.Open(path);
            }
            catch (Exception ex)
            {
                var nl = Environment.NewLine;
                Console.WriteLine($"File: '{path}' ][{nl}Exception: {ex}{nl}");
            }

            return doc;
        }

        [Test]
        public void CanOpenFilesFromVariousSources()
        {
            var libreOfficeDrawFiles = new[]
            {
                Id.SomeTextFromLibreOfficeDraw
            };
            var nonFoxit = new[]
            {
                Id.Bmi,
                Id.EurHeart,
                Id.JThromb
            };

            var files = libreOfficeDrawFiles
                .Select(id => GetInputFile(id).Path)
                .Select(path => new {
                    Path = path,
                    Doc = OpenPdf(path)
                })
                .ToList();

            Assert.IsTrue(files.TrueForAll(f => f.Doc != null));
        }

        [Test]
        public void CanReadAllTextFromPdf()
        {
            var text = PdfTextExtractor.GetText(GetInputFile(Id.SomeTextFromLibreOfficeDraw).Path);
            Assert.IsTrue(text == "Some text from LibreOffice Draw");
        }

        private string Deflate(byte[] input)
        {
            string output;

            using (var ms = input.ToStream())
            using (var ds = new DeflateStream(ms, CompressionMode.Decompress))
            using (var os = new MemoryStream())
            {
                ds.CopyTo(os);
                os.Position = 0;
                using (var sr = new StreamReader(os))
                {
                    output = sr.ReadToEnd();
                }
            }

            return output;
        }

        [Test]
        public void CanDeflate()
        {
            var byteInput = new byte[]
            {
                // Skip first two bytes:
                // http://stackoverflow.com/questions/18450297/is-it-possible-to-use-the-net-deflatestream-for-pdf-creation
                // 0x78, 0x9c,
                0x35, 0x8c, 0x4f, 0x0b, 0xc2, 0x30, 0x0c, 0xc5, 0xef, 0xf9, 0x14, 0x39, 0x0f, 0xac,
                0x49, 0xb7, 0x6c, 0x2d, 0x8c, 0x82, 0xd3, 0xed, 0xe0, 0x6d, 0x50, 0xf0, 0x20, 0xde, 0x74, 0x7a,
                0x98, 0x82, 0xbb, 0xf8, 0xf5, 0x4d, 0xf7, 0x87, 0x40, 0x5f, 0x5e, 0xf3, 0x7b, 0x8f, 0x0c, 0xe3,
                0x0f, 0xbe, 0x48, 0x48, 0xba, 0x89, 0x17, 0x63, 0xd1, 0x15, 0x6c, 0x1c, 0x4e, 0x0f, 0xb8, 0x64,
                0xf8, 0x01, 0xc6, 0x34, 0xd3, 0x13, 0x48, 0x0f, 0x16, 0xdf, 0xb0, 0x41, 0x16, 0xc7, 0x35, 0x90,
                0xa2, 0xe3, 0x5a, 0x91, 0x74, 0xb9, 0xbd, 0x60, 0xc8, 0x96, 0x66, 0x1d, 0xcd, 0x37, 0x11, 0x44,
                0x4c, 0x8e, 0x55, 0x95, 0x1b, 0x8f, 0xf1, 0x8e, 0xfb, 0x4e, 0x9b, 0x1d, 0xc6, 0xe1, 0x5a, 0x13,
                0x93, 0x0d, 0x65, 0x4d, 0x39, 0x15, 0x24, 0x54, 0x86, 0x9d, 0xd4, 0x54, 0xa4, 0x8f, 0x6a, 0x35,
                0x42, 0x6e, 0x56, 0xbf, 0x71, 0x32, 0xdb, 0x43, 0x32, 0x0d, 0x1d, 0x93, 0x78, 0xcd, 0x9e, 0x14,
                0x63, 0xdd, 0x17, 0xb8, 0x09, 0xfa, 0xb4, 0x73, 0x65, 0x47, 0x9e, 0x49, 0x29, 0xe6, 0x70, 0x8b,
                0x67, 0x68, 0x23, 0xf4, 0xd0, 0xe3, 0x1f, 0x1b, 0x71, 0x35, 0x34,
            };


            var output = Deflate(byteInput);

            Assert.IsTrue(output != null);
        }
    }
}
