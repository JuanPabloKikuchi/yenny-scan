export default async function handler(req,res){
  const isbn=(req.query.isbn||'').replace(/\D/g,'')
  if(!isbn) return res.status(400).json({error:'isbn'})

  const withTimeout=(p,ms)=>Promise.race([p,new Promise((_,rej)=>setTimeout(()=>rej('timeout'),ms))])

  let titulo='',autor='',tapa='',precio='Sin stock / Consultar'

  // Google Books + OpenLibrary - para titulo, autor, tapa (100% fiable)
  try{
    const g=await withTimeout(fetch(`https://www.googleapis.com/books/v1/volumes?q=isbn:${isbn}`).then(r=>r.json()),3000)
    const info=g.items?.[0]?.volumeInfo
    if(info){
      titulo=info.title||''
      autor=(info.authors||[]).join(', ')
      tapa=info.imageLinks?.thumbnail?.replace('http://','https://')||''
    }
  }catch{}

  // Yenny VTEX - solo para precio
  try{
    const data=await withTimeout(
      fetch(`https://www.yenny-elateneo.com/api/catalog_system/pub/products/search?fq=alternateIds_Ean:${isbn}`,{headers:{Accept:'application/json'}}).then(r=>r.json()),
      3000
    )
    if(data?.[0]){
      const p=data[0]
      if(p.productName) titulo=p.productName
      const item=p.items?.[0]
      if(item?.images?.[0]?.imageUrl) tapa=item.images[0].imageUrl
      const offer=item?.sellers?.[0]?.commertialOffer
      if(offer && offer.AvailableQuantity>0){
        precio=`$ ${Number(offer.Price).toLocaleString('es-AR',{minimumFractionDigits:2})}`
      }
    }
  }catch{}

  if(!tapa) tapa=`https://covers.openlibrary.org/b/isbn/${isbn}-L.jpg`
  if(!titulo) titulo='Libro '+isbn

  return res.json({isbn, titulo, autor, tapa, precio})
}
