declare module 'cloudflare-scraper' {
  interface CloudflareScraper {
    get(url: string, options?: any): Promise<any>;
    post(url: string, options?: any): Promise<any>;
  }
  
  const cloudflareScraper: CloudflareScraper;
  export = cloudflareScraper;
}
