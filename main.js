import { getData } from "./helpers/fetchData";
import { yAxisDef, years } from "./helpers/axisData";
import * as d3 from "d3";


// variables
let focusState = false;
let targetYear = 2015;

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
const bigGap = 500;
const restOfGraph = (width - innerLeft) - bigGap;
const restWidth = restOfGraph / (years.length - 2);

// calculate xPositions function
function calcXpos( target ) {
  const xData = years.map( year => {
    const pos = cumulativePosition;
    // if target year?
    if( year === target ) {
      cumulativePosition += bigGap;
      return { name: year, position: pos};
    } else {
      cumulativePosition += restWidth;
      return { name: year, position: pos };
    }
  });

  return xData;
}

const xPositions = calcXpos( targetYear );

// draw the x axis
const xAxis = svg.append("g")
  .attr("transform", `translate(${  marginLeft + innerLeft },${ height - marginBottom })`);

xAxis.selectAll(".xLabel")
  .data( xPositions )
  .enter()
  .append("text")
    .attr("class", "xLabel")
    .attr("x", d => d.position)
    .attr("y", 15)  // Adjust this to position the label correctly
    .attr("dy", ".71em")
    .attr("text-anchor", "middle")
    .text(d => d.name);


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



// make the dot grid data


const dotData = xPositions.flatMap( item => {
  return yAxisCat.flatMap( cat => {
    if( !cat.startsWith("_spacer") ) {
      return d3.range( 4 ).map(index => ({
        year: item.name,
        position: item.position,
        category: cat,
        index: index
      }));

    } else {
      return [];
    }
  })
});

console.log("data", dotData)

svg.selectAll(".dot")
  .data( dotData )
  .enter()
  .append("circle")
  .attr("class", "dot")
  .attr("cx", d => {
    if( d.year === targetYear ) {
      return d.position + (d.index * bigGap/4);
    } else {
      return d.position + (d.index * 10);
    }
    // d.position + innerLeft + marginLeft 
  })
  .attr("cy", d => yScale( d.category ) + 10 )
  .attr("r", 3)
  .style("fill", "white")
  .style("stroke", "grey")
  .attr("transform", `translate(${innerLeft + marginLeft - 14},0)`)

// // make the line
// const line = d3.line()
//   .x(d => getYearPosition( d.year, null, 10 ) + 5 )
//   .y(d => yScale( d.category ) + 10 )
//   .curve( d3.curveLinear);

// // zoom function
// function zoomOnItem(selectedItem) {
  
//   // Redraw the x axis with transition
//   svg.select('.xAxis')
//     .transition()
//     .duration( 1000 )
//     .call( d3.axisBottom()
//       .scale( xScale )
//       .tickValues( years )
//       .tickFormat( d => d)
//     )// Update the axis with the new scale
//     .selectAll(".tick")
//     .attr( "transform", d => `translate( ${ getYearPosition(d) }, 0)`);

//   // Redraw the dots with transition
//   svg.selectAll('.dot')
//     .transition()
//     .duration(1000)
//     .attr('cx', d => getYearPosition(d.year, 2006, 20) + dotScale(d.index))

//   // Redraw the lines with transition
//   svg.selectAll('.lines')
//     .transition()
//     .duration(1000)
//     .attr("d", selectedItem);

//   // Redraw the circles
//   svg.selectAll('.circles')
//     .transition()
//     .duration(1000)
//     .attr("cx", d => xScale(d.year) + 5)
// }

// theHouses.forEach(item => {
//   // draw the line
//   svg.append("path")
//     .datum(item.listxy)
//     .attr("class", "lines")
//     .attr("fill", "none")
//     .attr("stroke", "black")
//     .attr("stroke-width", 2)
//     .attr("d", line);

//   // add circles to the line
//   svg.selectAll(".circles")
//     .data(item.listxy)
//     .enter()
//     .append("circle")
//     .attr("class", "circles")
//     .attr("cx", d => xScale(d.year) + 5)
//     .attr("cy", d => yScale(d.category) + 10)
//     .attr("r", 8)
//     .attr("fill", "blue")
//     .on('click', (event, d) => {
//       console.log(`Circle for ${d.year} in ${d.category} clicked ${item.name}`);
//       zoomOnItem(item); // Trigger the zoom/collapse effect
//     });
// });

// Append the SVG element.
container.append( svg.node() );
