import * as d3 from "d3";

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

// y-axis define
const yAxisDef = {
  occupancy: [
    "FREE RENTAL",
    "SUB RENTAL",
    "RENTAL",
    "OWNERSHIP",
  ],
  building: [
    "RETROFIT",
    "EXTENSIONS",
    "PAKKA HOUSE",
    "KACHHA HOUSE",
  ],
  infastructure: [
    "PUBLIC SPACES",
    "BOREWELL/WATER SUPPLY",
    "TOILET",
    "DRAINAGE",
    "SEWAGE",
    "ELECTRICITY",
  ],
  planning: [
    "PLAN VERIFICATION",
    "PLAN APPROVAL",
    "PLAN MAKING",
    "VERIFICATION",
    "SURVEY",
    "PURCHASING OF LAND",
    "STAY ORDER",
    "DEMOLITION",
    "NA CONVERSION",
  ],
}
const years = [
  2003,
  2004,
  2005,
  2006,
  2007,
  2008,
  2009,
  2010,
  2011,
  2012,
  2013,
  2014,
  2015,
  2016,
  2017,
  2018,
  2019,
  2020,
  2021,
  2022,
  2023,
  2024,
]

const yAxisCat = [
  ...yAxisDef.occupancy, 
  "_spacer1",
  ...yAxisDef.building, 
  "_spacer2",
  ...yAxisDef.infastructure, 
  "_spacer3",
  ...yAxisDef.planning,
]

// x axis range define in years
const dateRange = d3.timeMonths( new Date("2003-01-01"), new Date("2024-01-01"), 4);

// Declare the x scale.
const xScale = d3.scaleBand()
  .domain( years )
  .range( [ marginLeft + innerLeft, width - innerLeft])
  .padding( 0.3 );

// scale fo the dots
const dotScale = d3.scaleBand()
  .domain( d3.range( 4 ) )
  .range( [0, xScale.bandwidth() ] )
  .padding( -0.5   );

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

const xAxis = d3.axisBottom( xScale )
  .tickSize( 0 )
  .tickPadding( 15 )

// Create the SVG container
const svg = d3.create("svg")
  .attr("width", width)
  .attr("height", height);

// add the X axis
svg.append("g")
  .attr("class", "xAxis")
  .attr("transform", `translate(0, ${ height - marginBottom})`)
  .call( xAxis )

// add the Y axis
svg.append("g")
  .attr("class", "yAxis")
  .attr("transform", `translate(${ marginLeft + innerLeft }, ${ 0 })`)
  .call( yAxis );

// make the dot grid
const data = years.flatMap( year => {
  return yAxisCat.flatMap( cat => {
    return d3.range( 4 ).map(index => ({
      year: year,
      category: cat,
      index: index
    }));
  })
});

console.log("data", data)

svg.selectAll(".dot")
  .data( data )
  .enter().append("circle")
  .attr("class", "dot")
  .attr("cx", d => xScale(d.year) + dotScale(d.index) + 12)
  .attr("cy", d => yScale( d.category ) )
  .attr("r", 3)
  .style("fill", "white")
  .style("stroke", "grey")
  

// Append the SVG element.
container.append( svg.node() );
