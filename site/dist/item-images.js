const base='https://ligmar.io/game/assets/';
function imageUrl(path){
 if(/^https?:\/\//.test(path))return path;
 if(path.startsWith('/'))return 'https://ligmar.io'+path;
 return base+path.replace(/^item-images\//,'images/');
}
export function itemImage(item,quality){
 if(item.preset?.image)return imageUrl(item.preset.image);
 if(quality&&['common','rare','epic','legendary'].includes(quality)&&item.item_type&&item.item_subtype)
  return `${base}images/gear/${item.item_type}-${item.item_subtype}-${quality}.webp`;
 return imageUrl(item.image_path);
}
