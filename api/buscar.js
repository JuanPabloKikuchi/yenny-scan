// api/buscar.js - como hace librito.com.ar
export default async function handler(req,res){
  const isbn=(req.query.isbn||'').replace(/\D/g,'')
  let titulo='', autor='', tapa='', precio='Consultar'

  // 1. Google Books para titulo/autor/tapa (base de librito)
  try{
    const g=await fetch(`https://www.googleapis.com/books/v1/volumes?q=isbn:${isbn}`).then(r=>r.json())
    const i=g.items?.[0]?.volumeInfo
    if(i){
      titulo=i.title||''
      autor=(i.authors||[]).join(', ')
      tapa=i.imageLinks?.thumbnail?.replace('http://','https://')||''
    }
  }catch{}

  // 2. Yenny HTML -> saca precio del ld+json (truco de librito)
  try{
    const html=await fetch(`https://www.yenny-elateneo.com/${isbn}`,{
      headers:{
        'User-Agent':'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept-Language':'es-AR,es;q=0.9'
      }
    }).then(r=>r.text())

    const jsonMatch=html.match(/<script type="application\/ld\+json">([^<]+)<\/script>/)
    if(jsonMatch){
      const data=JSON.parse(jsonMatch[1])
      const product=Array.isArray(data)?data.find(x=>x['@type']==='Product'):data
      if(product){
        if(product.name) titulo=product.name
        if(product.image) tapa=Array.isArray(product.image)?product.image[0]:product.image
        if(product.offers?.price) precio=`$ ${Number(product.offers.price).toLocaleString('es-AR',{minimumFractionDigits:2})}`
      }
    }
    // autor a veces está en meta
    if(!autor){
      const m=html.match(/"author":"([^"]+)"/)
      if(m) autor=m[1]
    }
  }catch{}

  if(!tapa) tapa=`https://covers.openlibrary.org/b/isbn/${isbn}-L.jpg`
  if(!titulo) titulo='Libro '+isbn

  return res.json({isbn, titulo, autor, tapa, precio})
}
