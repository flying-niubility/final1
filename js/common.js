/* ===================================================================
   common.js —— 全站公共脚本
   依赖：jQuery 3.x、Bootstrap 5、fallback-data.js
   职责：
     1. 基于 jQuery $.ajax 的 JSON 数据加载（含缓存）
     2. JSON 加载失败时的错误提示 + 内置数据降级
     3. Toast 轻提示、localStorage 安全封装
     4. 通用工具：转义、防抖、星级、数字滚动、导航高亮
   =================================================================== */

(function ($) {
  "use strict";

  var Campus = (window.Campus = window.Campus || {});
  var jsonCache = {};

  /* ---------- Toast 轻提示 ---------- */

  function ensureToastContainer() {
    var $box = $("#toastContainer");
    if (!$box.length) {
      $box = $('<div id="toastContainer" class="toast-container-c"></div>').appendTo("body");
    }
    return $box;
  }

  Campus.toast = function (message, type) {
    type = type || "info";
    var iconMap = {
      success: "fa-circle-check",
      danger: "fa-circle-xmark",
      warning: "fa-triangle-exclamation",
      info: "fa-circle-info"
    };
    var $t = $(
      '<div class="toast-c ' + type + '">' +
        '<i class="fa-solid ' + (iconMap[type] || iconMap.info) + '"></i>' +
        "<span></span>" +
      "</div>"
    );
    $t.find("span").text(message);
    ensureToastContainer().append($t);
    setTimeout(function () {
      $t.fadeOut(300, function () { $t.remove(); });
    }, 2800);
  };

  /* ---------- 顶部错误/警告横幅（只出现一次） ---------- */

  Campus.showBanner = function (message, type) {
    if ($("#dataErrorBanner").length) return;
    var cls = type === "danger" ? "alert-danger" : "alert-warning";
    var html =
      '<div id="dataErrorBanner" class="alert ' + cls + ' alert-data alert-dismissible fade show mb-0 rounded-0" role="alert">' +
        '<i class="fa-solid fa-triangle-exclamation me-2"></i>' +
        "<span></span>" +
        '<button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="关闭"></button>' +
      "</div>";
    $(html).prependTo("body").find("span").text(message);
  };

  /* ---------- JSON 数据加载 ----------
     正常：读取 data/ 目录下的本地 JSON
     失败：使用 fallback-data.js 内置数据，并给出错误提示 */

  Campus.loadJSON = function (url, fallbackKey) {
    if (jsonCache[url]) {
      return $.Deferred().resolve(jsonCache[url]).promise();
    }

    var dfd = $.Deferred();

    $.ajax({
      url: url,
      dataType: "json",
      cache: false,
      timeout: 8000
    })
      .done(function (data) {
        jsonCache[url] = data;
        dfd.resolve(data);
      })
      .fail(function (xhr, textStatus) {
        var reason = textStatus === "timeout" ? "请求超时" :
                     xhr.status ? ("HTTP " + xhr.status) : "浏览器禁止读取本地文件";
        var fallback = window.FALLBACK_DATA && window.FALLBACK_DATA[fallbackKey];

        if (fallback) {
          Campus.showBanner(
            "数据文件 " + url + " 加载失败（" + reason +
            "），已临时使用内置示例数据。建议用本地服务器运行本项目（如 VS Code Live Server），详见 README。",
            "warning"
          );
          jsonCache[url] = fallback;
          dfd.resolve(fallback);
        } else {
          Campus.showBanner(
            "数据文件 " + url + " 加载失败（" + reason + "），且无可用降级数据，请检查文件是否存在。",
            "danger"
          );
          dfd.reject(reason);
        }
      });

    return dfd.promise();
  };

  /* ---------- localStorage 安全封装 ---------- */

  Campus.store = {
    get: function (key, defaultValue) {
      try {
        var raw = localStorage.getItem(key);
        return raw === null ? defaultValue : JSON.parse(raw);
      } catch (err) {
        Campus.toast("本地存储读取失败：" + err.message, "danger");
        return defaultValue;
      }
    },
    set: function (key, value) {
      try {
        localStorage.setItem(key, JSON.stringify(value));
        return true;
      } catch (err) {
        Campus.toast("本地存储写入失败（可能已满或被禁用）", "danger");
        return false;
      }
    }
  };

  /* ---------- 工具函数 ---------- */

  Campus.escapeHtml = function (str) {
    return String(str == null ? "" : str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  };

  Campus.debounce = function (fn, wait) {
    var timer = null;
    return function () {
      var ctx = this, args = arguments;
      clearTimeout(timer);
      timer = setTimeout(function () { fn.apply(ctx, args); }, wait || 250);
    };
  };

  // 星级评分：实心星 + 半星近似（四舍五入到0.5）
  Campus.stars = function (rating) {
    var full = Math.round(rating);
    var html = "";
    for (var i = 1; i <= 5; i++) {
      html += '<i class="fa-solid fa-star' + (i <= full ? "" : "-regular") + '"></i>';
    }
    return html;
  };

  // 数字滚动动画（requestAnimationFrame；并带 setTimeout 兜底，
  // 防止页面处于后台/无头环境时 rAF 不触发导致数字停在 0）
  Campus.countUp = function ($el, target, duration) {
    var start = 0;
    var beginTime = null;
    duration = duration || 900;
    var finished = false;

    function finish() {
      if (finished) return;
      finished = true;
      $el.text(target.toLocaleString());
    }

    function step(ts) {
      if (finished) return;
      if (!beginTime) beginTime = ts;
      var progress = Math.min((ts - beginTime) / duration, 1);
      var value = Math.floor(progress * (target - start) + start);
      $el.text(value.toLocaleString());
      if (progress < 1) {
        requestAnimationFrame(step);
      } else {
        finish();
      }
    }

    requestAnimationFrame(step);
    setTimeout(finish, duration + 150);
  };

  // 根据占用率返回状态
  Campus.seatStatus = function (rate) {
    if (rate >= 0.9) return { key: "full", text: "满员", cls: "status-full" };
    if (rate >= 0.5) return { key: "tight", text: "紧张", cls: "status-tight" };
    return { key: "free", text: "空闲", cls: "status-free" };
  };

  /* ---------- 导航高亮 + 年份 ---------- */

  $(function () {
    var page = location.pathname.split("/").pop() || "index.html";
    $(".site-navbar .nav-link").each(function () {
      var href = $(this).attr("href");
      if (href === page) $(this).addClass("active");
    });
    $("#currentYear").text(new Date().getFullYear());
  });

})(jQuery);
