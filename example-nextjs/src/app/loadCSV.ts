import { Grid } from "@/fast-grid/grid";
import { Cell, Row } from "@/fast-grid/row";
import { Rows } from "@/fast-grid/row-manager/row-manager";

// Función para controlar el rendimiento sin librerías externas
const shouldYield = (lastYieldTime: number, chunkSize = 10000): boolean => {
  return performance.now() - lastYieldTime > 16; // 16ms ≈ 60fps
};

export const loadCSV = async (
  file: File,
  grid: Grid,
  cb: () => void,
  rowCount?: number
) => {
  const rows: Rows = [];
  let cellIndex = 0;
  
  const text = await file.text();
  const lines = text.split('\n').filter(line => line.trim() !== '');
  const [_, ...dataRows] = lines;

  const totalRows = rowCount ? Math.min(rowCount, dataRows.length) : dataRows.length;
  let lastYieldTime = performance.now();

  for (let rowIdx = 0; rowIdx < totalRows; rowIdx++) {
    // Control de rendimiento simplificado
    if (rowIdx % 10000 === 0 && shouldYield(lastYieldTime)) {
      await new Promise(resolve => setTimeout(resolve, 0));
      grid.rowManager.setRows(rows, true);
      lastYieldTime = performance.now();
    }

    const cells: Cell[] = [{
      id: -rowIdx - 1,
      v: String(rowIdx + 1)
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
      } as Cell);
    }

    rows.push({ id: rowIdx, cells } as Row);
  }
  
  await new Promise(resolve => setTimeout(resolve, 0));
  grid.rowManager.setRows(rows);
  cb();

  // Rerender grid:
  grid.computeColumnWidths();
  grid.renderViewportRows();
  grid.renderViewportCells();
  grid.scrollbar.refreshThumb();
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