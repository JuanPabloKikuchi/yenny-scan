export default async function handler(req,res){
  const isbn=(req.query.isbn||'').replace(/\D/g,'')
  const timeout=(p,ms=2500)=>Promise.race([p,new Promise((_,r)=>setTimeout(()=>r('timeout'),ms))])

  let titulo='',autor='',tapa='',precio='Consultar en Yenny'

  // 1. PRIMERO Google Books + OpenLibrary (esto es lo que hace librito, nunca falla)
  try{
    const g=await timeout(fetch(`https://www.googleapis.com/books/v1/volumes?q=isbn:${isbn}`).then(r=>r.json()),3000)
    const info=g?.items?.[0]?.volumeInfo
    if(info){
      titulo=info.title||''
      autor=(info.authors||[]).join(', ')
      tapa=info.imageLinks?.thumbnail?.replace('http://','https://')||''
    }
  }catch{}

  // OpenLibrary como respaldo para tapa
  if(!tapa) tapa=`https://covers.openlibrary.org/b/isbn/${isbn}-L.jpg`
  if(!titulo){
    try{
      const o=await timeout(fetch(`https://openlibrary.org/isbn/${isbn}.json`).then(r=>r.json()),3000)
      if(o?.title) titulo=o.title
      if(o?.authors) autor=o.authors[0]?.name||autor
    }catch{}
  }

  // 2. DESPUES Yenny solo por precio, probando 2 endpoints
  const yennyUrls=[
    `https://www.yenny-elateneo.com/api/catalog_system/pub/products/search?fq=alternateIds_Ean:${isbn}`,
    `https://www.yenny-elateneo.com/api/catalog_system/pub/products/search?fq=alternateIds_RefId:${isbn}`
  ]
  for(let url of yennyUrls){
    try{
      const data=await timeout(fetch(url,{headers:{Accept:'application/json'}}).then(r=>r.json()),2500)
      if(data?.[0]?.items?.[0]?.sellers?.[0]?.commertialOffer){
        const offer=data[0].items[0].sellers[0].commertialOffer
        if(offer.AvailableQuantity>0) precio=`$ ${Number(offer.Price).toLocaleString('es-AR',{minimumFractionDigits:2})}`
        else precio='Sin stock'
        // si Yenny tiene mejor tapa/titulo, lo usamos
        if(data[0].productName) titulo=data[0].productName
        if(data[0].items[0].images?.[0]?.imageUrl) tapa=data[0].items[0].images[0].imageUrl
        break
      }
    }catch{}
  }

  if(!titulo) titulo='Libro '+isbn
  res.setHeader('Cache-Control','s-maxage=300')
  return res.json({isbn,titulo,autor,tapa,precio})
}
