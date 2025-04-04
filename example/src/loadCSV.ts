import { isTimeToYield, yieldControl } from "main-thread-scheduling";
import { Grid } from "../../src/grid";
import { Cell, Row } from "../../src/row";
import { Rows } from "../../src/row-manager/row-manager";

export const loadCSV = async (
  file: File,
  grid: Grid,
  cb: () => void,
  rowCount?: number // Parámetro opcional si quieres limitar filas
) => {
  const rows: Rows = [];
  let cellIndex = 0;
  
  const text = await file.text();
  const lines = text.split('\n').filter(line => line.trim() !== '');
  const [_, ...dataRows] = lines;

  // Usar rowCount si está definido, de lo contrario procesar todas las filas
  const totalRows = rowCount ? Math.min(rowCount, dataRows.length) : dataRows.length;

  for (let rowIdx = 0; rowIdx < totalRows; rowIdx++) {
    if (rowIdx % 10000 === 0 && isTimeToYield("background")) {
      await yieldControl("background");
      grid.rowManager.setRows(rows, true);
    }

    const cells: Cell[] = [{
      id: -rowIdx - 1,
      v: String(rowIdx + 1) // Celda de índice/número de fila
    }];

    const columns = dataRows[rowIdx].split(',');
    
    for (const column of columns) {
      let value: string | number = column.trim();
      const numericValue = Number(value);
      
      if (!isNaN(numericValue) && value !== "") {
        value = numericValue;
      }

      cells.push({
        id: cellIndex++,
        v: value
      });
    }

    rows.push({ id: rowIdx, cells } satisfies Row);
  }

  await yieldControl("background");
  grid.rowManager.setRows(rows);
  cb();
};

// Función para obtener el archivo desde public/
export const getCSVFromPublic = async (): Promise<File> => {
  const response = await fetch('/parque.csv');
  const blob = await response.blob();
  return new File([blob], 'parque.csv', { type: 'text/csv' });
};

export const getCSVColumns = async (csvInput: File | string): Promise<string[]> => {
  // Obtener el texto del CSV
  const text = typeof csvInput === 'string' 
    ? csvInput 
    : await csvInput.text();

  // Procesar el contenido
  const lines = text.split('\n').filter(line => line.trim() !== '');
  
  if (lines.length === 0) return [];
  
  // Extraer la primera línea (encabezados)
  const headerLine = lines[0];
  
  // Dividir y limpiar los nombres de columna
  return headerLine.split(',').map(column => {
    // Eliminar espacios y comillas sobrantes
    let cleaned = column.trim();
    cleaned = cleaned.replace(/^"(.*)"$/, '$1'); // Quitar comillas circundantes
    cleaned = cleaned.replace(/\s+/g, ' ');      // Normalizar espacios
    return cleaned;
  });
};