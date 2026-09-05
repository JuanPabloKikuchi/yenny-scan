export default async function handler(req,res){
  const isbn=(req.query.isbn||'').replace(/\D/g,'')
  if(!isbn) return res.status(400).json({error:'isbn'})

  // helper con timeout
  const fetchTimeout = (url, opts={}, ms=2500) => {
    const c=new AbortController()
    const t=setTimeout(()=>c.abort(), ms)
    return fetch(url,{...opts, signal:c.signal}).finally(()=>clearTimeout(t))
  }

  let titulo='', autor='', tapa='', precio='No figura en Yenny'

  // 1. Google Books rápido (2.5s max) - trae titulo, autor, tapa
  try{
    const g=await fetchTimeout(`https://www.googleapis.com/books/v1/volumes?q=isbn:${isbn}`,{},2500).then(r=>r.json())
    const info=g.items?.[0]?.volumeInfo
    if(info){
      titulo=info.title||''
      autor=(info.authors||[]).join(', ')
      tapa=info.imageLinks?.thumbnail?.replace('http://','https://')||''
    }
  }catch{}

  // 2. Yenny VTEX rápido (2.5s max) - trae precio
  try{
    const url=`https://www.yenny-elateneo.com/api/catalog_system/pub/products/search?fq=alternateIds_Ean:${isbn}`
    const data=await fetchTimeout(url,{headers:{'Accept':'application/json'}},2500).then(r=>r.json())
    if(data?.[0]){
      const p=data[0]
      if(p.productName) titulo=p.productName
      const item=p.items?.[0]
      if(item?.images?.[0]?.imageUrl) tapa=item.images[0].imageUrl
      const offer=item?.sellers?.[0]?.commertialOffer
      if(offer){
        precio=offer.AvailableQuantity===0?'Sin stock':`$ ${Number(offer.Price).toLocaleString('es-AR',{minimumFractionDigits:2})}`
      }
      // autor desde specs
      if(p.allSpecifications){
        for(let k of p.allSpecifications){
          if(k.toLowerCase().includes('autor')){
            let v=p.allSpecificationsValues?.[k]?.[0]
            if(v) autor=v
          }
        }
      }
    }
  }catch{}

  if(!tapa) tapa=`https://covers.openlibrary.org/b/isbn/${isbn}-L.jpg`
  if(!titulo) titulo='Libro '+isbn

  res.setHeader('Cache-Control','s-maxage=60')
  return res.json({isbn, titulo, autor, tapa, precio})
}
