import * as d3 from "d3";

const container = document.querySelector('#app');

// Declare the chart dimensions and margins.
const width = 800;
const height = 400;
const marginTop = 20;
const marginRight = 20;
const marginBottom = 30;
const marginLeft = 40;
const numCols = 12;
const numRows = 11;

// test path coordinates
const house1 = [
  { date: new Date("2005-01-01"), value: 30 },
  { date: new Date("2010-01-01"), value: 50 },
  { date: new Date("2015-01-01"), value: 70 },
  { date: new Date("2020-01-01"), value: 10 },
];

// Declare the x (horizontal position) scale.
const x = d3.scaleUtc()
    .domain([new Date("2002-01-01"), new Date("2024-01-01")])
    .range([marginLeft, width - marginRight]);

// Declare the y (vertical position) scale.
const y = d3.scaleLinear()
    .domain([0, 100])
    .range([height - marginBottom, marginTop]);

// Create the SVG container.
const svg = d3.create("svg")
    .attr("width", width)
    .attr("height", height);

// Add the x-axis.
svg.append("g")
    .attr("transform", `translate(0,${height - marginBottom})`)
    .call(d3.axisBottom(x));

// Add the y-axis.
svg.append("g")
    .attr("transform", `translate(${marginLeft},0)`)
    .call(d3.axisLeft(y));

// make dot grid
const xPositions = d3.range( numCols ).map(d => 
  x.invert(
    x.range()[0] + d * (x.range()[1] - x.range()[0]) / (numCols - 1 ))
);
const yPositions = d3.range( numRows ).map(d => y.invert(
  y.range()[0] + d * (y.range()[1] - y.range()[0]) / (numRows - 1 ))
);

// append the dots to the SVG
xPositions.forEach( xVal => {
  yPositions.forEach( yVal => {
    svg.append("circle")
      .attr("cx", x(xVal))
      .attr("cy", y(yVal))
      .attr("r", 5)
      .attr("fill", "steelBlue");
  });
});



    // // a function to make the dots
// const dotsData = d3.range( rows*cols ).map(i => {
//   const row = Math.floor( i / cols );
//   const col = i % cols;
  
//   return {
//     cx: (col * dotSpacing + dotRadius) + marginLeft,
//     cy: (row * dotSpacing + dotRadius) + marginTop
//   };
// });

// make the dots
// svg.selectAll("circle")
//      .data( dotsData )
//      .enter()
//      .append("circle")
//      .attr("cx", d => d.cx)
//      .attr("cy", d => d.cy)
//      .attr("r", dotRadius)
//      .attr("fill", "gray")

//      // Add hover effect
//      .on("mouseover", function() {
//         d3.select(this)
//           .classed("hovered", true)
//           .attr("r", dotRadius * 3)
//           .attr("fill", "orange");  // Increase radius on hover
//     })
//     .on("mouseout", function() {
//         d3.select(this)
//           .classed("hovered", false)
//           .attr("r", dotRadius)  // Reset radius after hover
//           .attr("fill", "blue");
//     });

// make the line
const line = d3.line()
  .x(d => x(d.date))
  .y(d => y(d.value))
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


