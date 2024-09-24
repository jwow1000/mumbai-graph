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
    for( let i=0; i < listArray.length / 2; i++) {
      const iter = i * 2;
      xyCoords.push(
        {year: parseInt( listArray[ iter ] ), category: listArray[ iter+1 ].toUpperCase() } 
      ); 
    }
    dataObj.listxy = xyCoords;
  
    // get the title
    dataObj.name = item.getAttribute('data-name');
  
  
    theHouses.push( dataObj );
    // console.log("wow", theHouses)

  });

  // return the array
  return theHouses;
  
}
