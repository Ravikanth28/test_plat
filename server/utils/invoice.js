import PDFDocument from "pdfkit";

// Streams a PDF invoice for an order directly to the HTTP response.
export const streamInvoice = (order, res) => {
  const doc = new PDFDocument({ size: "A4", margin: 50 });

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="invoice-${order.orderNo}.pdf"`
  );
  doc.pipe(res);

  const brand = "#e23744";
  const shopName = order.shop?.name || "Shop";

  // Header
  doc.fillColor(brand).fontSize(24).text("LocalMart", { continued: false });
  doc.fillColor("#666").fontSize(10).text("Your neighbourhood, delivered.");
  doc.moveDown(0.5);
  doc.fillColor("#000").fontSize(16).text("TAX INVOICE", { align: "right" });
  doc.fontSize(10).fillColor("#666").text(`Invoice #: ${order.orderNo}`, { align: "right" });
  doc.text(`Date: ${new Date(order.createdAt).toLocaleString("en-IN")}`, {
    align: "right",
  });

  doc.moveDown();
  doc.strokeColor("#eee").moveTo(50, doc.y).lineTo(545, doc.y).stroke();
  doc.moveDown();

  // Parties
  const topY = doc.y;
  doc.fillColor("#000").fontSize(11).text("Sold By:", 50, topY);
  doc.fillColor("#444").fontSize(10).text(shopName);
  doc.text(order.shop?.address || "");
  doc.text(order.shop?.phone || "");

  doc.fillColor("#000").fontSize(11).text("Billed To:", 320, topY);
  doc.fillColor("#444").fontSize(10).text(order.customer?.name || "Customer", 320);
  doc.text(order.deliveryAddress || "", 320, doc.y, { width: 220 });
  doc.text(order.phone || "", 320);

  doc.moveDown(2);

  // Table header
  const tableTop = doc.y;
  doc.fillColor("#000").fontSize(10);
  doc.text("Item", 50, tableTop);
  doc.text("Qty", 320, tableTop, { width: 50, align: "right" });
  doc.text("Price", 380, tableTop, { width: 70, align: "right" });
  doc.text("Amount", 470, tableTop, { width: 75, align: "right" });
  doc.strokeColor("#ddd").moveTo(50, tableTop + 15).lineTo(545, tableTop + 15).stroke();

  let y = tableTop + 22;
  doc.fillColor("#444");
  order.items.forEach((it) => {
    const amount = it.price * it.qty;
    doc.text(it.name, 50, y, { width: 260 });
    doc.text(String(it.qty), 320, y, { width: 50, align: "right" });
    doc.text(`Rs.${it.price.toFixed(2)}`, 380, y, { width: 70, align: "right" });
    doc.text(`Rs.${amount.toFixed(2)}`, 470, y, { width: 75, align: "right" });
    y += 20;
  });

  doc.strokeColor("#ddd").moveTo(50, y).lineTo(545, y).stroke();
  y += 12;

  // Totals
  const totalsX = 380;
  doc.fillColor("#444").fontSize(10);
  doc.text("Items Total:", totalsX, y, { width: 90, align: "right" });
  doc.text(`Rs.${order.itemsTotal.toFixed(2)}`, 470, y, { width: 75, align: "right" });
  y += 18;
  doc.text("Delivery Fee:", totalsX, y, { width: 90, align: "right" });
  doc.text(`Rs.${order.deliveryFee.toFixed(2)}`, 470, y, { width: 75, align: "right" });
  y += 20;
  doc.fillColor("#000").fontSize(12);
  doc.text("Grand Total:", totalsX, y, { width: 90, align: "right" });
  doc.text(`Rs.${order.total.toFixed(2)}`, 470, y, { width: 75, align: "right" });

  y += 30;
  doc.fillColor("#666").fontSize(10);
  doc.text(
    `Payment: ${order.paymentMethod.toUpperCase()} (${order.paymentStatus})`,
    50,
    y
  );
  doc.text(`Order Status: ${order.status}`, 50, doc.y);

  doc.moveDown(2);
  doc.fillColor("#999").fontSize(9).text(
    "This is a computer-generated invoice from LocalMart. Thank you for your order!",
    50,
    doc.y,
    { align: "center", width: 495 }
  );

  doc.end();
};
