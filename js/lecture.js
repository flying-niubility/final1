/* ===================================================================
   lecture.js —— 讲座活动页面脚本
   交互模块：标题/主讲人/地点搜索 + 分类筛选 + 报名/取消报名
   图表：各讲座报名率横向柱状图
   报名状态保存在 localStorage
   =================================================================== */

(function ($) {
  "use strict";

  var STORE_KEY = "campus_lecture_signups";
  var lectures = [];
  var rateChart = null;

  var categoryColor = {
    "学术科技": "#4f46e5",
    "人文艺术": "#a855f7",
    "就业指导": "#f97316",
    "创新创业": "#14b8a6"
  };

  var weekNames = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];

  $(function () {
    Campus.loadJSON("data/lectures.json", "lectures")
      .done(function (data) {
        lectures = data.lectures;
        initCategorySelect(data.categories);
        render();
        initChart();
        bindEvents();
      })
      .fail(function () {
        $("#lectureGrid").html(
          '<div class="col-12"><div class="card-soft"><div class="state-box">' +
            '<i class="fa-solid fa-file-circle-exclamation"></i>' +
            "<p>讲座数据加载失败，请确认 data/lectures.json 存在后刷新</p></div></div></div>"
        );
      });

    $(window).on("resize", Campus.debounce(function () {
      if (rateChart) rateChart.resize();
    }, 200));
  });

  /* ---------- 报名状态 ---------- */

  function getSignups() {
    return Campus.store.get(STORE_KEY, []);
  }

  function isSigned(id) {
    return getSignups().indexOf(id) > -1;
  }

  function toggleSignup(id) {
    var list = getSignups();
    var i = list.indexOf(id);
    if (i > -1) {
      list.splice(i, 1);
    } else {
      list.push(id);
    }
    return Campus.store.set(STORE_KEY, list);
  }

  // 有效报名人数
  function effectiveSigned(lec) {
    return Math.min(lec.capacity, lec.signed + (isSigned(lec.id) ? 1 : 0));
  }

  /* ---------- 下拉 ---------- */

  function initCategorySelect(categories) {
    categories.forEach(function (c) {
      $("#filterCategory").append('<option value="' + Campus.escapeHtml(c) + '">' + c + "</option>");
    });
  }

  /* ---------- 事件 ---------- */

  function bindEvents() {
    $("#searchLecture").on("input", Campus.debounce(render, 200));
    $("#filterCategory").on("change", render);

    $("#lectureGrid").on("click", ".btn-signup", function () {
      var id = parseInt($(this).data("id"), 10);
      var lec = lectures.find(function (l) { return l.id === id; });
      var wasSigned = isSigned(id);

      // 取消报名直接放行；报名需检查是否已满
      if (!wasSigned && effectiveSigned(lec) >= lec.capacity) {
        Campus.toast("该讲座报名人数已满，请关注其他场次", "warning");
        return;
      }

      if (toggleSignup(id)) {
        render();
        updateChart();
        Campus.toast(
          wasSigned ? "已取消「" + lec.title + "」的报名" : "报名成功：「" + lec.title + "」",
          wasSigned ? "warning" : "success"
        );
      }
    });
  }

  /* ---------- 筛选 ---------- */

  function getFilteredLectures() {
    var kw = $("#searchLecture").val().trim().toLowerCase();
    var category = $("#filterCategory").val();

    return lectures.filter(function (lec) {
      var haystack = (lec.title + lec.speaker + lec.location).toLowerCase();
      var matchKw = !kw || haystack.indexOf(kw) > -1;
      var matchCategory = !category || lec.category === category;
      return matchKw && matchCategory;
    });
  }

  /* ---------- 渲染 ---------- */

  function render() {
    var list = getFilteredLectures();

    $("#lectureCount").text(list.length);
    $("#signedCount").text(getSignups().length);

    if (!list.length) {
      $("#lectureGrid").html(
        '<div class="col-12"><div class="card-soft"><div class="state-box">' +
          '<i class="fa-solid fa-magnifying-glass"></i>' +
          "<p>没有找到相关讲座，换个关键词试试</p></div></div></div>"
      );
      return;
    }

    $("#lectureGrid").html(list.map(lectureCardHtml).join(""));
  }

  function lectureCardHtml(lec) {
    var signed = effectiveSigned(lec);
    var rate = signed / lec.capacity;
    var signedByMe = isSigned(lec.id);
    var full = signed >= lec.capacity;
    var weekday = weekNames[new Date(lec.date).getDay()];

    var btnHtml;
    if (full && !signedByMe) {
      btnHtml = '<button class="btn btn-light btn-soft w-100" disabled><i class="fa-solid fa-lock me-1"></i>报名已满</button>';
    } else if (signedByMe) {
      btnHtml = '<button class="btn btn-outline-danger btn-soft w-100 btn-signup" data-id="' + lec.id + '"><i class="fa-solid fa-user-check me-1"></i>已报名 · 点击取消</button>';
    } else {
      btnHtml = '<button class="btn btn-primary-c w-100 btn-signup" data-id="' + lec.id + '"><i class="fa-solid fa-pen-to-square me-1"></i>立即报名</button>';
    }

    return (
      '<div class="col-md-6 col-xl-3">' +
        '<div class="card-soft lecture-card">' +
          '<span class="tag-pill align-self-start mb-2" style="color:' + categoryColor[lec.category] + ';border-color:' + categoryColor[lec.category] + '55">' +
            Campus.escapeHtml(lec.category) +
          "</span>" +
          "<h5>" + Campus.escapeHtml(lec.title) + "</h5>" +
          '<div class="lecture-meta">' +
            "<span><i class=\"fa-solid fa-user-tie me-2\"></i>" + Campus.escapeHtml(lec.speaker) + "</span>" +
            "<span><i class=\"fa-regular fa-calendar me-2\"></i>" + Campus.escapeHtml(lec.date) + " " + weekday + " " + Campus.escapeHtml(lec.time) + "</span>" +
            "<span><i class=\"fa-solid fa-location-dot me-2\"></i>" + Campus.escapeHtml(lec.location) + "</span>" +
          "</div>" +
          '<div class="lecture-foot">' +
            '<div class="sign-text"><span>已报名 ' + signed + " / " + lec.capacity + "</span><span>" + (rate * 100).toFixed(0) + "%</span></div>" +
            '<div class="progress mb-2"><div class="progress-bar" style="width:' + (rate * 100).toFixed(1) + "%;background:" + categoryColor[lec.category] + '"></div></div>' +
            btnHtml +
          "</div>" +
        "</div>" +
      "</div>"
    );
  }

  /* ---------- 图表 ---------- */

  function initChart() {
    var el = document.getElementById("lectureRateChart");
    if (typeof echarts === "undefined") {
      $(el).html('<div class="state-box"><i class="fa-solid fa-triangle-exclamation"></i><p>ECharts 库未加载，图表无法显示</p></div>');
      return;
    }
    rateChart = echarts.init(el);
    updateChart();
  }

  function updateChart() {
    if (!rateChart) return;

    // 按报名率升序展示，横向柱状图
    var data = lectures.slice().sort(function (a, b) {
      return effectiveSigned(a) / a.capacity - effectiveSigned(b) / b.capacity;
    });

    var names = data.map(function (l) { return l.title; });
    var rates = data.map(function (l) {
      return +((effectiveSigned(l) / l.capacity) * 100).toFixed(1);
    });
    var colors = data.map(function (l) { return categoryColor[l.category]; });

    rateChart.setOption({
      tooltip: {
        trigger: "axis",
        axisPointer: { type: "shadow" },
        valueFormatter: function (v) { return v + "%"; }
      },
      grid: { left: 170, right: 40, top: 16, bottom: 28 },
      xAxis: {
        type: "value",
        max: 100,
        axisLabel: { formatter: "{value}%", color: "#64748b" },
        splitLine: { lineStyle: { color: "#eef2f7" } }
      },
      yAxis: {
        type: "category",
        data: names,
        axisLabel: { color: "#475569", fontSize: 11, width: 160, overflow: "truncate" }
      },
      series: [{
        type: "bar",
        barWidth: "55%",
        data: rates.map(function (v, i) {
          return { value: v, itemStyle: { color: colors[i], borderRadius: [0, 6, 6, 0] } };
        }),
        label: { show: true, position: "right", formatter: "{c}%", fontSize: 11, color: "#64748b" }
      }]
    });
  }

})(jQuery);
