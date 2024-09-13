import * as d3 from "d3";

const container = document.getElementById('graph-contain');

// Declare the chart dimensions and margins.
const width = 800;
const height = 1400;
const marginTop = 180;
const marginRight = 20;
const marginBottom = 30;
const marginLeft = 40;
const innerLeft = 30;
const innerTop = 40;

const numCols = 12;
const numRows = 11;


// x-axis define
const xAxisDef = {
  planning: [
    "NA CONVERSION",
    "PURCHASING OF LAND",
    "SURVEY",
    "VERIFICATION",
    "PLAN MAKING",
    "PLAN APPROVAL",
    "PLAN VERIFICATION",
  ],
  infastructure: [
    "ELECTRICITY",
    "SEWAGE",
    "DRAINAGE",
    "TOILET",
    "WATER SUPPLY",
    "PUBLIC SPACES",
  ],
  building: [
    "KACHHA HOUSE",
    "PAKKA HOUSE",
    "EXTENSIONS",
    "RETROFITS",
  ],
  occupancy: [
    "OWNERSHIP",
    "RENTAL",
    "PART RENTAL"
  ]
}

// y axis range define
const dateRange = d3.timeMonths( new Date("2002-01-01"), new Date("2024-01-01"), 6);

const xAxisCat = [
  ...xAxisDef.planning, 
  ...xAxisDef.infastructure, 
  ...xAxisDef.building, 
  ...xAxisDef.occupancy
]

// test path coordinates
const house1 = [
  { date: new Date("2005-01-01"), category: "KACHHA HOUSE" },
  { date: new Date("2010-01-01"), category: "PAKKA HOUSE" },
  { date: new Date("2015-01-01"), category: "TOILET" },
  { date: new Date("2020-01-01"), category: "OWNERSHIP" },
];


// make a planning x axis
const x = d3.scaleBand()
  .domain( xAxisCat )
  .range( [0, width] )
  .padding( 0.1 )

// Declare the y (horizontal position) scale.
const y = d3.scaleUtc()
  .domain([new Date("2002-01-01"), new Date("2024-01-01")])
  .range([ marginLeft, height]);

// Create the SVG container.
const svg = d3.create("svg")
    .attr("width", width)
    .attr("height", height);

// Add the x-axis.
svg.append("g")
  .attr("transform", `translate(${ marginLeft + innerLeft }, ${ marginTop })`)
  .call( d3.axisTop(x) )
  .attr("class", "xAxis")
  .selectAll("path, line")
  .style("display", "none")

// style the x axis
svg.selectAll(".xAxis text")
  .style("text-anchor", "start") // Center-align text
  .attr("transform", "rotate(-90)") // Rotate labels 90 degrees
  .attr("y", 0) // Move labels to the left to align correctly
  .attr("x", 0) // Adjust horizontal positioning
  .style("font-size", "10px")

// Add the y-axis.
svg.append("g")
  .attr("transform", `translate(${marginLeft},${marginTop + innerTop})`)
  .call( d3.axisLeft(y))
  .attr("class", "yAxis")
  .selectAll("path, line")
  .style("display", "none")


// make the dot grid
const data = xAxisCat.flatMap(cat => {
  return dateRange.map(date => ({
    category: cat,
    date: date
  }));
});

svg.selectAll(".dot")
  .data( data )
  .enter().append("circle")
  .attr("class", "dot")
  .attr("cx", d => x(d.category) + marginLeft + 15 + innerLeft)
  .attr("cy", d => y(d.date) + marginTop + innerTop)
  .attr("r", 6)
  .style("fill", "none")
  .style("stroke", "grey")



// make the line
const line = d3.line()
  .x(d => x(d.category) + marginLeft + 15 + innerLeft)
  .y(d => y(d.date) + marginTop + innerTop)
  .curve( d3.curveLinear);

// draw the line
svg.append("path")
  .datum( house1 )
  .attr("fill", "none")
  .attr("stroke", "black")
  .attr("stroke-width", 2)
  .attr("d", line);


// Append the SVG element.
container.append( svg.node() );


