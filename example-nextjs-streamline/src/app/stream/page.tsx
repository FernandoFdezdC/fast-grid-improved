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
  const [progress, setProgress] = useState<string>('Iniciando...');
  const [isComplete, setIsComplete] = useState<boolean>(false);
  const [gridRows, setGridRows] = useState<any[]>([]);
  const [lastChunk, setLastChunk] = useState<any[]>([]);

  useEffect(() => {
    console.log('[DEBUG] useEffect iniciado');
    const processStream = async () => {
      try {
        console.log('[DEBUG] Iniciando processStream');
        setProgress('Solicitando datos...');
        
        const controller = new AbortController();
        const signal = controller.signal;
        
        // Timeout para evitar bloqueos
        const timeoutId = setTimeout(() => {
          console.warn('[TIMEOUT] La solicitud tardó demasiado, abortando...');
          controller.abort();
          setProgress('Timeout: La solicitud tardó demasiado');
        }, 30000);  // 30 segundos timeout

        console.log('[FETCH] Realizando petición a http://localhost:8000/api/datos...');
        const response = await fetch('http://localhost:8000/api/datos?offset=0&limit=10000', {
          signal
        });
        
        clearTimeout(timeoutId);
        console.log('[FETCH] Respuesta recibida. Estado:', response.status);
        
        if (!response.ok) {
          console.error('[ERROR] Respuesta no OK:', response.status, response.statusText);
          throw new Error(`HTTP ${response.status}`);
        }
        
        if (!response.body) {
          console.error('[ERROR] Response.body es null');
          throw new Error('No se recibió cuerpo de respuesta');
        }
        
        console.log('[STREAM] Iniciando lectura del stream...');
        const reader = response.body.getReader();
        const decoder = new TextDecoder('utf-8');
        let buffer = '';
        let metadata: Metadata | null = null;
        let chunkCount = 0;
        
        try {
          while (true) {
            console.log('[READER] Leyendo chunk...');
            const { done, value } = await reader.read();
            console.log('[READER] Resultado:', { done, value: value ? `bytes:${value.length}` : 'null' });
            
            if (done) {
              console.log('[STREAM] Stream completado por done=true');
              setIsComplete(true);
              setProgress('Stream completo');
              break;
            }
            
            const decodedChunk = decoder.decode(value, { stream: true });
            console.log('[DECODER] Chunk decodificado:', decodedChunk.length, 'caracteres');
            buffer += decodedChunk;
            console.log('[BUFFER] Buffer actual:', buffer.length, 'caracteres');
            
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';
            console.log('[PARSER] Líneas completas:', lines.length, 'Buffer pendiente:', buffer.length);
            
            for (let i = 0; i < lines.length; i++) {
              const line = lines[i];
              console.log(`[LINE ${i}] Contenido:`, line);
              
              if (!line.trim()) {
                console.log('[LINE SKIP] Línea vacía, omitiendo');
                continue;
              }
              
              if (line.trim() === '[END]') {
                console.log('[END] Marcador de final recibido');
                setIsComplete(true);
                setProgress('Stream completado correctamente');
                return;
              }
              
              try {
                console.log('[PARSE] Intentando parsear JSON...');
                const data = JSON.parse(line);
                console.log('[PARSE] JSON parseado:', data);
                
                if (data.error) {
                  console.error('[BACKEND ERROR] Error del servidor:', data.error);
                  throw new Error(data.error);
                }
                
                if (!metadata) {
                  console.log('[METADATA] Recibidos metadatos:', data);
                  metadata = data as Metadata;
                  setProgress(`Esperando ${metadata.num_chunks} chunks...`);
                  continue;
                }
                
                const chunk = data as ChunkData;
                console.log(`[CHUNK] Recibido chunk ${chunk.chunk_index + 1}/${metadata.num_chunks} con ${chunk.rows.length} filas`);
                
                // Actualizar estado con las nuevas filas
                setGridRows(prevRows => {
                  const newRows = [...prevRows, ...chunk.rows];
                  console.log(`[STATE] Total de filas: ${newRows.length}`);
                  return newRows;
                });

                // **guarda solo el chunk actual**
                setLastChunk(chunk.rows);
                
                setProgress(`Chunk ${chunk.chunk_index + 1}/${metadata.num_chunks} recibido`);
                chunkCount++;
              } catch (parseError) {
                console.error('[PARSE ERROR] Error al parsear JSON:', parseError);
                console.error('[RAW DATA] Contenido problemático:', line);
                throw new Error(`Error de parseo: ${parseError}`);
              }
            }
          }
        } finally {
          console.log('[CLEANUP] Liberando lector...');
          reader.releaseLock();
        }
      } catch (error) {
        console.error('[PROCESS ERROR] Error en processStream:', error);
        if (error instanceof Error) {
          console.error('[ERROR DETAILS]', error.name, error.message, error.stack);
        }
        setProgress(`Error: ${(error as Error).message}`);
      }
    };

    processStream();
    
    return () => {
      console.log('[UNMOUNT] Componente desmontado, limpieza');
    };
  }, []);

  return (
    <div className="stream-processor">
      <h1>Procesamiento de Stream</h1>
      <div className="progress-status">{progress}</div>
      {isComplete && (
        <div className="completion-message">
          ¡Proceso completado! Filas recibidas: {gridRows.length}
        </div>
      )}
      
      <div className="data-preview">
        <h3>Vista previa de datos:</h3>
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
        <h3>Último chunk recibido:</h3>
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