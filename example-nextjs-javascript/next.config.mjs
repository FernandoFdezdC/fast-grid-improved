// next.config.mjs

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Headers para SharedArrayBuffer (requerido para Chrome)
  async headers() {
    return [
      {
        source: '/:path*', // Aplica a todas las rutas
        headers: [
          {
            key: 'Cross-Origin-Embedder-Policy',
            value: 'require-corp'
          },
          {
            key: 'Cross-Origin-Opener-Policy',
            value: 'same-origin'
          }
        ]
      }
    ];
  },

  // Configuración de Webpack
  webpack: (config, { isServer, dev }) => {
    // Configuración para workers solo en cliente
    if (!isServer) {
      config.module.rules.push({
        test: /view-worker\.(js|ts)$/, // Acepta JS y TS
        use: [
          {
            loader: 'worker-loader',
            options: {
              inline: 'fallback', // Modo más compatible
              publicPath: '/_next/static/workers/',
              filename: dev 
                ? 'static/workers/[name].js' 
                : 'static/workers/[name].[contenthash].js'
            }
          }
        ]
      });
      
      // Necesario para compatibilidad con workers
      config.output.globalObject = 'self';
      
      // Soporte para SharedArrayBuffer
      config.resolve.fallback = {
        ...config.resolve.fallback,
        buffer: false,
        fs: false
      };
    }

    // Evitar procesar workers en SSR
    config.module.rules.push({
      test: /view-worker\.(js|ts)$/,
      issuer: /node_modules/,
      use: 'null-loader'
    });
    
    return config;
  },

  // Transpilar paquetes específicos
  transpilePackages: ['fast-grid'],
  
  // Configuración experimental
  experimental: {
    workerThreads: true, // Mejor soporte para workers
    cpus: 4, // Optimizar para multi-core
    optimizeCss: true, // Opcional: mejorar rendimiento CSS
  }
};

export default nextConfig;