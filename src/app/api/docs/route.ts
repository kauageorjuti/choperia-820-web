export async function GET() {
  return new Response(`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Choperia 820 — Swagger</title><link rel="stylesheet" href="/swagger/swagger-ui.css"></head><body style="margin:0"><div id="swagger-ui"></div><script src="/swagger/swagger-ui-bundle.js"></script><script>SwaggerUIBundle({url:'/api/openapi',dom_id:'#swagger-ui',withCredentials:true,validatorUrl:null});</script></body></html>`, {headers:{'Content-Type':'text/html; charset=utf-8'}});
}
