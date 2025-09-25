/**
 * Cloudflare Worker pour contourner les protections anti-scraping
 * Ce worker agit comme un proxy inverse vers feed.bithumb.com
 */

export default {
  async fetch(request, env, ctx) {
    try {
      // Extraire l'URL cible depuis les paramètres de requête
      const url = new URL(request.url);
      const targetUrl = url.searchParams.get('url') || 'https://feed.bithumb.com/notice?category=9&page=1';
      
      // Headers pour simuler un navigateur réel
      const headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json,text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'ko-KR,ko;q=0.9,en;q=0.8',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      };

      // Effectuer la requête vers Bithumb
      const response = await fetch(targetUrl, {
        method: request.method,
        headers: headers,
        // Désactiver le cache pour avoir les données les plus récentes
        cf: {
          cacheTtl: 0,
          cacheEverything: false
        }
      });

      // Vérifier que la réponse est valide
      if (!response.ok) {
        return new Response(
          JSON.stringify({ 
            error: 'Erreur lors de la récupération des données',
            status: response.status,
            statusText: response.statusText
          }),
          { 
            status: response.status,
            headers: { 'Content-Type': 'application/json' }
          }
        );
      }

      // Retourner la réponse avec les headers CORS appropriés
      const modifiedResponse = new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });

      return modifiedResponse;

    } catch (error) {
      console.error('Erreur dans le worker:', error);
      
      return new Response(
        JSON.stringify({ 
          error: 'Erreur interne du worker',
          message: error.message
        }),
        { 
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }
  }
};
