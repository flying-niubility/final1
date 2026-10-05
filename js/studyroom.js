/* ===================================================================
   studyroom.js —— 自习室查询与预约脚本
   交互模块：房间搜索 + 楼栋/状态筛选 + 预约/取消预约（管理）
   图表：各楼栋座位占用率（柱状图）、全校综合使用率（仪表盘）
   预约记录保存在 localStorage
   =================================================================== */

(function ($) {
  "use strict";

  var STORE_KEY = "campus_reservations";
  var rooms = [];
  var barChart = null;
  var gaugeChart = null;

  $(function () {
    Campus.loadJSON("data/studyrooms.json", "studyrooms")
      .done(function (data) {
        rooms = data.rooms;
        initSelects(data);
        render();
        initCharts();
        bindEvents();
      })
      .fail(function () {
        $("#roomGrid").html(
          '<div class="col-12"><div class="card-soft"><div class="state-box">' +
            '<i class="fa-solid fa-file-circle-exclamation"></i>' +
            "<p>自习室数据加载失败，请确认 data/studyrooms.json 存在后刷新</p></div></div></div>"
        );
      });

    $(window).on("resize", Campus.debounce(function () {
      if (barChart) barChart.resize();
      if (gaugeChart) gaugeChart.resize();
    }, 200));
  });

  /* ---------- 预约记录 ---------- */

  function getReservations() {
    return Campus.store.get(STORE_KEY, []);
  }

  function setReservations(list) {
    return Campus.store.set(STORE_KEY, list);
  }

  // 某房间的有效占用数 = 原始占用 + 本站预约数（不超过总座位）
  function effectiveOccupied(room) {
    var reserved = getReservations().filter(function (r) {
      return r.roomId === room.id;
    }).length;
    return Math.min(room.totalSeats, room.occupied + reserved);
  }

  /* ---------- 下拉初始化 ---------- */

  function initSelects(data) {
    data.buildings.forEach(function (b) {
      $("#filterBuilding").append('<option value="' + Campus.escapeHtml(b) + '">' + b + "</option>");
    });
    data.timeSlots.forEach(function (s) {
      $("#reserveSlot").append('<option value="' + Campus.escapeHtml(s) + '">' + s + "</option>");
    });
  }

  /* ---------- 事件 ---------- */

  function bindEvents() {
    $("#searchRoom").on("input", Campus.debounce(render, 200));
    $("#filterBuilding, #filterStatus").on("change", render);

    $("#roomGrid").on("click", ".btn-reserve", function () {
      openReserveModal(parseInt($(this).data("id"), 10));
    });

    $("#reserveForm").on("submit", handleReserve);
    $("#reserveModal").on("hidden.bs.modal", function () {
      $("#reserveForm")[0].reset();
      $("#reserveForm").removeClass("was-validated");
    });

    $("#btnMyReserve").on("click", openMyReserveModal);
    $("#myReserveList").on("click", ".btn-cancel", function () {
      cancelReservation($(this).data("index"));
    });
  }

  /* ---------- 预约 ---------- */

  function openReserveModal(roomId) {
    var room = rooms.find(function (r) { return r.id === roomId; });
    if (!room) return;

    var used = effectiveOccupied(room);
    if (used >= room.totalSeats) {
      Campus.toast("该自习室座位已满，请选择其他房间", "warning");
      return;
    }

    $("#reserveRoomId").val(room.id);
    $("#reserveRoomInfo").text(room.building + " · " + room.name + "（剩余 " + (room.totalSeats - used) + " 个座位）");
    $("#reserveForm")[0].reset();

    new bootstrap.Modal(document.getElementById("reserveModal")).show();
  }

  function handleReserve(e) {
    e.preventDefault();
    var form = e.target;

    var name = $("#reserveName").val().trim();
    var sid = $("#reserveSid").val().trim();
    var slot = $("#reserveSlot").val();
    var roomId = parseInt($("#reserveRoomId").val(), 10);

    var nameValid = name.length >= 2 && name.length <= 10;
    var sidValid = /^\d{8,12}$/.test(sid);

    $("#reserveName")[0].setCustomValidity(nameValid ? "" : "x");
    $("#reserveSid")[0].setCustomValidity(sidValid ? "" : "x");

    if (!form.checkValidity() || !slot) {
      $(form).addClass("was-validated");
      if (!slot) Campus.toast("请选择预约时段", "warning");
      return;
    }

    var list = getReservations();

    // 同一学号对同一房间同一时段不能重复预约
    var duplicated = list.some(function (r) {
      return r.sid === sid && r.roomId === roomId && r.slot === slot;
    });
    if (duplicated) {
      Campus.toast("你已预约过该房间的此时段，请勿重复预约", "danger");
      return;
    }

    var room = rooms.find(function (r) { return r.id === roomId; });
    if (effectiveOccupied(room) >= room.totalSeats) {
      Campus.toast("手慢了！该房间座位刚刚约满", "warning");
      return;
    }

    list.push({
      roomId: roomId,
      roomName: room.building + " · " + room.name,
      name: name,
      sid: sid,
      slot: slot,
      createdAt: new Date().toLocaleString()
    });

    if (setReservations(list)) {
      render();
      updateCharts();
      bootstrap.Modal.getInstance(document.getElementById("reserveModal")).hide();
      Campus.toast("预约成功！请按时到场签到", "success");
    }
  }

  /* ---------- 我的预约 / 取消 ---------- */

  function renderMyReserves() {
    var list = getReservations();
    var $box = $("#myReserveList");

    if (!list.length) {
      $box.html('<div class="state-box"><i class="fa-regular fa-folder-open"></i><p>你还没有预约记录</p></div>');
    } else {
      $box.html(list.map(function (r, i) {
        return (
          '<div class="border rounded-3 p-3 mb-2">' +
            '<div class="d-flex justify-content-between align-items-start gap-2">' +
              "<div>" +
                '<div class="fw-bold">' + Campus.escapeHtml(r.roomName) + "</div>" +
                '<div class="small text-muted"><i class="fa-regular fa-clock me-1"></i>' + Campus.escapeHtml(r.slot) + "</div>" +
                '<div class="small text-muted"><i class="fa-solid fa-user me-1"></i>' + Campus.escapeHtml(r.name) + "（" + Campus.escapeHtml(r.sid) + "）</div>" +
                '<div class="small text-muted">预约时间：' + Campus.escapeHtml(r.createdAt) + "</div>" +
              "</div>" +
              '<button class="btn btn-sm btn-outline-danger btn-cancel" data-index="' + i + '">取消预约</button>' +
            "</div>" +
          "</div>"
        );
      }).join(""));
    }
  }

  function openMyReserveModal() {
    renderMyReserves();
    bootstrap.Modal.getOrCreateInstance(document.getElementById("myReserveModal")).show();
  }

  function cancelReservation(index) {
    var list = getReservations();
    var removed = list.splice(index, 1)[0];
    if (setReservations(list)) {
      Campus.toast("已取消「" + removed.roomName + "」的预约", "success");
      render();
      updateCharts();
      renderMyReserves(); // 模态框已在打开状态，仅刷新列表内容
    }
  }

  /* ---------- 筛选 ---------- */

  function getFilteredRooms() {
    var kw = $("#searchRoom").val().trim().toLowerCase();
    var building = $("#filterBuilding").val();
    var status = $("#filterStatus").val();

    return rooms.filter(function (room) {
      var used = effectiveOccupied(room);
      var st = Campus.seatStatus(used / room.totalSeats);

      var matchKw = !kw || room.name.toLowerCase().indexOf(kw) > -1 ||
                    room.building.toLowerCase().indexOf(kw) > -1;
      var matchBuilding = !building || room.building === building;
      var matchStatus = !status || st.key === status;

      return matchKw && matchBuilding && matchStatus;
    });
  }

  /* ---------- 渲染 ---------- */

  function render() {
    var list = getFilteredRooms();
    $("#roomCount").text(list.length);

    if (!list.length) {
      $("#roomGrid").html(
        '<div class="col-12"><div class="card-soft"><div class="state-box">' +
          '<i class="fa-solid fa-magnifying-glass"></i>' +
          "<p>没有符合条件的自习室，请调整筛选条件</p></div></div></div>"
      );
      return;
    }

    $("#roomGrid").html(list.map(roomCardHtml).join(""));
  }

  function roomCardHtml(room) {
    var used = effectiveOccupied(room);
    var remain = room.totalSeats - used;
    var rate = used / room.totalSeats;
    var st = Campus.seatStatus(rate);

    var barColor = st.key === "free" ? "#22c55e" : st.key === "tight" ? "#f59e0b" : "#ef4444";

    var features = room.features.map(function (f) {
      return '<span class="tag-pill">' + Campus.escapeHtml(f) + "</span>";
    }).join("");

    var full = remain <= 0;

    return (
      '<div class="col-md-6 col-xl-3">' +
        '<div class="card-soft room-card">' +
          '<div class="room-title">' +
            "<h5>" + Campus.escapeHtml(room.name) + "</h5>" +
            '<span class="status-badge ' + st.cls + '">' + st.text + "</span>" +
          "</div>" +
          '<div class="room-info">' +
            '<i class="fa-solid fa-location-dot"></i>' + Campus.escapeHtml(room.building) + " · " + Campus.escapeHtml(room.floor) +
            '<span class="ms-2"><i class="fa-regular fa-clock"></i>' + Campus.escapeHtml(room.openTime) + "</span>" +
          "</div>" +
          '<div class="dish-tags mb-1">' + features + "</div>" +
          '<div class="seat-progress">' +
            '<div class="seat-text"><span>已用 ' + used + " / " + room.totalSeats + "</span><span>剩余 " + remain + "</span></div>" +
            '<div class="progress"><div class="progress-bar" style="width:' + (rate * 100).toFixed(1) + "%;background:" + barColor + '"></div></div>' +
          "</div>" +
          '<button class="btn btn-primary-c w-100 mt-2 btn-reserve" data-id="' + room.id + '"' +
            (full ? " disabled" : "") + ">" +
            (full ? '<i class="fa-solid fa-lock me-1"></i>座位已满' : '<i class="fa-solid fa-calendar-plus me-1"></i>预约座位') +
          "</button>" +
        "</div>" +
      "</div>"
    );
  }

  /* ---------- 图表 ---------- */

  function initCharts() {
    var barEl = document.getElementById("buildingBarChart");
    var gaugeEl = document.getElementById("usageGauge");

    if (typeof echarts === "undefined") {
      $(barEl).add(gaugeEl).html(
        '<div class="state-box"><i class="fa-solid fa-triangle-exclamation"></i><p>ECharts 库未加载，图表无法显示</p></div>'
      );
      return;
    }

    barChart = echarts.init(barEl);
    gaugeChart = echarts.init(gaugeEl);
    updateCharts();
  }

  function updateCharts() {
    if (!barChart || !gaugeChart) return;

    // 按楼栋聚合占用率
    var agg = {};
    rooms.forEach(function (room) {
      if (!agg[room.building]) agg[room.building] = { total: 0, used: 0 };
      agg[room.building].total += room.totalSeats;
      agg[room.building].used += effectiveOccupied(room);
    });

    var names = Object.keys(agg);
    var rates = names.map(function (n) {
      return +((agg[n].used / agg[n].total) * 100).toFixed(1);
    });

    barChart.setOption({
      tooltip: {
        trigger: "axis",
        valueFormatter: function (v) { return v + "%"; }
      },
      grid: { left: 45, right: 20, top: 24, bottom: 36 },
      xAxis: { type: "category", data: names, axisLabel: { color: "#64748b" } },
      yAxis: {
        type: "value",
        max: 100,
        axisLabel: { color: "#64748b", formatter: "{value}%" },
        splitLine: { lineStyle: { color: "#eef2f7" } }
      },
      series: [{
        type: "bar",
        barWidth: "45%",
        itemStyle: {
          borderRadius: [8, 8, 0, 0],
          color: function (p) {
            var v = p.value;
            if (v >= 90) return "#ef4444";
            if (v >= 50) return "#f59e0b";
            return "#14b8a6";
          }
        },
        label: { show: true, position: "top", formatter: "{c}%", color: "#475569", fontWeight: 600 },
        data: rates
      }]
    });

    var totalSeats = names.reduce(function (s, n) { return s + agg[n].total; }, 0);
    var usedSeats = names.reduce(function (s, n) { return s + agg[n].used; }, 0);
    var overall = +((usedSeats / totalSeats) * 100).toFixed(1);

    gaugeChart.setOption({
      series: [{
        type: "gauge",
        startAngle: 210,
        endAngle: -30,
        min: 0,
        max: 100,
        radius: "92%",
        progress: {
          show: true,
          width: 16,
          itemStyle: {
            color: overall >= 90 ? "#ef4444" : overall >= 50 ? "#f59e0b" : "#14b8a6"
          }
        },
        axisLine: { lineStyle: { width: 16, color: [[1, "#e8edf5"]] } },
        pointer: { width: 5, length: "60%" },
        axisTick: { show: false },
        splitLine: { length: 10, lineStyle: { color: "#cbd5e1" } },
        axisLabel: { distance: 22, color: "#94a3b8", fontSize: 10 },
        anchor: { show: true, size: 14, itemStyle: { color: "#64748b" } },
        title: { offsetCenter: [0, "32%"], color: "#64748b", fontSize: 13 },
        detail: {
          valueAnimation: true,
          offsetCenter: [0, "5%"],
          formatter: "{value}%",
          color: "#1e293b",
          fontSize: 30,
          fontWeight: 700
        },
        data: [{ value: overall, name: "综合使用率" }]
      }]
    });
  }

})(jQuery);
