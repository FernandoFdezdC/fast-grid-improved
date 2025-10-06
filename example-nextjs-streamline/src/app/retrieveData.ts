import { Grid, Cell, Row, Rows } from "fast-grid";

// Performance monitoring function
const shouldYield = (lastYieldTime: number): boolean => {
  return performance.now() - lastYieldTime > 16; // 16ms ≈ 60fps
};

export const initializeGrid = async (
  data: any[], // Array of objects with data
  grid: Grid,
  cb: () => void,
  rowCount?: number
) => {
  const rows: Rows = [];
  let cellIndex = 0;
  
  const totalRows = rowCount ? Math.min(rowCount, data.length) : data.length;
  let lastYieldTime = performance.now();

  // Extract keys from the first object to have consistent ordering
  const keys = data.length > 0 ? Object.keys(data[0]) : [];

  for (let rowIdx = 0; rowIdx < totalRows; rowIdx++) {
    // Performance control
    if (rowIdx % 1000 === 0 && shouldYield(lastYieldTime)) {
      await new Promise(resolve => setTimeout(resolve, 0));
      grid.rowManager.setRows(rows, true);
      lastYieldTime = performance.now();
    }

    const cells: Cell[] = [{
      id: -rowIdx - 1,
      v: String(rowIdx + 1) // Index cell
    }];

    const rowData = data[rowIdx];
    
    // Process each column in consistent order
    for (const key of keys) {
      let value = rowData[key];
      // Handle null
      if (value === null) {
        value = '';
      }
      // Special handling for dates
      if (value instanceof Date) {
        // console.log(value)
        value = value.toISOString();
      }
      // Decimal number handling
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
  
  // Final update
  await new Promise(resolve => setTimeout(resolve, 0));
  grid.rowManager.setRows(rows);
  cb();

  // Update grid
  grid.computeColumnWidths();
  grid.renderViewportRows();
  grid.renderViewportCells();
  grid.scrollbar.refreshThumb();
};

export const updateGrid = async (
  data: any[], // Array of objects with data
  grid: Grid,
) => {
  
  // Get the number of rows in the grid
  const offsetRows = grid.rowManager.rows.length;
  // console.log("num columns: ", Object.keys(data[0]).length)
  let cellIndex = offsetRows*Object.keys(data[0]).length;

  const rows: Rows = [];

  let lastYieldTime = performance.now();

  for (let rowIdx = offsetRows; rowIdx < data.length + offsetRows; rowIdx++) {
    // Simplified performance control
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
      // Manejar null
      if (value === null) {
        value = '';
      }
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
  
  // Add the remaining rows
  if (rows.length > 0) {
    grid.rowManager.addRows(rows);
  }

  // Update grid
  // grid.computeColumnWidths();
  grid.renderViewportRows();
  grid.renderViewportCells();
  grid.scrollbar.refreshThumb();
};

// Function to simulate loading from the backend
export const loadWholeDataFromBackend = async (
  offset: number = 0,
  limit: number = 500
): Promise<any[]> => {
  try {
    const response = await fetch(`http://localhost:8000/api/stream?table=seguimientoventas&offset=${offset}&limit=${limit}`);
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

// Function to simulate loading from the backend
export const loadDataByChunksFromBackend = async (
  offset: number = 0,
  limit: number = 500
): Promise<any[]> => {
  try {
    const response = await fetch(`http://localhost:8000/api/stream?table=seguimientoventas&offset=${offset}&limit=${limit}`);
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

// Recursive function to handle nested objects
const extractNestedKeys = (obj: any, prefix: string, columnSet: Set<string>) => {
  for (const key in obj) {
    if (typeof obj[key] === 'object' && obj[key] !== null) {
      // Recursion for nested objects
      extractNestedKeys(obj[key], `${prefix}${key}.`, columnSet);
    } else {
      // Add full key with prefix
      columnSet.add(`${prefix}${key}`);
    }
  }
};

// Auxiliary function to extract column names
const extractColumnNames = (data: any[]): string[] => {
  if (data.length === 0) return [];
  
  const columnSet = new Set<string>();
  
  // Scan through all objects to find all possible keys
  data.forEach(item => {
    if (typeof item === 'object' && item !== null) {
      // Extract keys from the current object
      Object.keys(item).forEach(key => {
        columnSet.add(key);
      });
      
      // Handle nested objects (optional)
      extractNestedKeys(item, '', columnSet);
    }
  });
  
  return Array.from(columnSet);
};

export const getJSONColumns = async (
  jsonInput: any[] | string | File
): Promise<string[]> => {
  let data: any[] = [];

  // Handle different types of input
  if (Array.isArray(jsonInput)) {
    data = jsonInput;
  } 
  else if (typeof jsonInput === 'string') {
    try {
      // Parse if it is a JSON string
      data = JSON.parse(jsonInput);
    } catch {
      // Assume it is a URL
      const response = await fetch(jsonInput);
      data = await response.json();
    }
  } 
  else if (jsonInput instanceof File) {
    // Leer y parsear archivo
    const text = await jsonInput.text();
    data = JSON.parse(text);
  }

  // Extract columns from data
  return extractColumnNames(data);
};