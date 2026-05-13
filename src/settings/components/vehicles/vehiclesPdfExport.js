import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const getVehicleDeviceIds = (vehicle) => {
  if (Array.isArray(vehicle?.deviceIds) && vehicle.deviceIds.length > 0) {
    return vehicle.deviceIds;
  }
  if (Array.isArray(vehicle?.devices)) {
    return vehicle.devices
      .map((d) => (d && typeof d === 'object' && d.id != null ? d.id : d))
      .filter((id) => id != null);
  }
  return vehicle?.device_id != null ? [vehicle.device_id] : [];
};

const formatDeviceCell = (vehicle, devicesById) => {
  const ids = getVehicleDeviceIds(vehicle);
  if (!ids.length) return '-';
  const labels = ids
    .map((id) => {
      const device = devicesById?.get?.(id);
      if (!device) return null;
      const name = (device.name || '').trim();
      const uid = (device.uniqueId || '').trim();
      if (name && uid) return `${name} (${uid})`;
      return name || uid || null;
    })
    .filter(Boolean);
  return labels.length ? labels.join(', ') : '-';
};

const formatTimestamp = () => {
  try {
    return new Date().toLocaleString('pt-BR');
  } catch {
    return new Date().toISOString();
  }
};

const buildHeader = (doc, { keyword, totalCount, filteredCount }) => {
  const pageWidth = doc.internal.pageSize.getWidth();

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text('Relatório de Veículos', 14, 18);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(`Gerado em: ${formatTimestamp()}`, pageWidth - 14, 18, { align: 'right' });

  let y = 26;
  doc.setFontSize(10);
  const totalLabel = filteredCount === totalCount
    ? `Total de veículos: ${totalCount}`
    : `Veículos exibidos: ${filteredCount} de ${totalCount}`;
  doc.text(totalLabel, 14, y);
  y += 6;

  if (keyword && keyword.trim()) {
    doc.setFont('helvetica', 'italic');
    doc.text(`Filtro aplicado: "${keyword.trim()}"`, 14, y);
    doc.setFont('helvetica', 'normal');
    y += 6;
  }

  return y + 2;
};

const buildBody = (vehicles, devicesById) => vehicles.map((v) => [
  (v?.plate || '-').toString(),
  (v?.nickname || '-').toString(),
  (v?.client_name || '-').toString(),
  (v?.make || '-').toString(),
  (v?.model || '-').toString(),
  (v?.year ?? '-').toString(),
  (v?.vehicle_type || '-').toString(),
  formatDeviceCell(v, devicesById),
]);

const buildDocument = (vehicles, devicesById, options = {}) => {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

  const startY = buildHeader(doc, {
    keyword: options.keyword,
    totalCount: options.totalCount ?? vehicles.length,
    filteredCount: vehicles.length,
  });

  autoTable(doc, {
    startY,
    head: [['Placa', 'Apelido', 'Cliente', 'Marca', 'Modelo', 'Ano', 'Tipo', 'Rastreador']],
    body: buildBody(vehicles, devicesById),
    styles: { fontSize: 9, cellPadding: 3, overflow: 'linebreak' },
    headStyles: { fillColor: [59, 130, 246], textColor: 255, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [243, 244, 246] },
    columnStyles: {
      0: { cellWidth: 24 },
      5: { cellWidth: 16, halign: 'center' },
      7: { cellWidth: 50 },
    },
    didDrawPage: (data) => {
      const pageCount = doc.internal.getNumberOfPages();
      const pageSize = doc.internal.pageSize;
      const pageHeight = pageSize.getHeight();
      const pageWidth = pageSize.getWidth();
      doc.setFontSize(8);
      doc.setTextColor(120);
      doc.text(
        `Página ${data.pageNumber} de ${pageCount}`,
        pageWidth - 14,
        pageHeight - 8,
        { align: 'right' },
      );
      doc.setTextColor(0);
    },
  });

  return doc;
};

const buildFilename = () => {
  const date = new Date();
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `veiculos-${yyyy}-${mm}-${dd}.pdf`;
};

export const downloadVehiclesPdf = (vehicles, devicesById, options = {}) => {
  const doc = buildDocument(vehicles, devicesById, options);
  doc.save(buildFilename());
};

export const printVehiclesPdf = (vehicles, devicesById, options = {}) => {
  const doc = buildDocument(vehicles, devicesById, options);
  doc.autoPrint();
  const blobUrl = doc.output('bloburl');
  const printWindow = window.open(blobUrl, '_blank');
  if (!printWindow) {
    doc.save(buildFilename());
  }
};
