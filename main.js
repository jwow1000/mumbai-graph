import * as d3 from "d3";

// get the graph container from webflow
const container = document.getElementById('graph-contain');
const graphItems = document.querySelectorAll('.graph-items');

console.log("graphitems", graphItems);

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

// test path coordinates
// make a data object
const theHouses = [] 

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
  console.log("wow", theHouses)
});


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

// make the dot grid data
const data = years.flatMap( year => {
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

console.log("data", data)

svg.selectAll(".dot")
  .data( data )
  .enter().append("circle")
  .attr("class", "dot")
  .attr("cx", d => xScale(d.year) + dotScale(d.index) + 12)
  .attr("cy", d => yScale( d.category ) + 10 )
  .attr("r", 3)
  .style("fill", "white")
  .style("stroke", "grey")

// make the line
const line = d3.line()
  .x(d => xScale( d.year ) + 5 )
  .y(d => yScale( d.category ) + 10 )
  .curve( d3.curveLinear);

// zoom function
function zoomOnItem( selectedItem ) {
  const zoomed = years.map( y => {
    if( y < 2006 || y > 2018 ) {
      return
    }
  })
  console.log("zzzooomm")
}

theHouses.forEach( (item) => {

  // draw the line
  svg.append("path")
    .datum( item.listxy )
    // .datum( house1 )
    .attr("fill", "none")
    .attr("stroke", "black")
    .attr("stroke-width", 2)
    .attr("d", line)
    // .on('click', (event, d) => zoomOnItem( d.title ))
  
  // add circles to the line
  svg.selectAll(".circles")
    .data( item.listxy )
    .enter()
    .append("circle")
    .attr("cx", d => xScale( d.year ) + 5 )
    .attr("cy", d => yScale( d.category ) + 10 )
    .attr("r", 8)
    .attr("fill", "blue")
    .on('click', (event, d) => {
      console.log(`Circle for ${d.year} in ${d.category} clicked ${item.name}`);
    })

});


// Append the SVG element.
container.append( svg.node() );
