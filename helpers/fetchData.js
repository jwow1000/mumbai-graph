export function getData() {
  // access the do element with the webflow CMS collection 
  const graphItems = document.querySelectorAll('.graph-items');
  
  // empty array
  const theHouses = [] 
  
  // iterate over CMS items to make array
  graphItems.forEach( ( item ) => {
    // make an empty object
    const dataObj = {};
    
    // get the list xy text
    const list = item.getAttribute('data-listxy');
    // convert into an array and make upper case for matching
    const listArray = list.split(", ");
    // make an array for the xy coords
    const xyCoords = []
    // iterate through the array
    for( let i=0; i < listArray.length / 3; i++) {
      const iter = i * 3;
      xyCoords.push(
        {year: parseInt( listArray[ iter ] ), season: listArray[ iter+1 ], category: listArray[ iter+2 ].toUpperCase() } 
      ); 
    }
    dataObj.listxy = xyCoords;
  
    // get the title
    dataObj.name = item.getAttribute('data-name');

    // get the preview image
    dataObj.previewImg = item.getAttribute('data-preview');

    // get the focus image
    dataObj.displayImg = item.getAttribute('data-displayImg');
    
    // get the preview image position
    
    const pos = item.getAttribute('data-preview-position');
    const posArray = pos.split(", ");
    dataObj.previewPos = posArray.map((item) => item / 100);
  
    theHouses.push( dataObj );

  });

  // return the array
  return theHouses;
  
}
