const router = require("express").Router();
const { authMiddleware } = require("../middlewares/auth.middleware");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { exec } = require("child_process");

const PRINTER_NAME = "EPSON TM-T88V Receipt";

// ── Helpers ESC/POS ───────────────────────────────────────
const ESC = 0x1b;
const GS  = 0x1d;

const CMD = {
  INIT:         Buffer.from([ESC, 0x40]),
  ALIGN_LEFT:   Buffer.from([ESC, 0x61, 0x00]),
  ALIGN_CENTER: Buffer.from([ESC, 0x61, 0x01]),
  BOLD_ON:      Buffer.from([ESC, 0x45, 0x01]),
  BOLD_OFF:     Buffer.from([ESC, 0x45, 0x00]),
  DOUBLE_ON:    Buffer.from([GS,  0x21, 0x11]),
  DOUBLE_OFF:   Buffer.from([GS,  0x21, 0x00]),
  CUT:          Buffer.from([GS,  0x56, 0x41, 0x03]),
  LF:           Buffer.from([0x0a]),
};

function text(str) {
  const replacements = {
    "á":"a","é":"e","í":"i","ó":"o","ú":"u",
    "Á":"A","É":"E","Í":"I","Ó":"O","Ú":"U",
    "ñ":"n","Ñ":"N","¡":"!","¿":"?",
  };
  const clean = str.replace(/[áéíóúÁÉÍÓÚñÑ¡¿]/g, (c) => replacements[c] || c);
  return Buffer.from(clean + "\n", "binary");
}

function line(char = "-", width = 42) {
  return text(char.repeat(width));
}

function row(col1, col2, col3, widths = [21, 10, 11]) {
  const pad = (s, w, right = false) => {
    s = String(s).slice(0, w);
    return right ? s.padStart(w) : s.padEnd(w);
  };
  return text(pad(col1, widths[0]) + pad(col2, widths[1], true) + pad(col3, widths[2], true));
}

// ── Script PowerShell que usa winspool directo ────────────
function buildPsScript(tmpFile, printerName) {
  return `
$printerName = "${printerName}"
$filePath    = "${tmpFile.replace(/\\/g, "\\\\")}"
$bytes       = [System.IO.File]::ReadAllBytes($filePath)

$src = @"
using System;
using System.Runtime.InteropServices;
public class RawPrint {
  [DllImport("winspool.drv", CharSet=CharSet.Unicode)]
  public static extern bool OpenPrinter(string n, out IntPtr h, IntPtr d);
  [DllImport("winspool.drv")]
  public static extern bool ClosePrinter(IntPtr h);
  [DllImport("winspool.drv", CharSet=CharSet.Unicode)]
  public static extern bool StartDocPrinter(IntPtr h, int lvl, ref DOCINFO di);
  [DllImport("winspool.drv")]
  public static extern bool EndDocPrinter(IntPtr h);
  [DllImport("winspool.drv")]
  public static extern bool StartPagePrinter(IntPtr h);
  [DllImport("winspool.drv")]
  public static extern bool EndPagePrinter(IntPtr h);
  [DllImport("winspool.drv")]
  public static extern bool WritePrinter(IntPtr h, IntPtr buf, int len, out int written);
  [StructLayout(LayoutKind.Sequential, CharSet=CharSet.Unicode)]
  public struct DOCINFO {
    [MarshalAs(UnmanagedType.LPWStr)] public string pDocName;
    [MarshalAs(UnmanagedType.LPWStr)] public string pOutputFile;
    [MarshalAs(UnmanagedType.LPWStr)] public string pDataType;
  }
}
"@
Add-Type -TypeDefinition $src

$h = [IntPtr]::Zero
[RawPrint]::OpenPrinter($printerName, [ref]$h, [IntPtr]::Zero) | Out-Null

$di = New-Object RawPrint+DOCINFO
$di.pDocName   = "Receipt"
$di.pDataType  = "RAW"
$di.pOutputFile = $null

[RawPrint]::StartDocPrinter($h, 1, [ref]$di)  | Out-Null
[RawPrint]::StartPagePrinter($h)               | Out-Null

$ptr     = [System.Runtime.InteropServices.Marshal]::AllocHGlobal($bytes.Length)
[System.Runtime.InteropServices.Marshal]::Copy($bytes, 0, $ptr, $bytes.Length)
$written = 0
[RawPrint]::WritePrinter($h, $ptr, $bytes.Length, [ref]$written) | Out-Null
[System.Runtime.InteropServices.Marshal]::FreeHGlobal($ptr)

[RawPrint]::EndPagePrinter($h)  | Out-Null
[RawPrint]::EndDocPrinter($h)   | Out-Null
[RawPrint]::ClosePrinter($h)    | Out-Null

Write-Output "OK:$written"
`;
}

router.post("/", authMiddleware, (req, res) => {
  const { order } = req.body;

  const fecha = new Date(order.createdAt).toLocaleString("es-CO", {
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit",
  });

  const chunks = [];
  const add = (...buffers) => buffers.forEach((b) => chunks.push(b));

  // ── Encabezado ──
  add(CMD.INIT);
  add(CMD.ALIGN_CENTER);
  add(CMD.DOUBLE_ON);
  add(text("El Nuevo Baraton"));
  add(CMD.DOUBLE_OFF);
  add(text("Calle 70 #61-Esq - Barranquilla"));
  add(text("NIT: 123456789-0"));
  add(line());

  // ── Info pedido ──
  add(CMD.ALIGN_LEFT);
  add(text(`Pedido # : ${order.id}`));
  add(text(`Fecha    : ${fecha}`));
  add(text(`Mesa     : ${order.tableNumber ? `Mesa ${order.tableNumber}` : "Para llevar"}`));
  add(text(`Atendio  : ${order.user?.name || "-"}`));
  add(line());

  // ── Tabla ──
  add(CMD.BOLD_ON);
  add(row("Descripcion", "P.Unit", "Total"));
  add(CMD.BOLD_OFF);
  add(line());

  order.items.forEach((item) => {
    const nombre   = `${item.quantity}x ${item.product.name}`;
    const precio   = `$${item.unitPrice.toLocaleString("es-CO")}`;
    const subtotal = `$${(item.unitPrice * item.quantity).toLocaleString("es-CO")}`;

    if (nombre.length > 20) {
      add(text(nombre));
      add(row("", precio, subtotal));
    } else {
      add(row(nombre, precio, subtotal));
    }
  });

  add(line());

  // ── Total ──
  add(CMD.BOLD_ON);
  add(CMD.DOUBLE_ON);
  add(row("TOTAL", "", `$${order.total.toLocaleString("es-CO")}`, [21, 10, 11]));
  add(CMD.DOUBLE_OFF);
  add(CMD.BOLD_OFF);
  add(line());

  // ── Pie ──
  add(CMD.ALIGN_CENTER);
  add(CMD.LF);
  add(text("Gracias por su visita!"));
  add(text("¡Vuelva pronto!"));
  add(CMD.LF);
  add(text("Baus S.A.S - 2026"));
  add(CMD.LF);
  add(CMD.LF);
  add(CMD.CUT);

  const receipt  = Buffer.concat(chunks);
  const tmpBin   = path.join(os.tmpdir(), `receipt_${Date.now()}.bin`);
  const tmpPs    = path.join(os.tmpdir(), `print_${Date.now()}.ps1`);
  const psScript = buildPsScript(tmpBin, PRINTER_NAME);

  fs.writeFile(tmpBin, receipt, (errBin) => {
    if (errBin) {
      console.error("Error bin:", errBin.message);
      return res.status(500).json({ message: "Error al preparar la impresion." });
    }

    fs.writeFile(tmpPs, psScript, "utf8", (errPs) => {
      if (errPs) {
        console.error("Error ps1:", errPs.message);
        return res.status(500).json({ message: "Error al preparar el script." });
      }

      const cmd = `powershell -NoProfile -ExecutionPolicy Bypass -File "${tmpPs}"`;

      exec(cmd, (execErr, stdout, stderr) => {
        fs.unlink(tmpBin, () => {});
        fs.unlink(tmpPs,  () => {});

        if (execErr) {
          console.error("Error PowerShell:", stderr);
          return res.status(500).json({ message: "Error al imprimir.", error: stderr });
        }

        console.log("Resultado impresion:", stdout.trim());
        res.json({ message: "Impreso correctamente" });
      });
    });
  });
});

module.exports = router;