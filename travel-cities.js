const travelCities = [
  { key: 'harbin', name: '哈尔滨', country: '中国', visitedDate: '2020-01-01', dateLabel: '2020年', latitude: 45.8038, longitude: 126.5349, query: 'Harbin China city skyline', description: '沿松花江展开的北国城市，冬日冰雪与中央大街的欧陆建筑相映成趣。' },
  { key: 'xian', name: '西安', country: '中国', visitedDate: '2020-01-01', dateLabel: '2020年', latitude: 34.3416, longitude: 108.9398, query: 'Xi an China city ancient wall', description: '古城墙、钟鼓楼和秦风遗迹，把十三朝古都的厚重留在街巷之间。' },
  { key: 'chongqing', name: '重庆', country: '中国', visitedDate: '2020-01-01', dateLabel: '2020年', latitude: 29.5630, longitude: 106.5516, query: 'Chongqing China city skyline', description: '两江交汇的立体山城，夜色、索道和火锅一起构成鲜明的城市记忆。' },
  { key: 'wuhan', name: '武汉', country: '中国', visitedDate: '2020-01-01', dateLabel: '2020年', latitude: 30.5928, longitude: 114.3055, query: 'Wuhan China Yellow Crane Tower city', description: '长江与汉江在此相会，黄鹤楼见证江城的古今交叠。' },
  { key: 'changsha', name: '长沙', country: '中国', visitedDate: '2020-01-01', dateLabel: '2020年', latitude: 28.2282, longitude: 112.9388, query: 'Changsha China city night', description: '湘江两岸充满烟火气，岳麓山与夜市让这座城市始终鲜活。' },
  { key: 'huaihua', name: '怀化', country: '中国', visitedDate: '2020-01-01', dateLabel: '2020年', latitude: 27.5501, longitude: 109.9782, query: 'Huaihua Hunan China city', description: '湘西南的山水门户，侗苗风情与铁路枢纽在此相遇。' },
  { key: 'wenzhou', name: '温州', country: '中国', visitedDate: '2020-01-01', dateLabel: '2020年', latitude: 27.9938, longitude: 120.6994, query: 'Wenzhou Zhejiang China city', description: '山海相依的江南商港，雁荡山与瓯江给城市添上一层温润。' },
  { key: 'shanghai', name: '上海', country: '中国', visitedDate: '2020-01-01', dateLabel: '2020年', latitude: 31.2304, longitude: 121.4737, query: 'Shanghai China Bund skyline', description: '黄浦江两岸的天际线，把海派建筑、摩登街区和日常节奏连成一片。' },
  { key: 'xiamen', name: '厦门', country: '中国', visitedDate: '2020-01-01', dateLabel: '2020年', latitude: 24.4798, longitude: 118.0894, query: 'Xiamen China coast city', description: '海风、骑楼与鼓浪屿共同组成轻松明亮的海滨日常。' },
  { key: 'hong-kong', name: '香港', country: '中国香港', visitedDate: '2020-01-01', dateLabel: '2020年', latitude: 22.3193, longitude: 114.1694, query: 'Hong Kong Victoria Harbour skyline', description: '维港两岸密集而明亮，山海之间总有快速流动的城市能量。' },
  { key: 'dali', name: '大理', country: '中国', visitedDate: '2020-01-01', dateLabel: '2020年', latitude: 25.6065, longitude: 100.2676, query: 'Dali Yunnan China Erhai', description: '苍山洱海之间，白族聚落、湖岸与慢节奏让人愿意停留。' },
  { key: 'chuzhou', name: '滁州', country: '中国', visitedDate: '2020-01-01', dateLabel: '2020年', latitude: 32.3016, longitude: 118.3163, query: 'Chuzhou Anhui China Langya Mountain', description: '琅琊山与醉翁亭为这座皖东城市保留了清朗的山林气息。' },
  { key: 'bangkok', name: '曼谷', country: '泰国', visitedDate: '2026-02-08', dateLabel: '2026年2月8日至10日', latitude: 13.7563, longitude: 100.5018, query: 'Bangkok Thailand Grand Palace city', description: '寺庙金顶、湄南河与街头夜市并置，是这趟泰国足迹的城市核心。' },
  { key: 'pattaya', name: '芭提雅', country: '泰国', visitedDate: '2026-02-10', dateLabel: '2026年2月10日', latitude: 12.9236, longitude: 100.8825, query: 'Pattaya Thailand beach city', description: '面向暹罗湾的海滨城市，适合把海风、日落和夜色一起收进记忆。' },
  { key: 'rome', name: '罗马', country: '意大利', visitedDate: '2026-02-23', dateLabel: '2026年2月23日', latitude: 41.9028, longitude: 12.4964, query: 'Rome Italy Colosseum city', description: '古迹与咖啡馆并肩存在，穿过一条街就能感到千年历史仍在呼吸。' },
  { key: 'vatican-city', name: '梵蒂冈', country: '梵蒂冈', visitedDate: '2026-02-24', dateLabel: '2026年2月24日', latitude: 41.9029, longitude: 12.4534, query: 'Vatican City St Peters Basilica', description: '圣彼得广场与穹顶以极小的国土承载了浓缩的艺术与宗教史。' },
  { key: 'athens', name: '雅典', country: '希腊', visitedDate: '2026-02-27', dateLabel: '2026年2月27日', latitude: 37.9838, longitude: 23.7275, query: 'Athens Greece Acropolis city', description: '卫城俯瞰现代街区，神话、石柱和地中海阳光在这里交织。' },
  { key: 'santorini', name: '圣托里尼', country: '希腊', visitedDate: '2026-03-01', dateLabel: '2026年3月1日', latitude: 36.3932, longitude: 25.4615, query: 'Santorini Greece blue domes', description: '蓝顶白墙沿火山海湾铺开，是爱琴海最明亮的一段海岸线。' },
  { key: 'madrid', name: '马德里', country: '西班牙', visitedDate: '2026-02-22', dateLabel: '2026年2月22日', latitude: 40.4168, longitude: -3.7038, query: 'Madrid Spain city Gran Via', description: '广场、博物馆与傍晚的街道把西班牙首都的热烈与松弛留在同一帧里。' }
];

module.exports = { travelCities };
