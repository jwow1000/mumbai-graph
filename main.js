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
  lifeCycles[] {
    label,
    dataPoints[] | order(year asc) {
      year,
      phase,
      season,
      previewImage {
        asset-> { url },
        x,
        y
      },
      contentImage { asset-> { url } }
    }
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
    lifeCycles: (s.lifeCycles || []).map(lc => ({
      label: lc.label,
      points: (lc.dataPoints || []).map(dp => ({
        year: dp.year,
        season: dp.season ?? 0,
        category: dp.phase.toUpperCase(),
        previewImg: dp.previewImage?.asset?.url ?? "",
        previewX: dp.previewImage?.x ?? null,
        previewY: dp.previewImage?.y ?? null,
        contentImg: dp.contentImage?.asset?.url ?? "",
      })),
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
const marginBottom = height / 12;
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
  "_spacer3": "INFRASTRUCTURE",
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
    .attr("transform", d => `translate(${d.position - 3}, 8) rotate(0)`)
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

  function highlightDots(item, color) {
    item.lifeCycles.forEach(lc => {
      lc.points.forEach(xy => {
        d3.select(`#left-dot-${xy.category.replace(/\s+/g, '-')}`)
          .transition().duration(1000).style("fill", color);
      });
    });
  }

  function reDrawElements(target) {
    sliding = true;
    xPositions = calcXpos(target);

    if (focusState) {
      xAxis.selectAll(".xLabel")
        .data(Object.values(xPositions))
        .transition()
        .duration(1000)
        .attr("transform", d => `translate(${d.position - 2}, 8) rotate(-90)`);
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
      item.lifeCycles.forEach((lc, lcIndex) => {
        const key = `${item.name}-${lcIndex}`;
        svg.selectAll(`.lines-${key}`)
          .datum(lc.points)
          .transition()
          .duration(1000)
          .attr("d", lineGen(lc.points))
          .attr("stroke-width", 1);

        svg.selectAll(`.circles-${key}`)
          .data(lc.points)
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

  function zoomOnItem(target, item, imgOverride) {
    const img = imgOverride || item.displayImg;
    if (!focusState) {
      focusState = true;
      reDrawElements(target);
      const xPos = xPositions[target].position;
      svg.select(".story-image")
        .attr("x", xPos + innerLeft + marginLeft)
        .attr("href", img)
        .attr("width", bigGap)
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
    // blueprint thumbnail
    const bpCx = (item.blueprintX / 100) * width;
    const bpCy = (item.blueprintY / 100) * height;
    const bpImg = svg.append("image")
      .attr("class", `preview-${item.name} thumbs`)
      .attr("x", bpCx - 75)
      .attr("y", bpCy - 75)
      .attr("width", "150")
      .attr("href", item.blueprintImg)
      .attr("preserveAspectRatio", "xMidYMid meet")
      .attr("pointer-events", "none");

    svg.append("rect")
      .attr("class", "thumbs")
      .attr("x", bpCx - 30)
      .attr("y", bpCy - 30)
      .attr("width", 60)
      .attr("height", 60)
      .attr("fill", "transparent")
      .on("mouseover", () => {
        bpImg.transition().duration(500)
          .attr("x", bpCx - 93.75).attr("y", bpCy - 93.75)
          .attr("width", "187.5");
        highlightDots(item, "blue");
      })
      .on("mouseout", () => {
        bpImg.transition().duration(500)
          .attr("x", bpCx - 75).attr("y", bpCy - 75)
          .attr("width", "150");
        if (!focusState) highlightDots(item, "white");
      })
      .on("click", () => {
        const firstYear = item.lifeCycles[0]?.points[0]?.year;
        if (firstYear) zoomOnItem(firstYear, item);
        highlightDots(item, "blue");
      });

    item.lifeCycles.forEach((lc, lcIndex) => {
      const key = `${item.name}-${lcIndex}`;

      // per-point preview thumbnails — positioned at the dot's graph coordinates
      lc.points.forEach((pt, ptIndex) => {
        if (!pt.previewImg) return;
        const dotCx = xPositions[pt.year].position + innerLeft + marginLeft + (pt.season * getSeasonSpace(pt));
        const dotCy = yScale(pt.category) + 8;
        const ptCx = dotCx + (pt.previewX ?? 0);
        const ptCy = dotCy + (pt.previewY ?? 0);
        const ptClass = `point-preview-${item.name}-${lcIndex}-${ptIndex}`;
        const ptImg = svg.append("image")
          .attr("class", `${ptClass} thumbs`)
          .attr("x", ptCx - 75)
          .attr("y", ptCy - 75)
          .attr("width", "150")
          .attr("href", pt.previewImg)
          .attr("preserveAspectRatio", "xMidYMid meet")
          .attr("pointer-events", "none");

        svg.append("rect")
          .attr("class", "thumbs")
          .attr("x", ptCx - 30)
          .attr("y", ptCy - 30)
          .attr("width", 60)
          .attr("height", 60)
          .attr("fill", "transparent")
          .on("mouseover", () => {
            if (!pt.contentImg) return;
            ptImg.transition().duration(500)
              .attr("x", ptCx - 93.75).attr("y", ptCy - 93.75)
              .attr("width", "187.5");
            d3.select(`#left-dot-${pt.category.replace(/\s+/g, '-')}`)
              .transition().duration(500).style("fill", "blue");
          })
          .on("mouseout", () => {
            if (!pt.contentImg) return;
            ptImg.transition().duration(500)
              .attr("x", ptCx - 75).attr("y", ptCy - 75)
              .attr("width", "150");
            if (!focusState) {
              d3.select(`#left-dot-${pt.category.replace(/\s+/g, '-')}`)
                .transition().duration(500).style("fill", "white");
            }
          })
          .on("click", () => {
            if (!pt.contentImg) return;
            zoomOnItem(pt.year, item, pt.contentImg);
            d3.select(`#left-dot-${pt.category.replace(/\s+/g, '-')}`)
              .transition().duration(1000).style("fill", "blue");
          });
      });

      // life cycle line
      svg.append("path")
        .datum(lc.points)
        .attr("class", `lines-${key}`)
        .attr("fill", "none")
        .attr("stroke", "rgb(0, 0, 0)")
        .attr("stroke-width", 1)
        .attr("d", lineGen(lc.points))
        .on("click", () => {
          const firstYear = lc.points[0]?.year;
          if (firstYear) zoomOnItem(firstYear, item);
          highlightDots(item, "blue");
        })
        .on("mouseover", () => {
          highlightDots(item, "blue");
        })
        .on("mouseout", () => {
          if (!focusState) highlightDots(item, "white");
        });

      // data point circles
      svg.selectAll(`.circles-init-${key}`)
        .data(lc.points)
        .enter()
        .append("circle")
        .attr("class", `circles-${key}`)
        .attr("cx", d => xPositions[d.year].position + innerLeft + marginLeft + (d.season * getSeasonSpace(d)))
        .attr("cy", d => yScale(d.category) + 8)
        .attr("r", 7)
        .attr("fill", "rgb(0, 0, 0)")
        .on("click", function (event, d) {
          if (!d.contentImg) return;
          d3.select(this).interrupt().transition().duration(500).attr("r", 8);
          zoomOnItem(d.year, item, d.contentImg);
          d3.select(`#left-dot-${d.category.replace(/\s+/g, '-')}`)
            .transition().duration(1000).style("fill", "blue");
        })
        .on("mouseover", function (event, d) {
          if (!sliding) d3.select(this).transition().duration(500).attr("r", 12);
          d3.select(`#left-dot-${d.category.replace(/\s+/g, '-')}`)
            .transition().duration(500).style("fill", "blue");
        })
        .on("mouseout", function (event, d) {
          if (!sliding) d3.select(this).transition().duration(500).attr("r", 8);
          if (!focusState) {
            d3.select(`#left-dot-${d.category.replace(/\s+/g, '-')}`)
              .transition().duration(500).style("fill", "white");
          }
        });
    });
  });

  // focused story image (hidden until zoom)
  svg.append("image")
    .attr("class", "story-image")
    .attr("x", 0)
    .attr("y", 0)
    .attr("width", bigGap)
    .attr("height", height)
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
