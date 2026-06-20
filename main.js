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

const MAJOR_EVENT_QUERY = encodeURIComponent(`*[_type == "majorEvent"] | order(year asc, season asc) {
  _id,
  title,
  year,
  season,
  content[] {
    _type,
    asset-> { url }
  }
}`);

async function fetchMajorEvents() {
  const url = `https://${SANITY_PROJECT_ID}.apicdn.sanity.io/v${SANITY_API_VERSION}/data/query/${SANITY_DATASET}?query=${MAJOR_EVENT_QUERY}`;
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

function transformMajorEvents(events) {
  return (events || []).map(e => ({
    id: e._id,
    title: e.title,
    year: e.year,
    season: e.season ?? 1,
    contentItems: (e.content || [])
      .filter(item => item.asset?.url)
      .map(item => ({ type: item._type, url: item.asset.url })),
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

const marginTop = height / 100 + 40;
const marginRight = width / 20;
const marginBottom = height / 12 - 30;
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
  const [structures, majorEventsRaw] = await Promise.all([
    fetchStructures(),
    fetchMajorEvents(),
  ]);
  const theHouses = transformSanityData(structures);
  const majorEvents = transformMajorEvents(majorEventsRaw);

  const svg = d3.create("svg")
    .attr("class", "svg-d3")
    .attr("width", width)
    .attr("height", height);

  // attach immediately so getBBox() (used for major-event label backgrounds)
  // returns accurate measurements in browsers that require a live layout tree
  container.append(svg.node());

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

  function majorEventX(evt) {
    const xPos = xPositions[evt.year];
    if (!xPos) return null;
    return xPos.position + innerLeft + marginLeft + ((evt.season - 1) * getSeasonSpace(evt));
  }

  const majorEventLabelGap = 6;

  function majorEventLabelAttrs(cx) {
    const isLeftOfCenter = cx < width / 2;
    return {
      x: isLeftOfCenter ? cx + majorEventLabelGap : cx - majorEventLabelGap,
      anchor: isLeftOfCenter ? "start" : "end",
    };
  }

  // major events — global markers spanning the full chart height, not mapped
  // to the y-axis. Drawn first so they sit on the bottom-most z-layer.
  const majorEventColor = "rgb(0, 32, 191)";
  const majorEventTopY = marginTop;
  const majorEventBottomY = height - marginBottom;
  const majorEventDotTopY = majorEventTopY - 13;
  const majorEventDotBottomY = majorEventBottomY + 27;
  const majorEventLabelPadding = 5;
  const majorEventLabelBg = "lightgray";

  const majorEventsGroup = svg.append("g")
    .attr("class", "major-events")
    .attr("transform", "translate(0,-5)");

  const majorEventLabelWidths = {};

  function buildMajorEventLabel(key, x, y, anchor, title) {
    const group = majorEventsGroup.append("g")
      .attr("class", `${key} major-event-label`)
      .style("opacity", 0)
      .style("pointer-events", "none");

    const text = group.append("text")
      .attr("x", x)
      .attr("y", y)
      .attr("text-anchor", anchor)
      .attr("dominant-baseline", "middle")
      .attr("font-size", "11px")
      .style("fill", majorEventColor)
      .text(title);

    const bbox = text.node().getBBox();
    majorEventLabelWidths[key] = bbox.width;

    group.insert("rect", "text")
      .attr("x", bbox.x - majorEventLabelPadding)
      .attr("y", bbox.y - majorEventLabelPadding)
      .attr("width", bbox.width + majorEventLabelPadding * 2)
      .attr("height", bbox.height + majorEventLabelPadding * 2)
      .style("fill", majorEventLabelBg);

    return group;
  }

  majorEvents.forEach((evt, i) => {
    const cx = majorEventX(evt);
    if (cx === null) return;

    const labelAttrs = majorEventLabelAttrs(cx);

    majorEventsGroup.append("line")
      .attr("class", `major-event-line-${i}`)
      .attr("x1", cx)
      .attr("y1", majorEventDotTopY)
      .attr("x2", cx)
      .attr("y2", majorEventDotBottomY)
      .style("stroke", majorEventColor)
      .style("stroke-width", 1)
      .style("stroke-dasharray", "10,3,2,3");

    const topLabelGroup = buildMajorEventLabel(
      `major-event-label-top-${i}`, labelAttrs.x, majorEventDotTopY, labelAttrs.anchor, evt.title
    );
    const bottomLabelGroup = buildMajorEventLabel(
      `major-event-label-bottom-${i}`, labelAttrs.x, majorEventDotBottomY, labelAttrs.anchor, evt.title
    );

    majorEventsGroup.append("circle")
      .attr("class", `major-event-dot-top-${i}`)
      .attr("cx", cx)
      .attr("cy", majorEventDotTopY)
      .attr("r", 5)
      .style("fill", majorEventColor)
      .style("cursor", "pointer")
      .on("mouseover", () => topLabelGroup.transition().duration(200).style("opacity", 1))
      .on("mouseout", () => topLabelGroup.transition().duration(200).style("opacity", 0))
      .on("click", () => {
        topLabelGroup.transition().duration(200).style("opacity", 1);
        openMajorEventContent(evt);
      });

    majorEventsGroup.append("circle")
      .attr("class", `major-event-dot-bottom-${i}`)
      .attr("cx", cx)
      .attr("cy", majorEventDotBottomY)
      .attr("r", 5)
      .style("fill", majorEventColor)
      .style("cursor", "pointer")
      .on("mouseover", () => bottomLabelGroup.transition().duration(200).style("opacity", 1))
      .on("mouseout", () => bottomLabelGroup.transition().duration(200).style("opacity", 0))
      .on("click", () => {
        bottomLabelGroup.transition().duration(200).style("opacity", 1);
        openMajorEventContent(evt);
      });
  });

  // keep label groups above every major-event dot, regardless of draw order
  majorEventsGroup.selectAll(".major-event-label").raise();

  // x axis — bottom
  const xAxis = svg.append("g")
    .attr("transform", `translate(${marginLeft + innerLeft},${height - marginBottom})`);

  xAxis.selectAll(".xLabel")
    .data(Object.values(xPositions))
    .enter()
    .append("text")
    .attr("class", "xLabel")
    .attr("x", 0)
    .attr("y", 0)
    .attr("transform", d => `translate(${d.position + 1.5 * getSeasonSpace(d)}, 8) rotate(0)`)
    .attr("text-anchor", "middle")
    .attr("font-size", "12px")
    .text(d => d.year);

  const globalYAxisPadding = 0.5;

  const yScale = d3.scaleBand()
    .domain(yAxisCat)
    .range([marginTop, height - marginBottom])
    .padding(globalYAxisPadding);

  // x axis — top (just below the occupancy dashed line)
  const xAxisTopY = yScale("_spacer1") + yScale.bandwidth() / 2;
  const xAxisTop = svg.append("g")
    .attr("transform", `translate(${marginLeft + innerLeft},${xAxisTopY})`);

  xAxisTop.selectAll(".xLabelTop")
    .data(Object.values(xPositions))
    .enter()
    .append("text")
    .attr("class", "xLabelTop")
    .attr("x", 0)
    .attr("y", 0)
    .attr("transform", d => `translate(${d.position + 1.5 * getSeasonSpace(d)}, 13) rotate(0)`)
    .attr("text-anchor", "middle")
    .attr("font-size", "12px")
    .text(d => d.year);

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
        return xPositions[d.year].position + innerLeft + marginLeft + ((d.season - 1) * getSeasonSpace(d));
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
        .attr("transform", d => `translate(${d.position + 1.5 * getSeasonSpace(d)}, 8) rotate(-90)`);
      xAxisTop.selectAll(".xLabelTop")
        .data(Object.values(xPositions))
        .transition()
        .duration(1000)
        .attr("transform", d => `translate(${d.position + 1.5 * getSeasonSpace(d)}, 11) rotate(-90)`);
    } else {
      xAxis.selectAll(".xLabel")
        .data(Object.values(xPositions))
        .transition()
        .duration(1000)
        .attr("transform", d => `translate(${d.position + 1.5 * getSeasonSpace(d)}, 8) rotate(0)`);
      xAxisTop.selectAll(".xLabelTop")
        .data(Object.values(xPositions))
        .transition()
        .duration(1000)
        .attr("transform", d => `translate(${d.position + 1.5 * getSeasonSpace(d)}, 11) rotate(0)`);
    }

    majorEvents.forEach((evt, i) => {
      const cx = majorEventX(evt);
      if (cx === null) return;
      const labelAttrs = majorEventLabelAttrs(cx);
      svg.select(`.major-event-line-${i}`)
        .transition().duration(1000)
        .attr("x1", cx).attr("x2", cx);
      svg.select(`.major-event-dot-top-${i}`)
        .transition().duration(1000)
        .attr("cx", cx);
      svg.select(`.major-event-dot-bottom-${i}`)
        .transition().duration(1000)
        .attr("cx", cx);

      ["top", "bottom"].forEach(pos => {
        const key = `major-event-label-${pos}-${i}`;
        const labelWidth = majorEventLabelWidths[key] ?? 0;
        const rectX = labelAttrs.anchor === "start"
          ? labelAttrs.x - majorEventLabelPadding
          : labelAttrs.x - labelWidth - majorEventLabelPadding;
        const group = svg.select(`.${key}`);
        group.select("text")
          .attr("text-anchor", labelAttrs.anchor)
          .transition().duration(1000)
          .attr("x", labelAttrs.x);
        group.select("rect")
          .transition().duration(1000)
          .attr("x", rectX);
      });
    });

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
          .attr("r", 5)
          .attr("cx", d => {
            if (!focusState) {
              return xPositions[d.year].position + innerLeft + marginLeft + ((d.season - 1) * getSeasonSpace(d));
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
    svg.select(".story-content")
      .transition().duration(1000)
      .style("opacity", 0)
      .on("end", function () { d3.select(this).style("display", "none"); });
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

  function openMajorEventContent(evt) {
    if (!evt.contentItems.length) return;
    if (!focusState) {
      focusState = true;
      reDrawElements(evt.year);
      const xPos = xPositions[evt.year].position;

      const storyContentScroll = svg.select(".story-content-scroll");
      storyContentScroll.selectAll("*").remove();
      evt.contentItems.forEach(item => {
        if (item.type === "file") {
          storyContentScroll.append("xhtml:iframe")
            .attr("src", item.url)
            .style("width", "100%")
            .style("height", `${height}px`)
            .style("border", "none")
            .style("display", "block");
        } else {
          storyContentScroll.append("xhtml:img")
            .attr("src", item.url)
            .style("width", "100%")
            .style("display", "block");
        }
      });

      svg.select(".story-content")
        .attr("x", xPos + innerLeft + marginLeft)
        .style("display", "block")
        .transition().duration(1000)
        .style("opacity", 1);
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
      .attr("x", bpCx - 93.75)
      .attr("y", bpCy - 93.75)
      .attr("width", "187.5")
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
          .attr("x", bpCx - 117.1875).attr("y", bpCy - 117.1875)
          .attr("width", "234.375");
        highlightDots(item, "rgb(0, 32, 191)");
      })
      .on("mouseout", () => {
        bpImg.transition().duration(500)
          .attr("x", bpCx - 93.75).attr("y", bpCy - 93.75)
          .attr("width", "187.5");
        if (!focusState) highlightDots(item, "white");
      })
      .on("click", () => {
        const firstYear = item.lifeCycles[0]?.points[0]?.year;
        if (firstYear) zoomOnItem(firstYear, item);
        highlightDots(item, "rgb(0, 32, 191)");
      });

    item.lifeCycles.forEach((lc, lcIndex) => {
      const key = `${item.name}-${lcIndex}`;

      // per-point preview thumbnails — positioned at the dot's graph coordinates
      lc.points.forEach((pt, ptIndex) => {
        if (!pt.previewImg) return;
        const dotCx = xPositions[pt.year].position + innerLeft + marginLeft + ((pt.season - 1) * getSeasonSpace(pt));
        const dotCy = yScale(pt.category) + 8;
        const ptCx = dotCx + (pt.previewX ?? 0);
        const ptCy = dotCy + (pt.previewY ?? 0);
        const ptClass = `point-preview-${item.name}-${lcIndex}-${ptIndex}`;
        const ptImg = svg.append("image")
          .attr("class", `${ptClass} thumbs`)
          .attr("x", ptCx - 93.75)
          .attr("y", ptCy - 93.75)
          .attr("width", "187.5")
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
            ptImg.transition().duration(500)
              .attr("x", ptCx - 117.1875).attr("y", ptCy - 117.1875)
              .attr("width", "234.375");
            d3.select(`#left-dot-${pt.category.replace(/\s+/g, '-')}`)
              .transition().duration(500).style("fill", "rgb(0, 32, 191)");
            d3.select(`#circle-${item.name}-${lcIndex}-${ptIndex}`)
              .transition().duration(500).attr("r", 8);
          })
          .on("mouseout", () => {
            ptImg.transition().duration(500)
              .attr("x", ptCx - 93.75).attr("y", ptCy - 93.75)
              .attr("width", "187.5");
            if (!focusState) {
              d3.select(`#left-dot-${pt.category.replace(/\s+/g, '-')}`)
                .transition().duration(500).style("fill", "white");
            }
            d3.select(`#circle-${item.name}-${lcIndex}-${ptIndex}`)
              .transition().duration(500).attr("r", 5);
          })
          .on("click", () => {
            if (!pt.contentImg) return;
            zoomOnItem(pt.year, item, pt.contentImg);
            d3.select(`#left-dot-${pt.category.replace(/\s+/g, '-')}`)
              .transition().duration(1000).style("fill", "rgb(0, 32, 191)");
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
          highlightDots(item, "rgb(0, 32, 191)");
        })
        .on("mouseover", () => {
          highlightDots(item, "rgb(0, 32, 191)");
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
        .attr("id", (d, i) => `circle-${item.name}-${lcIndex}-${i}`)
        .attr("cx", d => xPositions[d.year].position + innerLeft + marginLeft + ((d.season - 1) * getSeasonSpace(d)))
        .attr("cy", d => yScale(d.category) + 8)
        .attr("r", 5)
        .attr("fill", "rgb(0, 0, 0)")
        .on("click", function (event, d) {
          if (!d.contentImg) return;
          d3.select(this).interrupt().transition().duration(500).attr("r", 5);
          zoomOnItem(d.year, item, d.contentImg);
          d3.select(`#left-dot-${d.category.replace(/\s+/g, '-')}`)
            .transition().duration(1000).style("fill", "rgb(0, 32, 191)");
        })
        .on("mouseover", function (event, d) {
          if (!sliding) d3.select(this).transition().duration(500).attr("r", 8);
          d3.select(`#left-dot-${d.category.replace(/\s+/g, '-')}`)
            .transition().duration(500).style("fill", "rgb(0, 32, 191)");
        })
        .on("mouseout", function (event, d) {
          if (!sliding) d3.select(this).transition().duration(500).attr("r", 5);
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

  // scrollable content viewer for major events with multiple photos/PDFs
  const storyContent = svg.append("foreignObject")
    .attr("class", "story-content")
    .attr("x", 0)
    .attr("y", 0)
    .attr("width", bigGap)
    .attr("height", height)
    .style("display", "none")
    .style("opacity", 0);

  storyContent.append("xhtml:div")
    .attr("class", "story-content-scroll")
    .style("width", "100%")
    .style("height", "100%")
    .style("overflow-y", "auto")
    .style("background", "white")
    .style("cursor", "pointer")
    .on("click", () => { if (focusState) closeZoom(); });

  // spacer label decorations
  yAxisLabelsGroup.selectAll("text").each(function () {
    if (this.__data__.startsWith("_spacer")) {
      d3.select(this)
        .style("font-size", "12px")
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

      if (this.__data__ !== "_spacer1") {
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
    }
  });

  svg.selectAll(".thumbs").raise();
  svg.select(".story-image").raise();
  svg.select(".story-content").raise();
}

if (window.innerWidth < 1000) {
  const msg = document.createElement('div');
  msg.textContent = 'sorry, this only works on widescreens';
  msg.style.cssText = 'display:flex;align-items:center;justify-content:center;width:100%;height:100%;font-family:sans-serif;font-size:1rem;text-align:center;padding:2rem;';
  container.style.cssText = 'width:100vw;height:100vh;';
  container.appendChild(msg);
} else {
  init();
}
