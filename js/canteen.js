/* ===================================================================
   canteen.js —— 食堂美食页面脚本
   交互模块：关键字搜索 + 食堂/口味筛选 + 多种排序 + 添加菜品
   图表：各食堂菜品数量（柱状图）、口味分布（饼图）
   用户添加的菜品保存在 localStorage，刷新后仍然保留
   =================================================================== */

(function ($) {
  "use strict";

  var STORE_KEY = "campus_user_dishes";
  var allDishes = [];
  var barChart = null;
  var pieChart = null;

  var flavorEmoji = {
    "家常菜": "🍖",
    "川菜": "🌶️",
    "粤菜": "🦐",
    "江浙菜": "🍗",
    "西北菜": "🫕",
    "面食": "🍜",
    "轻食": "🥗"
  };

  $(function () {
    Campus.loadJSON("data/canteens.json", "canteens")
      .done(function (data) {
        initFilters(data);
        allDishes = data.dishes.concat(getUserDishes());
        render();
        initCharts();
        bindEvents();
      })
      .fail(function () {
        $("#dishGrid").html(
          '<div class="col-12"><div class="card-soft"><div class="state-box">' +
            '<i class="fa-solid fa-file-circle-exclamation"></i>' +
            "<p>菜品数据加载失败，请确认 data/canteens.json 存在后刷新页面</p></div></div></div>"
        );
      });

    $(window).on("resize", Campus.debounce(function () {
      if (barChart) barChart.resize();
      if (pieChart) pieChart.resize();
    }, 200));
  });

  /* ---------- 用户自添加菜品（localStorage） ---------- */

  function getUserDishes() {
    return Campus.store.get(STORE_KEY, []);
  }

  function saveUserDish(dish) {
    var list = getUserDishes();
    list.push(dish);
    return Campus.store.set(STORE_KEY, list);
  }

  /* ---------- 下拉选项 ---------- */

  function initFilters(data) {
    data.canteens.forEach(function (c) {
      $('#filterCanteen, #inputCanteen').append('<option value="' + Campus.escapeHtml(c) + '">' + c + "</option>");
    });
    data.flavors.forEach(function (f) {
      $('#filterFlavor, #inputFlavor').append('<option value="' + Campus.escapeHtml(f) + '">' + f + "</option>");
    });
  }

  /* ---------- 事件绑定 ---------- */

  function bindEvents() {
    $("#searchDish").on("input", Campus.debounce(render, 200));
    $("#filterCanteen, #filterFlavor, #sortBy").on("change", render);

    $("#addDishModal").on("hidden.bs.modal", function () {
      var form = $("#addDishForm")[0];
      form.reset();
      $(form).removeClass("was-validated");
      $("#inputCanteen").prop("selectedIndex", 0);
      $("#inputFlavor").prop("selectedIndex", 0);
    });

    $("#addDishForm").on("submit", handleAddDish);
  }

  /* ---------- 添加菜品 ---------- */

  function handleAddDish(e) {
    e.preventDefault();
    var form = e.target;
    var $form = $(form);

    // 二次校验价格与评分范围
    var price = parseFloat($("#inputPrice").val());
    var rating = parseFloat($("#inputRating").val());
    var priceValid = !isNaN(price) && price > 0 && price <= 200;
    var ratingValid = !isNaN(rating) && rating >= 0 && rating <= 5;

    $("#inputPrice")[0].setCustomValidity(priceValid ? "" : "x");
    $("#inputRating")[0].setCustomValidity(ratingValid ? "" : "x");

    if (!form.checkValidity()) {
      $form.addClass("was-validated");
      Campus.toast("请检查表单中标红的字段", "warning");
      return;
    }

    var dish = {
      id: "u-" + Date.now(),
      name: $("#inputName").val().trim(),
      canteen: $("#inputCanteen").val(),
      window: $("#inputWindow").val().trim(),
      flavor: $("#inputFlavor").val(),
      price: Math.round(price * 10) / 10,
      rating: Math.round(rating * 10) / 10,
      tags: ["用户推荐"],
      userAdded: true
    };

    if (saveUserDish(dish)) {
      allDishes.push(dish);
      render();
      updateCharts();
      bootstrap.Modal.getInstance(document.getElementById("addDishModal")).hide();
      Campus.toast("菜品「" + dish.name + "」添加成功", "success");
    }
  }

  /* ---------- 筛选 + 排序 ---------- */

  function getFilteredDishes() {
    var kw = $("#searchDish").val().trim().toLowerCase();
    var canteen = $("#filterCanteen").val();
    var flavor = $("#filterFlavor").val();
    var sortBy = $("#sortBy").val();

    var list = allDishes.filter(function (d) {
      var matchKw = !kw || d.name.toLowerCase().indexOf(kw) > -1;
      var matchCanteen = !canteen || d.canteen === canteen;
      var matchFlavor = !flavor || d.flavor === flavor;
      return matchKw && matchCanteen && matchFlavor;
    });

    if (sortBy === "priceAsc") {
      list.sort(function (a, b) { return a.price - b.price; });
    } else if (sortBy === "priceDesc") {
      list.sort(function (a, b) { return b.price - a.price; });
    } else if (sortBy === "ratingDesc") {
      list.sort(function (a, b) { return b.rating - a.rating; });
    }

    return list;
  }

  /* ---------- 渲染 ---------- */

  function render() {
    var list = getFilteredDishes();

    $("#dishCount").text(list.length);

    if (!list.length) {
      $("#dishGrid").html(
        '<div class="col-12"><div class="card-soft"><div class="state-box">' +
          '<i class="fa-solid fa-magnifying-glass"></i>' +
          "<p>没有找到符合条件的菜品，换个关键词或筛选条件试试</p></div></div></div>"
      );
    } else {
      $("#dishGrid").html(list.map(dishCardHtml).join(""));
    }

    renderSummary(list);
  }

  function dishCardHtml(d) {
    var tags = (d.tags || []).map(function (t) {
      return '<span class="tag-pill">' + Campus.escapeHtml(t) + "</span>";
    }).join("");

    var emoji = flavorEmoji[d.flavor] || "🍱";

    return (
      '<div class="col-sm-6 col-lg-4 col-xl-3">' +
        '<div class="card-soft dish-card">' +
          (d.userAdded ? '<span class="badge badge-user">用户添加</span>' : "") +
          '<div class="dish-head">' +
            '<span class="dish-emoji">' + emoji + "</span>" +
            "<div>" +
              '<p class="dish-name">' + Campus.escapeHtml(d.name) + "</p>" +
              '<div class="dish-meta">' + Campus.escapeHtml(d.canteen) + " · " + Campus.escapeHtml(d.window) + "</div>" +
            "</div>" +
          "</div>" +
          '<div class="dish-tags"><span class="tag-pill">' + Campus.escapeHtml(d.flavor) + "</span>" + tags + "</div>" +
          '<div class="dish-foot">' +
            '<span class="dish-price">¥' + d.price.toFixed(1) + "</span>" +
            '<span class="dish-rating">' + Campus.stars(d.rating) + " " + d.rating.toFixed(1) + "</span>" +
          "</div>" +
        "</div>" +
      "</div>"
    );
  }

  function renderSummary(list) {
    if (!list.length) {
      $("#avgPrice").text("¥0");
      $("#avgRating").text("0");
      return;
    }
    var totalPrice = list.reduce(function (s, d) { return s + d.price; }, 0);
    var totalRating = list.reduce(function (s, d) { return s + d.rating; }, 0);
    $("#avgPrice").text("¥" + (totalPrice / list.length).toFixed(1));
    $("#avgRating").text((totalRating / list.length).toFixed(1));
  }

  /* ---------- 图表 ---------- */

  function initCharts() {
    var barEl = document.getElementById("canteenBarChart");
    var pieEl = document.getElementById("flavorPieChart");

    if (typeof echarts === "undefined") {
      $(barEl).add(pieEl).html(
        '<div class="state-box"><i class="fa-solid fa-triangle-exclamation"></i><p>ECharts 库未加载，图表无法显示</p></div>'
      );
      return;
    }

    barChart = echarts.init(barEl);
    pieChart = echarts.init(pieEl);
    updateCharts();
  }

  function updateCharts() {
    if (!barChart || !pieChart) return;

    // —— 柱状图：各食堂菜品数量 ——
    var canteenCount = {};
    allDishes.forEach(function (d) {
      canteenCount[d.canteen] = (canteenCount[d.canteen] || 0) + 1;
    });

    barChart.setOption({
      tooltip: { trigger: "axis", valueFormatter: function (v) { return v + " 道"; } },
      grid: { left: 42, right: 20, top: 24, bottom: 36 },
      xAxis: {
        type: "category",
        data: Object.keys(canteenCount),
        axisLabel: { color: "#64748b" }
      },
      yAxis: {
        type: "value",
        minInterval: 1,
        splitLine: { lineStyle: { color: "#eef2f7" } },
        axisLabel: { color: "#64748b" }
      },
      series: [{
        type: "bar",
        barWidth: "46%",
        itemStyle: {
          borderRadius: [8, 8, 0, 0],
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: "#818cf8" },
            { offset: 1, color: "#4f46e5" }
          ])
        },
        label: { show: true, position: "top", color: "#4f46e5", fontWeight: 600 },
        data: Object.values(canteenCount)
      }]
    });

    // —— 饼图：口味分布 ——
    var flavorCount = {};
    allDishes.forEach(function (d) {
      flavorCount[d.flavor] = (flavorCount[d.flavor] || 0) + 1;
    });

    pieChart.setOption({
      color: ["#4f46e5", "#ef4444", "#0ea5e9", "#f59e0b", "#14b8a6", "#a855f7", "#22c55e"],
      tooltip: { trigger: "item", valueFormatter: function (v) { return v + " 道"; } },
      legend: { type: "scroll", bottom: 0 },
      series: [{
        type: "pie",
        radius: ["38%", "66%"],
        center: ["50%", "44%"],
        itemStyle: { borderColor: "#fff", borderWidth: 2 },
        label: { formatter: "{b} {c}", fontSize: 11, color: "#475569" },
        data: Object.keys(flavorCount).map(function (k) {
          return { name: k, value: flavorCount[k] };
        })
      }]
    });
  }

})(jQuery);
