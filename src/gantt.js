import * as d3 from "d3";
import { chart as baseChart, config, tooltip } from "lotivis-chart";
import {
  colorScale1,
  colorSchemeDefault,
  ColorsGenerator,
} from "lotivis-colors";

import { hash } from "./hash.js";

function transX(x) {
  return "translate(" + x + ",0)";
}

function transY(y) {
  return "translate(0," + y + ")";
}

const DATE_ACCESS = function (d) {
  return d;
};

export const GANTT_SORT = {
  /**
   * Sorts datasets alphabetically.
   */
  alphabetically: (left, right) => left.label < right.label,

  /**
   * Sorts datasets by duration.
   */
  duration: (left, right) => left.duration - right.duration,

  /**
   * Sorts datasets by intensity.
   */
  intensity: (left, right) => left.sum - right.sum,

  /**
   * Sorts datasets by first date.
   */
  firstDate: (left, right) => right.firstDate - left.firstDate,
};

/**
 * Reusable Plot Chart API class that renders a
 * simple and configurable gantt chart.
 *
 * @requires d3
 *
 * @example
 * var chart = lotivis
 *    .gantt()
 *    .selector(".css-selector")
 *    .dataController(dc)
 *    .run();
 *
 */
export function gantt() {
  // Private
  let calc = {};
  let attr = {
    id: "gantt-" + new Date().getTime(),
    // id: uniqueId("gantt"),

    // width of the svg
    width: 1000,

    // height of a bar
    barHeight: 30,

    // margin
    marginLeft: 20,
    marginTop: 20,
    marginRight: 20,
    marginBottom: 20,

    // bar radius
    radius: config.barRadius,

    // whether to draw the x axis grid
    xGrid: true,

    // whether to draw the y axis grid
    yGrid: true,

    // the gantt's style, "gradient" or "fraction"
    style: "gradient",

    // the gantt's color mode, "single" or "multi"
    colorMode: "multi",

    // the gantt's color scale which is used in "multi" color mode
    colorScale: colorScale1,

    // the gantt's color scheme used in "single" color mode
    colorScheme: colorSchemeDefault,

    // Whether the chart is selectable.
    selectable: true,

    // the border style of the data preview
    border: config.defaultBorder,

    // transformes a given date into a numeric value.
    dateAccess: DATE_ACCESS,

    // format for displayed numbers
    numberFormat: config.numberFormat,

    // sort, "alphabetically"
    sort: null,

    // displayed dates
    dates: null,

    // whether to draw the bottom axis
    drawBottomAxis: false,

    // whether to draw labels on chart
    labels: true,

    // whether to show the tooltip
    tooltip: true,

    // the data controller.
    dataController: null,
  };

  // create new underlying chart with the specified attr
  let chart = baseChart(attr);

  // private

  /**
   * Creates the scales used by the gantt chart.
   *
   * @param {calc} calc The calc object
   * @param {dataView} dv The data view
   * @private
   */
  function createScales(calc, dv) {
    // preferre dates from attr if specified. fallback to
    // dates of data view
    let dates = Array.isArray(attr.dates) ? attr.dates : dv.dates;
    let labels = dv.datasets.map((d) => d.label);

    // Sort date according to access function
    dates = dates.sort((a, b) => attr.dateAccess(a) - attr.dateAccess(b));

    calc.xChart = d3
      .scaleBand()
      .domain(dates)
      .rangeRound([attr.marginLeft, calc.graphRight])
      .paddingInner(0.1);

    calc.yChartPadding = d3
      .scaleBand()
      .domain(labels)
      .rangeRound([calc.graphBottom, attr.marginTop])
      .paddingInner(0.1);

    calc.yChart = d3
      .scaleBand()
      .domain(labels)
      .rangeRound([calc.graphBottom, attr.marginTop]);

    calc.xAxisGrid = d3
      .axisBottom(calc.xChart)
      .tickSize(-calc.graphHeight)
      .tickFormat("");

    calc.yAxisGrid = d3
      .axisLeft(calc.yChart)
      .tickSize(-calc.graphWidth)
      .tickFormat("");

    calc.yBandwidth = calc.yChart.bandwidth();
  }

  /**
   * Renders the main svg of the chart.
   *
   * @param {calc} calc The calc object.
   * @private
   */
  function renderSVG(calc) {
    calc.svg = calc.container
      .append("svg")
      .attr("class", "ltv-chart-svg ltv-bar-chart-svg")
      .attr("preserveAspectRatio", "xMidYMid meet")
      .attr("viewBox", `0 0 ${attr.width} ${calc.height}`);
  }

  /**
   * Renders the background rect of the chart.
   *
   * @param {calc} calc The calc object.
   * @private
   */
  function renderBackground(calc) {
    calc.svg
      .append("rect")
      .attr("class", "ltv-gantt-chart-background")
      .attr("x", 0)
      .attr("y", 0)
      .attr("width", attr.width)
      .attr("height", calc.height)
      .on("click", (e, l) => {
        attr.dataController.clear("labels", chart);
        calc.svg
          .selectAll(".ltv-gantt-chart-selection-rect")
          .classed("ltv-selected", (d) =>
            attr.dataController.isFilter("labels", d)
          );
      });
  }

  /**
   * Renders the axis of the chart.
   *
   * @param {calc} calc The calc object.
   * @private
   */
  function renderAxis(calc) {
    // top
    calc.svg
      .append("g")
      .call(d3.axisTop(calc.xChart))
      .attr("transform", transY(attr.marginTop));

    // left
    calc.svg
      .append("g")
      .call(d3.axisRight(calc.yChart))
      .attr("transform", transX(attr.marginLeft + calc.graphWidth));

    // bottom
    if (attr.drawBottomAxis) {
      calc.svg
        .append("g")
        .call(d3.axisBottom(calc.xChart))
        .attr("transform", transY(calc.height - attr.marginBottom));
    }
  }

  /**
   * Renders the grid of the gantt chart.
   *
   * @param {calc} calc The calc object.
   * @private
   */
  function renderGrid(calc) {
    if (attr.xGrid) {
      calc.svg
        .append("g")
        .classed("ltv-gantt-grid ltv-gantt-grid-x", true)
        .attr("transform", transY(calc.height - attr.marginBottom))
        .call(calc.xAxisGrid);
    }

    if (attr.yGrid) {
      calc.svg
        .append("g")
        .classed("ltv-gantt-grid ltv-gantt-grid-y", true)
        .attr("transform", transX(attr.marginLeft))
        .call(calc.yAxisGrid);
    }
  }

  /**
   * Renders the selction bars of the gantt chart.
   *
   * @param {calc} calc The calc object.
   * @param {*} dv The data view
   * @private
   */
  function renderSelection(calc, dv) {
    calc.svg
      .append("g")
      .selectAll("g")
      .data(dv.labels)
      .enter()
      .append("rect")
      .classed("ltv-gantt-chart-selection-rect", true)
      .attr(`opacity`, 0)
      .attr("x", attr.marginLeft)
      .attr("y", (l) => calc.yChart(l))
      .attr("width", calc.graphWidth)
      .attr("height", calc.yChart.bandwidth());
  }

  function renderHoverBars(calc, dv) {
    calc.svg
      .append("g")
      .selectAll("g")
      .data(dv.labels)
      .enter()
      .append("rect")
      .classed("ltv-gantt-chart-hover-rect", true)
      .attr(`opacity`, 0)
      .attr("x", attr.marginLeft)
      .attr("y", (l) => calc.yChart(l))
      .attr("width", calc.graphWidth)
      .attr("height", calc.yChart.bandwidth())
      .on("mouseenter", (e, l) => {
        calc.svg
          .selectAll(".ltv-gantt-chart-hover-rect")
          .attr(`opacity`, (d) => {
            return d === l ? config.selectionOpacity : 0;
          });

        showTooltip(
          calc,
          dv.datasets.find((d) => d.label === l)
        );
      })
      .on("mouseout", (e, l) => {
        calc.svg.selectAll(".ltv-gantt-chart-hover-rect").attr(`opacity`, 0);

        calc.tooltip.hide();
      })
      .on("click", (e, l) => {
        attr.dataController.toggleFilter("labels", l, chart);
        calc.svg
          .selectAll(".ltv-gantt-chart-selection-rect")
          .classed("ltv-selected", (d) =>
            attr.dataController.isFilter("labels", d)
          );
      });
  }

  /**
   * Renders the bars of of the chart for style "fraction".
   *
   * @param {calc} calc The calc object.
   * @param {*} dv The data view
   */
  function renderBarsFraction(calc, dv) {
    let colors = attr.colorScale || colorScale1;
    let brush = dv.max / 2;
    let dataColors = calc.colors;
    let isSingle = attr.colorMode === "single";

    calc.barsData = calc.svg
      .append("g")
      .selectAll("g")
      .data(dv.byLabelDate)
      .enter();

    calc.bars = calc.barsData
      .append("g")
      .attr("transform", (d) => transY(calc.yChartPadding(d[0])))
      .attr("id", (d) => "ltv-gantt-rect-" + hash(d[0]))
      .attr(`fill`, (d) => (isSingle ? dataColors.label(d[0]) : null))
      .selectAll(".rect")
      .data((d) => d[1]) // map to dates data
      .enter()
      .filter((d) => d[1] > 0)
      .append("rect")
      .attr("class", "ltv-gantt-bar")
      .attr("x", (d) => calc.xChart(d[0]))
      .attr("y", 0)
      .attr("width", calc.xChart.bandwidth())
      .attr("height", calc.yChartPadding.bandwidth())
      .attr(`fill`, (d) => (isSingle ? null : colors(d[1] / dv.max)))
      .attr("opacity", (d) =>
        isSingle ? (d[1] + brush) / (dv.max + brush) : 1
      )
      .attr("rx", attr.radius)
      .attr("ry", attr.radius);

    if (attr.labels === true) {
      calc.labels = calc.barsData
        .append("g")
        .attr("transform", (d) => `translate(0,${calc.yChartPadding(d[0])})`)
        .attr("id", (d) => "rect-" + hash(d[0]))
        .selectAll(".text")
        .data((d) => d[1]) // map to dates data
        .enter()
        .filter((d) => d[1] > 0)
        .append("text")
        .attr("class", "ltv-gantt-label")
        .attr("y", (d) => calc.yBandwidth / 2)
        .attr("x", (d) => calc.xChart(d[0]) + 4)
        .text((d) => (d.sum === 0 ? null : attr.numberFormat(d[1])));
    }
  }

  /**
   *
   * @param {calc} calc The calc object.
   * @param {*} dv
   * @param {*} dc
   */
  function renderBarsGradient(calc, dv, dc) {
    calc.definitions = calc.svg.append("defs");

    for (let index = 0; index < dv.datasets.length; index++) {
      createGradient(dv.datasets[index], dv, calc, dc);
    }

    calc.barsData = calc.svg
      .append("g")
      .selectAll("g")
      .data(dv.datasets)
      .enter();

    calc.bars = calc.barsData
      .append("rect")
      .attr("transform", (d) => `translate(0,${calc.yChartPadding(d.label)})`)
      .attr("fill", (d) => `url(#${attr.id}-${hash(d.label)})`)
      .attr("class", "ltv-gantt-bar")
      .attr("rx", attr.radius)
      .attr("ry", attr.radius)
      .attr("x", (d) =>
        calc.xChart(d.duration < 0 ? d.lastDate : d.firstDate || 0)
      )
      .attr("height", calc.yChartPadding.bandwidth())
      .attr("width", (d) => {
        if (!d.firstDate || !d.lastDate) return 0;
        return (
          calc.xChart(d.lastDate) -
          calc.xChart(d.firstDate) +
          calc.xChart.bandwidth()
        );
      });

    if (attr.labels === true) {
      calc.labels = calc.barsData
        .append("text")
        .attr("transform", `translate(0,${calc.yBandwidth / 2 + 4})`)
        .attr("class", "ltv-gantt-label")
        .attr("id", (d) => "rect-" + hash(d.label))
        .attr("x", (d) => calc.xChart(d.firstDate) + calc.yBandwidth / 2)
        .attr("y", (d) => calc.yChart(d.label))
        .attr("height", calc.yChartPadding.bandwidth())
        .attr(
          "width",
          (d) =>
            calc.xChart(d.lastDate) - calc.xChart(d.firstDate) + calc.yBandwidth
        )
        .text(function (dataset) {
          if (dataset.sum === 0) return;
          return `${attr.numberFormat(
            dataset.sum
          )} (${dataset.duration + 1} years)`;
        });
    }
  }

  /**
   *
   * @param {*} ds
   * @param {*} dv
   * @param {*} calc
   * @returns
   */
  function createGradient(ds, dv, calc) {
    let gradient = calc.definitions
      .append("linearGradient")
      .attr("id", attr.id + "-" + hash(ds.label))
      .attr("x1", "0%")
      .attr("x2", "100%")
      .attr("y1", "0%")
      .attr("y2", "0%");

    if (!ds.data || ds.data.length === 0) return;

    let count = ds.data.length,
      latestDate = ds.lastDate,
      dataColors = ColorsGenerator(attr.colorScheme),
      isSingle = attr.colorMode === "single",
      colors = isSingle ? dataColors.label : attr.colorScale;

    function append(value, percent) {
      gradient
        .append("stop")
        .attr("offset", percent + "%")
        .attr("stop-color", colors(isSingle ? ds.label : value / dv.max))
        .attr("stop-opacity", isSingle ? value / dv.max : 1);
    }

    if (ds.duration === 0) {
      append(ds.data[0].value, 100);
    } else {
      for (let i = 0; i < count; i++) {
        let diff = latestDate - ds.data[i].date;
        let opacity = diff / ds.duration;
        let percent = (1 - opacity) * 100;
        append(ds.data[i].value, percent);
      }
    }
  }

  /**
   *
   * @param {*} calc
   * @param {*} ds
   */
  function showTooltip(calc, ds) {
    if (!attr.tooltip || !ds) return;
    calc.tooltip.html(tooltipHTML(ds));

    // position tooltip
    let domRect = calc.svg.node().getBoundingClientRect(),
      factor = domRect.width / attr.width,
      offset = [domRect.x + window.scrollX, domRect.y + window.scrollY];

    let top =
      calc.yChart(ds.label) * factor +
      offset[1] +
      attr.barHeight * factor +
      config.tooltipOffset;

    calc.tooltip
      .left(calc.xChart(ds.firstDate) * factor + offset[0])
      .top(top)
      .show();
  }

  // Auxiliary

  /**
   * Returns the tooltip text for the given dataset.
   *
   * @param {*} ds The dataset
   * @returns The generated HTML as string
   * @private
   */
  function tooltipHTML(ds) {
    if (!ds) return null;

    let filtered = ds.data.filter((item) => item.value !== 0),
      sum = d3.sum(ds.data, (d) => d.value),
      comps = [
        "Label: " + ds.label,
        "",
        "Start: " + ds.firstDate,
        "End: " + ds.lastDate,
        "",
        "Sum: " + attr.numberFormat(sum),
        "",
      ];

    for (let i = 0; i < filtered.length; i++) {
      let entry = filtered[i];
      let frmt = attr.numberFormat(entry.value);
      comps.push(`${entry.date}: ${frmt}`);
    }

    return comps.join("<br/>");
  }

  // chart.skipFilterUpdate = function (filter) {
  //     return filter === "labels";
  // };

  // public

  /**
   * Calculates the data view for the bar chart.
   *
   * @returns The generated data view
   * @public
   */
  chart.dataView = function () {
    let dc = attr.dataController;
    if (!dc) throw new Error("no data controller");

    let dv = {};
    let data = dc.data();
    dv.dates = data.dates.sort();
    dv.labels = data.labels;
    dv.data = dc.snapshot();
    dv.byLabelDate = d3.rollups(
      dv.data,
      (v) => d3.sum(v, (d) => d.value),
      (d) => d.label,
      (d) => d.date
    );

    dv.datasets = dv.byLabelDate.map((d) => {
      let label = d[0];
      let data = d[1]
        .filter((d) => d[1] > 0)
        .map((d) => {
          return { date: d[0], value: d[1] };
        })
        .sort((a, b) => a.date - b.date);

      let sum = d3.sum(data, (d) => d.value);
      let firstDate = (data[0] || {}).date;
      let lastDate = (data[data.length - 1] || {}).date;
      let duration = dv.dates.indexOf(lastDate) - dv.dates.indexOf(firstDate);

      return { label, data, sum, firstDate, lastDate, duration };
    });

    switch (attr.sort) {
      case "alphabetically":
        dv.datasets = dv.datasets.sort(GANTT_SORT.alphabetically);
        break;
      case "duration":
        dv.datasets = dv.datasets.sort(GANTT_SORT.duration);
        break;
      case "intensity":
        dv.datasets = dv.datasets.sort(GANTT_SORT.intensity);
        break;
      case "firstDate":
        dv.datasets = dv.datasets.sort(GANTT_SORT.firstDate);
        break;
      default:
        dv.datasets = dv.datasets.reverse();
        break;
    }

    dv.firstDate = dv.dates[0];
    dv.lastDate = dv.dates[dv.dates.length - 1];
    dv.max = d3.max(dv.datasets, (d) => d3.max(d.data, (i) => i.value));

    return dv;
  };

  /**
   * Renders all components of the gantt chart.
   *
   * @param {*} container The d3 container
   * @param {*} calc The calc objct of the chart
   * @param {*} dv The data view
   * @returns The chart itself
   *
   * @public
   */
  chart.render = function (container, calc, dv) {
    // calculations
    calc.container = container;
    calc.graphWidth = attr.width - attr.marginLeft - attr.marginRight;
    calc.graphHeight = dv.labels.length * attr.barHeight;
    calc.height = calc.graphHeight + attr.marginTop + attr.marginBottom;
    calc.graphLeft = attr.width - attr.marginLeft;
    calc.graphTop = calc.height - attr.marginTop;
    calc.graphRight = attr.width - attr.marginRight;
    calc.graphBottom = calc.height - attr.marginBottom;
    calc.colors = ColorsGenerator(attr.colorScheme).data(dv.data);

    // scales
    createScales(calc, dv);

    // render
    renderSVG(calc, dv);
    renderBackground(calc, dv);
    renderAxis(calc, dv);
    renderGrid(calc, dv);
    renderSelection(calc, dv);
    renderHoverBars(calc, dv);

    if (attr.style === "fraction") {
      renderBarsFraction(calc, dv, attr.dataController);
    } else {
      renderBarsGradient(calc, dv, attr.dataController);
    }

    calc.tooltip = tooltip().container(container).run();

    return chart;
  };

  // return generated chart
  return chart;
}
