const router = require("express").Router();
const { authMiddleware } = require("../middlewares/auth.middleware");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { exec } = require("child_process");

const PRINTER_NAME_1 = "EPSON TM-T88V Receipt5";
const PRINTER_NAME_2 = "POS Printer 203DPI  Series";

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

function buildPsScript(printerName, filePath) {
  return `
$printerName = "${printerName}"
$filePath    = "${filePath.replace(/\\/g, "\\\\")}"
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

function printToPrinter(printerName, receipt) {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      const tmpBin = path.join(os.tmpdir(), `receipt_${Date.now()}_${Math.random().toString(36).slice(2)}.bin`);
      const tmpPs  = path.join(os.tmpdir(), `print_${Date.now()}_${Math.random().toString(36).slice(2)}.ps1`);
      const script = buildPsScript(printerName, tmpBin);

      fs.writeFile(tmpBin, receipt, (errBin) => {
        if (errBin) return reject(errBin);
        fs.writeFile(tmpPs, script, "utf8", (errPs) => {
          if (errPs) return reject(errPs);
          const cmd = `powershell -NoProfile -ExecutionPolicy Bypass -File "${tmpPs}"`;
          exec(cmd, (execErr, stdout, stderr) => {
            fs.unlink(tmpBin, () => {});
            fs.unlink(tmpPs,  () => {});
            if (execErr) return reject(new Error(stderr));
            console.log(`[${printerName}] stdout:`, stdout.trim());
            resolve(stdout.trim());
          });
        });
      });
    }, 300);
  });
}

async function sendToPrinter(receipt, res) {
  console.log("Buffer size:", receipt.length, "bytes");
  try {
    await Promise.all([
      printToPrinter(PRINTER_NAME_1, receipt),
      printToPrinter(PRINTER_NAME_2, receipt),
    ]);
    console.log("Impreso en ambas impresoras");
    res.json({ message: "Impreso correctamente" });
  } catch (err) {
    console.error("Error al imprimir:", err.message);
    res.status(500).json({ message: "Error al imprimir.", error: err.message });
  }
}

// ══════════════════════════════════════════════════════════
// POST /api/print — Ticket de factura (cliente)
// ══════════════════════════════════════════════════════════
router.post("/", authMiddleware, (req, res) => {
  const { order } = req.body;

  const fecha = new Date(order.createdAt).toLocaleString("en-US", {
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit",
    hour12: true,
  });

  const isDelivery = order.orderType === "DOMICILIO";

  const chunks = [];
  const add = (...buffers) => buffers.forEach((b) => chunks.push(b));

  add(CMD.INIT);
  add(CMD.ALIGN_CENTER);
  add(CMD.DOUBLE_ON);
  add(text("El Nuevo Baraton"));
  add(CMD.DOUBLE_OFF);
  add(text("Calle 70 #61 - Barranquilla"));
  add(text("CC: 22746376"));
  add(text("Encargada: Claudia Marquez"));
  add(line());

  add(CMD.ALIGN_LEFT);
  add(text(`Pedido # : ${order.id}`));
  add(text(`Fecha    : ${fecha}`));

  const typeLabel = { MESA: `Mesa ${order.tableNumber || "?"}`, DOMICILIO: "Domicilio", LLEVAR: "Para Llevar" };
  add(text(`Tipo     : ${typeLabel[order.orderType] || (order.tableNumber ? `Mesa ${order.tableNumber}` : "Para llevar")}`));

  add(text(`Atendio  : ${order.user?.name || "-"}`));
  add(text("Telefono : 312 2035078"));

  if (order.notes) {
    add(CMD.LF);
    add(text(`Notas    : ${order.notes}`));
  }

  if (isDelivery && order.delivery) {
    add(CMD.LF);
    add(line());
    add(CMD.BOLD_ON);
    add(text("  >> DATOS DE ENTREGA"));
    add(CMD.BOLD_OFF);
    if (order.delivery.customerName) add(text(`  Cliente  : ${order.delivery.customerName}`));
    if (order.delivery.phone)        add(text(`  Telefono : ${order.delivery.phone}`));
    if (order.delivery.address)      add(text(`  Direccion: ${order.delivery.address}`));
  }

  add(line());

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

  if (order.payment) {
    const METHOD_LABELS = {
      EFECTIVO:      "Efectivo",
      TRANSFERENCIA: "Transferencia",
      TARJETA:       "Tarjeta",
      MIXTO:         "Mixto",
    };
    add(CMD.ALIGN_LEFT);
    add(text(`Pago   : ${METHOD_LABELS[order.payment.method] || order.payment.method}`));

    if (order.payment.method === "EFECTIVO") {
      add(text(`Recibido  : $${order.payment.cashGiven.toLocaleString("es-CO")}`));
      add(text(`Cambio    : $${order.payment.change.toLocaleString("es-CO")}`));
    }

    if (order.payment.method === "MIXTO") {
      if (order.payment.cashGiven)  add(text(`Efectivo  : $${order.payment.cashGiven.toLocaleString("es-CO")}`));
      if (order.payment.transfer)   add(text(`Transfer. : $${order.payment.transfer.toLocaleString("es-CO")}`));
      if (order.payment.change > 0) add(text(`Cambio    : $${order.payment.change.toLocaleString("es-CO")}`));
    }

    add(line());
  }

  // TOTAL en la misma línea: "TOTAL" a la izquierda, valor a la derecha
  add(CMD.BOLD_ON, CMD.DOUBLE_ON);
  add(row("TOTAL", "", `$${order.total.toLocaleString("es-CO")}`, [10, 10, 22]));
  add(CMD.DOUBLE_OFF, CMD.BOLD_OFF);
  add(line());

  add(CMD.ALIGN_CENTER);
  add(CMD.LF);
  add(text("Gracias por su visita"));
  add(text("Lo esperamos de vuelta!"));
  add(CMD.LF);
  add(text("Baussa - 2026"));
  add(CMD.LF);
  add(CMD.LF);
  add(CMD.CUT);

  sendToPrinter(Buffer.concat(chunks), res);
});

// ══════════════════════════════════════════════════════════
// POST /api/print/kitchen — Ticket de cocina
// ══════════════════════════════════════════════════════════
router.post("/kitchen", authMiddleware, (req, res) => {
  const { order } = req.body;

  const fecha = new Date(order.createdAt).toLocaleString("en-US", {
    hour: "2-digit", minute: "2-digit", hour12: true,
  });

  const isDelivery = order.orderType === "DOMICILIO";

  const chunks = [];
  const add = (...buffers) => buffers.forEach((b) => chunks.push(b));

  add(CMD.INIT);
  add(CMD.ALIGN_CENTER);
  add(CMD.BOLD_ON);
  add(CMD.DOUBLE_ON);
  add(CMD.LF);
  add(CMD.LF);
  add(CMD.LF);

  if (isDelivery)                      add(text("** DOMICILIO **"));
  else if (order.orderType === "MESA") add(text(`MESA ${order.tableNumber || "?"}`));
  else                                 add(text("PARA LLEVAR"));

  add(CMD.DOUBLE_OFF);
  add(CMD.BOLD_OFF);
  add(line("="));
  add(CMD.LF);

  add(CMD.ALIGN_LEFT);
  add(CMD.BOLD_ON);
  add(text(`Pedido #${order.id}    ${fecha}`));
  add(text(`Mesero: ${order.user?.name || "-"}`));
  add(CMD.BOLD_OFF);
  add(line());
  add(CMD.LF);
  add(CMD.LF);

  add(CMD.ALIGN_LEFT);
  order.items.forEach((item) => {
    add(CMD.BOLD_ON);
    add(CMD.DOUBLE_ON);
    add(text(`${item.quantity}x ${item.product.name}`));
    add(CMD.DOUBLE_OFF);
    add(CMD.BOLD_OFF);
    add(CMD.LF);
  });

  add(line());
  add(CMD.LF);

  if (order.notes) {
    add(CMD.BOLD_ON);
    add(text("NOTAS:"));
    add(CMD.BOLD_OFF);
    add(CMD.DOUBLE_ON);
    add(text(order.notes));
    add(CMD.DOUBLE_OFF);
    add(line());
    add(CMD.LF);
  }

  if (isDelivery && order.delivery) {
    add(CMD.BOLD_ON);
    add(CMD.ALIGN_CENTER);
    add(text("ENTREGAR A:"));
    add(CMD.BOLD_OFF);
    add(CMD.ALIGN_LEFT);
    add(line("."));
    if (order.delivery.customerName) add(text(`  ${order.delivery.customerName}`));
    if (order.delivery.phone)        add(text(`  Tel: ${order.delivery.phone}`));
    if (order.delivery.address)      add(text(`  Dir: ${order.delivery.address}`));
    add(line("."));
    add(CMD.LF);
  }

  add(CMD.LF);
  add(CMD.LF);
  add(CMD.LF);
  add(CMD.CUT);

  sendToPrinter(Buffer.concat(chunks), res);
});

module.exports = router;