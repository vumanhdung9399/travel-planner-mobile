import * as FileSystem from "expo-file-system/legacy";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { Platform } from "react-native";

export type PdfValue = string | number | boolean | null | undefined;

export const formatPdfCurrency = (value: number | string | null | undefined) =>
  new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(Number(value) || 0);

const escapeHtml = (value: PdfValue) =>
  String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");

const safeFilePart = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9-_]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase() || "bao-cao";

export const exportPdf = async (
  title: string,
  headers: string[],
  rows: PdfValue[][],
) => {
  const tableHeader = headers
    .map((header) => `<th>${escapeHtml(header)}</th>`)
    .join("");
  const tableRows = rows
    .map(
      (row) =>
        `<tr>${row.map((value) => `<td>${escapeHtml(value)}</td>`).join("")}</tr>`,
    )
    .join("");

  const html = `<!doctype html>
  <html lang="vi"><head><meta charset="utf-8"><style>
    @page { size: A4 landscape; margin: 24px; }
    body { font-family: Arial, sans-serif; color: #172033; }
    h1 { font-size: 20px; margin: 0 0 4px; }
    p { color: #64748b; font-size: 10px; margin: 0 0 14px; }
    table { width: 100%; border-collapse: collapse; font-size: 9px; }
    th, td { border: 1px solid #cbd5e1; padding: 6px; text-align: left; }
    th { background: #e0f2fe; }
    tr:nth-child(even) td { background: #f8fafc; }
  </style></head><body>
    <h1>${escapeHtml(title)}</h1>
    <p>Xuất lúc ${escapeHtml(new Date().toLocaleString("vi-VN"))}</p>
    <table><thead><tr>${tableHeader}</tr></thead><tbody>${tableRows}</tbody></table>
  </body></html>`;

  const { uri } = await Print.printToFileAsync({ html });
  const fileName = `${safeFilePart(title)}-${new Date().toISOString().slice(0, 10)}.pdf`;

  if (Platform.OS === "android") {
    const permission =
      await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();
    if (permission.granted) {
      const targetUri = await FileSystem.StorageAccessFramework.createFileAsync(
        permission.directoryUri,
        fileName,
        "application/pdf",
      );
      const base64 = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      await FileSystem.writeAsStringAsync(targetUri, base64, {
        encoding: FileSystem.EncodingType.Base64,
      });
      return targetUri;
    }
  }

  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, {
      UTI: ".pdf",
      mimeType: "application/pdf",
      dialogTitle: title,
    });
    return uri;
  } else {
    await Print.printAsync({ html });
    return uri;
  }
};
