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
const height = 800;
const marginTop = 100;
const marginRight = 20;
const marginBottom = 50;
const marginLeft = 120;
const innerLeft = 40;
const innerTop = 40;

// make a data object
const theHouses = getData();


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
const bigGap = 900;
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

let xPositions = calcXpos( targetYear );

// draw the x axis
const xAxis = svg.append("g")
  .attr("transform", `translate(${  marginLeft + innerLeft },${ height - marginBottom })`);



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
    .on('click', (event, d) => {
      console.log(`Circle for ${d.name} in ${d.position} clicked ${d.name}`);
      // zoomOnItem( d ); // Trigger the zoom/collapse effect
    })


// declare the y axis scale
const yScale = d3.scaleBand()
  .domain( yAxisCat )
  .range( [marginTop, height - marginBottom] )
  .padding( 0.1 )

const yAxis = d3.axisLeft( yScale )
  .tickSize( 0 )
  .tickPadding( 10 )
  .tickFormat(function(d) {
    // Hide the placeholders by returning an empty string for them
    return d.startsWith("_spacer") ? "" : d;
  });



// add the Y axis
svg.append("g")
  .attr("class", "yAxis")
  .attr("transform", `translate(${ marginLeft + innerLeft }, ${ 0 })`)
  .call( yAxis )

// remove the axis lines
svg.selectAll("path").remove();

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

console.log("data", dotData)

svg.selectAll(".dot")
  .data( dotData )
  .enter()
  .append("circle")
  .attr("class", "dot")
  .attr("cx", d => {
    
    if( d.year === targetYear ) {
      return d.position + (d.index * (bigGap/4) );
    } else if( targetYear === 0 ) {
      return d.position + (d.index * (defaultWidth / 5) );
    } else {
      return d.position + (d.index * (restWidth/5) );
    }
  })
  .attr("cy", d => yScale( d.category ) + 10 )
  .attr("r", 3)
  .style("fill", "white")
  .style("stroke", "grey")
  .attr("transform", `translate(${innerLeft + marginLeft - 14},0)`)

// define the line generator
const lineGen = d3.line()
  .x(d => xPositions[d.year].position + innerLeft + marginLeft)
  .y(d => yScale( d.category ) + 10 )
  .curve( d3.curveLinear);

// draw the lines and dots from theHouses data
theHouses.forEach( item => {
  console.log("listXY: ", item.listxy, xPositions)
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
    .attr("cx", d => xPositions[d.year].position + innerLeft + marginLeft )
    .attr("cy", d => yScale(d.category) + 10)
    .attr("r", 8)
    .attr("fill", "blue")
    .on('click', (event, d) => {
      console.log("hey what the heck: ", item.listxy)
      console.log(`Circle for ${d.year} in ${d.category} clicked ${item.name}`);
      zoomOnItem( item.listxy[0].year ); // Trigger the zoom/collapse effect
    });
});

function zoomOnItem( target ) {
  console.log("xPositions before click", xPositions);
  // if were not focused ...
  if( !focusState ) {
    // update target year
    targetYear = target;
    xPositions = calcXpos( targetYear );
    console.log("xPostiitons after click: ", xPositions)

    // update the xAxis labels
    xAxis.selectAll(".xLabel")
      .data( Object.values( xPositions ) )
      .transition()
      .duration( 1000 )
      .attr( "x", d => d.position )


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
        if( d.year === targetYear ) {
          return d.position + (d.index * (bigGap/4) );
        } else {
          return d.position + (d.index * (restWidth/5) );
        }
      })
    
    // redraw the lines and dots
    theHouses.forEach( item => {
      // draw the line
      svg.selectAll( `.lines-${item.name}` )
        .datum( item.listxy )
        .transition()
        .duration( 1000 )
        .attr("d", lineGen( item.listxy ));
      
    
      // add circles to the line
      svg.selectAll(`.circles-${item.name}`)
        .data( item.listxy )
        .join( "circle" )
        .transition()
        .duration( 1000 )
        .attr("cx", d => xPositions[d.year].position + innerLeft + marginLeft )
    });
      

  } else {
    focusState = false;
  }
}


// Append the SVG element.
container.append( svg.node() );
