import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import { applyPlugin as applyAutoTablePlugin } from 'jspdf-autotable';
import Papa from 'papaparse';

// Aplicar plugin do jsPDF
applyAutoTablePlugin(jsPDF);

// Funções de exportação

export const exportToPDF = (data, columns, filename = 'relatorio.pdf') => {
  const doc = new jsPDF();
  
  // Adicionar título
  doc.setFontSize(16);
  doc.text('Relatório de Gestão de Frota', 14, 22);
  
  // Adicionar data
  doc.setFontSize(10);
  doc.text(`Gerado em: ${new Date().toLocaleDateString('pt-BR')}`, 14, 30);
  
  // Preparar dados para a tabela
  const tableData = data.map(row => 
    columns.map(col => row[col.field] || '')
  );
  
  // Adicionar tabela
  doc.autoTable({
    head: [columns.map(col => col.headerName)],
    body: tableData,
    startY: 40,
    styles: { fontSize: 8 },
    headStyles: { fillColor: [66, 139, 202] }
  });
  
  doc.save(filename);
};

export const exportToExcel = (data, filename = 'relatorio.xlsx') => {
  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Relatório');
  XLSX.writeFile(workbook, filename);
};

export const exportToCSV = (data, filename = 'relatorio.csv') => {
  const csv = Papa.unparse(data);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export const exportData = (data, format, columns, filename) => {
  switch (format) {
    case 'pdf':
      exportToPDF(data, columns, filename);
      break;
    case 'excel':
      exportToExcel(data, filename);
      break;
    case 'csv':
      exportToCSV(data, filename);
      break;
    default:
      console.error('Formato de exportação não suportado:', format);
  }
};
