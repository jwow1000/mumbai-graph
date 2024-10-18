import { getData } from "./helpers/fetchData";
import { yAxisDef, years } from "./helpers/axisData";
import * as d3 from "d3";


// variables
let focusState = false;
let targetYear = 0;
let sliding = false;

// get the graph container from webflow
const container = document.getElementById('graph-contain');

// get viewport dimensions
const viewport = {}

function getVP() {
  const viewportWidth = window.innerWidth > 1000 ? window.innerWidth : 1000;
  const viewportHeight = window.innerHeight > 400 ? window.innerHeight : 400;
  viewport.width = viewportWidth;
  viewport.height = viewportHeight;

}
// trigger getVP
getVP();

window.addEventListener('resize', () => {
  getVP();
});

// variables
// Declare the chart dimensions and margins.
const width = viewport.width;
const height = viewport.height;

const marginTop = height / 100;
const marginRight = width / 20 ;
const marginBottom = height / 50;
const marginLeft = width / 11;

const innerLeft = width / 70;
const innerTop = height / 100;
const bigGap = width / 1.5;

// make a data object
const theHouses = getData();

const yAxisCat = [
  "_spacer1",
  ...yAxisDef.occupancy, 
  "_spacer2",
  ...yAxisDef.building, 
  "_spacer3",
  ...yAxisDef.infastructure, 
  "_spacer4",
  ...yAxisDef.planning,
];

// Define labels for the spacers
const spacerLabels = {
  "_spacer1": "OCCUPANCY",
  "_spacer2": "BUILDING",
  "_spacer3": "INFASTRUCTURE",
  "_spacer4": "PLANNING",
};  

// Create the SVG container
const svg = d3.create("svg")
  .attr("class", "svg-d3")
  .attr("width", width )
  .attr("height", height)

// Declare the x scale.
const xScale = d3.scaleLinear()
  .domain( [0, years.length] )
  .range( [ marginLeft + innerLeft, width - innerLeft - marginRight] )

// Calculate the positions based on the widths
let cumulativePosition = innerLeft;

const restOfGraph = (width - (innerLeft + marginLeft + marginRight)) - bigGap;
const restWidth = restOfGraph / (years.length - 2);
const defaultWidth = (width - (innerLeft + marginLeft + marginRight)) / years.length; 

// calculate xPositions function
function calcXpos( target ) {
  if( target !== 0 ) {
    // reset count variable
    cumulativePosition = innerLeft * 3; 
    // make empty object
    const xData = {}
    // iterate and make an object of years: positons
    years.forEach( year => {
      const pos = cumulativePosition;
      // if target year?
      if( year === target ) {
        cumulativePosition += bigGap;
      } else {
        cumulativePosition += restWidth;
      }
      xData[year] = {year: year, position: pos, season: 0};
    });
  
    return xData;

  } else {
    // close the graph
    // make empty object
    const xData = {}
    // reset count variab;e
    cumulativePosition = innerLeft * 3; 
    
    years.forEach( year => {
      const pos = cumulativePosition;
      cumulativePosition += defaultWidth;
      xData[ year ] = {year: year, position: pos, season: 0};
    
    });
  
    return xData;
  }
}

// calculate new positions for new target year and redraw
function reDrawElements( target ) {
  sliding = true;
  // update target year
  // targetYear = target;
  xPositions = calcXpos( target );

  // rotate the xAxis labels
  if( focusState ) {
    // update the xAxis labels
    xAxis.selectAll(".xLabel")
      .data( Object.values( xPositions ) )
      .transition()
      .duration( 1000 )
      .attr("x", d => d.position )             // x position adjustment (assuming xPositions has an x value)
      // .attr("text-anchor", "start")
      .attr("transform", d => `translate(${d.position - 12}, ${d.position + 8}) rotate(-90)`) // Adjust transform
    
    // xAxis.selectAll( ".xLabel" )
    //   .data( Object.values( xPositions ) )
    //   .transition()
    //   .duration( 1000 )
    //   .attr("x", d => d.position )             // x position adjustment (assuming xPositions has an x value)

  } else {
    
    // update the xAxis labels
    xAxis.selectAll(".xLabel")
      .data( Object.values( xPositions ) )
      .transition()
      .duration( 1000 )
      .attr("text-anchor", "middle")
      .attr( "x", d => d.position - 2)
      .attr( "y", 3)
      .attr("transform", d => "rotate(0)") 
  }

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
      if( !focusState ) {
        return d.position + (d.index * getSeasonSpace( d ) );
      } else {
        return d.position
      }
    })
  

  /////// redraw the data items (houses)
  // redraw the lines 
  theHouses.forEach( item => {
    // draw the line
    svg.selectAll( `.lines-${item.name}` )
      .datum( item.listxy )
      .transition()
      .duration( 1000 )
      .attr("d", lineGen( item.listxy ))
      .attr("stroke-width", 1)
    
    // redraw the circles 
    svg.selectAll(`.circles-${item.name}`)
      .data( item.listxy )
      .join( "circle" )
      .interrupt()
      .transition()
      .duration( 1000 )
      .attr("r", 7)
      .attr("cx", d => {
        if( !focusState ) {
          const seasonSpace = d.season * getSeasonSpace( d );
          return (xPositions[d.year].position + innerLeft + marginLeft ) + seasonSpace
        } else {
          return xPositions[d.year].position + innerLeft + marginLeft 
        }
      })
      .on("end", function(){
        sliding = false;
      })
  });
}

// calculate x positions
let xPositions = calcXpos( targetYear );

// create the x axis
const xAxis = svg.append("g")
  .attr("transform", `translate(${  marginLeft + innerLeft + 15 },${ height - marginBottom })`);

// define and draw xAxis
xAxis.selectAll(".xLabel")
  .data( Object.values(xPositions) )
  .enter()
  .append("text")
    .attr("class", "xLabel")
    .attr("x", d => d.position - 3)
    .attr("y", 3)  // Adjust this to position the label correctly
    // .attr("transform", "rotate(-90)") // Rotate the label
    .attr("text-anchor", "middle") // Align text to the middle of the label
    .attr("font-size", "0.7rem")
    .text(d => d.year)
  

const globalYAxisPadding = 0.5;

// declare the y axis scale
const yScale = d3.scaleBand()
  .domain( yAxisCat )
  .range( [marginTop, height - marginBottom] )
  .padding( globalYAxisPadding )

// make the yAxis
const yAxis = d3.axisLeft( yScale )
  .tickSize( 0 )
  .tickPadding( 0 )
  .tickFormat(function(d) {
    // Hide the placeholders by returning an empty string for them
    return d.startsWith("_spacer") ? "" : d;
  })

// yAxis scale
const yAxisThemeScale = d3.scaleBand()
  .domain( yAxisCat )
  .range( [marginTop, height - marginBottom] )
  .padding( globalYAxisPadding )


const yAxisLabels = d3.axisLeft( yAxisThemeScale )
  .tickSize( 0 )
  .tickPadding( 0 )
  .tickFormat(function(d) {
    // Hide the placeholders by returning an empty string for them
    return d.startsWith("_spacer") ? spacerLabels[d] : "";
  })

const yAxisLabelsGroup = svg.append("g")
  .attr("class", "yAxisLabels")
  .attr("transform", `translate(${innerLeft* 4},0)`)
  .attr("text-anchor", "middle")
  .call( yAxisLabels )

// add the Y axis
const yAxisGroup = svg.append("g")
  .attr("class", "yAxis")
  .attr("transform", `translate(${ marginLeft + innerLeft }, ${ 0 })`)
  .call( yAxis )

// remove the axis lines
svg.selectAll("path").remove();

// // style y axis labels
// yAxisGroup.selectAll("text")
//   .style("font-size", "0.6rem")

// add extra YAxis of dots
// Create the new left column dot data
const leftColumnDotData = yAxisCat
  .filter(cat => !cat.startsWith("_spacer"))  // Exclude spacers
  .map(cat => ({
    category: cat,
    cx: marginLeft + innerLeft,  // Position the dots left of the main graph, adjust as needed
    cy: yScale(cat) + 8   // Align the dots with the Y-axis categories
  }));

// Append circles for the left column of dots
svg.selectAll(".left-dot")
  .data( leftColumnDotData )
  .enter()
  .append("circle")
  .attr( "id", d => `left-dot-${ d.category.replace(/\s+/g, '-')}` )
  .attr( "class", "left-dot")
  .attr("cx", d => d.cx)  // Use calculated x-position
  .attr("cy", d => d.cy)  // Use calculated y-position
  .attr("r", 8)
  .style("fill", "white")
  .style("stroke", "black")
  .attr("transform", `translate(${innerLeft },-1)`);

// create the dot data
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

// get season group spacing
function getSeasonSpace( item ) {
  if( item.year === targetYear ) {
    return bigGap / 4 ;
  } else if( targetYear === 0 ) {
    return defaultWidth / 5;
  } else {
    return restWidth / 5 ;
  }
}

svg.selectAll(".dot")
  .data( dotData )
  .enter()
  .append("circle")
  .attr("class", "dot")
  .attr("cx", d => {
    return xPositions[d.year].position + (d.index * getSeasonSpace( d ) );
  })
  .attr("cy", d => yScale( d.category ) + 8 )
  .attr("r", 3)
  .style("fill", "white")
  .style("stroke", "grey")
  .attr("transform", `translate(${innerLeft + marginLeft},0)`)

// define the line generator
const lineGen = d3.line()
  .x(d => {
    if( !focusState ) {
      const seasonSpace = d.season * getSeasonSpace( d );
      return (xPositions[d.year].position + innerLeft + marginLeft) + seasonSpace;
    } else {
      return xPositions[d.year].position + innerLeft + marginLeft;
    }
  })
  .y(d => yScale( d.category ) + 10 )
  .curve( d3.curveLinear);

// draw the lines and dots from theHouses data
theHouses.forEach( item => {
  // console.log("listXY: ", item.listxy, xPositions)
  // draw the preview
  svg.append( "image" )
    .attr("class", `preview-${item.name} thumbs`) 
    .attr("x", xPositions[ item.listxy[0].year ].position + (item.previewPos[0] * width) )
    .attr("y", item.previewPos[1] * height )
    .attr("width", "100")
    .attr("height", "100")
    .attr("href", item.previewImg)
    .attr("preserveAspectRatio", "xMidYMid meet")
    .on("mouseover", (event) => {
      d3.select(`.preview-${item.name}`)
        .transition()
        .duration( 500 )
        .attr("width", "300")
        .attr("height", "300")
      
      // make left dots blue
      item.listxy.forEach((xy) => {
        d3.select(`#left-dot-${xy.category.replace(/\s+/g, '-')}`)
          .transition()
          .duration(1000)
          .style("fill", "blue") 
      })
    })
    .on("mouseout", (event) => {
      d3.select(`.preview-${item.name}`)
        .transition()
        .duration( 500 )
        .attr("width", "100")
        .attr("height", "100")
        
        // turn off left dots
        if( !focusState ) {
        item.listxy.forEach((xy) => {
          d3.select(`#left-dot-${xy.category.replace(/\s+/g, '-')}`)
            .transition()
            .duration(1000)
            .style("fill", "white") 
        })

      }
    })
    .on('click', (event) => {
      zoomOnItem( item.listxy[0].year, item ); // Trigger the zoom/collapse effect
      
      item.listxy.forEach((xy) => {
        d3.select(`#left-dot-${xy.category.replace(/\s+/g, '-')}`)
          .transition()
          .duration(1000)
          .style("fill", "blue") 
      })
    })

  // draw the line
  svg.append( "path" )
    .datum( item.listxy )
    .attr("class", `lines-${item.name}`)
    .attr("fill", "none")
    .attr("stroke", "black")
    .attr("stroke-width", 1)
    .attr("d", lineGen( item.listxy ))
    .on('click', function(event) {
      zoomOnItem( item.listxy[0].year, item ); // Trigger the zoom/collapse effect
      item.listxy.forEach((xy) => {
        d3.select(`#left-dot-${xy.category.replace(/\s+/g, '-')}`)
          .transition()
          .duration(1000)
          .style("fill", "blue") 
      })
    })
    .on("mouseover", function(event) {
      // make left dots blue
      item.listxy.forEach((xy) => {
        d3.select(`#left-dot-${xy.category.replace(/\s+/g, '-')}`)
          .transition()
          .duration(1000)
          .style("fill", "blue") 
      })
    })
    .on("mouseout", function(event) {
      // turn off left dots
      if( !focusState ) {
        item.listxy.forEach((xy) => {
          d3.select(`#left-dot-${xy.category.replace(/\s+/g, '-')}`)
            .transition()
            .duration(1000)
            .style("fill", "white") 
        })
      }
    })
  
  // add circles to the line
  svg.selectAll(".circles")
    .data( item.listxy )
    .enter()
    .append("circle")
    .attr("class", `circles-${item.name}`)
    .attr("cx", d => {
      const seasonSpace = d.season * getSeasonSpace( d );
      return (xPositions[d.year].position + innerLeft + marginLeft) + seasonSpace
    })
    .attr("cy", d => yScale(d.category) + 8)
    .attr("r", 7)
    .attr("fill", "black")
    .on('click', function(event) {
      d3.select(this)
        .interrupt()
        .transition()
        .duration( 500 )
        .attr("r", 8)
      zoomOnItem( item.listxy[0].year, item ); // Trigger the zoom/collapse effect
      // make left dots blue
      item.listxy.forEach((xy) => {
        d3.select(`#left-dot-${xy.category.replace(/\s+/g, '-')}`)
          .transition()
          .duration(1000)
          .style("fill", "blue") 
      })
    })
    .on("mouseover", function(event) {
      if( !sliding ) {
        d3.select( this )
        .transition()
        .duration( 500 )
        .attr("r", 12)
      }
      // make left dots blue
      item.listxy.forEach((xy) => {
        d3.select(`#left-dot-${xy.category.replace(/\s+/g, '-')}`)
          .transition()
          .duration(1000)
          .style("fill", "blue") 
      })
    })
    .on("mouseout", function(event) {
      // turn off left dots
      if( !focusState ) {
        item.listxy.forEach((xy) => {
          d3.select(`#left-dot-${xy.category.replace(/\s+/g, '-')}`)
            .transition()
            .duration(1000)
            .style("fill", "white") 
        })
      }

      if( !sliding ) {

        d3.select( this )
          .transition()
          .duration( 500 )
          .attr("r", 8)
      }
    })
  });

// create image element for focused story, opacity 0 on init
svg.append( "image" )
  .attr("class", "story-image")
  .attr("x", 0) // should this be the x position of the graph
  .attr("y", 0)
  .attr("width", (bigGap - marginRight - marginLeft) )   //bigGap is how wide the window is when focus
  .attr("height", height - marginBottom - marginTop)
  .attr("display", "none")
  .attr("opacity", 0)
  .attr("href", theHouses[0].displayImg )
  // .attr("pointer-events", "none")
  .attr("preserveAspectRatio", "xMidYMid meet")
  .on("click", function( event ) {
    if( focusState ) {
      closeZoom();
    }
  })
    

function closeZoom() {
  // turn off focus state
  focusState = false;
  
  // redraw the scene with year 0 to return to default
  reDrawElements( 0 );

  // make the story image dissapear
  svg.select(".story-image")
    .transition()
    .duration( 1000 )
    .attr("opacity", 0)
    .attr("display", "none")

  // turn off blue left dots
  d3.selectAll(".left-dot")
    .transition()
    .duration(1000)
    .style("fill", "white")

  
}

// add labels to yAxis
yAxisLabelsGroup.selectAll('text')
    .each( function() {
      if( this.__data__.startsWith('_spacer') ) {
        // style font
        d3.select( this )
          .style("font-size", "0.7rem")
          .attr("text-anchor", "middle")
        
        // add the box with rounded corners
        d3.select( this.parentNode )  // Select the parent group of the text (tick group)
          .insert("rect", "text")     // Insert circle before the text
          .attr("x",  "-4rem")    // Same x position as text
          .attr("y",  "-0.6rem")            // Same y position as text
          .attr("width", "8rem" )  
          .attr("height", "1.2rem" )  
          .attr("rx", "10px")  // Rounded corner radius
          .attr("ry", 6)
          .style("fill", "none")  // Background color
          .style("stroke", "black")  // Border color
          .style("stroke-width", 0.5);  // Border width
        
        // add the dotted line
        d3.select( this.parentNode )
          .insert("line", "rect")
          .attr("x1", "4rem")  // Starting x position
          .attr("y1", 0)  // Starting y position (same as rect)
          .attr("x2", width - innerLeft*5)  // Ending x position (adjust as needed)
          .attr("y2", 0)  // Ending y position (same as rect) 
          .style("stroke", "black")  // Color of the dashed line
          .style("stroke-width", 1)  // Width of the dashed line
          .style("stroke-dasharray", ("5, 8")) 
      }

    })

function zoomOnItem( target, item ) {
  // if were not focused ...
  if( !focusState ) {
    // set focus state to true
    focusState = true;
    
    // redraw the scene with a new targetYear
    reDrawElements( target );
    
    const xPos = xPositions[target].position;
    
    // redraw the story image
    svg.select(".story-image")
      .attr("x", xPos + innerLeft + marginLeft + (xPos/2))     
      .attr("href", item.displayImg)
      .attr("width", bigGap - (xPos/2) )
      .attr("display", "block")
      .attr("preserveAspectRatio", "xMidYMid meet")
      .transition()
      .duration( 1000 )
      .attr("opacity", 1);

  } else {
    closeZoom();
  }
}

svg.selectAll(".thumbs").raise();
svg.select(".story-image").raise();

// Append the SVG element.
container.append( svg.node() );
