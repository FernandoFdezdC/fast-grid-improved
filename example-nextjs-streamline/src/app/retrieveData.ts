import { Grid, Cell, Row, Rows } from "fast-grid";

// Función para controlar el rendimiento
const shouldYield = (lastYieldTime: number): boolean => {
  return performance.now() - lastYieldTime > 16; // 16ms ≈ 60fps
};

export const initializeGrid = async (
  data: any[], // Array de objetos con los datos
  grid: Grid,
  cb: () => void,
  rowCount?: number
) => {
  const rows: Rows = [];
  let cellIndex = 0;
  
  const totalRows = rowCount ? Math.min(rowCount, data.length) : data.length;
  let lastYieldTime = performance.now();

  // Extraer keys del primer objeto para tener orden consistente
  const keys = data.length > 0 ? Object.keys(data[0]) : [];

  for (let rowIdx = 0; rowIdx < totalRows; rowIdx++) {
    // Control de rendimiento
    if (rowIdx % 1000 === 0 && shouldYield(lastYieldTime)) {
      await new Promise(resolve => setTimeout(resolve, 0));
      grid.rowManager.setRows(rows, true);
      lastYieldTime = performance.now();
    }

    const cells: Cell[] = [{
      id: -rowIdx - 1,
      v: String(rowIdx + 1) // Celda de índice
    }];

    const rowData = data[rowIdx];
    
    // Procesar cada columna en orden consistente
    for (const key of keys) {
      let value = rowData[key];
      
      // Manejo especial para fechas
      if (value instanceof Date) {
        value = value.toISOString();
      }
      // Manejo de números decimales
      else if (typeof value === 'number' && !Number.isInteger(value)) {
        value = parseFloat(value.toFixed(4));
      }
      
      cells.push({
        id: cellIndex++,
        v: value
      } as Cell);
    }

    rows.push({ id: rowIdx, cells } as Row);
  }
  
  // Actualización final
  await new Promise(resolve => setTimeout(resolve, 0));
  grid.rowManager.setRows(rows);
  cb();

  // Actualizar grid
  grid.computeColumnWidths();
  grid.renderViewportRows();
  grid.renderViewportCells();
  grid.scrollbar.refreshThumb();
};

export const updateGrid = async (
  data: any[], // Array de objetos con los datos
  grid: Grid,
) => {
  
  // Obtener el número de filas existentes en el grid
  const offsetRows = grid.rowManager.rows.length;
  // console.log("num columns: ", Object.keys(data[0]).length)
  let cellIndex = offsetRows*Object.keys(data[0]).length;

  const rows: Rows = [];

  let lastYieldTime = performance.now();

  for (let rowIdx = offsetRows; rowIdx < data.length + offsetRows; rowIdx++) {
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

    const columns = data[rowIdx-offsetRows];
    // console.log("columns: ", columns)
    
    for (const key in columns) {
      let value: string | number = columns[key];
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
  
  // Añadir las filas restantes
  if (rows.length > 0) {
    grid.rowManager.addRows(rows);
  }

  // Actualizar grid
  // grid.computeColumnWidths();
  grid.renderViewportRows();
  grid.renderViewportCells();
  grid.scrollbar.refreshThumb();
};

// Función para simular carga desde el backend
export const loadWholeDataFromBackend = async (
  offset: number = 0,
  limit: number = 500
): Promise<any[]> => {
  try {
    const response = await fetch(`http://localhost:8000/api/datos?offset=${offset}&limit=${limit}`);
    if (!response.ok) throw new Error('Error fetching data');
    
    const reader = response.body?.getReader();
    if (!reader) throw new Error('No readable stream');
    
    const decoder = new TextDecoder();
    let buffer = '';
    let chunks: any[] = [];
    let metadata: any = null;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';
      
      for (const line of lines) {
        if (!line.trim()) continue;
        
        const data = JSON.parse(line);
        
        if (!metadata) {
          metadata = data;
          continue;
        }
        
        if (data.rows) {
          chunks = [...chunks, ...data.rows];
        }
      }
    }
    
    return chunks;
  } catch (error) {
    console.error('Error loading data:', error);
    return [];
  }
};

// Función para simular carga desde el backend
export const loadDataByChunksFromBackend = async (
  offset: number = 0,
  limit: number = 500
): Promise<any[]> => {
  try {
    const response = await fetch(`http://localhost:8000/api/datos?offset=${offset}&limit=${limit}`);
    if (!response.ok) throw new Error('Error fetching data');
    
    const reader = response.body?.getReader();
    if (!reader) throw new Error('No readable stream');
    
    const decoder = new TextDecoder();
    let buffer = '';
    let chunks: any[] = [];
    let metadata: any = null;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';
      
      for (const line of lines) {
        if (!line.trim()) continue;
        
        const data = JSON.parse(line);
        
        if (!metadata) {
          metadata = data;
          continue;
        }
        
        if (data.rows) {
          chunks = [...chunks, ...data.rows];
        }
      }
    }
    
    return chunks;
  } catch (error) {
    console.error('Error loading data:', error);
    return [];
  }
};

// Función recursiva para manejar objetos anidados
const extractNestedKeys = (obj: any, prefix: string, columnSet: Set<string>) => {
  for (const key in obj) {
    if (typeof obj[key] === 'object' && obj[key] !== null) {
      // Recursión para objetos anidados
      extractNestedKeys(obj[key], `${prefix}${key}.`, columnSet);
    } else {
      // Añadir clave completa con prefijo
      columnSet.add(`${prefix}${key}`);
    }
  }
};

// Función auxiliar para extraer nombres de columnas
const extractColumnNames = (data: any[]): string[] => {
  if (data.length === 0) return [];
  
  const columnSet = new Set<string>();
  
  // Recorrer todos los objetos para encontrar todas las posibles claves
  data.forEach(item => {
    if (typeof item === 'object' && item !== null) {
      // Extraer claves del objeto actual
      Object.keys(item).forEach(key => {
        columnSet.add(key);
      });
      
      // Manejar objetos anidados (opcional)
      extractNestedKeys(item, '', columnSet);
    }
  });
  
  return Array.from(columnSet);
};

export const getJSONColumns = async (
  jsonInput: any[] | string | File
): Promise<string[]> => {
  let data: any[] = [];

  // Manejar diferentes tipos de entrada
  if (Array.isArray(jsonInput)) {
    data = jsonInput;
  } 
  else if (typeof jsonInput === 'string') {
    try {
      // Parsear si es un string JSON
      data = JSON.parse(jsonInput);
    } catch {
      // Asumir que es una URL
      const response = await fetch(jsonInput);
      data = await response.json();
    }
  } 
  else if (jsonInput instanceof File) {
    // Leer y parsear archivo
    const text = await jsonInput.text();
    data = JSON.parse(text);
  }

  // Extraer columnas de los datos
  return extractColumnNames(data);
};