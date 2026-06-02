import { yAxisDef, years } from "./helpers/axisData";
import * as d3 from "d3";

const SANITY_PROJECT_ID = 'ilq8a0ac';
const SANITY_DATASET = 'production';
const SANITY_API_VERSION = '2024-01-01';

const SANITY_QUERY = encodeURIComponent(`*[_type == "structure"] | order(name asc) {
  _id,
  name,
  blueprintImage { 
    asset-> { url },
    x,
    y
  },
  displayImage { asset-> { url } },
  previewPosition,
  dataPoints[] | order(year asc) {
    year,
    phase,
    season
  }
}`);

async function fetchStructures() {
  const url = `https://${SANITY_PROJECT_ID}.apicdn.sanity.io/v${SANITY_API_VERSION}/data/query/${SANITY_DATASET}?query=${SANITY_QUERY}`;
  const response = await fetch(url);
  const { result } = await response.json();
  return result;
}

function transformSanityData(structures) {
  return structures.map(s => ({
    name: s.name,
    listxy: (s.dataPoints || []).map(dp => ({
      year: dp.year,
      season: dp.season ?? 0,
      category: dp.phase.toUpperCase(),
    })),
    blueprintImg: s.blueprintImage?.asset?.url ?? "",
    blueprintX: s.blueprintImage?.x ?? 0,
    blueprintY: s.blueprintImage?.y ?? 0,
    displayImg: s.displayImage?.asset?.url ?? "",
  }));
}

// state
let focusState = false;
let targetYear = 0;
let sliding = false;

const container = document.getElementById('graph-contain');

const viewport = {};

function getVP() {
  viewport.width = window.innerWidth > 1000 ? window.innerWidth : 1000;
  viewport.height = window.innerHeight > 400 ? window.innerHeight : 400;
}
getVP();

window.addEventListener('resize', getVP);

const width = viewport.width;
const height = viewport.height;

const marginTop = height / 100;
const marginRight = width / 20;
const marginBottom = height / 50;
const marginLeft = width / 11;

const innerLeft = width / 70;
const innerTop = height / 100;
const bigGap = width / 1.5;

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

const spacerLabels = {
  "_spacer1": "OCCUPANCY",
  "_spacer2": "BUILDING",
  "_spacer3": "INFASTRUCTURE",
  "_spacer4": "PLANNING",
};

async function init() {
  const structures = await fetchStructures();
  const theHouses = transformSanityData(structures);

  const svg = d3.create("svg")
    .attr("class", "svg-d3")
    .attr("width", width)
    .attr("height", height);

  let cumulativePosition = innerLeft;

  const restOfGraph = (width - (innerLeft + marginLeft + marginRight)) - bigGap;
  const restWidth = restOfGraph / (years.length - 2);
  const defaultWidth = (width - (innerLeft + marginLeft + marginRight)) / years.length;

  function calcXpos(target) {
    cumulativePosition = innerLeft * 3;
    const xData = {};
    years.forEach(year => {
      const pos = cumulativePosition;
      cumulativePosition += (target !== 0 && year === target) ? bigGap : (target !== 0 ? restWidth : defaultWidth);
      xData[year] = { year, position: pos, season: 0 };
    });
    return xData;
  }

  let xPositions = calcXpos(targetYear);

  function getSeasonSpace(item) {
    if (item.year === targetYear) return bigGap / 4;
    if (targetYear === 0) return defaultWidth / 5;
    return restWidth / 5;
  }

  // x axis
  const xAxis = svg.append("g")
    .attr("transform", `translate(${marginLeft + innerLeft + 15},${height - marginBottom})`);

  xAxis.selectAll(".xLabel")
    .data(Object.values(xPositions))
    .enter()
    .append("text")
    .attr("class", "xLabel")
    .attr("x", 0)
    .attr("y", 0)
    .attr("transform", d => `translate(${d.position - 3}, 3) rotate(0)`)
    .attr("text-anchor", "middle")
    .attr("font-size", "0.7rem")
    .text(d => d.year);

  const globalYAxisPadding = 0.5;

  const yScale = d3.scaleBand()
    .domain(yAxisCat)
    .range([marginTop, height - marginBottom])
    .padding(globalYAxisPadding);

  const yAxis = d3.axisLeft(yScale)
    .tickSize(0)
    .tickPadding(0)
    .tickFormat(d => d.startsWith("_spacer") ? "" : d);

  const yAxisThemeScale = d3.scaleBand()
    .domain(yAxisCat)
    .range([marginTop, height - marginBottom])
    .padding(globalYAxisPadding);

  const yAxisLabels = d3.axisLeft(yAxisThemeScale)
    .tickSize(0)
    .tickPadding(0)
    .tickFormat(d => d.startsWith("_spacer") ? spacerLabels[d] : "");

  const yAxisLabelsGroup = svg.append("g")
    .attr("class", "yAxisLabels")
    .attr("transform", `translate(${innerLeft * 4},0)`)
    .attr("text-anchor", "middle")
    .call(yAxisLabels);

  svg.append("g")
    .attr("class", "yAxis")
    .attr("transform", `translate(${marginLeft + innerLeft},0)`)
    .call(yAxis);

  svg.selectAll("path").remove();

  // left column dots
  const leftColumnDotData = yAxisCat
    .filter(cat => !cat.startsWith("_spacer"))
    .map(cat => ({
      category: cat,
      cx: marginLeft + innerLeft,
      cy: yScale(cat) + 8,
    }));

  svg.selectAll(".left-dot")
    .data(leftColumnDotData)
    .enter()
    .append("circle")
    .attr("id", d => `left-dot-${d.category.replace(/\s+/g, '-')}`)
    .attr("class", "left-dot")
    .attr("cx", d => d.cx)
    .attr("cy", d => d.cy)
    .attr("r", 8)
    .style("fill", "white")
    .style("stroke", "black")
    .attr("transform", `translate(${innerLeft},-1)`);

  let dotData = Object.values(xPositions).flatMap(item =>
    yAxisCat.flatMap(cat =>
      cat.startsWith("_spacer") ? [] : d3.range(4).map(index => ({
        year: item.year,
        position: item.position,
        category: cat,
        index,
      }))
    )
  );

  svg.selectAll(".dot")
    .data(dotData)
    .enter()
    .append("circle")
    .attr("class", "dot")
    .attr("cx", d => xPositions[d.year].position + (d.index * getSeasonSpace(d)))
    .attr("cy", d => yScale(d.category) + 8)
    .attr("r", 3)
    .style("fill", "white")
    .style("stroke", "grey")
    .attr("transform", `translate(${innerLeft + marginLeft},0)`);

  const lineGen = d3.line()
    .x(d => {
      if (!focusState) {
        return xPositions[d.year].position + innerLeft + marginLeft + (d.season * getSeasonSpace(d));
      }
      return xPositions[d.year].position + innerLeft + marginLeft;
    })
    .y(d => yScale(d.category) + 10)
    .curve(d3.curveLinear);

  function reDrawElements(target) {
    sliding = true;
    xPositions = calcXpos(target);

    if (focusState) {
      xAxis.selectAll(".xLabel")
        .data(Object.values(xPositions))
        .transition()
        .duration(1000)
        .attr("transform", d => `translate(${d.position - 2}, 3) rotate(-90)`);
    } else {
      xAxis.selectAll(".xLabel")
        .data(Object.values(xPositions))
        .transition()
        .duration(1000)
        .attr("transform", d => `translate(${d.position - 2}, 3) rotate(0)`);
    }

    dotData = Object.values(xPositions).flatMap(item =>
      yAxisCat.flatMap(cat =>
        cat.startsWith("_spacer") ? [] : d3.range(4).map(index => ({
          year: item.year,
          position: item.position,
          category: cat,
          index,
        }))
      )
    );

    svg.selectAll(".dot")
      .data(dotData)
      .transition()
      .duration(1000)
      .attr("cx", d => focusState
        ? d.position
        : d.position + (d.index * getSeasonSpace(d))
      );

    theHouses.forEach(item => {
      svg.selectAll(`.lines-${item.name}`)
        .datum(item.listxy)
        .transition()
        .duration(1000)
        .attr("d", lineGen(item.listxy))
        .attr("stroke-width", 4);

      svg.selectAll(`.circles-${item.name}`)
        .data(item.listxy)
        .join("circle")
        .interrupt()
        .transition()
        .duration(1000)
        .attr("r", 7)
        .attr("cx", d => {
          if (!focusState) {
            return xPositions[d.year].position + innerLeft + marginLeft + (d.season * getSeasonSpace(d));
          }
          return xPositions[d.year].position + innerLeft + marginLeft;
        })
        .on("end", function () { sliding = false; });
    });
  }

  function closeZoom() {
    focusState = false;
    reDrawElements(0);
    svg.select(".story-image")
      .transition().duration(1000)
      .attr("opacity", 0)
      .attr("display", "none");
    d3.selectAll(".left-dot")
      .transition().duration(1000)
      .style("fill", "white");
  }

  function zoomOnItem(target, item) {
    if (!focusState) {
      focusState = true;
      reDrawElements(target);
      const xPos = xPositions[target].position;
      svg.select(".story-image")
        .attr("x", xPos + innerLeft + marginLeft + (xPos / 2))
        .attr("href", item.displayImg)
        .attr("width", bigGap - (xPos / 2))
        .attr("display", "block")
        .attr("preserveAspectRatio", "xMidYMid meet")
        .transition().duration(1000)
        .attr("opacity", 1);
    } else {
      closeZoom();
    }
  }

  // draw per-house elements
  theHouses.forEach(item => {
    svg.append("image")
      .attr("class", `preview-${item.name} thumbs`)
      .attr("x", (item.blueprintX / 100) * width)
      .attr("y", (item.blueprintY / 100) * height)
      .attr("width", "100")
      .attr("height", "100")
      .attr("href", item.blueprintImg)
      .attr("preserveAspectRatio", "xMidYMid meet")
      .on("mouseover", () => {
        d3.select(`.preview-${item.name}`)
          .transition().duration(500)
          .attr("width", "300").attr("height", "300");
        item.listxy.forEach(xy => {
          d3.select(`#left-dot-${xy.category.replace(/\s+/g, '-')}`)
            .transition().duration(1000).style("fill", "blue");
        });
      })
      .on("mouseout", () => {
        d3.select(`.preview-${item.name}`)
          .transition().duration(500)
          .attr("width", "100").attr("height", "100");
        if (!focusState) {
          item.listxy.forEach(xy => {
            d3.select(`#left-dot-${xy.category.replace(/\s+/g, '-')}`)
              .transition().duration(1000).style("fill", "white");
          });
        }
      })
      .on("click", () => {
        zoomOnItem(item.listxy[0].year, item);
        item.listxy.forEach(xy => {
          d3.select(`#left-dot-${xy.category.replace(/\s+/g, '-')}`)
            .transition().duration(1000).style("fill", "blue");
        });
      });

    svg.append("path")
      .datum(item.listxy)
      .attr("class", `lines-${item.name}`)
      .attr("fill", "none")
      .attr("stroke", "rgb(63, 84, 133)")
      .attr("stroke-width", 4)
      .attr("d", lineGen(item.listxy))
      .on("click", () => {
        zoomOnItem(item.listxy[0].year, item);
        item.listxy.forEach(xy => {
          d3.select(`#left-dot-${xy.category.replace(/\s+/g, '-')}`)
            .transition().duration(1000).style("fill", "blue");
        });
      })
      .on("mouseover", () => {
        item.listxy.forEach(xy => {
          d3.select(`#left-dot-${xy.category.replace(/\s+/g, '-')}`)
            .transition().duration(1000).style("fill", "blue");
        });
      })
      .on("mouseout", () => {
        if (!focusState) {
          item.listxy.forEach(xy => {
            d3.select(`#left-dot-${xy.category.replace(/\s+/g, '-')}`)
              .transition().duration(1000).style("fill", "white");
          });
        }
      });

    svg.selectAll(".circles")
      .data(item.listxy)
      .enter()
      .append("circle")
      .attr("class", `circles-${item.name}`)
      .attr("cx", d => xPositions[d.year].position + innerLeft + marginLeft + (d.season * getSeasonSpace(d)))
      .attr("cy", d => yScale(d.category) + 8)
      .attr("r", 7)
      .attr("fill", "rgb(63, 84, 133)")
      .on("click", function () {
        d3.select(this).interrupt().transition().duration(500).attr("r", 8);
        zoomOnItem(item.listxy[0].year, item);
        item.listxy.forEach(xy => {
          d3.select(`#left-dot-${xy.category.replace(/\s+/g, '-')}`)
            .transition().duration(1000).style("fill", "blue");
        });
      })
      .on("mouseover", function () {
        if (!sliding) d3.select(this).transition().duration(500).attr("r", 12);
        item.listxy.forEach(xy => {
          d3.select(`#left-dot-${xy.category.replace(/\s+/g, '-')}`)
            .transition().duration(1000).style("fill", "blue");
        });
      })
      .on("mouseout", function () {
        if (!focusState) {
          item.listxy.forEach(xy => {
            d3.select(`#left-dot-${xy.category.replace(/\s+/g, '-')}`)
              .transition().duration(1000).style("fill", "white");
          });
        }
        if (!sliding) d3.select(this).transition().duration(500).attr("r", 8);
      });
  });

  // focused story image (hidden until zoom)
  svg.append("image")
    .attr("class", "story-image")
    .attr("x", 0)
    .attr("y", 0)
    .attr("width", bigGap - marginRight - marginLeft)
    .attr("height", height - marginBottom - marginTop)
    .attr("display", "none")
    .attr("opacity", 0)
    .attr("href", theHouses[0]?.displayImg ?? "")
    .attr("preserveAspectRatio", "xMidYMid meet")
    .on("click", () => { if (focusState) closeZoom(); });

  // spacer label decorations
  yAxisLabelsGroup.selectAll("text").each(function () {
    if (this.__data__.startsWith("_spacer")) {
      d3.select(this)
        .style("font-size", "0.7rem")
        .attr("text-anchor", "middle");

      d3.select(this.parentNode)
        .insert("rect", "text")
        .attr("x", "-4rem")
        .attr("y", "-0.6rem")
        .attr("width", "8rem")
        .attr("height", "1.2rem")
        .attr("rx", "10px")
        .attr("ry", 6)
        .style("fill", "none")
        .style("stroke", "black")
        .style("stroke-width", 0.5);

      d3.select(this.parentNode)
        .insert("line", "rect")
        .attr("x1", "4rem")
        .attr("y1", 0)
        .attr("x2", width - innerLeft * 5)
        .attr("y2", 0)
        .style("stroke", "black")
        .style("stroke-width", 1)
        .style("stroke-dasharray", "5, 8");
    }
  });

  svg.selectAll(".thumbs").raise();
  svg.select(".story-image").raise();

  container.append(svg.node());
}

init();
