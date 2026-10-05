/* ===================================================================
   home.js —— 信息首页脚本
   图表 1：各食堂客流趋势（折线图，平滑面积）
   图表 2：校园场所使用率（环形饼图）
   =================================================================== */

(function ($) {
  "use strict";

  var charts = [];

  $(function () {
    Campus.loadJSON("data/home.json", "home")
      .done(function (data) {
        renderHero(data.hero);
        renderStats(data.stats);
        renderNotices(data.notices);
        initTrafficChart(data);
        initUsageChart(data);
      })
      .fail(function () {
        $("#noticeList").html(
          '<div class="state-box"><i class="fa-solid fa-file-circle-exclamation"></i><p>首页数据加载失败，请刷新重试</p></div>'
        );
      });

    $("#busSoon").on("click", function () {
      Campus.toast("校车时刻功能正在建设中，敬请期待", "info");
    });

    // 响应式：窗口尺寸变化时重算图表
    $(window).on("resize", Campus.debounce(function () {
      charts.forEach(function (c) { c.resize(); });
    }, 200));
  });

  /* ---------- 英雄区文案 ---------- */

  function renderHero(hero) {
    if (!hero) return;
    $("#heroTitle").text(hero.title);
    $("#heroSubtitle").text(hero.subtitle);
  }

  /* ---------- 统计数字滚动 ---------- */

  function renderStats(stats) {
    if (!stats || !stats.length) return;

    // 先按 JSON 更新 DOM 目标值（JSON 为权威数据源）
    $("#statsRow .stat-value").each(function (i) {
      var s = stats[i];
      if (!s) return;
      $(this).attr("data-target", s.value);
      $(this).find(".unit").text(s.unit);
      $(this).closest(".stat-card").find(".stat-label").text(s.label);
      $(this).closest(".stat-card").find(".stat-icon i").attr("class", "fa-solid " + s.icon);
    });

    $("#statsRow .stat-value").each(function () {
      var $v = $(this);
      var target = parseInt($v.attr("data-target"), 10);
      var unitText = $v.find(".unit").text();
      // 数字与单位拆分为两个元素，避免滚动时互相覆盖
      $v.html('<span class="num">0</span><span class="unit">' + Campus.escapeHtml(unitText) + "</span>");
      Campus.countUp($v.find(".num"), target, 1000);
    });
  }

  /* ---------- 公告 ---------- */

  function renderNotices(notices) {
    if (!notices || !notices.length) {
      $("#noticeList").html('<div class="state-box"><p>暂无公告</p></div>');
      return;
    }

    var colorMap = {
      success: "color:#16a34a",
      warning: "color:#d97706",
      info: "color:#0284c7"
    };

    var html = notices.map(function (n) {
      return (
        '<div class="notice-item">' +
          '<i class="fa-solid ' + Campus.escapeHtml(n.icon) + '" style="' + (colorMap[n.type] || colorMap.info) + '"></i>' +
          "<span>" + Campus.escapeHtml(n.text) + "</span>" +
        "</div>"
      );
    }).join("");

    $("#noticeList").html(html);
  }

  /* ---------- 图表 1：客流折线图 ---------- */

  function initTrafficChart(data) {
    var el = document.getElementById("trafficChart");
    if (!el || typeof echarts === "undefined") {
      if (el) $(el).html('<div class="state-box"><i class="fa-solid fa-triangle-exclamation"></i><p>ECharts 库未加载，图表无法显示</p></div>');
      return;
    }

    var chart = echarts.init(el);
    var palette = ["#4f46e5", "#0ea5e9", "#f97316"];

    chart.setOption({
      color: palette,
      tooltip: {
        trigger: "axis",
        valueFormatter: function (v) { return v + " 人"; }
      },
      legend: {
        data: data.canteenTraffic.map(function (c) { return c.name; }),
        bottom: 0
      },
      grid: { left: 45, right: 18, top: 30, bottom: 48 },
      xAxis: {
        type: "category",
        boundaryGap: false,
        data: data.trafficHours,
        axisLine: { lineStyle: { color: "#cbd5e1" } },
        axisLabel: { color: "#64748b" }
      },
      yAxis: {
        type: "value",
        name: "人数",
        nameTextStyle: { color: "#94a3b8" },
        splitLine: { lineStyle: { color: "#eef2f7" } },
        axisLabel: { color: "#64748b" }
      },
      series: data.canteenTraffic.map(function (c) {
        return {
          name: c.name,
          type: "line",
          smooth: true,
          symbolSize: 7,
          areaStyle: { opacity: 0.12 },
          data: c.data
        };
      })
    });

    charts.push(chart);
  }

  /* ---------- 图表 2：场所使用率环形饼图 ---------- */

  function initUsageChart(data) {
    var el = document.getElementById("usageChart");
    if (!el || typeof echarts === "undefined") return;

    var chart = echarts.init(el);

    chart.setOption({
      color: ["#4f46e5", "#0ea5e9", "#f97316", "#14b8a6", "#a855f7"],
      tooltip: {
        trigger: "item",
        valueFormatter: function (v) { return v + "%"; }
      },
      legend: { bottom: 0, itemWidth: 10, itemHeight: 10 },
      series: [{
        name: "场所使用率",
        type: "pie",
        radius: ["42%", "68%"],
        center: ["50%", "44%"],
        avoidLabelOverlap: true,
        itemStyle: { borderColor: "#fff", borderWidth: 2 },
        label: { formatter: "{b}\n{d}%", fontSize: 11, color: "#475569" },
        data: data.venueUsage
      }]
    });

    charts.push(chart);
  }

})(jQuery);
