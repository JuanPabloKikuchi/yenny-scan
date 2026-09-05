export default async function handler(req, res) {
  const isbn = (req.query.isbn || '').replace(/\D/g, '')
  if (!isbn) return res.status(400).json({ error: 'isbn requerido' })
  let titulo = 'Libro ' + isbn, autor = '', tapa = `https://covers.openlibrary.org/b/isbn/${isbn}-L.jpg`
  let precio = null
  const url = `https://www.yenny-elateneo.com/${isbn}`
  try {
    const g = await fetch(`https://openlibrary.org/isbn/${isbn}.json`).then(r=>r.json())
    if(g.title) titulo = g.title
    if(g.authors?.[0]?.key){
      const a = await fetch(`https://openlibrary.org${g.authors[0].key}.json`).then(r=>r.json())
      autor = a.name || ''
    }
  } catch {}
  try {
    const html = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0', 'Accept-Language': 'es-AR' } }).then(r=>r.text())
    const m1 = html.match(/"price"\s*:\s*"([\d.,]+)"/) || html.match(/"price"\s*:\s*([\d.,]+)/)
    const m2 = html.match(/itemprop="price" content="([^"]+)/)
    if(m1) precio = '$ ' + m1[1]
    else if(m2) precio = '$ ' + m2[1]
    const og = html.match(/property="og:title" content="([^"]+)/)
    if(og && titulo.startsWith('Libro')) titulo = og[1]
  } catch {}
  res.setHeader('Cache-Control','s-maxage=3600')
  return res.json({ isbn, titulo, autor, tapa, precio, url })
}
