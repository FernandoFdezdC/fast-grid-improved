"use client";

import clsx from "clsx";
import Stats from "stats.js";
import { Analytics } from "@vercel/analytics/react";
import { Grid } from "fast-grid";
import { FilterCell, HeaderCell } from "fast-grid";
import { initializeGrid, updateGrid, loadWholeDataFromBackend, getJSONColumns } from "@/app/retrieveData";
import { useState, useRef, useEffect, useCallback } from "react";

interface ChunkData {
  chunk_index: number;
  rows: unknown[];
}

declare global {
  interface Window {
    __grid?: Grid;
  }
}

interface Metadata {
  total_rows: number;
  effective_limit: number;
  chunk_size: number;
  num_chunks: number;
}

export default function Home() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [grid, setGrid] = useState<Grid | null>(null);
  const [speed, setSpeed] = useState(0);
  const [rowCount, setRowCount] = useState<number>(0);
  const [stressTest, setStressTest] = useState(false);
  const [loadingRows, setLoadingRows] = useState(false);
  const [autoScroller, setAutoScroller] = useState<AutoScroller | null>(null);

  // Use useRef to keep a reference to the load function
  const loadMoreRef = useRef<(() => void) | null>(null);
  const [containerReady, setContainerReady] = useState(false);

  let filterParams = "%26Producto%3D0+min+%252B+0MB";

  useEffect(() => {
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.contentRect.height > 0) {
          setContainerReady(true);
          observer.disconnect();
        }
      }
    });

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => observer.disconnect();
  }, []);

  // Add states to control the load
  const isFetchingRef = useRef(false);

  // Function to load more data
  const loadMoreData = useCallback(async () => {
    if (!grid) return;

    // ❌ If is fetching, return null
    if (isFetchingRef.current) return;

    console.log("LOAD MORE DATA");
    isFetchingRef.current = true;

    try {
      const controller = new AbortController();
      const signal = controller.signal;
      
      // Timeout para evitar bloqueos
      const timeoutId = setTimeout(() => {
        console.warn('[TIMEOUT] The application took too long, aborting...');
        controller.abort();
      }, 30000);  // 30 segundos timeout

      console.log('[FETCH] Calling endpoint http://localhost:8000/api/stream?table=seguimientoventas&offset='+grid.rowManager.rows.length+`&limit=50&filters=${filterParams}`);
      const response = await fetch('http://localhost:8000/api/stream?table=seguimientoventas&offset='+grid.rowManager.rows.length+`&limit=50&filters=${filterParams}`, {
        signal
      });
      
      clearTimeout(timeoutId);
      console.log('[FETCH] Response received. State:', response.status);
      
      if (!response.ok) {
        console.error('[ERROR] Respuesta no OK:', response.status, response.statusText);
        throw new Error(`HTTP ${response.status}`);
      }
      
      if (!response.body) {
        console.error('[ERROR] Response.body is null');
        throw new Error('No response body received');
      }
      
      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let buffer = '';
      let metadata: Metadata | null = null;
      let chunkCount = 0;
      
      try {
        while (true) {
          console.log('[READER] Reading chunk...');
          const { done, value } = await reader.read();
          console.log('[READER] Result:', { done, value: value ? `bytes:${value.length}` : 'null' });
          
          if (done) {
            console.log('[STREAM] Stream completed by done=true');
            break;
          }
          
          const decodedChunk = decoder.decode(value, { stream: true });
          console.log('[DECODER] Chunk decodified:', decodedChunk.length, 'characters');
          buffer += decodedChunk;
          console.log('[BUFFER] Current buffer:', buffer.length, 'characters');
          
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';
          console.log('[PARSER] Complete lines:', lines.length, 'Pending buffer:', buffer.length);
          
          for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            // console.log(`[LINE ${i}] Contenido:`, line);
            
            if (!line.trim()) {
              console.log('[LINE SKIP] Empty line, omitting');
              continue;
            }
            
            if (line.trim() === '[END]') {
              console.log('[END] End marker received');
              return;
            }
            
            try {
              console.log('[PARSE] Parsing JSON...');
              const data = JSON.parse(line);
              console.log('[PARSE] JSON parsed:', data);
              
              if (data.error) {
                console.error('[BACKEND ERROR] Server error:', data.error);
                throw new Error(data.error);
              }
              
              if (!metadata) {
                console.log('[METADATA] Received metadata:', data);
                metadata = data as Metadata;
                continue;
              }
              
              const chunk = data as ChunkData;
              console.log(`[CHUNK] Receiving chunk ${chunk.chunk_index + 1}/${metadata.num_chunks} con ${chunk.rows.length} filas`);
              // console.log("New rows: ", chunk.rows);

              // Update grid with new rows
              // console.log("grid: ", grid);
              await updateGrid(chunk.rows, grid!);
              setRowCount(grid.rowManager.rows.length);

              // ———> here: let the browser breathe
              await new Promise(resolve => requestAnimationFrame(resolve));

              chunkCount++;
              console.log("CHUNK COUNT: ", chunkCount)
            } catch (parseError) {
              console.error('[PARSE ERROR] Error parsing JSON:', parseError);
              console.error('[RAW DATA] Problematic content:', line);
              throw new Error(`Parsing error: ${parseError}`);
            }
          }
        }
      } finally {
        console.log('[CLEANUP] Releasing reader...');
        reader.releaseLock();
        isFetchingRef.current = false;
      }
    } catch (error) {
      console.error('[PROCESS ERROR] Error in processStream:', error);
      if (error instanceof Error) {
        console.error('[ERROR DETAILS]', error.name, error.message, error.stack);
      }
    } finally {
      isFetchingRef.current = false; // process ended
    }
  }, [grid]);

  // Update the reference when the function changes
  useEffect(() => {
    // console.log("Number of rows: ", grid?.rowManager.rows.length)
    loadMoreRef.current = loadMoreData;
  }, [loadMoreData]);

  // Modify the callback in the grid to use debounce
  useEffect(() => {
    if (!grid) return;
    
    // Implement manual debounce
    let timeoutId: NodeJS.Timeout;
    
    grid.onReachBottom = () => {
      if (timeoutId) clearTimeout(timeoutId);
      
      timeoutId = setTimeout(() => {
        console.log("Reached bottom! Triggering load more...");
        if (loadMoreRef.current && !isFetchingRef.current) {
          loadMoreRef.current();
        }
      }, 100); // 100ms debounce
    };
  }, [grid]);

  useEffect(() => {
    if (!containerReady) return;
    const container = containerRef.current;
    if (!container) return;
    if (grid) grid.destroy();

    const loadAndInitialize = async () => {
      try {
        const gridFirstData = await loadWholeDataFromBackend(0, 25, filterParams);
        const dataColumns = await getJSONColumns(gridFirstData);
        
        await new Promise(resolve => setTimeout(resolve, 0));
        
        const newGrid = new Grid(container, [], ['Index', ...dataColumns]);
        setGrid(newGrid);

        // Configure callback for when the end is reached
        newGrid.onReachBottom = () => {
          console.log("Reached bottom! Triggering load more...");
          if (loadMoreRef.current) {
            loadMoreRef.current();
          }
        };

        setLoadingRows(true);
        await initializeGrid(gridFirstData, newGrid, () => setLoadingRows(false));

        setRowCount(newGrid.rowManager.rows.length);
        
        const autoScroller = new AutoScroller(newGrid);
        setAutoScroller(autoScroller);
        window.__grid = newGrid;
        
      } catch (error) {
        console.error('Error:', error);
        setLoadingRows(false);
      }
    };

    loadAndInitialize();
    
  }, [containerReady]);


  useEffect(() => {
    if (grid == null || !stressTest) return;
    const id = setInterval(() => {
      const filters = grid.rowManager.view.filter;

      if (filters[0] == null || filters[0].length < 5) {
        filters[0] =
          (filters[0] ?? "") + Math.floor(Math.random() * 10).toString();
      } else {
        delete filters[0];
      }

      // manually trigger refresh of filter cells.. make it part of updating the filter
      for (const header of grid.headerRows) {
        for (const cell of Object.values(header.cellComponentMap)) {
          if (cell instanceof FilterCell) {
            if (cell.index === 0) {
              cell.el.style.backgroundColor = "rgb(239, 68, 68)";
              cell.input.style.backgroundColor = "rgb(239, 68, 68)";
              cell.input.style.color = "white";
              cell.input.placeholder = "";
              cell.syncToFilter();
            }
          }
          else if (cell instanceof HeaderCell) {
            if (cell.index === 0) {
              cell.arrow.style.fill = "white";
              cell.syncToFilter();
            }
          }
        }
      }

      grid.rowManager.runFilter();
    }, 333);
    return () => {
      // manually trigger refresh of filter cells.. make it part of updating the filter
      for (const header of grid.headerRows) {
        for (const cell of Object.values(header.cellComponentMap)) {
          if (cell instanceof FilterCell) {
            if (cell.index === 0) {
              delete grid.rowManager.view.filter[0];
              cell.el.style.backgroundColor = "white";
              cell.input.style.backgroundColor = "white";
              cell.input.style.color = "black";
              cell.input.placeholder = "Filtrar...";
              cell.syncToFilter();
            }
          }
          else if (cell instanceof HeaderCell) {
            if (cell.index === 0) {
              cell.arrow.style.fill = "black";
              cell.syncToFilter();
            }
          }
        }
      }
      grid.rowManager.runFilter();
      clearInterval(id);
    };
  }, [grid, stressTest]);

  useEffect(() => {
    if (autoScroller == null) return;
    autoScroller.start(speed === 0 ? 0 : Math.exp(speed / 15));
  }, [autoScroller, speed]);

  // Stats
  useEffect(() => {
    // Verify that we are at the customer
    if (typeof window !== 'undefined') {
      const setupFPS = () => {
        const stats = new Stats();
        stats.showPanel(0);
        stats.dom.style.top = "unset";
        stats.dom.style.left = "unset";
        stats.dom.style.bottom = "0";
        stats.dom.style.right = "0";

        for (const child of stats.dom.children) {
          // @ts-expect-error ddd
          child.style.width = "160px";
          // @ts-expect-error ddd
          child.style.height = "96px";
        }
        
        document.body.appendChild(stats.dom);
        
        const animate = () => {
          stats.update();
          window.requestAnimationFrame(animate);
        };
        window.requestAnimationFrame(animate);
      };
      
      setupFPS();
    }
  }, []);
  
  return (
    <main className="flex min-h-screen flex-col items-center p-4 sm:p-8 w-full">
      <Analytics />

      {/* Centered header */}
      <div className="flex flex-col items-center w-full max-w-6xl mb-1"> {/* Contenedor para centrar contenido */}
        <h1 className="text-lg font-bold sm:text-xl md:text-3xl text-center mb-0">
          World&apos;s most performant DOM-based table in Next.js
        </h1>
        <div className="mt-1 text-center max-w-2xl">
          Try make the fps counter drop by filtering, sorting, and scrolling simultaneously
        </div>
        <div className="mb-2 mt-1 text-sm text-center">
          See code:
          <a
            className="ml-1 text-blue-600 underline hover:text-blue-800"
            href="https://github.com/gabrielpetersson/fast-grid/"
          >
            https://github.com/gabrielpetersson/fast-grid/
          </a>
        </div>
      </div>

      {/* Controls */}
      <div className={clsx(
        "flex flex-col sm:flex-row flex-wrap justify-between gap-4 py-2 w-full max-w-6xl",
        loadingRows && "pointer-events-none select-none opacity-60"
      )}>
        <div className="hidden w-[150px] md:block" />

        <div className="flex gap-2 text-[11px] md:gap-8 md:text-[13px]">
          <div className="flex items-center">
            <span className="mr-2 whitespace-nowrap">Scroll speed:</span>
            <input
              type="range"
              min="0"
              max="100"
              value={speed}
              onChange={(e) => setSpeed(Number(e.target.value))}
              className={clsx(
                "h-2 w-full cursor-pointer appearance-none rounded-full bg-gray-300",
                speed === 100 &&
                  "[&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-none [&::-moz-range-thumb]:bg-red-500 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-red-500"
              )}
            />
          </div>

          <button
            className={clsx(
              "flex h-[28px] w-[200px] items-center justify-center gap-0.5 rounded bg-blue-500 text-white hover:opacity-95 active:opacity-90 cursor-pointer transition-opacity",
              stressTest && "bg-red-500"
            )}
            onClick={() => {
              if (stressTest) {
                setStressTest(false);
                setSpeed(0);
              } else {
                setStressTest(true);
                setSpeed(100);
              }
            }}
          >
            {stressTest && (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-[14px] w-[14px]"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            )}
            {stressTest ? "Filtering 3 times per second" : "Stress test"}
          </button>
        </div>
        <span className="h-[28px] w-[150px] flex items-center justify-center rounded border border-gray-800 bg-white text-[12px] text-gray-700 shadow-[rgba(0,_0,_0,_0.1)_0px_0px_2px_1px] md:flex">
          {rowCount.toLocaleString()} rows
        </span>

        {rowCount > 1_000_000 && (
          <div className="text-xs text-red-500 -mt-1 ml-2"> {/* Ajuste de posición */}
            ¡Advertencia! Valores altos pueden consumir mucha memoria
          </div>
        )}
      </div>
      {/* Grid */}
      <div className="w-full max-w-10xl -mt-4 -mb-6">
        <div
          ref={containerRef}
          style={{ contain: "strict", minHeight: "540px" }}
          className={clsx(
            "relative box-border w-full flex-1 overflow-clip border border-gray-700 bg-white mt-4",
            loadingRows && "pointer-events-none opacity-70"
          )}
        />
      </div>
    </main>
  );
};


class AutoScroller {
  grid: Grid;
  running: boolean;
  toBottom: boolean;
  version: number;
  constructor(grid: Grid) {
    this.grid = grid;
    this.running = true;
    this.toBottom = true;
    this.version = 0;
  }
  start(speed: number) {
    this.version++;

    const currentVersion = this.version;

    const cb = () => {
      const state = this.grid.getState();
      if (this.version !== currentVersion) {
        return;
      }

      if (
        this.grid.offsetY >
        state.tableHeight - this.grid.viewportHeight - 1
      ) {
        this.toBottom = false;
      } else if (this.grid.offsetY <= 0) {
        this.toBottom = true;
      }
      const delta = this.toBottom ? speed : -speed;

      const wheelEvent = new WheelEvent("wheel", {
        deltaY: delta,
        deltaMode: 0,
      });
      this.grid.container.dispatchEvent(wheelEvent);

      window.requestAnimationFrame(cb);
    };
    window.requestAnimationFrame(cb);
  }
}