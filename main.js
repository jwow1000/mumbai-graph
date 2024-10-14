import { getData } from "./helpers/fetchData";
import { yAxisDef, years } from "./helpers/axisData";
import * as d3 from "d3";


// variables
let focusState = false;
let targetYear = 0;
let sliding = false;

// get the graph container from webflow
const container = document.getElementById('graph-contain');


// variables
// Declare the chart dimensions and margins.
const marginTop = 10;
const marginRight = 50;
const marginBottom = 50;
const marginLeft = 150;
const width = 1900;
const height = 1000;
const innerLeft = 40;
const innerTop = 40;

// make a data object
const theHouses = getData();
// console.log("theHouses", theHouses)

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
  .attr("width", width + marginRight)
  .attr("height", height)

// Declare the x scale.
const xScale = d3.scaleLinear()
  .domain( [0, years.length] )
  .range( [ marginLeft + innerLeft, width - innerLeft - marginRight] )

// Calculate the positions based on the widths
let cumulativePosition = innerLeft;
const bigGap = 1200;
const restOfGraph = (width - (innerLeft + marginLeft + marginRight)) - bigGap;
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
  sliding = true;
  // update target year
  // targetYear = target;
  xPositions = calcXpos( target );

  // update the xAxis labels
  xAxis.selectAll(".xLabel")
    .data( Object.values( xPositions ) )
    .transition()
    .duration( 1000 )
    .attr( "y", d => d.position )

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
      .attr("d", lineGen( item.listxy ))
      .attr("stroke-width", 2)
    
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
    .attr("y", d => d.position)
    .attr("x", -30)  // Adjust this to position the label correctly
    .attr("dy", "0.71em")
    .attr("transform", "rotate(-90)") // Rotate the label
    .attr("text-anchor", "start") // Align text to the end of the label
    .attr("dx", "-0.5em") // Move the label slightly to the left
    .attr("font-size", "1.4rem")
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
  .attr("transform", `translate(${ (marginLeft + innerLeft) - 30 }, ${ 0 })`)
  .call( yAxisLabels )

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

// create the Y theme name labels
const yAxisThemes = svg.append("g")
  .attr("class", "yThemes")

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

// console.log("dotData", dotData)

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
  .attr("r", 4)
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
    .attr("d", lineGen( item.listxy ))
    .on('click', function(event) {
      d3.select(this)
        .interrupt()
        .transition()
        .duration( 1000 )
        .attr("stroke-width", 2)
      zoomOnItem( item.listxy[0].year, item ); // Trigger the zoom/collapse effect
    })
    .on("mouseover", function(event) {
      if( !sliding ) {
        d3.select( this )
        .transition()
        .duration( 300 )
        .attr("stroke-width", 4)
      }
    })
    .on("mouseout", function(event) {
      if( !sliding ) {

        d3.select( this )
          .transition()
          .duration( 300 )
          .attr("stroke-width", 2)
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
    .attr("cy", d => yScale(d.category) + 10)
    .attr("r", 8)
    .attr("fill", "black")
    .on('click', function(event) {
      d3.select(this)
        .interrupt()
        .transition()
        .duration( 500 )
        .attr("r", 8)
      zoomOnItem( item.listxy[0].year, item ); // Trigger the zoom/collapse effect
    })
    .on("mouseover", function(event) {
      if( !sliding ) {
        d3.select( this )
        .transition()
        .duration( 500 )
        .attr("r", 12)
      }
    })
    .on("mouseout", function(event) {
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
  // redraw the scene with year 0 to return to default
  reDrawElements( 0 );

  // make the story image dissapear
  svg.select(".story-image")
    .transition()
    .duration( 1000 )
    .attr("opacity", 0)
    .attr("display", "none")

  // turn off focus state
  focusState = false;
}

// add labels to yAxis
yAxisLabelsGroup.selectAll('text')
    .each( function() {
      if( this.__data__.startsWith('_spacer') ) {
        console.log("omg this", this)
        // style font
        d3.select( this )
          .style("font-size", "1rem")
          .style("font-weight", 700)
          .style("text-align", "left")

        
        // add the box
        const elem = d3.select(this).node();

        console.log("bounding box", elem.parentNode.getBBox())

        d3.select( this.parentNode )  // Select the parent group of the text (tick group)
          .insert("rect", "text")     // Insert circle before the text
          .attr("x",  -marginLeft)    // Same x position as text
          .attr("y",  -16)            // Same y position as text
          .attr("width", "13rem" )  
          .attr("height", "2rem" )  
          .attr("rx", 6)  // Rounded corner radius
          .attr("ry", 6)
          .style("fill", "none")  // Background color
          .style("stroke", "black")  // Border color
          .style("stroke-width", 1);  // Border width
        
        d3.select( this.parentNode )
          .insert("line", "rect")
          .attr("x1", "4rem")  // Starting x position
          .attr("y1", 0)  // Starting y position (same as rect)
          .attr("x2", width)  // Ending x position (adjust as needed)
          .attr("y2", 0)  // Ending y position (same as rect) 
          .style("stroke", "black")  // Color of the dashed line
          .style("stroke-width", 1)  // Width of the dashed line
          .style("stroke-dasharray", ("3, 3")) 
      }

    })

function zoomOnItem( target, item ) {
  // console.log("xPositions before click", xPositions);
  // if were not focused ...
  if( !focusState ) {
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
  
    // set focus state to true
    focusState = true;

  } else {
    closeZoom();
  }
}

svg.selectAll(".thumbs").raise();
svg.select(".story-image").raise();

// Append the SVG element.
container.append( svg.node() );
