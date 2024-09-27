


function reDrawElements( target ) {
  // update target year
  // targetYear = target;
  xPositions = calcXpos( target );

  // update the xAxis labels
  xAxis.selectAll(".xLabel")
    .data( Object.values( xPositions ) )
    .transition()
    .duration( 1000 )
    .attr( "x", d => d.position )

  // update dot data
  let dotData = Object.values(xPositions).flatMap(item => {
    return yAxisCat.flatMap(cat => {
      if (!cat.startsWith("_spacer")) {
        return d3.range(4).map(index => ({
          year: item.year,        // Use the year from the item
          position: item.position, // Use the position from the item
          category: cat,
          index: index
        }));
      } else {
        return [];
      }
    });
  });

  // redraw the dots
  svg.selectAll(".dot")
    .data( dotData )
    .transition()
    .duration( 1000 )
    .attr("cx", d => {
      return d.position + (d.index * getSeasonSpace( d ) );
    })
  
  // redraw the lines 
  theHouses.forEach( item => {
    // draw the line
    svg.selectAll( `.lines-${item.name}` )
      .datum( item.listxy )
      .transition()
      .duration( 1000 )
      .attr("d", lineGen( item.listxy ));
    
  
    // redraw the circles 
    svg.selectAll(`.circles-${item.name}`)
      .data( item.listxy )
      .join( "circle" )
      .transition()
      .duration( 1000 )
      .attr("cx", d => {
        const seasonSpace = d.season * getSeasonSpace( d );
        return (xPositions[d.year].position + innerLeft + marginLeft) + seasonSpace
      })
  });

}