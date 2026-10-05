/* ===================================================================
   fallback-data.js
   当浏览器以 file:// 协议直接打开页面时，fetch / $.ajax 无法读取
   本地 JSON（浏览器安全限制）。此时使用这份与 JSON 内容一致的
   内置示例数据作为降级方案，并在页面顶部给出明确错误提示。
   正常通过本地服务器运行时，数据一律来自 data/ 目录下的 JSON。
   =================================================================== */

window.FALLBACK_DATA = {
  home: {
    hero: {
      title: "智慧校园公共服务信息中心",
      subtitle: "食堂美食、自习座位、讲座活动，一屏尽览校园学习生活"
    },
    stats: [
      { label: "开放服务场所", value: 18, unit: "个", icon: "fa-building-columns" },
      { label: "今日在售菜品", value: 86, unit: "道", icon: "fa-bowl-food" },
      { label: "自习座位", value: 2400, unit: "个", icon: "fa-chair" },
      { label: "本周讲座", value: 12, unit: "场", icon: "fa-chalkboard-user" }
    ],
    trafficHours: ["07:00", "09:00", "11:00", "13:00", "15:00", "17:00", "19:00", "21:00"],
    canteenTraffic: [
      { name: "第一食堂", data: [180, 95, 460, 320, 110, 480, 260, 90] },
      { name: "第二食堂", data: [150, 80, 420, 300, 95, 440, 240, 75] },
      { name: "清真食堂", data: [90, 45, 260, 180, 60, 280, 150, 40] }
    ],
    venueUsage: [
      { name: "自习室", value: 62 },
      { name: "图书馆", value: 71 },
      { name: "食堂", value: 78 },
      { name: "运动场馆", value: 45 },
      { name: "校车", value: 34 }
    ],
    notices: [
      { type: "success", icon: "fa-circle-check", text: "图书馆三层静音区今日延长开放至 23:00" },
      { type: "warning", icon: "fa-triangle-exclamation", text: "10月5日 08:00-12:00 教学楼A停电检修，请转移至教学楼B自习" },
      { type: "info", icon: "fa-bullhorn", text: "国庆专题讲座《敦煌壁画艺术赏析》本周五开放报名" }
    ]
  },

  canteens: {
    canteens: ["第一食堂", "第二食堂", "清真食堂"],
    flavors: ["家常菜", "川菜", "粤菜", "江浙菜", "西北菜", "面食", "轻食"],
    dishes: [
      { id: 1, name: "红烧肉", canteen: "第一食堂", window: "2号窗口", flavor: "家常菜", price: 12, rating: 4.7, tags: ["招牌", "微甜"] },
      { id: 2, name: "番茄炒蛋", canteen: "第一食堂", window: "1号窗口", flavor: "家常菜", price: 6, rating: 4.5, tags: ["下饭"] },
      { id: 3, name: "麻辣香锅", canteen: "第一食堂", window: "5号窗口", flavor: "川菜", price: 18, rating: 4.8, tags: ["重辣", "可自选"] },
      { id: 4, name: "酸菜鱼", canteen: "第一食堂", window: "6号窗口", flavor: "川菜", price: 20, rating: 4.6, tags: ["酸辣"] },
      { id: 5, name: "黄焖鸡米饭", canteen: "第二食堂", window: "3号窗口", flavor: "江浙菜", price: 14, rating: 4.6, tags: ["热卖"] },
      { id: 6, name: "广式叉烧饭", canteen: "第二食堂", window: "4号窗口", flavor: "粤菜", price: 16, rating: 4.4, tags: ["蜜汁"] },
      { id: 7, name: "虾仁云吞面", canteen: "第二食堂", window: "2号窗口", flavor: "粤菜", price: 13, rating: 4.3, tags: ["清淡"] },
      { id: 8, name: "扬州炒饭", canteen: "第二食堂", window: "1号窗口", flavor: "江浙菜", price: 10, rating: 4.2, tags: ["快手餐"] },
      { id: 9, name: "轻食鸡胸沙拉", canteen: "第二食堂", window: "轻食窗口", flavor: "轻食", price: 15, rating: 4.5, tags: ["低卡", "健身推荐"] },
      { id: 10, name: "兰州拉面", canteen: "清真食堂", window: "1号窗口", flavor: "面食", price: 11, rating: 4.9, tags: ["招牌", "现拉"] },
      { id: 11, name: "大盘鸡", canteen: "清真食堂", window: "2号窗口", flavor: "西北菜", price: 22, rating: 4.7, tags: ["分量足", "微辣"] },
      { id: 12, name: "肉夹馍", canteen: "清真食堂", window: "3号窗口", flavor: "面食", price: 8, rating: 4.4, tags: ["酥脆"] }
    ]
  },

  studyrooms: {
    buildings: ["图书馆", "教学楼A", "教学楼B", "信息楼"],
    timeSlots: ["上午 08:00-12:00", "下午 14:00-18:00", "晚上 19:00-22:00"],
    rooms: [
      { id: 1, name: "二层静音阅览区", building: "图书馆", floor: "2层", totalSeats: 240, occupied: 186, openTime: "07:00-23:00", features: ["静音", "插座", "WiFi", "空调"] },
      { id: 2, name: "三层讨论自习区", building: "图书馆", floor: "3层", totalSeats: 120, occupied: 120, openTime: "07:00-22:30", features: ["可讨论", "插座", "WiFi"] },
      { id: 3, name: "A301 自习室", building: "教学楼A", floor: "3层", totalSeats: 96, occupied: 72, openTime: "07:30-22:00", features: ["静音", "空调", "WiFi"] },
      { id: 4, name: "A405 考研专区", building: "教学楼A", floor: "4层", totalSeats: 80, occupied: 78, openTime: "06:30-23:00", features: ["考研专属", "插座", "静音"] },
      { id: 5, name: "B201 自习室", building: "教学楼B", floor: "2层", totalSeats: 110, occupied: 48, openTime: "08:00-21:30", features: ["WiFi", "空调"] },
      { id: 6, name: "B203 自习室", building: "教学楼B", floor: "2层", totalSeats: 100, occupied: 35, openTime: "08:00-21:30", features: ["可朗读", "WiFi"] },
      { id: 7, name: "信息楼 105 机房", building: "信息楼", floor: "1层", totalSeats: 64, occupied: 52, openTime: "08:30-22:00", features: ["电脑", "网线", "空调"] },
      { id: 8, name: "信息楼 208 研习室", building: "信息楼", floor: "2层", totalSeats: 50, occupied: 12, openTime: "09:00-21:00", features: ["白板", "插座", "小组讨论"] }
    ]
  },

  lectures: {
    categories: ["学术科技", "人文艺术", "就业指导", "创新创业"],
    lectures: [
      { id: 1, title: "人工智能的未来与机遇", speaker: "张明远", category: "学术科技", location: "图书馆报告厅", date: "2026-10-08", time: "19:00", capacity: 300, signed: 246 },
      { id: 2, title: "量子计算入门", speaker: "刘振华", category: "学术科技", location: "理科楼阶梯教室", date: "2026-10-09", time: "14:00", capacity: 200, signed: 120 },
      { id: 3, title: "中国古诗词的意境之美", speaker: "李若兰", category: "人文艺术", location: "文科楼报告厅", date: "2026-10-10", time: "19:00", capacity: 200, signed: 178 },
      { id: 4, title: "敦煌壁画艺术赏析", speaker: "赵雅芝", category: "人文艺术", location: "艺术楼展厅", date: "2026-10-11", time: "15:00", capacity: 100, signed: 88 },
      { id: 5, title: "大学生职业规划与简历制作", speaker: "王海涛", category: "就业指导", location: "学生活动中心", date: "2026-10-12", time: "19:00", capacity: 150, signed: 132 },
      { id: 6, title: "考研英语高分攻略", speaker: "孙晓峰", category: "就业指导", location: "教学楼A101", date: "2026-10-13", time: "18:30", capacity: 250, signed: 210 },
      { id: 7, title: "从0到1：大学生创业实战", speaker: "陈志强", category: "创新创业", location: "创业学院路演厅", date: "2026-10-14", time: "19:00", capacity: 120, signed: 98 },
      { id: 8, title: "互联网产品经理成长之路", speaker: "周雨桐", category: "创新创业", location: "信息楼报告厅", date: "2026-10-15", time: "14:30", capacity: 180, signed: 156 }
    ]
  }
};
