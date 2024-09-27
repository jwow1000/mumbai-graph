import { getData } from "./helpers/fetchData";
import { yAxisDef, years } from "./helpers/axisData";
import * as d3 from "d3";


// variables
let focusState = false;
let targetYear = 0;

// get the graph container from webflow
const container = document.getElementById('graph-contain');


// variables
// Declare the chart dimensions and margins.
const width = 1800;
const height = 900;
const marginTop = 100;
const marginRight = 20;
const marginBottom = 50;
const marginLeft = 120;
const innerLeft = 40;
const innerTop = 40;

// make a data object
const theHouses = getData();
console.log("theHouses", theHouses)

const yAxisCat = [
  ...yAxisDef.occupancy, 
  "_spacer1",
  ...yAxisDef.building, 
  "_spacer2",
  ...yAxisDef.infastructure, 
  "_spacer3",
  ...yAxisDef.planning,
]

// Create the SVG container
const svg = d3.create("svg")
  .attr("width", width)
  .attr("height", height);

  // Declare the x scale.
const xScale = d3.scaleLinear()
  .domain( [0, years.length] )
  .range( [ marginLeft + innerLeft, width - innerLeft] )

// Calculate the positions based on the widths
let cumulativePosition = innerLeft;
const bigGap = 1000;
const restOfGraph = (width - (innerLeft + marginLeft)) - bigGap;
const restWidth = restOfGraph / (years.length - 2);
const defaultWidth = (width - (innerLeft + marginLeft)) / years.length; 

// calculate xPositions function
function calcXpos( target ) {
  if( target !== 0 ) {
    // reset count variable
    cumulativePosition = innerLeft; 
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
    // reset coutn variab;e
    cumulativePosition = innerLeft; 
    
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

  /////// redraw the data items (houses)
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
      .interrupt()
      .transition()
      .duration( 1000 )
      .attr("r", 8)
      .attr("cx", d => {
        const seasonSpace = d.season * getSeasonSpace( d );
        return (xPositions[d.year].position + innerLeft + marginLeft) + seasonSpace
      })
  });

}

// calculate x positions
let xPositions = calcXpos( targetYear );

// create the x axis
const xAxis = svg.append("g")
  .attr("transform", `translate(${  marginLeft + innerLeft +15 },${ height - marginBottom })`);

// define and draw xAxis
xAxis.selectAll(".xLabel")
  .data( Object.values(xPositions) )
  .enter()
  .append("text")
    .attr("class", "xLabel")
    .attr("x", d => d.position)
    .attr("y", 15)  // Adjust this to position the label correctly
    .attr("dy", ".71em")
    .attr("text-anchor", "middle")
    .text(d => d.year)

// declare the y axis scale
const yScale = d3.scaleBand()
  .domain( yAxisCat )
  .range( [marginTop, height - marginBottom] )
  .padding( 0 )

const yAxis = d3.axisLeft( yScale )
  .tickSize( 0 )
  .tickPadding( 0)
  .tickFormat(function(d) {
    // Hide the placeholders by returning an empty string for them
    return d.startsWith("_spacer") ? "" : d;
  })
;

// add the Y axis
const yAxisGroup = svg.append("g")
  .attr("class", "yAxis")
  .attr("transform", `translate(${ marginLeft + innerLeft }, ${ 0 })`)
  .call( yAxis )

// remove the axis lines
svg.selectAll("path").remove();

// style y axis labels
yAxisGroup.selectAll("text")
  .style("font-size", "0.8rem")

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

console.log("dotData", dotData)

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
    return d.position + (d.index * getSeasonSpace( d ) );
  })
  .attr("cy", d => yScale( d.category ) + 10 )
  .attr("r", 3)
  .style("fill", "white")
  .style("stroke", "grey")
  .attr("transform", `translate(${innerLeft + marginLeft},0)`)

// define the line generator
const lineGen = d3.line()
  .x(d => {
    const seasonSpace = d.season * getSeasonSpace( d );
    return (xPositions[d.year].position + innerLeft + marginLeft) + seasonSpace
  })
  .y(d => yScale( d.category ) + 10 )
  .curve( d3.curveLinear);

// draw the lines and dots from theHouses data
theHouses.forEach( item => {
  console.log("listXY: ", item.listxy, xPositions)
  // draw the preview
  svg.append( "image" )
    .attr("class", `preview-${item.name}`) 
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
    })
    .on("mouseout", (event) => {
      d3.select(`.preview-${item.name}`)
        .transition()
        .duration( 500 )
        .attr("width", "100")
        .attr("height", "100")
    })
    .on('click', (event) => {
      zoomOnItem( item.listxy[0].year, item ); // Trigger the zoom/collapse effect
    })

  // draw the line
  svg.append( "path" )
    .datum( item.listxy )
    .attr("class", `lines-${item.name}`)
    .attr("fill", "none")
    .attr("stroke", "black")
    .attr("stroke-width", 2)
    .attr("d", lineGen( item.listxy ));
  

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
    .attr("cy", d => yScale(d.category) + 10)
    .attr("r", 8)
    .attr("fill", "blue")
    .on('click', function(event) {
      d3.select(this)
        .interrupt()
        .transition()
        .duration( 500 )
        .attr("r", 8)
      zoomOnItem( item.listxy[0].year, item ); // Trigger the zoom/collapse effect
    })
    .on("mouseover", function(event) {
      d3.select( this )
      .transition()
      .duration( 500 )
      .attr("r", 25)
    })
    .on("mouseout", function(event) {
      d3.select( this )
        .interrupt()
        .transition()
        .duration( 500 )
        .attr("r", 8)
    })
});

// create image element for focused story, opacity 0 on init
svg.append("image")
  .attr("class", "story-image")
  .attr("x", 0)
  .attr("y", 0)
  .attr("width", bigGap)   //bigGap is how wide the window is when focus
  .attr("height", height)
  .attr("opacity", 0)
  .attr("href", theHouses[0].displayImg )
  .attr("pointer-events", "none")
  .attr("preserveAspectRatio", "xMidYMid meet")

function zoomOnItem( target, item ) {
  // console.log("xPositions before click", xPositions);
  // if were not focused ...
  if( !focusState ) {
    // redraw the scene with a new targetYear
    reDrawElements( target );
    
    // redraw the story image
    svg.select(".story-image")
      .attr("x", xPositions[target].position + innerLeft + marginLeft)     // reset to new x position
      .attr("href", item.displayImg)
      .transition()
      .duration( 1000 )
      .attr("opacity", 1);
  
    // set focus state to true
    focusState = true;

  } else {
    // redraw the scene with year 0 to return to default
    reDrawElements( 0 );

    // make the story image dissapear
    svg.select(".story-image")
      .transition()
      .duration( 1000 )
      .attr("opacity", 0);

    // turn off focus state
    focusState = false;
  }
}



// Append the SVG element.
container.append( svg.node() );
