using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace PdfExtractor.Tests
{
    public static class Extensions
    {
        public static Stream ToStream(this string str)
        {
            var stream = new MemoryStream();
            var writer = new StreamWriter(stream);
            writer.Write(str);
            writer.Flush();
            stream.Position = 0;
            return stream;
        }
        public static Stream ToStream(this byte[] ar)
        {
            var stream = new MemoryStream(ar);
            //stream.Position = 0;
            return stream;
        }
    }
}
