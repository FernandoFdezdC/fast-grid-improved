"use client";

import { useEffect, useState } from 'react';

interface ChunkData {
  chunk_index: number;
  rows: any[];
}

interface Metadata {
  total_rows: number;
  effective_limit: number;
  chunk_size: number;
  num_chunks: number;
}

const StreamProcessor = () => {
  const [progress, setProgress] = useState<string>('Initializing...');
  const [isComplete, setIsComplete] = useState<boolean>(false);
  const [gridRows, setGridRows] = useState<any[]>([]);
  const [lastChunk, setLastChunk] = useState<any[]>([]);

  useEffect(() => {
    console.log('[DEBUG] useEffect initialized');
    const processStream = async () => {
      try {
        console.log('[DEBUG] Starting processStream');
        setProgress('Requesting data...');
        
        const controller = new AbortController();
        const signal = controller.signal;
        
        // Timeout para evitar bloqueos
        const timeoutId = setTimeout(() => {
          console.warn('[TIMEOUT] The application took too long, aborting...');
          controller.abort();
          setProgress('Timeout: Request took too long');
        }, 30000);  // 30 seconds timeout

        console.log('[FETCH] Calling endpoint http://localhost:8000/api/stream...');
        const response = await fetch('http://localhost:8000/api/stream?table=seguimientoventas&offset=0&limit=10000', {
          signal
        });
        
        clearTimeout(timeoutId);
        console.log('[FETCH] Response received. State:', response.status);
        
        if (!response.ok) {
          console.error('[ERROR] Response not OK:', response.status, response.statusText);
          throw new Error(`HTTP ${response.status}`);
        }
        
        if (!response.body) {
          console.error('[ERROR] Response.body is null');
          throw new Error('No response body received');
        }
        
        console.log('[STREAM] Starting stream reading...');
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
              setIsComplete(true);
              setProgress('Stream completed');
              break;
            }
            
            const decodedChunk = decoder.decode(value, { stream: true });
            console.log('[DECODER] Chunk decodified:', decodedChunk.length, 'characters');
            buffer += decodedChunk;
            console.log('[BUFFER] Current buffer:', buffer.length, 'characters');
            
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';
            console.log('[PARSER] Completed lines:', lines.length, 'Buffer pending:', buffer.length);
            
            for (let i = 0; i < lines.length; i++) {
              const line = lines[i];
              console.log(`[LINE ${i}] Content:`, line);
              
              if (!line.trim()) {
                console.log('[LINE SKIP] Empty line, omitting');
                continue;
              }
              
              if (line.trim() === '[END]') {
                console.log('[END] End marker received');
                setIsComplete(true);
                setProgress('Stream completed successfully');
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
                  setProgress(`Awaiting ${metadata.num_chunks} chunks...`);
                  continue;
                }
                
                const chunk = data as ChunkData;
                console.log(`[CHUNK] Received chunk ${chunk.chunk_index + 1}/${metadata.num_chunks} con ${chunk.rows.length} filas`);
                
                // Actualizar estado con las nuevas filas
                setGridRows(prevRows => {
                  const newRows = [...prevRows, ...chunk.rows];
                  console.log(`[STATE] Row number: ${newRows.length}`);
                  return newRows;
                });

                // **guarda solo el chunk actual**
                setLastChunk(chunk.rows);
                
                setProgress(`Chunk ${chunk.chunk_index + 1}/${metadata.num_chunks} received`);
                chunkCount++;
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
        }
      } catch (error) {
        console.error('[PROCESS ERROR] Error in processStream:', error);
        if (error instanceof Error) {
          console.error('[ERROR DETAILS]', error.name, error.message, error.stack);
        }
        setProgress(`Error: ${(error as Error).message}`);
      }
    };

    processStream();
    
    return () => {
      console.log('[UNMOUNT] Component disassembled, cleaning');
    };
  }, []);

  return (
    <div className="stream-processor">
      <h1>Procesamiento de Stream</h1>
      <div className="progress-status">{progress}</div>
      {isComplete && (
        <div className="completion-message">
          Process completed! Received rows: {gridRows.length}
        </div>
      )}
      
      <div className="data-preview">
        <h3>Data preview:</h3>
        {gridRows.slice(0, 5).map((row, index) => (
          <div key={index} className="row-preview">
            {JSON.stringify(row.Codigo_Pas)}
          </div>
        ))}
        {gridRows.length > 5 && (
          <div className="more-rows">...y {gridRows.length - 5} filas adicionales</div>
        )}
      </div>
      <div className="data-preview">
        <h3>Last received chunk:</h3>
        {lastChunk.map((row, i) => (
          <div key={i} className="row-preview">
            {JSON.stringify(row.Codigo_Pas)}
          </div>
        ))}
      </div>
    </div>
  );
};

export default StreamProcessor;