using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using PdfSharp.Pdf;
using PdfSharp.Pdf.IO;

namespace PdfExtractor.Tests
{
    public static class Helpers
    {
        public static string GetFirstAvailableIncrement(string filePath)
        {
            var folder = Path.GetDirectoryName(filePath);
            var filename = Path.GetFileNameWithoutExtension(filePath);
            var extension = Path.GetExtension(filePath);
            var counter = 0;
            string newPath;

            do
            {
                var suffix = counter != 0 ? $"({counter})" : string.Empty;

                newPath = Path.Combine(folder, $"{filename}{suffix}{extension}");
                counter++;
            } while (File.Exists(newPath));

            return newPath;
        }

        public static PdfDocumentInformation GetDocumentInfo(string filePath)
        {
            var doc = PdfReader.Open(filePath, PdfDocumentOpenMode.InformationOnly);
            return doc.Info;
        }

        public static PdfDocument GetDocument(string filePath)
        {
            var doc = PdfReader.Open(filePath, PdfDocumentOpenMode.ReadOnly);
            return doc;
        }

        public static void CloneDoc(string inputPath, string outputPath)
        {
            var pdfDoc = PdfReader.Open(inputPath, PdfDocumentOpenMode.Import);
            var pdfNewDoc = new PdfDocument();
            foreach (var t in pdfDoc.Pages)
            {
                pdfNewDoc.AddPage(t);
            }
            pdfNewDoc.Save(outputPath);
        }
    }
}
