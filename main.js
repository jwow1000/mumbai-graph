import { getData } from "./helpers/fetchData";
import { yAxisDef, years } from "./helpers/axisData";
import * as d3 from "d3";


// variables
let focusState = false;

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

// Declare the x scale.
const xScale = d3.scaleBand()
  .domain( years )
  .range( [ marginLeft + innerLeft, width - innerLeft])

// function to apply custom paddings
function getYearPosition( year, targetYear, pad ) {
  
  const padding = (year === targetYear) ? pad : 0.3;
  
  return xScale( year ) + padding * xScale.bandwidth();
}

// scale fo the dots
const dotScale = d3.scaleBand()
  .domain( d3.range( 4 ) )
  .range( [(-xScale.bandwidth() / 2) + innerLeft/2, xScale.bandwidth()/2 + innerLeft/2 ] )
  .padding( 1  );

// declare the y axis
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

  
// Create the SVG container
const svg = d3.create("svg")
  .attr("width", width)
  .attr("height", height);

// draw the x axis function
function drawXaxis() {
  const xAxis = d3.axisBottom( xScale )
    .tickSize( 0 )
    .tickPadding( 15 )
  
    // add the X axis
  svg.append("g")
    .attr("class", "xAxis")
    .attr("transform", `translate(0, ${ height - marginBottom })`)
    .call( xAxis )

}
drawXaxis();

// add the Y axis
svg.append("g")
  .attr("class", "yAxis")
  .attr("transform", `translate(${ marginLeft + innerLeft }, ${ 0 })`)
  .call( yAxis )

// make the dot grid data
const dotData = years.flatMap( year => {
  return yAxisCat.flatMap( cat => {
    if( !cat.startsWith("_spacer") ) {
      return d3.range( 4 ).map(index => ({
        year: year,
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
  .attr("cx", d => getYearPosition(d.year, null, 10) + dotScale( d.index ) )
  .attr("cy", d => yScale( d.category ) + 10 )
  .attr("r", 3)
  .style("fill", "white")
  .style("stroke", "grey")

// make the line
const line = d3.line()
  .x(d => getYearPosition( d.year, null, 10 ) + 5 )
  .y(d => yScale( d.category ) + 10 )
  .curve( d3.curveLinear);

// zoom function
function zoomOnItem(selectedItem) {
  
  // Redraw the x axis with transition
  svg.select('.xAxis')
    .transition()
    .duration( 1000 )
    .call( d3.axisBottom()
      .scale( xScale )
      .tickValues( years )
      .tickFormat( d => d)
    )// Update the axis with the new scale
    .selectAll(".tick")
    .attr( "transform", d => `translate( ${ getYearPosition(d) }, 0)`);

  // Redraw the dots with transition
  svg.selectAll('.dot')
    .transition()
    .duration(1000)
    .attr('cx', d => getYearPosition(d.year, 2006, 20) + dotScale(d.index))

  // Redraw the lines with transition
  svg.selectAll('.lines')
    .transition()
    .duration(1000)
    .attr("d", selectedItem);

  // Redraw the circles
  svg.selectAll('.circles')
    .transition()
    .duration(1000)
    .attr("cx", d => xScale(d.year) + 5)
}

// Add circles with click events to trigger zoom/collapse effect
theHouses.forEach(item => {
  // draw the line
  svg.append("path")
    .datum(item.listxy)
    .attr("class", "lines")
    .attr("fill", "none")
    .attr("stroke", "black")
    .attr("stroke-width", 2)
    .attr("d", line);

  // add circles to the line
  svg.selectAll(".circles")
    .data(item.listxy)
    .enter()
    .append("circle")
    .attr("class", "circles")
    .attr("cx", d => xScale(d.year) + 5)
    .attr("cy", d => yScale(d.category) + 10)
    .attr("r", 8)
    .attr("fill", "blue")
    .on('click', (event, d) => {
      console.log(`Circle for ${d.year} in ${d.category} clicked ${item.name}`);
      zoomOnItem(item); // Trigger the zoom/collapse effect
    });
});

// Append the SVG element.
container.append( svg.node() );
